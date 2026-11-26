// Chỉnh Xinh — nhãn dán vẽ tay (SVG tự vẽ, nét viền nâu đậm kiểu cute) + emoji
const O = 'stroke="#3b2a2f" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#ff9db5" opacity=".85"/>`;
const face = (cx, cy, s = 1) => `<circle cx="${cx - 7 * s}" cy="${cy}" r="${2.6 * s}" fill="#3b2a2f"/><circle cx="${cx + 7 * s}" cy="${cy}" r="${2.6 * s}" fill="#3b2a2f"/><path d="M${cx - 3 * s} ${cy + 4 * s} q${3 * s} ${3.5 * s} ${6 * s} 0" fill="none" ${O.replace('4"', (2.6 * s) + '"')}/>${blush(cx - 12 * s, cy + 4 * s)}${blush(cx + 12 * s, cy + 4 * s)}`;

export const STICKERS = [
  { id: "heart", name: "Tim", svg: svg(`<path d="M50 86 C20 66 8 48 13 32 C18 16 38 13 50 30 C61 12 83 15 88 32 C93 50 79 67 50 86Z" fill="#ff7aa2" ${O}/><path d="M26 30 q4 -7 12 -6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>${face(50, 50, .8)}`) },
  { id: "star", name: "Sao", svg: svg(`<path d="M50 9 L61 36 L90 38 L67 56 L75 85 L50 69 L25 85 L33 56 L10 38 L39 36Z" fill="#ffd45c" ${O}/>${face(50, 52, .75)}`) },
  { id: "sparkle", name: "Lấp lánh", svg: svg(`<path d="M42 10 Q46 40 72 44 Q46 48 42 80 Q38 48 12 44 Q38 40 42 10Z" fill="#fff3a6" ${O}/><path d="M78 58 Q80 70 90 72 Q80 74 78 86 Q76 74 66 72 Q76 70 78 58Z" fill="#ffd1e3" ${O}/><path d="M76 12 Q77 20 84 21 Q77 22 76 30 Q75 22 68 21 Q75 20 76 12Z" fill="#c9f0ff" ${O}/>`) },
  { id: "crown", name: "Vương miện", svg: svg(`<path d="M14 70 L10 30 L32 48 L50 20 L68 48 L90 30 L86 70Z" fill="#ffd45c" ${O}/><path d="M14 70 H86 V82 H14Z" fill="#ffbf3f" ${O}/><circle cx="50" cy="20" r="5" fill="#ff7aa2" ${O}/><circle cx="10" cy="30" r="4" fill="#8fd3ff" ${O}/><circle cx="90" cy="30" r="4" fill="#8fd3ff" ${O}/><circle cx="50" cy="60" r="5" fill="#ff7aa2" ${O}/>`) },
  { id: "bow", name: "Nơ", svg: svg(`<path d="M50 50 C36 30 12 26 12 44 C12 62 36 64 50 50Z" fill="#ff8fb3" ${O}/><path d="M50 50 C64 30 88 26 88 44 C88 62 64 64 50 50Z" fill="#ff8fb3" ${O}/><path d="M44 54 L34 84 L44 78 L50 86 L52 56Z" fill="#ff6f9c" ${O}/><path d="M56 54 L66 84 L56 78 L50 86 L48 56Z" fill="#ff6f9c" ${O}/><ellipse cx="50" cy="50" rx="8" ry="9" fill="#ff5d8f" ${O}/>`) },
  { id: "cloud", name: "Mây", svg: svg(`<path d="M24 74 C10 74 8 54 22 52 C20 36 40 30 48 42 C54 26 80 30 78 48 C94 48 94 74 78 74Z" fill="#fff" ${O}/>${face(51, 58, .8)}`) },
  { id: "cat", name: "Mèo", svg: svg(`<path d="M18 40 L20 12 L40 28 Q50 25 60 28 L80 12 L82 40 Q90 76 50 82 Q10 76 18 40Z" fill="#ffe2c4" ${O}/><path d="M24 22 L28 34 L36 28Z" fill="#ffb3c6"/><path d="M76 22 L72 34 L64 28Z" fill="#ffb3c6"/><circle cx="37" cy="52" r="4" fill="#3b2a2f"/><circle cx="63" cy="52" r="4" fill="#3b2a2f"/><path d="M46 60 L50 64 L54 60" fill="#ff8fb3" ${O.replace('4"', '3"')}/><path d="M50 64 q-5 6 -10 3 M50 64 q5 6 10 3" fill="none" ${O.replace('4"', '3"')}/><path d="M6 56 H22 M8 64 L22 61 M94 56 H78 M92 64 L78 61" ${O.replace('4"', '2.5"')}/>${blush(28, 62)}${blush(72, 62)}`) },
  { id: "catears", name: "Tai mèo", svg: svg(`<path d="M8 80 Q50 58 92 80" fill="none" ${O.replace('4"', '6"')}/><path d="M16 74 L22 30 L44 66Z" fill="#3b2a2f" ${O}/><path d="M23 44 L26 62 L36 63Z" fill="#ff9db5"/><path d="M84 74 L78 30 L56 66Z" fill="#3b2a2f" ${O}/><path d="M77 44 L74 62 L64 63Z" fill="#ff9db5"/>`) },
  { id: "bunny", name: "Tai thỏ", svg: svg(`<path d="M8 86 Q50 66 92 86" fill="none" ${O.replace('4"', '6"')}/><path d="M28 78 C14 50 16 10 30 10 C44 10 44 50 40 76Z" fill="#fff" ${O}/><path d="M29 66 C22 46 24 20 30 20 C36 20 36 46 34 66Z" fill="#ffb3c6"/><path d="M72 78 C86 50 84 10 70 10 C56 10 56 50 60 76Z" fill="#fff" ${O}/><path d="M71 66 C78 46 76 20 70 20 C64 20 64 46 66 66Z" fill="#ffb3c6"/>`) },
  { id: "cheeks", name: "Má hồng", svg: svg(`<ellipse cx="24" cy="50" rx="18" ry="11" fill="#ff8fb3" opacity=".75"/><ellipse cx="76" cy="50" rx="18" ry="11" fill="#ff8fb3" opacity=".75"/><path d="M14 47 l6 6 M22 45 l6 6 M30 47 l6 6 M64 47 l6 6 M72 45 l6 6 M80 47 l6 6" stroke="#ff5d8f" stroke-width="2.5" stroke-linecap="round"/>`) },
  { id: "flower", name: "Hoa", svg: svg(`${[0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="26" rx="14" ry="18" fill="#ffc2d6" ${O} transform="rotate(${a} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="15" fill="#ffd45c" ${O}/>${face(50, 49, .55)}`) },
  { id: "sun", name: "Mặt trời", svg: svg(`${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M50 4 L56 18 L44 18Z" fill="#ffbf3f" ${O.replace('4"', '3"')} transform="rotate(${a} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="27" fill="#ffd45c" ${O}/>${face(50, 50, .9)}`) },
  { id: "rainbow", name: "Cầu vồng", svg: svg(`<path d="M8 74 A42 42 0 0 1 92 74" fill="none" stroke="#3b2a2f" stroke-width="30"/><path d="M8 74 A42 42 0 0 1 92 74" fill="none" stroke="#ff8fa3" stroke-width="22"/><path d="M18 74 A32 32 0 0 1 82 74" fill="none" stroke="#ffd45c" stroke-width="10"/><path d="M27 74 A23 23 0 0 1 73 74" fill="none" stroke="#9be3b5" stroke-width="9"/><path d="M8 82 C0 82 0 70 9 70 C10 62 22 62 24 70 C32 70 32 82 24 82Z M76 82 C68 82 68 70 77 70 C78 62 90 62 92 70 C100 70 100 82 92 82Z" fill="#fff" ${O.replace('4"', '3"')}/>`) },
  { id: "butterfly", name: "Bướm", svg: svg(`<path d="M50 50 C38 20 8 18 12 40 C14 54 34 56 50 50Z" fill="#c9b6ff" ${O}/><path d="M50 50 C62 20 92 18 88 40 C86 54 66 56 50 50Z" fill="#c9b6ff" ${O}/><path d="M50 52 C36 58 20 72 30 82 C40 90 48 70 50 52Z" fill="#ffc2d6" ${O}/><path d="M50 52 C64 58 80 72 70 82 C60 90 52 70 50 52Z" fill="#ffc2d6" ${O}/><path d="M50 34 V76" ${O.replace('4"', '6"')}/><path d="M50 34 Q44 22 40 18 M50 34 Q56 22 60 18" fill="none" ${O.replace('4"', '3"')}/>`) },
  { id: "strawberry", name: "Dâu", svg: svg(`<path d="M50 90 C22 74 16 44 26 34 C36 26 64 26 74 34 C84 44 78 74 50 90Z" fill="#ff6b7d" ${O}/><path d="M30 32 L38 20 L44 30 L50 16 L56 30 L62 20 L70 32 Q50 40 30 32Z" fill="#7fd18b" ${O.replace('4"', '3"')}/>${[[38, 48], [56, 46], [46, 60], [64, 60], [36, 64], [52, 74]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#ffe7a0"/>`).join("")}`) },
  { id: "bubbleLove", name: "Love", svg: svg(`<path d="M12 22 Q12 12 22 12 H78 Q88 12 88 22 V58 Q88 68 78 68 H40 L24 84 L28 68 H22 Q12 68 12 58Z" fill="#fff" ${O}/><text x="50" y="49" font-family="Comic Sans MS, Chalkboard SE, Marker Felt, cursive" font-size="22" font-weight="700" fill="#ff5d8f" text-anchor="middle">love</text><path d="M74 30 c-3 -4 -8 -1 -5 3 l5 5 l5 -5 c3 -4 -2 -7 -5 -3z" fill="#ff7aa2"/>`) },
  { id: "bubbleXinh", name: "Xinh quá", svg: svg(`<ellipse cx="50" cy="42" rx="42" ry="30" fill="#fff4b8" ${O}/><path d="M30 66 L22 86 L42 70Z" fill="#fff4b8" ${O.replace('4"', '3"')}/><text x="50" y="50" font-family="Comic Sans MS, Chalkboard SE, Marker Felt, cursive" font-size="17" font-weight="700" fill="#3b2a2f" text-anchor="middle">xinh quá!</text>`) },
  { id: "stars3", name: "Sao nhỏ", svg: svg(`<path d="M30 14 L35 27 L49 28 L38 37 L42 51 L30 43 L18 51 L22 37 L11 28 L25 27Z" fill="#ffd45c" ${O.replace('4"', '3"')}/><path d="M72 40 L76 50 L87 51 L78 58 L81 69 L72 63 L63 69 L66 58 L57 51 L68 50Z" fill="#ffb3c6" ${O.replace('4"', '3"')}/><path d="M34 66 L37 74 L45 74 L39 79 L41 87 L34 82 L27 87 L29 79 L23 74 L31 74Z" fill="#9fdcff" ${O.replace('4"', '3"')}/>`) },
];
export const EMOJIS = ["💖", "✨", "🌸", "🎀", "⭐", "🐰", "🐱", "🍓", "🌈", "🦋", "💫", "🥰", "😻", "👑", "🔥", "💯", "🧸", "🍒", "☁️", "🌷"];

export function stickerURL(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.svg); }

// vẽ nhãn dán ra canvas 512px
export function renderSticker(item) {
  return new Promise((res, rej) => {
    const N = 512;
    const c = document.createElement("canvas"); c.width = c.height = N;
    const g = c.getContext("2d");
    if (item.emoji) {
      g.font = `${N * 0.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(item.emoji, N / 2, N / 2 + N * 0.04);
      return res(c);
    }
    const img = new Image();
    img.onload = () => { g.drawImage(img, 0, 0, N, N); res(c); };
    img.onerror = rej;
    img.src = stickerURL(item);
  });
}

// ---------------- cọ vẽ tay ----------------
export const PEN_COLORS = ["#ff5d8f", "#ff9db5", "#ffd45c", "#ff8a3d", "#7fd18b", "#5ec8ff", "#9b7bff", "#ffffff", "#3b2a2f", "#000000", "#e8333f", "#2fd4c2"];
export const PEN_STYLES = [
  { id: "pen", name: "Bút" }, { id: "neon", name: "Neon" }, { id: "outline", name: "Viền" },
  { id: "hearts", name: "Tim" }, { id: "stars", name: "Sao" }, { id: "dots", name: "Chấm" },
];

function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  g.closePath();
}
function starPath(g, x, y, s, rot) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? s * 0.45 : s, t = rot + k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
  g.closePath();
}
function smooth(g, pts) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) { g.lineTo(pts[0][0] + 0.01, pts[0][1]); return; }
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const l = pts[pts.length - 1]; g.lineTo(l[0], l[1]);
}

// vẽ một nét (toạ độ chuẩn hoá) lên ctx kích thước W×H
export function drawStroke(g, s, W, H) {
  const pts = s.pts.map(p => [p[0] * W, p[1] * H]);
  const w = s.size * W;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (s.style === "erase") {
    g.globalCompositeOperation = "destination-out"; g.strokeStyle = "#000"; g.lineWidth = w * 1.6; smooth(g, pts); g.stroke();
  } else if (s.style === "pen") {
    g.strokeStyle = s.color; g.lineWidth = w; smooth(g, pts); g.stroke();
  } else if (s.style === "neon") {
    g.strokeStyle = s.color; g.shadowColor = s.color; g.shadowBlur = w * 2.2; g.lineWidth = w * 1.1; smooth(g, pts); g.stroke(); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = w * 0.4; smooth(g, pts); g.stroke();
  } else if (s.style === "outline") {
    g.strokeStyle = "#fff"; g.lineWidth = w * 1.9; smooth(g, pts); g.stroke();
    g.strokeStyle = s.color; g.lineWidth = w; smooth(g, pts); g.stroke();
  } else {
    // nét dạng con dấu: tim / sao / chấm dọc đường
    const gap = s.style === "dots" ? w * 1.6 : w * 2.4;
    let carry = 0, k = 0;
    const put = (x, y) => {
      const sz = w * (s.style === "dots" ? 0.55 : 1.05);
      g.fillStyle = s.color; g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, w * 0.18);
      if (s.style === "hearts") heartPath(g, x, y, sz);
      else if (s.style === "stars") starPath(g, x, y, sz, (k * 0.7) % 6.28);
      else { g.beginPath(); g.arc(x, y, sz, 0, 7); }
      g.fill(); if (s.style !== "dots") g.stroke();
      k++;
    };
    put(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = Math.hypot(x1 - x0, y1 - y0);
      if (!d) continue;
      let pos = gap - carry;
      while (pos <= d) { const q = pos / d; put(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); pos += gap; }
      carry = d - (pos - gap);
    }
  }
  g.restore();
}
