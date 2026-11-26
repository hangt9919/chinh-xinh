// Chỉnh Xinh — cắt người/vật từ ảnh và các lớp chồng lên ảnh chính
import * as Face from "./face.js";

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------- nguồn ảnh của lớp (không đổi sau khi tạo) ----------------
export const layerSrc = {};
let nextId = 1;
export function addSource(canvas) {
  const id = "s" + (nextId++) + Date.now().toString(36);
  layerSrc[id] = canvas;
  return id;
}

// ---------------- chỉnh màu cho lớp (cùng công thức với shader) ----------------
function applyAdjust(d, R) {
  if (R.ct && R.ctAmt) {
    // khớp màu trước các chỉnh khác
    const G = R.ct.g, O = R.ct.o, a = R.ctAmt;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const Y0 = 0.299 * r + 0.587 * g + 0.114 * b;
      const Y = Y0 * G[0] + O[0], Cb = ((b - Y0) * 0.564 + 0.5) * G[1] + O[1], Cr = ((r - Y0) * 0.713 + 0.5) * G[2] + O[2];
      const nr = Y + 1.403 * (Cr - 0.5), ng = Y - 0.344 * (Cb - 0.5) - 0.714 * (Cr - 0.5), nb = Y + 1.773 * (Cb - 0.5);
      d[i] = clamp(r + (nr - r) * a, 0, 1) * 255; d[i + 1] = clamp(g + (ng - g) * a, 0, 1) * 255; d[i + 2] = clamp(b + (nb - b) * a, 0, 1) * 255;
    }
  }
  const ex = 2 ** (R.exposure || 0), ga = 2 ** (-(R.bright || 0) * 0.9), ct = 1 + (R.contrast || 0) * 0.75;
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) { let v = (i / 255) * ex; v = Math.pow(Math.max(v, 0), ga); lut[i] = (v - 0.5) * ct + 0.5; }
  const sh = R.shadow || 0, hi = R.high || 0, wm = R.warm || 0, tn = R.tint || 0, sat = R.sat || 0, vib = R.vib || 0, fade = R.fade || 0;
  const cm = R.cm, off = R.cmOff || [0, 0, 0], ca = R.cmAmt || 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = lut[d[i]], g = lut[d[i + 1]], b = lut[d[i + 2]];
    if (sh || hi) {
      const l = clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 1);
      const k = sh * 0.32 * Math.pow(1 - l, 2.5) + hi * 0.3 * Math.pow(l, 2.5);
      r += k; g += k; b += k;
    }
    r += wm * 0.09 + tn * 0.035; g += wm * 0.015 - tn * 0.06; b += -wm * 0.09 + tn * 0.035;
    let l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (sat) { const f = 1 + sat; r = l + (r - l) * f; g = l + (g - l) * f; b = l + (b - l) * f; }
    if (vib) { const s = clamp(Math.max(r, g, b) - Math.min(r, g, b), 0, 1), f = 1 + vib * (1 - s) * 1.1; r = l + (r - l) * f; g = l + (g - l) * f; b = l + (b - l) * f; }
    if (cm && ca) {
      const nr = cm[0] * r + cm[1] * g + cm[2] * b + off[0], ng = cm[3] * r + cm[4] * g + cm[5] * b + off[1], nb = cm[6] * r + cm[7] * g + cm[8] * b + off[2];
      r += (nr - r) * ca; g += (ng - g) * ca; b += (nb - b) * ca;
    }
    if (fade) { r += (r * 0.84 + 0.09 - r) * fade; g += (g * 0.84 + 0.09 - g) * fade; b += (b * 0.84 + 0.09 - b) * fade; }
    d[i] = clamp(r, 0, 1) * 255; d[i + 1] = clamp(g, 0, 1) * 255; d[i + 2] = clamp(b, 0, 1) * 255;
  }
}

const cache = new Map();
// ảnh đã chỉnh của lớp (có lưu đệm)
export function layerImage(L, FILTERS) {
  const key = JSON.stringify([L.src, L.bright, L.contrast, L.sat, L.warm, L.filter, L.filterAmt, L.outline, L.ct, L.ctAmt]);
  const hit = cache.get(L.id);
  if (hit && hit.key === key) return hit.c;
  const src = layerSrc[L.src];
  let c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const g = c.getContext("2d"); g.drawImage(src, 0, 0);
  const f = FILTERS.find(x => x.id === L.filter) || FILTERS[0], a = (L.filterAmt ?? 80) / 100;
  const R = { bright: L.bright / 100, contrast: L.contrast / 100, sat: L.sat / 100, warm: L.warm / 100 };
  for (const k in f.p) if (k !== "grain" && k !== "vig") R[k] = (R[k] || 0) + f.p[k] * a;
  if (f.cm) { R.cm = f.cm; R.cmOff = f.off; R.cmAmt = a; }
  if (L.ct && L.ctAmt) { R.ct = L.ct; R.ctAmt = L.ctAmt / 100; }
  if (Object.values(R).some(v => v && typeof v === "number")) {
    const id = g.getImageData(0, 0, c.width, c.height); applyAdjust(id.data, R); g.putImageData(id, 0, 0);
  }
  if (L.outline) {
    const pad = Math.round(Math.max(c.width, c.height) * 0.03) + 2;
    const o = document.createElement("canvas"); o.width = c.width + pad * 2; o.height = c.height + pad * 2;
    const sil = document.createElement("canvas"); sil.width = c.width; sil.height = c.height;
    const sg = sil.getContext("2d"); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#fff"; sg.fillRect(0, 0, c.width, c.height);
    const og = o.getContext("2d");
    for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; og.drawImage(sil, pad + Math.cos(t) * pad * 0.8, pad + Math.sin(t) * pad * 0.8); }
    og.drawImage(c, pad, pad);
    o.base = c.width; c = o;
  } else c.base = c.width;
  cache.set(L.id, { key, c });
  return c;
}

// kích thước lớp khi vẽ lên canvas Wc×Hc (tính cả phần viền)
export function layerBox(L, img, Wc) {
  const w = L.w * Wc * (img.width / img.base), h = w * img.height / img.width;
  return { w, h };
}
export function drawLayer(ctx, L, Wc, Hc, FILTERS) {
  const img = layerImage(L, FILTERS), { w, h } = layerBox(L, img, Wc);
  ctx.save();
  ctx.translate(L.x * Wc, L.y * Hc); ctx.rotate(L.rot * Math.PI / 180); ctx.scale(L.flip ? -1 : 1, 1);
  ctx.globalAlpha = L.opacity / 100;
  if (L.shadow) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = w * 0.05; ctx.shadowOffsetY = w * 0.025; }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// điểm (px trên canvas Wc×Hc) -> toạ độ trong lớp; trả null nếu ngoài
export function localPoint(L, px, py, Wc, Hc, FILTERS) {
  const img = layerImage(L, FILTERS), { w, h } = layerBox(L, img, Wc);
  const dx = px - L.x * Wc, dy = py - L.y * Hc, t = -L.rot * Math.PI / 180;
  let x = dx * Math.cos(t) - dy * Math.sin(t), y = dx * Math.sin(t) + dy * Math.cos(t);
  if (L.flip) x = -x;
  return { x, y, w, h, inside: Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2 };
}

// ---------------- màn hình cắt ----------------
const cut = { mode: "tap" };
let cutRaf = false;

export function openCutout(src, onDone, toast, opts = {}) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const s = Math.min(1, 1280 / Math.max(sw, sh));
  const img = document.createElement("canvas"); img.width = Math.round(sw * s); img.height = Math.round(sh * s);
  img.getContext("2d").drawImage(src, 0, 0, img.width, img.height);
  const mask = document.createElement("canvas"); mask.width = img.width; mask.height = img.height;
  Object.assign(cut, { img, mask, onDone, toast, hist: [], tmp: document.createElement("canvas") });
  cut.tmp.width = img.width; cut.tmp.height = img.height;
  const cv = $("#cutCv"); cv.width = img.width; cv.height = img.height;
  $("#cutout").hidden = false;
  cut.autoFresh = false;
  setMode(opts.mode || "tap");
  hint(opts.hint || "");
  layoutCut(); drawCut();
  if (opts.auto !== false) autoPerson(true);
}
function closeCut() { $("#cutout").hidden = true; cut.img = null; }
function hint(t) { const h = $("#cutHint"); h.textContent = t; h.hidden = !t; }
function busy(t) { const b = $("#cutBusy"); b.hidden = !t; if (t) b.querySelector("span").textContent = t; }
function setMode(m) { cut.mode = m; document.querySelectorAll("#cutMode button").forEach(b => b.classList.toggle("on", b.dataset.m === m)); }
function pushHist() {
  const g = cut.mask.getContext("2d");
  cut.hist.push(g.getImageData(0, 0, cut.mask.width, cut.mask.height));
  if (cut.hist.length > 12) cut.hist.shift();
  $("#cutUndo").disabled = false;
}
function coverage() {
  const d = cut.mask.getContext("2d").getImageData(0, 0, cut.mask.width, cut.mask.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 128) n++;
  return n / (d.length / 16);
}

function layoutCut() {
  const st = $("#cutStage").getBoundingClientRect(), cv = $("#cutCv");
  const a = cv.width / cv.height, pad = 12;
  let w = st.width - pad * 2, h = w / a;
  if (h > st.height - pad * 2) { h = st.height - pad * 2; w = h * a; }
  Object.assign(cv.style, { width: w + "px", height: h + "px", left: (st.width - w) / 2 + "px", top: (st.height - h) / 2 + "px" });
  const ov = $("#cutOv"), dpr = devicePixelRatio || 1;
  ov.width = Math.round(st.width * dpr); ov.height = Math.round(st.height * dpr);
}
function drawCut() {
  if (cutRaf || !cut.img) return;
  cutRaf = true;
  requestAnimationFrame(() => {
    cutRaf = false;
    if (!cut.img) return;
    const cv = $("#cutCv"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const sq = Math.max(8, Math.round(W / 28));
    for (let y = 0; y < H; y += sq) for (let x = 0; x < W; x += sq) { g.fillStyle = ((x / sq + y / sq) & 1) ? "#d9d9de" : "#f4f4f7"; g.fillRect(x, y, sq, sq); }
    g.globalAlpha = 0.25; g.drawImage(cut.img, 0, 0); g.globalAlpha = 1;
    const t = cut.tmp.getContext("2d");
    t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, W, H); t.drawImage(cut.img, 0, 0);
    t.globalCompositeOperation = "destination-in"; t.drawImage(cut.mask, 0, 0);
    g.drawImage(cut.tmp, 0, 0);
  });
}

function applyMask(m, mode) {
  const t = document.createElement("canvas"); t.width = m.w; t.height = m.h;
  const g = t.getContext("2d"), id = g.createImageData(m.w, m.h);
  for (let i = 0; i < m.w * m.h; i++) {
    const a = clamp((m.data[i] - 0.3) / 0.4, 0, 1);
    id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = 255; id.data[4 * i + 3] = a * 255;
  }
  g.putImageData(id, 0, 0);
  const mg = cut.mask.getContext("2d");
  if (mode === "replace") mg.clearRect(0, 0, cut.mask.width, cut.mask.height);
  mg.globalCompositeOperation = "source-over"; mg.imageSmoothingQuality = "high";
  mg.drawImage(t, 0, 0, cut.mask.width, cut.mask.height);
  drawCut();
}

async function autoPerson(initial) {
  busy("Đang tìm người trong ảnh…");
  try {
    const m = await Face.segmentPerson(cut.img);
    let n = 0; for (let i = 0; i < m.data.length; i += 4) if (m.data[i] > 0.5) n++;
    if (n / (m.data.length / 4) < 0.02) hint("Không thấy người — chạm vào vật muốn cắt");
    else { pushHist(); applyMask(m, "replace"); cut.autoFresh = true; hint(initial ? "Đã tự cắt người · hoặc chọn Khoanh để vẽ vùng muốn lấy" : ""); }
  } catch (e) { console.warn(e); hint("Không tải được bộ cắt tự động (kiểm tra mạng) — hãy dùng Tô thêm"); }
  busy("");
}
async function tapSelect(u, v) {
  busy("Đang cắt vật…");
  try {
    const m = await Face.segmentAt(cut.img, u, v);
    pushHist(); applyMask(m, "add"); hint("");
  } catch (e) { console.warn(e); cut.toast("Không cắt được chỗ này, thử chạm chỗ khác hoặc dùng Tô thêm"); }
  busy("");
}

function stamp(a, b, r) {
  const g = cut.mask.getContext("2d");
  const dist = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(dist / (r * 0.25)));
  g.globalCompositeOperation = cut.mode === "add" ? "source-over" : "destination-out";
  for (let i = dist ? 1 : 0; i <= steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalCompositeOperation = "source-over";
  drawCut();
}

function fillLasso(pts) {
  if (pts.length < 3) return;
  pushHist();
  const g = cut.mask.getContext("2d");
  if (cut.autoFresh) g.clearRect(0, 0, cut.mask.width, cut.mask.height); // vùng khoanh đầu tiên thay cho kết quả tự động
  cut.autoFresh = false;
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#fff";
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill();
  drawCut(); hint("");
}

function finish() {
  const W = cut.mask.width, H = cut.mask.height;
  const f = +$("#cutFeather").value;
  let m = cut.mask;
  if (f > 0) {
    const sc = 1 + f * 0.6;
    const sm = document.createElement("canvas"); sm.width = Math.max(4, Math.round(W / sc)); sm.height = Math.max(4, Math.round(H / sc));
    const sg = sm.getContext("2d"); sg.imageSmoothingQuality = "high"; sg.drawImage(m, 0, 0, sm.width, sm.height);
    const fm = document.createElement("canvas"); fm.width = W; fm.height = H;
    const fg = fm.getContext("2d"); fg.imageSmoothingQuality = "high"; fg.drawImage(sm, 0, 0, W, H);
    m = fm;
  }
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const og = out.getContext("2d"); og.drawImage(cut.img, 0, 0); og.globalCompositeOperation = "destination-in"; og.drawImage(m, 0, 0);
  const d = og.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { cut.toast("Chưa chọn vùng nào — chạm vào người/vật hoặc dùng Tô thêm"); return; }
  const tw = x1 - x0 + 1, th = y1 - y0 + 1;
  const t = document.createElement("canvas"); t.width = tw; t.height = th;
  t.getContext("2d").drawImage(out, x0, y0, tw, th, 0, 0, tw, th);
  const done = cut.onDone;
  closeCut();
  done(t);
}

// sự kiện màn hình cắt
(function wire() {
  const stage = $("#cutStage"), cv = $("#cutCv"), ov = $("#cutOv"), og = ov.getContext("2d");
  let act = null;
  const toImg = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height, u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height, k: cv.width / r.width }; };
  const brushR = () => +$("#cutSize").value;
  const cursor = e => {
    const dpr = devicePixelRatio || 1, sr = stage.getBoundingClientRect();
    og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, ov.width, ov.height);
    if (!e || cut.mode === "tap") return;
    og.strokeStyle = cut.mode === "add" ? "#2fd47c" : "#ff4f6b"; og.lineWidth = 2;
    og.beginPath(); og.arc(e.clientX - sr.left, e.clientY - sr.top, brushR(), 0, 7); og.stroke();
  };
  stage.addEventListener("pointerdown", e => {
    if (!cut.img || !$("#cutBusy").hidden) return;
    stage.setPointerCapture(e.pointerId);
    const p = toImg(e);
    act = { p, x: e.clientX, y: e.clientY, path: [p], spath: [[e.clientX, e.clientY]] };
    if (cut.mode === "add" || cut.mode === "erase") { pushHist(); cut.autoFresh = false; stamp(p, p, brushR() * p.k); cursor(e); }
  });
  stage.addEventListener("pointermove", e => {
    if (!act) { if (e.pointerType === "mouse") cursor(e); return; }
    if (cut.mode === "tap") return;
    const p = toImg(e);
    if (cut.mode === "lasso") {
      act.path.push(p); act.spath.push([e.clientX, e.clientY]);
      const dpr = devicePixelRatio || 1, sr = stage.getBoundingClientRect();
      og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, ov.width, ov.height);
      og.beginPath(); act.spath.forEach(([x, y], i) => i ? og.lineTo(x - sr.left, y - sr.top) : og.moveTo(x - sr.left, y - sr.top));
      og.fillStyle = "rgba(255,79,139,.18)"; og.fill();
      og.lineWidth = 3; og.strokeStyle = "#fff"; og.setLineDash([]); og.stroke();
      og.lineWidth = 3; og.strokeStyle = "#ff4f8b"; og.setLineDash([8, 6]); og.stroke(); og.setLineDash([]);
      return;
    }
    stamp(act.p, p, brushR() * p.k); act.p = p; cursor(e);
  });
  const up = e => {
    if (!act) return;
    if (cut.mode === "lasso") { fillLasso(act.path); act = null; cursor(null); return; }
    if (cut.mode === "tap" && Math.hypot(e.clientX - act.x, e.clientY - act.y) < 12) {
      const p = toImg(e);
      if (p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1) {
        const sr = stage.getBoundingClientRect(), dpr = devicePixelRatio || 1;
        og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, ov.width, ov.height);
        og.fillStyle = "rgba(255,79,139,.9)"; og.beginPath(); og.arc(e.clientX - sr.left, e.clientY - sr.top, 7, 0, 7); og.fill();
        og.strokeStyle = "#fff"; og.lineWidth = 2; og.stroke();
        tapSelect(p.u, p.v).then(() => cursor(null));
      }
    }
    act = null;
    if (e.pointerType !== "mouse") cursor(null);
  };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  $("#cutMode").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    setMode(b.dataset.m); cursor(null);
    hint({ lasso: "Vẽ vòng quanh vùng muốn lấy — vẽ thêm vòng nữa để lấy thêm", tap: "Chạm vào người / vật muốn cắt", add: "Tô lên phần muốn giữ thêm", erase: "Tô lên phần muốn bỏ đi" }[b.dataset.m]);
  });
  $("#cutUndo").onclick = () => {
    const s = cut.hist.pop(); if (!s) return;
    cut.mask.getContext("2d").putImageData(s, 0, 0); drawCut();
    $("#cutUndo").disabled = !cut.hist.length;
  };
  document.querySelector(".cut-actions").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || !cut.img) return;
    const a = b.dataset.a, g = cut.mask.getContext("2d");
    if (a === "person") autoPerson(false);
    if (a === "all") { pushHist(); cut.autoFresh = false; g.globalCompositeOperation = "source-over"; g.fillStyle = "#fff"; g.fillRect(0, 0, cut.mask.width, cut.mask.height); drawCut(); }
    if (a === "clear") { pushHist(); g.clearRect(0, 0, cut.mask.width, cut.mask.height); cut.autoFresh = false; drawCut(); hint(cut.mode === "lasso" ? "Vẽ vòng quanh vùng muốn lấy" : "Chạm vào người/vật muốn cắt"); }
  });
  for (const id of ["#cutSize", "#cutFeather"]) {
    const el = $(id), fill = () => el.style.setProperty("--b", (el.value - el.min) / (el.max - el.min) * 100 + "%");
    el.addEventListener("input", fill); fill();
  }
  $("#cutCancel").onclick = closeCut;
  $("#cutDone").onclick = finish;
  addEventListener("resize", () => { if (cut.img) { layoutCut(); drawCut(); } });
})();

export const _cutState = cut;
export { coverage as _coverage };
