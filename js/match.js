// Chỉnh Xinh — khớp màu: tính phép biến đổi để màu ảnh nguồn giống màu ảnh đích (YCbCr, kiểu Reinhard)
function toYcc(r, g, b) { const Y = 0.299 * r + 0.587 * g + 0.114 * b; return [Y, (b - Y) * 0.564 + 0.5, (r - Y) * 0.713 + 0.5]; }

// thống kê trung bình / độ lệch (0..1) của ảnh, bỏ qua điểm trong suốt
export function stats(src, rect, maxSide = 160) {
  const [sx, sy, sw, sh] = rect || [0, 0, src.width, src.height];
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const s = [0, 0, 0], q = [0, 0, 0]; let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const y = toYcc(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    for (let j = 0; j < 3; j++) { s[j] += y[j]; q[j] += y[j] * y[j]; }
    n++;
  }
  if (n < 10) return null;
  const mean = s.map(v => v / n), std = q.map((v, j) => Math.sqrt(Math.max(1e-6, v / n - mean[j] * mean[j])));
  return { mean, std };
}

// phép biến đổi y' = y*g + o để thống kê nguồn -> đích (có giới hạn để không quá gắt)
export function transfer(src, dst) {
  if (!src || !dst) return null;
  const lim = [[0.75, 1.35], [0.6, 1.5], [0.6, 1.5]];
  const g = [0, 1, 2].map(j => Math.min(lim[j][1], Math.max(lim[j][0], dst.std[j] / Math.max(0.01, src.std[j]))));
  const o = [0, 1, 2].map(j => dst.mean[j] - src.mean[j] * g[j]);
  return { g: g.map(v => +v.toFixed(4)), o: o.map(v => +v.toFixed(4)) };
}
