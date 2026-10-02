# CRD Lens

**Custom client-side scaling and viewport panning for Chrome Remote Desktop — without changing the remote computer's resolution.**

[繁體中文](README.md) · **English** · [日本語](README.ja.md)

> **Status:** Experimental / early release (v0.2.0)

CRD Lens is a small Chrome extension for people who like the convenience of Chrome Remote Desktop but want more control over how the remote desktop is displayed.

Chrome Remote Desktop can make a high-resolution remote desktop feel either too small or too large. CRD Lens adds a local display layer on top of the existing session, so you can scale and reposition the remote view without changing the remote PC's Windows resolution.

## Why CRD Lens?

Typical problem:

- The remote PC uses a high-resolution display.
- Native size is too small to read comfortably.
- "Scale to fit" can feel too large.
- Changing the remote PC's resolution is inconvenient because it also affects local use later.

CRD Lens is designed for this middle ground.

## Features

- Custom scaling from **50% to 125%**
- 5% increments
- Quick presets for **85%** and **100%**
- Remembers the last scale setting
- Collapsible floating control panel
- **Alt + mouse wheel** to pan the remote viewport locally
- **Alt + Shift + mouse wheel** to pan horizontally
- Normal mouse wheel input is left untouched and continues to reach the remote computer
- Reset viewport position
- Re-detect the Chrome Remote Desktop surface when needed
- Does **not** intentionally change the remote computer's display resolution

## Installation

CRD Lens is currently distributed as an unpacked Chrome extension.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `crd-lens` folder.
6. Open or reload Chrome Remote Desktop.
7. Connect to your remote computer.

A small **CRD Lens** control panel should appear in the bottom-right corner.

## Controls

| Action | Result |
|---|---|
| Scale slider | Set scale from 50% to 125% |
| `-5` / `+5` | Adjust scale by 5% |
| `85%` | Quick scale preset |
| `100%` | Return to 100% |
| `–` | Collapse the control panel |
| Click collapsed pill | Expand the control panel |
| `Alt + Wheel` | Pan the remote view vertically / freely |
| `Alt + Shift + Wheel` | Pan the remote view horizontally |
| Normal Wheel | Sent normally to the remote computer |
| Reset position | Return local viewport offset to zero |
| Re-detect | Search for the CRD display surface again |

## How it works

CRD Lens runs only on:

`https://remotedesktop.google.com/*`

It applies client-side presentation changes to the Chrome Remote Desktop page. The current implementation uses Chromium's CSS `zoom` for scaling and a local transform for viewport panning.

The goal is to modify **how the remote session is displayed locally**, rather than changing the remote machine's resolution.

## Permissions

CRD Lens requests:

- `storage` — remembers your scale and panel state
- access to `remotedesktop.google.com` — injects the scaling controls only on Chrome Remote Desktop

No analytics, tracking, account access, or external server is included in this version.

## Known limitations

This is an experimental project.

Chrome Remote Desktop is a web app and its internal DOM can change. A future CRD update may require CRD Lens to update its display-surface detection logic.

Depending on CRD changes, browser version, display configuration, or input handling:

- the target surface may occasionally need **Re-detect**
- pointer alignment should be tested after unusual scaling combinations
- viewport panning may need refinement for some layouts

If something looks wrong, return to **100%** first.

## Privacy

CRD Lens does not intentionally read or transmit the contents of your remote desktop.

The extension currently has no telemetry or external backend.

You should still review the source before installing any unpacked browser extension.

## Disclaimer

CRD Lens is an independent open-source project and is **not affiliated with, endorsed by, or sponsored by Google**.

Chrome and Chrome Remote Desktop are trademarks of Google LLC.

## Contributing

Bug reports and small focused improvements are welcome.

Useful issue details include:

- Chrome version
- local display resolution / scaling
- remote display resolution / scaling
- CRD Lens scale percentage
- whether pointer alignment is correct
- screenshot or short reproduction steps

## License

MIT License. See [LICENSE](LICENSE).
