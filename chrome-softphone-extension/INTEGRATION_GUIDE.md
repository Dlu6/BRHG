# Hugamara Chrome Softphone Extension Integration Guide

## Overview

This guide explains how to use the `mayday/chrome-softphone-extension` in development with Hugamara, initiate calls from the dashboard, adjust allowed login URLs, and keep the extension in its own git repository.

## Permissible URLs

The extension is configured to run on:
- https://cs.hugamara.com/*
- Any subdomain of hugamara.com
- http://localhost:3000/* (development)
- http://localhost:3002/* (development call center)
- *.zoho.com/* (Zoho CRM pages)

Changes made:
- Updated `manifest.json` `host_permissions` and `content_scripts.matches` to include `cs.hugamara.com` and `*.hugamara.com`.
- Added `externally_connectable.matches` for `localhost:3000` and `cs.hugamara.com`.
- Replaced legacy `morvenconsults` and `lusuku.shop` patterns in `background.js` with Hugamara domains.

## Development Build

Inside `mayday/chrome-softphone-extension`:
- `npm install`
- `npm run build:dev` (development build with inline source maps)
- Output goes to `mayday/chrome-softphone-extension/dist`

Then, in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select `.../mayday/chrome-softphone-extension/dist`

To rebuild: run `npm run build:dev` and click the extension card's refresh icon in `chrome://extensions`.

## Initiating Calls from the Dashboard

The dashboard now posts a message that the extension listens for. Call action:
```js
window.postMessage({ type: "hugamara:call", number: "+256700000000" }, window.origin);
```
- Origin must be `http://localhost:3000` or `https://cs.hugamara.com`.
- The content script bridges this to the extension background using `chrome.runtime.sendMessage({ type: "make_call", number })`.
- Hangup: `window.postMessage({ type: "hugamara:hangup" }, window.origin)`.

File references:
- Extension: `content.js` adds the window.postMessage bridge.
- Dashboard: `mayday-client-dashboard/src/components/ZohoIntegration.jsx` uses `hugamara:call`.

## Keeping the Extension in Its Own Git Repo

- The main repo `.gitignore` excludes the path:
```
mayday/chrome-softphone-extension/
```
- Work in a separate git repository for the extension. You may keep the working tree here for convenience, but commits should be done in the extension repo.

Suggested remote for the extension repo:
- Create a new GitHub repo, e.g., `github.com/Hugamara/chrome-softphone-extension`
- Initialize and push within `mayday/chrome-softphone-extension`

## Notes

- Ensure agents have the proper host configured through the license system; the extension supports dynamic endpoints via `src/config.js`.
- Microphone permission must be granted in the page context where calls are initiated.
