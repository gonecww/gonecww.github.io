VANTA Uploader extension

How to load locally:

1. Ensure your VANTA server is running at http://localhost:5000

2. In Chrome/Edge/Brave open Extensions page:
   - chrome://extensions/ (enable Developer mode)
   - Click "Load unpacked"
   - Select this folder: `extension` (the one containing `manifest.json`)

3. Click the extension icon and use the popup to upload videos to your local server.

Notes:
- The extension communicates with the local server via `http://localhost:5000/api/*`.
- You may be prompted to allow the extension to make requests to localhost.
- If you want notifications when conversions complete, ensure the extension has notification permission.

If you want, I can:
- Build a fuller popup that mirrors the full web UI (presets, sliders, CRF)
- Add icons and polish styles
- Add a background task to persist uploads in `chrome.storage`
