// Minimal WASM loader: loads wasm/compute.wasm and exposes helper calls
window.WasmCompute = {
  instance: null,
  ready: false,
  async init(url = '/wasm/compute.wasm') {
    try {
      const resp = await fetch(url);
      const bytes = await resp.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      this.instance = instance;
      this.ready = true;
      console.log('WASM loaded', instance);
    } catch (err) {
      console.warn('WASM load failed:', err);
    }
  },
  add(a, b) {
    if (!this.ready || !this.instance) return null;
    return this.instance.exports.add_ints(a, b);
  },
  fade(v, amt) {
    if (!this.ready || !this.instance) return null;
    return this.instance.exports.fade_value(v, amt);
  }
};

// auto-init in background
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    WasmCompute.init().catch(()=>{});
  });
}
