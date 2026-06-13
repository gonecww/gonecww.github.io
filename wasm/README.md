WebAssembly (WASM) C++ example

This folder contains a tiny example showing how to compile C++ to WebAssembly using Emscripten and call it from the browser.

Requirements
- Emscripten SDK (emsdk) installed and activated. See https://emscripten.org/docs/getting_started/downloads.html

Build (from this repo root)

```bash
# from project root
cd wasm/src
emcc compute.cpp -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_fade_value","_add_ints"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap","getValue","setValue"]' -o ../compute.js
```

This produces `wasm/compute.wasm` and `wasm/compute.js` (glue) that you can load from the frontend.

Usage (browser)
- Serve the project (the app already serves `public/` at `http://localhost:4000`).
- Load `wasm/compute.wasm` using `fetch` + `WebAssembly.instantiateStreaming` or include the generated `compute.js` glue.

Example (basic loader): see `public/js/wasm-loader.js` in this project for a minimal loader that exposes `add_ints` and `fade_value` to the page.
