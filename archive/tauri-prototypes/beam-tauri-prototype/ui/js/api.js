// Ponte com o Rust. No Tauri, usa invoke/listen; no navegador, o protótipo
// roda com a simulação de demo.js e os controles da janela não fazem nada.
const tauri = window.__TAURI__;
export const inTauri = Boolean(tauri);
const current = tauri?.window?.getCurrentWindow?.();
export const win = {
  minimize: () => current?.minimize(),
  toggleMaximize: () => current?.toggleMaximize(),
  close: () => current?.close(),
  startDragging: () => current?.startDragging(),
  startResizeDragging: (dir) => current?.startResizeDragging(dir),
  isMaximized: async () => (current ? current.isMaximized() : false),
  onResized: (fn) => current?.onResized(fn),
};
