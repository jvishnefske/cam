// src/main.ts
import init from "../pkg/rustcam.js";

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
  effectiveDiameterRow.style.display = toolType === "face_mill" ? "block" : "none";
  cornerRadiusRow.style.display = toolType === "ball_end" ? "block" : "none";
  if (toolType === "ball_end") {
    const diameter = parseFloat($input("tool-diameter").value);
    $input("corner-radius").value = (diameter / 2).toFixed(2);
  }
}
toolTypeSelect.addEventListener("change", updateToolTypeUI);
$input("tool-diameter").addEventListener("change", updateToolTypeUI);
function updateStrategyUI() {
  const strategy = strategySelect.value;
  perimeterOptions.style.display = strategy === "perimeter" ? "block" : "none";
  zigzagOptions.style.display = strategy === "zigzag" ? "block" : "none";
}
function updateMachineTypeUI() {
  const isLaser = machineTypeSelect.value === "laser_cutter";
  cncParamsSection.style.display = isLaser ? "none" : "block";
  laserParamsSection.style.display = isLaser ? "block" : "none";
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
    statusEl.className = "status error";
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
    if (isLaserPreview) return "rgba(255, 60, 40, 0.85)";
    if (!has3D || z === void 0) return "#4f8cff";
    const t = (z - minZ) / zRange;
    const hue = 240 - t * 180;
    return `hsl(${hue}, 80%, 55%)`;
  };
  ctx.strokeStyle = "#1a1d27";
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
      ctx.strokeStyle = isLaserPreview ? "rgba(255, 60, 40, 0.85)" : "#4f8cff";
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
      statusEl.className = "status";
    } else if (msg.type === "done") {
      gcodeOut.value = msg.gcode;
      const elapsed = ((performance.now() - genStartTime) / 1e3).toFixed(1);
      statusEl.textContent = `Done \u2014 ${msg.gcode.split("\n").length} lines of G-code in ${elapsed}s.`;
      statusEl.className = "status ok";
      generateBtn.disabled = false;
      tryPreview();
      loadSimFn();
    } else if (msg.type === "error") {
      statusEl.textContent = "Error: " + msg.error;
      statusEl.className = "status error";
      generateBtn.disabled = false;
    }
  };
  genWorker.onerror = (e) => {
    statusEl.textContent = "Worker error: " + e.message;
    statusEl.className = "status error";
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
  statusEl.className = "status";
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
      statusEl.className = "status ok";
      tryPreview();
      loadSimFn();
    } catch (e) {
      statusEl.textContent = "Error: " + e;
      statusEl.className = "status error";
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
  matCtx.strokeStyle = "rgba(255,80,80,0.35)";
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
    ctx.strokeStyle = "#2a2d3a";
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
      ctx.strokeStyle = cur.rapid ? "rgba(255,255,100,0.25)" : "rgba(79,140,255,0.6)";
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
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const cutting = !m.rapid && m.z < parseFloat($input("safe-z").value) - 0.01;
    ctx.fillStyle = cutting ? "rgba(255,80,80,0.7)" : "rgba(100,200,100,0.5)";
    ctx.strokeStyle = cutting ? "#ff5555" : "#55ff88";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.fillStyle = "#8888a0";
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
  ctx.strokeStyle = "#1a1d27";
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
  ctx.strokeStyle = "#2a2d3a";
  ctx.lineWidth = 1;
  ctx.strokeRect(tx(0), ty(0), size * scale, size * scale);
  ctx.fillStyle = "#8888a0";
  ctx.font = "10px monospace";
  ctx.fillText("0,0", tx(0) + 2, ty(0) - 4);
  ctx.fillText(`${size},${size}`, tx(size) - 40, ty(size) + 12);
  for (const s of sketchShapes) drawShape(ctx, s, "#4f8cff", tx, ty, scale);
  if (sketchDraft) drawShape(ctx, sketchDraft, "#55ff88", tx, ty, scale);
  if (sketchTool === "polyline" && sketchPolyPts.length > 0) {
    ctx.strokeStyle = "#55ff88";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx(sketchPolyPts[0].x), ty(sketchPolyPts[0].y));
    for (let i = 1; i < sketchPolyPts.length; i++)
      ctx.lineTo(tx(sketchPolyPts[i].x), ty(sketchPolyPts[i].y));
    if (sketchDraft && "_cursor" in sketchDraft && sketchDraft._cursor)
      ctx.lineTo(tx(sketchDraft._cursor.x), ty(sketchDraft._cursor.y));
    ctx.stroke();
    ctx.fillStyle = "#55ff88";
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
    const color = status === "FullyConstrained" ? "#4caf50" : status === "OverConstrained" ? "#f44336" : "#ff9800";
    cstDofEl.style.color = color;
    cstDofEl.textContent = `DOF: ${d} (${status.replace(/([A-Z])/g, " $1").trim()})`;
    cstListEl.innerHTML = cstLastSnap.constraints.map(([id, c]) => {
      const type = Object.keys(c)[0] || "unknown";
      return `<div>${id}. ${type} <button onclick="window.__removeCst(${id})" style="font-size:10px;cursor:pointer;background:none;border:none;color:#f44336">\u2715</button></div>`;
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
    const color = status === "FullyConstrained" ? "#4caf50" : status === "OverConstrained" ? "#f44336" : "#ff9800";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx(pt.x), ty(pt.y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8888a0";
    ctx.font = "9px monospace";
    ctx.fillText(String(id), tx(pt.x) + 5, ty(pt.y) - 5);
  }
  ctx.strokeStyle = "#ffeb3b";
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

// src/main.ts
setResizeSim(resizeSim);
setLoadSim(loadSim);
function setMode(mode) {
  setCurrentMode(mode);
  document.querySelectorAll("#mode-switcher button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("cam-sidebar-content").style.display = mode === "cam" ? "block" : "none";
  $("sketch-sidebar-content").style.display = mode === "sketch" ? "block" : "none";
  $canvas("preview-canvas").style.display = mode === "cam" ? "block" : "none";
  $("preview-header").style.display = mode === "cam" ? "block" : "none";
  $("sketch-canvas-wrap").style.display = mode === "sketch" ? "flex" : "none";
  document.querySelector(".app").classList.toggle("sketch-mode", mode === "sketch");
  if (mode === "sketch") {
    requestAnimationFrame(() => {
      resizeSketchCanvas();
      redrawSketch2();
    });
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
    $("sketch-status").className = "status error";
    return;
  }
  const svgText = sketchToSvg();
  setFileData(svgText, "svg");
  $("filename").textContent = "sketch.svg";
  document.getElementById("generate-btn").disabled = !wasmReady;
  setMode("cam");
  tryPreview();
  $("status").textContent = "Sketch loaded \u2014 configure and generate.";
  $("status").className = "status ok";
});
async function boot() {
  try {
    await init();
    setWasmReady(true);
    $("status").textContent = "WASM loaded \u2014 drop a file to begin.";
    $("status").className = "status ok";
  } catch (e) {
    $("status").textContent = "Failed to load WASM: " + e;
    $("status").className = "status error";
  }
}
boot();
//# sourceMappingURL=main.js.map
