// ================================================================
// ROOM 2 — three real materials, each rendered in its own medium.
//   i   a fresco: mineral pigment soaked into lime plaster on a wall
//   ii  an embroidered silk shawl: woven ground, satin-stitched flowers, a fringe of single threads
//   iii the house front after Casa Vicens, built in 3D: brick, glazed tile, stone, iron and wood in sunlight
// Everything is drawn at the screen's full pixel density so it stays sharp on Retina displays.
// ================================================================
const R2 = {};

// Run one fragment shader over a rectangle of the page at full resolution, reading what the scene drew there.
function r2Prog(name, fs) {
  const { gl } = PAINT;
  if (PAINT[name]) return PAINT[name];
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(name + " shader", gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, PAINT_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.warn(name + " link", gl.getProgramInfoLog(p));
  p.u = {}; return (PAINT[name] = p);
}
function r2Pass(name, fs, rect, uniforms) {
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return;
  const { gl } = PAINT, p = r2Prog(name, fs), cnv = screen.canvas;
  // snap to whole device pixels so the result lands 1:1 on the screen
  const x = Math.round(rect.x * DPR) / DPR, y = Math.round(rect.y * DPR) / DPR;
  const w = Math.round(rect.w * DPR), h = Math.round(rect.h * DPR);
  paintResize(w, h);
  gl.bindTexture(gl.TEXTURE_2D, PAINT.src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const CW = cnv.width / DPR, CH = cnv.height / DPR;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  paintUse(p, Object.assign({ uBox: [x / CW, 1 - (y + h / DPR) / CH, w / DPR / CW, h / DPR / CH], uRes: [w, h], uScale: DPR }, uniforms));
  paintBind(p, "uSrc", 0, PAINT.src);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(Math.round(x * DPR), Math.round(y * DPR), w, h);
  g.drawImage(PAINT.cv, Math.round(x * DPR), Math.round(y * DPR));
  g.restore();
}

// ----------------------------------------------------------------
// 2i  FRESCO. Buon fresco is pigment in water brushed onto wet lime plaster; as the lime cures the colour
// is locked inside it. So the colour is matte and a little chalky, it soaks in unevenly where the plaster
// was more or less absorbent, it gathers in the tiny hollows of the trowelled surface, and the sand in
// the plaster catches the light. Centuries later a few flakes of the paint layer have come away near the
// edges, showing the rougher plaster beneath, and fine cracks run through the wall.
// The outlines of the figure are left exactly as painted.
// ----------------------------------------------------------------
const FRESCO_FS = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes, uLight; uniform float uT, uScale, uWarm;
in vec2 vUv; out vec4 o;
vec3 S(vec2 px){ return texture(uSrc, uBox.xy + clamp(px, vec2(.5), uRes - .5) / uRes * uBox.zw).rgb; }
// the trowelled lime: slow undulations, the drag of the trowel, and fine sand
float plaster(vec2 q){ return fb(q * .006) * .5 + fb(vec2(q.x * .03, q.y * .05) + 5.) * .22 + vn(q * .55) * .05 + vn(q * 1.4 + 9.) * .025; }
// where the paint layer has flaked away: rare, irregular, mostly near the edges and the foot of the wall
float loss(vec2 q, vec2 size){
  vec2 e = min(q, size - q); float edge = 1. - smoothstep(0., 45., min(e.x, e.y));
  float foot = 1. - smoothstep(0., 90., q.y);
  float n = fb(q * .022 + 11.) + vn(q * .12) * .12 + vn(q * .45) * .05;
  return smoothstep(.0, .01, n - (.98 - edge * .26 - foot * .14));
}
// hairline cracks: the edges of an irregular cell pattern, only in a few places
float crack(vec2 q){
  vec2 w = q * .018 + vec2(fb(q * .02), fb(q * .02 + 4.)) * 1.6;
  vec2 i = floor(w), f = fract(w); float d1 = 9., d2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = vec2(x, y), r = c + h22(i + c) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  float edge = sqrt(d2) - sqrt(d1), wdt = .018 / max(uScale, 1.);
  return (1. - smoothstep(wdt * .5, wdt * 1.5, edge)) * smoothstep(.6, .66, fb(q * .004 + 21.));
}
void main(){
  vec2 px = gl_FragCoord.xy, q = px / uScale, size = uRes / uScale;
  vec3 c = S(px);
  float lum = dot(c, vec3(.3, .59, .11));
  // the plaster surface, lit by a low light from the side
  float h0 = plaster(q), hx = plaster(q + vec2(.7, 0.)) - h0, hy = plaster(q + vec2(0., .7)) - h0;
  vec3 n = normalize(vec3(-hx * 9., -hy * 9., 1.)), L = normalize(vec3(uLight, .9));
  float relief = .97 + .12 * (dot(n, L) - L.z);
  // mineral pigment in lime: slightly less saturated, and soaked in a little unevenly
  vec3 lime = vec3(.935, .905, .845);
  vec3 pig = mix(vec3(lum), c, .88);
  float absorb = .91 + .09 * fb(q * .025 + 2.) - .05 * vn(q * .3);
  vec3 col = mix(lime, pig, absorb);
  col *= 1. - (h0 - .45) * .07;                                   // pigment gathers in the hollows
  // where the brush stopped: a faint darker rim along the edges of each colour area
  float es = 0.;
  for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708; es = max(es, length(c - S(px + vec2(cos(a), sin(a)) * 1.2 * uScale))); }
  col *= 1. - smoothstep(.12, .45, es) * .045;
  // sand grains: tiny bright crystals
  col += vec3(.05) * step(.993, h12(floor(q * 1.3))) * (1. - lum);
  col *= relief;
  // losses: the paint layer gone, the rougher plaster below, a thin shadow where the edge of the paint stands up
  float lo = loss(q, size), loL = loss(q + uLight * 1.6, size);
  vec3 under = vec3(.86, .80, .70) * (.9 + .12 * vn(q * .7) + .06 * vn(q * 2.1));
  col = mix(col, under * relief, lo);
  col *= 1. - lo * (1. - loL) * .28;
  col += (1. - lo) * loL * .035;
  // cracks
  float k = crack(q); col *= 1. - k * .26; col += crack(q - uLight * .8) * (1. - k) * .03;
  // salts blooming faintly at the foot of the wall
  col = mix(col, vec3(.95, .94, .91), smoothstep(.55, .9, fb(q * .018 + 3.)) * (1. - smoothstep(0., 110., q.y)) * .16);
  col *= mix(vec3(1.), vec3(1.035, 1., .95), uWarm);           // the light warms a little with the music
  o = vec4(clamp(col, 0., 1.), 1.);
}`;
R2.fresco = (box, t) => {
  if (!dancer.rect) return;
  r2Pass("fresco", FRESCO_FS, dancer.rect, { uT: t, uLight: [-0.62 + Math.sin(t * 0.07) * 0.08, 0.55], uWarm: Math.min(1, S.mid * 0.8 + S.pulse * 0.3) });
};

// ----------------------------------------------------------------
// 2ii  THE MANTÓN. A square of crimson silk crêpe hung from one corner, embroidered by hand in silk floss:
// roses in long-and-short stitch (the threads run towards the heart of each flower, shading from pale tips
// to a deep centre), leaves in fishbone stitch, stems and borders in stem stitch, French knots in the
// hearts. Every stitch is drawn as its own thread. A second map records which way each thread runs, so the
// silk sheen slides along the threads as the cloth moves. The cloth hangs in soft folds that sway with
// the compás, and the fringe is a knotted net that ends in hundreds of loose threads, each one swinging
// under gravity and stirred by the music.
// ----------------------------------------------------------------
const manton = { ang: { x: 0, v: 0 }, fr: { x: 0, v: 0 }, side: 1, key: "", fringe: null };
const MANTON_GROUND = "#A51E2A";

// the folds: they fan out from the top corner where the shawl is held (same formula in the shader)
function mantonFold(x, y, d, P) {
  const r = Math.hypot(x, y), phi = Math.atan2(x, y), env = Math.min(1, Math.max(0, r / (0.6 * d))) ** 2 * (3 - 2 * Math.min(1, r / (0.6 * d))) * (r / d);
  return env * (P[0] * Math.sin(phi * 9 + P[1]) + P[0] * 0.5 * Math.sin(phi * 15 + P[2]) + P[0] * 0.25 * Math.sin(phi * 23 - P[3]) + P[4] * Math.sin(r * 0.05 - P[5]));
}
const MANTON_FS = PAINT_COMMON + `
uniform sampler2D uAlb, uDir; uniform vec2 uRes, uOrg, uTop; uniform float uScale, uAng, uD, uT; uniform vec3 uPa, uPb;
in vec2 vUv; out vec4 o;
float fold(vec2 p){
  float r = length(p), phi = atan(p.x, p.y), s = clamp(r / (.6 * uD), 0., 1.), env = s * s * (3. - 2. * s) * (r / uD);
  return env * (uPa.x * sin(phi * 9. + uPa.y) + uPa.x * .5 * sin(phi * 15. + uPa.z) + uPa.x * .25 * sin(phi * 23. - uPb.x) + uPb.y * sin(r * .05 - uPb.z));
}
vec4 A(vec2 uv){ return texture(uAlb, vec2((uv.x + uD) / (2. * uD), 1. - uv.y / (2. * uD))); }
vec4 Dm(vec2 uv){ return texture(uDir, vec2((uv.x + uD) / (2. * uD), 1. - uv.y / (2. * uD))); }
float kk(vec3 T, vec3 H, float e){ float th = dot(T, H); return pow(sqrt(max(0., 1. - th * th)), e); }
void main(){
  // this pixel on the page, then in the shawl's own frame (top corner at 0,0, y down)
  vec2 P = uOrg + vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale - uTop;
  float ca = cos(uAng), sa = sin(uAng);
  vec2 p = vec2(ca * P.x + sa * P.y, -sa * P.x + ca * P.y);
  float h = fold(p), hx = fold(p + vec2(.5, 0.)) - h, hy = fold(p + vec2(0., .5)) - h;
  vec2 grad = vec2(hx, hy) * 2.;
  vec2 uv = p + grad * 6.;                                   // the cloth gathers a little into its folds
  if (abs(uv.x) > uD || uv.y < 0. || uv.y > 2. * uD) { o = vec4(0.); return; }
  vec4 a = A(uv); if (a.a < .004) { o = vec4(0.); return; }
  vec3 alb = a.rgb / a.a;
  vec3 N = normalize(vec3(-grad, 1.)), L = normalize(vec3(-.45, -.55, .75)), H = normalize(L + vec3(0., 0., 1.));
  float dif = .45 + .62 * max(dot(N, L), 0.) + .08 * N.z;
  vec4 dm = Dm(uv); float emb = smoothstep(.45, .8, dm.b);
  vec3 col;
  if (emb < .5) {
    // the crêpe ground: a fine plain weave along the square's edges, a soft sheen across it
    vec2 w = vec2(uv.x + uv.y, uv.y - uv.x) * .7071 / 1.05;
    vec2 c = floor(w); bool warp = mod(c.x + c.y, 2.) < 1.;
    vec2 f = fract(w); float prof = warp ? sin(f.y * 3.1416) : sin(f.x * 3.1416);
    vec2 t2 = warp ? vec2(.7071, .7071) : vec2(-.7071, .7071);
    vec3 T = normalize(vec3(t2, 0.) - N * dot(vec3(t2, 0.), N));
    float sheen = kk(T, H, 18.) * .2 + kk(T, H, 90.) * .08;
    col = alb * dif * (.975 + .035 * prof) * (.98 + .04 * vn(vec2(uv.x * .9, uv.y * .25)));
    col += mix(alb, vec3(1., .78, .74), .45) * sheen * (.8 + .2 * prof);
    // the embroidery stands above the ground and throws a hairline shadow away from the light
    float sh = smoothstep(.45, .8, Dm(uv + L.xy * 1.4).b);
    col *= 1. - sh * .3;
  } else {
    // silk floss: a strong, narrow sheen that runs along each thread
    vec2 e2 = dm.rg * 2. - 1.; float th = atan(e2.y, e2.x) * .5; vec2 t2 = vec2(cos(th), sin(th));
    vec3 T = normalize(vec3(t2, 0.) - N * dot(vec3(t2, 0.), N));
    float sheen = kk(T, H, 40.) * .16 + kk(T, H, 160.) * .14;
    col = alb * (dif * .95 + .05) + mix(alb, vec3(1.), .4) * sheen;
  }
  o = vec4(clamp(col, 0., 1.) * a.a, a.a);
}`;

// Record the stitches of the whole design once; each stitch is [x1, y1, x2, y2, colour, width].
function mantonStitches(d) {
  const r = seeded(404), out = [], TW = 1.25;
  const st = (x1, y1, x2, y2, col, w = TW) => out.push([x1, y1, x2, y2, col, w]);
  const mix = (a, b, k) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = s => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k);
    return `rgb(${c(16)},${c(8)},${c(0)})`; };
  // stem stitch along a curve given as a function s -> [x, y]
  const stem = (f, len, col, w = TW) => { const n = Math.max(2, Math.round(len / 2.2));
    for (let i = 0; i < n; i++) { const a = f(i / n), b = f(Math.min(1, (i + 1.8) / n)); st(a[0] + 0.4, a[1] - 0.4, b[0] - 0.4, b[1] + 0.4, col, w); } };
  // a fishbone leaf from base (x, y) pointing along ang
  const leafF = (x, y, len, wid, ang, light, dark) => {
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, n = Math.round(len / 1.15);
    const W = s => wid * Math.pow(Math.sin(Math.PI * Math.min(1, s)), 0.75) * (1 - 0.25 * s);
    for (let i = 0; i < n; i++) {
      const s = i / n;
      for (const side of [-1, 1]) {
        const s2 = Math.min(1, s + 0.16), m = [x + ux * len * s, y + uy * len * s];
        const e = [x + ux * len * s2 + vx * side * W(s2), y + uy * len * s2 + vy * side * W(s2)];
        st(m[0], m[1], e[0], e[1], mix(side > 0 ? light : dark, side > 0 ? dark : light, 0.15 + r() * 0.15));
      }
    }
    stem(s => [x + ux * len * s * 0.9, y + uy * len * s * 0.9], len * 0.9, dark, 0.9);
  };
  // a rose in long-and-short stitch: rings of petals, threads aimed at the heart, pale tips to deep centre
  const roseF = (cx, cy, R, P, rot) => {
    const edgeP = [];
    for (const [rad, np, off] of [[1, 5, 0], [0.72, 5, 0.63], [0.47, 4, 0.2]]) {
      const Rr = R * rad;
      for (let k = 0; k < np; k++) {
        const a0 = rot + off + (k / np) * TAU - 0.12, a1 = rot + off + ((k + 1) / np) * TAU + 0.12;
        const n = Math.round((a1 - a0) * Rr / 1.05);
        for (let i = 0; i <= n; i++) {
          const u = i / n, a = a0 + (a1 - a0) * u;
          const edge = Rr * (0.8 + 0.2 * Math.sin(Math.PI * u) - 0.07 * Math.exp(-(((u - 0.5) / 0.07) ** 2))) * (0.98 + r() * 0.04);
          const ca = Math.cos(a), sa = Math.sin(a), ls = i % 2 ? 0.06 : -0.04;
          const b1 = edge * (0.6 + ls), b2 = edge * (0.33 + ls), b0 = Rr * 0.18;
          st(cx + ca * b1, cy + sa * b1, cx + ca * edge, cy + sa * edge, P[0]);
          st(cx + ca * b2, cy + sa * b2, cx + ca * (b1 + 1), cy + sa * (b1 + 1), P[1]);
          st(cx + ca * b0, cy + sa * b0, cx + ca * (b2 + 1), cy + sa * (b2 + 1), P[2]);
          edgeP.push([cx + ca * edge, cy + sa * edge]);
        }
        for (let i = 1; i < edgeP.length; i += 1) { const A0 = edgeP[i - 1], B0 = edgeP[Math.min(edgeP.length - 1, i + 1)]; st(A0[0], A0[1], B0[0], B0[1], P[1], 0.9); }
        edgeP.length = 0;
      }
    }
    // the heart: a little satin cup, then French knots
    const hr = R * 0.2;
    for (let yy = -hr; yy <= hr; yy += 1.05) { const xx = Math.sqrt(Math.max(0, hr * hr - yy * yy)); st(cx - xx, cy + yy, cx + xx, cy + yy, P[3]); }
    for (let i = 0; i < Math.round(R * 0.5); i++) { const a = i * 2.4, q = Math.sqrt(i / (R * 0.5)) * hr * 0.85;
      out.push(["knot", cx + Math.cos(a) * q, cy + Math.sin(a) * q, i % 3 ? "#E8B54A" : "#C98A2A"]); }
  };
  // a five-petalled floret in satin stitch
  const floretF = (cx, cy, R, col, heart, rot) => {
    for (let k = 0; k < 5; k++) {
      const a = rot + k * TAU / 5, ux = Math.cos(a), uy = Math.sin(a);
      for (let s = 0.2; s <= 1; s += 1 / R * 1.0) { const w = R * 0.36 * Math.sin(Math.PI * s) + 0.3, px = cx + ux * R * s, py = cy + uy * R * s;
        st(px - uy * w, py + ux * w, px + uy * w, py - ux * w, col, 1.05); }
    }
    out.push(["knot", cx, cy, heart]);
  };
  const PAL = [["#F2C4BE", "#E07A88", "#B02E48", "#6E1428"], ["#F6E9CF", "#E6C590", "#C99A55", "#8A5A2C"],
               ["#F8D88E", "#EBA548", "#C9742A", "#7E3E16"], ["#F4CDD6", "#E28FA6", "#C0587A", "#7A2240"]];
  const cx = 0, cy = d;
  // borders: two lines of stem stitch inside the edge, florets between them
  const diamondPt = (inset, s) => { const C = [[0, inset * 1.414], [-d + inset * 1.414, d], [0, 2 * d - inset * 1.414], [d - inset * 1.414, d]];
    const k = Math.floor(s * 4) % 4, f = s * 4 - Math.floor(s * 4), A = C[k], B = C[(k + 1) % 4]; return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f]; };
  stem(s => diamondPt(d * 0.1, s), 8 * d, "#F1DFC0"); stem(s => diamondPt(d * 0.135, s), 8 * d, "#D9A84E");
  for (let k = 0; k < 36; k++) { const p = diamondPt(d * 0.1175, (k + 0.5) / 36); floretF(p[0], p[1], d * 0.022, k % 2 ? "#F1DFC0" : "#F3C9B8", "#D9A84E", k); }
  // stems and leaves winding out from the centre
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + Math.PI / 8, ca = Math.cos(a), sa = Math.sin(a);
    const pt = s => { const along = d * (0.12 + 0.43 * s), bend = Math.sin(s * Math.PI * 1.5) * d * 0.06; return [cx + ca * along - sa * bend, cy + sa * along + ca * bend]; };
    stem(pt, d * 0.45, "#5E8A4A", 1.4);
    for (const [s, side] of [[0.38, 1], [0.66, -1], [0.85, 1]]) { const p = pt(s); leafF(p[0], p[1], d * 0.11, d * 0.035, a + side * 1.05, "#A7C47E", "#3F6B3C"); }
  }
  // roses: one big one in the middle, eight around it, four small ones between
  roseF(cx, cy, d * 0.2, PAL[0], 0.3);
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + Math.PI / 8; roseF(cx + Math.cos(a) * d * 0.5, cy + Math.sin(a) * d * 0.5, d * (k % 2 ? 0.1 : 0.13), PAL[(k + 1) % 4], k * 0.7); }
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4; roseF(cx + Math.cos(a) * d * 0.3, cy + Math.sin(a) * d * 0.3, d * 0.07, PAL[(k + 2) % 4], k); }
  return out;
}
// Paint the stitches twice: their colours (each thread rounded, with a lighter crest), and which way they run.
function mantonDesign(d) {
  const S2 = mantonStitches(d);
  const diamond = c => { c.beginPath(); c.moveTo(d, 0); c.lineTo(0, d); c.lineTo(d, 2 * d); c.lineTo(2 * d, d); c.closePath(); };
  const alb = offscreen(2 * d, 2 * d, () => {
    diamond(g); g.fillStyle = MANTON_GROUND; g.fill();
    g.save(); diamond(g); g.clip(); g.translate(d, 0); g.lineCap = "round";
    for (const s of S2) {
      if (s[0] === "knot") { g.beginPath(); g.arc(s[1], s[2], 0.95, 0, TAU); g.fillStyle = s[3]; g.fill();
        g.beginPath(); g.arc(s[1] - 0.3, s[2] - 0.3, 0.35, 0, TAU); g.fillStyle = "rgba(255,250,230,0.8)"; g.fill(); continue; }
      const [x1, y1, x2, y2, col, w] = s;
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = "rgba(60,10,10,0.18)"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x1 + 0.45, y1 + 0.45); g.lineTo(x2 + 0.45, y2 + 0.45); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = w * 0.32; const k = 0.18;
      g.beginPath(); g.moveTo(x1 + (x2 - x1) * k - 0.2, y1 + (y2 - y1) * k - 0.2); g.lineTo(x2 - (x2 - x1) * k - 0.2, y2 - (y2 - y1) * k - 0.2); g.stroke();
    }
    g.restore();
    diamond(g); g.strokeStyle = "#7E1420"; g.lineWidth = 1.4; g.stroke();   // the rolled hem
  });
  const dir = offscreen(2 * d, 2 * d, () => {
    diamond(g); g.fillStyle = "rgb(128,128,0)"; g.fill();
    g.save(); diamond(g); g.clip(); g.translate(d, 0); g.lineCap = "round";
    for (const s of S2) {
      if (s[0] === "knot") { g.beginPath(); g.arc(s[1], s[2], 0.95, 0, TAU); g.fillStyle = "rgb(128,255,255)"; g.fill(); continue; }
      const [x1, y1, x2, y2, , w] = s, a = Math.atan2(-(y2 - y1), x2 - x1); // y up, as in the shader
      g.strokeStyle = `rgb(${Math.round((Math.cos(2 * a) * 0.5 + 0.5) * 255)},${Math.round((Math.sin(2 * a) * 0.5 + 0.5) * 255)},255)`;
      g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    g.restore();
  });
  return { alb, dir };
}

// The fringe: a net of knotted cords under each lower edge, then loose threads that hang under gravity.
function mantonFringe(d) {
  const sp = 6, rows = 4, rowH = 5.2, per = 5, segs = 12, len = d * 0.3;
  const edges = [];
  for (const side of [-1, 1]) {
    const n = Math.floor(d * 1.414 / sp);
    for (let i = 0; i <= n; i++) edges.push({ side, s: i / n });
  }
  const r = seeded(77), strands = [];
  edges.forEach((e, i) => {
    for (let k = 0; k < per; k++) {
      const L = len * (0.9 + r() * 0.16), pts = [];
      for (let j = 0; j <= segs; j++) pts.push({ x: 0, y: 0, px: 0, py: 0 });
      strands.push({ e: i, off: (k - (per - 1) / 2) * 0.9, seg: L / segs, pts, col: k % 3, init: false });
    }
  });
  return { sp, rows, rowH, edges, strands };
}
function mantonScene(t, dt, box) {
  const h = box.h, d = Math.round(Math.min(h * 0.4, box.w * 0.42)), cx = box.x + box.w / 2, top = box.y + h * 0.02;
  spring(manton.ang, dt, 6, 1.6); spring(manton.fr, dt, 10, 1.4);
  const ang = manton.ang.x * 0.05 + Math.sin(t * 0.6) * 0.012;
  const key = d + "@" + DPR;
  if (manton.key !== key) { manton.key = key; manton.design = mantonDesign(d); manton.fringe = mantonFringe(d); manton.tex = null; }
  const P = [6, t * 0.35 + manton.ang.x * 3, -t * 0.5 + manton.ang.x * 5, t * 0.8, 1.2 + S.bass * 2.5, t * 4];
  const toPage = (x, y) => [cx + x * Math.cos(ang) - y * Math.sin(ang), top + x * Math.sin(ang) + y * Math.cos(ang)];
  // where a point of the cloth appears, once the folds have gathered it (the inverse of the shader's shift)
  const shown = (x, y) => { const f = mantonFold(x, y, d, P), gx = (mantonFold(x + 0.5, y, d, P) - f) * 2, gy = (mantonFold(x, y + 0.5, d, P) - f) * 2; return [x - gx * 6, y - gy * 6]; };

  // a soft shadow of the shawl on the wall behind it
  g.save(); g.shadowColor = "rgba(60,30,20,0.22)"; g.shadowBlur = 26; g.shadowOffsetX = 10; g.shadowOffsetY = 16;
  g.beginPath(); [[0, 0], [-d, d], [0, 2 * d], [d, d]].forEach(([x, y], i) => { const p = toPage(x, y); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
  g.fillStyle = MANTON_GROUND; g.fill(); g.restore();

  // the silk, rendered in WebGL at full resolution
  if (PAINT.gl === null) paintSetup();
  if (PAINT.gl) {
    const { gl } = PAINT, prog = r2Prog("manton", MANTON_FS);
    if (!manton.tex) {
      const up = c => { const tx = PAINT.tex(); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); return tx; };
      if (manton.texA) { gl.deleteTexture(manton.texA); gl.deleteTexture(manton.texD); }
      manton.texA = up(manton.design.alb);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      manton.texD = (() => { const tx = PAINT.tex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, manton.design.dir);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return tx; })();
      manton.tex = true;
    }
    const cs = [[0, 0], [-d, d], [0, 2 * d], [d, d]].map(([x, y]) => toPage(x, y));
    const pad = 10, x0 = Math.floor((Math.min(...cs.map(c => c[0])) - pad) * DPR) / DPR, y0 = Math.floor((Math.min(...cs.map(c => c[1])) - pad) * DPR) / DPR;
    const x1 = Math.max(...cs.map(c => c[0])) + pad, y1 = Math.max(...cs.map(c => c[1])) + pad;
    const w = Math.round((x1 - x0) * DPR), hh = Math.round((y1 - y0) * DPR);
    paintResize(w, hh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, hh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    paintUse(prog, { uRes: [w, hh], uOrg: [x0, y0], uTop: [cx, top], uScale: DPR, uAng: ang, uD: d, uT: t, uPa: [P[0], P[1], P[2]], uPb: [P[3], P[4], P[5]] });
    paintBind(prog, "uAlb", 0, manton.texA); paintBind(prog, "uDir", 1, manton.texD);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAINT.cv, Math.round(x0 * DPR), Math.round(y0 * DPR)); g.restore();
  } else {
    g.save(); g.translate(cx, top); g.rotate(ang); g.drawImage(manton.design.alb, -d, 0, 2 * d, 2 * d); g.restore();
  }

  // the fringe
  const F = manton.fringe, edgeLocal = e => e.side < 0 ? [-d + d * e.s, d + d * e.s] : [d * e.s, 2 * d - d * e.s];
  const sway = (depth, x) => manton.fr.x * depth * 0.22 + Math.sin(t * 1.3 + x * 0.03) * depth * 0.02 * (0.4 + S.mid);
  // the knot rows of the net, hanging straight down from the edge
  const knots = F.edges.map(e => { const l = edgeLocal(e), s = shown(l[0], l[1]), p = toPage(s[0], s[1]); const row = [];
    for (let j = 0; j <= F.rows; j++) row.push([p[0] + sway(j * F.rowH, p[0]), p[1] + j * F.rowH]); return row; });
  g.save(); g.lineCap = "round";
  // net cords: each knot joins its neighbours on the row below, making diamonds
  g.strokeStyle = "#86161F"; g.lineWidth = 1.7; g.beginPath();
  for (let i = 0; i < knots.length - 1; i++) { if (F.edges[i].side !== F.edges[i + 1].side) continue;
    for (let j = 0; j < F.rows; j++) { const a = knots[i][j], b = knots[i + 1][j];
      const na = knots[i][j + 1], nb = knots[i + 1][j + 1];
      if (j % 2 === 0) { g.moveTo(a[0], a[1]); g.lineTo(nb[0], nb[1]); g.moveTo(b[0], b[1]); g.lineTo(na[0], na[1]); }
      else { g.moveTo(a[0], a[1]); g.lineTo(na[0], na[1]); } } }
  g.stroke();
  g.strokeStyle = "rgba(255,170,160,0.35)"; g.lineWidth = 0.4; g.stroke();
  g.fillStyle = "#7A121C"; for (const row of knots) for (let j = 1; j <= F.rows; j++) { g.beginPath(); g.ellipse(row[j][0], row[j][1], 1.3, 1.6, 0, 0, TAU); g.fill(); }
  // loose threads: Verlet chains hanging from the last knot row
  const steps = Math.min(4, Math.max(1, Math.round(dt * 120))), h2 = Math.min(dt, 1 / 20) / steps;
  const wind = (x, y) => (noise2(x * 0.01 + t * 0.4, y * 0.01) - 0.5) * (60 + 260 * S.mid + 140 * S.high) + manton.fr.x * 320;
  for (let it = 0; it < steps; it++) for (const s of F.strands) {
    const k = knots[s.e][F.rows], a = s.pts[0]; a.x = k[0] + s.off; a.y = k[1];
    if (!s.init) { s.pts.forEach((p, j) => { p.x = p.px = a.x; p.y = p.py = a.y + j * s.seg; }); s.init = true; }
    for (let j = 1; j < s.pts.length; j++) { const p = s.pts[j], vx = (p.x - p.px) * 0.985, vy = (p.y - p.py) * 0.985; p.px = p.x; p.py = p.y;
      p.x += vx + wind(p.x, p.y) * (j / s.pts.length) * h2 * h2; p.y += vy + 900 * h2 * h2; }
    for (let c = 0; c < 3; c++) for (let j = 1; j < s.pts.length; j++) { const p = s.pts[j - 1], q = s.pts[j], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, f = (l - s.seg) / l;
      if (j === 1) { q.x -= dx * f; q.y -= dy * f; } else { p.x += dx * f * 0.5; p.y += dy * f * 0.5; q.x -= dx * f * 0.5; q.y -= dy * f * 0.5; } }
  }
  const cols = ["#A51E2A", "#8E1822", "#B62A33"];
  for (let c = 0; c < 3; c++) { g.strokeStyle = cols[c]; g.lineWidth = 0.8; g.beginPath();
    for (const s of F.strands) { if (s.col !== c) continue; s.pts.forEach((p, j) => (j ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); } g.stroke(); }
  g.strokeStyle = "rgba(255,180,170,0.32)"; g.lineWidth = 0.3; g.beginPath();   // the silk catches the light along each thread
  for (const s of F.strands) { const q = s.pts; for (let j = 1; j < q.length * 0.7; j++) { g.moveTo(q[j - 1].x - 0.2, q[j - 1].y); g.lineTo(q[j].x - 0.2, q[j].y); } }
  g.stroke();
  g.restore();
}

// ----------------------------------------------------------------
// 2iii  THE HOUSE FRONT, after Gaudí's Casa Vicens (1883–85), built as a real 3D model and lit by the sun.
// Every surface has its own material, generated brick by brick and tile by tile so nothing repeats:
// hand-made bricks in running bond with recessed mortar; coursed sandstone with chisel texture; glazed
// green-and-white and marigold tiles that catch the sky; painted wooden lattice shutters; wrought iron;
// glass; terracotta; a stone courtyard. Ledges, corbels and window reveals are real depth, so the sun
// throws real shadows. The music opens the shutters a little, lights the rooms behind the windows,
// lifts the fountain and stirs the palm and the plants.
// ----------------------------------------------------------------
const feria = { wave: -1, splash: 0, palm: { x: 0, v: 0 } };
const CASA = { ready: false };

function casaCv(w, h) { const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
// grey height canvas -> tangent-space normal map
function casaNormal(hc, k) {
  const w = hc.width, h = hc.height, src = hc.getContext("2d").getImageData(0, 0, w, h).data, out = casaCv(w, h), ctx = out.getContext("2d"), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[((Math.min(h - 1, Math.max(0, y))) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return out;
}
// add soft value noise to a canvas (multiplies colour by 1 ± amt)
function casaGrain(ctx, w, h, scale, amt, seed) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = 1 + (fbm(x / scale + seed, y / scale - seed) - 0.5) * 2 * amt, i = (y * w + x) * 4;
    d[i] *= n; d[i + 1] *= n; d[i + 2] *= n;
  }
  ctx.putImageData(img, 0, 0);
}
// one material made from three canvases painted together: colour, height and roughness
function casaMat(wM, hM, ppm, seed, paint, o = {}) {
  const T = THREE, w = Math.round(wM * ppm), h = Math.round(hM * ppm);
  const C = casaCv(w, h), Hh = casaCv(w, h), R = casaCv(w, h);
  paint({ C: C.getContext("2d"), H: Hh.getContext("2d"), R: R.getContext("2d"), w: C.width, h: C.height, ppm, r: seeded(seed) });
  const tex = (c, srgb) => { const t = new T.CanvasTexture(c); t.anisotropy = CASA.aniso; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  const m = new T.MeshStandardMaterial(Object.assign({ map: tex(C, true), normalMap: tex(casaNormal(Hh, o.bump || 3)), roughnessMap: tex(R), roughness: 1, metalness: 0 }, o.mat || {}));
  m.normalScale.set(1, 1);
  return m;
}
const rgb = (c, k = 1) => `rgb(${Math.round(Math.min(255, c[0] * k))},${Math.round(Math.min(255, c[1] * k))},${Math.round(Math.min(255, c[2] * k))})`;
const grey = v => `rgb(${v},${v},${v})`;

// hand-made bricks in running bond
function brickMat(wM, hM, seed, base) {
  return casaMat(wM, hM, 150, seed, ({ C, H, R, w, h, ppm, r }) => {
    const bw = 0.285 * ppm, bh = 0.052 * ppm, j = 0.011 * ppm;
    C.fillStyle = "rgb(196,176,150)"; C.fillRect(0, 0, w, h); H.fillStyle = grey(70); H.fillRect(0, 0, w, h); R.fillStyle = grey(235); R.fillRect(0, 0, w, h);
    for (let row = 0, y = h - bh; y > -bh; row++, y -= bh + j) {
      for (let x = -((row % 2) * (bw + j) / 2) - r() * 2; x < w; x += bw + j) {
        const k = 0.82 + r() * 0.3, burnt = r() < 0.12 ? 0.75 : 1, c = [base[0] * k * burnt, base[1] * k * burnt * (0.95 + r() * 0.1), base[2] * k * burnt];
        C.fillStyle = rgb(c); C.fillRect(x, y, bw, bh);
        for (let s = 0; s < 8; s++) { C.fillStyle = r() < 0.5 ? "rgba(70,25,15,0.35)" : "rgba(235,190,150,0.25)"; C.fillRect(x + r() * bw, y + r() * bh, 1, 1); }
        H.fillStyle = grey(205 + Math.round(r() * 30)); H.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
        for (let s = 0; s < 3; s++) { H.fillStyle = grey(120); H.beginPath(); H.arc(x + (r() < 0.5 ? 0 : bw) + (r() - 0.5) * 3, y + r() * bh, 0.6 + r() * 1.2, 0, TAU); H.fill(); }
        R.fillStyle = grey(200 + Math.round(r() * 30)); R.fillRect(x, y, bw, bh);
      }
    }
    casaGrain(C, w, h, 6, 0.08, seed);
  }, { bump: 4 });
}
// coursed sandstone: courses of uneven height, blocks of uneven length, chisel texture
function stoneMat(wM, hM, seed) {
  return casaMat(wM, hM, 130, seed, ({ C, H, R, w, h, ppm, r }) => {
    C.fillStyle = "rgb(184,160,128)"; C.fillRect(0, 0, w, h); H.fillStyle = grey(60); H.fillRect(0, 0, w, h); R.fillStyle = grey(240); R.fillRect(0, 0, w, h);
    const j = 0.014 * ppm;
    for (let y = h; y > 0;) {
      const ch = (0.22 + r() * 0.14) * ppm; let x = -r() * 0.4 * ppm;
      while (x < w) {
        const bw = (0.32 + r() * 0.5) * ppm, k = 0.88 + r() * 0.2;
        C.fillStyle = rgb([214 * k, 178 * k * (0.97 + r() * 0.05), 128 * k]); C.fillRect(x + j / 2, y - ch + j / 2, bw - j, ch - j);
        H.fillStyle = grey(190 + Math.round(r() * 40)); H.beginPath(); H.roundRect ? H.roundRect(x + j / 2, y - ch + j / 2, bw - j, ch - j, 3) : H.rect(x + j / 2, y - ch + j / 2, bw - j, ch - j); H.fill();
        for (let s = 0; s < bw * ch / 30; s++) { const px = x + j / 2 + r() * (bw - j), py = y - ch + j / 2 + r() * (ch - j); H.fillStyle = grey(150 + Math.round(r() * 90)); H.fillRect(px, py, 1 + r() * 2, 1); }
        R.fillStyle = grey(215 + Math.round(r() * 30)); R.fillRect(x, y - ch, bw, ch);
        x += bw;
      }
      y -= ch;
    }
    casaGrain(C, w, h, 9, 0.12, seed);
  }, { bump: 3.5 });
}
// glazed tiles, each one its own: glaze tint, pooling, a little crazing; grout recessed between them
function tileMat(wM, hM, seed, tileM, painter, o = {}) {
  return casaMat(wM, hM, o.ppm || 260, seed, ({ C, H, R, w, h, ppm, r }) => {
    const s = tileM * ppm, j = Math.max(1, 0.004 * ppm);
    C.fillStyle = "rgb(178,170,152)"; C.fillRect(0, 0, w, h); H.fillStyle = grey(40); H.fillRect(0, 0, w, h); R.fillStyle = grey(230); R.fillRect(0, 0, w, h);
    const nx = Math.round(w / s), ny = Math.max(1, Math.round(h / s)), sx = w / nx, sy = h / ny;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const x = ix * sx + j / 2, y = iy * sy + j / 2, tw = sx - j, th = sy - j;
      C.save(); C.beginPath(); C.rect(x, y, tw, th); C.clip(); C.translate(x, y);
      painter(C, tw, th, ix, iy, r);
      const gl = C.createRadialGradient(tw * 0.3, th * 0.3, 0, tw * 0.5, th * 0.5, tw * 0.8);   // the glaze pools a touch at the edges
      gl.addColorStop(0, "rgba(255,255,255,0.07)"); gl.addColorStop(1, "rgba(40,40,30,0.08)"); C.fillStyle = gl; C.fillRect(0, 0, tw, th);
      C.restore();
      H.fillStyle = grey(170); H.fillRect(x, y, tw, th); H.fillStyle = grey(215 + Math.round(r() * 25)); H.fillRect(x + 1, y + 1, tw - 2, th - 2);
      H.strokeStyle = grey(200); H.lineWidth = 0.6; H.beginPath(); for (let c = 0; c < 2; c++) { let px = x + r() * tw, py = y + r() * th; H.moveTo(px, py); for (let q = 0; q < 4; q++) { px += (r() - 0.5) * tw * 0.4; py += (r() - 0.5) * th * 0.4; H.lineTo(px, py); } } H.stroke();
      R.fillStyle = grey(28 + Math.round(r() * 22)); R.fillRect(x, y, tw, th);
      if (r() < 0.06) { C.fillStyle = "rgba(200,190,170,0.9)"; C.beginPath(); C.arc(x + (r() < 0.5 ? 1 : tw - 1), y + r() * th, 1 + r() * 1.5, 0, TAU); C.fill(); } // a chipped corner
    }
  }, { bump: o.bump || 2.5, mat: Object.assign({ userData: { glossy: true } }, o.mat) });
}
const tint = (c, r, k = 10) => rgb([c[0] + (r() - 0.5) * k, c[1] + (r() - 0.5) * k, c[2] + (r() - 0.5) * k]);
const GREEN = [26, 112, 82], WHITE = [238, 234, 220], TERRA = [176, 64, 44];
const checkerP = (C, w, h, ix, iy, r) => { C.fillStyle = tint((ix + iy) % 2 ? GREEN : WHITE, r, 14); C.fillRect(0, 0, w, h); };
const marigoldP = (C, w, h, ix, iy, r) => {
  C.fillStyle = tint(WHITE, r, 8); C.fillRect(0, 0, w, h); C.translate(w / 2, h / 2); C.rotate(Math.floor(r() * 4) * Math.PI / 2);
  for (let l = 0; l < 4; l++) { C.save(); C.rotate(l * Math.PI / 2 + 0.6); C.beginPath(); C.ellipse(0, -w * 0.38, w * 0.06, w * 0.12, 0, 0, TAU); C.fillStyle = tint([34, 104, 96], r, 16); C.fill(); C.restore(); }
  const R0 = w * (0.36 + r() * 0.02);
  for (let p = 0; p < 14; p++) { C.save(); C.rotate(p * TAU / 14 + r() * 0.1); C.beginPath(); C.ellipse(0, -R0 * 0.62, R0 * 0.2, R0 * 0.42, 0, 0, TAU); C.fillStyle = tint(p % 2 ? [236, 140, 40] : [245, 182, 70], r, 14); C.fill(); C.restore(); }
  C.beginPath(); C.arc(0, 0, R0 * 0.33, 0, TAU); C.fillStyle = tint([214, 110, 30], r, 10); C.fill();
  for (let d = 0; d < 7; d++) { C.beginPath(); C.arc(Math.cos(d) * R0 * 0.16, Math.sin(d) * R0 * 0.16, Math.max(0.8, R0 * 0.05), 0, TAU); C.fillStyle = "rgb(110,58,20)"; C.fill(); }
};
const plainP = col => (C, w, h, ix, iy, r) => { C.fillStyle = tint(col, r, 10); C.fillRect(0, 0, w, h); };
// painted wooden lattice woven like a basket
function latticeMat(wM, hM, seed) {
  return casaMat(wM, hM, 260, seed, ({ C, H, R, w, h, ppm, r }) => {
    C.fillStyle = "rgb(40,26,18)"; C.fillRect(0, 0, w, h); H.fillStyle = grey(20); H.fillRect(0, 0, w, h); R.fillStyle = grey(240); R.fillRect(0, 0, w, h);
    const cs = 0.085 * ppm, fr = 0.05 * ppm;
    for (let y = fr; y < h - fr; y += cs) for (let x = fr; x < w - fr; x += cs) {
      const horiz = (Math.round(x / cs) + Math.round(y / cs)) % 2 === 0;
      for (let b = 0; b < 3; b++) {
        const rx = horiz ? x + cs * 0.08 : x + cs * (0.1 + b * 0.29), ry = horiz ? y + cs * (0.1 + b * 0.29) : y + cs * 0.08, rw = horiz ? cs * 0.84 : cs * 0.22, rh = horiz ? cs * 0.22 : cs * 0.84;
        C.fillStyle = tint([226, 206, 152], r, 14); C.fillRect(rx, ry, rw, rh);
        const gg = horiz ? H.createLinearGradient(0, ry, 0, ry + rh) : H.createLinearGradient(rx, 0, rx + rw, 0); gg.addColorStop(0, grey(150)); gg.addColorStop(0.5, grey(235)); gg.addColorStop(1, grey(150));
        H.fillStyle = gg; H.fillRect(rx, ry, rw, rh); R.fillStyle = grey(170); R.fillRect(rx, ry, rw, rh);
      }
    }
    // the frame of the shutter
    C.strokeStyle = "rgb(204,180,124)"; C.lineWidth = fr; C.strokeRect(fr / 2, fr / 2, w - fr, h - fr);
    H.strokeStyle = grey(240); H.lineWidth = fr; H.strokeRect(fr / 2, fr / 2, w - fr, h - fr);
    R.strokeStyle = grey(160); R.lineWidth = fr; R.strokeRect(fr / 2, fr / 2, w - fr, h - fr);
    casaGrain(C, w, h, 3, 0.07, seed);
  }, { bump: 5 });
}
// big stone slabs in the courtyard
function pavingMat(wM, hM, seed) {
  return casaMat(wM, hM, 60, seed, ({ C, H, R, w, h, ppm, r }) => {
    C.fillStyle = "rgb(120,110,96)"; C.fillRect(0, 0, w, h); H.fillStyle = grey(60); H.fillRect(0, 0, w, h); R.fillStyle = grey(240); R.fillRect(0, 0, w, h);
    for (let y = 0; y < h;) { const sh = (0.5 + r() * 0.3) * ppm; for (let x = -r() * ppm * 0.5; x < w;) { const sw = (0.6 + r() * 0.6) * ppm, k = 0.9 + r() * 0.15;
      C.fillStyle = rgb([176 * k, 166 * k, 148 * k]); C.fillRect(x + 1, y + 1, sw - 2, sh - 2); H.fillStyle = grey(200 + Math.round(r() * 40)); H.fillRect(x + 1, y + 1, sw - 2, sh - 2); R.fillStyle = grey(200); R.fillRect(x, y, sw, sh); x += sw; } y += sh; }
    casaGrain(C, w, h, 7, 0.1, seed);
  }, { bump: 2 });
}

function casaBuild() {
  const T = THREE, scene = new T.Scene();
  const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.72;
  CASA.aniso = r.capabilities.getMaxAnisotropy();
  const cam = new T.PerspectiveCamera(30, 0.8, 0.5, 300);
  const add = (geo, mat, x, y, z, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m; };
  const plain = (c, rough = 0.9, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: rough, metalness: 0 }, extra));
  const glaze = { mat: { roughness: 1 } };

  // sky: a deep blue overhead fading to a hazy horizon, a few high clouds
  const sky = casaCv(512, 512), sc = sky.getContext("2d");
  const sg = sc.createLinearGradient(0, 0, 0, 512); sg.addColorStop(0, "#5D8FD6"); sg.addColorStop(0.65, "#A9C5E8"); sg.addColorStop(1, "#E6E4DA");
  sc.fillStyle = sg; sc.fillRect(0, 0, 512, 512);
  const rr = seeded(5);
  for (let i = 0; i < 26; i++) { const x = rr() * 512, y = 40 + rr() * 220, cw = 60 + rr() * 140; const cg = sc.createRadialGradient(x, y, 0, x, y, cw * 0.5); cg.addColorStop(0, "rgba(255,255,255,0.35)"); cg.addColorStop(1, "rgba(255,255,255,0)"); sc.fillStyle = cg; sc.save(); sc.translate(x, y); sc.scale(1, 0.22); sc.translate(-x, -y); sc.beginPath(); sc.arc(x, y, cw * 0.5, 0, TAU); sc.fill(); sc.restore(); }
  const skyTex = new T.CanvasTexture(sky); skyTex.encoding = T.sRGBEncoding;
  const skyPlane = new T.Mesh(new T.PlaneGeometry(220, 120), new T.MeshBasicMaterial({ map: skyTex, fog: false, toneMapped: false })); skyPlane.position.set(0, 38, -90); scene.add(skyPlane);
  // environment for reflections in glaze and glass: the same sky, a bright sun, warm ground
  const envScene = new T.Scene();
  envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.ShaderMaterial({ side: T.BackSide, uniforms: {}, vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "varying vec3 vP; void main(){ vec3 d = normalize(vP); vec3 sky = mix(vec3(.75,.85,.95), vec3(.30,.48,.85), clamp(d.y * 1.5, 0., 1.)); vec3 gr = vec3(.42,.38,.32); vec3 c = d.y > 0. ? sky : mix(vec3(.75,.8,.85), gr, clamp(-d.y * 4., 0., 1.)); c += vec3(6., 5.4, 4.6) * pow(max(dot(d, normalize(vec3(-.5,.6,.6))), 0.), 300.); gl_FragColor = vec4(c, 1.); }" })));
  const pm = new T.PMREMGenerator(r); scene.environment = pm.fromScene(envScene, 0.02).texture;
  scene.fog = new T.Fog(0xB9C8D8, 55, 200);

  // light: a low afternoon sun from the upper left, and the sky
  const sun = new T.DirectionalLight(0xFFE2BC, 2.4); sun.position.set(-17, 15, 13); sun.target.position.set(0, 6, 0); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 2.5;
  scene.add(new T.HemisphereLight(0xBFD4F0, 0x8A7560, 0.2));

  // the courtyard
  const ground = add(new T.PlaneGeometry(40, 30), pavingMat(40, 30, 3), 0, 0, 5, { cast: false }); ground.rotation.x = -Math.PI / 2;
  // trees beyond the house: dark cypresses and a pine, softened by the air
  for (const [x, z, hh] of [[-9.5, -12, 11], [-12, -20, 13], [9.8, -13, 10], [12.5, -18, 14], [-7.5, -22, 9], [8, -24, 12]]) {
    const tree = new T.Group(); tree.position.set(x, 0, z); scene.add(tree);
    add(new T.CylinderGeometry(0.12, 0.18, hh * 0.2, 6), plain(0x3A2C20, 1), 0, hh * 0.1, 0, { parent: tree });
    for (let k = 0; k < 9; k++) { // a cypress is a column of dense, lumpy clumps
      const s2 = k / 8, rad = hh * 0.13 * (1 - s2 * 0.75) * (0.85 + noise2(k, x) * 0.3), geo = new T.IcosahedronGeometry(rad, 4), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = new T.Vector3().fromBufferAttribute(p, i), n = 1 + (noise2(v.x * 1.6 / rad + k * 7 + x, v.y * 1.6 / rad + v.z * 1.1 / rad) - 0.5) * 0.35; p.setXYZ(i, v.x * n, v.y * n * 1.6, v.z * n); }
      geo.computeVertexNormals(); add(geo, plain(k % 2 ? 0x22351E : 0x1C2E1A, 1), (noise2(k, z) - 0.5) * 0.3, hh * (0.22 + s2 * 0.72), 0, { parent: tree });
    }
  }
  const back = add(new T.BoxGeometry(12, 8.5, 9), plain(0xA67C60, 1), 0, 4.25, -5); // the body of the house behind the front

  // ---- the front, storey by storey (metres; ground at y = 0, the front face at z = 0) ----
  const W = 12, X0 = -W / 2;
  const wallWithHoles = (y0, y1, holes, mat) => { // a wall panel with openings; returns the mesh
    const s = new T.Shape(); s.moveTo(X0, y0); s.lineTo(X0 + W, y0); s.lineTo(X0 + W, y1); s.lineTo(X0, y1); s.closePath();
    holes.forEach(hp => s.holes.push(hp));
    const geo = new T.ShapeGeometry(s, 12), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - X0) / W, (uv.getY(i) - y0) / (y1 - y0));
    return add(geo, mat, 0, 0, 0);
  };
  const reveal = (shape, depth, mat) => { // the depth of an opening: only its sides
    const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 });
    const m = add(geo, [new T.MeshBasicMaterial({ visible: false }), mat], 0, 0, -depth); return m;
  };
  const rect = (x, y, w, h) => { const s = new T.Path(); s.moveTo(x, y); s.lineTo(x, y + h); s.lineTo(x + w, y + h); s.lineTo(x + w, y); s.closePath(); return s; };
  const rectS = (x, y, w, h) => { const s = new T.Shape(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.closePath(); return s; };
  const arch = (x, y, w, h, P) => { const s = new P(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h - w * 0.75);
    s.quadraticCurveTo(x + w, y + h - w * 0.15, x + w / 2, y + h); s.quadraticCurveTo(x, y + h - w * 0.15, x, y + h - w * 0.75); s.closePath(); return s; };
  const band = (y, h, depth, mat, x = X0, w = W) => add(new T.BoxGeometry(w, h, depth), mat, x + w / 2, y + h / 2, depth / 2);
  const brickRed = [168, 52, 40], brickDark = [128, 36, 30];
  CASA.lights = []; CASA.shutters = []; CASA.lowShutters = [];
  const interior = i => { const m = new T.MeshStandardMaterial({ color: 0x1A0E08, roughness: 1, emissive: 0xFFB060, emissiveIntensity: 0.1 }); CASA.lights.push(m); return m; };
  const glass = new T.MeshPhysicalMaterial({ color: 0x0A0C10, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.4 });
  const iron = plain(0x1A1A1C, 0.45, { metalness: 0.65, side: T.DoubleSide });
  const corbelMat = brickMat(0.6, 0.6, 31, brickRed);

  // ground floor (0 – 3.1): dark brick, four lattice openings and a niche for the fountain
  const gOpen = [[-5.2, 2.1], [-3.0, 2.1], [0.9, 2.1], [3.1, 2.1]];
  const gHoles = gOpen.map(([x, w]) => rect(x, 0.35, w, 2.45)).concat([arch(-0.55, 0.35, 1.1, 2.35, T.Path)]);
  wallWithHoles(0, 3.1, gHoles, brickMat(W, 3.1, 11, brickDark));
  gOpen.forEach(([x, w], i) => {
    reveal(rectS(x, 0.35, w, 2.45), 0.35, brickMat(1, 1, 40 + i, brickDark));
    add(new T.BoxGeometry(w, 2.45, 0.05), interior(), x + w / 2, 1.575, -0.6, { cast: false });
    const lm = latticeMat(w / 2, 2.45, 60 + i);
    for (const side of [0, 1]) { const piv = new T.Group(); piv.position.set(side ? x + w : x, 0.35, -0.15); scene.add(piv);
      const leafM = add(new T.BoxGeometry(w / 2, 2.45, 0.05), lm, (side ? -1 : 1) * w / 4, 1.225, 0, { parent: piv }); CASA.lowShutters.push([piv, side]); }
  });
  reveal(arch(-0.55, 0.35, 1.1, 2.35, T.Shape), 0.5, tileMat(1.2, 2.4, 70, 0.15, marigoldP));
  add(new T.PlaneGeometry(1.1, 2.4), tileMat(1.1, 2.4, 71, 0.15, marigoldP), 0, 1.55, -0.49, { cast: false });
  // marigold frieze, balcony slab edged with checker tiles, corbels under it
  band(3.1, 0.45, 0.04, tileMat(W, 0.45, 72, 0.225, marigoldP));
  band(3.55, 0.22, 0.75, tileMat(W, 0.22, 73, 0.11, checkerP));
  const corbel = (y, z0, n) => { for (let i = 0; i < n; i++) { const x = X0 + (i + 0.5) * W / n;
    add(new T.BoxGeometry(0.34, 0.12, z0), corbelMat, x, y - 0.06, z0 / 2); add(new T.BoxGeometry(0.24, 0.12, z0 * 0.7), corbelMat, x, y - 0.18, z0 * 0.35); add(new T.BoxGeometry(0.14, 0.12, z0 * 0.4), corbelMat, x, y - 0.3, z0 * 0.2); } };
  corbel(3.55, 0.7, 16);

  // stone storey (3.77 – 6.5): four tall openings with lattice shutters, an iron balcony along the front
  const sOpen = [-4.4, -2.3, 1.3, 3.4], sw = 1.0;
  wallWithHoles(3.77, 6.5, sOpen.map(x => rect(x, 3.95, sw, 2.25)), stoneMat(W, 2.73, 12));
  sOpen.forEach((x, i) => {
    reveal(rectS(x, 3.95, sw, 2.25), 0.4, stoneMat(1.2, 1, 80 + i));
    add(new T.BoxGeometry(sw, 2.25, 0.05), interior(), x + sw / 2, 5.075, -0.65, { cast: false });
    const lm = latticeMat(sw / 2, 2.25, 90 + i);
    for (const side of [0, 1]) { const piv = new T.Group(); piv.position.set(side ? x + sw : x, 3.95, -0.12); scene.add(piv);
      add(new T.BoxGeometry(sw / 2, 2.25, 0.05), lm, (side ? -1 : 1) * sw / 4, 1.125, 0, { parent: piv }); CASA.shutters.push([piv, side, i]); }
    add(new T.BoxGeometry(sw + 0.24, 0.1, 0.14), stoneMat(1.3, 0.1, 85 + i), x + sw / 2, 6.26, 0.07); // lintel
  });
  // wrought iron: rails, bars, and C-scrolls between them
  const rz = 0.68, ry0 = 3.77, rh = 1.0;
  add(new T.BoxGeometry(W - 0.3, 0.05, 0.05), iron, 0, ry0 + rh, rz); add(new T.BoxGeometry(W - 0.3, 0.04, 0.04), iron, 0, ry0 + 0.1, rz);
  const nB = 26, bars = new T.InstancedMesh(new T.CylinderGeometry(0.014, 0.014, rh, 6), iron, nB + 1), M4 = new T.Matrix4();
  for (let i = 0; i <= nB; i++) { M4.makeTranslation(X0 + 0.15 + i * (W - 0.3) / nB, ry0 + rh / 2, rz); bars.setMatrixAt(i, M4); }
  bars.castShadow = true; scene.add(bars);
  const scrollCurve = new T.CatmullRomCurve3([[0, 0.5], [0.12, 0.62], [0.2, 0.8], [0.12, 0.9], [0.05, 0.84], [0.08, 0.76]].map(([x, y]) => new T.Vector3(x, y, 0)));
  const scrollGeo = new T.TubeGeometry(scrollCurve, 24, 0.009, 5, false), scrolls = new T.InstancedMesh(scrollGeo, iron, nB * 4);
  let si = 0; const bw = (W - 0.3) / nB;
  for (let i = 0; i < nB; i++) { const cx = X0 + 0.15 + (i + 0.5) * bw;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { M4.makeScale(sx * bw * 2.2, sy * rh * 0.9, 1).setPosition(cx, sy > 0 ? ry0 : ry0 + rh, rz); scrolls.setMatrixAt(si++, M4); } }
  scrolls.castShadow = true; scene.add(scrolls);

  // bands between the storeys: checker, marigold, checker
  band(6.5, 0.2, 0.08, tileMat(W, 0.2, 74, 0.1, checkerP));
  band(6.7, 0.5, 0.04, tileMat(W, 0.5, 75, 0.25, marigoldP));
  band(7.2, 0.2, 0.08, tileMat(W, 0.2, 76, 0.1, checkerP));

  // upper floor (7.4 – 10.1): red brick, six tall pointed windows with white glazed jambs, a tiled pillar in the middle
  const uOpen = [-5.25, -3.75, -2.25, 1.35, 2.85, 4.35], uw = 0.9;
  wallWithHoles(7.4, 10.1, uOpen.map(x => arch(x, 7.65, uw, 2.15, T.Path)), brickMat(W, 2.7, 13, brickRed));
  uOpen.forEach((x, i) => {
    reveal(arch(x, 7.65, uw, 2.15, T.Shape), 0.3, brickMat(1, 1, 100 + i, brickRed));
    const gs = new T.ShapeGeometry(arch(x, 7.65, uw, 2.15, T.Shape), 10); add(gs, glass, 0, 0, -0.22, { cast: false });
    add(new T.ShapeGeometry(arch(x, 7.65, uw, 2.15, T.Shape), 10), interior(), 0, 0, -0.5, { cast: false });
    add(new T.BoxGeometry(0.03, 2.0, 0.03), plain(0x2A2420, 0.6), x + uw / 2, 8.65, -0.2); // the glazing bar
    for (const jx of [x - 0.16, x + uw]) add(new T.BoxGeometry(0.16, 1.95, 0.1), tileMat(0.16, 1.95, 110 + i * 2 + (jx > x ? 1 : 0), 0.16, plainP(WHITE)), jx + 0.08, 7.65 + 0.975, 0.05);
  });
  add(new T.BoxGeometry(1.1, 2.7, 0.14), tileMat(1.1, 2.7, 77, 0.137, checkerP), 0, 8.75, 0.07);
  // the cornice: checker tiles over stepped corbels
  band(10.1, 0.26, 0.55, tileMat(W, 0.26, 78, 0.13, checkerP), X0 - 0.15, W + 0.3);
  corbel(10.1, 0.5, 20);

  // the gable (10.36 – 13.2) with stepped bands of tile, coping tiles along its edges
  const gH = 2.85, gy = 10.36, gs = new T.Shape(); gs.moveTo(X0, gy); gs.lineTo(X0 + W, gy); gs.lineTo(0, gy + gH); gs.closePath();
  const gGeo = new T.ShapeGeometry(gs), gu = gGeo.attributes.uv; for (let i = 0; i < gu.count; i++) gu.setXY(i, (gu.getX(i) - X0) / W, (gu.getY(i) - gy) / gH);
  add(gGeo, brickMat(W, gH, 14, brickRed), 0, 0, 0);
  for (let k = 0; k < 5; k++) { const yk = gy + 0.35 + k * 0.48, hw = (W / 2) * (1 - (yk + 0.2 - gy) / gH) - 0.45; if (hw < 0.3) break;
    band(yk, 0.16, 0.05, tileMat(hw * 2, 0.16, 120 + k, 0.08, k % 2 ? plainP(WHITE) : checkerP), -hw, hw * 2); }
  const slope = Math.atan2(gH, W / 2), edgeL = Math.hypot(gH, W / 2) + 0.4;
  for (const sd of [-1, 1]) { const m = add(new T.BoxGeometry(edgeL, 0.24, 0.3), tileMat(edgeL, 0.24, 130 + sd, 0.12, checkerP), sd * W / 4, gy + gH / 2 + 0.1, 0.1); m.rotation.z = -sd * slope; }

  // the little tower: a tiled shaft and a glazed cupola
  add(new T.BoxGeometry(1.15, 2.5, 1.15), tileMat(1.15, 2.5, 140, 0.115, checkerP), 0, 13.1 + 1.25 - 0.4, -0.7);
  add(new T.BoxGeometry(1.4, 0.16, 1.4), plain(0xB8402E, 0.5), 0, 14.35, -0.7);
  const cup = add(new T.ConeGeometry(0.95, 1.5, 8, 1), tileMat(3, 1.5, 141, 0.12, (C, w, h, ix, iy, r) => { C.fillStyle = tint((ix + iy) % 3 ? TERRA : GREEN, r, 16); C.fillRect(0, 0, w, h); }, { ppm: 160 }), 0, 15.18, -0.7);
  cup.rotation.y = Math.PI / 8;
  add(new T.SphereGeometry(0.1, 12, 8), plain(0xC8A040, 0.3, { metalness: 0.8 }), 0, 16.0, -0.7);

  // the fountain in front: a tiled basin, water, a stone bowl on a column
  const basinMat = tileMat(9, 0.5, 150, 0.15, marigoldP);
  const basin = add(new T.CylinderGeometry(1.5, 1.5, 0.5, 48, 1, true), basinMat, 0, 0.25, 1.9); basin.material.side = T.DoubleSide;
  add(new T.TorusGeometry(1.5, 0.06, 8, 64), plain(0xD8CBB4, 0.7), 0, 0.5, 1.9).rotation.x = Math.PI / 2;
  const water = add(new T.CircleGeometry(1.48, 48), new T.MeshPhysicalMaterial({ color: 0x2F5A66, roughness: 0.05, metalness: 0, envMapIntensity: 1.2 }), 0, 0.42, 1.9, { cast: false }); water.rotation.x = -Math.PI / 2;
  const stoneW = plain(0xDCCFB8, 0.8);
  add(new T.LatheGeometry([[0.0, 0], [0.18, 0], [0.12, 0.2], [0.1, 1.0], [0.16, 1.1]].map(([x, y]) => new T.Vector2(x, y)), 20), stoneW, 0, 0.42, 1.9);
  add(new T.LatheGeometry([[0.05, 0], [0.4, 0.12], [0.62, 0.3], [0.6, 0.34], [0.0, 0.2]].map(([x, y]) => new T.Vector2(x, y)), 32), stoneW, 0, 1.5, 1.9);
  // water jets: curved strands from the bowl, and drops
  const jetMat = new T.MeshPhysicalMaterial({ color: 0xE8F4F8, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1.5 });
  const jetCurve = new T.QuadraticBezierCurve3(new T.Vector3(0, 0, 0), new T.Vector3(0.35, 1, 0), new T.Vector3(0.7, 0, 0));
  const jetGeo = new T.TubeGeometry(jetCurve, 20, 0.012, 5, false);
  CASA.jets = [];
  for (let k = 0; k < 8; k++) { const j = new T.Mesh(jetGeo, jetMat); j.position.set(0, 1.84, 1.9); j.rotation.y = k * TAU / 8; scene.add(j); CASA.jets.push(j); }
  const dropGeo = new T.BufferGeometry(); dropGeo.setAttribute("position", new T.Float32BufferAttribute(new Float32Array(120 * 3), 3));
  CASA.drops = new T.Points(dropGeo, new T.PointsMaterial({ color: 0xF2FAFC, size: 0.035, transparent: true, opacity: 0.8 })); scene.add(CASA.drops);

  // terracotta pots with agaves, in the courtyard and on the balcony
  const terra = casaMat(1, 1, 128, 160, ({ C, H, R, w, h }) => { C.fillStyle = "rgb(184,98,62)"; C.fillRect(0, 0, w, h); casaGrain(C, w, h, 4, 0.12, 3); H.fillStyle = grey(128); H.fillRect(0, 0, w, h); R.fillStyle = grey(220); R.fillRect(0, 0, w, h); });
  const potGeo = new T.LatheGeometry([[0, 0], [0.32, 0], [0.42, 0.55], [0.48, 0.6], [0.48, 0.66], [0.42, 0.66], [0.4, 0.6]].map(([x, y]) => new T.Vector2(x, y)), 28);
  const bladeGeo = (() => { const g2 = new T.BufferGeometry(), P = [], I = []; const n = 8;
    for (let i = 0; i <= n; i++) { const s = i / n, w2 = 0.07 * (1 - s) ** 0.8 + 0.004, y = s, z = s * s * 0.35; P.push(-w2, y, z, 0, y, z - 0.015 * (1 - s), w2, y, z); }
    for (let i = 0; i < n; i++) { const a = i * 3; I.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    g2.setAttribute("position", new T.Float32BufferAttribute(P, 3)); g2.setIndex(I); g2.computeVertexNormals(); return g2; })();
  const agaveMat = new T.MeshStandardMaterial({ color: 0x5E8C5A, roughness: 0.55, side: T.DoubleSide });
  CASA.plants = [];
  const pot = (x, y, z, s) => { add(potGeo, terra, x, y, z).scale.setScalar(s); const plant = new T.Group(); plant.position.set(x, y + 0.6 * s, z); plant.scale.setScalar(s * 1.6); scene.add(plant);
    const rp = seeded(Math.round(x * 13 + z * 7));
    for (let k = 0; k < 14; k++) { const b = new T.Mesh(bladeGeo, agaveMat); b.castShadow = true; b.rotation.order = "YXZ"; b.rotation.y = k * 2.4; b.rotation.x = -(0.25 + rp() * 0.55); b.scale.set(1, 0.7 + rp() * 0.5, 1); plant.add(b); }
    CASA.plants.push(plant); };
  pot(-5.4, 0, 2.8, 1.1); pot(5.4, 0, 2.8, 1.1); pot(-2.3, 0, 2.6, 0.8); pot(2.3, 0, 2.6, 0.8);
  pot(-5.5, 3.77, 0.3, 0.55); pot(5.5, 3.77, 0.3, 0.55);

  // a palm reaching in from the right, in front of the house
  const palm = new T.Group(); palm.position.set(7.6, 13.6, 7); scene.add(palm); CASA.palm = palm;
  const trunk = add(new T.CylinderGeometry(0.22, 0.3, 14, 12), plain(0x6E5A44, 1), 0.5, -7, 0, { parent: palm }); trunk.rotation.z = -0.06;
  const leafletMat = new T.MeshStandardMaterial({ color: 0x3E6E34, roughness: 0.6, side: T.DoubleSide });
  CASA.fronds = [];
  for (let f = 0; f < 11; f++) {
    const fr = new T.Group(); fr.rotation.order = "YZX"; fr.rotation.y = f * TAU / 11 + 0.3; fr.rotation.z = 0.15 + (f % 3) * 0.25; palm.add(fr); CASA.fronds.push(fr);
    const L = 3.6 + (f % 4) * 0.4, pts = []; for (let i = 0; i <= 16; i++) { const s = i / 16; pts.push(new T.Vector3(s * L, -s * s * L * 0.55, 0)); }
    const curve = new T.CatmullRomCurve3(pts); add(new T.TubeGeometry(curve, 16, 0.03, 4), plain(0x5A6A38, 0.8), 0, 0, 0, { parent: fr });
    for (let i = 2; i < 30; i++) { const s = i / 30, p = curve.getPoint(s), tg = curve.getTangent(s), len = 0.95 * Math.sin(Math.PI * Math.min(1, s * 1.15)) + 0.15;
      for (const sd of [-1, 1]) { const lf = add(new T.PlaneGeometry(len, 0.075), leafletMat, p.x, p.y, p.z, { parent: fr }); lf.rotation.order = "YXZ";
        lf.rotation.y = sd * (Math.PI / 2 - 0.5); lf.rotation.z = Math.atan2(tg.y, tg.x) - 0.5; lf.translateX(len / 2); } }
  }

  // camera: eye height in the courtyard, a few metres to the left, looking up at the front
  scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { if (m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !(m.userData && m.userData.glossy)) m.envMapIntensity = 0.4; }); });
  cam.position.set(-2.6, 2.6, 37); cam.lookAt(0, 8.1, 0);
  Object.assign(CASA, { r, scene, cam, sun, glowS: new Array(16).fill(0), open: 0, lowOpen: 0, ready: true });
}

function feriaScene(t, dt, box) {
  if (typeof THREE === "undefined") return;
  if (!CASA.ready) casaBuild();
  const h = box.h, w = Math.min(box.w, h * 0.8), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const k = Math.min(DPR, Math.sqrt(4.2e6 / (w * h))), pw = Math.round(w * k), ph = Math.round(h * k);
  if (CASA.pw !== pw || CASA.ph !== ph) { CASA.pw = pw; CASA.ph = ph; CASA.r.setSize(pw, ph, false); CASA.cam.aspect = pw / ph; CASA.cam.updateProjectionMatrix(); }
  feria.splash *= Math.pow(0.15, dt); spring(feria.palm, dt, 4, 0.8);
  // the music: lights in the rooms, shutters, water, the palm
  const ease = (a, b, s) => a + (b - a) * Math.min(1, dt * s);
  CASA.lights.forEach((m, i) => { const e = Math.max(0, (S.spec[(i * 3 + 2) % 16] - 0.12) * 1.8); CASA.glowS[i] = ease(CASA.glowS[i] || 0, e, 4); m.emissiveIntensity = 0.08 + CASA.glowS[i] * 1.6; });
  CASA.open = ease(CASA.open, Math.min(1, S.mid * 1.2), 2); CASA.lowOpen = ease(CASA.lowOpen, Math.min(1, S.high * 1.6), 2);
  CASA.shutters.forEach(([piv, side, i]) => { piv.rotation.y = (side ? 1 : -1) * CASA.open * (i === 0 || i === 3 ? 0.55 : 0.85); });
  CASA.lowShutters.forEach(([piv, side]) => { piv.rotation.y = (side ? 1 : -1) * CASA.lowOpen * 0.5; });
  const sway = feria.palm.x * 0.12 + Math.sin(t * 0.6) * 0.03 + S.bass * 0.03;
  CASA.palm.rotation.z = sway * 0.4; CASA.fronds.forEach((f, i) => { f.rotation.x = Math.sin(t * 1.1 + i) * 0.04 * (1 + S.bass * 2) + sway * 0.5; });
  CASA.plants.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.3 + i) * 0.015 * (1 + S.bass * 3); });
  const jet = 0.5 + S.high * 1.1 + feria.splash * 0.6;
  CASA.jets.forEach((j, i) => { j.scale.set(0.9 + jet * 0.4, jet, 1); });
  const dp = CASA.drops.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) { const a = i * 2.399 + t * 0.7, ph2 = (t * 1.3 + i * 0.137) % 1, rr = (0.3 + ph2 * 0.5) * (0.9 + jet * 0.4);
    dp.setXYZ(i, Math.cos(a) * rr, 1.84 + jet * 4 * ph2 * (1 - ph2) * 0.9 - ph2 * 0.3, 1.9 + Math.sin(a) * rr); }
  dp.needsUpdate = true;
  CASA.r.render(CASA.scene, CASA.cam);
  g.drawImage(CASA.r.domElement, x0, y0, w, h);
}
