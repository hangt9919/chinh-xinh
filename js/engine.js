// Chỉnh Xinh — bộ xử lý ảnh WebGL.
// Lượt 1 (không gian ảnh gốc): làm đẹp + chỉnh màu + bộ lọc  -> texture T
// Lượt 2 (lưới biến dạng): kéo thon / mắt to / kéo chân + xoay + cắt + viền tối + hạt

const VS_QUAD = `
attribute vec2 a_pos;
uniform vec4 u_uvRect;
varying vec2 v_uv;
void main(){
  v_uv = u_uvRect.xy + (a_pos * 0.5 + 0.5) * u_uvRect.zw;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS_COPY = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main(){ gl_FragColor = texture2D(u_tex, v_uv); }`;

const FS_BLUR = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;
void main(){
  vec4 s = texture2D(u_tex, v_uv) * 0.2270270270;
  s += texture2D(u_tex, v_uv + u_dir * 1.3846153846) * 0.3162162162;
  s += texture2D(u_tex, v_uv - u_dir * 1.3846153846) * 0.3162162162;
  s += texture2D(u_tex, v_uv + u_dir * 3.2307692308) * 0.0702702703;
  s += texture2D(u_tex, v_uv - u_dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}`;

const FS_MAIN = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_src, u_blur, u_seg, u_feat, u_pTeeth, u_pHair, u_pSkin;
uniform vec2 u_texel;
uniform float u_hasSeg, u_hasFace;
uniform float u_smooth, u_whiten, u_teeth, u_lip, u_hair;
uniform vec3 u_lipColor, u_hairColor;
uniform float u_exposure, u_bright, u_contrast, u_high, u_shadow, u_sat, u_vib, u_warm, u_tint, u_sharp, u_fade;
uniform mat3 u_cm;
uniform vec3 u_cmOff;
uniform float u_cmAmt;
uniform float u_showMask;
uniform vec3 u_ctG, u_ctO;
uniform float u_ctAmt;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
vec3 clipColor(vec3 c){
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + ((c - l) * l) / max(l - n, 1e-4);
  if (x > 1.0) c = l + ((c - l) * (1.0 - l)) / max(x - l, 1e-4);
  return c;
}
vec3 setLum(vec3 c, float l){ return clipColor(c + (l - lum(c))); }
float paintMix(float a, float p){
  return p > 0.5 ? mix(a, 1.0, (p - 0.5) * 2.0) : mix(a, 0.0, (0.5 - p) * 2.0);
}
float skinColor(vec3 c){
  float y = luma(c);
  float cb = 0.5 + (-0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b);
  float cr = 0.5 + (0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b);
  float a = smoothstep(0.26, 0.31, cb) * (1.0 - smoothstep(0.49, 0.54, cb));
  float b = smoothstep(0.505, 0.545, cr) * (1.0 - smoothstep(0.67, 0.71, cr));
  return a * b * smoothstep(0.10, 0.22, y);
}

void main(){
  vec3 c0 = texture2D(u_src, v_uv).rgb;
  vec3 c = c0;
  vec4 feat = texture2D(u_feat, v_uv);   // r: trong miệng, g: môi, b: vùng bảo vệ (mắt/mày/môi), a: vùng mặt
  vec4 seg = texture2D(u_seg, v_uv);     // r: tóc
  float sc = skinColor(c0);
  float skin = u_hasFace > 0.5 ? max(sc * 0.85, feat.a * mix(0.55, 1.0, sc)) : sc;
  skin = paintMix(skin, texture2D(u_pSkin, v_uv).r);
  skin *= (1.0 - feat.b);
  skin *= (1.0 - seg.r * u_hasSeg * 0.9);

  // Mịn da: làm mờ có giữ cạnh
  vec3 b = texture2D(u_blur, v_uv).rgb;
  vec3 d = c - b;
  float keep = smoothstep(0.06, 0.22, length(d));
  float sm = u_smooth * skin * (1.0 - keep);
  c = mix(c, b, sm * 0.92);
  c += d * 0.08 * sm;

  // Trắng/sáng da
  float wk = u_whiten * skin;
  c = mix(c, c + (1.0 - c) * 0.42, wk);
  c.r -= 0.025 * wk;
  c = mix(c, vec3(luma(c)), 0.08 * wk);

  // Trắng răng
  float l0 = luma(c0);
  float mx = max(max(c0.r, c0.g), c0.b), mn = min(min(c0.r, c0.g), c0.b);
  float sat0 = (mx - mn) / max(mx, 1e-4);
  float teethLike = smoothstep(0.16, 0.36, l0) * (1.0 - smoothstep(0.30, 0.58, sat0));
  float tm = paintMix(feat.r, texture2D(u_pTeeth, v_uv).r) * teethLike;
  vec3 w = mix(c, vec3(luma(c)), 0.78);
  w = w + (1.0 - w) * 0.28;
  w.b += 0.015;
  c = mix(c, w, clamp(u_teeth * tm, 0.0, 1.0));

  // Son môi
  float lm = feat.g;
  vec3 lipC = setLum(u_lipColor, lum(c) * 0.92);
  c = mix(c, lipC, u_lip * lm * 0.85);

  // Nhuộm tóc
  float hm = paintMix(seg.r * u_hasSeg, texture2D(u_pHair, v_uv).r);
  float hl = lum(c);
  hl = mix(hl, pow(hl, 0.62) * 0.95, 0.75);
  vec3 hairC = setLum(u_hairColor, hl);
  c = mix(c, hairC, u_hair * hm * 0.9);

  // Độ nét
  vec3 nb = (texture2D(u_src, v_uv + vec2(u_texel.x, 0.0)).rgb + texture2D(u_src, v_uv - vec2(u_texel.x, 0.0)).rgb
           + texture2D(u_src, v_uv + vec2(0.0, u_texel.y)).rgb + texture2D(u_src, v_uv - vec2(0.0, u_texel.y)).rgb) * 0.25;
  c += (c0 - nb) * u_sharp * 2.2 * (1.0 - sm);

  // Khớp màu (chuyển thống kê màu trong không gian YCbCr)
  if (u_ctAmt > 0.0) {
    float Y = luma(c);
    vec3 y = vec3(Y, (c.b - Y) * 0.564 + 0.5, (c.r - Y) * 0.713 + 0.5) * u_ctG + u_ctO;
    vec3 m = vec3(y.x + 1.403 * (y.z - 0.5), y.x - 0.344 * (y.y - 0.5) - 0.714 * (y.z - 0.5), y.x + 1.773 * (y.y - 0.5));
    c = mix(c, clamp(m, 0.0, 1.0), u_ctAmt);
  }

  // Chỉnh màu
  c *= exp2(u_exposure);
  c = pow(max(c, 0.0), vec3(exp2(-u_bright * 0.9)));
  c = (c - 0.5) * (1.0 + u_contrast * 0.75) + 0.5;
  float l = clamp(luma(c), 0.0, 1.0);
  c += u_shadow * 0.32 * pow(1.0 - l, 2.5);
  c += u_high * 0.30 * pow(l, 2.5);
  c += vec3(u_warm * 0.09, u_warm * 0.015, -u_warm * 0.09);
  c += vec3(u_tint * 0.035, -u_tint * 0.06, u_tint * 0.035);
  l = luma(c);
  c = mix(vec3(l), c, 1.0 + u_sat);
  float s = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  c = mix(vec3(l), c, 1.0 + u_vib * (1.0 - clamp(s, 0.0, 1.0)) * 1.1);
  c = mix(c, u_cm * c + u_cmOff, u_cmAmt);
  c = mix(c, c * 0.84 + 0.09, u_fade);
  c = clamp(c, 0.0, 1.0);

  if (u_showMask > 0.5) {
    float sel = u_showMask < 1.5 ? paintMix(feat.r, texture2D(u_pTeeth, v_uv).r) : (u_showMask < 2.5 ? hm : skin);
    c = mix(c, vec3(1.0, 0.18, 0.5), 0.5 * clamp(sel, 0.0, 1.0));
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const VS_WARP = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec4 u_crop;
uniform float u_rot, u_flip, u_flipY;
varying vec2 v_uv;
varying vec2 v_q;
vec2 rotP(vec2 p){
  if (u_flip > 0.5) p.x = 1.0 - p.x;
  if (u_rot < 0.5) return p;
  if (u_rot < 1.5) return vec2(1.0 - p.y, p.x);
  if (u_rot < 2.5) return vec2(1.0 - p.x, 1.0 - p.y);
  return vec2(p.y, 1.0 - p.x);
}
void main(){
  vec2 q = (rotP(a_pos) - u_crop.xy) / u_crop.zw;
  v_q = q; v_uv = a_uv;
  gl_Position = vec4(q.x * 2.0 - 1.0, (1.0 - q.y * 2.0) * u_flipY, 0.0, 1.0);
}`;

const FS_WARP = `
precision highp float;
varying vec2 v_uv;
varying vec2 v_q;
uniform sampler2D u_tex;
uniform float u_vig, u_grain;
void main(){
  vec3 c = texture2D(u_tex, v_uv).rgb;
  float d = distance(v_q, vec2(0.5)) * 1.4142;
  float v = smoothstep(0.30, 1.15, d);
  if (u_vig > 0.0) c *= 1.0 - u_vig * v * 0.85;
  else c = mix(c, vec3(1.0), -u_vig * v * 0.8);
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  c += n * u_grain * 0.14;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error("Trình duyệt không hỗ trợ WebGL");
    this.gl = gl;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.pCopy = this._prog(VS_QUAD, FS_COPY);
    this.pBlur = this._prog(VS_QUAD, FS_BLUR);
    this.pMain = this._prog(VS_QUAD, FS_MAIN);
    this.pWarp = this._prog(VS_WARP, FS_WARP);
    this.quad = this._buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    this.texSeg = this._texData(1, 1, new Uint8Array([0, 0, 0, 0]));
    this.texFeat = this._texData(1, 1, new Uint8Array([0, 0, 0, 0]));
    this.texPaint = {
      teeth: this._texData(1, 1, new Uint8Array([128, 128, 128, 255])),
      hair: this._texData(1, 1, new Uint8Array([128, 128, 128, 255])),
      skin: this._texData(1, 1, new Uint8Array([128, 128, 128, 255])),
    };
    this.hasSeg = 0; this.hasFace = 0;
    this.fieldAmt = {};
    this.fields = {};
    this.leg = { a: 0.55, b: 0.92, s: 0 };
    this.view = { rot: 0, flip: false, crop: [0, 0, 1, 1] };
    this.dirty1 = true;
  }

  // ---------- tiện ích GL ----------
  _sh(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  _prog(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    gl.attachShader(p, this._sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this._sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; p.a = {};
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) { const n = gl.getActiveUniform(p, i).name; p.u[n] = gl.getUniformLocation(p, n); }
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) { const n = gl.getActiveAttrib(p, i).name; p.a[n] = gl.getAttribLocation(p, n); }
    return p;
  }
  _buf(data, target, usage) {
    const gl = this.gl, b = gl.createBuffer();
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
    gl.bufferData(target || gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    return b;
  }
  _texParams() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  _texData(w, h, data) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t); this._texParams();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    t.w = w; t.h = h;
    return t;
  }
  _texSource(src, t) {
    const gl = this.gl;
    if (!t) { t = gl.createTexture(); }
    gl.bindTexture(gl.TEXTURE_2D, t); this._texParams();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    t.w = src.width; t.h = src.height;
    return t;
  }
  _fbo(w, h) {
    const gl = this.gl;
    const t = this._texData(w, h, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, t, w, h };
  }
  _freeFbo(o) { if (!o) return; this.gl.deleteFramebuffer(o.f); this.gl.deleteTexture(o.t); }
  _quadDraw(p, target, uvRect) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(p.a.a_pos);
    gl.vertexAttribPointer(p.a.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(p.u.u_uvRect, uvRect || [0, 0, 1, 1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(p.a.a_pos);
  }
  _bindTex(p, name, tex, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(p.u[name], unit);
  }

  // ---------- nạp ảnh ----------
  setImage(srcCanvas) {
    const gl = this.gl;
    this.W = srcCanvas.width; this.H = srcCanvas.height;
    this.texSrc = this._texSource(srcCanvas, this.texSrc);
    this._freeFbo(this.T); this.T = this._fbo(this.W, this.H);
    this.buildBlur(Math.max(this.W, this.H) / 260);
    this.buildMesh();
    this.hasSeg = 0; this.hasFace = 0;
    this.setFeat(null); this.setSeg(null);
    this.fields = {}; this.fieldAmt = {};
    this.leg = { a: 0.55, b: 0.92, s: 0 };
    this.view = { rot: 0, flip: false, crop: [0, 0, 1, 1] };
    this.updateMesh();
    this.dirty1 = true;
  }

  buildBlur(sigma) {
    const gl = this.gl;
    this.blurSigma = sigma;
    // thu nhỏ dần đến khi sigma ~ 2.2 texel
    const f = Math.max(1, sigma / 2.2);
    const tw = Math.max(8, Math.round(this.W / f)), th = Math.max(8, Math.round(this.H / f));
    let cur = { t: this.texSrc, w: this.W, h: this.H }, tmp = [];
    while (cur.w / 2 > tw * 1.05) {
      const n = this._fbo(Math.max(tw, Math.round(cur.w / 2)), Math.max(th, Math.round(cur.h / 2)));
      gl.useProgram(this.pCopy); this._bindTex(this.pCopy, "u_tex", cur.t, 0);
      this._quadDraw(this.pCopy, n);
      tmp.push(n); cur = n;
    }
    const a = this._fbo(tw, th), b = this._fbo(tw, th);
    gl.useProgram(this.pCopy); this._bindTex(this.pCopy, "u_tex", cur.t, 0); this._quadDraw(this.pCopy, a);
    gl.useProgram(this.pBlur);
    for (let k = 0; k < 2; k++) {
      this._bindTex(this.pBlur, "u_tex", a.t, 0); gl.uniform2f(this.pBlur.u.u_dir, 1 / tw, 0); this._quadDraw(this.pBlur, b);
      this._bindTex(this.pBlur, "u_tex", b.t, 0); gl.uniform2f(this.pBlur.u.u_dir, 0, 1 / th); this._quadDraw(this.pBlur, a);
    }
    tmp.forEach(o => this._freeFbo(o)); this._freeFbo(b);
    this._freeFbo(this.blur); this.blur = a;
    this.dirty1 = true;
  }

  // ảnh gốc bị sửa (xoá mụn) -> nạp lại texture và lớp mờ
  updateSource(canvas) {
    this.texSrc = this._texSource(canvas, this.texSrc);
    this.buildBlur(this.blurSigma);
    this.dirty1 = true;
  }

  setSeg(data, w, h) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texSeg);
    if (!data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    this.hasSeg = data ? 1 : 0; this.dirty1 = true;
  }
  setFeat(data, w, h) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texFeat);
    if (!data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    this.hasFace = data ? 1 : 0; this.dirty1 = true;
  }
  setPaint(name, canvas) {
    this._texSource(canvas, this.texPaint[name]);
    this.dirty1 = true;
  }

  // ---------- lưới biến dạng ----------
  buildMesh() {
    const gl = this.gl, W = this.W, H = this.H;
    const cell = Math.max(W, H) / 128;
    const GX = Math.max(2, Math.round(W / cell)), GY = Math.max(2, Math.round(H / cell));
    const N = (GX + 1) * (GY + 1);
    this.GX = GX; this.GY = GY; this.N = N; this.cellX = W / GX; this.cellY = H / GY;
    const base = new Float32Array(N * 2), uv = new Float32Array(N * 2);
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const k = j * (GX + 1) + i;
      base[2 * k] = i * W / GX; base[2 * k + 1] = j * H / GY;
      uv[2 * k] = i / GX; uv[2 * k + 1] = j / GY;
    }
    const idx = new Uint16Array(GX * GY * 6);
    let n = 0;
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
      idx[n++] = a; idx[n++] = b; idx[n++] = c; idx[n++] = b; idx[n++] = d; idx[n++] = c;
    }
    this.base = base; this.L = new Float32Array(N * 2); this.P = new Float32Array(N * 2); this.out = new Float32Array(N * 2);
    this.nIdx = n;
    if (this.bufPos) { gl.deleteBuffer(this.bufPos); gl.deleteBuffer(this.bufUV); gl.deleteBuffer(this.bufIdx); }
    this.bufPos = this._buf(this.out, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    this.bufUV = this._buf(uv);
    this.bufIdx = this._buf(idx, gl.ELEMENT_ARRAY_BUFFER);
  }

  get Hout() { return this.H + (this.leg.b - this.leg.a) * this.H * this.leg.s; }
  stretchY(y) {
    const A = this.leg.a * this.H, B = this.leg.b * this.H, s = this.leg.s;
    if (y < A) return y;
    if (y < B) return A + (y - A) * (1 + s);
    return y + (B - A) * s;
  }
  unstretchY(y) {
    const A = this.leg.a * this.H, B = this.leg.b * this.H, s = this.leg.s;
    if (y < A) return y;
    const B2 = A + (B - A) * (1 + s);
    if (y < B2) return A + (y - A) / (1 + s);
    return y - (B - A) * s;
  }

  updateMesh() {
    const N = this.N, base = this.base, L = this.L, P = this.P, out = this.out;
    const keys = Object.keys(this.fields).filter(k => Math.abs(this.fieldAmt[k] || 0) > 1e-4);
    const W = this.W, Hout = this.Hout;
    for (let i = 0; i < 2 * N; i++) P[i] = base[i] + L[i];
    for (const k of keys) { const F = this.fields[k], a = this.fieldAmt[k]; for (let i = 0; i < 2 * N; i++) P[i] += F[i] * a; }
    for (let i = 0; i < N; i++) { out[2 * i] = P[2 * i] / W; out[2 * i + 1] = this.stretchY(P[2 * i + 1]) / Hout; }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, out);
  }

  liquify(mode, cx, cy, dx, dy, radius, strength) {
    const P = this.P, L = this.L, N = this.N, r2 = radius * radius;
    for (let i = 0; i < N; i++) {
      const x = P[2 * i] - cx, y = P[2 * i + 1] - cy, d2 = x * x + y * y;
      if (d2 >= r2) continue;
      const t = 1 - d2 / r2, w = t * t;
      if (mode === "push") { L[2 * i] += dx * w * strength; L[2 * i + 1] += dy * w * strength; }
      else if (mode === "pinch") { L[2 * i] -= x * w * strength * 0.06; L[2 * i + 1] -= y * w * strength * 0.06; }
      else if (mode === "bloat") { L[2 * i] += x * w * strength * 0.06; L[2 * i + 1] += y * w * strength * 0.06; }
      else if (mode === "restore") { const f = 1 - w * strength * 0.25; L[2 * i] *= f; L[2 * i + 1] *= f; }
    }
    this.updateMesh();
  }

  // điểm trên ảnh đã biến dạng (px, trước kéo chân) -> điểm trên ảnh gốc
  preToSource(x, y) {
    const GX = this.GX, GY = this.GY, P = this.P, base = this.base;
    const gx = Math.floor(x / this.cellX), gy = Math.floor(y / this.cellY);
    const test = (a, b, c) => {
      const ax = P[2 * a], ay = P[2 * a + 1], bx = P[2 * b], by = P[2 * b + 1], cx = P[2 * c], cy = P[2 * c + 1];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-9) return null;
      const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den;
      const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) return null;
      return { x: l1 * base[2 * a] + l2 * base[2 * b] + l3 * base[2 * c], y: l1 * base[2 * a + 1] + l2 * base[2 * b + 1] + l3 * base[2 * c + 1] };
    };
    for (let r = 0; r <= 10; r++) {
      for (let j = gy - r; j <= gy + r; j++) {
        if (j < 0 || j >= GY) continue;
        for (let i = gx - r; i <= gx + r; i++) {
          if (i < 0 || i >= GX) continue;
          if (Math.max(Math.abs(i - gx), Math.abs(j - gy)) !== r) continue;
          const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1;
          const h = test(a, b, c) || test(b, d, c);
          if (h) return h;
        }
      }
    }
    return { x, y };
  }

  // ---------- kích thước khung nhìn ----------
  viewSize(view) {
    const v = view || this.view;
    const w0 = this.W, h0 = this.Hout;
    const rw = v.rot % 2 ? h0 : w0, rh = v.rot % 2 ? w0 : h0;
    return { w: Math.max(1, Math.round(rw * v.crop[2])), h: Math.max(1, Math.round(rh * v.crop[3])), rw, rh };
  }
  // toạ độ chuẩn hoá trên canvas (0..1) -> px trước kéo chân
  canvasToPre(u, v, view) {
    const vw = view || this.view;
    let rx = vw.crop[0] + u * vw.crop[2], ry = vw.crop[1] + v * vw.crop[3];
    let x, y;
    switch (vw.rot) {
      case 1: x = ry; y = 1 - rx; break;
      case 2: x = 1 - rx; y = 1 - ry; break;
      case 3: x = 1 - ry; y = rx; break;
      default: x = rx; y = ry;
    }
    if (vw.flip) x = 1 - x;
    return { x: x * this.W, y: this.unstretchY(y * this.Hout) };
  }
  preToCanvas(px, py, view) {
    const vw = view || this.view;
    let x = px / this.W, y = this.stretchY(py) / this.Hout;
    if (vw.flip) x = 1 - x;
    let rx, ry;
    switch (vw.rot) {
      case 1: rx = 1 - y; ry = x; break;
      case 2: rx = 1 - x; ry = 1 - y; break;
      case 3: rx = y; ry = 1 - x; break;
      default: rx = x; ry = y;
    }
    return { u: (rx - vw.crop[0]) / vw.crop[2], v: (ry - vw.crop[1]) / vw.crop[3] };
  }

  // ---------- vẽ ----------
  _uniformsMain(p, P) {
    const gl = this.gl, u = p.u;
    gl.uniform2f(u.u_texel, 1 / this.W, 1 / this.H);
    gl.uniform1f(u.u_hasSeg, this.hasSeg); gl.uniform1f(u.u_hasFace, this.hasFace);
    const f1 = (n, v) => u[n] && gl.uniform1f(u[n], v || 0);
    f1("u_smooth", P.smooth); f1("u_whiten", P.whiten); f1("u_teeth", P.teeth); f1("u_lip", P.lip); f1("u_hair", P.hair);
    gl.uniform3fv(u.u_lipColor, P.lipColor || [0.8, 0.2, 0.3]);
    gl.uniform3fv(u.u_hairColor, P.hairColor || [0.5, 0.3, 0.2]);
    ["exposure", "bright", "contrast", "high", "shadow", "sat", "vib", "warm", "tint", "sharp", "fade"].forEach(k => f1("u_" + k, P[k]));
    gl.uniformMatrix3fv(u.u_cm, false, P.cm || IDENT);
    gl.uniform3fv(u.u_cmOff, P.cmOff || [0, 0, 0]);
    f1("u_cmAmt", P.cmAmt); f1("u_showMask", P.showMask);
    gl.uniform3fv(u.u_ctG, P.ctG || [1, 1, 1]); gl.uniform3fv(u.u_ctO, P.ctO || [0, 0, 0]); f1("u_ctAmt", P.ctAmt);
    this._bindTex(p, "u_src", this.texSrc, 0);
    this._bindTex(p, "u_blur", this.blur.t, 1);
    this._bindTex(p, "u_seg", this.texSeg, 2);
    this._bindTex(p, "u_feat", this.texFeat, 3);
    this._bindTex(p, "u_pTeeth", this.texPaint.teeth, 4);
    this._bindTex(p, "u_pHair", this.texPaint.hair, 5);
    this._bindTex(p, "u_pSkin", this.texPaint.skin, 6);
  }

  renderPass1(P) {
    const gl = this.gl;
    gl.useProgram(this.pMain);
    this._uniformsMain(this.pMain, P);
    this._quadDraw(this.pMain, this.T);
    this.dirty1 = false;
  }

  _drawWarp(P, target, view, flipY) {
    const gl = this.gl, p = this.pWarp, v = view || this.view;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    const vw = target ? target.w : this.canvas.width, vh = target ? target.h : this.canvas.height;
    gl.viewport(0, 0, vw, vh);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4fv(p.u.u_crop, v.crop);
    gl.uniform1f(p.u.u_rot, v.rot); gl.uniform1f(p.u.u_flip, v.flip ? 1 : 0); gl.uniform1f(p.u.u_flipY, flipY ? -1 : 1);
    gl.uniform1f(p.u.u_vig, P.vig || 0); gl.uniform1f(p.u.u_grain, P.grain || 0);
    this._bindTex(p, "u_tex", this.T.t, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.enableVertexAttribArray(p.a.a_pos); gl.vertexAttribPointer(p.a.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
    gl.enableVertexAttribArray(p.a.a_uv); gl.vertexAttribPointer(p.a.a_uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(p.a.a_pos); gl.disableVertexAttribArray(p.a.a_uv);
  }

  render(P, view) {
    if (!this.texSrc) return;
    const s = this.viewSize(view);
    if (this.canvas.width !== s.w || this.canvas.height !== s.h) { this.canvas.width = s.w; this.canvas.height = s.h; }
    if (this.dirty1) this.renderPass1(P);
    this._drawWarp(P, null, view, false);
  }

  // ảnh thu nhỏ vuông cho bộ lọc (không biến dạng)
  thumbnail(P, size) {
    const gl = this.gl;
    const fb = this._fbo(size, size);
    const a = this.W / this.H;
    const rect = a > 1 ? [(1 - 1 / a) / 2, 0, 1 / a, 1] : [0, (1 - a) / 2, 1, a];
    gl.useProgram(this.pMain); this._uniformsMain(this.pMain, P);
    this._quadDraw(this.pMain, fb, rect);
    const px = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px);
    this._freeFbo(fb);
    this.dirty1 = true;
    // hàng 0 của FBO = đỉnh ảnh (cùng quy ước texture) -> không cần lật
    const c = document.createElement("canvas"); c.width = c.height = size;
    c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px.buffer), size, size), 0, 0);
    return c;
  }

  // xuất ảnh cuối cùng ra canvas 2D
  exportCanvas(P) {
    this.render(P);
    const c = document.createElement("canvas");
    c.width = this.canvas.width; c.height = this.canvas.height;
    c.getContext("2d").drawImage(this.canvas, 0, 0);
    return c;
  }
}
