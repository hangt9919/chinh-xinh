// Chỉnh Xinh — giao diện
import { Engine } from "./engine.js";
import * as Face from "./face.js";

const $ = s => document.querySelector(s);
const cv = $("#cv"), overlay = $("#overlay"), stage = $("#stage"), wrap = $("#wrap"), origImg = $("#orig");
const octx = overlay.getContext("2d");
const isMobile = matchMedia("(pointer: coarse)").matches;

let eng;
try { eng = new Engine(cv); } catch (e) {
  $("#empty p").textContent = "Trình duyệt này không hỗ trợ WebGL nên không chạy được app. Hãy thử Safari hoặc Chrome bản mới.";
}

// ---------------- dữ liệu ----------------
const DEF = {
  exposure: 0, bright: 0, contrast: 0, high: 0, shadow: 0, sat: 0, vib: 0, warm: 0, tint: 0, sharp: 0, fade: 0, vig: 0, grain: 0,
  filter: "none", filterAmt: 80,
  smooth: 0, whiten: 0, teeth: 0, slim: 0, small: 0, chin: 0, eye: 0, nose: 0, forehead: 0,
  lip: 0, lipColor: "#d23b5a", hair: 0, hairColor: "#8b4a2b",
  legA: 0.55, legB: 0.93, leg: 0,
  rot: 0, flip: false, crop: [0, 0, 1, 1], cropRatio: "free",
};
let P = clone(DEF);
function clone(o) { return JSON.parse(JSON.stringify(o)); }

const T3 = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; // hàng -> cột
const FILTERS = [
  { id: "none", name: "Gốc", p: {} },
  { id: "trong", name: "Trong trẻo", p: { exposure: .08, contrast: .1, high: -.15, shadow: .15, vib: .2, warm: -.06 } },
  { id: "han", name: "Hàn Quốc", p: { bright: .12, contrast: -.1, sat: -.12, warm: -.08, tint: .06, fade: .25, shadow: .2 } },
  { id: "sua", name: "Kem sữa", p: { bright: .14, sat: -.18, warm: .1, fade: .3, high: -.1 } },
  { id: "dao", name: "Hồng đào", p: { bright: .08, warm: .12, tint: .2, fade: .15, vib: .1 } },
  { id: "am", name: "Nắng ấm", p: { warm: .4, sat: .08, contrast: .06, shadow: .1 } },
  { id: "lanh", name: "Lạnh", p: { warm: -.38, contrast: .08, sat: -.05 } },
  { id: "mint", name: "Bạc hà", p: { warm: -.15, tint: -.12, fade: .18, bright: .06 }, cm: [.95, .05, 0, 0, 1, .05, 0, .08, .95], off: [0, .02, .03] },
  { id: "film", name: "Film", p: { fade: .22, contrast: .18, sat: -.12, warm: .1, grain: .35 }, cm: [1.05, -.02, -.03, -.02, 1, .02, -.05, .05, 1], off: [0, .01, .02] },
  { id: "hoanghon", name: "Hoàng hôn", p: { warm: .45, tint: .12, sat: .18, vig: .3, contrast: .08 } },
  { id: "ruc", name: "Rực rỡ", p: { vib: .45, sat: .15, contrast: .15 } },
  { id: "hoaico", name: "Hoài cổ", p: { fade: .3, vig: .35, grain: .25, contrast: .05 }, cm: [.393, .769, .189, .349, .686, .168, .272, .534, .131], off: [0, 0, 0] },
  { id: "bw", name: "Đen trắng", p: { sat: -1, contrast: .18 } },
  { id: "bwm", name: "Xám mềm", p: { sat: -1, fade: .25, bright: .08 } },
];
const LIP_COLORS = ["#d23b5a", "#b3123a", "#e8566f", "#f07a7a", "#c94f3d", "#a8324f", "#e0708f", "#8e2238", "#ff5e57", "#c0605b"];
const HAIR_COLORS = ["#8b4a2b", "#5a3420", "#b5651d", "#c8a165", "#e6c88f", "#7b2d26", "#a3354a", "#5b2a6e", "#2f4f8f", "#3d6b5a", "#9aa0a6", "#e0a3b8"];

const S = (id, name, icon, o = {}) => ({ id, name, icon, type: "slider", min: -100, max: 100, ...o });
const TABS = [
  { id: "beauty", name: "Làm đẹp", icon: "sparkles", tools: [
    { id: "auto", name: "Tự động", icon: "wand-sparkles", type: "action" },
    S("smooth", "Mịn da", "droplets", { min: 0 }),
    S("whiten", "Trắng da", "sun-medium", { min: 0 }),
    S("slim", "Mặt thon", "scan-face", { min: 0, face: 1 }),
    S("small", "Mặt nhỏ", "minimize-2", { min: 0, face: 1 }),
    S("eye", "Mắt to", "eye", { min: 0, face: 1 }),
    S("nose", "Mũi nhỏ", "triangle", { min: -50, max: 100, face: 1 }),
    S("chin", "Cằm", "chevrons-down", { face: 1 }),
    S("forehead", "Chân tóc", "arrow-down-to-line", { face: 1 }),
    S("teeth", "Trắng răng", "smile", { min: 0 }),
  ] },
  { id: "reshape", name: "Kéo thon", icon: "move", tools: [
    { id: "push", name: "Kéo đẩy", icon: "hand", type: "liquify" },
    { id: "pinch", name: "Thu nhỏ", icon: "shrink", type: "liquify" },
    { id: "bloat", name: "Phóng to", icon: "expand", type: "liquify" },
    { id: "restore", name: "Khôi phục", icon: "eraser", type: "liquify" },
    { id: "leg", name: "Dài chân", icon: "move-vertical", type: "leg" },
    { id: "resetWarp", name: "Bỏ hết", icon: "rotate-ccw", type: "action" },
  ] },
  { id: "adjust", name: "Chỉnh", icon: "sliders-horizontal", tools: [
    S("bright", "Độ sáng", "sun"), S("exposure", "Phơi sáng", "aperture"), S("contrast", "Tương phản", "contrast"),
    S("high", "Vùng sáng", "sunrise"), S("shadow", "Vùng tối", "moon"), S("sat", "Bão hòa", "droplet"),
    S("vib", "Sống động", "palette"), S("warm", "Nhiệt độ", "thermometer"), S("tint", "Tông màu", "pipette"),
    S("sharp", "Độ nét", "focus", { min: 0 }), S("fade", "Phai màu", "cloud-fog", { min: 0 }),
    S("vig", "Tối viền", "circle-dot"), S("grain", "Hạt film", "film", { min: 0 }),
  ] },
  { id: "filter", name: "Bộ lọc", icon: "aperture", tools: FILTERS.map(f => ({ id: f.id, name: f.name, type: "filter" })) },
  { id: "makeup", name: "Trang điểm", icon: "brush", tools: [
    { id: "lip", name: "Son môi", icon: "heart", type: "color", face: 1 },
    { id: "hair", name: "Nhuộm tóc", icon: "paintbrush", type: "color" },
    { id: "teethBrush", name: "Cọ răng", icon: "smile-plus", type: "brush", layer: "teeth", amount: "teeth" },
    { id: "skinBrush", name: "Cọ mịn da", icon: "brush", type: "brush", layer: "skin", amount: "smooth" },
  ] },
  { id: "crop", name: "Cắt", icon: "crop", tools: [
    { id: "free", name: "Tự do", type: "ratio", r: 0 }, { id: "1:1", name: "1:1", type: "ratio", r: 1 },
    { id: "4:5", name: "4:5", type: "ratio", r: 4 / 5 }, { id: "3:4", name: "3:4", type: "ratio", r: 3 / 4 },
    { id: "9:16", name: "9:16", type: "ratio", r: 9 / 16 }, { id: "16:9", name: "16:9", type: "ratio", r: 16 / 9 },
    { id: "orig", name: "Gốc", type: "ratio", r: -1 },
    { id: "rotate", name: "Xoay", icon: "rotate-cw", type: "action" },
    { id: "flip", name: "Lật", icon: "flip-horizontal-2", type: "action" },
  ] },
];

const st = {
  tab: "beauty", tool: null, loaded: false, src: null, srcURL: null,
  face: "idle", faceCount: 0, hair: "idle", token: 0,
  brushSize: 46, brushStrength: 55, brushMode: "add", showMask: 0, paintingMask: 0,
  zoom: 1, panX: 0, panY: 0, fit: { x: 0, y: 0, w: 0, h: 0 },
  thumbsFor: null,
};
const paint = { teeth: null, hair: null, skin: null };
const paintDirty = new Set();
const paintVer = { teeth: 0, hair: 0, skin: 0 };

// ---------------- tiện ích ----------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
let toastT;
function toast(msg, ms = 2200) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms); }
function icons() { window.lucide && lucide.createIcons({ attrs: { "stroke-width": 1.8 } }); }
const toolDef = id => { for (const t of TABS) for (const x of t.tools) if (x.id === id && t.id === st.tab) return x; return null; };

function renderParams(extra) {
  const f = FILTERS.find(x => x.id === P.filter) || FILTERS[0], a = P.filterAmt / 100;
  const R = {};
  for (const k of ["exposure", "bright", "contrast", "high", "shadow", "sat", "vib", "warm", "tint", "sharp", "fade", "vig", "grain", "smooth", "whiten", "teeth", "lip", "hair"]) R[k] = P[k] / 100;
  for (const k in f.p) R[k] = (R[k] || 0) + f.p[k] * a;
  R.cm = f.cm ? T3(f.cm) : null; R.cmOff = f.off || [0, 0, 0]; R.cmAmt = f.cm ? a : 0;
  R.lipColor = hex2rgb(P.lipColor); R.hairColor = hex2rgb(P.hairColor);
  R.showMask = st.paintingMask || st.showMask;
  return Object.assign(R, extra || {});
}
function finalView() { return { rot: P.rot, flip: P.flip, crop: P.crop }; }
function currentView() {
  if (st.tab === "crop") return { rot: P.rot, flip: P.flip, crop: [0, 0, 1, 1] };
  if (st.tool === "leg") return { rot: 0, flip: false, crop: [0, 0, 1, 1] };
  return finalView();
}
let lastFieldKey = "";
function syncMesh() {
  const fa = { slim: P.slim / 100, small: P.small / 100, chin: P.chin / 100, eye: P.eye / 100, nose: P.nose / 100, forehead: P.forehead / 100 };
  const leg = { a: P.legA, b: P.legB, s: P.leg / 100 * 0.5 };
  const key = JSON.stringify([fa, leg, Object.keys(eng.fields).length]);
  if (key !== lastFieldKey || st.meshDirty) {
    eng.fieldAmt = fa; eng.leg = leg; eng.updateMesh();
    lastFieldKey = key; st.meshDirty = false;
  }
}

// ---------------- vẽ ----------------
let rafQ = false;
function req(pass1) {
  if (pass1 && eng) eng.dirty1 = true;
  if (rafQ || !st.loaded) return;
  rafQ = true;
  requestAnimationFrame(() => {
    rafQ = false;
    for (const n of paintDirty) eng.setPaint(n, paint[n]);
    paintDirty.clear();
    syncMesh();
    eng.render(renderParams(), currentView());
    layout();
    drawOverlay();
  });
}

function layout() {
  const r = stage.getBoundingClientRect();
  const pad = 14, aw = r.width - pad * 2, ah = r.height - pad * 2;
  const a = cv.width / cv.height;
  let w = aw, h = aw / a;
  if (h > ah) { h = ah; w = ah * a; }
  const x = (r.width - w) / 2, y = (r.height - h) / 2;
  st.fit = { x, y, w, h };
  wrap.style.width = w + "px"; wrap.style.height = h + "px";
  applyZoom();
  const dpr = devicePixelRatio || 1;
  if (overlay.width !== Math.round(r.width * dpr) || overlay.height !== Math.round(r.height * dpr)) {
    overlay.width = Math.round(r.width * dpr); overlay.height = Math.round(r.height * dpr);
  }
  if (st.tab === "crop") placeCropBox();
}
function applyZoom() {
  if (st.zoom <= 1.001) { st.zoom = 1; st.panX = 0; st.panY = 0; }
  wrap.style.transform = `translate(${st.fit.x + st.panX}px, ${st.fit.y + st.panY}px) scale(${st.zoom})`;
}

// toạ độ màn hình -> toạ độ trước-kéo-chân
function screenToPre(cx, cy) {
  const r = cv.getBoundingClientRect();
  const u = (cx - r.left) / r.width, v = (cy - r.top) / r.height;
  return { ...eng.canvasToPre(u, v, currentView()), u, v, scale: cv.width / r.width };
}

let cursor = null;
function drawOverlay() {
  const dpr = devicePixelRatio || 1, sr = stage.getBoundingClientRect();
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, overlay.width, overlay.height);
  const r = cv.getBoundingClientRect();
  if (st.tool === "leg") {
    const yA = eng.preToCanvas(0, P.legA * eng.H, currentView()).v * r.height + r.top - sr.top;
    const yB = eng.preToCanvas(0, P.legB * eng.H, currentView()).v * r.height + r.top - sr.top;
    const x0 = r.left - sr.left, x1 = r.right - sr.left;
    octx.fillStyle = "rgba(255,79,139,.13)"; octx.fillRect(x0, yA, x1 - x0, yB - yA);
    for (const [y, t] of [[yA, "Kéo vạch trên"], [yB, "Kéo vạch dưới"]]) {
      octx.strokeStyle = "#ff4f8b"; octx.lineWidth = 2; octx.setLineDash([8, 6]);
      octx.beginPath(); octx.moveTo(x0, y); octx.lineTo(x1, y); octx.stroke(); octx.setLineDash([]);
      octx.fillStyle = "#ff4f8b"; octx.beginPath(); octx.arc((x0 + x1) / 2, y, 11, 0, 7); octx.fill();
      octx.fillStyle = "#fff"; octx.font = "600 11px -apple-system, sans-serif"; octx.textAlign = "center"; octx.textBaseline = "middle";
      octx.fillText("⇕", (x0 + x1) / 2, y + 0.5);
      octx.textAlign = "left"; octx.fillText(t, x0 + 8, y - 12);
    }
  }
  if (st.tab === "crop") {
    const [x, y, w, h] = P.crop, L = r.left - sr.left, T = r.top - sr.top;
    octx.fillStyle = "rgba(11,11,15,.62)"; octx.beginPath();
    octx.rect(L, T, r.width, r.height); octx.rect(L + x * r.width, T + y * r.height, w * r.width, h * r.height);
    octx.fill("evenodd");
  }
  if (cursor) {
    octx.strokeStyle = "rgba(255,255,255,.95)"; octx.lineWidth = 1.5;
    octx.beginPath(); octx.arc(cursor.x - sr.left, cursor.y - sr.top, cursor.r, 0, 7); octx.stroke();
    octx.strokeStyle = "rgba(0,0,0,.5)"; octx.lineWidth = 1;
    octx.beginPath(); octx.arc(cursor.x - sr.left, cursor.y - sr.top, cursor.r + 1.5, 0, 7); octx.stroke();
  }
}

// ---------------- mở ảnh ----------------
async function openFile(file) {
  if (!file) return;
  $("#busy").hidden = false;
  try {
    const url = URL.createObjectURL(file);
    const img = new Image(); img.src = url;
    await img.decode();
    loadImage(img, url);
  } catch (e) {
    console.error(e); toast("Không mở được ảnh này. Thử ảnh JPG/PNG khác nhé.");
  } finally { $("#busy").hidden = true; }
}
function loadImage(img, url) {
  if (!eng) return;
  const maxSide = Math.min(eng.maxTex, isMobile ? 2048 : 3000);
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  if (st.srcURL && st.srcURL !== url && st.srcURL.startsWith("blob:")) URL.revokeObjectURL(st.srcURL);
  st.src = c; st.srcURL = url; origImg.src = url;
  eng.setImage(c);
  // mặt nạ cọ
  const ms = Math.min(1, 1024 / Math.max(c.width, c.height));
  for (const n of Object.keys(paint)) {
    const pc = document.createElement("canvas"); pc.width = Math.round(c.width * ms); pc.height = Math.round(c.height * ms);
    const g = pc.getContext("2d"); g.fillStyle = "rgb(128,128,128)"; g.fillRect(0, 0, pc.width, pc.height);
    paint[n] = pc; paintDirty.add(n); paintVer[n]++;
  }
  P = clone(DEF);
  st.loaded = true; st.zoom = 1; st.thumbsFor = null; st.meshDirty = true; lastFieldKey = "";
  $("#empty").hidden = true; $("#panel").classList.remove("off"); $("#btnSave").disabled = false;
  hist.length = 0; fut.length = 0; cur = snapshot(); updUndo();
  selectTab(st.tab, true);
  req(true);
  analyze();
}

async function analyze() {
  const token = ++st.token;
  st.face = "loading"; st.hair = "loading"; refreshOpts();
  try {
    const lms = await Face.detectFaces(st.src);
    if (token !== st.token) return;
    if (lms.length) {
      const W = eng.W, H = eng.H;
      const faces = Face.faceGeometry(lms, W, H);
      eng.fields = Face.buildFields(faces, eng.base, eng.N);
      const fm = Face.buildFeatMask(faces, W, H);
      eng.setFeat(fm.data, fm.w, fm.h);
      const fw = Math.max(...faces.map(f => f.faceW));
      eng.buildBlur(clamp(fw / 42, 1.5, Math.max(W, H) / 60));
      st.face = "ok"; st.faceCount = lms.length; st.meshDirty = true;
    } else st.face = "none";
  } catch (e) { console.warn("face", e); if (token === st.token) st.face = "error"; }
  refreshOpts(); req(true);
  try {
    const hs = await Face.segmentHair(st.src);
    if (token !== st.token) return;
    eng.setSeg(hs.data, hs.w, hs.h); st.hair = "ok";
  } catch (e) { console.warn("hair", e); if (token === st.token) st.hair = "error"; }
  refreshOpts(); req(true);
}

// ---------------- lịch sử ----------------
const hist = [], fut = [];
let cur = null;
const paintCache = {};
function snapshot() {
  const pm = {};
  for (const n of Object.keys(paint)) {
    if (!paint[n]) continue;
    if (!paintCache[n] || paintCache[n].ver !== paintVer[n]) paintCache[n] = { ver: paintVer[n], data: paint[n].getContext("2d").getImageData(0, 0, paint[n].width, paint[n].height) };
    pm[n] = paintCache[n];
  }
  return { P: clone(P), L: eng.L.slice(), pm };
}
function commit() {
  if (!st.loaded) return;
  hist.push(cur); if (hist.length > 30) hist.shift();
  cur = snapshot(); fut.length = 0; updUndo();
}
function restore(s) {
  P = clone(s.P); eng.L.set(s.L);
  for (const n of Object.keys(s.pm)) {
    if (paintCache[n] && paintCache[n].data === s.pm[n].data && paintVer[n] === s.pm[n].ver) continue;
    paint[n].getContext("2d").putImageData(s.pm[n].data, 0, 0);
    paintVer[n] = s.pm[n].ver; paintCache[n] = s.pm[n]; paintDirty.add(n);
  }
  st.meshDirty = true; refreshOpts(); refreshTools(); req(true);
}
function undo() { if (!hist.length) return; fut.push(cur); cur = hist.pop(); restore(cur); updUndo(); }
function redo() { if (!fut.length) return; hist.push(cur); cur = fut.pop(); restore(cur); updUndo(); }
function updUndo() { $("#btnUndo").disabled = !hist.length; $("#btnRedo").disabled = !fut.length; }

// ---------------- giao diện tab / công cụ ----------------
function buildTabs() {
  $("#tabs").innerHTML = TABS.map(t => `<button data-tab="${t.id}"><i data-lucide="${t.icon}"></i>${t.name}</button>`).join("");
  $("#tabs").onclick = e => { const b = e.target.closest("button"); if (b) selectTab(b.dataset.tab); };
}
function selectTab(id, keepTool) {
  const prev = st.tab;
  st.tab = id;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === id));
  const tab = TABS.find(t => t.id === id);
  if (!keepTool || !toolDef(st.tool)) {
    const first = id === "filter" ? P.filter : id === "crop" ? P.cropRatio : tab.tools.find(t => t.type !== "action")?.id;
    st.tool = first;
  }
  st.showMask = 0; cursor = null;
  $("#cropBox").hidden = id !== "crop";
  buildTools();
  refreshOpts();
  if (id === "filter") makeThumbs();
  if (prev !== id) { st.zoom = 1; }
  req();
}
function isChanged(t) {
  if (t.type === "slider") return P[t.id] !== 0;
  if (t.type === "filter") return false;
  if (t.id === "lip") return P.lip > 0;
  if (t.id === "hair") return P.hair > 0;
  if (t.id === "leg") return P.leg > 0;
  return false;
}
function buildTools() {
  const tab = TABS.find(t => t.id === st.tab);
  $("#tools").innerHTML = tab.tools.map(t => {
    if (t.type === "filter") return `<button class="tool thumb" data-id="${t.id}"><span class="ic" data-thumb="${t.id}"></span><span class="lb">${t.name}</span></button>`;
    if (t.type === "ratio") return `<button class="tool ratio" data-id="${t.id}"><span class="ic">${t.id === "free" ? '<i data-lucide="scan"></i>' : t.id === "orig" ? '<i data-lucide="image"></i>' : t.name}</span><span class="lb">${t.id === "free" || t.id === "orig" ? t.name : "Tỉ lệ"}</span></button>`;
    return `<button class="tool" data-id="${t.id}"><span class="ic"><i data-lucide="${t.icon}"></i></span><span class="lb">${t.name}</span></button>`;
  }).join("");
  icons();
  refreshTools();
  applyThumbs();
}
function refreshTools() {
  const tab = TABS.find(t => t.id === st.tab);
  document.querySelectorAll("#tools .tool").forEach(b => {
    const t = tab.tools.find(x => x.id === b.dataset.id);
    const on = t.type === "filter" ? P.filter === t.id : t.type === "ratio" ? P.cropRatio === t.id : st.tool === t.id;
    b.classList.toggle("on", on);
    b.querySelector(".dot")?.remove();
    if (isChanged(t)) b.insertAdjacentHTML("beforeend", '<span class="dot"></span>');
  });
}
$("#tools").addEventListener("click", e => {
  const b = e.target.closest(".tool"); if (!b) return;
  const t = toolDef(b.dataset.id); if (!t) return;
  if (t.type === "action") return runAction(t.id);
  if (t.type === "filter") { P.filter = t.id; if (t.id !== "none" && P.filterAmt === 0) P.filterAmt = 80; commit(); req(true); }
  if (t.type === "ratio") { setRatio(t); }
  if (t.type === "brush") {
    if (P[t.amount] === 0) { P[t.amount] = t.amount === "teeth" ? 60 : 55; commit(); req(true); }
    st.brushMode = "add";
  }
  if (t.type === "color" && t.id === "hair" && P.hair === 0) { P.hair = 65; commit(); req(true); }
  if (t.type === "color" && t.id === "lip" && P.lip === 0 && st.face === "ok") { P.lip = 55; commit(); req(true); }
  st.tool = t.id; st.showMask = 0; cursor = null;
  refreshTools(); refreshOpts(); req();
});

function sliderHTML(key, label, min, max, val) {
  return `<div class="opt-row"><label>${label}</label><input type="range" min="${min}" max="${max}" value="${val}" data-k="${key}"><span class="val">${Math.round(val)}</span></div>`;
}
function paintFill(inp) {
  const min = +inp.min, max = +inp.max, v = +inp.value;
  const z = min < 0 ? (0 - min) / (max - min) * 100 : 0, p = (v - min) / (max - min) * 100;
  inp.style.setProperty("--a", Math.min(z, p) + "%"); inp.style.setProperty("--b", Math.max(z, p) + "%");
}
function faceHint() {
  if (st.face === "loading") return `<div class="hint">Đang nhận diện khuôn mặt… (lần đầu cần tải model ~4 MB)</div>`;
  if (st.face === "none") return `<div class="hint">Không thấy khuôn mặt rõ trong ảnh — hãy dùng <b>Kéo thon</b> để chỉnh tay.</div>`;
  if (st.face === "error") return `<div class="hint">Không tải được bộ nhận diện mặt (kiểm tra mạng). Vẫn dùng được <b>Kéo thon</b> tay.</div>`;
  return "";
}
function refreshOpts() {
  const o = $("#opts");
  if (!st.loaded) { o.innerHTML = ""; return; }
  const t = toolDef(st.tool);
  let h = "";
  if (st.tab === "filter") {
    h = P.filter === "none" ? `<div class="hint">Chọn một bộ lọc bên dưới</div>` : sliderHTML("filterAmt", "Độ đậm", 0, 100, P.filterAmt);
  } else if (st.tab === "crop") {
    h = `<div class="hint">Kéo các góc khung để cắt · Chọn tỉ lệ hoặc xoay bên dưới</div>`;
  } else if (!t) {
    h = "";
  } else if (t.type === "slider") {
    h = (t.face && st.face !== "ok") ? (faceHint() || sliderHTML(t.id, t.name, t.min, t.max, P[t.id])) : sliderHTML(t.id, t.name, t.min, t.max, P[t.id]);
    if (t.id === "teeth" && st.face !== "ok") h = sliderHTML("teeth", t.name, 0, 100, P.teeth) + `<div class="hint">Không thấy miệng tự động — dùng <b>Trang điểm › Cọ răng</b> để tô lên răng.</div>`;
    if (t.face && st.face === "ok" && st.faceCount > 1) h += `<div class="hint">Đang áp dụng cho ${st.faceCount} khuôn mặt</div>`;
  } else if (t.type === "liquify") {
    const tips = { push: "Kéo ngón tay để đẩy phần ảnh theo hướng kéo", pinch: "Giữ / di ngón tay để thu nhỏ vùng (eo, bắp tay…)", bloat: "Giữ / di ngón tay để phóng to vùng", restore: "Tô lên vùng đã kéo để trả lại như cũ" };
    h = sliderHTML("brushSize", "Cỡ cọ", 15, 120, st.brushSize) + sliderHTML("brushStrength", "Lực", 5, 100, st.brushStrength) + `<div class="hint">${tips[t.id]} · 2 ngón để phóng to ảnh</div>`;
  } else if (t.type === "leg") {
    h = sliderHTML("leg", "Kéo dài", 0, 100, P.leg) + `<div class="hint">Kéo 2 vạch hồng để chọn vùng chân, rồi kéo thanh trượt</div>`;
  } else if (t.type === "color") {
    const cols = t.id === "lip" ? LIP_COLORS : HAIR_COLORS, curC = t.id === "lip" ? P.lipColor : P.hairColor;
    if (t.id === "lip" && st.face !== "ok") h = faceHint() || "";
    else {
      h = `<div class="swatches">${cols.map(c => `<button class="sw${c === curC ? " on" : ""}" style="background:${c}" data-c="${c}"></button>`).join("")}</div>` + sliderHTML(t.id, "Độ đậm", 0, 100, P[t.id]);
      if (t.id === "hair") {
        h += `<div class="opt-row"><div class="seg"><button data-mode="add" class="${st.brushMode === "add" ? "on" : ""}">Tô thêm</button><button data-mode="erase" class="${st.brushMode === "erase" ? "on" : ""}">Xoá bớt</button></div><input type="range" min="15" max="120" value="${st.brushSize}" data-k="brushSize"><button class="toggle${st.showMask ? " on" : ""}" data-toggle="mask">Hiện vùng</button></div>`;
        if (st.hair === "loading") h += `<div class="hint">Đang tìm vùng tóc…</div>`;
        else if (st.hair !== "ok") h += `<div class="hint">Chưa tự tìm được tóc — tô lên tóc bằng ngón tay.</div>`;
      }
    }
  } else if (t.type === "brush") {
    h = sliderHTML(t.amount, t.amount === "teeth" ? "Độ trắng" : "Độ mịn", 0, 100, P[t.amount]) +
      `<div class="opt-row"><div class="seg"><button data-mode="add" class="${st.brushMode === "add" ? "on" : ""}">Tô</button><button data-mode="erase" class="${st.brushMode === "erase" ? "on" : ""}">Xoá</button></div><input type="range" min="10" max="120" value="${st.brushSize}" data-k="brushSize"><button class="toggle${st.showMask ? " on" : ""}" data-toggle="mask">Hiện vùng</button></div>`;
  }
  o.innerHTML = h;
  o.querySelectorAll("input[type=range]").forEach(paintFill);
}

const UI_KEYS = { brushSize: 1, brushStrength: 1 };
$("#opts").addEventListener("input", e => {
  const inp = e.target; if (inp.type !== "range") return;
  const k = inp.dataset.k, v = +inp.value;
  paintFill(inp);
  const val = inp.parentElement.querySelector(".val"); if (val) val.textContent = v;
  if (UI_KEYS[k]) { st[k] = v; return; }
  const before = P.leg;
  P[k] = v;
  if (k === "leg" && (P.crop[2] < 1 || P.crop[3] < 1) && before !== v) { P.crop = [0, 0, 1, 1]; P.cropRatio = "free"; toast("Đã bỏ khung cắt vì ảnh đổi chiều cao"); }
  req(!["slim", "small", "chin", "eye", "nose", "forehead", "leg"].includes(k));
});
$("#opts").addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.k;
  if (k && !UI_KEYS[k]) { commit(); refreshTools(); }
});
$("#opts").addEventListener("click", e => {
  const sw = e.target.closest(".sw");
  if (sw) {
    if (st.tool === "lip") { P.lipColor = sw.dataset.c; if (!P.lip) P.lip = 55; }
    else { P.hairColor = sw.dataset.c; if (!P.hair) P.hair = 65; }
    commit(); refreshOpts(); refreshTools(); req(true); return;
  }
  const m = e.target.closest("[data-mode]");
  if (m) { st.brushMode = m.dataset.mode; refreshOpts(); return; }
  const tg = e.target.closest("[data-toggle=mask]");
  if (tg) { st.showMask = st.showMask ? 0 : maskIdFor(st.tool); refreshOpts(); req(true); }
});
function maskIdFor(tool) { return tool === "teethBrush" ? 1 : tool === "hair" ? 2 : tool === "skinBrush" ? 3 : 0; }

function runAction(id) {
  if (id === "auto") {
    Object.assign(P, { smooth: 45, whiten: 22, teeth: 45 });
    if (st.face === "ok") Object.assign(P, { slim: 35, eye: 25, nose: 15, small: 10 });
    commit(); refreshTools(); refreshOpts(); req(true);
    toast(st.face === "ok" ? "Đã làm đẹp tự động ✨ — chỉnh thêm từng mục nếu muốn" : "Đã làm mịn & sáng da (chưa thấy khuôn mặt để kéo thon)");
  } else if (id === "resetWarp") {
    eng.L.fill(0); P.leg = 0; st.meshDirty = true; commit(); refreshTools(); refreshOpts(); req(); toast("Đã bỏ hết phần kéo thon tay");
  } else if (id === "rotate") {
    P.rot = (P.rot + 1) % 4; P.crop = [0, 0, 1, 1]; P.cropRatio = "free"; commit(); refreshTools(); req();
  } else if (id === "flip") {
    P.flip = !P.flip; if (P.rot % 2) P.rot = (P.rot + 2) % 4;
    P.crop = [1 - P.crop[0] - P.crop[2], P.crop[1], P.crop[2], P.crop[3]]; commit(); req();
  }
}

// ---------------- cắt ----------------
function fullDims() { return eng.viewSize({ rot: P.rot, flip: P.flip, crop: [0, 0, 1, 1] }); }
function setRatio(t) {
  P.cropRatio = t.id;
  const d = fullDims();
  if (t.r === 0) { /* giữ khung */ }
  else {
    const r = t.r === -1 ? d.w / d.h : t.r;
    let cw = 1, ch = (d.w / r) / d.h;
    if (ch > 1) { ch = 1; cw = (d.h * r) / d.w; }
    P.crop = [(1 - cw) / 2, (1 - ch) / 2, cw, ch];
  }
  commit(); refreshTools(); req();
}
function placeCropBox() {
  const b = $("#cropBox"), r = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const [x, y, w, h] = P.crop;
  Object.assign(b.style, { left: (r.left - sr.left + x * r.width) + "px", top: (r.top - sr.top + y * r.height) + "px", width: (w * r.width) + "px", height: (h * r.height) + "px" });
}
(function cropDrag() {
  const box = $("#cropBox");
  let d = null;
  box.addEventListener("pointerdown", e => {
    e.stopPropagation(); box.setPointerCapture(e.pointerId);
    d = { h: e.target.dataset.h || "move", x: e.clientX, y: e.clientY, c: P.crop.slice() };
  });
  box.addEventListener("pointermove", e => {
    if (!d) return;
    const r = cv.getBoundingClientRect();
    const dx = (e.clientX - d.x) / r.width, dy = (e.clientY - d.y) / r.height;
    let [x, y, w, h] = d.c;
    const t = TABS.find(t => t.id === "crop").tools.find(t => t.id === P.cropRatio);
    const dims = fullDims();
    const ratio = t && t.r ? (t.r === -1 ? 1 : t.r * dims.h / dims.w) : 0; // tỉ lệ theo toạ độ chuẩn hoá
    const mn = 0.08;
    if (d.h === "move") { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); }
    else {
      let x1 = x, y1 = y, x2 = x + w, y2 = y + h;
      if (d.h.includes("l")) x1 = clamp(x1 + dx, 0, x2 - mn); else x2 = clamp(x2 + dx, x1 + mn, 1);
      if (d.h.includes("t")) y1 = clamp(y1 + dy, 0, y2 - mn); else y2 = clamp(y2 + dy, y1 + mn, 1);
      if (ratio) {
        let nw = x2 - x1, nh = nw / ratio;
        if (d.h.includes("t") ? y2 - nh < 0 : y1 + nh > 1) { nh = d.h.includes("t") ? y2 : 1 - y1; nw = nh * ratio; }
        if (d.h.includes("l")) x1 = x2 - nw; else x2 = x1 + nw;
        if (d.h.includes("t")) y1 = y2 - nh; else y2 = y1 + nh;
        if (x1 < 0 || x2 > 1) return;
      }
      x = x1; y = y1; w = x2 - x1; h = y2 - y1;
    }
    P.crop = [x, y, w, h]; placeCropBox(); drawOverlay();
  });
  const end = () => { if (d) { d = null; commit(); } };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
})();

// ---------------- chạm trên ảnh ----------------
const ptrs = new Map();
let act = null, pinch = null, holdTimer = null;

stage.addEventListener("pointerdown", e => {
  if (!st.loaded) return;
  stage.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    if (act) cancelAction();
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: st.zoom, px: st.panX, py: st.panY };
    return;
  }
  if (ptrs.size === 1) startAction(e);
});
stage.addEventListener("pointermove", e => {
  if (!st.loaded) return;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const sr = stage.getBoundingClientRect();
    const z = clamp(pinch.z * d / pinch.d, 1, 8);
    const lx = (pinch.mx - sr.left - st.fit.x - pinch.px) / pinch.z, ly = (pinch.my - sr.top - st.fit.y - pinch.py) / pinch.z;
    st.zoom = z; st.panX = mx - sr.left - st.fit.x - z * lx; st.panY = my - sr.top - st.fit.y - z * ly;
    applyZoom(); drawOverlay();
    return;
  }
  if (act) moveAction(e);
  else if (e.pointerType === "mouse" && isBrushTool()) { cursor = { x: e.clientX, y: e.clientY, r: brushScreenR() }; drawOverlay(); }
});
const up = e => {
  ptrs.delete(e.pointerId);
  if (pinch && ptrs.size < 2) { pinch = null; if (ptrs.size === 0) return; }
  if (act && ptrs.size === 0) endAction(e);
};
stage.addEventListener("pointerup", up);
stage.addEventListener("pointercancel", up);
stage.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !act) { cursor = null; drawOverlay(); } });
stage.addEventListener("wheel", e => {
  if (!st.loaded) return; e.preventDefault();
  const sr = stage.getBoundingClientRect(), z0 = st.zoom, z = clamp(z0 * Math.exp(-e.deltaY * 0.0015), 1, 8);
  const lx = (e.clientX - sr.left - st.fit.x - st.panX) / z0, ly = (e.clientY - sr.top - st.fit.y - st.panY) / z0;
  st.zoom = z; st.panX = e.clientX - sr.left - st.fit.x - z * lx; st.panY = e.clientY - sr.top - st.fit.y - z * ly;
  applyZoom(); drawOverlay();
}, { passive: false });

function isBrushTool() { const t = toolDef(st.tool); return t && (t.type === "liquify" || t.type === "brush" || (t.type === "color" && t.id === "hair")); }
function brushScreenR() { return st.brushSize * (isMobile ? 1 : 0.8); }

function startAction(e) {
  const t = toolDef(st.tool);
  if (st.tab === "crop") return;
  if (t && t.type === "leg") {
    const r = cv.getBoundingClientRect();
    const yA = eng.preToCanvas(0, P.legA * eng.H, currentView()).v * r.height + r.top;
    const yB = eng.preToCanvas(0, P.legB * eng.H, currentView()).v * r.height + r.top;
    const dA = Math.abs(e.clientY - yA), dB = Math.abs(e.clientY - yB);
    if (Math.min(dA, dB) > 36) return;
    act = { kind: "leg", which: dA < dB ? "legA" : "legB" };
    return;
  }
  if (isBrushTool()) {
    const p = screenToPre(e.clientX, e.clientY);
    act = { kind: t.type === "liquify" ? "liq" : "paint", mode: t.id, last: p, lastScreen: { x: e.clientX, y: e.clientY } };
    if (act.kind === "liq") act.L0 = eng.L.slice();
    else { const n = t.layer || "hair"; act.img0 = { [n]: paint[n].getContext("2d").getImageData(0, 0, paint[n].width, paint[n].height) }; }
    cursor = { x: e.clientX, y: e.clientY, r: brushScreenR() };
    if (act.kind === "paint") { st.paintingMask = maskIdFor(st.tool); stamp(p, p); }
    else if (t.id !== "push") { holdTimer = setInterval(() => { if (act) { liqApply(act.last, act.last); req(); } }, 40); liqApply(p, p); }
    req(true);
    return;
  }
  // không có công cụ cọ: kéo để di chuyển khi đang phóng to
  if (st.zoom > 1) act = { kind: "pan", x: e.clientX, y: e.clientY, px: st.panX, py: st.panY };
}
function moveAction(e) {
  if (act.kind === "pan") { st.panX = act.px + e.clientX - act.x; st.panY = act.py + e.clientY - act.y; applyZoom(); drawOverlay(); return; }
  if (act.kind === "leg") {
    const r = cv.getBoundingClientRect();
    const p = eng.canvasToPre(0, (e.clientY - r.top) / r.height, currentView());
    const v = clamp(p.y / eng.H, 0, 1);
    if (act.which === "legA") P.legA = clamp(v, 0, P.legB - 0.05); else P.legB = clamp(v, P.legA + 0.05, 1);
    req(); return;
  }
  const p = screenToPre(e.clientX, e.clientY);
  cursor = { x: e.clientX, y: e.clientY, r: brushScreenR() };
  if (act.kind === "liq") liqApply(act.last, p); else stamp(act.last, p);
  act.last = p;
  req(act.kind === "paint");
}
function endAction() {
  clearInterval(holdTimer);
  const k = act && act.kind;
  if (k === "paint") { if (act.layer) paintVer[act.layer]++; st.paintingMask = 0; }
  act = null;
  if (k && k !== "pan") commit();
  if (isMobile) cursor = null;
  req(k === "paint");
}
function cancelAction() {
  clearInterval(holdTimer);
  if (act && act.L0) { eng.L.set(act.L0); eng.updateMesh(); }
  if (act && act.img0) { for (const n in act.img0) { paint[n].getContext("2d").putImageData(act.img0[n], 0, 0); paintDirty.add(n); } }
  act = null; st.paintingMask = 0; cursor = null; req(true);
}

function liqApply(a, b) {
  const radius = brushScreenR() * a.scale;
  const strength = st.brushStrength / 100;
  const t = st.tool;
  if (t === "push") eng.liquify("push", a.x, a.y, b.x - a.x, b.y - a.y, radius, Math.min(1, strength * 1.2));
  else eng.liquify(t, b.x, b.y, 0, 0, radius, strength);
}
function stamp(a, b) {
  const t = toolDef(st.tool);
  const layer = t.layer || (t.id === "hair" ? "hair" : null);
  if (!layer) return;
  act.layer = layer;
  const pc = paint[layer], g = pc.getContext("2d"), ms = pc.width / eng.W;
  const rPre = brushScreenR() * a.scale;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / (rPre * 0.25)));
  const col = st.brushMode === "add" ? "255,255,255" : "0,0,0";
  for (let i = (dist ? 1 : 0); i <= steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    const s = eng.preToSource(x, y);
    const cx = s.x * ms, cy = s.y * ms, r = rPre * ms;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, `rgba(${col},.55)`); gr.addColorStop(0.5, `rgba(${col},.4)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  }
  paintDirty.add(layer);
}

// ---------------- ảnh thu nhỏ bộ lọc ----------------
const thumbURLs = {};
function makeThumbs() {
  if (!st.loaded || st.thumbsFor === st.src) { applyThumbs(); return; }
  st.thumbsFor = st.src;
  const base = renderParams({ showMask: 0 });
  setTimeout(() => {
    for (const f of FILTERS) {
      const R = Object.assign({}, base);
      const curF = FILTERS.find(x => x.id === P.filter) || FILTERS[0], a = P.filterAmt / 100;
      for (const k in curF.p) R[k] -= curF.p[k] * a; // bỏ bộ lọc hiện tại
      for (const k in f.p) R[k] = (R[k] || 0) + f.p[k];
      R.cm = f.cm ? T3(f.cm) : null; R.cmOff = f.off || [0, 0, 0]; R.cmAmt = f.cm ? 1 : 0;
      thumbURLs[f.id] = eng.thumbnail(R, 128).toDataURL("image/jpeg", 0.8);
    }
    applyThumbs(); req(true);
  }, 30);
}
function applyThumbs() {
  document.querySelectorAll("[data-thumb]").forEach(el => { const u = thumbURLs[el.dataset.thumb]; if (u && st.thumbsFor) el.style.backgroundImage = `url(${u})`; });
}

// ---------------- lưu ----------------
let saveFile = null, saveURL = null;
async function save() {
  if (!st.loaded) return;
  const btn = $("#btnSave"); btn.disabled = true; btn.textContent = "…";
  try {
    syncMesh();
    eng.dirty1 = true;
    eng.render(renderParams({ showMask: 0 }), finalView());
    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.95));
    req(true);
    const name = `chinh-xinh-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.jpg`;
    saveFile = new File([blob], name, { type: "image/jpeg" });
    if (saveURL) URL.revokeObjectURL(saveURL);
    saveURL = URL.createObjectURL(blob);
    $("#savePreview").src = saveURL;
    const canShare = navigator.canShare && navigator.canShare({ files: [saveFile] });
    $("#btnShare").hidden = !canShare;
    $("#saveHint").textContent = canShare ? `Chọn “Lưu hình ảnh” để cất vào thư viện ảnh · ${cv.width}×${cv.height}px`
      : (isMobile ? `Hoặc nhấn giữ vào ảnh ở trên → Lưu vào Ảnh · ${cv.width}×${cv.height}px` : `${cv.width}×${cv.height}px`);
    $("#sheet").hidden = false; icons();
  } catch (e) { console.error(e); toast("Lưu không thành công, thử lại nhé"); }
  finally { btn.disabled = false; btn.textContent = "Lưu"; }
}
$("#btnShare").onclick = async () => {
  try { await navigator.share({ files: [saveFile], title: "Chỉnh Xinh" }); } catch (e) { if (e.name !== "AbortError") toast("Không chia sẻ được, hãy dùng Tải file về"); }
};
$("#btnDownload").onclick = () => {
  const a = document.createElement("a"); a.href = saveURL; a.download = saveFile.name; document.body.appendChild(a); a.click(); a.remove();
  toast("Đã tải ảnh về máy");
};
$("#btnCloseSheet").onclick = () => { $("#sheet").hidden = true; };
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") $("#sheet").hidden = true; });

// ---------------- nút trên cùng ----------------
$("#btnPick").onclick = () => $("#fileIn").click();
$("#btnOpen").onclick = () => $("#fileIn").click();
$("#btnCam").onclick = () => $("#camIn").click();
$("#fileIn").onchange = e => { openFile(e.target.files[0]); e.target.value = ""; };
$("#camIn").onchange = e => { openFile(e.target.files[0]); e.target.value = ""; };
$("#btnUndo").onclick = undo;
$("#btnRedo").onclick = redo;
$("#btnSave").onclick = save;
const cmp = $("#btnCompare");
const showOrig = on => { if (!st.loaded) return; origImg.hidden = !on; cmp.classList.toggle("on", on); };
cmp.addEventListener("pointerdown", e => { e.preventDefault(); showOrig(true); });
["pointerup", "pointerleave", "pointercancel"].forEach(ev => cmp.addEventListener(ev, () => showOrig(false)));
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
});
stage.addEventListener("dragover", e => e.preventDefault());
stage.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) openFile(f); });
addEventListener("resize", () => req());
document.addEventListener("gesturestart", e => e.preventDefault());

// ---------------- khởi động ----------------
buildTabs();
selectTab("beauty");
icons();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
const qs = new URLSearchParams(location.search).get("img");
if (qs) {
  $("#busy").hidden = false;
  fetch(qs).then(r => r.blob()).then(b => openFile(new File([b], "test.jpg", { type: b.type }))).catch(() => { $("#busy").hidden = true; toast("Không tải được ảnh thử"); });
}
window.__cx = { eng, P: () => P, st, set: o => { Object.assign(P, o); refreshOpts(); refreshTools(); req(true); }, reset: () => { P = clone(DEF); eng.L.fill(0); st.meshDirty = true; req(true); } };
