// Chỉnh Xinh — chấm xoá mụn / khuyết điểm (vá bằng vùng da sạch bên cạnh, khớp màu theo viền)
const BINS = 32;

export function heal(ctx, W, H, cx, cy, r) {
  r = Math.max(2, r);
  const off = r * 2.2, pad = Math.ceil(off + r * 1.4 + 2);
  const x0 = Math.max(0, Math.floor(cx - pad)), y0 = Math.max(0, Math.floor(cy - pad));
  const x1 = Math.min(W, Math.ceil(cx + pad)), y1 = Math.min(H, Math.ceil(cy + pad));
  const rw = x1 - x0, rh = y1 - y0;
  if (rw < 4 || rh < 4) return;
  const img = ctx.getImageData(x0, y0, rw, rh), d = img.data;
  const lx = cx - x0, ly = cy - y0;
  const px = (x, y) => { x = Math.max(0, Math.min(rw - 1, Math.round(x))); y = Math.max(0, Math.min(rh - 1, Math.round(y))); return (y * rw + x) * 4; };

  // trung bình màu theo góc trên vòng viền (r .. 1.3r) quanh một tâm
  const ring = (ox, oy) => {
    const s = new Float32Array(BINS * 3), n = new Float32Array(BINS);
    const steps = Math.max(48, Math.round(r * 6));
    for (let k = 0; k < steps; k++) {
      const t = k / steps * Math.PI * 2, b = Math.floor(k / steps * BINS);
      for (const f of [1.05, 1.2, 1.35]) {
        const i = px(ox + Math.cos(t) * r * f, oy + Math.sin(t) * r * f);
        s[b * 3] += d[i]; s[b * 3 + 1] += d[i + 1]; s[b * 3 + 2] += d[i + 2]; n[b]++;
      }
    }
    for (let b = 0; b < BINS; b++) for (let c = 0; c < 3; c++) s[b * 3 + c] /= Math.max(1, n[b]);
    return s;
  };
  // độ lốm đốm bên trong vùng lấy mẫu (càng mịn càng tốt)
  const roughness = (ox, oy) => {
    let sum = 0, sq = 0, n = 0;
    const st = Math.max(1, r / 6);
    for (let y = -r; y <= r; y += st) for (let x = -r; x <= r; x += st) {
      if (x * x + y * y > r * r) continue;
      const i = px(ox + x, oy + y), l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      sum += l; sq += l * l; n++;
    }
    const m = sum / n; return Math.sqrt(Math.max(0, sq / n - m * m));
  };
  const tRing = ring(lx, ly);
  const mean = s => { const m = [0, 0, 0]; for (let b = 0; b < BINS; b++) for (let c = 0; c < 3; c++) m[c] += s[b * 3 + c] / BINS; return m; };
  const tMean = mean(tRing);

  let best = null;
  for (let k = 0; k < 12; k++) {
    const t = k / 12 * Math.PI * 2, ox = lx + Math.cos(t) * off, oy = ly + Math.sin(t) * off;
    if (ox - r * 1.4 < 0 || oy - r * 1.4 < 0 || ox + r * 1.4 > rw || oy + r * 1.4 > rh) continue;
    const dr = ring(ox, oy), dm = mean(dr);
    const colorDiff = Math.abs(dm[0] - tMean[0]) + Math.abs(dm[1] - tMean[1]) + Math.abs(dm[2] - tMean[2]);
    const score = colorDiff + roughness(ox, oy) * 1.6;
    if (!best || score < best.score) best = { score, dx: ox - lx, dy: oy - ly, dr };
  }
  if (!best) return;

  // chênh lệch viền theo góc (làm mượt) để vá khớp màu
  const diff = new Float32Array(BINS * 3);
  for (let b = 0; b < BINS; b++) for (let c = 0; c < 3; c++) diff[b * 3 + c] = tRing[b * 3 + c] - best.dr[b * 3 + c];
  const sm = new Float32Array(BINS * 3);
  for (let b = 0; b < BINS; b++) for (let c = 0; c < 3; c++) {
    let v = 0; for (let k = -2; k <= 2; k++) v += diff[((b + k + BINS) % BINS) * 3 + c] * [1, 2, 3, 2, 1][k + 2];
    sm[b * 3 + c] = v / 9;
  }
  const md = [0, 0, 0]; for (let b = 0; b < BINS; b++) for (let c = 0; c < 3; c++) md[c] += sm[b * 3 + c] / BINS;

  const src = new Uint8ClampedArray(d); // bản gốc vùng
  const R1 = r * 1.3;
  for (let y = Math.max(0, Math.floor(ly - R1)); y < Math.min(rh, Math.ceil(ly + R1)); y++) {
    for (let x = Math.max(0, Math.floor(lx - R1)); x < Math.min(rw, Math.ceil(lx + R1)); x++) {
      const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy);
      if (dist >= R1) continue;
      const w = dist <= r ? 1 : 1 - (dist - r) / (R1 - r);
      const ww = w * w * (3 - 2 * w);
      let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
      const bf = a / (Math.PI * 2) * BINS, b0 = Math.floor(bf) % BINS, b1 = (b0 + 1) % BINS, fr = bf - Math.floor(bf);
      const t = Math.min(1, dist / r);
      const j = px(x + best.dx, y + best.dy), i = (y * rw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const edge = sm[b0 * 3 + c] * (1 - fr) + sm[b1 * 3 + c] * fr;
        const corr = md[c] + (edge - md[c]) * t * t;
        const v = src[j + c] + corr;
        d[i + c] = src[i + c] + (v - src[i + c]) * ww;
      }
    }
  }
  ctx.putImageData(img, x0, y0);
}
