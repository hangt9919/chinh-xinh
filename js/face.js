// Chỉnh Xinh — nhận diện khuôn mặt & tóc (MediaPipe, chạy ngay trên máy, không gửi ảnh đi đâu)
const VER = "0.10.14";
const BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAIR_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite";

let vision, fileset, landmarker, hairSeg;
async function loadVision() {
  if (!vision) {
    vision = await import(`${BASE}/vision_bundle.mjs`);
    fileset = await vision.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
  }
}

function scaled(src, maxSide) {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  if (s === 1) return src;
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function detectFaces(src) {
  await loadVision();
  if (!landmarker) {
    landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
      runningMode: "IMAGE", numFaces: 5,
    });
  }
  const r = landmarker.detect(scaled(src, 1280));
  return r.faceLandmarks || [];
}

// trả về Uint8Array RGBA (R = tóc) cùng kích thước
export async function segmentHair(src) {
  await loadVision();
  if (!hairSeg) {
    hairSeg = await vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAIR_MODEL, delegate: "CPU" },
      runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true,
    });
  }
  const img = scaled(src, 640);
  const r = hairSeg.segment(img);
  try {
    const masks = r.confidenceMasks;
    const m = masks[masks.length - 1];
    const w = m.width, h = m.height, f = m.getAsFloat32Array();
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const v = Math.max(0, Math.min(1, (f[i] - 0.15) / 0.7));
      out[4 * i] = v * 255; out[4 * i + 3] = 255;
    }
    return { data: out, w, h };
  } finally { r.close && r.close(); }
}

// ---------- chỉ số điểm mốc (MediaPipe Face Mesh 478 điểm) ----------
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LIPS_OUT = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_IN = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
const EYE_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const EYE_R = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const BROW_L = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const BROW_R = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
const NOSTRILS = [[79, 166, 75, 60, 20, 238, 239, 241, 125, 44], [309, 392, 305, 290, 250, 458, 459, 461, 354, 274]];

export function faceGeometry(lms, W, H) {
  return lms.map(lm => {
    const p = i => [lm[i].x * W, lm[i].y * H];
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const top = p(10), chin = p(152);
    const faceW = dist(p(234), p(454)), faceH = dist(top, chin);
    return { p, faceW, faceH, top, chin };
  });
}

// ---------- mặt nạ đặc trưng (RGBA: trong miệng, môi, bảo vệ, vùng mặt) ----------
export function buildFeatMask(faces, W, H) {
  const s = Math.min(1, 1024 / Math.max(W, H));
  const w = Math.round(W * s), h = Math.round(H * s);
  const layer = (draw, feather) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineJoin = "round"; g.lineCap = "round";
    g.save(); g.scale(s, s); draw(g); g.restore();
    if (feather > 1) {
      const sw = Math.max(4, Math.round(w / feather)), sh = Math.max(4, Math.round(h / feather));
      const t = document.createElement("canvas"); t.width = sw; t.height = sh;
      const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high"; tg.drawImage(c, 0, 0, sw, sh);
      g.imageSmoothingQuality = "high"; g.clearRect(0, 0, w, h); g.drawImage(t, 0, 0, w, h);
    }
    return g.getImageData(0, 0, w, h).data;
  };
  const poly = (g, f, idx) => { g.beginPath(); idx.forEach((i, k) => { const q = f.p(i); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); };
  const feather = Math.max(w, h) / 3; // độ mềm ~ 3px ở mặt nạ
  const fs = r => Math.max(1.5, Math.min(12, r));

  const mouth = layer(g => faces.forEach(f => { poly(g, f, LIPS_IN); g.fill(); g.lineWidth = f.faceW * 0.012; g.stroke(); }), fs(feather / 300));
  const lips = layer(g => faces.forEach(f => {
    g.beginPath();
    LIPS_OUT.forEach((i, k) => { const q = f.p(i); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath();
    LIPS_IN.slice().reverse().forEach((i, k) => { const q = f.p(i); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath();
    g.fill("evenodd");
  }), fs(feather / 220));
  const protect = layer(g => faces.forEach(f => {
    g.lineWidth = f.faceW * 0.035;
    [EYE_L, EYE_R].forEach(e => { poly(g, f, e); g.fill(); g.stroke(); });
    g.lineWidth = f.faceW * 0.03;
    [BROW_L, BROW_R].forEach(e => { poly(g, f, e); g.fill(); g.stroke(); });
    g.lineWidth = f.faceW * 0.01;
    poly(g, f, LIPS_OUT); g.fill(); g.stroke();
    NOSTRILS.forEach(n => { poly(g, f, n); g.fill(); });
  }), fs(feather / 200));
  const region = layer(g => faces.forEach(f => {
    poly(g, f, OVAL); g.fill();
    // kéo thêm phần trán phía trên điểm 10
    g.beginPath();
    const a = f.p(109), b = f.p(338), t = f.top, up = f.faceH * 0.12;
    g.moveTo(f.p(67)[0], f.p(67)[1]); g.lineTo(a[0], a[1] - up * 0.5); g.lineTo(t[0], t[1] - up); g.lineTo(b[0], b[1] - up * 0.5); g.lineTo(f.p(297)[0], f.p(297)[1]); g.closePath(); g.fill();
  }), fs(feather / 60));

  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[4 * i] = mouth[4 * i]; out[4 * i + 1] = lips[4 * i]; out[4 * i + 2] = protect[4 * i]; out[4 * i + 3] = region[4 * i];
  }
  return { data: out, w, h };
}

// ---------- trường biến dạng tự động ----------
export function buildFields(faces, base, N) {
  const mk = () => ({ D: new Float32Array(2 * N), Wt: new Float32Array(N) });
  const acc = { slim: mk(), small: mk(), chin: mk(), nose: mk(), forehead: mk() };
  const eye = new Float32Array(2 * N);

  // cộng dồn một điểm điều khiển có bán kính R, dịch chuyển (dx,dy)
  const addPt = (A, cx, cy, dx, dy, R) => {
    const R2 = R * R;
    for (let i = 0; i < N; i++) {
      const x = base[2 * i] - cx, y = base[2 * i + 1] - cy, d2 = x * x + y * y;
      if (d2 >= R2) continue;
      const t = 1 - d2 / R2, w = t * t;
      A.D[2 * i] += dx * w; A.D[2 * i + 1] += dy * w; A.Wt[i] += w;
    }
  };
  const toMid = (f, q) => {
    const a = f.top, b = f.chin, ux = b[0] - a[0], uy = b[1] - a[1], L = Math.hypot(ux, uy) || 1;
    const nx = ux / L, ny = uy / L;
    const t = (q[0] - a[0]) * nx + (q[1] - a[1]) * ny;
    return [a[0] + nx * t - q[0], a[1] + ny * t - q[1], nx, ny];
  };

  for (const f of faces) {
    // mặt thon: các điểm hàm hướng vào đường giữa
    const jaw = [[234, .02], [93, .05], [132, .09], [58, .12], [172, .13], [136, .12], [150, .10], [149, .08], [176, .05],
                 [454, .02], [323, .05], [361, .09], [288, .12], [397, .13], [365, .12], [379, .10], [378, .08], [400, .05]];
    for (const [i, k] of jaw) { const q = f.p(i), m = toMid(f, q); addPt(acc.slim, q[0], q[1], m[0] * k * 1.25, m[1] * k * 1.25, f.faceW * 0.2); }

    // mặt nhỏ: cả viền mặt co về tâm
    const cx = (f.top[0] + f.chin[0]) / 2, cy = (f.top[1] + f.chin[1]) / 2 + f.faceH * 0.05;
    for (const i of OVAL) { const q = f.p(i); addPt(acc.small, q[0], q[1], (cx - q[0]) * 0.07, (cy - q[1]) * 0.07, f.faceW * 0.26); }

    // cằm: kéo dài / thu ngắn theo trục mặt
    const m0 = toMid(f, f.chin), nx = m0[2], ny = m0[3];
    [[152, 1], [148, .7], [377, .7], [176, .45], [400, .45]].forEach(([i, k]) => {
      const q = f.p(i); addPt(acc.chin, q[0], q[1], nx * f.faceH * 0.07 * k, ny * f.faceH * 0.07 * k, f.faceW * 0.17);
    });

    // mũi nhỏ: hai cánh mũi vào giữa
    const noseW = Math.hypot(f.p(129)[0] - f.p(358)[0], f.p(129)[1] - f.p(358)[1]);
    [[129, .28], [358, .28], [98, .22], [327, .22], [48, .18], [278, .18]].forEach(([i, k]) => {
      const q = f.p(i), m = toMid(f, q); addPt(acc.nose, q[0], q[1], m[0] * k, m[1] * k, noseW * 0.45);
    });

    // chân tóc: hạ / nâng vùng trán
    [[10, 1], [109, .8], [338, .8], [67, .55], [297, .55]].forEach(([i, k]) => {
      const q = f.p(i); addPt(acc.forehead, q[0], q[1], nx * f.faceH * 0.06 * k, ny * f.faceH * 0.06 * k, f.faceW * 0.32);
    });

    // mắt to: phóng to quanh tâm mắt
    for (const E of [EYE_L, EYE_R]) {
      let ex = 0, ey = 0; E.forEach(i => { const q = f.p(i); ex += q[0]; ey += q[1]; }); ex /= E.length; ey /= E.length;
      const ew = Math.hypot(f.p(E[0])[0] - f.p(E[8])[0], f.p(E[0])[1] - f.p(E[8])[1]);
      const R = ew * 1.15, R2 = R * R;
      for (let i = 0; i < N; i++) {
        const x = base[2 * i] - ex, y = base[2 * i + 1] - ey, d2 = x * x + y * y;
        if (d2 >= R2) continue;
        const t = 1 - d2 / R2, w = t * t * 0.32;
        eye[2 * i] += x * w; eye[2 * i + 1] += y * w;
      }
    }
  }
  const fin = A => { const F = new Float32Array(2 * N); for (let i = 0; i < N; i++) { const d = Math.max(1, A.Wt[i]); F[2 * i] = A.D[2 * i] / d; F[2 * i + 1] = A.D[2 * i + 1] / d; } return F; };
  return { slim: fin(acc.slim), small: fin(acc.small), chin: fin(acc.chin), nose: fin(acc.nose), forehead: fin(acc.forehead), eye };
}
