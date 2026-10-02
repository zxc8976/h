(() => {
  'use strict';

  const STORAGE_SCALE = 'crdCustomScalePercent';
  const STORAGE_MINIMIZED = 'crdCustomScaleMinimized';
  const MIN = 50;
  const MAX = 125;
  const STEP = 5;
  const DEFAULT = 85;

  let scalePercent = DEFAULT;
  let minimized = false;
  let target = null;
  let original = null;
  let observer = null;

  // Local viewport pan (does NOT send the wheel to the remote host).
  let panX = 0;
  let panY = 0;
  let baseRect = null;

  let panel, slider, numberLabel, status, minimizeButton;

  function clamp(v) {
    v = Math.round(Number(v) / STEP) * STEP;
    return Math.min(MAX, Math.max(MIN, v));
  }

  function isVisible(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 300 && r.height > 200 &&
      s.display !== 'none' && s.visibility !== 'hidden' &&
      Number(s.opacity || '1') > 0;
  }

  function scoreElement(el) {
    if (!isVisible(el)) return -1;
    const r = el.getBoundingClientRect();
    let score = r.width * r.height;
    const tag = el.tagName.toLowerCase();
    const idc = ((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();

    if (tag === 'canvas' || tag === 'video') score *= 8;
    if (/client|desktop|remote|display|screen|stream|host/.test(idc)) score *= 3;
    if (r.width > innerWidth * 0.55 && r.height > innerHeight * 0.55) score *= 3;
    if (el === document.body || el === document.documentElement) score *= 0.05;

    return score;
  }

  function findTarget() {
    const candidates = [
      ...document.querySelectorAll('canvas, video'),
      ...document.querySelectorAll(
        '[id*="client" i], [class*="client" i], [id*="desktop" i], [class*="desktop" i], ' +
        '[id*="remote" i], [class*="remote" i], [id*="display" i], [class*="display" i], ' +
        '[id*="screen" i], [class*="screen" i]'
      )
    ];

    let best = null;
    let bestScore = -1;

    for (const el of candidates) {
      const s = scoreElement(el);
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }
    if (!best) return null;

    // Prefer a wrapper so the remote cursor/overlays move together.
    let current = best;
    const bestRect = best.getBoundingClientRect();
    for (let i = 0; i < 4 && current.parentElement; i++) {
      const p = current.parentElement;
      const r = p.getBoundingClientRect();
      if (
        r.width >= bestRect.width &&
        r.height >= bestRect.height &&
        r.width <= innerWidth * 1.5 &&
        r.height <= innerHeight * 1.5 &&
        p !== document.body &&
        p !== document.documentElement
      ) {
        current = p;
      } else {
        break;
      }
    }
    return current;
  }

  function composeTransform() {
    if (!target || !original) return;
    const originalTransform = original.transform && original.transform !== 'none'
      ? original.transform
      : '';
    const pan = `translate3d(${panX}px, ${panY}px, 0)`;
    target.style.transform = originalTransform ? `${originalTransform} ${pan}` : pan;
  }

  function resetPan(showStatus = true) {
    panX = 0;
    panY = 0;
    composeTransform();
    if (showStatus) updateStatus('畫面位置已重設');
  }

  function restoreTarget() {
    if (!target || !original) return;
    try {
      target.style.zoom = original.zoom;
      target.style.transform = original.transform;
      target.style.transformOrigin = original.transformOrigin;
      target.style.width = original.width;
      target.style.height = original.height;
      target.style.marginLeft = original.marginLeft;
      target.style.marginTop = original.marginTop;
      target.style.willChange = original.willChange;
    } catch (_) {}
    target = null;
    original = null;
    baseRect = null;
    panX = 0;
    panY = 0;
  }

  function captureBaseRect() {
    if (!target) return;
    // Temporarily use zero pan only for measurement.
    const px = panX, py = panY;
    panX = 0; panY = 0;
    composeTransform();
    baseRect = target.getBoundingClientRect();
    panX = px; panY = py;
    composeTransform();
  }

  function clampPan() {
    if (!baseRect) captureBaseRect();
    if (!baseRect) return;

    // Top-left anchored target: only negative pan is needed to reveal
    // content beyond the right/bottom edge. Allow a small positive cushion.
    const cushion = 24;
    const minX = Math.min(0, innerWidth - baseRect.right - cushion);
    const minY = Math.min(0, innerHeight - baseRect.bottom - cushion);

    panX = Math.max(minX, Math.min(cushion, panX));
    panY = Math.max(minY, Math.min(cushion, panY));
  }

  function panBy(dx, dy) {
    if (!target) {
      if (!applyScale()) return;
    }
    panX += dx;
    panY += dy;
    clampPan();
    composeTransform();
    updateStatus(`本地平移 X ${Math.round(panX)} / Y ${Math.round(panY)}`);
  }

  function applyScale() {
    const found = findTarget();
    if (!found) {
      updateStatus('找不到遠端畫面，連線完成後按「重新偵測」');
      return false;
    }

    if (target !== found) {
      restoreTarget();
      target = found;
      original = {
        zoom: target.style.zoom,
        transform: target.style.transform,
        transformOrigin: target.style.transformOrigin,
        width: target.style.width,
        height: target.style.height,
        marginLeft: target.style.marginLeft,
        marginTop: target.style.marginTop,
        willChange: target.style.willChange
      };
    }

    const factor = scalePercent / 100;

    // Chromium-native CSS zoom usually preserves pointer mapping better
    // than transform: scale().
    target.style.zoom = String(factor);
    target.style.transformOrigin = 'top left';
    target.style.willChange = 'transform';

    baseRect = null;
    clampPan();
    composeTransform();

    updateUI();
    updateStatus(`已套用 ${scalePercent}%`);
    return true;
  }

  function saveScale() {
    chrome.storage.local.set({ [STORAGE_SCALE]: scalePercent });
  }

  function setScale(v) {
    scalePercent = clamp(v);
    saveScale();
    baseRect = null;
    applyScale();
  }

  function setMinimized(v) {
    minimized = Boolean(v);
    chrome.storage.local.set({ [STORAGE_MINIMIZED]: minimized });
    updateMinimizedUI();
  }

  function updateMinimizedUI() {
    if (!panel) return;
    panel.classList.toggle('crdcs-minimized', minimized);
    if (minimizeButton) {
      minimizeButton.textContent = minimized ? '▣' : '–';
      minimizeButton.title = minimized ? '展開控制器' : '最小化控制器';
    }
  }

  function updateUI() {
    if (slider) slider.value = String(scalePercent);
    if (numberLabel) numberLabel.textContent = `${scalePercent}%`;
  }

  function updateStatus(msg) {
    if (status) status.textContent = msg;
  }

  function makeButton(text, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.title = title || text;
    b.className = 'crdcs-btn';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  function createPanel() {
    if (document.getElementById('crdcs-panel')) return;

    panel = document.createElement('div');
    panel.id = 'crdcs-panel';

    const top = document.createElement('div');
    top.className = 'crdcs-top';

    const title = document.createElement('strong');
    title.textContent = 'CRD Lens';

    numberLabel = document.createElement('span');
    numberLabel.className = 'crdcs-value';

    top.append(title, numberLabel);

    slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(MIN);
    slider.max = String(MAX);
    slider.step = String(STEP);
    slider.className = 'crdcs-slider';
    slider.addEventListener('input', () => {
      scalePercent = clamp(slider.value);
      updateUI();
      baseRect = null;
      applyScale();
    });
    slider.addEventListener('change', saveScale);

    const row = document.createElement('div');
    row.className = 'crdcs-row';
    row.append(
      makeButton('−5', '縮小 5%', () => setScale(scalePercent - STEP)),
      makeButton('85%', '設為 85%', () => setScale(85)),
      makeButton('100%', '恢復 100%', () => setScale(100)),
      makeButton('+5', '放大 5%', () => setScale(scalePercent + STEP))
    );

    const tools = document.createElement('div');
    tools.className = 'crdcs-tools';
    tools.append(
      makeButton('重設位置', '把本地平移位置歸零', () => resetPan()),
      makeButton('重新偵測', '重新尋找 Chrome Remote Desktop 畫面', () => {
        restoreTarget();
        setTimeout(applyScale, 100);
      })
    );

    const hint = document.createElement('div');
    hint.className = 'crdcs-hint';
    hint.innerHTML =
      '<b>Alt + 滾輪</b>：本地上下移動畫面<br>' +
      '<b>Alt + Shift + 滾輪</b>：本地左右移動畫面<br>' +
      '不按 Alt：滾輪照常送到遠端 Windows';

    status = document.createElement('div');
    status.className = 'crdcs-status';

    minimizeButton = makeButton('–', '最小化控制器', () => setMinimized(!minimized));
    minimizeButton.classList.add('crdcs-minimize');

    // In minimized state, clicking the pill expands it.
    top.addEventListener('click', () => {
      if (minimized) setMinimized(false);
    });

    panel.append(top, slider, row, tools, hint, status, minimizeButton);
    document.documentElement.appendChild(panel);

    updateUI();
    updateMinimizedUI();
  }

  function handleWheel(e) {
    // Normal wheel is intentionally untouched and reaches the remote host.
    if (!e.altKey) return;

    // Consume only the special local-pan gesture.
    e.preventDefault();
    e.stopPropagation();

    const speed = 1.0;

    if (e.shiftKey) {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      panBy(-d * speed, 0);
    } else {
      panBy(-e.deltaX * speed, -e.deltaY * speed);
    }
  }

  function init() {
    chrome.storage.local.get(
      { [STORAGE_SCALE]: DEFAULT, [STORAGE_MINIMIZED]: false },
      (data) => {
        scalePercent = clamp(data[STORAGE_SCALE]);
        minimized = Boolean(data[STORAGE_MINIMIZED]);
        createPanel();

        // Capture before CRD gets the wheel event.
        window.addEventListener('wheel', handleWheel, { capture: true, passive: false });

        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          if (applyScale() || attempts >= 30) clearInterval(timer);
        }, 1000);

        observer = new MutationObserver(() => {
          if (!target || !document.contains(target)) {
            target = null;
            original = null;
            baseRect = null;
            panX = 0;
            panY = 0;
            setTimeout(applyScale, 250);
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    );
  }

  init();
})();
