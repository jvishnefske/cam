// src/main.ts
import init from "../pkg/rustcam.js";
import initSim from "../pkg/rustsim.js";

// src/dom.ts
function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}
function $input(id) {
  return $(id);
}
function $select(id) {
  return $(id);
}
function $canvas(id) {
  return $(id);
}
function $textarea(id) {
  return $(id);
}
function $btn(id) {
  return $(id);
}

// src/cam.ts
import {
  process_stl,
  process_svg,
  preview_stl,
  preview_svg
} from "../pkg/rustcam.js";

// src/theme.ts
var theme = {
  colors: {
    bg: "#0f1117",
    surface: "#1a1d27",
    border: "#2a2d3a",
    accent: "#4f8cff",
    accentDim: "#2d5299",
    text: "#e0e0e8",
    textDim: "#8888a0",
    danger: "#ff5555",
    success: "#55ff88",
    warning: "#ff9800",
    white: "#ffffff",
    // Port type colors (dataflow)
    portFloat: "#4f8cff",
    portBytes: "#ff9800",
    portText: "#55ff88",
    portSeries: "#ff55aa",
    portAny: "#aaaaaa",
    // Wire colors
    wire: "#4f8cff66",
    wireActive: "#4f8cff",
    // Constraint status colors
    cstFullyConstrained: "#4caf50",
    cstOverConstrained: "#f44336",
    cstUnderConstrained: "#ff9800",
    cstPickHighlight: "#ffeb3b",
    // Simulation colors
    simMaterialRemoval: "rgba(255,80,80,0.35)",
    simRapid: "rgba(255,255,100,0.25)",
    simCutting: "rgba(79,140,255,0.6)",
    simToolShadow: "rgba(0,0,0,0.3)",
    simToolCutting: "rgba(255,80,80,0.7)",
    simToolIdle: "rgba(100,200,100,0.5)",
    simToolOutlineCutting: "#ff5555",
    simToolOutlineIdle: "#55ff88",
    simToolCenter: "#ffffff",
    // CAM preview colors
    camLaser: "rgba(255, 60, 40, 0.85)",
    camZDefault: "#4f8cff",
    // Hover state
    btnSecondaryHover: "#3a3d4a",
    // Drop zone hover
    dropZoneHoverBg: "rgba(79,140,255,0.06)"
  },
  fonts: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'Courier New', monospace"
  },
  spacing: {
    sidebarWidth: 320,
    headerHeight: 49,
    pad: 16,
    portRadius: 6,
    portSpacing: 20,
    portOffsetY: 30,
    nodeWidth: 140,
    nodeBaseHeight: 40
  }
};
function portColor(kind) {
  switch (kind) {
    case "Float":
      return theme.colors.portFloat;
    case "Bytes":
      return theme.colors.portBytes;
    case "Text":
      return theme.colors.portText;
    case "Series":
      return theme.colors.portSeries;
    default:
      return theme.colors.portAny;
  }
}

// src/cam.ts
var wasmReady = false;
var fileData = null;
var fileType = null;
function setWasmReady(v) {
  wasmReady = v;
}
function setFileData(d, t) {
  fileData = d;
  fileType = t;
}
var dropZone = $("drop-zone");
var filenameEl = $("filename");
var generateBtn = $btn("generate-btn");
var statusEl = $("status");
var gcodeOut = $textarea("gcode-output");
var canvas = $canvas("preview-canvas");
var copyBtn = $btn("copy-btn");
var downloadBtn = $btn("download-btn");
var toolTypeSelect = $select("tool-type");
var effectiveDiameterRow = $("effective-diameter-row");
var cornerRadiusRow = $("corner-radius-row");
var machineTypeSelect = $select("machine-type");
var cncParamsSection = $("cnc-params");
var laserParamsSection = $("laser-params");
var strategySelect = $select("strategy");
var perimeterOptions = $("perimeter-options");
var zigzagOptions = $("zigzag-options");
var fileInput = $input("file-input");
var cncStrategies = ["contour", "pocket", "slice", "zigzag", "perimeter"];
var laserStrategies = ["contour", "pocket", "perimeter", "laser_cut", "laser_engrave"];
function updateToolTypeUI() {
  const toolType = toolTypeSelect.value;
  effectiveDiameterRow.classList.toggle("hidden", toolType !== "face_mill");
  cornerRadiusRow.classList.toggle("hidden", toolType !== "ball_end");
  if (toolType === "ball_end") {
    const diameter = parseFloat($input("tool-diameter").value);
    $input("corner-radius").value = (diameter / 2).toFixed(2);
  }
}
toolTypeSelect.addEventListener("change", updateToolTypeUI);
$input("tool-diameter").addEventListener("change", updateToolTypeUI);
function updateStrategyUI() {
  const strategy = strategySelect.value;
  perimeterOptions.classList.toggle("hidden", strategy !== "perimeter");
  zigzagOptions.classList.toggle("hidden", strategy !== "zigzag");
}
function updateMachineTypeUI() {
  const isLaser = machineTypeSelect.value === "laser_cutter";
  cncParamsSection.classList.toggle("hidden", isLaser);
  laserParamsSection.classList.toggle("hidden", !isLaser);
  const current = strategySelect.value;
  const allowed = isLaser ? laserStrategies : cncStrategies;
  for (const opt of Array.from(strategySelect.options)) {
    opt.hidden = !allowed.includes(opt.value);
  }
  if (!allowed.includes(current)) {
    strategySelect.value = isLaser ? "laser_cut" : "contour";
  }
  updateStrategyUI();
}
machineTypeSelect.addEventListener("change", () => {
  updateMachineTypeUI();
  tryPreview();
});
strategySelect.addEventListener("change", () => {
  updateStrategyUI();
  tryPreview();
});
$select("scan-direction").addEventListener("change", tryPreview);
updateMachineTypeUI();
var resizeSimFn = () => {
};
function setResizeSim(fn) {
  resizeSimFn = fn;
}
document.querySelectorAll(".tab-bar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-bar button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "sim-tab") resizeSimFn();
  });
});
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer?.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) handleFile(fileInput.files[0]);
});
function handleFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "stl") {
    fileType = "stl";
    file.arrayBuffer().then((buf) => {
      fileData = new Uint8Array(buf);
      filenameEl.textContent = file.name;
      generateBtn.disabled = !wasmReady;
      tryPreview();
    });
  } else if (ext === "svg") {
    fileType = "svg";
    file.text().then((txt) => {
      fileData = txt;
      filenameEl.textContent = file.name;
      generateBtn.disabled = !wasmReady;
      tryPreview();
    });
  } else {
    statusEl.textContent = "Unsupported file type: ." + ext;
    statusEl.className = "text-xs mt-2 min-h-4 text-danger";
  }
}
function getConfig() {
  const toolType = $select("tool-type").value;
  const isLaser = machineTypeSelect.value === "laser_cutter";
  const config = {
    tool_diameter: parseFloat($input("tool-diameter").value),
    step_over: parseFloat($input("step-over").value),
    strategy: strategySelect.value,
    tool_type: toolType,
    machine_type: machineTypeSelect.value
  };
  if (isLaser) {
    config.feed_rate = parseFloat($input("laser-feed-rate").value);
    config.plunge_rate = config.feed_rate;
    config.spindle_speed = 0;
    config.safe_z = 0;
    config.cut_depth = 0;
    config.step_down = 1;
    config.laser_power = parseFloat($input("laser-power").value);
    config.passes = parseInt($input("laser-passes").value) || 1;
    config.air_assist = $input("air-assist").checked;
  } else {
    config.step_down = parseFloat($input("step-down").value);
    config.feed_rate = parseFloat($input("feed-rate").value);
    config.plunge_rate = parseFloat($input("plunge-rate").value);
    config.spindle_speed = parseFloat($input("spindle-speed").value);
    config.safe_z = parseFloat($input("safe-z").value);
    config.cut_depth = parseFloat($input("cut-depth").value);
  }
  if (toolType === "ball_end") {
    config.corner_radius = parseFloat($input("corner-radius").value) || 0;
  } else if (toolType === "face_mill") {
    config.effective_diameter = parseFloat($input("effective-diameter").value) || config.tool_diameter;
  }
  if (config.strategy === "zigzag") {
    config.scan_direction = $select("scan-direction").value;
  }
  if (config.strategy === "perimeter") {
    config.climb_cut = $input("climb-cut").checked;
    config.perimeter_passes = parseInt($input("perimeter-passes").value) || 1;
  }
  return JSON.stringify(config);
}
function tryPreview() {
  if (!wasmReady || !fileData) return;
  try {
    let json;
    if (fileType === "stl") json = preview_stl(fileData, getConfig());
    else json = preview_svg(fileData);
    drawPreview(JSON.parse(json));
  } catch (e) {
    console.warn("Preview error:", e);
  }
}
function drawPreview(paths) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!paths.length) return;
  const has3D = paths.some((p) => p.length > 0 && p[0].length >= 3);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of paths) for (const pt of p) {
    const [x, y, z] = pt;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (has3D && z !== void 0) {
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  let w = maxX - minX, h = maxY - minY;
  if (w === 0 && h === 0) {
    w = 1;
    h = 1;
  } else if (w === 0) {
    w = h;
    minX -= w / 2;
    maxX += w / 2;
  } else if (h === 0) {
    h = w;
    minY -= h / 2;
    maxY += h / 2;
  }
  const zRange = maxZ - minZ || 1;
  const pad = Math.max(8, Math.min(30, Math.min(rect.width, rect.height) * 0.08));
  const availW = Math.max(rect.width - pad * 2, 1);
  const availH = Math.max(rect.height - pad * 2, 1);
  const scale = Math.min(availW / w, availH / h);
  const offX = pad + (availW - w * scale) / 2;
  const offY = pad + (availH - h * scale) / 2;
  const tx = (x) => offX + (x - minX) * scale;
  const ty = (y) => offY + (maxY - y) * scale;
  const isLaserPreview = machineTypeSelect.value === "laser_cutter";
  const zColor = (z) => {
    if (isLaserPreview) return theme.colors.camLaser;
    if (!has3D || z === void 0) return theme.colors.camZDefault;
    const t = (z - minZ) / zRange;
    const hue = 240 - t * 180;
    return `hsl(${hue}, 80%, 55%)`;
  };
  ctx.strokeStyle = theme.colors.surface;
  ctx.lineWidth = 0.5;
  const gs = Math.pow(10, Math.floor(Math.log10(Math.max(w, h))));
  for (let x = Math.floor(minX / gs) * gs; x <= maxX; x += gs) {
    ctx.beginPath();
    ctx.moveTo(tx(x), 0);
    ctx.lineTo(tx(x), rect.height);
    ctx.stroke();
  }
  for (let y = Math.floor(minY / gs) * gs; y <= maxY; y += gs) {
    ctx.beginPath();
    ctx.moveTo(0, ty(y));
    ctx.lineTo(rect.width, ty(y));
    ctx.stroke();
  }
  ctx.lineWidth = 1.2;
  ctx.lineJoin = "round";
  for (const p of paths) {
    if (p.length < 2) continue;
    if (has3D) {
      for (let i = 1; i < p.length; i++) {
        ctx.strokeStyle = zColor(p[i][2]);
        ctx.beginPath();
        ctx.moveTo(tx(p[i - 1][0]), ty(p[i - 1][1]));
        ctx.lineTo(tx(p[i][0]), ty(p[i][1]));
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = isLaserPreview ? theme.colors.camLaser : theme.colors.camZDefault;
      ctx.beginPath();
      ctx.moveTo(tx(p[0][0]), ty(p[0][1]));
      for (let i = 1; i < p.length; i++) ctx.lineTo(tx(p[i][0]), ty(p[i][1]));
      ctx.stroke();
    }
  }
}
var genWorker = null;
var genStartTime = 0;
var loadSimFn = () => {
};
function setLoadSim(fn) {
  loadSimFn = fn;
}
function initWorker() {
  genWorker = new Worker("./dist/worker.js", { type: "module" });
  genWorker.onmessage = (evt) => {
    const msg = evt.data;
    if (msg.type === "progress") {
      const elapsed = ((performance.now() - genStartTime) / 1e3).toFixed(1);
      statusEl.textContent = `Generating... layer ${msg.completed} / ${msg.total}  (${elapsed}s)`;
      statusEl.className = "text-xs mt-2 min-h-4";
    } else if (msg.type === "done") {
      gcodeOut.value = msg.gcode;
      const elapsed = ((performance.now() - genStartTime) / 1e3).toFixed(1);
      statusEl.textContent = `Done \u2014 ${msg.gcode.split("\n").length} lines of G-code in ${elapsed}s.`;
      statusEl.className = "text-xs mt-2 min-h-4 text-success";
      generateBtn.disabled = false;
      tryPreview();
      loadSimFn();
    } else if (msg.type === "error") {
      statusEl.textContent = "Error: " + msg.error;
      statusEl.className = "text-xs mt-2 min-h-4 text-danger";
      generateBtn.disabled = false;
    }
  };
  genWorker.onerror = (e) => {
    statusEl.textContent = "Worker error: " + e.message;
    statusEl.className = "text-xs mt-2 min-h-4 text-danger";
    generateBtn.disabled = false;
  };
}
var workerSupported = true;
try {
  initWorker();
} catch {
  workerSupported = false;
  console.warn("Module workers not supported, using main-thread generation");
}
generateBtn.addEventListener("click", () => {
  if (!wasmReady || !fileData) return;
  generateBtn.disabled = true;
  statusEl.textContent = "Generating... layer 0 / ?";
  statusEl.className = "text-xs mt-2 min-h-4";
  genStartTime = performance.now();
  const cfg = getConfig();
  if (workerSupported && genWorker) {
    genWorker.postMessage({ fileData, fileType, configJson: cfg });
  } else {
    try {
      let gcode;
      if (fileType === "stl") gcode = process_stl(fileData, cfg);
      else gcode = process_svg(fileData, cfg);
      gcodeOut.value = gcode;
      const elapsed = ((performance.now() - genStartTime) / 1e3).toFixed(1);
      statusEl.textContent = `Done \u2014 ${gcode.split("\n").length} lines of G-code in ${elapsed}s.`;
      statusEl.className = "text-xs mt-2 min-h-4 text-success";
      tryPreview();
      loadSimFn();
    } catch (e) {
      statusEl.textContent = "Error: " + e;
      statusEl.className = "text-xs mt-2 min-h-4 text-danger";
    }
    generateBtn.disabled = false;
  }
});
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(gcodeOut.value).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => copyBtn.textContent = "Copy", 1500);
  });
});
downloadBtn.addEventListener("click", () => {
  const blob = new Blob([gcodeOut.value], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (filenameEl.textContent || "output").replace(/\.\w+$/, "") + ".nc";
  a.click();
  URL.revokeObjectURL(a.href);
});

// src/sim.ts
import { sim_moves_stl, sim_moves_svg } from "../pkg/rustcam.js";
var simCanvas = $canvas("sim-canvas");
var simPlay = $btn("sim-play");
var simReset = $btn("sim-reset");
var simSpeed = $input("sim-speed");
var simScrub = $input("sim-scrub");
var simInfo = $("sim-info");
var simMoves = [];
var simIdx = 0;
var simRunning = false;
var simRaf = null;
var simBounds = null;
var simScale = 1;
var simOffX = 0;
var simOffY = 0;
var matCanvas = null;
var matCtx = null;
function loadSim() {
  try {
    const cfg = getConfig();
    let json;
    if (fileType === "stl") json = sim_moves_stl(fileData, cfg);
    else json = sim_moves_svg(fileData, cfg);
    simMoves = JSON.parse(json);
  } catch (e) {
    simMoves = [];
    console.warn("sim_moves error:", e);
  }
  simIdx = 0;
  simScrub.max = String(Math.max(simMoves.length - 1, 1));
  simScrub.value = "0";
  simInfo.textContent = `0 / ${simMoves.length}`;
  simRunning = false;
  simPlay.textContent = "Play";
  computeSimBounds();
  initMatCanvas();
  drawSimFrame();
}
function computeSimBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const m of simMoves) {
    if (m.x < minX) minX = m.x;
    if (m.y < minY) minY = m.y;
    if (m.x > maxX) maxX = m.x;
    if (m.y > maxY) maxY = m.y;
  }
  if (!simMoves.length) {
    minX = 0;
    minY = 0;
    maxX = 10;
    maxY = 10;
  }
  let w = maxX - minX, h = maxY - minY;
  if (w === 0 && h === 0) {
    w = 1;
    h = 1;
  } else if (w === 0) {
    w = h;
    minX -= w / 2;
    maxX += w / 2;
  } else if (h === 0) {
    h = w;
    minY -= h / 2;
    maxY += h / 2;
  }
  simBounds = { minX, minY, maxX, maxY, w, h };
}
function resizeSim() {
  if (!simBounds) return;
  const rect = simCanvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const dpr = window.devicePixelRatio || 1;
  simCanvas.width = rect.width * dpr;
  simCanvas.height = rect.height * dpr;
  const pad = Math.max(8, Math.min(40, Math.min(rect.width, rect.height) * 0.08));
  const availW = Math.max(rect.width - pad * 2, 1);
  const availH = Math.max(rect.height - pad * 2, 1);
  simScale = Math.min(availW / simBounds.w, availH / simBounds.h);
  simOffX = pad + (availW - simBounds.w * simScale) / 2;
  simOffY = pad + (availH - simBounds.h * simScale) / 2;
  initMatCanvas();
  replayMat(simIdx);
  drawSimFrame();
}
function initMatCanvas() {
  const rect = simCanvas.getBoundingClientRect();
  if (rect.width < 1) return;
  const dpr = window.devicePixelRatio || 1;
  matCanvas = document.createElement("canvas");
  matCanvas.width = rect.width * dpr;
  matCanvas.height = rect.height * dpr;
  matCtx = matCanvas.getContext("2d");
}
function simTx(x) {
  return simOffX + (x - simBounds.minX) * simScale;
}
function simTy(y) {
  return simOffY + (simBounds.maxY - y) * simScale;
}
function stampMat(ax, ay, bx, by, toolR) {
  if (!matCtx) return;
  const dpr = window.devicePixelRatio || 1;
  matCtx.save();
  matCtx.scale(dpr, dpr);
  matCtx.strokeStyle = theme.colors.simMaterialRemoval;
  matCtx.lineWidth = toolR * simScale * 2;
  matCtx.lineCap = "round";
  matCtx.beginPath();
  matCtx.moveTo(simTx(ax), simTy(ay));
  matCtx.lineTo(simTx(bx), simTy(by));
  matCtx.stroke();
  matCtx.restore();
}
function replayMat(n) {
  if (!matCtx || !matCanvas) return;
  matCtx.clearRect(0, 0, matCanvas.width, matCanvas.height);
  const toolR = parseFloat($input("tool-diameter").value) / 2;
  const safeZ = parseFloat($input("safe-z").value);
  for (let i = 1; i <= n && i < simMoves.length; i++) {
    const prev = simMoves[i - 1];
    const cur = simMoves[i];
    if (!cur.rapid && cur.z < safeZ - 0.01) {
      stampMat(prev.x, prev.y, cur.x, cur.y, toolR);
    }
  }
}
function drawSimFrame() {
  const ctx = simCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = simCanvas.getBoundingClientRect();
  if (rect.width < 1) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (simBounds) {
    ctx.strokeStyle = theme.colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      simTx(simBounds.minX) - 4,
      simTy(simBounds.maxY) - 4,
      simBounds.w * simScale + 8,
      simBounds.h * simScale + 8
    );
  }
  if (matCanvas) ctx.drawImage(matCanvas, 0, 0, matCanvas.width / dpr, matCanvas.height / dpr);
  if (simMoves.length > 1 && simIdx > 0) {
    ctx.lineWidth = 0.8;
    ctx.lineJoin = "round";
    for (let i = 1; i <= simIdx && i < simMoves.length; i++) {
      const prev = simMoves[i - 1];
      const cur = simMoves[i];
      ctx.strokeStyle = cur.rapid ? theme.colors.simRapid : theme.colors.simCutting;
      ctx.beginPath();
      ctx.moveTo(simTx(prev.x), simTy(prev.y));
      ctx.lineTo(simTx(cur.x), simTy(cur.y));
      ctx.stroke();
    }
  }
  if (simIdx < simMoves.length) {
    const m = simMoves[simIdx];
    const toolR = parseFloat($input("tool-diameter").value) / 2;
    const r = toolR * simScale;
    const cx = simTx(m.x), cy = simTy(m.y);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = theme.colors.simToolShadow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const cutting = !m.rapid && m.z < parseFloat($input("safe-z").value) - 0.01;
    ctx.fillStyle = cutting ? theme.colors.simToolCutting : theme.colors.simToolIdle;
    ctx.strokeStyle = cutting ? theme.colors.simToolOutlineCutting : theme.colors.simToolOutlineIdle;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = theme.colors.simToolCenter;
    ctx.fill();
    ctx.fillStyle = theme.colors.textDim;
    ctx.font = "11px monospace";
    ctx.fillText(`Z${m.z.toFixed(2)}`, cx + r + 6, cy + 4);
  }
  ctx.restore();
  simInfo.textContent = `${simIdx} / ${simMoves.length}`;
}
simPlay.addEventListener("click", () => {
  if (!simMoves.length) return;
  simRunning = !simRunning;
  simPlay.textContent = simRunning ? "Pause" : "Play";
  if (simRunning) simTick();
});
simReset.addEventListener("click", () => {
  simRunning = false;
  simPlay.textContent = "Play";
  if (simRaf) cancelAnimationFrame(simRaf);
  simIdx = 0;
  simScrub.value = "0";
  initMatCanvas();
  drawSimFrame();
});
simScrub.addEventListener("input", () => {
  simIdx = parseInt(simScrub.value);
  replayMat(simIdx);
  drawSimFrame();
});
function simTick() {
  if (!simRunning) return;
  const speed = parseInt(simSpeed.value);
  const safeZ = parseFloat($input("safe-z").value);
  const toolR = parseFloat($input("tool-diameter").value) / 2;
  const steps = Math.max(1, Math.round(speed / 10));
  for (let s = 0; s < steps; s++) {
    if (simIdx >= simMoves.length - 1) {
      simRunning = false;
      simPlay.textContent = "Play";
      break;
    }
    simIdx++;
    const prev = simMoves[simIdx - 1];
    const cur = simMoves[simIdx];
    if (!cur.rapid && cur.z < safeZ - 0.01) {
      stampMat(prev.x, prev.y, cur.x, cur.y, toolR);
    }
  }
  simScrub.value = String(simIdx);
  drawSimFrame();
  if (simRunning) simRaf = requestAnimationFrame(simTick);
}

// src/sketch.ts
var sketchShapes = [];
var sketchTool = "line";
var sketchDraft = null;
var sketchPolyPts = [];
var _currentMode = "cam";
function getCurrentMode() {
  return _currentMode;
}
function setCurrentMode(m) {
  _currentMode = m;
}
var sketchCvs = $canvas("sketch-canvas");
var sketchCtx2d = sketchCvs.getContext("2d");
var sketchCursorEl = $("sketch-cursor-pos");
document.querySelectorAll(".btn-tool").forEach((btn) => {
  btn.addEventListener("click", () => {
    finishPolyline();
    sketchDraft = null;
    sketchTool = btn.dataset.tool;
    document.querySelectorAll(".btn-tool").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    redrawSketch();
  });
});
function sketchCanvasSize() {
  return parseFloat($input("canvas-size").value) || 100;
}
function sketchGridSnap() {
  return parseFloat($input("grid-snap").value) || 0;
}
function sketchScreenToWorld(clientX, clientY) {
  const rect = sketchCvs.getBoundingClientRect();
  const size = sketchCanvasSize();
  const pad = 20;
  const avail = Math.min(rect.width, rect.height) - pad * 2;
  const scale = avail / size;
  const offX = (rect.width - size * scale) / 2;
  const offY = (rect.height - size * scale) / 2;
  let x = (clientX - rect.left - offX) / scale;
  let y = (clientY - rect.top - offY) / scale;
  const snap = sketchGridSnap();
  if (snap > 0) {
    x = Math.round(x / snap) * snap;
    y = Math.round(y / snap) * snap;
  }
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}
function resizeSketchCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = sketchCvs.getBoundingClientRect();
  if (rect.width < 1) return;
  sketchCvs.width = rect.width * dpr;
  sketchCvs.height = rect.height * dpr;
}
function redrawSketch() {
  const ctx = sketchCtx2d;
  const dpr = window.devicePixelRatio || 1;
  const rect = sketchCvs.getBoundingClientRect();
  if (rect.width < 1) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const size = sketchCanvasSize();
  const pad = 20;
  const avail = Math.min(rect.width, rect.height) - pad * 2;
  const scale = avail / size;
  const offX = (rect.width - size * scale) / 2;
  const offY = (rect.height - size * scale) / 2;
  const tx = (v) => offX + v * scale;
  const ty = (v) => offY + v * scale;
  ctx.strokeStyle = theme.colors.surface;
  ctx.lineWidth = 0.5;
  const snap = sketchGridSnap() || size / 10;
  const maxLines = 200;
  if (size / snap <= maxLines) {
    for (let v = 0; v <= size; v += snap) {
      ctx.beginPath();
      ctx.moveTo(tx(v), ty(0));
      ctx.lineTo(tx(v), ty(size));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx(0), ty(v));
      ctx.lineTo(tx(size), ty(v));
      ctx.stroke();
    }
  }
  ctx.strokeStyle = theme.colors.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(tx(0), ty(0), size * scale, size * scale);
  ctx.fillStyle = theme.colors.textDim;
  ctx.font = "10px monospace";
  ctx.fillText("0,0", tx(0) + 2, ty(0) - 4);
  ctx.fillText(`${size},${size}`, tx(size) - 40, ty(size) + 12);
  for (const s of sketchShapes) drawShape(ctx, s, theme.colors.accent, tx, ty, scale);
  if (sketchDraft) drawShape(ctx, sketchDraft, theme.colors.success, tx, ty, scale);
  if (sketchTool === "polyline" && sketchPolyPts.length > 0) {
    ctx.strokeStyle = theme.colors.success;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx(sketchPolyPts[0].x), ty(sketchPolyPts[0].y));
    for (let i = 1; i < sketchPolyPts.length; i++)
      ctx.lineTo(tx(sketchPolyPts[i].x), ty(sketchPolyPts[i].y));
    if (sketchDraft && "_cursor" in sketchDraft && sketchDraft._cursor)
      ctx.lineTo(tx(sketchDraft._cursor.x), ty(sketchDraft._cursor.y));
    ctx.stroke();
    ctx.fillStyle = theme.colors.success;
    for (const p of sketchPolyPts) {
      ctx.beginPath();
      ctx.arc(tx(p.x), ty(p.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
function drawShape(ctx, s, color, tx, ty, scale) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const shape = s;
  if (!("type" in shape)) return;
  switch (shape.type) {
    case "line":
      ctx.beginPath();
      ctx.moveTo(tx(shape.p1.x), ty(shape.p1.y));
      ctx.lineTo(tx(shape.p2.x), ty(shape.p2.y));
      ctx.stroke();
      break;
    case "rect":
      ctx.strokeRect(
        tx(Math.min(shape.x, shape.x + shape.w)),
        ty(Math.min(shape.y, shape.y + shape.h)),
        Math.abs(shape.w) * scale,
        Math.abs(shape.h) * scale
      );
      break;
    case "circle":
      ctx.beginPath();
      ctx.arc(tx(shape.cx), ty(shape.cy), shape.r * scale, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "polyline":
      if (shape.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(tx(shape.points[0].x), ty(shape.points[0].y));
      for (let i = 1; i < shape.points.length; i++)
        ctx.lineTo(tx(shape.points[i].x), ty(shape.points[i].y));
      ctx.stroke();
      break;
  }
}
var sketchMouseDown = false;
var sketchStart = null;
sketchCvs.addEventListener("mousedown", (e) => {
  if (getCurrentMode() !== "sketch") return;
  if (sketchTool === "polyline") return;
  const p = sketchScreenToWorld(e.clientX, e.clientY);
  sketchMouseDown = true;
  sketchStart = p;
  if (sketchTool === "line") sketchDraft = { type: "line", p1: p, p2: p };
  else if (sketchTool === "rect") sketchDraft = { type: "rect", x: p.x, y: p.y, w: 0, h: 0 };
  else if (sketchTool === "circle") sketchDraft = { type: "circle", cx: p.x, cy: p.y, r: 0 };
});
sketchCvs.addEventListener("mousemove", (e) => {
  if (getCurrentMode() !== "sketch") return;
  const p = sketchScreenToWorld(e.clientX, e.clientY);
  sketchCursorEl.textContent = `${p.x}, ${p.y} mm`;
  if (sketchTool === "polyline" && sketchPolyPts.length > 0) {
    sketchDraft = { _cursor: p };
    redrawSketch();
    return;
  }
  if (!sketchMouseDown || !sketchDraft) return;
  if (sketchTool === "line" && "p2" in sketchDraft) sketchDraft.p2 = p;
  else if (sketchTool === "rect" && "w" in sketchDraft) {
    sketchDraft.w = p.x - sketchStart.x;
    sketchDraft.h = p.y - sketchStart.y;
  } else if (sketchTool === "circle" && "r" in sketchDraft) {
    const dx = p.x - sketchStart.x, dy = p.y - sketchStart.y;
    sketchDraft.r = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
  }
  redrawSketch();
});
sketchCvs.addEventListener("mouseup", () => {
  if (getCurrentMode() !== "sketch" || !sketchMouseDown) return;
  sketchMouseDown = false;
  if (!sketchDraft || !("type" in sketchDraft)) return;
  const d = sketchDraft;
  if (d.type === "line") {
    if (d.p1.x === d.p2.x && d.p1.y === d.p2.y) {
      sketchDraft = null;
      return;
    }
  } else if (d.type === "rect") {
    if (d.w === 0 || d.h === 0) {
      sketchDraft = null;
      return;
    }
  } else if (d.type === "circle") {
    if (d.r === 0) {
      sketchDraft = null;
      return;
    }
  }
  sketchShapes.push(d);
  sketchDraft = null;
  updateShapeList();
  redrawSketch();
});
sketchCvs.addEventListener("click", (e) => {
  if (getCurrentMode() !== "sketch" || sketchTool !== "polyline") return;
  const p = sketchScreenToWorld(e.clientX, e.clientY);
  sketchPolyPts.push(p);
  redrawSketch();
});
sketchCvs.addEventListener("dblclick", () => {
  if (getCurrentMode() !== "sketch" || sketchTool !== "polyline") return;
  if (sketchPolyPts.length > 0) sketchPolyPts.pop();
  finishPolyline();
});
function finishPolyline() {
  if (sketchPolyPts.length >= 2) {
    sketchShapes.push({ type: "polyline", points: [...sketchPolyPts] });
    updateShapeList();
  }
  sketchPolyPts = [];
  sketchDraft = null;
  redrawSketch();
}
window.addEventListener("keydown", (e) => {
  if (getCurrentMode() !== "sketch") return;
  if (e.key === "Escape") {
    sketchPolyPts = [];
    sketchDraft = null;
    redrawSketch();
  }
  if (e.key === "Enter" && sketchTool === "polyline") finishPolyline();
});
var onShapeListUpdate = null;
function setOnShapeListUpdate(fn) {
  onShapeListUpdate = fn;
}
function updateShapeList() {
  const list = $("shape-list");
  const count = $("shape-count");
  count.textContent = String(sketchShapes.length);
  list.innerHTML = sketchShapes.map((s, i) => {
    let desc = "";
    if (s.type === "line") desc = `Line (${s.p1.x},${s.p1.y}) \u2192 (${s.p2.x},${s.p2.y})`;
    else if (s.type === "rect") desc = `Rect ${Math.abs(s.w)}\xD7${Math.abs(s.h)} at (${Math.min(s.x, s.x + s.w)},${Math.min(s.y, s.y + s.h)})`;
    else if (s.type === "circle") desc = `Circle r=${s.r} at (${s.cx},${s.cy})`;
    else if (s.type === "polyline") desc = `Polyline ${s.points.length} pts`;
    return `<div>${i + 1}. ${desc}</div>`;
  }).join("");
  if (onShapeListUpdate) onShapeListUpdate();
}
$("sketch-undo").addEventListener("click", () => {
  sketchShapes.pop();
  updateShapeList();
  redrawSketch();
});
$("sketch-clear").addEventListener("click", () => {
  sketchShapes.length = 0;
  updateShapeList();
  redrawSketch();
});
$input("canvas-size").addEventListener("change", redrawSketch);
$input("grid-snap").addEventListener("change", redrawSketch);
function sketchToSvg() {
  const size = sketchCanvasSize();
  let elements = "";
  for (const s of sketchShapes) {
    switch (s.type) {
      case "line":
        elements += `<path d="M ${s.p1.x} ${s.p1.y} L ${s.p2.x} ${s.p2.y}"/>`;
        break;
      case "rect": {
        const rx = Math.min(s.x, s.x + s.w), ry = Math.min(s.y, s.y + s.h);
        elements += `<rect x="${rx}" y="${ry}" width="${Math.abs(s.w)}" height="${Math.abs(s.h)}"/>`;
        break;
      }
      case "circle":
        elements += `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`;
        break;
      case "polyline": {
        const pts = s.points.map((p) => `${p.x},${p.y}`).join(" ");
        elements += `<polyline points="${pts}"/>`;
        break;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${elements}</svg>`;
}

// src/constraints.ts
import {
  sketch_reset,
  sketch_add_point,
  sketch_add_constraint,
  sketch_solve,
  sketch_remove_constraint
} from "../pkg/rustcam.js";
var cstMode = null;
var cstPicks = [];
var cstPointMap = {};
var cstLastSnap = null;
var cstStatusEl = $("cst-status");
var cstDofEl = $("cst-dof");
var cstListEl = $("cst-list");
var CST_PICK_COUNT = {
  coincident: 2,
  horizontal: 2,
  vertical: 2,
  distance: 2,
  fixed: 1,
  perpendicular: 4,
  parallel: 4,
  equal_length: 4
};
var shapePointIds = [];
document.querySelectorAll(".btn-cst").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.cst;
    if (cstMode === type) {
      cancelCstPick();
      return;
    }
    cstMode = type;
    cstPicks = [];
    document.querySelectorAll(".btn-cst").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    cstStatusEl.textContent = `Pick ${CST_PICK_COUNT[type]} point(s) on canvas\u2026`;
  });
});
function cancelCstPick() {
  cstMode = null;
  cstPicks = [];
  document.querySelectorAll(".btn-cst").forEach((b) => b.classList.remove("active"));
  cstStatusEl.textContent = "";
}
function syncShapesToActor() {
  sketch_reset();
  shapePointIds = [];
  for (let i = 0; i < sketchShapes.length; i++) {
    const s = sketchShapes[i];
    const ids = [];
    if (s.type === "line") {
      ids.push(JSON.parse(sketch_add_point(s.p1.x, s.p1.y)).id);
      ids.push(JSON.parse(sketch_add_point(s.p2.x, s.p2.y)).id);
    } else if (s.type === "rect") {
      const rx = Math.min(s.x, s.x + s.w), ry = Math.min(s.y, s.y + s.h);
      const w = Math.abs(s.w), h = Math.abs(s.h);
      ids.push(JSON.parse(sketch_add_point(rx, ry)).id);
      ids.push(JSON.parse(sketch_add_point(rx + w, ry)).id);
      ids.push(JSON.parse(sketch_add_point(rx + w, ry + h)).id);
      ids.push(JSON.parse(sketch_add_point(rx, ry + h)).id);
    } else if (s.type === "circle") {
      ids.push(JSON.parse(sketch_add_point(s.cx, s.cy)).id);
      ids.push(JSON.parse(sketch_add_point(s.cx + s.r, s.cy)).id);
    } else if (s.type === "polyline") {
      for (const p of s.points) {
        ids.push(JSON.parse(sketch_add_point(p.x, p.y)).id);
      }
    }
    shapePointIds.push({ shapeIdx: i, pointIds: ids });
  }
  solveAndRender();
}
function solveAndRender() {
  try {
    const json = sketch_solve();
    cstLastSnap = JSON.parse(json);
    cstPointMap = {};
    for (const [id, pt] of cstLastSnap.points) {
      cstPointMap[id] = pt;
    }
    const d = cstLastSnap.dof;
    const status = cstLastSnap.dof_status;
    const color = status === "FullyConstrained" ? theme.colors.cstFullyConstrained : status === "OverConstrained" ? theme.colors.cstOverConstrained : theme.colors.cstUnderConstrained;
    cstDofEl.style.color = color;
    cstDofEl.textContent = `DOF: ${d} (${status.replace(/([A-Z])/g, " $1").trim()})`;
    cstListEl.innerHTML = cstLastSnap.constraints.map(([id, c]) => {
      const type = Object.keys(c)[0] || "unknown";
      return `<div>${id}. ${type} <button onclick="window.__removeCst(${id})" style="font-size:10px;cursor:pointer;background:none;border:none;color:${theme.colors.cstOverConstrained}">\u2715</button></div>`;
    }).join("");
    redrawSketch();
  } catch (e) {
    cstStatusEl.textContent = `Solve error: ${e}`;
  }
}
window.__removeCst = (id) => {
  sketch_remove_constraint(id);
  solveAndRender();
};
function findNearestPoint(wx, wy, maxDist) {
  let best = null, bestD = maxDist;
  for (const entry of shapePointIds) {
    for (const pid of entry.pointIds) {
      const pt = cstPointMap[pid];
      if (!pt) continue;
      const d = Math.sqrt((pt.x - wx) ** 2 + (pt.y - wy) ** 2);
      if (d < bestD) {
        bestD = d;
        best = pid;
      }
    }
  }
  return best;
}
sketchCvs.addEventListener("click", (e) => {
  if (getCurrentMode() !== "sketch" || !cstMode) return;
  const p = sketchScreenToWorld(e.clientX, e.clientY);
  const snapDist = (sketchGridSnap() || 1) * 2;
  const pid = findNearestPoint(p.x, p.y, snapDist);
  if (pid == null) {
    cstStatusEl.textContent = "No point nearby \u2014 click closer to a shape vertex.";
    return;
  }
  cstPicks.push(pid);
  const needed = CST_PICK_COUNT[cstMode];
  cstStatusEl.textContent = `Picked ${cstPicks.length}/${needed} points\u2026`;
  if (cstPicks.length >= needed) {
    applyConstraint();
  }
});
function applyConstraint() {
  let value = 0, value2 = 0;
  if (cstMode === "distance") {
    const a = cstPointMap[cstPicks[0]], b = cstPointMap[cstPicks[1]];
    const cur = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const input = prompt(`Distance (current: ${cur.toFixed(2)} mm):`, cur.toFixed(2));
    if (input == null) {
      cancelCstPick();
      return;
    }
    value = parseFloat(input);
    if (isNaN(value) || value <= 0) {
      cancelCstPick();
      return;
    }
  } else if (cstMode === "fixed") {
    const pt = cstPointMap[cstPicks[0]];
    value = pt.x;
    value2 = pt.y;
  }
  try {
    sketch_add_constraint(cstMode, JSON.stringify(cstPicks), value, value2);
    solveAndRender();
    cstStatusEl.textContent = `Added ${cstMode} constraint.`;
  } catch (e) {
    cstStatusEl.textContent = `Error: ${e}`;
  }
  cstMode = null;
  cstPicks = [];
  document.querySelectorAll(".btn-cst").forEach((b) => b.classList.remove("active"));
}
setOnShapeListUpdate(syncShapesToActor);
function drawConstraintOverlay() {
  if (!cstLastSnap || getCurrentMode() !== "sketch") return;
  const ctx = sketchCtx2d;
  const dpr = window.devicePixelRatio || 1;
  const rect = sketchCvs.getBoundingClientRect();
  if (rect.width < 1) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const size = sketchCanvasSize();
  const pad = 20;
  const avail = Math.min(rect.width, rect.height) - pad * 2;
  const scale = avail / size;
  const offX = (rect.width - size * scale) / 2;
  const offY = (rect.height - size * scale) / 2;
  const tx = (v) => offX + v * scale;
  const ty = (v) => offY + v * scale;
  for (const [id, pt] of cstLastSnap.points) {
    const status = cstLastSnap.point_status[id] || "UnderConstrained";
    const color = status === "FullyConstrained" ? theme.colors.cstFullyConstrained : status === "OverConstrained" ? theme.colors.cstOverConstrained : theme.colors.cstUnderConstrained;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx(pt.x), ty(pt.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.colors.textDim;
    ctx.font = "9px monospace";
    ctx.fillText(String(id), tx(pt.x) + 5, ty(pt.y) - 5);
  }
  ctx.strokeStyle = theme.colors.cstPickHighlight;
  ctx.lineWidth = 2;
  for (const pid of cstPicks) {
    const pt = cstPointMap[pid];
    if (!pt) continue;
    ctx.beginPath();
    ctx.arc(tx(pt.x), ty(pt.y), 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// src/dataflow/index.ts
import { dataflow_codegen, dataflow_codegen_multi } from "../pkg/rustsim.js";

// src/dataflow/graph.ts
import {
  dataflow_new,
  dataflow_destroy,
  dataflow_add_block,
  dataflow_remove_block,
  dataflow_update_block,
  dataflow_connect,
  dataflow_disconnect,
  dataflow_advance,
  dataflow_run,
  dataflow_set_speed,
  dataflow_snapshot,
  dataflow_block_types
} from "../pkg/rustsim.js";
var DataflowManager = class {
  graphId;
  running = false;
  rafId = null;
  lastTime = null;
  /** UI positions for each block, keyed by block id. */
  positions = /* @__PURE__ */ new Map();
  /** Optional telemetry publisher for CRUD events. */
  telemetry = null;
  /** Callback invoked after each tick with the latest snapshot. */
  onTick = null;
  constructor(dt = 0.01) {
    this.graphId = dataflow_new(dt);
  }
  destroy() {
    this.stop();
    dataflow_destroy(this.graphId);
  }
  addBlock(blockType, config, x = 100, y = 100) {
    const id = dataflow_add_block(this.graphId, blockType, JSON.stringify(config));
    this.positions.set(id, { x, y });
    this.telemetry?.publish({ tag: 50, blockId: id, blockType, config, x, y });
    return id;
  }
  updateBlock(blockId, blockType, config) {
    dataflow_update_block(this.graphId, blockId, blockType, JSON.stringify(config));
    this.telemetry?.publish({ tag: 52, blockId, blockType, config });
  }
  removeBlock(blockId) {
    dataflow_remove_block(this.graphId, blockId);
    this.positions.delete(blockId);
    this.telemetry?.publish({ tag: 51, blockId });
  }
  connect(fromBlock, fromPort, toBlock, toPort) {
    const id = dataflow_connect(this.graphId, fromBlock, fromPort, toBlock, toPort);
    this.telemetry?.publish({ tag: 53, fromBlock, fromPort, toBlock, toPort, channelId: id });
    return id;
  }
  disconnect(channelId) {
    dataflow_disconnect(this.graphId, channelId);
    this.telemetry?.publish({ tag: 54, channelId });
  }
  setSpeed(speed) {
    dataflow_set_speed(this.graphId, speed);
  }
  snapshot() {
    return JSON.parse(dataflow_snapshot(this.graphId));
  }
  /** Run N ticks instantly (non-realtime batch). */
  runBatch(steps, dt) {
    const json = dataflow_run(this.graphId, steps, dt);
    return JSON.parse(json);
  }
  /** Start the realtime tick loop. */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = null;
    this.tick();
  }
  /** Stop the realtime tick loop. */
  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTime = null;
  }
  tick = () => {
    if (!this.running) return;
    const now = performance.now() / 1e3;
    if (this.lastTime !== null) {
      const elapsed = Math.min(now - this.lastTime, 0.1);
      const json = dataflow_advance(this.graphId, elapsed);
      const snap = JSON.parse(json);
      this.onTick?.(snap);
    }
    this.lastTime = now;
    this.rafId = requestAnimationFrame(this.tick);
  };
  /** Replay a saved project into this (empty) graph. Returns old→new block ID map. */
  restoreProject(project) {
    const idMap = /* @__PURE__ */ new Map();
    for (const block of project.graph.blocks) {
      const newId = this.addBlock(block.blockType, block.config);
      idMap.set(block.id, newId);
      const pos = project.positions[block.id];
      if (pos) this.positions.set(newId, { x: pos.x, y: pos.y });
    }
    for (const ch of project.graph.channels) {
      const from = idMap.get(ch.fromBlock);
      const to = idMap.get(ch.toBlock);
      if (from !== void 0 && to !== void 0) {
        this.connect(from, ch.fromPort, to, ch.toPort);
      }
    }
    return idMap;
  }
  static blockTypes() {
    return JSON.parse(dataflow_block_types());
  }
};

// src/dataflow/edge-view.ts
var NODE_W = 140;
var PORT_OFFSET_Y = 30;
var PORT_SPACING = 20;
function edgePath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const cpX = Math.max(dx * 0.5, Math.min(Math.abs(y2 - y1), 50));
  return `M ${x1},${y1} C ${x1 + cpX},${y1} ${x2 - cpX},${y2} ${x2},${y2}`;
}
function portY(nodeY, portIndex) {
  return nodeY + PORT_OFFSET_Y + portIndex * PORT_SPACING + PORT_SPACING / 2;
}
function reconcileEdges(svg, edges, channels, blocks, positions, selectedEdge = null) {
  const blockMap = /* @__PURE__ */ new Map();
  for (const b of blocks) blockMap.set(b.id, b);
  const currentIds = /* @__PURE__ */ new Set();
  for (const ch of channels) {
    const chId = ch.id[0];
    currentIds.add(chId);
    const fromBlock = blockMap.get(ch.from_block[0]);
    const toBlock = blockMap.get(ch.to_block[0]);
    if (!fromBlock || !toBlock) continue;
    const fromPos = positions.get(fromBlock.id) ?? { x: 0, y: 0 };
    const toPos = positions.get(toBlock.id) ?? { x: 0, y: 0 };
    const x1 = fromPos.x + NODE_W;
    const y1 = portY(fromPos.y, ch.from_port);
    const x2 = toPos.x;
    const y2 = portY(toPos.y, ch.to_port);
    let path = edges.paths.get(chId);
    if (!path) {
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("df-edge");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", "2");
      path.dataset.ch = String(chId);
      svg.appendChild(path);
      edges.paths.set(chId, path);
    }
    const outPort = fromBlock.outputs[ch.from_port];
    const color = outPort ? portColor(outPort.kind) : portColor("Any");
    path.setAttribute("stroke", color);
    path.setAttribute("d", edgePath(x1, y1, x2, y2));
    path.classList.toggle("selected", chId === selectedEdge);
  }
  for (const [id, path] of edges.paths) {
    if (!currentIds.has(id)) {
      path.remove();
      edges.paths.delete(id);
    }
  }
}
function updateEdgesForBlock(edges, channels, blocks, positions, blockId) {
  const blockMap = /* @__PURE__ */ new Map();
  for (const b of blocks) blockMap.set(b.id, b);
  for (const ch of channels) {
    if (ch.from_block[0] !== blockId && ch.to_block[0] !== blockId) continue;
    const chId = ch.id[0];
    const path = edges.paths.get(chId);
    if (!path) continue;
    const fromBlock = blockMap.get(ch.from_block[0]);
    const toBlock = blockMap.get(ch.to_block[0]);
    if (!fromBlock || !toBlock) continue;
    const fromPos = positions.get(fromBlock.id) ?? { x: 0, y: 0 };
    const toPos = positions.get(toBlock.id) ?? { x: 0, y: 0 };
    const x1 = fromPos.x + NODE_W;
    const y1 = portY(fromPos.y, ch.from_port);
    const x2 = toPos.x;
    const y2 = portY(toPos.y, ch.to_port);
    path.setAttribute("d", edgePath(x1, y1, x2, y2));
  }
}
function createDragWire(svg) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add("df-edge", "dragging");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-dasharray", "4 4");
  svg.appendChild(path);
  return path;
}

// src/dataflow/port-view.ts
var NODE_W2 = 140;
var PORT_R = 6;
var PORT_SPACING2 = 20;
var PORT_OFFSET_Y2 = 30;
function createPorts(nodeEl, inputs, outputs, outputValues) {
  for (let i = 0; i < inputs.length; i++) {
    const port = inputs[i];
    const py = PORT_OFFSET_Y2 + i * PORT_SPACING2 + PORT_SPACING2 / 2;
    const portEl = document.createElement("div");
    portEl.className = "df-port";
    portEl.dataset.side = "input";
    portEl.dataset.index = String(i);
    portEl.style.backgroundColor = portColor(port.kind);
    portEl.style.left = `${-PORT_R}px`;
    portEl.style.top = `${py - PORT_R}px`;
    nodeEl.appendChild(portEl);
    const label = document.createElement("span");
    label.className = "df-port-label";
    label.style.left = `${PORT_R + 4}px`;
    label.style.top = `${py - 5}px`;
    label.textContent = port.name;
    nodeEl.appendChild(label);
  }
  for (let i = 0; i < outputs.length; i++) {
    const port = outputs[i];
    const py = PORT_OFFSET_Y2 + i * PORT_SPACING2 + PORT_SPACING2 / 2;
    const portEl = document.createElement("div");
    portEl.className = "df-port";
    portEl.dataset.side = "output";
    portEl.dataset.index = String(i);
    portEl.style.backgroundColor = portColor(port.kind);
    portEl.style.left = `${NODE_W2 - PORT_R}px`;
    portEl.style.top = `${py - PORT_R}px`;
    nodeEl.appendChild(portEl);
    const val = outputValues[i];
    let labelText = port.name;
    if (val) {
      if (val.type === "Float") labelText = val.data.toFixed(2);
      else if (val.type === "Text") labelText = val.data.slice(0, 12);
      else if (val.type === "Series") labelText = `[${val.data.length}]`;
    }
    const label = document.createElement("span");
    label.className = "df-port-label df-output-value";
    label.style.right = `${PORT_R + 4}px`;
    label.style.top = `${py - 5}px`;
    label.textContent = labelText;
    nodeEl.appendChild(label);
  }
}
function updateOutputLabels(nodeEl, outputs, outputValues) {
  const labels = nodeEl.querySelectorAll(".df-output-value");
  for (let i = 0; i < labels.length && i < outputs.length; i++) {
    const val = outputValues[i];
    let labelText = outputs[i].name;
    if (val) {
      if (val.type === "Float") labelText = val.data.toFixed(2);
      else if (val.type === "Text") labelText = val.data.slice(0, 12);
      else if (val.type === "Series") labelText = `[${val.data.length}]`;
    }
    labels[i].textContent = labelText;
  }
}
function setupWireDrag(workspace, nodeLayer, svg, mgr2, _getSnap, getPanZoom, onConnect) {
  let wireDrag = null;
  function screenToWorld(clientX, clientY) {
    const rect = workspace.getBoundingClientRect();
    const { panX, panY, scale } = getPanZoom();
    return {
      x: (clientX - rect.left - panX) / scale,
      y: (clientY - rect.top - panY) / scale
    };
  }
  function onPointerDown(e) {
    const target2 = e.target;
    if (!target2.classList.contains("df-port")) return;
    const nodeEl = target2.closest(".df-node");
    if (!nodeEl) return;
    const blockId = parseInt(nodeEl.dataset.id);
    const side = target2.dataset.side;
    const portIndex = parseInt(target2.dataset.index);
    const isOutput = side === "output";
    const pos = mgr2.positions.get(blockId) ?? { x: 0, y: 0 };
    const fromX = isOutput ? pos.x + NODE_W2 : pos.x;
    const fromY = pos.y + PORT_OFFSET_Y2 + portIndex * PORT_SPACING2 + PORT_SPACING2 / 2;
    const dragPath = createDragWire(svg);
    dragPath.setAttribute("stroke", theme.colors.wireActive);
    wireDrag = { fromBlock: blockId, fromPort: portIndex, fromX, fromY, isOutput, dragPath };
    e.preventDefault();
    e.stopPropagation();
  }
  function onPointerMove(e) {
    if (!wireDrag) return;
    const world = screenToWorld(e.clientX, e.clientY);
    if (wireDrag.isOutput) {
      wireDrag.dragPath.setAttribute("d", edgePath(wireDrag.fromX, wireDrag.fromY, world.x, world.y));
    } else {
      wireDrag.dragPath.setAttribute("d", edgePath(world.x, world.y, wireDrag.fromX, wireDrag.fromY));
    }
  }
  function onPointerUp(e) {
    if (!wireDrag) return;
    const target2 = document.elementFromPoint(e.clientX, e.clientY);
    const trace = {
      event: "wire-drop",
      fromBlock: wireDrag.fromBlock,
      fromPort: wireDrag.fromPort,
      fromIsOutput: wireDrag.isOutput,
      targetElement: target2?.tagName,
      targetClasses: target2?.className,
      targetDataSide: target2?.dataset?.side,
      targetDataIndex: target2?.dataset?.index
    };
    if (!target2) {
      console.log("[wire-trace] no element at point", trace);
      wireDrag.dragPath.remove();
      wireDrag = null;
      return;
    }
    if (target2.classList.contains("df-port")) {
      const nodeEl = target2.closest(".df-node");
      if (nodeEl) {
        const toBlockId = parseInt(nodeEl.dataset.id);
        const toSide = target2.dataset.side;
        const toPortIndex = parseInt(target2.dataset.index);
        const toIsOutput = toSide === "output";
        trace.toBlock = toBlockId;
        trace.toPort = toPortIndex;
        trace.toIsOutput = toIsOutput;
        trace.sidesMatch = toIsOutput === wireDrag.isOutput;
        if (toIsOutput !== wireDrag.isOutput) {
          const outBlock = wireDrag.isOutput ? wireDrag.fromBlock : toBlockId;
          const outPort = wireDrag.isOutput ? wireDrag.fromPort : toPortIndex;
          const inBlock = wireDrag.isOutput ? toBlockId : wireDrag.fromBlock;
          const inPort = wireDrag.isOutput ? toPortIndex : wireDrag.fromPort;
          trace.connectCall = { outBlock, outPort, inBlock, inPort };
          try {
            mgr2.connect(outBlock, outPort, inBlock, inPort);
            trace.result = "success";
            console.log("[wire-trace]", trace);
            onConnect();
          } catch (err) {
            trace.result = "error";
            trace.error = String(err);
            console.error("[wire-trace]", trace);
            const origColor = target2.style.backgroundColor;
            target2.style.backgroundColor = "var(--color-danger)";
            setTimeout(() => {
              target2.style.backgroundColor = origColor;
            }, 500);
          }
        } else {
          trace.result = "same-side-skip";
          console.log("[wire-trace]", trace);
        }
      }
    } else {
      trace.result = "not-a-port";
      console.log("[wire-trace]", trace);
    }
    wireDrag.dragPath.remove();
    wireDrag = null;
  }
  nodeLayer.addEventListener("pointerdown", onPointerDown);
  workspace.addEventListener("pointermove", onPointerMove);
  workspace.addEventListener("pointerup", onPointerUp);
  return () => {
    nodeLayer.removeEventListener("pointerdown", onPointerDown);
    workspace.removeEventListener("pointermove", onPointerMove);
    workspace.removeEventListener("pointerup", onPointerUp);
    if (wireDrag) {
      wireDrag.dragPath.remove();
      wireDrag = null;
    }
  };
}

// src/dataflow/node-view.ts
var PORT_SPACING3 = 20;
var NODE_H_BASE = 40;
function nodeHeight(block) {
  const ports = Math.max(block.inputs.length, block.outputs.length);
  return NODE_H_BASE + Math.max(ports, 1) * PORT_SPACING3;
}
function reconcileNodes(nodeLayer, elements, blocks, positions, selectedId) {
  const currentIds = /* @__PURE__ */ new Set();
  for (const block of blocks) {
    currentIds.add(block.id);
    let nodeEl = elements.nodes.get(block.id);
    if (!nodeEl) {
      nodeEl = document.createElement("div");
      nodeEl.className = "df-node";
      nodeEl.dataset.id = String(block.id);
      const header = document.createElement("div");
      header.className = "df-node-header";
      header.textContent = block.name;
      nodeEl.appendChild(header);
      const typeLabel = document.createElement("span");
      typeLabel.className = "df-node-type";
      typeLabel.textContent = block.block_type;
      nodeEl.appendChild(typeLabel);
      createPorts(nodeEl, block.inputs, block.outputs, block.output_values);
      const h = nodeHeight(block);
      nodeEl.style.height = `${h}px`;
      nodeLayer.appendChild(nodeEl);
      elements.nodes.set(block.id, nodeEl);
    } else {
      updateOutputLabels(nodeEl, block.outputs, block.output_values);
    }
    const pos = positions.get(block.id) ?? { x: 50, y: 50 };
    nodeEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    nodeEl.classList.toggle("selected", block.id === selectedId);
  }
  for (const [id, nodeEl] of elements.nodes) {
    if (!currentIds.has(id)) {
      nodeEl.remove();
      elements.nodes.delete(id);
    }
  }
}
function setupNodeDrag(workspace, nodeLayer, mgr2, edges, getSnap, getPanZoom, onSelect, onDragEnd) {
  let dragBlockId = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  function screenToWorld(clientX, clientY) {
    const rect = workspace.getBoundingClientRect();
    const { panX, panY, scale } = getPanZoom();
    return {
      x: (clientX - rect.left - panX) / scale,
      y: (clientY - rect.top - panY) / scale
    };
  }
  function onPointerDown(e) {
    if (e.target.classList.contains("df-port")) return;
    const nodeEl = e.target.closest(".df-node");
    if (!nodeEl) {
      onSelect(null);
      return;
    }
    const blockId = parseInt(nodeEl.dataset.id);
    onSelect(blockId);
    const pos = mgr2.positions.get(blockId) ?? { x: 0, y: 0 };
    const world = screenToWorld(e.clientX, e.clientY);
    dragBlockId = blockId;
    dragOffsetX = world.x - pos.x;
    dragOffsetY = world.y - pos.y;
    nodeEl.style.cursor = "grabbing";
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (dragBlockId === null) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const newPos = {
      x: world.x - dragOffsetX,
      y: world.y - dragOffsetY
    };
    mgr2.positions.set(dragBlockId, newPos);
    const nodeElements = nodeLayer.querySelectorAll(".df-node");
    for (const el of nodeElements) {
      if (el.dataset.id === String(dragBlockId)) {
        el.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;
        break;
      }
    }
    const snap = getSnap();
    if (snap) {
      updateEdgesForBlock(edges, snap.channels, snap.blocks, mgr2.positions, dragBlockId);
    }
  }
  function onPointerUp() {
    if (dragBlockId !== null) {
      const nodeElements = nodeLayer.querySelectorAll(".df-node");
      for (const el of nodeElements) {
        if (el.dataset.id === String(dragBlockId)) {
          el.style.cursor = "grab";
          break;
        }
      }
      dragBlockId = null;
      onDragEnd();
    }
  }
  nodeLayer.addEventListener("pointerdown", onPointerDown);
  workspace.addEventListener("pointermove", onPointerMove);
  workspace.addEventListener("pointerup", onPointerUp);
  return () => {
    nodeLayer.removeEventListener("pointerdown", onPointerDown);
    workspace.removeEventListener("pointermove", onPointerMove);
    workspace.removeEventListener("pointerup", onPointerUp);
  };
}
function setupNodeDelete(nodeLayer, mgr2, _getSelected, onDelete) {
  function onContextMenu(e) {
    e.preventDefault();
    const nodeEl = e.target.closest(".df-node");
    if (!nodeEl) return;
    const blockId = parseInt(nodeEl.dataset.id);
    mgr2.removeBlock(blockId);
    onDelete(blockId);
  }
  nodeLayer.addEventListener("contextmenu", onContextMenu);
  return () => nodeLayer.removeEventListener("contextmenu", onContextMenu);
}

// src/dataflow/palette.ts
var DEFAULT_CONFIGS = {
  constant: { value: 1 },
  gain: { op: "Gain", param1: 1, param2: 0 },
  clamp: { op: "Clamp", param1: 0, param2: 100 },
  plot: { max_samples: 500 },
  udp_source: { address: "127.0.0.1:9000" },
  udp_sink: { address: "127.0.0.1:9001" },
  adc_source: { channel: 0, resolution_bits: 12 },
  pwm_sink: { channel: 0, frequency_hz: 1e3 },
  gpio_out: { pin: 13 },
  gpio_in: { pin: 2 },
  uart_tx: { port: 0, baud: 115200 },
  uart_rx: { port: 0, baud: 115200 }
};
function showPalette(workspace, blockTypes, mgr2, screenX, screenY, worldX, worldY, onBlockAdded) {
  workspace.querySelector(".df-palette")?.remove();
  const palette = document.createElement("div");
  palette.className = "df-palette";
  palette.style.left = `${screenX}px`;
  palette.style.top = `${screenY}px`;
  const search = document.createElement("input");
  search.className = "df-palette-search";
  search.type = "text";
  search.placeholder = "Search blocks...";
  palette.appendChild(search);
  const listContainer = document.createElement("div");
  palette.appendChild(listContainer);
  function renderList(filter) {
    listContainer.textContent = "";
    const lowerFilter = filter.toLowerCase();
    let lastCat = "";
    for (const bt of blockTypes) {
      if (filter && !bt.name.toLowerCase().includes(lowerFilter) && !bt.block_type.toLowerCase().includes(lowerFilter)) {
        continue;
      }
      if (bt.category !== lastCat) {
        lastCat = bt.category;
        const header = document.createElement("div");
        header.className = "df-palette-category";
        header.textContent = bt.category;
        listContainer.appendChild(header);
      }
      const item = document.createElement("div");
      item.className = "df-palette-item";
      item.textContent = bt.name;
      item.addEventListener("click", () => {
        const config = DEFAULT_CONFIGS[bt.block_type] ?? {};
        mgr2.addBlock(bt.block_type, config, worldX, worldY);
        palette.remove();
        onBlockAdded();
      });
      listContainer.appendChild(item);
    }
  }
  renderList("");
  search.addEventListener("input", () => renderList(search.value));
  search.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") palette.remove();
    if (e.key === "Enter") {
      const firstItem = listContainer.querySelector(".df-palette-item");
      firstItem?.click();
    }
  });
  const wsRect = workspace.getBoundingClientRect();
  palette.style.left = `${screenX - wsRect.left}px`;
  palette.style.top = `${screenY - wsRect.top}px`;
  palette.style.position = "absolute";
  palette.style.zIndex = "100";
  workspace.appendChild(palette);
  requestAnimationFrame(() => search.focus());
  const dismiss = (ev) => {
    if (!palette.contains(ev.target)) {
      palette.remove();
      document.removeEventListener("mousedown", dismiss);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", dismiss), 0);
}

// src/dataflow/editor.ts
var DataflowEditor = class {
  workspace;
  grid;
  svg;
  nodeLayer;
  mgr;
  snap = null;
  selected = null;
  selectedEdge = null;
  panX = 0;
  panY = 0;
  scale = 1;
  blockTypes;
  nodeElements = { nodes: /* @__PURE__ */ new Map() };
  edgeElements = { paths: /* @__PURE__ */ new Map() };
  cleanupFns = [];
  /** Fires when block selection changes. */
  onSelect = null;
  /** Fires when edge selection changes. */
  onEdgeSelect = null;
  /** Fires when graph structure changes (add/remove/connect/disconnect/move). */
  onChange = null;
  constructor(container, mgr2) {
    this.mgr = mgr2;
    this.blockTypes = DataflowManager.blockTypes();
    this.workspace = container;
    this.workspace.textContent = "";
    this.workspace.classList.add("df-workspace");
    this.grid = document.createElement("div");
    this.grid.className = "df-grid";
    this.workspace.appendChild(this.grid);
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("df-edge-layer");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.workspace.appendChild(this.svg);
    this.nodeLayer = document.createElement("div");
    this.nodeLayer.className = "df-node-layer";
    this.workspace.appendChild(this.nodeLayer);
    this.setupPanZoom();
    const cleanupDrag = setupNodeDrag(
      this.workspace,
      this.nodeLayer,
      mgr2,
      this.edgeElements,
      () => this.snap,
      () => ({ panX: this.panX, panY: this.panY, scale: this.scale }),
      (blockId) => {
        this.selected = blockId;
        this.selectedEdge = null;
        this.reconcile();
        this.onSelect?.(blockId, this.snap);
      },
      () => {
        this.onChange?.();
      }
    );
    this.cleanupFns.push(cleanupDrag);
    const cleanupDelete = setupNodeDelete(
      this.nodeLayer,
      mgr2,
      () => this.selected,
      (deletedId) => {
        if (this.selected === deletedId) {
          this.selected = null;
          this.onSelect?.(null, this.snap);
        }
        this.snap = mgr2.snapshot();
        this.reconcile();
        this.onChange?.();
      }
    );
    this.cleanupFns.push(cleanupDelete);
    const cleanupWire = setupWireDrag(
      this.workspace,
      this.nodeLayer,
      this.svg,
      mgr2,
      () => this.snap,
      () => ({ panX: this.panX, panY: this.panY, scale: this.scale }),
      () => {
        this.snap = mgr2.snapshot();
        this.reconcile();
        this.onChange?.();
      }
    );
    this.cleanupFns.push(cleanupWire);
    this.setupDblClick();
    this.setupEdgeClick();
    this.setupKeyDelete();
    mgr2.onTick = (snap) => {
      this.snap = snap;
      this.reconcile();
    };
    this.snap = mgr2.snapshot();
    this.reconcile();
  }
  resize() {
    this.applyTransform();
  }
  updateSnapshot() {
    this.snap = this.mgr.snapshot();
    this.reconcile();
  }
  clearSelection() {
    this.selected = null;
    this.selectedEdge = null;
    this.reconcile();
  }
  destroy() {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.mgr.onTick = null;
    this.workspace.removeEventListener("wheel", this.onWheel);
    this.workspace.removeEventListener("pointerdown", this.onPanStart);
    this.workspace.removeEventListener("dblclick", this.onDblClick);
    this.svg.removeEventListener("click", this.onEdgeClick);
    this.workspace.removeEventListener("keydown", this.onKeyDelete);
    this.workspace.textContent = "";
    this.nodeElements.nodes.clear();
    this.edgeElements.paths.clear();
  }
  reconcile() {
    if (!this.snap) return;
    reconcileNodes(this.nodeLayer, this.nodeElements, this.snap.blocks, this.mgr.positions, this.selected);
    reconcileEdges(this.svg, this.edgeElements, this.snap.channels, this.snap.blocks, this.mgr.positions, this.selectedEdge);
    const timeInfo = document.getElementById("df-time-info");
    if (timeInfo) timeInfo.textContent = `t=${this.snap.time.toFixed(3)}`;
  }
  applyTransform() {
    const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.nodeLayer.style.transform = transform;
    this.nodeLayer.style.transformOrigin = "0 0";
    this.svg.style.transform = transform;
    this.svg.style.transformOrigin = "0 0";
    const gridSize = 20 * this.scale;
    this.grid.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.grid.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
  }
  // ── Edge click ──────────────────────────────────────────────────
  onEdgeClick = (e) => {
    const target2 = e.target;
    const chAttr = target2 instanceof SVGElement ? target2.dataset.ch : void 0;
    if (!chAttr) return;
    const channelId = parseInt(chAttr, 10);
    if (isNaN(channelId)) return;
    this.selectedEdge = channelId;
    this.selected = null;
    this.reconcile();
    this.onEdgeSelect?.(channelId, this.snap);
  };
  setupEdgeClick() {
    this.svg.addEventListener("click", this.onEdgeClick);
  }
  // ── Keyboard delete ────────────────────────────────────────────
  onKeyDelete = (e) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (this.selectedEdge !== null) {
      this.mgr.disconnect(this.selectedEdge);
      this.selectedEdge = null;
      this.snap = this.mgr.snapshot();
      this.reconcile();
      this.onEdgeSelect?.(null, null);
      this.onChange?.();
    } else if (this.selected !== null) {
      const id = this.selected;
      this.mgr.removeBlock(id);
      this.selected = null;
      this.snap = this.mgr.snapshot();
      this.reconcile();
      this.onSelect?.(null, null);
      this.onChange?.();
    }
  };
  setupKeyDelete() {
    this.workspace.setAttribute("tabindex", "0");
    this.workspace.style.outline = "none";
    this.workspace.addEventListener("keydown", this.onKeyDelete);
  }
  // ── Pan/Zoom ─────────────────────────────────────────────────────
  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  panBaseX = 0;
  panBaseY = 0;
  setupPanZoom() {
    this.workspace.addEventListener("wheel", this.onWheel, { passive: false });
    this.workspace.addEventListener("pointerdown", this.onPanStart);
  }
  onWheel = (e) => {
    e.preventDefault();
    const rect = this.workspace.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldScale = this.scale;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.scale = Math.max(0.2, Math.min(3, this.scale * delta));
    this.panX = mx - (mx - this.panX) * (this.scale / oldScale);
    this.panY = my - (my - this.panY) * (this.scale / oldScale);
    this.applyTransform();
  };
  onPanStart = (e) => {
    if (e.button === 1 || e.button === 0 && e.shiftKey) {
      const target2 = e.target;
      if (target2.closest(".df-node") || target2.classList.contains("df-port")) return;
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panBaseX = this.panX;
      this.panBaseY = this.panY;
      this.workspace.style.cursor = "grabbing";
      e.preventDefault();
      const onMove = (ev) => {
        if (!this.isPanning) return;
        this.panX = this.panBaseX + (ev.clientX - this.panStartX);
        this.panY = this.panBaseY + (ev.clientY - this.panStartY);
        this.applyTransform();
      };
      const onUp = () => {
        this.isPanning = false;
        this.workspace.style.cursor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
  };
  // ── Double-click palette ─────────────────────────────────────────
  onDblClick = (e) => {
    const target2 = e.target;
    if (target2.closest(".df-node") || target2.closest(".df-palette")) return;
    const rect = this.workspace.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - this.panX) / this.scale;
    const worldY = (e.clientY - rect.top - this.panY) / this.scale;
    showPalette(
      this.workspace,
      this.blockTypes,
      this.mgr,
      e.clientX,
      e.clientY,
      worldX,
      worldY,
      () => {
        this.snap = this.mgr.snapshot();
        this.reconcile();
        this.onChange?.();
      }
    );
  };
  setupDblClick() {
    this.workspace.addEventListener("dblclick", this.onDblClick);
  }
};

// src/dataflow/plot.ts
var PLOT_PAD = 30;
function drawPlot(canvas2, data, label = "Plot") {
  const ctx = canvas2.getContext("2d");
  if (!ctx) return;
  const rect = canvas2.getBoundingClientRect();
  if (rect.width < 1) return;
  const dpr = window.devicePixelRatio || 1;
  canvas2.width = rect.width * dpr;
  canvas2.height = rect.height * dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  ctx.fillStyle = theme.colors.surface;
  ctx.fillRect(0, 0, w, h);
  if (data.length < 2) {
    ctx.fillStyle = theme.colors.textDim;
    ctx.font = "12px monospace";
    ctx.fillText("Waiting for data...", PLOT_PAD, h / 2);
    ctx.restore();
    return;
  }
  const plotW = w - PLOT_PAD * 2;
  const plotH = h - PLOT_PAD * 2;
  let min = data[0], max = data[0];
  for (const v of data) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) {
    max += 1;
    min -= 1;
  }
  ctx.strokeStyle = theme.colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PLOT_PAD, PLOT_PAD);
  ctx.lineTo(PLOT_PAD, h - PLOT_PAD);
  ctx.lineTo(w - PLOT_PAD, h - PLOT_PAD);
  ctx.stroke();
  ctx.fillStyle = theme.colors.textDim;
  ctx.font = "10px monospace";
  ctx.textAlign = "right";
  ctx.fillText(max.toFixed(2), PLOT_PAD - 4, PLOT_PAD + 4);
  ctx.fillText(min.toFixed(2), PLOT_PAD - 4, h - PLOT_PAD + 4);
  ctx.textAlign = "left";
  ctx.fillText(label, PLOT_PAD, PLOT_PAD - 8);
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = PLOT_PAD + i / (data.length - 1) * plotW;
    const y = PLOT_PAD + plotH - (data[i] - min) / (max - min) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// src/dataflow/zip.ts
var encoder = new TextEncoder();
function crc32(data) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 4294967295;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
}
function createZip(files) {
  const encoded = files.map(([path, content]) => ({
    nameBytes: encoder.encode(path),
    dataBytes: encoder.encode(content)
  }));
  let localSize = 0;
  let centralSize = 0;
  for (const { nameBytes, dataBytes } of encoded) {
    localSize += 30 + nameBytes.length + dataBytes.length;
    centralSize += 46 + nameBytes.length;
  }
  const totalSize = localSize + centralSize + 22;
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let offset = 0;
  const offsets = [];
  for (const { nameBytes, dataBytes } of encoded) {
    offsets.push(offset);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;
    const nameLen = nameBytes.length;
    view.setUint32(offset, 67324752, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint32(offset + 14, crc, true);
    view.setUint32(offset + 18, size, true);
    view.setUint32(offset + 22, size, true);
    view.setUint16(offset + 26, nameLen, true);
    view.setUint16(offset + 28, 0, true);
    offset += 30;
    bytes.set(nameBytes, offset);
    offset += nameLen;
    bytes.set(dataBytes, offset);
    offset += size;
  }
  const cdOffset = offset;
  for (let i = 0; i < encoded.length; i++) {
    const { nameBytes, dataBytes } = encoded[i];
    const crc = crc32(dataBytes);
    const size = dataBytes.length;
    const nameLen = nameBytes.length;
    view.setUint32(offset, 33639248, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0, true);
    view.setUint32(offset + 16, crc, true);
    view.setUint32(offset + 20, size, true);
    view.setUint32(offset + 24, size, true);
    view.setUint16(offset + 28, nameLen, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, offsets[i], true);
    offset += 46;
    bytes.set(nameBytes, offset);
    offset += nameLen;
  }
  const cdSize = offset - cdOffset;
  const count = encoded.length;
  view.setUint32(offset, 101010256, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, count, true);
  view.setUint16(offset + 10, count, true);
  view.setUint32(offset + 12, cdSize, true);
  view.setUint32(offset + 16, cdOffset, true);
  view.setUint16(offset + 20, 0, true);
  return new Blob([buf], { type: "application/zip" });
}

// node_modules/cbor-x/decode.js
var decoder;
try {
  decoder = new TextDecoder();
} catch (error) {
}
var src;
var srcEnd;
var position = 0;
var EMPTY_ARRAY = [];
var LEGACY_RECORD_INLINE_ID = 105;
var RECORD_DEFINITIONS_ID = 57342;
var RECORD_INLINE_ID = 57343;
var BUNDLED_STRINGS_ID = 57337;
var PACKED_REFERENCE_TAG_ID = 6;
var STOP_CODE = {};
var maxArraySize = 11281e4;
var maxMapSize = 1681e4;
var strings = EMPTY_ARRAY;
var stringPosition = 0;
var currentDecoder = {};
var currentStructures;
var srcString;
var srcStringStart = 0;
var srcStringEnd = 0;
var bundledStrings;
var referenceMap;
var currentExtensions = [];
var currentExtensionRanges = [];
var packedValues;
var dataView;
var restoreMapsAsObject;
var defaultOptions = {
  useRecords: false,
  mapsAsObjects: true
};
var sequentialMode = false;
var inlineObjectReadThreshold = 2;
try {
  new Function("");
} catch (error) {
  inlineObjectReadThreshold = Infinity;
}
var Decoder = class _Decoder {
  constructor(options) {
    if (options) {
      if ((options.keyMap || options._keyMap) && !options.useRecords) {
        options.useRecords = false;
        options.mapsAsObjects = true;
      }
      if (options.useRecords === false && options.mapsAsObjects === void 0)
        options.mapsAsObjects = true;
      if (options.getStructures)
        options.getShared = options.getStructures;
      if (options.getShared && !options.structures)
        (options.structures = []).uninitialized = true;
      if (options.keyMap) {
        this.mapKey = /* @__PURE__ */ new Map();
        for (let [k, v] of Object.entries(options.keyMap)) this.mapKey.set(v, k);
      }
    }
    Object.assign(this, options);
  }
  /*
  decodeKey(key) {
  	return this.keyMap
  		? Object.keys(this.keyMap)[Object.values(this.keyMap).indexOf(key)] || key
  		: key
  }
  */
  decodeKey(key) {
    return this.keyMap ? this.mapKey.get(key) || key : key;
  }
  encodeKey(key) {
    return this.keyMap && this.keyMap.hasOwnProperty(key) ? this.keyMap[key] : key;
  }
  encodeKeys(rec) {
    if (!this._keyMap) return rec;
    let map = /* @__PURE__ */ new Map();
    for (let [k, v] of Object.entries(rec)) map.set(this._keyMap.hasOwnProperty(k) ? this._keyMap[k] : k, v);
    return map;
  }
  decodeKeys(map) {
    if (!this._keyMap || map.constructor.name != "Map") return map;
    if (!this._mapKey) {
      this._mapKey = /* @__PURE__ */ new Map();
      for (let [k, v] of Object.entries(this._keyMap)) this._mapKey.set(v, k);
    }
    let res = {};
    map.forEach((v, k) => res[safeKey(this._mapKey.has(k) ? this._mapKey.get(k) : k)] = v);
    return res;
  }
  mapDecode(source, end) {
    let res = this.decode(source);
    if (this._keyMap) {
      switch (res.constructor.name) {
        case "Array":
          return res.map((r) => this.decodeKeys(r));
      }
    }
    return res;
  }
  decode(source, end) {
    if (src) {
      return saveState(() => {
        clearSource();
        return this ? this.decode(source, end) : _Decoder.prototype.decode.call(defaultOptions, source, end);
      });
    }
    srcEnd = end > -1 ? end : source.length;
    position = 0;
    stringPosition = 0;
    srcStringEnd = 0;
    srcString = null;
    strings = EMPTY_ARRAY;
    bundledStrings = null;
    src = source;
    try {
      dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
    } catch (error) {
      src = null;
      if (source instanceof Uint8Array)
        throw error;
      throw new Error("Source must be a Uint8Array or Buffer but was a " + (source && typeof source == "object" ? source.constructor.name : typeof source));
    }
    if (this instanceof _Decoder) {
      currentDecoder = this;
      packedValues = this.sharedValues && (this.pack ? new Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues);
      if (this.structures) {
        currentStructures = this.structures;
        return checkedRead();
      } else if (!currentStructures || currentStructures.length > 0) {
        currentStructures = [];
      }
    } else {
      currentDecoder = defaultOptions;
      if (!currentStructures || currentStructures.length > 0)
        currentStructures = [];
      packedValues = null;
    }
    return checkedRead();
  }
  decodeMultiple(source, forEach) {
    let values, lastPosition = 0;
    try {
      let size = source.length;
      sequentialMode = true;
      let value = this ? this.decode(source, size) : defaultDecoder.decode(source, size);
      if (forEach) {
        if (forEach(value) === false) {
          return;
        }
        while (position < size) {
          lastPosition = position;
          if (forEach(checkedRead()) === false) {
            return;
          }
        }
      } else {
        values = [value];
        while (position < size) {
          lastPosition = position;
          values.push(checkedRead());
        }
        return values;
      }
    } catch (error) {
      error.lastPosition = lastPosition;
      error.values = values;
      throw error;
    } finally {
      sequentialMode = false;
      clearSource();
    }
  }
};
function checkedRead() {
  try {
    let result = read();
    if (bundledStrings) {
      if (position >= bundledStrings.postBundlePosition) {
        let error = new Error("Unexpected bundle position");
        error.incomplete = true;
        throw error;
      }
      position = bundledStrings.postBundlePosition;
      bundledStrings = null;
    }
    if (position == srcEnd) {
      currentStructures = null;
      src = null;
      if (referenceMap)
        referenceMap = null;
    } else if (position > srcEnd) {
      let error = new Error("Unexpected end of CBOR data");
      error.incomplete = true;
      throw error;
    } else if (!sequentialMode) {
      throw new Error("Data read, but end of buffer not reached");
    }
    return result;
  } catch (error) {
    clearSource();
    if (error instanceof RangeError || error.message.startsWith("Unexpected end of buffer")) {
      error.incomplete = true;
    }
    throw error;
  }
}
function read() {
  let token = src[position++];
  let majorType = token >> 5;
  token = token & 31;
  if (token > 23) {
    switch (token) {
      case 24:
        token = src[position++];
        break;
      case 25:
        if (majorType == 7) {
          return getFloat16();
        }
        token = dataView.getUint16(position);
        position += 2;
        break;
      case 26:
        if (majorType == 7) {
          let value = dataView.getFloat32(position);
          if (currentDecoder.useFloat32 > 2) {
            let multiplier = mult10[(src[position] & 127) << 1 | src[position + 1] >> 7];
            position += 4;
            return (multiplier * value + (value > 0 ? 0.5 : -0.5) >> 0) / multiplier;
          }
          position += 4;
          return value;
        }
        token = dataView.getUint32(position);
        position += 4;
        if (majorType === 1) return -1 - token;
        break;
      case 27:
        if (majorType == 7) {
          let value = dataView.getFloat64(position);
          position += 8;
          return value;
        }
        if (majorType > 1) {
          if (dataView.getUint32(position) > 0)
            throw new Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
          token = dataView.getUint32(position + 4);
        } else if (currentDecoder.int64AsNumber) {
          token = dataView.getUint32(position) * 4294967296;
          token += dataView.getUint32(position + 4);
        } else token = dataView.getBigUint64(position);
        position += 8;
        break;
      case 31:
        switch (majorType) {
          case 2:
          // byte string
          case 3:
            throw new Error("Indefinite length not supported for byte or text strings");
          case 4:
            let array = [];
            let value, i = 0;
            while ((value = read()) != STOP_CODE) {
              if (i >= maxArraySize) throw new Error(`Array length exceeds ${maxArraySize}`);
              array[i++] = value;
            }
            return majorType == 4 ? array : majorType == 3 ? array.join("") : Buffer.concat(array);
          case 5:
            let key;
            if (currentDecoder.mapsAsObjects) {
              let object = {};
              let i2 = 0;
              if (currentDecoder.keyMap) {
                while ((key = read()) != STOP_CODE) {
                  if (i2++ >= maxMapSize) throw new Error(`Property count exceeds ${maxMapSize}`);
                  object[safeKey(currentDecoder.decodeKey(key))] = read();
                }
              } else {
                while ((key = read()) != STOP_CODE) {
                  if (i2++ >= maxMapSize) throw new Error(`Property count exceeds ${maxMapSize}`);
                  object[safeKey(key)] = read();
                }
              }
              return object;
            } else {
              if (restoreMapsAsObject) {
                currentDecoder.mapsAsObjects = true;
                restoreMapsAsObject = false;
              }
              let map = /* @__PURE__ */ new Map();
              if (currentDecoder.keyMap) {
                let i2 = 0;
                while ((key = read()) != STOP_CODE) {
                  if (i2++ >= maxMapSize) {
                    throw new Error(`Map size exceeds ${maxMapSize}`);
                  }
                  map.set(currentDecoder.decodeKey(key), read());
                }
              } else {
                let i2 = 0;
                while ((key = read()) != STOP_CODE) {
                  if (i2++ >= maxMapSize) {
                    throw new Error(`Map size exceeds ${maxMapSize}`);
                  }
                  map.set(key, read());
                }
              }
              return map;
            }
          case 7:
            return STOP_CODE;
          default:
            throw new Error("Invalid major type for indefinite length " + majorType);
        }
      default:
        throw new Error("Unknown token " + token);
    }
  }
  switch (majorType) {
    case 0:
      return token;
    case 1:
      return ~token;
    case 2:
      return readBin(token);
    case 3:
      if (srcStringEnd >= position) {
        return srcString.slice(position - srcStringStart, (position += token) - srcStringStart);
      }
      if (srcStringEnd == 0 && srcEnd < 140 && token < 32) {
        let string = token < 16 ? shortStringInJS(token) : longStringInJS(token);
        if (string != null)
          return string;
      }
      return readFixedString(token);
    case 4:
      if (token >= maxArraySize) throw new Error(`Array length exceeds ${maxArraySize}`);
      let array = new Array(token);
      for (let i = 0; i < token; i++) array[i] = read();
      return array;
    case 5:
      if (token >= maxMapSize) throw new Error(`Map size exceeds ${maxArraySize}`);
      if (currentDecoder.mapsAsObjects) {
        let object = {};
        if (currentDecoder.keyMap) for (let i = 0; i < token; i++) object[safeKey(currentDecoder.decodeKey(read()))] = read();
        else for (let i = 0; i < token; i++) object[safeKey(read())] = read();
        return object;
      } else {
        if (restoreMapsAsObject) {
          currentDecoder.mapsAsObjects = true;
          restoreMapsAsObject = false;
        }
        let map = /* @__PURE__ */ new Map();
        if (currentDecoder.keyMap) for (let i = 0; i < token; i++) map.set(currentDecoder.decodeKey(read()), read());
        else for (let i = 0; i < token; i++) map.set(read(), read());
        return map;
      }
    case 6:
      if (token >= BUNDLED_STRINGS_ID) {
        let structure = currentStructures[token & 8191];
        if (structure) {
          if (!structure.read) structure.read = createStructureReader(structure);
          return structure.read();
        }
        if (token < 65536) {
          if (token == RECORD_INLINE_ID) {
            let length = readJustLength();
            let id = read();
            let structure2 = read();
            recordDefinition(id, structure2);
            let object = {};
            if (currentDecoder.keyMap) for (let i = 2; i < length; i++) {
              let key = currentDecoder.decodeKey(structure2[i - 2]);
              object[safeKey(key)] = read();
            }
            else for (let i = 2; i < length; i++) {
              let key = structure2[i - 2];
              object[safeKey(key)] = read();
            }
            return object;
          } else if (token == RECORD_DEFINITIONS_ID) {
            let length = readJustLength();
            let id = read();
            for (let i = 2; i < length; i++) {
              recordDefinition(id++, read());
            }
            return read();
          } else if (token == BUNDLED_STRINGS_ID) {
            return readBundleExt();
          }
          if (currentDecoder.getShared) {
            loadShared();
            structure = currentStructures[token & 8191];
            if (structure) {
              if (!structure.read)
                structure.read = createStructureReader(structure);
              return structure.read();
            }
          }
        }
      }
      let extension = currentExtensions[token];
      if (extension) {
        if (extension.handlesRead)
          return extension(read);
        else
          return extension(read());
      } else {
        let input = read();
        for (let i = 0; i < currentExtensionRanges.length; i++) {
          let value = currentExtensionRanges[i](token, input);
          if (value !== void 0)
            return value;
        }
        return new Tag(input, token);
      }
    case 7:
      switch (token) {
        case 20:
          return false;
        case 21:
          return true;
        case 22:
          return null;
        case 23:
          return;
        // undefined
        case 31:
        default:
          let packedValue = (packedValues || getPackedValues())[token];
          if (packedValue !== void 0)
            return packedValue;
          throw new Error("Unknown token " + token);
      }
    default:
      if (isNaN(token)) {
        let error = new Error("Unexpected end of CBOR data");
        error.incomplete = true;
        throw error;
      }
      throw new Error("Unknown CBOR token " + token);
  }
}
var validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
function createStructureReader(structure) {
  if (!structure) throw new Error("Structure is required in record definition");
  function readObject() {
    let length = src[position++];
    length = length & 31;
    if (length > 23) {
      switch (length) {
        case 24:
          length = src[position++];
          break;
        case 25:
          length = dataView.getUint16(position);
          position += 2;
          break;
        case 26:
          length = dataView.getUint32(position);
          position += 4;
          break;
        default:
          throw new Error("Expected array header, but got " + src[position - 1]);
      }
    }
    let compiledReader = this.compiledReader;
    while (compiledReader) {
      if (compiledReader.propertyCount === length)
        return compiledReader(read);
      compiledReader = compiledReader.next;
    }
    if (this.slowReads++ >= inlineObjectReadThreshold) {
      let array = this.length == length ? this : this.slice(0, length);
      compiledReader = currentDecoder.keyMap ? new Function("r", "return {" + array.map((k) => currentDecoder.decodeKey(k)).map((k) => validName.test(k) ? safeKey(k) + ":r()" : "[" + JSON.stringify(k) + "]:r()").join(",") + "}") : new Function("r", "return {" + array.map((key) => validName.test(key) ? safeKey(key) + ":r()" : "[" + JSON.stringify(key) + "]:r()").join(",") + "}");
      if (this.compiledReader)
        compiledReader.next = this.compiledReader;
      compiledReader.propertyCount = length;
      this.compiledReader = compiledReader;
      return compiledReader(read);
    }
    let object = {};
    if (currentDecoder.keyMap) for (let i = 0; i < length; i++) object[safeKey(currentDecoder.decodeKey(this[i]))] = read();
    else for (let i = 0; i < length; i++) {
      object[safeKey(this[i])] = read();
    }
    return object;
  }
  structure.slowReads = 0;
  return readObject;
}
function safeKey(key) {
  if (typeof key === "string") return key === "__proto__" ? "__proto_" : key;
  if (typeof key === "number" || typeof key === "boolean" || typeof key === "bigint") return key.toString();
  if (key == null) return key + "";
  throw new Error("Invalid property name type " + typeof key);
}
var readFixedString = readStringJS;
function readStringJS(length) {
  let result;
  if (length < 16) {
    if (result = shortStringInJS(length))
      return result;
  }
  if (length > 64 && decoder)
    return decoder.decode(src.subarray(position, position += length));
  const end = position + length;
  const units = [];
  result = "";
  while (position < end) {
    const byte1 = src[position++];
    if ((byte1 & 128) === 0) {
      units.push(byte1);
    } else if ((byte1 & 224) === 192) {
      const byte2 = src[position++] & 63;
      const codePoint = (byte1 & 31) << 6 | byte2;
      if (codePoint < 128) {
        units.push(65533);
      } else {
        units.push(codePoint);
      }
    } else if ((byte1 & 240) === 224) {
      const byte2 = src[position++] & 63;
      const byte3 = src[position++] & 63;
      const codePoint = (byte1 & 31) << 12 | byte2 << 6 | byte3;
      if (codePoint < 2048 || codePoint >= 55296 && codePoint <= 57343) {
        units.push(65533);
      } else {
        units.push(codePoint);
      }
    } else if ((byte1 & 248) === 240) {
      const byte2 = src[position++] & 63;
      const byte3 = src[position++] & 63;
      const byte4 = src[position++] & 63;
      let unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
      if (unit < 65536 || unit > 1114111) {
        units.push(65533);
      } else if (unit > 65535) {
        unit -= 65536;
        units.push(unit >>> 10 & 1023 | 55296);
        unit = 56320 | unit & 1023;
        units.push(unit);
      } else {
        units.push(unit);
      }
    } else {
      units.push(65533);
    }
    if (units.length >= 4096) {
      result += fromCharCode.apply(String, units);
      units.length = 0;
    }
  }
  if (units.length > 0) {
    result += fromCharCode.apply(String, units);
  }
  return result;
}
var fromCharCode = String.fromCharCode;
function longStringInJS(length) {
  let start = position;
  let bytes = new Array(length);
  for (let i = 0; i < length; i++) {
    const byte = src[position++];
    if ((byte & 128) > 0) {
      position = start;
      return;
    }
    bytes[i] = byte;
  }
  return fromCharCode.apply(String, bytes);
}
function shortStringInJS(length) {
  if (length < 4) {
    if (length < 2) {
      if (length === 0)
        return "";
      else {
        let a = src[position++];
        if ((a & 128) > 1) {
          position -= 1;
          return;
        }
        return fromCharCode(a);
      }
    } else {
      let a = src[position++];
      let b = src[position++];
      if ((a & 128) > 0 || (b & 128) > 0) {
        position -= 2;
        return;
      }
      if (length < 3)
        return fromCharCode(a, b);
      let c = src[position++];
      if ((c & 128) > 0) {
        position -= 3;
        return;
      }
      return fromCharCode(a, b, c);
    }
  } else {
    let a = src[position++];
    let b = src[position++];
    let c = src[position++];
    let d = src[position++];
    if ((a & 128) > 0 || (b & 128) > 0 || (c & 128) > 0 || (d & 128) > 0) {
      position -= 4;
      return;
    }
    if (length < 6) {
      if (length === 4)
        return fromCharCode(a, b, c, d);
      else {
        let e = src[position++];
        if ((e & 128) > 0) {
          position -= 5;
          return;
        }
        return fromCharCode(a, b, c, d, e);
      }
    } else if (length < 8) {
      let e = src[position++];
      let f = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0) {
        position -= 6;
        return;
      }
      if (length < 7)
        return fromCharCode(a, b, c, d, e, f);
      let g = src[position++];
      if ((g & 128) > 0) {
        position -= 7;
        return;
      }
      return fromCharCode(a, b, c, d, e, f, g);
    } else {
      let e = src[position++];
      let f = src[position++];
      let g = src[position++];
      let h = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0 || (g & 128) > 0 || (h & 128) > 0) {
        position -= 8;
        return;
      }
      if (length < 10) {
        if (length === 8)
          return fromCharCode(a, b, c, d, e, f, g, h);
        else {
          let i = src[position++];
          if ((i & 128) > 0) {
            position -= 9;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i);
        }
      } else if (length < 12) {
        let i = src[position++];
        let j = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0) {
          position -= 10;
          return;
        }
        if (length < 11)
          return fromCharCode(a, b, c, d, e, f, g, h, i, j);
        let k = src[position++];
        if ((k & 128) > 0) {
          position -= 11;
          return;
        }
        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
      } else {
        let i = src[position++];
        let j = src[position++];
        let k = src[position++];
        let l = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0 || (k & 128) > 0 || (l & 128) > 0) {
          position -= 12;
          return;
        }
        if (length < 14) {
          if (length === 12)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
          else {
            let m = src[position++];
            if ((m & 128) > 0) {
              position -= 13;
              return;
            }
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
          }
        } else {
          let m = src[position++];
          let n = src[position++];
          if ((m & 128) > 0 || (n & 128) > 0) {
            position -= 14;
            return;
          }
          if (length < 15)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
          let o = src[position++];
          if ((o & 128) > 0) {
            position -= 15;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
        }
      }
    }
  }
}
function readBin(length) {
  return currentDecoder.copyBuffers ? (
    // specifically use the copying slice (not the node one)
    Uint8Array.prototype.slice.call(src, position, position += length)
  ) : src.subarray(position, position += length);
}
var f32Array = new Float32Array(1);
var u8Array = new Uint8Array(f32Array.buffer, 0, 4);
function getFloat16() {
  let byte0 = src[position++];
  let byte1 = src[position++];
  let exponent = (byte0 & 127) >> 2;
  if (exponent === 31) {
    if (byte1 || byte0 & 3)
      return NaN;
    return byte0 & 128 ? -Infinity : Infinity;
  }
  if (exponent === 0) {
    let abs = ((byte0 & 3) << 8 | byte1) / (1 << 24);
    return byte0 & 128 ? -abs : abs;
  }
  u8Array[3] = byte0 & 128 | // sign bit
  (exponent >> 1) + 56;
  u8Array[2] = (byte0 & 7) << 5 | // last exponent bit and first two mantissa bits
  byte1 >> 3;
  u8Array[1] = byte1 << 5;
  u8Array[0] = 0;
  return f32Array[0];
}
var keyCache = new Array(4096);
var Tag = class {
  constructor(value, tag) {
    this.value = value;
    this.tag = tag;
  }
};
currentExtensions[0] = (dateString) => {
  return new Date(dateString);
};
currentExtensions[1] = (epochSec) => {
  return new Date(Math.round(epochSec * 1e3));
};
currentExtensions[2] = (buffer) => {
  let value = BigInt(0);
  for (let i = 0, l = buffer.byteLength; i < l; i++) {
    value = BigInt(buffer[i]) + (value << BigInt(8));
  }
  return value;
};
currentExtensions[3] = (buffer) => {
  return BigInt(-1) - currentExtensions[2](buffer);
};
currentExtensions[4] = (fraction) => {
  return +(fraction[1] + "e" + fraction[0]);
};
currentExtensions[5] = (fraction) => {
  return fraction[1] * Math.exp(fraction[0] * Math.log(2));
};
var recordDefinition = (id, structure) => {
  id = id - 57344;
  let existingStructure = currentStructures[id];
  if (existingStructure && existingStructure.isShared) {
    (currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
  }
  currentStructures[id] = structure;
  structure.read = createStructureReader(structure);
};
currentExtensions[LEGACY_RECORD_INLINE_ID] = (data) => {
  let length = data.length;
  let structure = data[1];
  recordDefinition(data[0], structure);
  let object = {};
  for (let i = 2; i < length; i++) {
    let key = structure[i - 2];
    object[safeKey(key)] = data[i];
  }
  return object;
};
currentExtensions[14] = (value) => {
  if (bundledStrings)
    return bundledStrings[0].slice(bundledStrings.position0, bundledStrings.position0 += value);
  return new Tag(value, 14);
};
currentExtensions[15] = (value) => {
  if (bundledStrings)
    return bundledStrings[1].slice(bundledStrings.position1, bundledStrings.position1 += value);
  return new Tag(value, 15);
};
var glbl = { Error, RegExp };
currentExtensions[27] = (data) => {
  return (glbl[data[0]] || Error)(data[1], data[2]);
};
var packedTable = (read2) => {
  if (src[position++] != 132) {
    let error = new Error("Packed values structure must be followed by a 4 element array");
    if (src.length < position)
      error.incomplete = true;
    throw error;
  }
  let newPackedValues = read2();
  if (!newPackedValues || !newPackedValues.length) {
    let error = new Error("Packed values structure must be followed by a 4 element array");
    error.incomplete = true;
    throw error;
  }
  packedValues = packedValues ? newPackedValues.concat(packedValues.slice(newPackedValues.length)) : newPackedValues;
  packedValues.prefixes = read2();
  packedValues.suffixes = read2();
  return read2();
};
packedTable.handlesRead = true;
currentExtensions[51] = packedTable;
currentExtensions[PACKED_REFERENCE_TAG_ID] = (data) => {
  if (!packedValues) {
    if (currentDecoder.getShared)
      loadShared();
    else
      return new Tag(data, PACKED_REFERENCE_TAG_ID);
  }
  if (typeof data == "number")
    return packedValues[16 + (data >= 0 ? 2 * data : -2 * data - 1)];
  let error = new Error("No support for non-integer packed references yet");
  if (data === void 0)
    error.incomplete = true;
  throw error;
};
currentExtensions[28] = (read2) => {
  if (!referenceMap) {
    referenceMap = /* @__PURE__ */ new Map();
    referenceMap.id = 0;
  }
  let id = referenceMap.id++;
  let startingPosition = position;
  let token = src[position];
  let target2;
  if (token >> 5 == 4)
    target2 = [];
  else
    target2 = {};
  let refEntry = { target: target2 };
  referenceMap.set(id, refEntry);
  let targetProperties = read2();
  if (refEntry.used) {
    if (Object.getPrototypeOf(target2) !== Object.getPrototypeOf(targetProperties)) {
      position = startingPosition;
      target2 = targetProperties;
      referenceMap.set(id, { target: target2 });
      targetProperties = read2();
    }
    return Object.assign(target2, targetProperties);
  }
  refEntry.target = targetProperties;
  return targetProperties;
};
currentExtensions[28].handlesRead = true;
currentExtensions[29] = (id) => {
  let refEntry = referenceMap.get(id);
  refEntry.used = true;
  return refEntry.target;
};
currentExtensions[258] = (array) => new Set(array);
(currentExtensions[259] = (read2) => {
  if (currentDecoder.mapsAsObjects) {
    currentDecoder.mapsAsObjects = false;
    restoreMapsAsObject = true;
  }
  return read2();
}).handlesRead = true;
function combine(a, b) {
  if (typeof a === "string")
    return a + b;
  if (a instanceof Array)
    return a.concat(b);
  return Object.assign({}, a, b);
}
function getPackedValues() {
  if (!packedValues) {
    if (currentDecoder.getShared)
      loadShared();
    else
      throw new Error("No packed values available");
  }
  return packedValues;
}
var SHARED_DATA_TAG_ID = 1399353956;
currentExtensionRanges.push((tag, input) => {
  if (tag >= 225 && tag <= 255)
    return combine(getPackedValues().prefixes[tag - 224], input);
  if (tag >= 28704 && tag <= 32767)
    return combine(getPackedValues().prefixes[tag - 28672], input);
  if (tag >= 1879052288 && tag <= 2147483647)
    return combine(getPackedValues().prefixes[tag - 1879048192], input);
  if (tag >= 216 && tag <= 223)
    return combine(input, getPackedValues().suffixes[tag - 216]);
  if (tag >= 27647 && tag <= 28671)
    return combine(input, getPackedValues().suffixes[tag - 27639]);
  if (tag >= 1811940352 && tag <= 1879048191)
    return combine(input, getPackedValues().suffixes[tag - 1811939328]);
  if (tag == SHARED_DATA_TAG_ID) {
    return {
      packedValues,
      structures: currentStructures.slice(0),
      version: input
    };
  }
  if (tag == 55799)
    return input;
});
var isLittleEndianMachine = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
var typedArrays = [
  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  typeof BigUint64Array == "undefined" ? { name: "BigUint64Array" } : BigUint64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  typeof BigInt64Array == "undefined" ? { name: "BigInt64Array" } : BigInt64Array,
  Float32Array,
  Float64Array
];
var typedArrayTags = [64, 68, 69, 70, 71, 72, 77, 78, 79, 85, 86];
for (let i = 0; i < typedArrays.length; i++) {
  registerTypedArray(typedArrays[i], typedArrayTags[i]);
}
function registerTypedArray(TypedArray, tag) {
  let dvMethod = "get" + TypedArray.name.slice(0, -5);
  let bytesPerElement;
  if (typeof TypedArray === "function")
    bytesPerElement = TypedArray.BYTES_PER_ELEMENT;
  else
    TypedArray = null;
  for (let littleEndian = 0; littleEndian < 2; littleEndian++) {
    if (!littleEndian && bytesPerElement == 1)
      continue;
    let sizeShift = bytesPerElement == 2 ? 1 : bytesPerElement == 4 ? 2 : bytesPerElement == 8 ? 3 : 0;
    currentExtensions[littleEndian ? tag : tag - 4] = bytesPerElement == 1 || littleEndian == isLittleEndianMachine ? (buffer) => {
      if (!TypedArray)
        throw new Error("Could not find typed array for code " + tag);
      if (!currentDecoder.copyBuffers) {
        if (bytesPerElement === 1 || bytesPerElement === 2 && !(buffer.byteOffset & 1) || bytesPerElement === 4 && !(buffer.byteOffset & 3) || bytesPerElement === 8 && !(buffer.byteOffset & 7))
          return new TypedArray(buffer.buffer, buffer.byteOffset, buffer.byteLength >> sizeShift);
      }
      return new TypedArray(Uint8Array.prototype.slice.call(buffer, 0).buffer);
    } : (buffer) => {
      if (!TypedArray)
        throw new Error("Could not find typed array for code " + tag);
      let dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      let elements = buffer.length >> sizeShift;
      let ta = new TypedArray(elements);
      let method = dv[dvMethod];
      for (let i = 0; i < elements; i++) {
        ta[i] = method.call(dv, i << sizeShift, littleEndian);
      }
      return ta;
    };
  }
}
function readBundleExt() {
  let length = readJustLength();
  let bundlePosition = position + read();
  for (let i = 2; i < length; i++) {
    let bundleLength = readJustLength();
    position += bundleLength;
  }
  let dataPosition = position;
  position = bundlePosition;
  bundledStrings = [readStringJS(readJustLength()), readStringJS(readJustLength())];
  bundledStrings.position0 = 0;
  bundledStrings.position1 = 0;
  bundledStrings.postBundlePosition = position;
  position = dataPosition;
  return read();
}
function readJustLength() {
  let token = src[position++] & 31;
  if (token > 23) {
    switch (token) {
      case 24:
        token = src[position++];
        break;
      case 25:
        token = dataView.getUint16(position);
        position += 2;
        break;
      case 26:
        token = dataView.getUint32(position);
        position += 4;
        break;
    }
  }
  return token;
}
function loadShared() {
  if (currentDecoder.getShared) {
    let sharedData = saveState(() => {
      src = null;
      return currentDecoder.getShared();
    }) || {};
    let updatedStructures = sharedData.structures || [];
    currentDecoder.sharedVersion = sharedData.version;
    packedValues = currentDecoder.sharedValues = sharedData.packedValues;
    if (currentStructures === true)
      currentDecoder.structures = currentStructures = updatedStructures;
    else
      currentStructures.splice.apply(currentStructures, [0, updatedStructures.length].concat(updatedStructures));
  }
}
function saveState(callback) {
  let savedSrcEnd = srcEnd;
  let savedPosition = position;
  let savedStringPosition = stringPosition;
  let savedSrcStringStart = srcStringStart;
  let savedSrcStringEnd = srcStringEnd;
  let savedSrcString = srcString;
  let savedStrings = strings;
  let savedReferenceMap = referenceMap;
  let savedBundledStrings = bundledStrings;
  let savedSrc = new Uint8Array(src.slice(0, srcEnd));
  let savedStructures = currentStructures;
  let savedDecoder = currentDecoder;
  let savedSequentialMode = sequentialMode;
  let value = callback();
  srcEnd = savedSrcEnd;
  position = savedPosition;
  stringPosition = savedStringPosition;
  srcStringStart = savedSrcStringStart;
  srcStringEnd = savedSrcStringEnd;
  srcString = savedSrcString;
  strings = savedStrings;
  referenceMap = savedReferenceMap;
  bundledStrings = savedBundledStrings;
  src = savedSrc;
  sequentialMode = savedSequentialMode;
  currentStructures = savedStructures;
  currentDecoder = savedDecoder;
  dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return value;
}
function clearSource() {
  src = null;
  referenceMap = null;
  currentStructures = null;
}
var mult10 = new Array(147);
for (let i = 0; i < 256; i++) {
  mult10[i] = +("1e" + Math.floor(45.15 - i * 0.30103));
}
var defaultDecoder = new Decoder({ useRecords: false });
var decode = defaultDecoder.decode;
var decodeMultiple = defaultDecoder.decodeMultiple;
var FLOAT32_OPTIONS = {
  NEVER: 0,
  ALWAYS: 1,
  DECIMAL_ROUND: 3,
  DECIMAL_FIT: 4
};

// node_modules/cbor-x/encode.js
var textEncoder;
try {
  textEncoder = new TextEncoder();
} catch (error) {
}
var extensions;
var extensionClasses;
var Buffer2 = typeof globalThis === "object" && globalThis.Buffer;
var hasNodeBuffer = typeof Buffer2 !== "undefined";
var ByteArrayAllocate = hasNodeBuffer ? Buffer2.allocUnsafeSlow : Uint8Array;
var ByteArray = hasNodeBuffer ? Buffer2 : Uint8Array;
var MAX_STRUCTURES = 256;
var MAX_BUFFER_SIZE = hasNodeBuffer ? 4294967296 : 2144337920;
var throwOnIterable;
var target;
var targetView;
var position2 = 0;
var safeEnd;
var bundledStrings2 = null;
var MAX_BUNDLE_SIZE = 61440;
var hasNonLatin = /[\u0080-\uFFFF]/;
var RECORD_SYMBOL = /* @__PURE__ */ Symbol("record-id");
var Encoder = class extends Decoder {
  constructor(options) {
    super(options);
    this.offset = 0;
    let typeBuffer;
    let start;
    let sharedStructures;
    let hasSharedUpdate;
    let structures;
    let referenceMap2;
    options = options || {};
    let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position3) {
      return target.utf8Write(string, position3, target.byteLength - position3);
    } : textEncoder && textEncoder.encodeInto ? function(string, position3) {
      return textEncoder.encodeInto(string, target.subarray(position3)).written;
    } : false;
    let encoder2 = this;
    let hasSharedStructures = options.structures || options.saveStructures;
    let maxSharedStructures = options.maxSharedStructures;
    if (maxSharedStructures == null)
      maxSharedStructures = hasSharedStructures ? 128 : 0;
    if (maxSharedStructures > 8190)
      throw new Error("Maximum maxSharedStructure is 8190");
    let isSequential = options.sequential;
    if (isSequential) {
      maxSharedStructures = 0;
    }
    if (!this.structures)
      this.structures = [];
    if (this.saveStructures)
      this.saveShared = this.saveStructures;
    let samplingPackedValues, packedObjectMap2, sharedValues = options.sharedValues;
    let sharedPackedObjectMap2;
    if (sharedValues) {
      sharedPackedObjectMap2 = /* @__PURE__ */ Object.create(null);
      for (let i = 0, l = sharedValues.length; i < l; i++) {
        sharedPackedObjectMap2[sharedValues[i]] = i;
      }
    }
    let recordIdsToRemove = [];
    let transitionsCount = 0;
    let serializationsSinceTransitionRebuild = 0;
    this.mapEncode = function(value, encodeOptions) {
      if (this._keyMap && !this._mapped) {
        switch (value.constructor.name) {
          case "Array":
            value = value.map((r) => this.encodeKeys(r));
            break;
        }
      }
      return this.encode(value, encodeOptions);
    };
    this.encode = function(value, encodeOptions) {
      if (!target) {
        target = new ByteArrayAllocate(8192);
        targetView = new DataView(target.buffer, 0, 8192);
        position2 = 0;
      }
      safeEnd = target.length - 10;
      if (safeEnd - position2 < 2048) {
        target = new ByteArrayAllocate(target.length);
        targetView = new DataView(target.buffer, 0, target.length);
        safeEnd = target.length - 10;
        position2 = 0;
      } else if (encodeOptions === REUSE_BUFFER_MODE)
        position2 = position2 + 7 & 2147483640;
      start = position2;
      if (encoder2.useSelfDescribedHeader) {
        targetView.setUint32(position2, 3654940416);
        position2 += 3;
      }
      referenceMap2 = encoder2.structuredClone ? /* @__PURE__ */ new Map() : null;
      if (encoder2.bundleStrings && typeof value !== "string") {
        bundledStrings2 = [];
        bundledStrings2.size = Infinity;
      } else
        bundledStrings2 = null;
      sharedStructures = encoder2.structures;
      if (sharedStructures) {
        if (sharedStructures.uninitialized) {
          let sharedData = encoder2.getShared() || {};
          encoder2.structures = sharedStructures = sharedData.structures || [];
          encoder2.sharedVersion = sharedData.version;
          let sharedValues2 = encoder2.sharedValues = sharedData.packedValues;
          if (sharedValues2) {
            sharedPackedObjectMap2 = {};
            for (let i = 0, l = sharedValues2.length; i < l; i++)
              sharedPackedObjectMap2[sharedValues2[i]] = i;
          }
        }
        let sharedStructuresLength = sharedStructures.length;
        if (sharedStructuresLength > maxSharedStructures && !isSequential)
          sharedStructuresLength = maxSharedStructures;
        if (!sharedStructures.transitions) {
          sharedStructures.transitions = /* @__PURE__ */ Object.create(null);
          for (let i = 0; i < sharedStructuresLength; i++) {
            let keys = sharedStructures[i];
            if (!keys)
              continue;
            let nextTransition, transition = sharedStructures.transitions;
            for (let j = 0, l = keys.length; j < l; j++) {
              if (transition[RECORD_SYMBOL] === void 0)
                transition[RECORD_SYMBOL] = i;
              let key = keys[j];
              nextTransition = transition[key];
              if (!nextTransition) {
                nextTransition = transition[key] = /* @__PURE__ */ Object.create(null);
              }
              transition = nextTransition;
            }
            transition[RECORD_SYMBOL] = i | 1048576;
          }
        }
        if (!isSequential)
          sharedStructures.nextId = sharedStructuresLength;
      }
      if (hasSharedUpdate)
        hasSharedUpdate = false;
      structures = sharedStructures || [];
      packedObjectMap2 = sharedPackedObjectMap2;
      if (options.pack) {
        let packedValues2 = /* @__PURE__ */ new Map();
        packedValues2.values = [];
        packedValues2.encoder = encoder2;
        packedValues2.maxValues = options.maxPrivatePackedValues || (sharedPackedObjectMap2 ? 16 : Infinity);
        packedValues2.objectMap = sharedPackedObjectMap2 || false;
        packedValues2.samplingPackedValues = samplingPackedValues;
        findRepetitiveStrings(value, packedValues2);
        if (packedValues2.values.length > 0) {
          target[position2++] = 216;
          target[position2++] = 51;
          writeArrayHeader(4);
          let valuesArray = packedValues2.values;
          encode2(valuesArray);
          writeArrayHeader(0);
          writeArrayHeader(0);
          packedObjectMap2 = Object.create(sharedPackedObjectMap2 || null);
          for (let i = 0, l = valuesArray.length; i < l; i++) {
            packedObjectMap2[valuesArray[i]] = i;
          }
        }
      }
      throwOnIterable = encodeOptions & THROW_ON_ITERABLE;
      try {
        if (throwOnIterable)
          return;
        encode2(value);
        if (bundledStrings2) {
          writeBundles(start, encode2);
        }
        encoder2.offset = position2;
        if (referenceMap2 && referenceMap2.idsToInsert) {
          position2 += referenceMap2.idsToInsert.length * 2;
          if (position2 > safeEnd)
            makeRoom(position2);
          encoder2.offset = position2;
          let serialized = insertIds(target.subarray(start, position2), referenceMap2.idsToInsert);
          referenceMap2 = null;
          return serialized;
        }
        if (encodeOptions & REUSE_BUFFER_MODE) {
          target.start = start;
          target.end = position2;
          return target;
        }
        return target.subarray(start, position2);
      } finally {
        if (sharedStructures) {
          if (serializationsSinceTransitionRebuild < 10)
            serializationsSinceTransitionRebuild++;
          if (sharedStructures.length > maxSharedStructures)
            sharedStructures.length = maxSharedStructures;
          if (transitionsCount > 1e4) {
            sharedStructures.transitions = null;
            serializationsSinceTransitionRebuild = 0;
            transitionsCount = 0;
            if (recordIdsToRemove.length > 0)
              recordIdsToRemove = [];
          } else if (recordIdsToRemove.length > 0 && !isSequential) {
            for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
              recordIdsToRemove[i][RECORD_SYMBOL] = void 0;
            }
            recordIdsToRemove = [];
          }
        }
        if (hasSharedUpdate && encoder2.saveShared) {
          if (encoder2.structures.length > maxSharedStructures) {
            encoder2.structures = encoder2.structures.slice(0, maxSharedStructures);
          }
          let returnBuffer = target.subarray(start, position2);
          if (encoder2.updateSharedData() === false)
            return encoder2.encode(value);
          return returnBuffer;
        }
        if (encodeOptions & RESET_BUFFER_MODE)
          position2 = start;
      }
    };
    this.findCommonStringsToPack = () => {
      samplingPackedValues = /* @__PURE__ */ new Map();
      if (!sharedPackedObjectMap2)
        sharedPackedObjectMap2 = /* @__PURE__ */ Object.create(null);
      return (options2) => {
        let threshold = options2 && options2.threshold || 4;
        let position3 = this.pack ? options2.maxPrivatePackedValues || 16 : 0;
        if (!sharedValues)
          sharedValues = this.sharedValues = [];
        for (let [key, status] of samplingPackedValues) {
          if (status.count > threshold) {
            sharedPackedObjectMap2[key] = position3++;
            sharedValues.push(key);
            hasSharedUpdate = true;
          }
        }
        while (this.saveShared && this.updateSharedData() === false) {
        }
        samplingPackedValues = null;
      };
    };
    const encode2 = (value) => {
      if (position2 > safeEnd)
        target = makeRoom(position2);
      var type = typeof value;
      var length;
      if (type === "string") {
        if (packedObjectMap2) {
          let packedPosition = packedObjectMap2[value];
          if (packedPosition >= 0) {
            if (packedPosition < 16)
              target[position2++] = packedPosition + 224;
            else {
              target[position2++] = 198;
              if (packedPosition & 1)
                encode2(15 - packedPosition >> 1);
              else
                encode2(packedPosition - 16 >> 1);
            }
            return;
          } else if (samplingPackedValues && !options.pack) {
            let status = samplingPackedValues.get(value);
            if (status)
              status.count++;
            else
              samplingPackedValues.set(value, {
                count: 1
              });
          }
        }
        let strLength = value.length;
        if (bundledStrings2 && strLength >= 4 && strLength < 1024) {
          if ((bundledStrings2.size += strLength) > MAX_BUNDLE_SIZE) {
            let extStart;
            let maxBytes2 = (bundledStrings2[0] ? bundledStrings2[0].length * 3 + bundledStrings2[1].length : 0) + 10;
            if (position2 + maxBytes2 > safeEnd)
              target = makeRoom(position2 + maxBytes2);
            target[position2++] = 217;
            target[position2++] = 223;
            target[position2++] = 249;
            target[position2++] = bundledStrings2.position ? 132 : 130;
            target[position2++] = 26;
            extStart = position2 - start;
            position2 += 4;
            if (bundledStrings2.position) {
              writeBundles(start, encode2);
            }
            bundledStrings2 = ["", ""];
            bundledStrings2.size = 0;
            bundledStrings2.position = extStart;
          }
          let twoByte = hasNonLatin.test(value);
          bundledStrings2[twoByte ? 0 : 1] += value;
          target[position2++] = twoByte ? 206 : 207;
          encode2(strLength);
          return;
        }
        let headerSize;
        if (strLength < 32) {
          headerSize = 1;
        } else if (strLength < 256) {
          headerSize = 2;
        } else if (strLength < 65536) {
          headerSize = 3;
        } else {
          headerSize = 5;
        }
        let maxBytes = strLength * 3;
        if (position2 + maxBytes > safeEnd)
          target = makeRoom(position2 + maxBytes);
        if (strLength < 64 || !encodeUtf8) {
          let i, c1, c2, strPosition = position2 + headerSize;
          for (i = 0; i < strLength; i++) {
            c1 = value.charCodeAt(i);
            if (c1 < 128) {
              target[strPosition++] = c1;
            } else if (c1 < 2048) {
              target[strPosition++] = c1 >> 6 | 192;
              target[strPosition++] = c1 & 63 | 128;
            } else if ((c1 & 64512) === 55296 && ((c2 = value.charCodeAt(i + 1)) & 64512) === 56320) {
              c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
              i++;
              target[strPosition++] = c1 >> 18 | 240;
              target[strPosition++] = c1 >> 12 & 63 | 128;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            } else {
              target[strPosition++] = c1 >> 12 | 224;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            }
          }
          length = strPosition - position2 - headerSize;
        } else {
          length = encodeUtf8(value, position2 + headerSize, maxBytes);
        }
        if (length < 24) {
          target[position2++] = 96 | length;
        } else if (length < 256) {
          if (headerSize < 2) {
            target.copyWithin(position2 + 2, position2 + 1, position2 + 1 + length);
          }
          target[position2++] = 120;
          target[position2++] = length;
        } else if (length < 65536) {
          if (headerSize < 3) {
            target.copyWithin(position2 + 3, position2 + 2, position2 + 2 + length);
          }
          target[position2++] = 121;
          target[position2++] = length >> 8;
          target[position2++] = length & 255;
        } else {
          if (headerSize < 5) {
            target.copyWithin(position2 + 5, position2 + 3, position2 + 3 + length);
          }
          target[position2++] = 122;
          targetView.setUint32(position2, length);
          position2 += 4;
        }
        position2 += length;
      } else if (type === "number") {
        if (!this.alwaysUseFloat && value >>> 0 === value) {
          if (value < 24) {
            target[position2++] = value;
          } else if (value < 256) {
            target[position2++] = 24;
            target[position2++] = value;
          } else if (value < 65536) {
            target[position2++] = 25;
            target[position2++] = value >> 8;
            target[position2++] = value & 255;
          } else {
            target[position2++] = 26;
            targetView.setUint32(position2, value);
            position2 += 4;
          }
        } else if (!this.alwaysUseFloat && value >> 0 === value) {
          if (value >= -24) {
            target[position2++] = 31 - value;
          } else if (value >= -256) {
            target[position2++] = 56;
            target[position2++] = ~value;
          } else if (value >= -65536) {
            target[position2++] = 57;
            targetView.setUint16(position2, ~value);
            position2 += 2;
          } else {
            target[position2++] = 58;
            targetView.setUint32(position2, ~value);
            position2 += 4;
          }
        } else if (!this.alwaysUseFloat && value < 0 && value >= -4294967296 && Math.floor(value) === value) {
          target[position2++] = 58;
          targetView.setUint32(position2, -1 - value);
          position2 += 4;
        } else {
          let useFloat32;
          if ((useFloat32 = this.useFloat32) > 0 && value < 4294967296 && value >= -2147483648) {
            target[position2++] = 250;
            targetView.setFloat32(position2, value);
            let xShifted;
            if (useFloat32 < 4 || // this checks for rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
            (xShifted = value * mult10[(target[position2] & 127) << 1 | target[position2 + 1] >> 7]) >> 0 === xShifted) {
              position2 += 4;
              return;
            } else
              position2--;
          }
          target[position2++] = 251;
          targetView.setFloat64(position2, value);
          position2 += 8;
        }
      } else if (type === "object") {
        if (!value)
          target[position2++] = 246;
        else {
          if (referenceMap2) {
            let referee = referenceMap2.get(value);
            if (referee) {
              target[position2++] = 216;
              target[position2++] = 29;
              target[position2++] = 25;
              if (!referee.references) {
                let idsToInsert = referenceMap2.idsToInsert || (referenceMap2.idsToInsert = []);
                referee.references = [];
                idsToInsert.push(referee);
              }
              referee.references.push(position2 - start);
              position2 += 2;
              return;
            } else
              referenceMap2.set(value, { offset: position2 - start });
          }
          let constructor = value.constructor;
          if (constructor === Object) {
            if (this.skipFunction === true) {
              value = Object.fromEntries([...Object.keys(value).filter((x) => typeof value[x] !== "function").map((x) => [x, value[x]])]);
            }
            writeObject(value);
          } else if (constructor === Array) {
            length = value.length;
            if (length < 24) {
              target[position2++] = 128 | length;
            } else {
              writeArrayHeader(length);
            }
            for (let i = 0; i < length; i++) {
              encode2(value[i]);
            }
          } else if (constructor === Map) {
            if (this.mapsAsObjects ? this.useTag259ForMaps !== false : this.useTag259ForMaps) {
              target[position2++] = 217;
              target[position2++] = 1;
              target[position2++] = 3;
            }
            length = value.size;
            if (length < 24) {
              target[position2++] = 160 | length;
            } else if (length < 256) {
              target[position2++] = 184;
              target[position2++] = length;
            } else if (length < 65536) {
              target[position2++] = 185;
              target[position2++] = length >> 8;
              target[position2++] = length & 255;
            } else {
              target[position2++] = 186;
              targetView.setUint32(position2, length);
              position2 += 4;
            }
            if (encoder2.keyMap) {
              for (let [key, entryValue] of value) {
                encode2(encoder2.encodeKey(key));
                encode2(entryValue);
              }
            } else {
              for (let [key, entryValue] of value) {
                encode2(key);
                encode2(entryValue);
              }
            }
          } else {
            for (let i = 0, l = extensions.length; i < l; i++) {
              let extensionClass = extensionClasses[i];
              if (value instanceof extensionClass) {
                let extension = extensions[i];
                let tag = extension.tag;
                if (tag == void 0)
                  tag = extension.getTag && extension.getTag.call(this, value);
                if (tag < 24) {
                  target[position2++] = 192 | tag;
                } else if (tag < 256) {
                  target[position2++] = 216;
                  target[position2++] = tag;
                } else if (tag < 65536) {
                  target[position2++] = 217;
                  target[position2++] = tag >> 8;
                  target[position2++] = tag & 255;
                } else if (tag > -1) {
                  target[position2++] = 218;
                  targetView.setUint32(position2, tag);
                  position2 += 4;
                }
                extension.encode.call(this, value, encode2, makeRoom);
                return;
              }
            }
            if (value[Symbol.iterator]) {
              if (throwOnIterable) {
                let error = new Error("Iterable should be serialized as iterator");
                error.iteratorNotHandled = true;
                throw error;
              }
              target[position2++] = 159;
              for (let entry of value) {
                encode2(entry);
              }
              target[position2++] = 255;
              return;
            }
            if (value[Symbol.asyncIterator] || isBlob(value)) {
              let error = new Error("Iterable/blob should be serialized as iterator");
              error.iteratorNotHandled = true;
              throw error;
            }
            if (this.useToJSON && value.toJSON) {
              const json = value.toJSON();
              if (json !== value)
                return encode2(json);
            }
            writeObject(value);
          }
        }
      } else if (type === "boolean") {
        target[position2++] = value ? 245 : 244;
      } else if (type === "bigint") {
        if (value < BigInt(1) << BigInt(64) && value >= 0) {
          target[position2++] = 27;
          targetView.setBigUint64(position2, value);
        } else if (value > -(BigInt(1) << BigInt(64)) && value < 0) {
          target[position2++] = 59;
          targetView.setBigUint64(position2, -value - BigInt(1));
        } else {
          if (this.largeBigIntToFloat) {
            target[position2++] = 251;
            targetView.setFloat64(position2, Number(value));
          } else {
            if (value >= BigInt(0))
              target[position2++] = 194;
            else {
              target[position2++] = 195;
              value = BigInt(-1) - value;
            }
            let bytes = [];
            while (value) {
              bytes.push(Number(value & BigInt(255)));
              value >>= BigInt(8);
            }
            writeBuffer(new Uint8Array(bytes.reverse()), makeRoom);
            return;
          }
        }
        position2 += 8;
      } else if (type === "undefined") {
        target[position2++] = 247;
      } else {
        throw new Error("Unknown type: " + type);
      }
    };
    const writeObject = this.useRecords === false ? this.variableMapSize ? (object) => {
      let keys = Object.keys(object);
      let vals = Object.values(object);
      let length = keys.length;
      if (length < 24) {
        target[position2++] = 160 | length;
      } else if (length < 256) {
        target[position2++] = 184;
        target[position2++] = length;
      } else if (length < 65536) {
        target[position2++] = 185;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 186;
        targetView.setUint32(position2, length);
        position2 += 4;
      }
      let key;
      if (encoder2.keyMap) {
        for (let i = 0; i < length; i++) {
          encode2(encoder2.encodeKey(keys[i]));
          encode2(vals[i]);
        }
      } else {
        for (let i = 0; i < length; i++) {
          encode2(keys[i]);
          encode2(vals[i]);
        }
      }
    } : (object) => {
      target[position2++] = 185;
      let objectOffset = position2 - start;
      position2 += 2;
      let size = 0;
      if (encoder2.keyMap) {
        for (let key in object) if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
          encode2(encoder2.encodeKey(key));
          encode2(object[key]);
          size++;
        }
      } else {
        for (let key in object) if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
          encode2(key);
          encode2(object[key]);
          size++;
        }
      }
      target[objectOffset++ + start] = size >> 8;
      target[objectOffset + start] = size & 255;
    } : (object, skipValues) => {
      let nextTransition, transition = structures.transitions || (structures.transitions = /* @__PURE__ */ Object.create(null));
      let newTransitions = 0;
      let length = 0;
      let parentRecordId;
      let keys;
      if (this.keyMap) {
        keys = Object.keys(object).map((k) => this.encodeKey(k));
        length = keys.length;
        for (let i = 0; i < length; i++) {
          let key = keys[i];
          nextTransition = transition[key];
          if (!nextTransition) {
            nextTransition = transition[key] = /* @__PURE__ */ Object.create(null);
            newTransitions++;
          }
          transition = nextTransition;
        }
      } else {
        for (let key in object) if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
          nextTransition = transition[key];
          if (!nextTransition) {
            if (transition[RECORD_SYMBOL] & 1048576) {
              parentRecordId = transition[RECORD_SYMBOL] & 65535;
            }
            nextTransition = transition[key] = /* @__PURE__ */ Object.create(null);
            newTransitions++;
          }
          transition = nextTransition;
          length++;
        }
      }
      let recordId = transition[RECORD_SYMBOL];
      if (recordId !== void 0) {
        recordId &= 65535;
        target[position2++] = 217;
        target[position2++] = recordId >> 8 | 224;
        target[position2++] = recordId & 255;
      } else {
        if (!keys)
          keys = transition.__keys__ || (transition.__keys__ = Object.keys(object));
        if (parentRecordId === void 0) {
          recordId = structures.nextId++;
          if (!recordId) {
            recordId = 0;
            structures.nextId = 1;
          }
          if (recordId >= MAX_STRUCTURES) {
            structures.nextId = (recordId = maxSharedStructures) + 1;
          }
        } else {
          recordId = parentRecordId;
        }
        structures[recordId] = keys;
        if (recordId < maxSharedStructures) {
          target[position2++] = 217;
          target[position2++] = recordId >> 8 | 224;
          target[position2++] = recordId & 255;
          transition = structures.transitions;
          for (let i = 0; i < length; i++) {
            if (transition[RECORD_SYMBOL] === void 0 || transition[RECORD_SYMBOL] & 1048576)
              transition[RECORD_SYMBOL] = recordId;
            transition = transition[keys[i]];
          }
          transition[RECORD_SYMBOL] = recordId | 1048576;
          hasSharedUpdate = true;
        } else {
          transition[RECORD_SYMBOL] = recordId;
          targetView.setUint32(position2, 3655335680);
          position2 += 3;
          if (newTransitions)
            transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
          if (recordIdsToRemove.length >= MAX_STRUCTURES - maxSharedStructures)
            recordIdsToRemove.shift()[RECORD_SYMBOL] = void 0;
          recordIdsToRemove.push(transition);
          writeArrayHeader(length + 2);
          encode2(57344 + recordId);
          encode2(keys);
          if (skipValues) return;
          for (let key in object)
            if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key))
              encode2(object[key]);
          return;
        }
      }
      if (length < 24) {
        target[position2++] = 128 | length;
      } else {
        writeArrayHeader(length);
      }
      if (skipValues) return;
      for (let key in object)
        if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key))
          encode2(object[key]);
    };
    const makeRoom = (end) => {
      let newSize;
      if (end > 16777216) {
        if (end - start > MAX_BUFFER_SIZE)
          throw new Error("Encoded buffer would be larger than maximum buffer size");
        newSize = Math.min(
          MAX_BUFFER_SIZE,
          Math.round(Math.max((end - start) * (end > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096
        );
      } else
        newSize = (Math.max(end - start << 2, target.length - 1) >> 12) + 1 << 12;
      let newBuffer = new ByteArrayAllocate(newSize);
      targetView = new DataView(newBuffer.buffer, 0, newSize);
      if (target.copy)
        target.copy(newBuffer, 0, start, end);
      else
        newBuffer.set(target.slice(start, end));
      position2 -= start;
      start = 0;
      safeEnd = newBuffer.length - 10;
      return target = newBuffer;
    };
    let chunkThreshold = 100;
    let continuedChunkThreshold = 1e3;
    this.encodeAsIterable = function(value, options2) {
      return startEncoding(value, options2, encodeObjectAsIterable);
    };
    this.encodeAsAsyncIterable = function(value, options2) {
      return startEncoding(value, options2, encodeObjectAsAsyncIterable);
    };
    function* encodeObjectAsIterable(object, iterateProperties, finalIterable) {
      let constructor = object.constructor;
      if (constructor === Object) {
        let useRecords = encoder2.useRecords !== false;
        if (useRecords)
          writeObject(object, true);
        else
          writeEntityLength(Object.keys(object).length, 160);
        for (let key in object) {
          let value = object[key];
          if (!useRecords) encode2(key);
          if (value && typeof value === "object") {
            if (iterateProperties[key])
              yield* encodeObjectAsIterable(value, iterateProperties[key]);
            else
              yield* tryEncode(value, iterateProperties, key);
          } else encode2(value);
        }
      } else if (constructor === Array) {
        let length = object.length;
        writeArrayHeader(length);
        for (let i = 0; i < length; i++) {
          let value = object[i];
          if (value && (typeof value === "object" || position2 - start > chunkThreshold)) {
            if (iterateProperties.element)
              yield* encodeObjectAsIterable(value, iterateProperties.element);
            else
              yield* tryEncode(value, iterateProperties, "element");
          } else encode2(value);
        }
      } else if (object[Symbol.iterator] && !object.buffer) {
        target[position2++] = 159;
        for (let value of object) {
          if (value && (typeof value === "object" || position2 - start > chunkThreshold)) {
            if (iterateProperties.element)
              yield* encodeObjectAsIterable(value, iterateProperties.element);
            else
              yield* tryEncode(value, iterateProperties, "element");
          } else encode2(value);
        }
        target[position2++] = 255;
      } else if (isBlob(object)) {
        writeEntityLength(object.size, 64);
        yield target.subarray(start, position2);
        yield object;
        restartEncoding();
      } else if (object[Symbol.asyncIterator]) {
        target[position2++] = 159;
        yield target.subarray(start, position2);
        yield object;
        restartEncoding();
        target[position2++] = 255;
      } else {
        encode2(object);
      }
      if (finalIterable && position2 > start) yield target.subarray(start, position2);
      else if (position2 - start > chunkThreshold) {
        yield target.subarray(start, position2);
        restartEncoding();
      }
    }
    function* tryEncode(value, iterateProperties, key) {
      let restart = position2 - start;
      try {
        encode2(value);
        if (position2 - start > chunkThreshold) {
          yield target.subarray(start, position2);
          restartEncoding();
        }
      } catch (error) {
        if (error.iteratorNotHandled) {
          iterateProperties[key] = {};
          position2 = start + restart;
          yield* encodeObjectAsIterable.call(this, value, iterateProperties[key]);
        } else throw error;
      }
    }
    function restartEncoding() {
      chunkThreshold = continuedChunkThreshold;
      encoder2.encode(null, THROW_ON_ITERABLE);
    }
    function startEncoding(value, options2, encodeIterable) {
      if (options2 && options2.chunkThreshold)
        chunkThreshold = continuedChunkThreshold = options2.chunkThreshold;
      else
        chunkThreshold = 100;
      if (value && typeof value === "object") {
        encoder2.encode(null, THROW_ON_ITERABLE);
        return encodeIterable(value, encoder2.iterateProperties || (encoder2.iterateProperties = {}), true);
      }
      return [encoder2.encode(value)];
    }
    async function* encodeObjectAsAsyncIterable(value, iterateProperties) {
      for (let encodedValue of encodeObjectAsIterable(value, iterateProperties, true)) {
        let constructor = encodedValue.constructor;
        if (constructor === ByteArray || constructor === Uint8Array)
          yield encodedValue;
        else if (isBlob(encodedValue)) {
          let reader = encodedValue.stream().getReader();
          let next;
          while (!(next = await reader.read()).done) {
            yield next.value;
          }
        } else if (encodedValue[Symbol.asyncIterator]) {
          for await (let asyncValue of encodedValue) {
            restartEncoding();
            if (asyncValue)
              yield* encodeObjectAsAsyncIterable(asyncValue, iterateProperties.async || (iterateProperties.async = {}));
            else yield encoder2.encode(asyncValue);
          }
        } else {
          yield encodedValue;
        }
      }
    }
  }
  useBuffer(buffer) {
    target = buffer;
    targetView = new DataView(target.buffer, target.byteOffset, target.byteLength);
    position2 = 0;
  }
  clearSharedData() {
    if (this.structures)
      this.structures = [];
    if (this.sharedValues)
      this.sharedValues = void 0;
  }
  updateSharedData() {
    let lastVersion = this.sharedVersion || 0;
    this.sharedVersion = lastVersion + 1;
    let structuresCopy = this.structures.slice(0);
    let sharedData = new SharedData(structuresCopy, this.sharedValues, this.sharedVersion);
    let saveResults = this.saveShared(
      sharedData,
      (existingShared) => (existingShared && existingShared.version || 0) == lastVersion
    );
    if (saveResults === false) {
      sharedData = this.getShared() || {};
      this.structures = sharedData.structures || [];
      this.sharedValues = sharedData.packedValues;
      this.sharedVersion = sharedData.version;
      this.structures.nextId = this.structures.length;
    } else {
      structuresCopy.forEach((structure, i) => this.structures[i] = structure);
    }
    return saveResults;
  }
};
function writeEntityLength(length, majorValue) {
  if (length < 24)
    target[position2++] = majorValue | length;
  else if (length < 256) {
    target[position2++] = majorValue | 24;
    target[position2++] = length;
  } else if (length < 65536) {
    target[position2++] = majorValue | 25;
    target[position2++] = length >> 8;
    target[position2++] = length & 255;
  } else {
    target[position2++] = majorValue | 26;
    targetView.setUint32(position2, length);
    position2 += 4;
  }
}
var SharedData = class {
  constructor(structures, values, version) {
    this.structures = structures;
    this.packedValues = values;
    this.version = version;
  }
};
function writeArrayHeader(length) {
  if (length < 24)
    target[position2++] = 128 | length;
  else if (length < 256) {
    target[position2++] = 152;
    target[position2++] = length;
  } else if (length < 65536) {
    target[position2++] = 153;
    target[position2++] = length >> 8;
    target[position2++] = length & 255;
  } else {
    target[position2++] = 154;
    targetView.setUint32(position2, length);
    position2 += 4;
  }
}
var BlobConstructor = typeof Blob === "undefined" ? function() {
} : Blob;
function isBlob(object) {
  if (object instanceof BlobConstructor)
    return true;
  let tag = object[Symbol.toStringTag];
  return tag === "Blob" || tag === "File";
}
function findRepetitiveStrings(value, packedValues2) {
  switch (typeof value) {
    case "string":
      if (value.length > 3) {
        if (packedValues2.objectMap[value] > -1 || packedValues2.values.length >= packedValues2.maxValues)
          return;
        let packedStatus = packedValues2.get(value);
        if (packedStatus) {
          if (++packedStatus.count == 2) {
            packedValues2.values.push(value);
          }
        } else {
          packedValues2.set(value, {
            count: 1
          });
          if (packedValues2.samplingPackedValues) {
            let status = packedValues2.samplingPackedValues.get(value);
            if (status)
              status.count++;
            else
              packedValues2.samplingPackedValues.set(value, {
                count: 1
              });
          }
        }
      }
      break;
    case "object":
      if (value) {
        if (value instanceof Array) {
          for (let i = 0, l = value.length; i < l; i++) {
            findRepetitiveStrings(value[i], packedValues2);
          }
        } else {
          let includeKeys = !packedValues2.encoder.useRecords;
          for (var key in value) {
            if (value.hasOwnProperty(key)) {
              if (includeKeys)
                findRepetitiveStrings(key, packedValues2);
              findRepetitiveStrings(value[key], packedValues2);
            }
          }
        }
      }
      break;
    case "function":
      console.log(value);
  }
}
var isLittleEndianMachine2 = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
extensionClasses = [
  Date,
  Set,
  Error,
  RegExp,
  Tag,
  ArrayBuffer,
  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  typeof BigUint64Array == "undefined" ? function() {
  } : BigUint64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  typeof BigInt64Array == "undefined" ? function() {
  } : BigInt64Array,
  Float32Array,
  Float64Array,
  SharedData
];
extensions = [
  {
    // Date
    tag: 1,
    encode(date, encode2) {
      let seconds = date.getTime() / 1e3;
      if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 4294967296) {
        target[position2++] = 26;
        targetView.setUint32(position2, seconds);
        position2 += 4;
      } else {
        target[position2++] = 251;
        targetView.setFloat64(position2, seconds);
        position2 += 8;
      }
    }
  },
  {
    // Set
    tag: 258,
    // https://github.com/input-output-hk/cbor-sets-spec/blob/master/CBOR_SETS.md
    encode(set, encode2) {
      let array = Array.from(set);
      encode2(array);
    }
  },
  {
    // Error
    tag: 27,
    // http://cbor.schmorp.de/generic-object
    encode(error, encode2) {
      encode2([error.name, error.message]);
    }
  },
  {
    // RegExp
    tag: 27,
    // http://cbor.schmorp.de/generic-object
    encode(regex, encode2) {
      encode2(["RegExp", regex.source, regex.flags]);
    }
  },
  {
    // Tag
    getTag(tag) {
      return tag.tag;
    },
    encode(tag, encode2) {
      encode2(tag.value);
    }
  },
  {
    // ArrayBuffer
    encode(arrayBuffer, encode2, makeRoom) {
      writeBuffer(arrayBuffer, makeRoom);
    }
  },
  {
    // Uint8Array
    getTag(typedArray) {
      if (typedArray.constructor === Uint8Array) {
        if (this.tagUint8Array || hasNodeBuffer && this.tagUint8Array !== false)
          return 64;
      }
    },
    encode(typedArray, encode2, makeRoom) {
      writeBuffer(typedArray, makeRoom);
    }
  },
  typedArrayEncoder(68, 1),
  typedArrayEncoder(69, 2),
  typedArrayEncoder(70, 4),
  typedArrayEncoder(71, 8),
  typedArrayEncoder(72, 1),
  typedArrayEncoder(77, 2),
  typedArrayEncoder(78, 4),
  typedArrayEncoder(79, 8),
  typedArrayEncoder(85, 4),
  typedArrayEncoder(86, 8),
  {
    encode(sharedData, encode2) {
      let packedValues2 = sharedData.packedValues || [];
      let sharedStructures = sharedData.structures || [];
      if (packedValues2.values.length > 0) {
        target[position2++] = 216;
        target[position2++] = 51;
        writeArrayHeader(4);
        let valuesArray = packedValues2.values;
        encode2(valuesArray);
        writeArrayHeader(0);
        writeArrayHeader(0);
        packedObjectMap = Object.create(sharedPackedObjectMap || null);
        for (let i = 0, l = valuesArray.length; i < l; i++) {
          packedObjectMap[valuesArray[i]] = i;
        }
      }
      if (sharedStructures) {
        targetView.setUint32(position2, 3655335424);
        position2 += 3;
        let definitions = sharedStructures.slice(0);
        definitions.unshift(57344);
        definitions.push(new Tag(sharedData.version, 1399353956));
        encode2(definitions);
      } else
        encode2(new Tag(sharedData.version, 1399353956));
    }
  }
];
function typedArrayEncoder(tag, size) {
  if (!isLittleEndianMachine2 && size > 1)
    tag -= 4;
  return {
    tag,
    encode: function writeExtBuffer(typedArray, encode2) {
      let length = typedArray.byteLength;
      let offset = typedArray.byteOffset || 0;
      let buffer = typedArray.buffer || typedArray;
      encode2(hasNodeBuffer ? Buffer2.from(buffer, offset, length) : new Uint8Array(buffer, offset, length));
    }
  };
}
function writeBuffer(buffer, makeRoom) {
  let length = buffer.byteLength;
  if (length < 24) {
    target[position2++] = 64 + length;
  } else if (length < 256) {
    target[position2++] = 88;
    target[position2++] = length;
  } else if (length < 65536) {
    target[position2++] = 89;
    target[position2++] = length >> 8;
    target[position2++] = length & 255;
  } else {
    target[position2++] = 90;
    targetView.setUint32(position2, length);
    position2 += 4;
  }
  if (position2 + length >= target.length) {
    makeRoom(position2 + length);
  }
  target.set(buffer.buffer ? buffer : new Uint8Array(buffer), position2);
  position2 += length;
}
function insertIds(serialized, idsToInsert) {
  let nextId;
  let distanceToMove = idsToInsert.length * 2;
  let lastEnd = serialized.length - distanceToMove;
  idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
  for (let id = 0; id < idsToInsert.length; id++) {
    let referee = idsToInsert[id];
    referee.id = id;
    for (let position3 of referee.references) {
      serialized[position3++] = id >> 8;
      serialized[position3] = id & 255;
    }
  }
  while (nextId = idsToInsert.pop()) {
    let offset = nextId.offset;
    serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
    distanceToMove -= 2;
    let position3 = offset + distanceToMove;
    serialized[position3++] = 216;
    serialized[position3++] = 28;
    lastEnd = offset;
  }
  return serialized;
}
function writeBundles(start, encode2) {
  targetView.setUint32(bundledStrings2.position + start, position2 - bundledStrings2.position - start + 1);
  let writeStrings = bundledStrings2;
  bundledStrings2 = null;
  encode2(writeStrings[0]);
  encode2(writeStrings[1]);
}
var defaultEncoder = new Encoder({ useRecords: false });
var encode = defaultEncoder.encode;
var encodeAsIterable = defaultEncoder.encodeAsIterable;
var encodeAsAsyncIterable = defaultEncoder.encodeAsAsyncIterable;
var { NEVER, ALWAYS, DECIMAL_ROUND, DECIMAL_FIT } = FLOAT32_OPTIONS;
var REUSE_BUFFER_MODE = 512;
var RESET_BUFFER_MODE = 1024;
var THROW_ON_ITERABLE = 2048;

// src/dataflow/hil-client.ts
var TAG_I2C_READ = 1;
var TAG_I2C_WRITE = 2;
var TAG_LIST_BUSES = 3;
var TAG_ADD_DEVICE = 30;
var TAG_REMOVE_DEVICE = 31;
var TAG_SET_REGISTERS = 32;
var TAG_SET_BUS_COUNT = 33;
var TAG_CLEAR_ALL = 34;
var TAG_GET_CONFIG = 35;
var TAG_DEPLOY_GRAPH = 40;
var TAG_GET_PIN_CONFIG = 43;
var TAG_RESP_BUS_LIST = 3;
var TAG_RESP_CONFIG = 35;
var TAG_RESP_PIN_CFG = 42;
var TAG_RESP_DEPLOY = 41;
var TAG_RESP_ERROR = 255;
var HilClient = class {
  ws = null;
  url = "";
  reconnectDelay = 500;
  maxReconnectDelay = 3e4;
  reconnectTimer = null;
  shouldReconnect = false;
  // Callbacks
  onConnect = null;
  onDisconnect = null;
  onBusList = null;
  onPinConfig = null;
  onError = null;
  onDeployAck = null;
  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  /** Raw WebSocket reference (for telemetry attach). Null if not connected. */
  get socket() {
    return this.ws;
  }
  connect(url) {
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectDelay = 500;
    this.openSocket();
  }
  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  // ── Request methods ────────────────────────────────────────────
  listBuses() {
    this.send({ 0: TAG_LIST_BUSES });
  }
  /** Add a simulated device. `registers` is initial register data (bytes). */
  addDevice(bus, addr, name, registers) {
    const regData = typeof registers === "number" ? new Uint8Array(registers) : registers;
    this.send({ 0: TAG_ADD_DEVICE, 1: bus, 2: addr, 3: name, 4: regData });
  }
  removeDevice(bus, addr) {
    this.send({ 0: TAG_REMOVE_DEVICE, 1: bus, 2: addr });
  }
  setRegisters(bus, addr, offset, data) {
    this.send({ 0: TAG_SET_REGISTERS, 1: bus, 2: addr, 3: offset, 4: data });
  }
  setBusCount(count) {
    this.send({ 0: TAG_SET_BUS_COUNT, 1: count });
  }
  clearAll() {
    this.send({ 0: TAG_CLEAR_ALL });
  }
  getConfig() {
    this.send({ 0: TAG_GET_CONFIG });
  }
  getPinConfig() {
    this.send({ 0: TAG_GET_PIN_CONFIG });
  }
  /** Read I2C register(s) from a device on a bus. */
  i2cRead(bus, addr, reg, len) {
    this.send({ 0: TAG_I2C_READ, 1: bus, 2: addr, 3: reg, 4: len });
  }
  /** Write raw bytes to an I2C device on a bus. */
  i2cWrite(bus, addr, data) {
    this.send({ 0: TAG_I2C_WRITE, 1: bus, 2: addr, 3: data });
  }
  deploy(snapshotJson, target2, dt) {
    this.send({ 0: TAG_DEPLOY_GRAPH, 1: snapshotJson, 2: target2, 3: dt });
  }
  // ── Internals ──────────────────────────────────────────────────
  openSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    const ws = new WebSocket(this.url);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.reconnectDelay = 500;
      this.onConnect?.();
      this.listBuses();
      this.getPinConfig();
    });
    ws.addEventListener("close", () => {
      this.ws = null;
      this.onDisconnect?.();
      this.scheduleReconnect();
    });
    ws.addEventListener("error", () => {
    });
    ws.addEventListener("message", (ev) => {
      this.handleMessage(ev);
    });
  }
  scheduleReconnect() {
    if (!this.shouldReconnect) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
  send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encode(msg));
  }
  handleMessage(ev) {
    let msg;
    try {
      const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : ev.data;
      msg = decode(data);
    } catch {
      this.onError?.("Failed to decode CBOR response");
      return;
    }
    const tag = msg[0];
    switch (tag) {
      case TAG_RESP_BUS_LIST:
        this.onBusList?.(parseBusList(msg));
        break;
      case TAG_RESP_PIN_CFG:
        this.onPinConfig?.(parsePinConfig(msg));
        break;
      case TAG_RESP_CONFIG:
        this.onBusList?.(parseBusList(msg));
        break;
      case TAG_RESP_DEPLOY:
        this.onDeployAck?.();
        break;
      case TAG_RESP_ERROR:
        this.onError?.(String(msg[1] ?? "Unknown error"));
        break;
      // Tag-only acks (30-34) — re-request bus list to refresh UI
      case TAG_ADD_DEVICE:
      case TAG_REMOVE_DEVICE:
      case TAG_SET_REGISTERS:
      case TAG_SET_BUS_COUNT:
      case TAG_CLEAR_ALL:
        this.listBuses();
        break;
    }
  }
  // ── DAG / PubSub HTTP methods ──────────────────────────────────
  /** Base URL for HTTP API (derived from WebSocket URL). */
  get httpBase() {
    return this.url.replace(/^ws/, "http").replace(/\/ws\/?$/, "");
  }
  /** Deploy a CBOR-encoded DAG. Returns {ok, nodes} or {error}. */
  async deployDag(cborBytes) {
    const resp = await fetch(`${this.httpBase}/api/dag`, {
      method: "POST",
      body: cborBytes
    });
    return resp.json();
  }
  /** Tick the DAG once. Returns {ok} or {error}. */
  async tick() {
    const resp = await fetch(`${this.httpBase}/api/tick`, { method: "POST" });
    return resp.json();
  }
  /** Get all pubsub topic values. Returns {topic: value, ...}. */
  async getPubsub() {
    const resp = await fetch(`${this.httpBase}/api/pubsub`);
    return resp.json();
  }
  /** Get registered input/output channel names. */
  async getChannels() {
    const resp = await fetch(`${this.httpBase}/api/channels`);
    return resp.json();
  }
  /** Get DAG status. */
  async getStatus() {
    const resp = await fetch(`${this.httpBase}/api/status`);
    return resp.json();
  }
  /** Toggle debug mode (publishes _dbg/<index> topics). */
  async toggleDebug() {
    const resp = await fetch(`${this.httpBase}/api/debug`, { method: "POST" });
    return resp.json();
  }
};
function parseBusList(msg) {
  const raw = msg[1];
  if (!Array.isArray(raw)) return [];
  return raw.map((b, i) => ({
    busIdx: b[0] ?? i,
    devices: Array.isArray(b[1]) ? b[1].map((d) => ({
      addr: d[0],
      name: String(d[1] ?? "")
    })) : []
  }));
}
function parsePinConfig(msg) {
  const raw = msg[1];
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: String(p[0] ?? ""),
    direction: p[1] === "O" ? "O" : "I"
  }));
}

// src/dataflow/pin-table.ts
var COLS = 16;
function renderPinTable(container, pins, onEdit) {
  container.textContent = "";
  if (pins.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-text-dim p-2";
    empty.textContent = "No pin configuration received.";
    container.appendChild(empty);
    return;
  }
  const table = document.createElement("table");
  table.className = "pin-table";
  const thead = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "";
  thead.appendChild(corner);
  for (let c = 0; c < COLS; c++) {
    const th = document.createElement("th");
    th.textContent = String(c);
    thead.appendChild(th);
  }
  table.appendChild(thead);
  const totalRows = Math.ceil(pins.length / COLS);
  const startRow = Math.max(0, totalRows - 16);
  for (let r = startRow; r < totalRows; r++) {
    const tr = document.createElement("tr");
    const rowLabel = document.createElement("th");
    rowLabel.textContent = String(r);
    tr.appendChild(rowLabel);
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const td = document.createElement("td");
      td.className = "pin-cell";
      if (idx < pins.length) {
        const pin = pins[idx];
        td.classList.add(pin.direction === "I" ? "pin-cell-input" : "pin-cell-output");
        const nameSpan = document.createElement("span");
        nameSpan.className = "pin-name";
        nameSpan.textContent = pin.name || String(idx);
        nameSpan.title = `Pin ${idx}: ${pin.name}`;
        td.appendChild(nameSpan);
        const badge = document.createElement("span");
        badge.className = "pin-badge";
        badge.textContent = `[${pin.direction}]`;
        td.appendChild(badge);
        td.addEventListener("click", () => {
          const newDir = pin.direction === "I" ? "O" : "I";
          onEdit(idx, { name: pin.name, direction: newDir });
        });
        td.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          const input = document.createElement("input");
          input.type = "text";
          input.value = pin.name;
          input.className = "pin-inline-edit";
          td.textContent = "";
          td.appendChild(input);
          input.focus();
          input.select();
          const commit = () => {
            const newName = input.value.trim() || pin.name;
            onEdit(idx, { name: newName, direction: pin.direction });
          };
          input.addEventListener("blur", commit);
          input.addEventListener("keydown", (ke) => {
            if (ke.key === "Enter") input.blur();
            if (ke.key === "Escape") {
              input.value = pin.name;
              input.blur();
            }
          });
        });
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  container.appendChild(table);
}

// src/dataflow/i2c-panel.ts
function renderI2cPanel(container, client) {
  container.textContent = "";
  const controls = document.createElement("div");
  controls.className = "i2c-controls";
  const busCountLabel = document.createElement("label");
  busCountLabel.className = "text-xs text-text-dim";
  busCountLabel.textContent = "Bus count: ";
  const busCountInput = document.createElement("input");
  busCountInput.type = "number";
  busCountInput.min = "1";
  busCountInput.max = "16";
  busCountInput.value = "1";
  busCountInput.className = "i2c-input i2c-input-sm";
  const setBusBtn = document.createElement("button");
  setBusBtn.className = "btn btn-secondary btn-sm";
  setBusBtn.textContent = "Set";
  setBusBtn.addEventListener("click", () => {
    client.setBusCount(parseInt(busCountInput.value) || 1);
  });
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn btn-sm";
  clearBtn.style.backgroundColor = "var(--color-danger)";
  clearBtn.style.color = "white";
  clearBtn.textContent = "Clear All";
  clearBtn.addEventListener("click", () => {
    client.clearAll();
  });
  controls.appendChild(busCountLabel);
  controls.appendChild(busCountInput);
  controls.appendChild(setBusBtn);
  controls.appendChild(clearBtn);
  container.appendChild(controls);
  const cardGrid = document.createElement("div");
  cardGrid.className = "i2c-bus-grid";
  container.appendChild(cardGrid);
  const form = document.createElement("div");
  form.className = "i2c-form";
  const formTitle = document.createElement("div");
  formTitle.className = "text-xs font-semibold mb-1";
  formTitle.textContent = "Add Device";
  form.appendChild(formTitle);
  const busInput = createField(form, "Bus", "number", "0");
  const addrInput = createField(form, "Addr (hex)", "text", "0x50");
  const nameInput = createField(form, "Name", "text", "eeprom");
  const regInput = createField(form, "Registers", "number", "256");
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary btn-sm";
  addBtn.textContent = "Add Device";
  addBtn.addEventListener("click", () => {
    const bus = parseInt(busInput.value) || 0;
    const addr = parseInt(addrInput.value, 16) || parseInt(addrInput.value) || 0;
    const name = nameInput.value.trim() || "device";
    const regs = parseInt(regInput.value) || 256;
    client.addDevice(bus, addr, name, regs);
  });
  form.appendChild(addBtn);
  container.appendChild(form);
  container._cardGrid = cardGrid;
}
function updateI2cBuses(container, buses, client) {
  const cardGrid = container._cardGrid;
  if (!cardGrid) return;
  cardGrid.textContent = "";
  if (buses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-text-dim p-2";
    empty.textContent = "No buses configured.";
    cardGrid.appendChild(empty);
    return;
  }
  for (const bus of buses) {
    const card = document.createElement("div");
    card.className = "i2c-bus-card";
    const header = document.createElement("div");
    header.className = "i2c-bus-header";
    header.textContent = `Bus ${bus.busIdx}`;
    const count = document.createElement("span");
    count.className = "text-text-dim";
    count.textContent = ` (${bus.devices.length} devices)`;
    header.appendChild(count);
    card.appendChild(header);
    for (const dev of bus.devices) {
      const row = document.createElement("div");
      row.className = "i2c-device-row";
      const addrSpan = document.createElement("span");
      addrSpan.className = "i2c-device-addr";
      addrSpan.textContent = `0x${dev.addr.toString(16).padStart(2, "0")}`;
      row.appendChild(addrSpan);
      const nameSpan = document.createElement("span");
      nameSpan.className = "i2c-device-name";
      nameSpan.textContent = dev.name;
      row.appendChild(nameSpan);
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm i2c-remove-btn";
      removeBtn.textContent = "\xD7";
      removeBtn.title = "Remove device";
      removeBtn.addEventListener("click", () => {
        client.removeDevice(bus.busIdx, dev.addr);
      });
      row.appendChild(removeBtn);
      card.appendChild(row);
    }
    cardGrid.appendChild(card);
  }
}
function createField(parent, label, type, value) {
  const row = document.createElement("div");
  row.className = "i2c-form-row";
  const lbl = document.createElement("label");
  lbl.className = "text-[11px] text-text-dim";
  lbl.textContent = label;
  row.appendChild(lbl);
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.className = "i2c-input";
  row.appendChild(input);
  parent.appendChild(row);
  return input;
}

// src/dataflow/storage.ts
var KEY_PROJECTS = "webcam:projects";
var KEY_ACTIVE = "webcam:active";
var projectKey = (name) => `webcam:project:${name}`;
function serializeProject(name, snap, positions, viewport) {
  return {
    name,
    lastModified: (/* @__PURE__ */ new Date()).toISOString(),
    graph: {
      blocks: snap.blocks.map((b) => ({
        id: b.id,
        blockType: b.block_type,
        config: b.config
      })),
      channels: snap.channels.map((c) => ({
        fromBlock: c.from_block[0],
        fromPort: c.from_port,
        toBlock: c.to_block[0],
        toPort: c.to_port
      }))
    },
    positions: Object.fromEntries(positions),
    viewport
  };
}
function listProjects() {
  try {
    const raw = localStorage.getItem(KEY_PROJECTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveProject(project) {
  const names = listProjects();
  if (!names.includes(project.name)) {
    names.push(project.name);
    localStorage.setItem(KEY_PROJECTS, JSON.stringify(names));
  }
  localStorage.setItem(projectKey(project.name), JSON.stringify(project));
}
function loadProject(name) {
  try {
    const raw = localStorage.getItem(projectKey(name));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function deleteProject(name) {
  const names = listProjects().filter((n) => n !== name);
  localStorage.setItem(KEY_PROJECTS, JSON.stringify(names));
  localStorage.removeItem(projectKey(name));
}
function getActiveProjectName() {
  return localStorage.getItem(KEY_ACTIVE);
}
function setActiveProjectName(name) {
  localStorage.setItem(KEY_ACTIVE, name);
}
function uniqueName(base, existing) {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}
function createAutoSave(saveFn, delayMs = 1e3) {
  let timer = null;
  return () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      saveFn();
    }, delayMs);
  };
}

// src/dataflow/sidebar.ts
function createSidebar(callbacks) {
  const el = document.createElement("div");
  el.className = "df-sidebar hidden";
  const header = document.createElement("div");
  header.className = "df-sidebar-header";
  const title = document.createElement("h3");
  title.textContent = "Projects";
  header.appendChild(title);
  el.appendChild(header);
  const list = document.createElement("div");
  list.className = "df-project-list";
  el.appendChild(list);
  function toggle() {
    el.classList.toggle("hidden");
  }
  function renderProjects(projects, activeName) {
    list.textContent = "";
    if (projects.length === 0) {
      const empty = document.createElement("div");
      empty.className = "df-project-empty";
      empty.textContent = "No saved projects";
      list.appendChild(empty);
      return;
    }
    for (const proj of projects) {
      const item = document.createElement("div");
      item.className = "df-project-item";
      if (proj.name === activeName) item.classList.add("active");
      const info = document.createElement("div");
      info.className = "df-project-info";
      const nameEl = document.createElement("div");
      nameEl.className = "df-project-name";
      nameEl.textContent = proj.name;
      info.appendChild(nameEl);
      const dateEl = document.createElement("div");
      dateEl.className = "df-project-date";
      dateEl.textContent = formatDate(proj.lastModified);
      info.appendChild(dateEl);
      item.appendChild(info);
      const actions = document.createElement("div");
      actions.className = "df-project-actions";
      const loadBtn = document.createElement("button");
      loadBtn.className = "df-project-load";
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", () => callbacks.onLoad(proj.name));
      actions.appendChild(loadBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "df-project-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => callbacks.onDelete(proj.name));
      actions.appendChild(deleteBtn);
      item.appendChild(actions);
      list.appendChild(item);
    }
  }
  return { element: el, toggle, renderProjects };
}
function formatDate(iso) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 6e4);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

// src/dataflow/telemetry.ts
var TAG_DEBUG_WRAPPER = 56;
var TelemetryPublisher = class {
  ws = null;
  enabled = false;
  debug = false;
  seq = 0;
  attach(ws) {
    this.ws = ws;
  }
  detach() {
    this.ws = null;
  }
  setEnabled(on) {
    this.enabled = on;
  }
  setDebug(on) {
    this.debug = on;
    if (on) this.seq = 0;
  }
  publish(event) {
    if (!this.enabled || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload = this.encodeEvent(event);
    if (this.debug) {
      const wrapped = {
        0: TAG_DEBUG_WRAPPER,
        1: this.seq++,
        2: performance.now(),
        3: payload
      };
      this.ws.send(encode(wrapped));
    } else {
      this.ws.send(encode(payload));
    }
  }
  encodeEvent(event) {
    switch (event.tag) {
      case 50:
        return { 0: 50, 1: event.blockId, 2: event.blockType, 3: event.config, 4: event.x, 5: event.y };
      case 51:
        return { 0: 51, 1: event.blockId };
      case 52:
        return { 0: 52, 1: event.blockId, 2: event.blockType, 3: event.config };
      case 53:
        return { 0: 53, 1: event.fromBlock, 2: event.fromPort, 3: event.toBlock, 4: event.toPort, 5: event.channelId };
      case 54:
        return { 0: 54, 1: event.channelId };
      case 55:
        return { 0: 55 };
    }
  }
};

// src/dataflow/index.ts
var mgr = null;
var editor = null;
var hilClient = null;
var activeProjectName = "Untitled";
var triggerAutoSave = null;
var telemetry = null;
function initDataflow() {
  mgr = new DataflowManager(0.01);
  const container = $("dataflow-workspace");
  editor = new DataflowEditor(container, mgr);
  telemetry = new TelemetryPublisher();
  mgr.telemetry = telemetry;
  editor.onSelect = (blockId, snap) => {
    updateBlockInfo(blockId, snap);
  };
  editor.onEdgeSelect = (channelId, snap) => {
    updateEdgeInfo(channelId, snap);
  };
  const projectNameEl = $("df-project-name");
  function currentSave() {
    if (!mgr || !editor) return;
    const snap = mgr.snapshot();
    const viewport = { panX: 0, panY: 0, scale: 1 };
    const project = serializeProject(activeProjectName, snap, mgr.positions, viewport);
    saveProject(project);
    setActiveProjectName(activeProjectName);
  }
  triggerAutoSave = createAutoSave(() => currentSave(), 1e3);
  function updateProjectNameDisplay() {
    projectNameEl.textContent = activeProjectName;
  }
  function refreshSidebar() {
    const projects = listProjects();
    const infos = projects.map((name) => {
      const p = loadProject(name);
      return { name, lastModified: p?.lastModified ?? "" };
    });
    sidebar.renderProjects(infos, activeProjectName);
  }
  function resetEditor(dt) {
    if (!mgr || !editor) return;
    mgr.stop();
    $btn("df-play").textContent = "Play";
    editor.destroy();
    mgr.destroy();
    mgr = new DataflowManager(dt);
    if (telemetry) mgr.telemetry = telemetry;
    telemetry?.publish({ tag: 55 });
    editor = new DataflowEditor(container, mgr);
    editor.onSelect = (blockId, snap) => updateBlockInfo(blockId, snap);
    editor.onEdgeSelect = (channelId, snap) => updateEdgeInfo(channelId, snap);
    editor.onChange = () => triggerAutoSave?.();
    editor.resize();
  }
  function loadProjectByName(name) {
    const project = loadProject(name);
    if (!project) return;
    const dt = parseFloat($input("df-dt").value) || 0.01;
    resetEditor(dt);
    mgr.restoreProject(project);
    activeProjectName = name;
    setActiveProjectName(name);
    updateProjectNameDisplay();
    editor.updateSnapshot();
  }
  const sidebarContainer = $("df-sidebar-panel");
  const sidebar = createSidebar({
    onLoad: (name) => {
      currentSave();
      loadProjectByName(name);
      refreshSidebar();
    },
    onDelete: (name) => {
      deleteProject(name);
      if (name === activeProjectName) {
        const dt = parseFloat($input("df-dt").value) || 0.01;
        resetEditor(dt);
        activeProjectName = "Untitled";
        setActiveProjectName(activeProjectName);
        updateProjectNameDisplay();
      }
      refreshSidebar();
    }
  });
  sidebarContainer.appendChild(sidebar.element);
  $btn("df-new").addEventListener("click", () => {
    currentSave();
    const dt = parseFloat($input("df-dt").value) || 0.01;
    resetEditor(dt);
    activeProjectName = uniqueName("Untitled", listProjects());
    setActiveProjectName(activeProjectName);
    updateProjectNameDisplay();
    refreshSidebar();
  });
  $btn("df-save-as").addEventListener("click", () => {
    const name = prompt("Project name:");
    if (!name || !name.trim()) return;
    const finalName = uniqueName(name.trim(), listProjects());
    activeProjectName = finalName;
    currentSave();
    updateProjectNameDisplay();
    refreshSidebar();
  });
  $btn("df-projects").addEventListener("click", () => {
    refreshSidebar();
    sidebar.toggle();
  });
  editor.onChange = () => triggerAutoSave?.();
  const lastActive = getActiveProjectName();
  if (lastActive && loadProject(lastActive)) {
    loadProjectByName(lastActive);
  } else {
    activeProjectName = "Untitled";
    updateProjectNameDisplay();
  }
  $btn("df-play").addEventListener("click", () => {
    if (!mgr) return;
    if (mgr.running) {
      mgr.stop();
      $btn("df-play").textContent = "Play";
    } else {
      mgr.start();
      $btn("df-play").textContent = "Pause";
    }
  });
  $btn("df-reset").addEventListener("click", () => {
    if (!mgr) return;
    const dt = parseFloat($input("df-dt").value) || 0.01;
    resetEditor(dt);
    triggerAutoSave?.();
  });
  $input("df-speed").addEventListener("input", () => {
    if (!mgr) return;
    mgr.setSpeed(parseFloat($input("df-speed").value) || 1);
  });
  $btn("df-batch").addEventListener("click", () => {
    if (!mgr) return;
    const steps = parseInt($input("df-batch-steps").value) || 100;
    const dt = parseFloat($input("df-dt").value) || 0.01;
    const snap = mgr.runBatch(steps, dt);
    updatePlots(snap);
    editor?.updateSnapshot();
  });
  $btn("df-export-rust").addEventListener("click", () => {
    if (!mgr) return;
    const statusEl2 = $("df-export-status");
    const dt = parseFloat($input("df-dt").value) || 0.01;
    try {
      const targetChecks = document.querySelectorAll(".df-target-check");
      if (targetChecks.length > 0) {
        const selectedTargets = Array.from(targetChecks).filter((cb) => cb.checked).map((cb) => ({
          target: cb.dataset.target,
          binding: { target: cb.dataset.target, pins: [] }
        }));
        if (selectedTargets.length === 0) {
          statusEl2.textContent = "Select at least one target.";
          statusEl2.className = "text-xs mt-2 min-h-4 text-danger";
          return;
        }
        const json = dataflow_codegen_multi(
          mgr.graphId,
          dt,
          JSON.stringify(selectedTargets)
        );
        const files = JSON.parse(json);
        downloadAsZip(files);
        statusEl2.textContent = `Exported workspace: ${files.length} files.`;
        statusEl2.className = "text-xs mt-2 min-h-4 text-success";
      } else {
        const json = dataflow_codegen(mgr.graphId, dt);
        const files = JSON.parse(json);
        downloadAsZip(files);
        statusEl2.textContent = `Exported ${files.length} files.`;
        statusEl2.className = "text-xs mt-2 min-h-4 text-success";
      }
    } catch (e) {
      statusEl2.textContent = `Export error: ${e}`;
      statusEl2.className = "text-xs mt-2 min-h-4 text-danger";
    }
  });
  setupTargetCheckboxes();
  setupBoardManager();
  setupSidebarPalette();
  setupHilConnection();
  setupDfRightTabs();
}
function resizeDataflow() {
  editor?.resize();
}
function activateDataflow() {
  requestAnimationFrame(() => editor?.resize());
}
function updateBlockInfo(blockId, snap) {
  const infoEl = $("df-block-info");
  if (blockId === null || !snap) {
    infoEl.textContent = "";
    const span = document.createElement("span");
    span.className = "text-text-dim";
    span.textContent = "Select a block to view details";
    infoEl.appendChild(span);
    return;
  }
  const block = snap.blocks.find((b) => b.id === blockId);
  if (!block) return;
  infoEl.textContent = "";
  const nameEl = document.createElement("b");
  nameEl.textContent = block.name;
  infoEl.appendChild(nameEl);
  const idSpan = document.createElement("span");
  idSpan.className = "text-text-dim";
  idSpan.textContent = ` #${block.id}`;
  infoEl.appendChild(idSpan);
  infoEl.appendChild(document.createElement("br"));
  const typeSpan = document.createElement("span");
  typeSpan.className = "text-text-dim text-[11px]";
  typeSpan.textContent = block.block_type;
  infoEl.appendChild(typeSpan);
  infoEl.appendChild(document.createElement("br"));
  if (block.output_values.length > 0) {
    const valDiv = document.createElement("div");
    valDiv.className = "mt-1.5 text-xs";
    for (let i = 0; i < block.outputs.length; i++) {
      const val = block.output_values[i];
      const row = document.createElement("div");
      row.textContent = `${block.outputs[i].name}: ${formatValue(val)}`;
      valDiv.appendChild(row);
    }
    infoEl.appendChild(valDiv);
  }
  const configKeys = Object.keys(block.config ?? {});
  if (configKeys.length > 0) {
    const configDiv = document.createElement("div");
    configDiv.className = "mt-2 text-xs";
    const configLabel = document.createElement("b");
    configLabel.textContent = "Config";
    configDiv.appendChild(configLabel);
    const inputs = {};
    for (const key of configKeys) {
      const row = document.createElement("div");
      row.className = "mt-1";
      const label = document.createElement("label");
      label.className = "block text-text-dim text-[11px]";
      label.textContent = key;
      row.appendChild(label);
      const input = document.createElement("input");
      const val = block.config[key];
      if (typeof val === "number") {
        input.type = "number";
        input.step = "any";
        input.value = String(val);
      } else {
        input.type = "text";
        input.value = String(val ?? "");
      }
      input.className = "w-full bg-bg border border-border rounded text-text text-xs px-2 py-1 mt-0.5 outline-none";
      row.appendChild(input);
      configDiv.appendChild(row);
      inputs[key] = input;
    }
    const applyBtn = document.createElement("button");
    applyBtn.className = "btn btn-primary btn-sm mt-2";
    applyBtn.textContent = "Apply";
    applyBtn.addEventListener("click", () => {
      if (!mgr || !editor) return;
      const newConfig = {};
      for (const key of configKeys) {
        const raw = inputs[key].value;
        const origVal = block.config[key];
        newConfig[key] = typeof origVal === "number" ? parseFloat(raw) || 0 : raw;
      }
      mgr.updateBlock(blockId, block.block_type, newConfig);
      const newSnap = mgr.snapshot();
      editor.updateSnapshot();
      updateBlockInfo(blockId, newSnap);
    });
    configDiv.appendChild(applyBtn);
    infoEl.appendChild(configDiv);
  }
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm mt-2";
  deleteBtn.style.backgroundColor = "var(--color-danger)";
  deleteBtn.style.color = "white";
  deleteBtn.textContent = "Delete Block";
  deleteBtn.addEventListener("click", () => {
    if (!mgr || !editor) return;
    mgr.removeBlock(blockId);
    editor.clearSelection();
    editor.updateSnapshot();
    updateBlockInfo(null, null);
  });
  infoEl.appendChild(deleteBtn);
  updatePlots(snap);
}
function updateEdgeInfo(channelId, snap) {
  const infoEl = $("df-block-info");
  if (channelId === null || !snap) {
    infoEl.textContent = "";
    const span = document.createElement("span");
    span.className = "text-text-dim";
    span.textContent = "Select a block or edge to view details";
    infoEl.appendChild(span);
    return;
  }
  const ch = snap.channels.find((c) => c.id[0] === channelId);
  if (!ch) return;
  const fromBlock = snap.blocks.find((b) => b.id === ch.from_block[0]);
  const toBlock = snap.blocks.find((b) => b.id === ch.to_block[0]);
  infoEl.textContent = "";
  const title = document.createElement("b");
  title.textContent = "Channel";
  infoEl.appendChild(title);
  const idSpan = document.createElement("span");
  idSpan.className = "text-text-dim";
  idSpan.textContent = ` #${channelId}`;
  infoEl.appendChild(idSpan);
  infoEl.appendChild(document.createElement("br"));
  const detailDiv = document.createElement("div");
  detailDiv.className = "mt-1.5 text-xs";
  const fromName = fromBlock ? `${fromBlock.name}` : `Block ${ch.from_block[0]}`;
  const fromPortName = fromBlock?.outputs[ch.from_port]?.name ?? `port ${ch.from_port}`;
  const toName = toBlock ? `${toBlock.name}` : `Block ${ch.to_block[0]}`;
  const toPortName = toBlock?.inputs[ch.to_port]?.name ?? `port ${ch.to_port}`;
  const fromRow = document.createElement("div");
  fromRow.textContent = `From: ${fromName} \u2192 ${fromPortName}`;
  detailDiv.appendChild(fromRow);
  const toRow = document.createElement("div");
  toRow.textContent = `To: ${toName} \u2192 ${toPortName}`;
  detailDiv.appendChild(toRow);
  infoEl.appendChild(detailDiv);
  const disconnectBtn = document.createElement("button");
  disconnectBtn.className = "btn btn-sm mt-2";
  disconnectBtn.style.backgroundColor = "var(--color-danger)";
  disconnectBtn.style.color = "white";
  disconnectBtn.textContent = "Disconnect";
  disconnectBtn.addEventListener("click", () => {
    if (!mgr || !editor) return;
    mgr.disconnect(channelId);
    editor.clearSelection();
    editor.updateSnapshot();
    updateEdgeInfo(null, null);
  });
  infoEl.appendChild(disconnectBtn);
}
function formatValue(val) {
  if (!val) return "\u2014";
  switch (val.type) {
    case "Float":
      return val.data.toFixed(4);
    case "Text":
      return `"${val.data.slice(0, 30)}"`;
    case "Bytes":
      return `[${val.data.length} bytes]`;
    case "Series":
      return `[${val.data.length} samples]`;
  }
}
function setupSidebarPalette() {
  const containerEl = document.getElementById("df-sidebar-palette");
  const filterInput = document.getElementById("df-palette-filter");
  if (!containerEl) return;
  const container = containerEl;
  const blockTypes = DataflowManager.blockTypes();
  function render(filter) {
    container.textContent = "";
    const lower = filter.toLowerCase();
    let lastCat = "";
    for (const bt of blockTypes) {
      if (filter && !bt.name.toLowerCase().includes(lower) && !bt.block_type.toLowerCase().includes(lower)) {
        continue;
      }
      if (bt.category !== lastCat) {
        lastCat = bt.category;
        const header = document.createElement("div");
        header.className = "text-[10px] text-text-dim uppercase tracking-wider px-2 pt-2 pb-1";
        if (container.childNodes.length > 0) {
          header.style.borderTop = "1px solid var(--color-border)";
        }
        header.textContent = bt.category;
        container.appendChild(header);
      }
      const item = document.createElement("button");
      item.className = "block w-full text-left text-xs px-2 py-1.5 cursor-pointer bg-transparent border-none text-text transition-colors";
      item.style.cssText = "border-left: 2px solid transparent;";
      item.addEventListener("mouseenter", () => {
        item.style.background = "var(--color-border)";
        item.style.borderLeftColor = "var(--color-accent)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
        item.style.borderLeftColor = "transparent";
      });
      item.textContent = bt.name;
      item.addEventListener("click", () => {
        if (!mgr || !editor) return;
        const config = DEFAULT_CONFIGS[bt.block_type] ?? {};
        mgr.addBlock(bt.block_type, config, 200, 200);
        editor.updateSnapshot();
        editor.onChange?.();
      });
      container.appendChild(item);
    }
  }
  render("");
  filterInput?.addEventListener("input", () => render(filterInput.value));
}
var MCU_FAMILIES = [
  { id: "Host", label: "Host (Simulation)" },
  { id: "Rp2040", label: "RP2040 (Pico)" },
  { id: "Stm32f4", label: "STM32F4" },
  { id: "Stm32g0b1", label: "STM32G0B1" },
  { id: "Esp32c3", label: "ESP32-C3" }
];
var deployBoards = [];
var blockAssignments = /* @__PURE__ */ new Map();
function setupBoardManager() {
  const listEl = document.getElementById("df-board-list");
  const nameInput = document.getElementById("df-board-name");
  const mcuSelect = document.getElementById("df-board-mcu");
  const addBtn = document.getElementById("df-board-add");
  const assignEl = document.getElementById("df-block-assignments");
  if (!listEl || !nameInput || !mcuSelect || !addBtn || !assignEl) return;
  mcuSelect.textContent = "";
  for (const fam of MCU_FAMILIES) {
    const opt = document.createElement("option");
    opt.value = fam.id;
    opt.textContent = fam.label;
    mcuSelect.appendChild(opt);
  }
  addBtn.addEventListener("click", () => {
    const nodeId = nameInput.value.trim();
    if (!nodeId) return;
    const mcuFamily = mcuSelect.value;
    if (deployBoards.some((b) => b.nodeId === nodeId)) return;
    deployBoards.push({ nodeId, mcuFamily });
    nameInput.value = "";
    renderBoardList();
    renderBlockAssignments();
  });
  function renderBoardList() {
    if (!listEl) return;
    listEl.textContent = "";
    if (deployBoards.length === 0) {
      const hint = document.createElement("span");
      hint.className = "text-text-dim text-[11px]";
      hint.textContent = "No boards added (single-board mode)";
      listEl.appendChild(hint);
      return;
    }
    for (let i = 0; i < deployBoards.length; i++) {
      const b = deployBoards[i];
      const row = document.createElement("div");
      row.className = "flex items-center justify-between py-0.5";
      const info = document.createElement("span");
      info.textContent = `${b.nodeId} (${b.mcuFamily})`;
      row.appendChild(info);
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "\xD7";
      removeBtn.className = "text-text-dim hover:text-danger text-sm leading-none ml-2 cursor-pointer";
      removeBtn.addEventListener("click", () => {
        deployBoards.splice(i, 1);
        for (const [blockId, nodeId] of blockAssignments) {
          if (nodeId === b.nodeId) blockAssignments.delete(blockId);
        }
        renderBoardList();
        renderBlockAssignments();
      });
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    }
  }
  function renderBlockAssignments() {
    if (!assignEl || !mgr) return;
    assignEl.textContent = "";
    if (deployBoards.length === 0) return;
    const snap = mgr.snapshot();
    if (!snap || snap.blocks.length === 0) {
      const hint = document.createElement("span");
      hint.className = "text-text-dim text-[11px]";
      hint.textContent = "Add blocks to assign them to boards";
      assignEl.appendChild(hint);
      return;
    }
    const header = document.createElement("b");
    header.textContent = "Block Assignments";
    header.className = "text-xs block mb-1";
    assignEl.appendChild(header);
    for (const block of snap.blocks) {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between py-0.5 gap-1";
      const label = document.createElement("span");
      label.className = "truncate flex-1 text-[11px]";
      label.textContent = `#${block.id} ${block.name}`;
      row.appendChild(label);
      const select = document.createElement("select");
      select.className = "bg-bg border border-border text-text px-1 py-0.5 rounded text-[11px] focus:outline-none focus:border-accent";
      const noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = "(none)";
      select.appendChild(noneOpt);
      for (const board of deployBoards) {
        const opt = document.createElement("option");
        opt.value = board.nodeId;
        opt.textContent = board.nodeId;
        if (blockAssignments.get(block.id) === board.nodeId) {
          opt.selected = true;
        }
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        if (select.value) {
          blockAssignments.set(block.id, select.value);
        } else {
          blockAssignments.delete(block.id);
        }
      });
      row.appendChild(select);
      assignEl.appendChild(row);
    }
  }
  renderBoardList();
  if (editor) {
    const prevOnSelect = editor.onSelect;
    editor.onSelect = (blockId, snap) => {
      prevOnSelect?.(blockId, snap);
      renderBlockAssignments();
    };
  }
}
var TARGET_OPTIONS = [
  { id: "Host", label: "Host (Simulation)", checked: true },
  { id: "Rp2040", label: "RP2040 (Pico)", checked: false },
  { id: "Stm32f4", label: "STM32F4", checked: false },
  { id: "Esp32c3", label: "ESP32-C3", checked: false }
];
function setupTargetCheckboxes() {
  const container = document.getElementById("df-target-select");
  if (!container) return;
  container.textContent = "";
  const label = document.createElement("b");
  label.textContent = "Targets";
  label.className = "text-xs";
  container.appendChild(label);
  for (const target2 of TARGET_OPTIONS) {
    const row = document.createElement("label");
    row.className = "flex items-center gap-1.5 text-xs mt-1 cursor-pointer";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = target2.checked;
    cb.className = "df-target-check";
    cb.dataset.target = target2.id;
    row.appendChild(cb);
    const span = document.createElement("span");
    span.textContent = target2.label;
    row.appendChild(span);
    container.appendChild(row);
  }
}
function setupHilConnection() {
  const connectBtn = $btn("hil-connect");
  const statusEl2 = $("hil-status");
  const deployBtn = document.getElementById("hil-deploy");
  const deployStatus = $("hil-deploy-status");
  const pinContainer = $("hil-pin-table");
  const i2cContainer = $("hil-i2c-panel");
  connectBtn.addEventListener("click", () => {
    if (hilClient?.connected) {
      hilClient.disconnect();
      return;
    }
    const url = $input("hil-ws-url").value.trim();
    if (!url) return;
    hilClient = new HilClient();
    hilClient.onConnect = () => {
      statusEl2.textContent = "Connected";
      statusEl2.className = "text-xs text-success mb-2";
      connectBtn.textContent = "Disconnect";
      deployBtn.disabled = false;
      if (telemetry && hilClient?.socket) {
        telemetry.attach(hilClient.socket);
        telemetry.setEnabled(true);
      }
    };
    hilClient.onDisconnect = () => {
      statusEl2.textContent = "Disconnected";
      statusEl2.className = "text-xs text-text-dim mb-2";
      connectBtn.textContent = "Connect";
      deployBtn.disabled = true;
      telemetry?.detach();
    };
    hilClient.onBusList = (buses) => {
      updateI2cBuses(i2cContainer, buses, hilClient);
    };
    hilClient.onPinConfig = (pins) => {
      renderPinTable(pinContainer, pins, (_idx, _pin) => {
        hilClient?.getPinConfig();
      });
    };
    hilClient.onError = (msg) => {
      deployStatus.textContent = `Error: ${msg}`;
      deployStatus.className = "text-xs mt-1 min-h-4 text-danger";
    };
    hilClient.onDeployAck = () => {
      deployStatus.textContent = "Deployed successfully.";
      deployStatus.className = "text-xs mt-1 min-h-4 text-success";
    };
    renderI2cPanel(i2cContainer, hilClient);
    hilClient.connect(url);
    statusEl2.textContent = "Connecting\u2026";
    statusEl2.className = "text-xs text-warning mb-2";
  });
  deployBtn.addEventListener("click", () => {
    if (!mgr || !hilClient?.connected) return;
    const dt = parseFloat($input("df-dt").value) || 0.01;
    const targetChecks = document.querySelectorAll(".df-target-check:checked");
    const target2 = targetChecks.length > 0 ? targetChecks[0].dataset.target : "Host";
    try {
      const snap = mgr.snapshot();
      const snapshotJson = JSON.stringify(snap);
      hilClient.deploy(snapshotJson, target2, dt);
      deployStatus.textContent = "Deploying\u2026";
      deployStatus.className = "text-xs mt-1 min-h-4 text-warning";
    } catch (e) {
      deployStatus.textContent = `Deploy error: ${e}`;
      deployStatus.className = "text-xs mt-1 min-h-4 text-danger";
    }
  });
}
function setupDfRightTabs() {
  const tabs = document.querySelectorAll(".df-right-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.dftab;
      if (!targetId) return;
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".df-tab-content").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });
}
function downloadAsZip(files) {
  const blob = createZip(files);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dataflow-generated.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}
function updatePlots(snap) {
  const plotCanvas = document.getElementById("df-plot-canvas");
  if (!plotCanvas) return;
  for (const block of snap.blocks) {
    if (block.block_type === "plot") {
      const val = block.output_values[0];
      if (val && val.type === "Series") {
        drawPlot(plotCanvas, val.data, `Plot #${block.id}`);
        return;
      }
    }
  }
}

// src/dataflow/panel-manager.ts
import {
  panel_new,
  panel_destroy,
  panel_load,
  panel_save,
  panel_add_widget,
  panel_remove_widget,
  panel_update_widget,
  panel_snapshot,
  panel_set_topic,
  panel_get_values,
  panel_merge_values,
  panel_collect_outputs
} from "../pkg/rustsim.js";
var PanelManager = class _PanelManager {
  panelId;
  constructor(name) {
    this.panelId = panel_new(name);
  }
  destroy() {
    panel_destroy(this.panelId);
  }
  /** Deserialize a PanelModel from JSON and wrap it. */
  static load(json) {
    const mgr2 = Object.create(_PanelManager.prototype);
    mgr2.panelId = panel_load(json);
    return mgr2;
  }
  /** Serialize the panel to JSON. */
  save() {
    return panel_save(this.panelId);
  }
  /** Add a widget (id field is ignored, assigned by WASM). Returns assigned id. */
  addWidget(widget) {
    const w = { id: 0, ...widget };
    return panel_add_widget(this.panelId, JSON.stringify(w));
  }
  /** Remove a widget by id. Returns true if it existed. */
  removeWidget(widgetId) {
    return panel_remove_widget(this.panelId, widgetId);
  }
  /** Replace a widget's config in-place (id is preserved by WASM). */
  updateWidget(widgetId, widget) {
    const w = { id: widgetId, ...widget };
    panel_update_widget(this.panelId, widgetId, JSON.stringify(w));
  }
  /** Get a live snapshot of the panel model. */
  snapshot() {
    return JSON.parse(panel_snapshot(this.panelId));
  }
  /** Set a single topic value in the panel's pubsub store. */
  setTopic(topic, value) {
    panel_set_topic(this.panelId, topic, value);
  }
  /** Get all topic values as a record. */
  getValues() {
    return JSON.parse(panel_get_values(this.panelId));
  }
  /** Merge external topic values into the panel's pubsub store. */
  mergeValues(values) {
    panel_merge_values(this.panelId, JSON.stringify(values));
  }
  /** Collect output topic values written by widgets. */
  collectOutputs() {
    return JSON.parse(panel_collect_outputs(this.panelId));
  }
};

// src/dataflow/panel-view.ts
function renderToggle(widget, _kind, onInteraction) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-2";
  const label = document.createElement("span");
  label.className = "text-[13px] text-text";
  label.textContent = widget.label;
  wrapper.appendChild(label);
  const toggle = document.createElement("label");
  toggle.className = "relative inline-flex items-center cursor-pointer";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "sr-only peer";
  input.addEventListener("change", () => {
    onInteraction(widget.id, input.checked ? 1 : 0);
    track.classList.toggle("bg-accent", input.checked);
    track.classList.toggle("bg-border", !input.checked);
    dot.classList.toggle("translate-x-5", input.checked);
    dot.classList.toggle("translate-x-0", !input.checked);
  });
  toggle.appendChild(input);
  const track = document.createElement("div");
  track.className = "w-10 h-5 bg-border rounded-full transition-colors duration-200";
  track.dataset.role = "track";
  toggle.appendChild(track);
  const dot = document.createElement("div");
  dot.className = "absolute left-0.5 top-0.5 w-4 h-4 bg-text rounded-full transition-transform duration-200 translate-x-0";
  dot.dataset.role = "dot";
  toggle.appendChild(dot);
  wrapper.appendChild(toggle);
  return wrapper;
}
function renderSlider(widget, kind, onInteraction) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col gap-1";
  const header = document.createElement("div");
  header.className = "flex justify-between items-center";
  const label = document.createElement("span");
  label.className = "text-[13px] text-text";
  label.textContent = widget.label;
  header.appendChild(label);
  const valueLabel = document.createElement("span");
  valueLabel.className = "text-[13px] text-text-dim font-mono";
  valueLabel.dataset.role = "value";
  valueLabel.textContent = String(kind.min);
  header.appendChild(valueLabel);
  wrapper.appendChild(header);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(kind.min);
  input.max = String(kind.max);
  input.step = String(kind.step);
  input.value = String(kind.min);
  input.className = "w-full accent-accent";
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valueLabel.textContent = String(v);
    onInteraction(widget.id, v);
  });
  wrapper.appendChild(input);
  return wrapper;
}
function renderGauge(widget, kind) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col gap-1";
  const header = document.createElement("div");
  header.className = "flex justify-between items-center";
  const label = document.createElement("span");
  label.className = "text-[13px] text-text";
  label.textContent = widget.label;
  header.appendChild(label);
  const valueLabel = document.createElement("span");
  valueLabel.className = "text-[13px] text-text-dim font-mono";
  valueLabel.dataset.role = "value";
  valueLabel.textContent = String(kind.min);
  header.appendChild(valueLabel);
  wrapper.appendChild(header);
  const barBg = document.createElement("div");
  barBg.className = "w-full h-2 bg-bg rounded-full overflow-hidden";
  const barFill = document.createElement("div");
  barFill.className = "h-full bg-accent rounded-full transition-all duration-150";
  barFill.dataset.role = "bar";
  barFill.dataset.min = String(kind.min);
  barFill.dataset.max = String(kind.max);
  barFill.style.width = "0%";
  barBg.appendChild(barFill);
  wrapper.appendChild(barBg);
  return wrapper;
}
function renderLabel(widget) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col gap-0.5";
  const label = document.createElement("span");
  label.className = "text-[11px] uppercase tracking-wider text-text-dim";
  label.textContent = widget.label;
  wrapper.appendChild(label);
  const value = document.createElement("span");
  value.className = "text-[15px] text-text font-mono";
  value.dataset.role = "value";
  value.textContent = "\u2014";
  wrapper.appendChild(value);
  return wrapper;
}
function renderButton(widget, _kind, onInteraction) {
  const wrapper = document.createElement("div");
  const btn = document.createElement("button");
  btn.className = "bg-accent text-white px-4 py-1.5 rounded text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-accent-dim active:opacity-80";
  btn.textContent = widget.label;
  btn.addEventListener("pointerdown", () => {
    onInteraction(widget.id, 1);
  });
  btn.addEventListener("pointerup", () => {
    onInteraction(widget.id, 0);
  });
  btn.addEventListener("pointerleave", () => {
    onInteraction(widget.id, 0);
  });
  wrapper.appendChild(btn);
  return wrapper;
}
function renderIndicator(widget) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-center gap-2";
  const dot = document.createElement("div");
  dot.className = "w-3 h-3 rounded-full bg-border transition-colors duration-150";
  dot.dataset.role = "indicator";
  wrapper.appendChild(dot);
  const label = document.createElement("span");
  label.className = "text-[13px] text-text";
  label.textContent = widget.label;
  wrapper.appendChild(label);
  return wrapper;
}
function renderPanel(container, mgr2, onWidgetInteraction2) {
  const model = mgr2.snapshot();
  container.textContent = "";
  const title = document.createElement("h2");
  title.className = "text-[13px] uppercase tracking-wider text-text-dim mb-3";
  title.textContent = model.name;
  container.appendChild(title);
  for (const widget of model.widgets) {
    const card = document.createElement("div");
    card.className = "bg-surface border border-border rounded-lg p-3 mb-2";
    card.dataset.widgetId = String(widget.id);
    card.style.minWidth = `${widget.size.width}px`;
    card.style.minHeight = `${widget.size.height}px`;
    let content;
    switch (widget.kind.type) {
      case "Toggle":
        content = renderToggle(widget, widget.kind, onWidgetInteraction2);
        break;
      case "Slider":
        content = renderSlider(widget, widget.kind, onWidgetInteraction2);
        break;
      case "Gauge":
        content = renderGauge(widget, widget.kind);
        break;
      case "Label":
        content = renderLabel(widget);
        break;
      case "Button":
        content = renderButton(widget, widget.kind, onWidgetInteraction2);
        break;
      case "Indicator":
        content = renderIndicator(widget);
        break;
    }
    card.appendChild(content);
    container.appendChild(card);
  }
}
function updatePanelValues(container, values) {
  for (const [widgetId, value] of values) {
    const card = container.querySelector(
      `[data-widget-id="${widgetId}"]`
    );
    if (!card) continue;
    const valueEl = card.querySelector('[data-role="value"]');
    if (valueEl) {
      valueEl.textContent = typeof value === "number" ? String(Math.round(value * 1e3) / 1e3) : String(value);
    }
    const barEl = card.querySelector('[data-role="bar"]');
    if (barEl && typeof value === "number") {
      const min = parseFloat(barEl.dataset.min ?? "0");
      const max = parseFloat(barEl.dataset.max ?? "100");
      const pct = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
      barEl.style.width = `${pct}%`;
    }
    const indicatorEl = card.querySelector('[data-role="indicator"]');
    if (indicatorEl && typeof value === "number") {
      const lit = value > 0.5;
      indicatorEl.classList.toggle("bg-accent", lit);
      indicatorEl.classList.toggle("bg-border", !lit);
    }
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox && typeof value === "number") {
      const checked = value > 0.5;
      if (checkbox.checked !== checked) {
        checkbox.checked = checked;
        const track = card.querySelector('[data-role="track"]');
        const dot = card.querySelector('[data-role="dot"]');
        if (track) {
          track.classList.toggle("bg-accent", checked);
          track.classList.toggle("bg-border", !checked);
        }
        if (dot) {
          dot.classList.toggle("translate-x-5", checked);
          dot.classList.toggle("translate-x-0", !checked);
        }
      }
    }
    const slider = card.querySelector('input[type="range"]');
    if (slider && typeof value === "number") {
      slider.value = String(value);
    }
  }
}

// src/dataflow/panel-editor.ts
function nanOr(value, fallback) {
  return isNaN(value) ? fallback : value;
}
var panelMgr = null;
var selectedWidgetId = null;
var hilClient2 = null;
var syncIntervalId = null;
var WIDGET_DEFAULTS = {
  Toggle: {
    kind: { type: "Toggle" },
    defaultChannels: [{ topic: "topic/name", direction: "Output", port_kind: "Float" }]
  },
  Slider: {
    kind: { type: "Slider", min: 0, max: 100, step: 1 },
    defaultChannels: [{ topic: "topic/name", direction: "Output", port_kind: "Float" }]
  },
  Gauge: {
    kind: { type: "Gauge", min: 0, max: 100 },
    defaultChannels: [{ topic: "topic/name", direction: "Input", port_kind: "Float" }]
  },
  Label: {
    kind: { type: "Label" },
    defaultChannels: [{ topic: "topic/name", direction: "Input", port_kind: "Float" }]
  },
  Button: {
    kind: { type: "Button" },
    defaultChannels: [{ topic: "topic/name", direction: "Output", port_kind: "Float" }]
  },
  Indicator: {
    kind: { type: "Indicator" },
    defaultChannels: [{ topic: "topic/name", direction: "Input", port_kind: "Float" }]
  }
};
var OUTPUT_WIDGETS = /* @__PURE__ */ new Set(["Toggle", "Slider", "Button"]);
function getWorkspace() {
  return document.getElementById("panel-workspace");
}
function rerender() {
  if (!panelMgr) return;
  const workspace = getWorkspace();
  renderPanel(workspace, panelMgr, onWidgetInteraction);
  const cards = workspace.querySelectorAll("[data-widget-id]");
  for (const card of cards) {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseInt(card.dataset.widgetId, 10);
      selectWidget(id);
    });
  }
  if (selectedWidgetId !== null) {
    const sel = workspace.querySelector(
      `[data-widget-id="${selectedWidgetId}"]`
    );
    if (sel) {
      sel.style.borderColor = "var(--color-accent)";
      sel.style.borderWidth = "2px";
    }
  }
}
function onWidgetInteraction(widgetId, value) {
  if (!panelMgr) return;
  const model = panelMgr.snapshot();
  const widget = model.widgets.find((w) => w.id === widgetId);
  if (!widget) return;
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
  for (const ch of widget.channels) {
    if (ch.direction === "Output") {
      panelMgr.setTopic(ch.topic, numValue);
    }
  }
}
function selectWidget(widgetId) {
  selectedWidgetId = widgetId;
  rerender();
  showInspector(widgetId);
}
function clearInspector() {
  selectedWidgetId = null;
  const inspector = document.getElementById("panel-inspector");
  inspector.textContent = "";
  const hint = document.createElement("span");
  hint.className = "text-text-dim text-[11px]";
  hint.textContent = "Select a widget to configure";
  inspector.appendChild(hint);
}
function showInspector(widgetId) {
  if (!panelMgr) return;
  const model = panelMgr.snapshot();
  const widget = model.widgets.find((w) => w.id === widgetId);
  if (!widget) {
    clearInspector();
    return;
  }
  const inspector = document.getElementById("panel-inspector");
  inspector.textContent = "";
  const labelRow = document.createElement("div");
  labelRow.className = "mb-2";
  const labelLabel = document.createElement("label");
  labelLabel.className = "block text-text-dim text-[11px] mb-0.5";
  labelLabel.textContent = "Label";
  labelRow.appendChild(labelLabel);
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.value = widget.label;
  labelInput.className = "w-full bg-bg border border-border text-text px-2 py-1 rounded text-xs focus:outline-none focus:border-accent";
  labelRow.appendChild(labelInput);
  inspector.appendChild(labelRow);
  const kindInputs = {};
  if (widget.kind.type === "Slider") {
    for (const key of ["min", "max", "step"]) {
      const row = document.createElement("div");
      row.className = "mb-2";
      const lab = document.createElement("label");
      lab.className = "block text-text-dim text-[11px] mb-0.5";
      lab.textContent = key;
      row.appendChild(lab);
      const inp = document.createElement("input");
      inp.type = "number";
      inp.step = "any";
      inp.value = String(widget.kind[key]);
      inp.className = "w-full bg-bg border border-border text-text px-2 py-1 rounded text-xs focus:outline-none focus:border-accent";
      row.appendChild(inp);
      inspector.appendChild(row);
      kindInputs[key] = inp;
    }
  } else if (widget.kind.type === "Gauge") {
    for (const key of ["min", "max"]) {
      const row = document.createElement("div");
      row.className = "mb-2";
      const lab = document.createElement("label");
      lab.className = "block text-text-dim text-[11px] mb-0.5";
      lab.textContent = key;
      row.appendChild(lab);
      const inp = document.createElement("input");
      inp.type = "number";
      inp.step = "any";
      inp.value = String(widget.kind[key]);
      inp.className = "w-full bg-bg border border-border text-text px-2 py-1 rounded text-xs focus:outline-none focus:border-accent";
      row.appendChild(inp);
      inspector.appendChild(row);
      kindInputs[key] = inp;
    }
  }
  const channelInputs = [];
  if (widget.channels.length > 0) {
    const chHeader = document.createElement("div");
    chHeader.className = "text-text-dim text-[11px] mt-2 mb-1 font-semibold";
    chHeader.textContent = "Channels";
    inspector.appendChild(chHeader);
    for (let i = 0; i < widget.channels.length; i++) {
      const ch = widget.channels[i];
      const row = document.createElement("div");
      row.className = "mb-2";
      const dirSpan = document.createElement("span");
      dirSpan.className = "text-[10px] text-text-dim";
      dirSpan.textContent = `${ch.direction} (${ch.port_kind})`;
      row.appendChild(dirSpan);
      const topicInput = document.createElement("input");
      topicInput.type = "text";
      topicInput.value = ch.topic;
      topicInput.className = "w-full bg-bg border border-border text-text px-2 py-1 rounded text-xs mt-0.5 focus:outline-none focus:border-accent";
      row.appendChild(topicInput);
      inspector.appendChild(row);
      channelInputs.push(topicInput);
    }
  }
  const applyBtn = document.createElement("button");
  applyBtn.className = "btn btn-primary btn-sm mt-2";
  applyBtn.textContent = "Apply";
  applyBtn.addEventListener("click", () => {
    if (!panelMgr) return;
    let updatedKind = widget.kind;
    if (widget.kind.type === "Slider") {
      updatedKind = {
        type: "Slider",
        min: nanOr(parseFloat(kindInputs["min"].value), 0),
        max: nanOr(parseFloat(kindInputs["max"].value), 100),
        step: nanOr(parseFloat(kindInputs["step"].value), 1)
      };
    } else if (widget.kind.type === "Gauge") {
      updatedKind = {
        type: "Gauge",
        min: nanOr(parseFloat(kindInputs["min"].value), 0),
        max: nanOr(parseFloat(kindInputs["max"].value), 100)
      };
    }
    const updatedChannels = widget.channels.map((ch, i) => ({
      ...ch,
      topic: channelInputs[i]?.value ?? ch.topic
    }));
    panelMgr.updateWidget(widgetId, {
      kind: updatedKind,
      label: labelInput.value,
      position: widget.position,
      size: widget.size,
      channels: updatedChannels
    });
    rerender();
    showInspector(widgetId);
  });
  inspector.appendChild(applyBtn);
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm mt-2";
  deleteBtn.style.backgroundColor = "var(--color-danger)";
  deleteBtn.style.color = "white";
  deleteBtn.textContent = "Delete Widget";
  deleteBtn.addEventListener("click", () => {
    if (!panelMgr) return;
    panelMgr.removeWidget(widgetId);
    clearInspector();
    rerender();
  });
  inspector.appendChild(deleteBtn);
}
function startPubsubSync() {
  if (syncIntervalId) return;
  syncIntervalId = setInterval(async () => {
    if (!panelMgr || !hilClient2?.connected) return;
    try {
      const pubsubValues = await hilClient2.getPubsub();
      panelMgr.mergeValues(pubsubValues);
      const allValues = panelMgr.getValues();
      const model = panelMgr.snapshot();
      const valueMap = /* @__PURE__ */ new Map();
      for (const widget of model.widgets) {
        for (const ch of widget.channels) {
          if (ch.direction === "Input" && ch.topic in allValues) {
            valueMap.set(widget.id, allValues[ch.topic]);
          }
        }
      }
      if (valueMap.size > 0) {
        const workspace = getWorkspace();
        updatePanelValues(workspace, valueMap);
      }
    } catch {
    }
  }, 200);
}
function stopPubsubSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}
function buildPalette() {
  const palette = document.getElementById("panel-widget-palette");
  palette.textContent = "";
  for (const [name, def] of Object.entries(WIDGET_DEFAULTS)) {
    const btn = document.createElement("button");
    btn.className = "block w-full text-left text-xs px-2 py-1.5 cursor-pointer bg-transparent border-none text-text transition-colors";
    const isOutput = OUTPUT_WIDGETS.has(name);
    btn.style.borderLeft = `3px solid ${isOutput ? "var(--color-accent)" : "var(--color-success)"}`;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "var(--color-border)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
    });
    btn.textContent = name;
    btn.addEventListener("click", () => {
      if (!panelMgr) return;
      panelMgr.addWidget({
        kind: def.kind,
        label: name,
        position: { x: 0, y: 0 },
        size: { width: 160, height: 60 },
        channels: def.defaultChannels.map((c) => ({ ...c }))
      });
      rerender();
    });
    palette.appendChild(btn);
  }
}
function loadPanel(name) {
  const json = localStorage.getItem("panel:" + name);
  if (!json) return;
  const nameInput = document.getElementById("panel-name");
  if (panelMgr) panelMgr.destroy();
  panelMgr = PanelManager.load(json);
  nameInput.value = name;
  clearInspector();
  rerender();
  refreshPanelList();
}
function refreshPanelList() {
  const container = document.getElementById("panel-list");
  if (!container) return;
  container.textContent = "";
  const nameInput = document.getElementById("panel-name");
  const currentName = nameInput?.value.trim() ?? "";
  const panelKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("panel:")) {
      panelKeys.push(key.slice("panel:".length));
    }
  }
  panelKeys.sort();
  if (panelKeys.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-[11px] text-text-dim px-2 py-2";
    empty.textContent = "No saved panels";
    container.appendChild(empty);
    return;
  }
  for (const panelName of panelKeys) {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between px-2 py-1.5 text-xs cursor-pointer transition-colors";
    item.style.borderLeft = "2px solid transparent";
    if (panelName === currentName) {
      item.style.borderLeftColor = "var(--color-accent)";
      item.style.background = "var(--color-surface)";
    }
    item.addEventListener("mouseenter", () => {
      if (panelName !== currentName) {
        item.style.background = "var(--color-border)";
      }
    });
    item.addEventListener("mouseleave", () => {
      if (panelName !== currentName) {
        item.style.background = "transparent";
      }
    });
    const nameSpan = document.createElement("span");
    nameSpan.textContent = panelName;
    nameSpan.className = "truncate flex-1";
    nameSpan.addEventListener("click", () => loadPanel(panelName));
    item.appendChild(nameSpan);
    const delBtn = document.createElement("button");
    delBtn.textContent = "\xD7";
    delBtn.className = "text-text-dim hover:text-danger text-sm leading-none ml-2";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      localStorage.removeItem("panel:" + panelName);
      refreshPanelList();
    });
    item.appendChild(delBtn);
    container.appendChild(item);
  }
}
function initPanel() {
  const nameInput = document.getElementById("panel-name");
  const newBtn = document.getElementById("panel-new");
  const saveBtn = document.getElementById("panel-save");
  panelMgr = new PanelManager("My Panel");
  buildPalette();
  rerender();
  refreshPanelList();
  const workspace = getWorkspace();
  workspace.addEventListener("click", (e) => {
    if (e.target === workspace) {
      clearInspector();
      rerender();
    }
  });
  newBtn.addEventListener("click", () => {
    if (panelMgr) panelMgr.destroy();
    panelMgr = new PanelManager("My Panel");
    nameInput.value = "My Panel";
    clearInspector();
    rerender();
    refreshPanelList();
  });
  saveBtn.addEventListener("click", () => {
    if (!panelMgr) return;
    const name = nameInput.value.trim() || "My Panel";
    localStorage.setItem("panel:" + name, panelMgr.save());
    refreshPanelList();
    const origText = saveBtn.textContent;
    saveBtn.textContent = "Saved!";
    setTimeout(() => {
      saveBtn.textContent = origText;
    }, 1500);
  });
  const hilUrlInput = document.getElementById("panel-hil-url");
  const hilConnectBtn = document.getElementById("panel-hil-connect");
  const hilStatusEl = document.getElementById("panel-hil-status");
  hilConnectBtn.addEventListener("click", () => {
    if (hilClient2?.connected) {
      hilClient2.disconnect();
      stopPubsubSync();
      return;
    }
    const url = hilUrlInput.value.trim();
    if (!url) return;
    hilClient2 = new HilClient();
    hilClient2.onConnect = () => {
      hilStatusEl.textContent = "Connected";
      hilStatusEl.className = "text-[11px] text-success";
      hilConnectBtn.textContent = "Disconnect";
      startPubsubSync();
    };
    hilClient2.onDisconnect = () => {
      hilStatusEl.textContent = "Disconnected";
      hilStatusEl.className = "text-[11px] text-text-dim";
      hilConnectBtn.textContent = "Connect";
      stopPubsubSync();
    };
    hilClient2.onError = (msg) => {
      hilStatusEl.textContent = "Error: " + msg;
      hilStatusEl.className = "text-[11px] text-danger";
    };
    hilClient2.connect(url);
    hilStatusEl.textContent = "Connecting...";
    hilStatusEl.className = "text-[11px] text-warning";
  });
}
function activatePanel() {
  requestAnimationFrame(() => rerender());
}

// src/version.ts
async function initVersion() {
  try {
    const resp = await fetch("./version.json");
    if (!resp.ok) return;
    const info = await resp.json();
    const short = `${info.sha} (${info.date.slice(0, 10)})`;
    console.info(`RustCAM ${info.ref} ${short}`);
    const el = document.createElement("span");
    el.className = "text-text-dim text-[11px] font-mono ml-2";
    el.textContent = short;
    el.title = `Branch: ${info.ref}
SHA: ${info.sha}
Built: ${info.date}`;
    document.querySelector("header")?.appendChild(el);
  } catch {
  }
}

// src/main.ts
setResizeSim(resizeSim);
setLoadSim(loadSim);
function setMode(mode) {
  setCurrentMode(mode);
  document.querySelectorAll("#mode-switcher button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("cam-sidebar-content").classList.toggle("hidden", mode !== "cam");
  $("sketch-sidebar-content").classList.toggle("hidden", mode !== "sketch");
  $("dataflow-sidebar-content").classList.toggle("hidden", mode !== "dataflow");
  $("panel-sidebar-content").classList.toggle("hidden", mode !== "panel");
  document.getElementById("preview-canvas").classList.toggle("hidden", mode !== "cam");
  $("preview-header").classList.toggle("hidden", mode !== "cam");
  $("sketch-canvas-wrap").style.display = mode === "sketch" ? "flex" : "none";
  const app = document.querySelector(".app");
  app.classList.toggle("sketch-mode", mode === "sketch");
  app.classList.toggle("dataflow-mode", mode === "dataflow");
  app.classList.toggle("panel-mode", mode === "panel");
  if (mode === "sketch") {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resizeSketchCanvas();
      redrawSketch2();
    }));
  } else if (mode === "dataflow") {
    activateDataflow();
  } else if (mode === "panel") {
    activatePanel();
  } else {
    tryPreview();
  }
}
document.querySelectorAll("#mode-switcher button").forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
function redrawSketch2() {
  redrawSketch();
  drawConstraintOverlay();
}
window.addEventListener("resize", () => {
  tryPreview();
  resizeSim();
  if (getCurrentMode() === "sketch") {
    resizeSketchCanvas();
    redrawSketch2();
  }
  resizeDataflow();
});
new ResizeObserver(() => {
  if (getCurrentMode() === "sketch") {
    resizeSketchCanvas();
    redrawSketch2();
  }
}).observe($("sketch-canvas-wrap"));
$("sketch-to-cam").addEventListener("click", () => {
  if (sketchShapes.length === 0) {
    $("sketch-status").textContent = "Draw at least one shape first.";
    $("sketch-status").className = "text-xs mt-2 min-h-4 text-danger";
    return;
  }
  const svgText = sketchToSvg();
  setFileData(svgText, "svg");
  $("filename").textContent = "sketch.svg";
  document.getElementById("generate-btn").disabled = !wasmReady;
  setMode("cam");
  tryPreview();
  $("status").textContent = "Sketch loaded \u2014 configure and generate.";
  $("status").className = "text-xs mt-2 min-h-4 text-success";
});
async function boot() {
  try {
    await init({ module_or_path: "/pkg/rustcam_bg.wasm" });
    await initSim({ module_or_path: "/pkg/rustsim_bg.wasm" });
    setWasmReady(true);
    initDataflow();
    initPanel();
    initVersion();
    setMode("dataflow");
    $("status").textContent = "WASM loaded \u2014 drop a file to begin.";
    $("status").className = "text-xs mt-2 min-h-4 text-success";
  } catch (e) {
    $("status").textContent = "Failed to load WASM: " + e;
    $("status").className = "text-xs mt-2 min-h-4 text-danger";
  }
}
boot();
//# sourceMappingURL=main.js.map
