// ================================================================
// THE PAINT LAYER — turns a scene into a painting.
// Each frame the scene is drawn as usual, then repainted here with real strokes:
// every stroke follows the forms underneath (like a painter's hand), carries one loaded colour,
// has bristle marks and a thickness that catches the light, and sits on the ground the painter used:
// canvas, cardboard, gessoed panel, wet plaster or silk. Strokes stay put; their colour lives with the
// scene, and now and then a stroke is laid again (the "boil" of painted animation), faster when the music
// swells. Used only for pieces that are themselves oil paintings (Monet, Picasso, Munch, the Baroque
// heaven); architecture, textiles, prints, the tarot card and the photographic scenes keep their own rendering.
// ================================================================
const PAINT = { gl: null };

// size: stroke widths in pixels for the three layers (big underpainting, middle, fine detail)
// len/wid: stroke shape; jit: broken colour; keep: how much fine detail of the scene shows inside a stroke;
// imp: paint thickness; bristle: dry-brush streaks; curve: how much strokes bend; detail: how eagerly fine strokes follow edges
// ground: 0 canvas, 1 cardboard, 2 gessoed panel, 3 fresco plaster, 4 silk; gap: how much ground shows between strokes
const PAINT_STYLES = {
  // Monet, water lilies: short loaded dabs side by side, broken colour, thick paint, a little canvas showing
  monet:   { size: [18, 11, 6],  len: 1.7, wid: 0.62, jit: 0.08, hue: 0.03, keep: 0.42, imp: 0.3, bristle: 0.18, curve: 0.15, detail: 1.4, ground: 0, gap: 0.05, gloss: 0.1, cracks: 0,   varnish: 0.03, dir: 0.0, spread: 0.35, sat: 0.7, weave: 0.3, noise: 0 },
  // Picasso, The Old Guitarist (Blue Period): thin oil laid in long fluid strokes that follow the body, scumbled,
  // the canvas weave and earlier painting showing through
  blue:    { size: [22, 12, 6],  len: 3.4, wid: 0.45, jit: 0.04, hue: 0.01, keep: 0.62, imp: 0.12, bristle: 0.45, curve: 0.35, detail: 1.1, ground: 0, gap: 0.04, gloss: 0.10, cracks: 0,   varnish: 0.03, dir: 1.5708, spread: 0.6 },
  // Munch, The Scream: long swirling strokes of oil, tempera and pastel on cardboard, dry and broken, board showing
  munch:   { size: [20, 11, 6],  len: 4.2, wid: 0.40, jit: 0.10, hue: 0.04, keep: 0.12, imp: 0.45, bristle: 0.85, curve: 0.55, detail: 1.0, ground: 1, gap: 0.28, gloss: 0.04, cracks: 0,   varnish: 0.0,  dir: 0.35, spread: 0.9 },
  // Baroque oil: smooth glazes blended almost invisibly, impasto only in the lights, fine cracks, amber varnish
  baroque: { size: [20, 11, 6],  len: 2.6, wid: 0.70, jit: 0.03, hue: 0.01, keep: 0.70, imp: 0.18, bristle: 0.15, curve: 0.30, detail: 0.9, ground: 2, gap: 0.0,  gloss: 0.20, cracks: 0.25, varnish: 0.14, dir: 0.8, spread: 1.2 },
  // late-medieval tempera on a gessoed panel: fine parallel hatching, gold leaf that glints, an old crackle
  tempera: { size: [10, 6, 3.5], len: 2.8, wid: 0.32, jit: 0.06, hue: 0.02, keep: 0.45, imp: 0.15, bristle: 0.30, curve: 0.05, detail: 1.2, ground: 2, gap: 0.05, gloss: 0.05, cracks: 1.0, varnish: 0.12, dir: 0.6, spread: 0.15 },
  // fresco: pigment sunk into wet lime plaster, matte and chalky, soft strokes, hairline cracks
  fresco:  { size: [16, 9, 5],   len: 2.2, wid: 0.60, jit: 0.07, hue: 0.03, keep: 0.30, imp: 0.10, bristle: 0.40, curve: 0.20, detail: 1.1, ground: 3, gap: 0.12, gloss: 0.0,  cracks: 0.5, varnish: 0.0,  dir: 1.0, spread: 1.4 },
  // Spanish oil: confident loaded strokes, rich colour, visible canvas grain
  oil:     { size: [16, 9, 5],   len: 2.4, wid: 0.55, jit: 0.08, hue: 0.03, keep: 0.25, imp: 0.75, bristle: 0.50, curve: 0.25, detail: 1.2, ground: 0, gap: 0.06, gloss: 0.20, cracks: 0,   varnish: 0.06, dir: 0.8, spread: 1.0 },
  // a dark Romantic oil (the rainy chapel): low light, glazed shadows, impasto in the highlights
  night:   { size: [18, 10, 5],  len: 2.6, wid: 0.55, jit: 0.06, hue: 0.02, keep: 0.30, imp: 0.65, bristle: 0.55, curve: 0.30, detail: 1.2, ground: 0, gap: 0.04, gloss: 0.22, cracks: 0.3, varnish: 0.10, dir: 1.5708, spread: 0.5 },
  // nihonga: ground mineral pigment and glue on silk; flat soft strokes, a fine sparkle, the silk weave showing
  nihonga: { size: [12, 7, 4],   len: 2.0, wid: 0.60, jit: 0.05, hue: 0.02, keep: 0.45, imp: 0.12, bristle: 0.30, curve: 0.20, detail: 1.2, ground: 4, gap: 0.08, gloss: 0.06, cracks: 0,   varnish: 0.0,  dir: 0.0, spread: 0.6 }
};

const PAINT_COMMON = `#version 300 es
precision highp float;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.1 + 3.) * .3 + vn(p * 4.3 + 7.) * .2; }
`;
const PAINT_VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

// 1. which way the forms run: the structure tensor of the scene's brightness
const PAINT_FLOW = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; in vec2 vUv; out vec4 o;
float L(vec2 uv){ vec4 c = texture(uSrc, uBox.xy + uv * uBox.zw); return dot(c.rgb, vec3(.3, .59, .11)) * c.a; }
void main(){
  vec2 px = 1. / uRes; float xx = 0., yy = 0., xy = 0., w = 0.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 uv = vUv + vec2(i, j) * px * 1.5; float k = exp(-float(i * i + j * j) * .25);
    float gx = L(uv + vec2(px.x, 0)) - L(uv - vec2(px.x, 0)), gy = L(uv + vec2(0, px.y)) - L(uv - vec2(0, px.y));
    xx += gx * gx * k; yy += gy * gy * k; xy += gx * gy * k; w += k; }
  xx /= w; yy /= w; xy /= w;
  float coh = sqrt((xx - yy) * (xx - yy) + 4. * xy * xy) / (xx + yy + 1e-7);
  o = vec4(xx - yy, 2. * xy, sqrt(xx + yy), coh);
}`;

// 2. the strokes: three layers, each a jittered grid of strokes; every pixel finds the topmost stroke over it
const PAINT_STROKES = PAINT_COMMON + `
uniform sampler2D uSrc, uFlow; uniform vec4 uBox; uniform vec2 uRes; uniform vec3 uSize;
uniform float uT, uLen, uWid, uJit, uHue, uKeep, uBristle, uCurve, uDetail, uBoil, uSway, uDir, uSpread;
in vec2 vUv; layout(location = 0) out vec4 oCol; layout(location = 1) out vec4 oH;
vec4 src(vec2 px){ return texture(uSrc, uBox.xy + px / uRes * uBox.zw); }
vec3 hueRot(vec3 c, float a){ // rotate hue in YIQ
  float Y = dot(c, vec3(.299, .587, .114)), I = dot(c, vec3(.596, -.274, -.322)), Q = dot(c, vec3(.211, -.523, .312));
  float ca = cos(a), sa = sin(a); vec2 iq = vec2(I * ca - Q * sa, I * sa + Q * ca);
  return vec3(Y + .956 * iq.x + .621 * iq.y, Y - .272 * iq.x - .647 * iq.y, Y - 1.106 * iq.x + 1.703 * iq.y); }
void main(){
  vec2 px = gl_FragCoord.xy;
  vec4 here = src(px);
  float best = -1.; vec3 col = here.rgb; float h = 0., cover = 0.;
  for (int Lr = 0; Lr < 3; Lr++) {
    float S = uSize[Lr], fl = float(Lr);
    vec2 id = floor(px / S);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(i, j) + fl * 101.;
      float born = floor(uT * uBoil + h12(cid) * 7.);                 // when this stroke was last laid
      vec2 rs = h22(cid + born * 13.1);
      vec2 c = (id + vec2(i, j) + .5 + (rs - .5) * .95) * S;
      vec4 sc = src(c); if (sc.a < .5) continue;
      vec4 f = texture(uFlow, c / uRes);
      float detail = clamp(f.z * 6. * uDetail, 0., 1.);
      if (Lr > 0 && detail < h12(cid + 5.) * (Lr == 1 ? .6 : 1.)) continue;   // fine strokes only where the forms are busy
      float phi = .5 * atan(f.y, f.x) + 1.5708 + (h12(cid + 9.) - .5) * .5 + uSway * sin(uT * .7 + c.x * .01 + c.y * .013);
      float useFlow = smoothstep(.3, .65, f.w) * smoothstep(.012, .05, f.z);
      if (useFlow < h12(cid + 6.)) phi = uDir + (h12(cid + 2.) - .5) * uSpread;   // quiet areas: the painter's habitual direction
      vec2 d = vec2(cos(phi), sin(phi)), n = vec2(-d.y, d.x), q = px - c;
      float Ls = S * uLen * (.7 + .6 * rs.x), Ws = S * uWid * (.75 + .5 * rs.y);
      float u = dot(q, d), v = dot(q, n);
      v -= uCurve * (h12(cid + 4.) - .5) * 2. * u * u / max(Ls, 1.);  // a slight arc of the wrist
      float taper = 1. - .45 * smoothstep(0., Ls * .5, u);              // loaded at the start, thinning out
      float rag = (vn(vec2(u, v) * .35 + cid) - .5) * S * .18;
      float m = (1. - smoothstep(Ls * .44, Ls * .5, abs(u) + rag)) * (1. - smoothstep(Ws * .4 * taper, Ws * .5 * taper, abs(v) + rag * .5));
      float br = vn(vec2(u * .05, v * 14. / max(Ws, 1.)) + cid * 3.);   // bristle grooves along the stroke
      m *= 1. - uBristle * smoothstep(.55, .8, br) * smoothstep(-Ls * .5, Ls * .5, u);  // dry brush breaks up towards the end
      if (m < .5) continue;
      float prio = fl + h12(cid + born + 3.);
      if (prio > best) {
        best = prio; cover = 1.;
        vec3 k = mix(sc.rgb, here.rgb, min(.85, uKeep + detail * .35 * fl));
        k = hueRot(k, (rs.x - .5) * uHue * 6.2832);
        k *= 1. + (rs.y - .5) * uJit;
        col = k;
        h = (.55 + .45 * br) * sqrt(max(0., 1. - abs(v) / (Ws * .5 * taper))) * (1. + .6 * smoothstep(-Ls * .5, -Ls * .2, u) * smoothstep(-Ls * .1, -Ls * .3, u)) * (.6 + .4 * (2. - fl) / 2.);
      }
    }
  }
  oCol = vec4(col, cover);
  oH = vec4(h, here.a, 0., 1.);
}`;

// 3. the light on the paint and the ground beneath it
const PAINT_FINISH = PAINT_COMMON + `
uniform sampler2D uCol, uH, uSrc; uniform vec4 uBox; uniform vec2 uRes;
uniform float uT, uImp, uGap, uGloss, uCracks, uVarnish, uGround, uLx, uLy, uScale, uSat, uWeave, uNoise;
in vec2 vUv; out vec4 o;
float H(vec2 px){ return texture(uH, px / uRes).r; }
// crackle: the edges of an uneven cell pattern
float crackle(vec2 p){ vec2 id = floor(p), f = fract(p); float d1 = 9., d2 = 9.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(i, j), r = g + h22(id + g) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return 1. - smoothstep(0., .05, sqrt(d2) - sqrt(d1)); }
void main(){
  vec2 px = gl_FragCoord.xy, q = px / uScale;
  vec4 c = texture(uCol, vUv); float a = texture(uH, vUv).g;
  if (a < .01) { o = vec4(0); return; }
  // the ground
  vec3 gcol; float gh;
  if (uGround < .5) {        // linen canvas: a plain weave
    float wx = sin(q.x * 1.9) * .5 + .5, wy = sin(q.y * 1.9) * .5 + .5, over = step(.5, fract((floor(q.x * .3) + floor(q.y * .3)) * .5));
    gh = mix(wx, wy, over) * .8 + vn(q * .7) * .2; gcol = vec3(.80, .74, .62) * (.85 + .2 * gh);
  } else if (uGround < 1.5) { // cardboard: brown, fibrous
    gh = fb(q * vec2(.25, 1.6)) * .7 + vn(q * 2.) * .3; gcol = vec3(.55, .43, .30) * (.8 + .35 * gh);
  } else if (uGround < 2.5) { // gesso on a wood panel: smooth white, a faint grain
    gh = fb(q * vec2(.05, .9)) * .3 + vn(q * 3.) * .1; gcol = vec3(.90, .87, .80) * (.95 + .08 * gh);
  } else if (uGround < 3.5) { // lime plaster: chalky, pitted
    gh = vn(q * 1.6) * .5 + vn(q * 5.) * .3 + step(.97, h12(floor(q * 1.3))) * .5; gcol = vec3(.86, .82, .74) * (.9 + .15 * gh);
  } else {                    // silk: a fine diagonal twill with a soft sheen
    gh = sin((q.x + q.y) * 2.6) * .5 + .5; gh = gh * .7 + vn(q * 1.4) * .3; gcol = vec3(.84, .79, .68) * (.9 + .12 * gh);
  }
  // paint where a stroke landed, the scene's own colour thinly elsewhere, ground peeping through the gaps
  vec3 under = texture(uSrc, uBox.xy + vUv * uBox.zw).rgb;
  vec3 col = c.a > .5 ? c.rgb : mix(under, gcol, uGap * .6);
  float thin = c.a > .5 ? 0. : 1.;
  col = mix(col, col * (.85 + .25 * gh), (.15 + .5 * thin) * uWeave);                    // the ground's texture shows through thin paint
  // light raking across the thickness of the paint
  float e = 1.;
  float hx = H(px + vec2(e, 0)) - H(px - vec2(e, 0)), hy = H(px + vec2(0, e)) - H(px - vec2(0, e));
  vec3 nrm = normalize(vec3(-hx * uImp * .8, -hy * uImp * .8, 1.));
  vec3 Ld = normalize(vec3(uLx, uLy, .8));
  float diff = dot(nrm, Ld) - Ld.z;
  col *= 1. + diff * .55;
  vec3 hv = normalize(Ld + vec3(0, 0, 1));
  col += vec3(1.) * pow(max(dot(nrm, hv), 0.), 40.) * uGloss * smoothstep(.05, .4, abs(hx) + abs(hy)) ;
  // the weave pressing up through the paint
  col *= 1. - (1. - gh) * .07 * (uGround < .5 ? 1. : .5) * uWeave;
  if (uGround > 3.5) col += vec3(.9, .85, .7) * step(.985, h12(floor(q * 2.))) * .12;   // mineral sparkle
  // age: crackle and varnish
  if (uCracks > 0.) { float k = crackle(q * .11 + fb(q * .02) * 1.2) * uCracks * smoothstep(.35, .6, fb(q * .006)); col *= 1. - k * .16; }
  col = mix(col, col * vec3(1.05, .92, .70), uVarnish);
  col += (h12(px + fract(uT) * 31.) - .5) * uNoise;
  col = mix(vec3(dot(col, vec3(.3, .59, .11))), col, uSat);
  o = vec4(col * a, a);
}`;

function paintSetup() {
  const cv = document.createElement("canvas");
  const gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) { PAINT.gl = false; return; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn("paint shader", gl.getShaderInfoLog(s)); return s; };
  const prog = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, PAINT_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.warn("paint link", gl.getProgramInfoLog(p));
    p.u = {}; return p; };
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  Object.assign(PAINT, { gl, cv, flow: prog(PAINT_FLOW), strokes: prog(PAINT_STROKES), finish: prog(PAINT_FINISH),
    src: tex(), tFlow: tex(), tCol: tex(), tH: tex(), fbFlow: gl.createFramebuffer(), fbPaint: gl.createFramebuffer(), w: 0, h: 0, tex });
}
function paintResize(w, h) {
  const { gl } = PAINT; if (PAINT.w === w && PAINT.h === h) return;
  PAINT.w = w; PAINT.h = h; PAINT.cv.width = w; PAINT.cv.height = h;
  const fw = Math.max(1, w >> 1), fh = Math.max(1, h >> 1);
  const alloc = (t, W, H) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null); };
  alloc(PAINT.tFlow, fw, fh); alloc(PAINT.tCol, w, h); alloc(PAINT.tH, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, PAINT.fbFlow); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, PAINT.tFlow, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, PAINT.fbPaint);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, PAINT.tCol, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, PAINT.tH, 0);
}
function paintUse(p, uniforms) {
  const { gl } = PAINT; gl.useProgram(p);
  for (const k in uniforms) {
    const loc = p.u[k] !== undefined ? p.u[k] : (p.u[k] = gl.getUniformLocation(p, k)), v = uniforms[k];
    if (loc === null) continue;
    if (typeof v === "number") gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else gl.uniform4fv(loc, v);
  }
}
function paintBind(p, name, unit, t) { const { gl } = PAINT; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  const loc = p.u[name] !== undefined ? p.u[name] : (p.u[name] = gl.getUniformLocation(p, name)); gl.uniform1i(loc, unit); }

// repaint the part of the page inside box (CSS pixels) in the given style
const PAINT_MOTION = { boil: 0, sway: 0 };
function paintApply(styleName, box, t, dt) {
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return;
  const st = PAINT_STYLES[styleName]; if (!st) return;
  const { gl } = PAINT, cnv = screen.canvas;
  const k = Math.min(DPR, Math.sqrt(5e6 / (box.w * box.h))), w = Math.max(16, Math.round(box.w * k)), h = Math.max(16, Math.round(box.h * k)); // full Retina resolution
  paintResize(w, h);
  // the music: strokes are re-laid a little faster and lean a touch more when it swells
  const energy = Math.min(1, S.mid * 0.8 + S.bass * 0.5);
  PAINT_MOTION.boil += ((0.05 + energy * 0.35) - PAINT_MOTION.boil) * Math.min(1, dt * 2);
  PAINT_MOTION.sway += ((0.02 + S.mid * 0.08) - PAINT_MOTION.sway) * Math.min(1, dt * 2);
  PAINT_MOTION.clock = (PAINT_MOTION.clock || 0) + dt * (0.6 + energy * 1.5);
  // the scene as drawn so far
  gl.bindTexture(gl.TEXTURE_2D, PAINT.src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
  const CW = cnv.width / DPR, CH = cnv.height / DPR;
  const B = [box.x / CW, 1 - (box.y + box.h) / CH, box.w / CW, box.h / CH];
  // 1. flow
  const fw = Math.max(1, w >> 1), fh = Math.max(1, h >> 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, PAINT.fbFlow); gl.viewport(0, 0, fw, fh);
  paintUse(PAINT.flow, { uBox: B, uRes: [fw, fh] }); paintBind(PAINT.flow, "uSrc", 0, PAINT.src);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // 2. strokes
  gl.bindFramebuffer(gl.FRAMEBUFFER, PAINT.fbPaint); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.viewport(0, 0, w, h);
  const sz = st.size.map(s => s * k);
  paintUse(PAINT.strokes, { uBox: B, uRes: [w, h], uSize: sz, uT: PAINT_MOTION.clock, uLen: st.len, uWid: st.wid, uJit: st.jit, uHue: st.hue, uKeep: st.keep,
    uBristle: st.bristle, uCurve: st.curve, uDetail: st.detail, uBoil: PAINT_MOTION.boil, uSway: PAINT_MOTION.sway, uDir: st.dir, uSpread: st.spread });
  paintBind(PAINT.strokes, "uSrc", 0, PAINT.src); paintBind(PAINT.strokes, "uFlow", 1, PAINT.tFlow);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // 3. finish onto the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const lx = -0.55 + Math.sin(t * 0.21) * 0.08 + S.bass * 0.06, ly = 0.6;
  paintUse(PAINT.finish, { uBox: B, uRes: [w, h], uT: t, uImp: st.imp, uGap: st.gap, uGloss: st.gloss, uCracks: st.cracks, uVarnish: st.varnish, uSat: st.sat || 1, uWeave: st.weave == null ? 1 : st.weave, uNoise: st.noise == null ? 0.025 : st.noise,
    uGround: st.ground, uLx: lx, uLy: ly, uScale: k });
  paintBind(PAINT.finish, "uCol", 0, PAINT.tCol); paintBind(PAINT.finish, "uH", 1, PAINT.tH); paintBind(PAINT.finish, "uSrc", 2, PAINT.src);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // put the painting back where the scene was
  g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.clearRect(box.x, box.y, box.w, box.h);
  g.drawImage(PAINT.cv, box.x, box.y, box.w, box.h);
  g.restore();
}

// ================================================================
// STAINED GLASS AND STONE — for the gothic window (4iii). Lit from behind, real glass is uneven:
// thicker and darker in places, with ripples from the cylinder it was blown in and tiny seed bubbles;
// its colour spills a little light into the air around it and onto the stone sill below.
// The stone gets pitted, chiselled grain; brass glints in the candlelight.
// ================================================================
const GLASS_FS = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; uniform float uT, uScale, uGlow;
in vec2 vUv; out vec4 o;
vec4 S(vec2 px){ return texture(uSrc, uBox.xy + clamp(px, vec2(.5), uRes - .5) / uRes * uBox.zw); }
float chroma(vec3 c){ return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }
bool brass(vec3 c){ return c.r > .55 && c.r > c.g && c.g > c.b && c.r - c.b > .25 && dot(c, vec3(.3, .59, .11)) > .64; }
bool glassy(vec3 c){ float l = dot(c, vec3(.3, .59, .11)); return !brass(c) && ((chroma(c) > .2 && l > .1) || (c.g > c.r + .02 && l > .45 && chroma(c) < .2)); }
void main(){
  vec2 px = gl_FragCoord.xy, q = px / uScale;
  vec4 c0 = S(px); if (c0.a < .01) { o = vec4(0); return; }
  vec3 c = c0.rgb, col = c; float l = dot(c, vec3(.3, .59, .11));
  if (glassy(c)) {
    col *= .82 + .3 * fb(q * .22);                                  // uneven thickness
    col *= .94 + .1 * vn(vec2(q.x * .12, q.y * .9));                // ripples of blown glass
    col += vec3(1.) * step(.996, h12(floor(q * 1.6))) * .25;        // seed bubbles
    col *= 1.18 + uGlow * .25;                                      // light coming through it
  } else if (brass(c)) {
    col *= .9 + .2 * vn(q * 1.5);
    col += vec3(1., .85, .55) * pow(vn(q * .4 + uT * .6), 6.) * .5;   // a flickering glint from the candle
  } else if (l < .45 && chroma(c) < .15) {
    // stone: chisel marks and pitting
    col *= .88 + .18 * fb(q * .6) ; col *= 1. - step(.985, h12(floor(q * 2.2))) * .3;
    // coloured light falling from the window onto the stone below it
    vec3 spill = vec3(0); float wsum = 0.;
    for (int i = 1; i <= 6; i++) { vec3 s = S(px + vec2(0., float(i) * 7. * uScale)).rgb; if (glassy(s)) { spill += s; wsum += 1.; } }
    if (wsum > 0.) col += spill / wsum * .18 * (wsum / 6.) * (.8 + uGlow * .6);
  }
  // halation: glass glows softly into the dark around it
  vec3 halo = vec3(0);
  for (int i = 0; i < 8; i++) { float a = float(i) * .785; vec3 s = S(px + vec2(cos(a), sin(a)) * 5. * uScale).rgb; if (glassy(s)) halo += s; }
  col += halo / 8. * .2 * (1. + uGlow);
  col += (h12(px + fract(uT) * 41.) - .5) * .02;
  o = vec4(clamp(col, 0., 1.) * c0.a, c0.a);
}`;
function realApply(kind, box, t, dt) {
  if (R2[kind]) return R2[kind](box, t, dt);
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return;
  const { gl } = PAINT;
  if (!PAINT.glass) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn("glass shader", gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, PAINT_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, GLASS_FS));
    gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p); p.u = {}; PAINT.glass = p;
  }
  const cnv = screen.canvas, k = Math.min(DPR, 1.5), w = Math.max(16, Math.round(box.w * k)), h = Math.max(16, Math.round(box.h * k));
  paintResize(w, h);
  gl.bindTexture(gl.TEXTURE_2D, PAINT.src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
  const CW = cnv.width / DPR, CH = cnv.height / DPR;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  paintUse(PAINT.glass, { uBox: [box.x / CW, 1 - (box.y + box.h) / CH, box.w / CW, box.h / CH], uRes: [w, h], uT: t, uScale: k, uGlow: Math.min(1, S.mid + S.pulse * 0.5) });
  paintBind(PAINT.glass, "uSrc", 0, PAINT.src);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.clearRect(box.x, box.y, box.w, box.h);
  g.drawImage(PAINT.cv, box.x, box.y, box.w, box.h);
  g.restore();
}
