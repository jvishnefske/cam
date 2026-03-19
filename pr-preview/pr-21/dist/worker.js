// src/worker.ts
import init, { process_stl_progress, process_svg_progress } from "../pkg/rustcam.js";
var wasmReady = false;
async function boot() {
  await init();
  wasmReady = true;
  self.postMessage({ type: "ready" });
}
boot().catch((e) => {
  self.postMessage({ type: "error", error: "Worker WASM init failed: " + e });
});
self.onmessage = (evt) => {
  const { fileData, fileType, configJson } = evt.data;
  if (!wasmReady) {
    self.postMessage({ type: "error", error: "WASM not ready" });
    return;
  }
  const onProgress = (completed, total) => {
    self.postMessage({ type: "progress", completed, total });
  };
  try {
    let gcode;
    if (fileType === "stl") {
      gcode = process_stl_progress(fileData, configJson, onProgress);
    } else {
      gcode = process_svg_progress(fileData, configJson, onProgress);
    }
    self.postMessage({ type: "done", gcode });
  } catch (e) {
    self.postMessage({ type: "error", error: String(e) });
  }
};
//# sourceMappingURL=worker.js.map
