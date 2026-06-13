# VANTA TikTok Video Optimizer

A premium web application for uploading, processing, and exporting TikTok-ready videos with advanced export controls.

## Features

- Drag-and-drop and file-browser upload experience
- Supports MP4, MOV, AVI, MKV, WebM
- File upload limit: 250 MB
- TikTok-quality export settings:
  - Resolution selection (540p, 720p, 1080p, 1440p)
  - Frame rate preservation or manual FPS selection
  - Codec selection: H.264 or H.265
  - Bitrate optimization and audio quality controls
- Real-time upload and conversion progress
- Secure backend file handling with validation
- Dark-mode premium UI with glassmorphism styling

## Folder structure

```
Main/
  package.json
  server.js
  README.md
  .gitignore
  public/
    index.html
    styles.css
    app.js
  uploads/
  processed/
```

## Installation

1. Open a terminal in the `Main` folder.
2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open the app in your browser at `http://localhost:4000`.

## FFmpeg conversion settings

The app uses FFmpeg through `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg`.

- Video codec: `libx264` or `libx265`
- CRF quality: `18`
- Max bitrate: configurable per upload
- Audio codec: `aac`
- Audio bitrate: configurable
- Pixel format: `yuv420p`
- Fast start: `-movflags +faststart`
- Scaling filter for resolution control

These settings preserve high visual fidelity while preparing content for TikTok's platform compression.

## Deployment suggestions

### VPS deployment (Ubuntu example)

1. Provision a server with Node.js installed.
2. Clone the repository and install dependencies.
3. Install FFmpeg system-wide if you prefer not to use the bundled installer:

```bash
sudo apt update
sudo apt install ffmpeg -y
```

4. Configure the app to run with a process manager like `pm2`:

```bash
npm install -g pm2
pm start
pm2 start server.js --name vanta-optimizer
pm2 save
```

5. Place an Nginx reverse proxy in front of the app for TLS and static caching.

### Cloud deployment

- Use a cloud VM or container service.
- Set `PORT` environment variable if needed.
- Ensure enough disk space for temporary uploads and output files.
- Add HTTPS termination via Nginx, Cloudflare, or managed load balancer.

## Security notes

- The backend validates file extension and MIME type.
- Uploads are limited to 250 MB by Multer.
- Uploaded files are stored in isolated `uploads/` and `processed/` directories.
- Temporary cleanup runs hourly for stale files.

## Chrome extension support

The `extension/` folder contains a Chrome extension popup that uses the VANTA backend at `http://localhost:4000`.

### Load the extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `Main/extension` folder.

### How it works

- The popup UI lets you select video files and send them to the local VANTA server.
- It displays upload progress, conversion status, and a download link when the backend completes processing.
- This extension is a frontend shell; the actual FFmpeg conversion runs on the local Node.js backend.

### Notes for C++ integration

If you want to incorporate native C++ logic later, the extension can be extended via:
- a native messaging host for local C++ executables, or
- WebAssembly if the C++ code can be compiled to WASM.

## Next steps

- Add user authentication for private workspaces.
- Add server-side task queuing or production-grade worker processes.
- Add analytics and error logging for conversion sessions.

## Interactive UI & C++ / WebAssembly integration

- The frontend now includes an `interactive.css` and JS that implements:
  - a cursor-driven spotlight that lights the background under the cursor,
  - a subtle animated line grid that reacts to cursor position,
  - ripple click animations on `.btn` elements.

- C++ integration via WebAssembly (WASM): a tiny example is scaffolded under `wasm/`.
  - Build with Emscripten (`emcc`) to produce `wasm/compute.wasm` and `wasm/compute.js`.
  - A minimal loader is in `public/js/wasm-loader.js` demonstrating how to call exported functions like `add_ints` and `fade_value`.

See `wasm/README.md` for build instructions and the `public/js/wasm-loader.js` example for runtime usage.
