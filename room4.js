// ================================================================
// ROOM 4, pieces i and ii — the paint itself never moves; the figures and the light do.
//   i   the Blue Period guitarist: the room and his hunched body are painted once and held still; his arms,
//       hands, head and guitar are drawn live on top, playing with the music; a lamp-like light swells and fades.
//   ii  after Munch: the landscape is painted once, then its sky and fjord breathe through a slow displacement
//       that follows the painting's own bands; the bridge stays still; the figure, on its own layer in front,
//       sways and breathes to a slower rhythm and opens its mouth on the strong beats.
// ================================================================

// paint a scene once with the oil-paint layer at rest, and keep the result (device pixels of rect)
function r4Bake(draw, box, rect, style) {
  const keep = { boil: PAINT_MOTION.boil, sway: PAINT_MOTION.sway, clock: PAINT_MOTION.clock };
  PAINT_MOTION.boil = 0; PAINT_MOTION.sway = 0; PAINT_MOTION.clock = 0;
  const quiet = { bass: S.bass, mid: S.mid, high: S.high, pulse: S.pulse, pitchOn: S.pitchOn, spec: S.spec };
  Object.assign(S, { bass: 0, mid: 0, high: 0, pulse: 0, pitchOn: 0, spec: new Array(16).fill(0) });
  g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(box.x, box.y, box.w, box.h); g.restore();
  draw();
  paintApply(style, box, 0, 0);
  Object.assign(S, quiet); Object.assign(PAINT_MOTION, keep);
  const cv = document.createElement("canvas"); cv.width = Math.round(rect.w * DPR); cv.height = Math.round(rect.h * DPR);
  cv.getContext("2d").drawImage(screen.canvas, Math.round(rect.x * DPR), Math.round(rect.y * DPR), cv.width, cv.height, 0, 0, cv.width, cv.height);
  return cv;
}

// ---- 4i ----
const blue4 = { key: "", tex: null, li: 1, depth: 0, lamp: 0 };
const BLUE4_FS = PAINT_COMMON + `
uniform sampler2D tP; uniform vec2 uRes; uniform float uScale, uI, uD, uLamp;
in vec2 vUv; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = texture(tP, uv).rgb;
  float l = dot(c, vec3(.3, .59, .11));
  // the room's light: a soft pool high on the left where his head and shoulders are; it swells with the music
  vec2 p = uv - vec2(.36, .66); p.x *= uRes.x / uRes.y;
  float pool = exp(-dot(p, p) * 4.5);
  // tonal depth: in quiet passages the shadows sink further into Prussian blue; when it swells they open a little
  float sh = smoothstep(.45, .05, l);
  vec3 deep = c * vec3(.86, .9, 1.02);
  c = mix(c, deep, sh * uD);
  c *= 1. + pool * uLamp * (.25 + l * .6);
  c *= uI;
  // the edges of the canvas fall away into the dark, a little more when it is quiet
  vec2 e = uv - .5; c *= 1. - dot(e, e) * (.28 + uD * .25);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;
const BLUE4R_FS = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; uniform float uScale, uI, uD, uLamp;
in vec2 vUv; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 c0 = texture(uSrc, uBox.xy + uv * uBox.zw); vec3 c = c0.rgb;
  float l = dot(c, vec3(.3, .59, .11));
  // the room's light: a soft pool high on the left where his head and shoulders are; it swells with the music
  vec2 p = uv - vec2(.36, .66); p.x *= uRes.x / uRes.y;
  float pool = exp(-dot(p, p) * 4.5);
  // tonal depth: in quiet passages the shadows sink further into Prussian blue; when it swells they open a little
  float sh = smoothstep(.45, .05, l);
  c = mix(c, c * vec3(.86, .9, 1.02), sh * uD);
  c *= 1. + pool * uLamp * (.25 + l * .6);
  c *= uI;
  vec2 e = uv - .5; c *= 1. - dot(e, e) * (.28 + uD * .25);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;
function guitaristStill(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.66), rect = { x: box.x + (box.w - w) / 2, y: box.y, w, h };
  const key = Math.round(box.w) + "x" + Math.round(box.h) + "@" + DPR;
  if (blue4.key !== key && (PAINT.gl !== null || (paintSetup(), true)) && PAINT.gl) {
    blue4.key = key;
    // the room and his still, hunched body are painted once, with the paint at rest; that painting then
    // replaces the drawn backdrop, so only his arms, hands, head and guitar are drawn live on top of it
    guitarist.key = ""; guitaristScene(0, 0, box);
    const cv = r4Bake(() => { g.save(); g.beginPath(); g.rect(rect.x, rect.y, w, h); g.clip(); blit(guitarist.back, rect.x, rect.y); g.restore(); }, box, rect, "blue");
    cv.w = w; cv.h = h; guitarist.back = cv;
    guitarist.grain = document.createElement("canvas"); guitarist.grain.w = 0; guitarist.grain.h = 0;
  }
  guitaristScene(t, dt, box);       // he plays: the fretting hand follows the melody, a finger plucks each note, his head sinks on the beats
  if (!blue4.key) return;
  const quietness = 1 - Math.min(1, S.mid * 0.9 + S.bass * 0.4);
  blue4.depth += (quietness - blue4.depth) * Math.min(1, dt * 0.5);
  blue4.lamp += (Math.min(1, S.mid * 0.6 + S.pulse * 0.25) - blue4.lamp) * Math.min(1, dt * 0.9);
  blue4.li += ((0.97 + S.mid * 0.05) - blue4.li) * Math.min(1, dt * 0.7);
  r2Pass("blue4r", BLUE4R_FS, rect, { uI: blue4.li, uD: blue4.depth * 0.6, uLamp: blue4.lamp * 0.22 });
}

// ---- 4ii ----
const munch = { key: "", tP: null, tD: null, amp: 0, ph: 0, br: 0, brPh: 0, fph: 0, fsw: 0 };
function screamDraw(box, mode, ph = 2.2, sw = 0.3, open = 0.75) {
  const t = 0, dt = 0;
  const h = box.h, w = Math.min(box.w, h * 0.8), x0 = box.x + (box.w - w) / 2, y0 = box.y, u = h / 100, W8 = w / u;
  const X = v => x0 + v * u, Y = v => y0 + v * u;
  const rail = x => 84 - (x / W8) * 38; // the bridge railing climbs from the lower right to the left
  const key = Math.round(w) + "x" + Math.round(h) + "@" + DPR;
  if (scream.key !== key) {
    scream.key = key;
    scream.grain = canvasGrain(w, h, 81);
    scream.deck = offscreen(w, h, () => { // the bridge deck and railing, in long raking strokes
      const A = v => v * u, r = seeded(82);
      g.beginPath(); g.moveTo(0, A(rail(0))); g.lineTo(w, A(rail(W8))); g.lineTo(w, h); g.lineTo(0, h); g.closePath();
      const dg = g.createLinearGradient(0, A(46), A(30), h); dg.addColorStop(0, "rgb(170,104,58)"); dg.addColorStop(1, "rgb(96,56,36)"); g.fillStyle = dg; g.fill();
      g.save(); g.clip(); const ang = Math.atan2(-38, W8);
      for (let i = 0; i < w * h / 120; i++) { const x = r() * w, y = r() * h; g.globalAlpha = 0.6; brush(x, y, A(4 + r() * 5), A(0.45), ang, paint(r() < 0.5 ? [178, 110, 60] : [134, 80, 48], 14, r)); } g.globalAlpha = 1;
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h; brush(x, y, A(3 + r() * 3), A(0.3), ang, paint([220, 160, 90], 20, r)); }
      g.restore();
      g.lineCap = "round";
      for (const [off, col, wd] of [[0, "rgb(120,52,30)", 1.4], [-2.6, "rgb(150,66,34)", 0.9], [-5.4, "rgb(132,58,32)", 1.1]]) { g.strokeStyle = col; g.lineWidth = A(wd); g.beginPath(); g.moveTo(0, A(rail(0) + off)); g.lineTo(w, A(rail(W8) + off)); g.stroke(); }
      for (let x = 2; x < W8; x += 7) { g.strokeStyle = "rgb(110,48,28)"; g.lineWidth = A(0.6); g.beginPath(); g.moveTo(A(x), A(rail(x) - 5.4)); g.lineTo(A(x), A(rail(x))); g.stroke(); }
      for (const [fx, fh] of [[6, 13], [11, 12]]) { // two dark figures walking away at the far end
        g.beginPath(); g.moveTo(A(fx - 1.4), A(rail(fx) + 2)); g.lineTo(A(fx - 1), A(rail(fx) - fh + 3)); g.quadraticCurveTo(A(fx), A(rail(fx) - fh), A(fx + 1), A(rail(fx) - fh + 3)); g.lineTo(A(fx + 1.4), A(rail(fx) + 2)); g.closePath(); g.fillStyle = "rgb(30,26,34)"; g.fill();
        g.fillRect(A(fx - 1.3), A(rail(fx) - fh + 0.4), A(2.6), A(0.6)); // hat brim
      }
    });
  }
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.lineCap = "round"; g.lineJoin = "round";
  if (mode === "bg") {
  // the sky: bands of red, orange and yellow that roll like waves
  g.fillStyle = "rgb(214,96,46)"; g.fillRect(x0, y0, w, Y(46) - y0);
  for (let b = 0; b < 44; b++) {
    const base = b * 1.05 - 1, col = SKY[(b * 3) % SKY.length];
    g.strokeStyle = `rgb(${col})`; g.lineWidth = u * (1.4 + (b % 3) * 0.4);
    g.beginPath();
    for (let x = -2; x <= W8 + 2; x += 2) { const y = base + Math.sin(x * 0.07 + b * 0.45 - ph) * (1.4 + sw * 1.6) + Math.sin(x * 0.19 - b * 0.3 + ph * 0.6) * 0.6; x === -2 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y)); }
    g.stroke();
  }
  // the fjord and the dark shore, beyond the railing, swirling the other way
  g.save(); g.beginPath(); g.moveTo(x0, Y(38)); g.lineTo(x0 + w, Y(38)); g.lineTo(x0 + w, Y(rail(W8))); g.lineTo(x0, Y(rail(0))); g.closePath(); g.clip();
  g.fillStyle = "rgb(40,64,110)"; g.fillRect(x0, Y(38), w, h);
  for (let b = 0; b < 34; b++) {
    const base = 38 + b * 1.4, shore = b > 8 && b < 20, col = shore ? FJORD[4 + (b % 3)] : FJORD[b % 4];
    g.strokeStyle = `rgb(${col})`; g.lineWidth = u * (1.6 + (b % 2) * 0.6);
    g.beginPath();
    for (let x = -2; x <= W8 + 2; x += 2) {
      const curl = shore ? Math.sin((x / W8) * Math.PI) * 9 : 0; // the shore bulges out into the water in a great curve
      const y = base - curl + Math.sin(x * 0.09 - b * 0.35 + ph * 0.8) * (1 + sw * 1.4);
      x === -2 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y));
    }
    g.stroke();
  }
  g.restore();
  }
  if (mode !== "fig") blit(scream.deck, x0, y0);
  if (mode === "fig") {
  // the screaming figure: a skull-like face held between two hands, a thin dark body that bends with the waves
  const fx = W8 * 0.42, wave = y => Math.sin(y * 0.11 - ph * 1.3) * (0.7 + sw * 1.3);   // a gentle sway, never a rubbery bend
  const SK = { line: [70, 62, 42], dark: [128, 124, 84], mid: [198, 182, 128], light: [236, 222, 172] };
  const ROBE = { line: [14, 14, 22], dark: [16, 18, 30], mid: [34, 38, 58], light: [70, 74, 104] };
  const robe = () => {
    g.beginPath();
    for (let y = 66; y <= 102; y += 2) { const k = (y - 66) / 36; g.lineTo(X(fx - 4.2 - k * k * 3 + wave(y)), Y(y)); }
    for (let y = 102; y >= 66; y -= 2) { const k = (y - 66) / 36; g.lineTo(X(fx + 4.2 + k * k * 2.4 + wave(y)), Y(y)); }
    g.closePath();
  };
  g.strokeStyle = `rgb(${ROBE.line})`; g.lineWidth = u * 0.6; robe(); g.stroke();
  robe(); g.fillStyle = `rgb(${ROBE.mid})`; g.fill();
  g.save(); robe(); g.clip(); // the robe painted in long wavering strokes that follow the body's sway
  const rs = seeded(83);
  for (let i = 0; i < 70; i++) {
    const off = rs() * 2 - 1, y1 = 64 + rs() * 30, len = 6 + rs() * 10, col = off < -0.3 ? ROBE.dark : off > 0.45 ? ROBE.light : mixc(ROBE.mid, ROBE.dark, rs());
    g.strokeStyle = `rgb(${col})`; g.lineWidth = u * (0.6 + rs() * 0.9); g.beginPath();
    for (let y = y1; y <= y1 + len; y += 2) { const k = (y - 66) / 36; g.lineTo(X(fx + off * (4 + k * k * 2.6) + wave(y)), Y(y)); }
    g.stroke();
  }
  g.restore();
  // a thin neck rising out of the collar
  const hx = fx + wave(60), hy = 58;
  tube([[X(fx + wave(67)), Y(67)], [X(hx), Y(hy + 5)]], [u * 3, u * 2.4], SK, [-0.7, -0.7], u * 0.25);
  // arms bent up, elbows out, hands pressed to the head
  for (const s of [-1, 1]) tube([[X(fx + s * 3.6 + wave(67)), Y(67.5)], [X(fx + s * 7.4 + wave(64)), Y(66)], [X(hx + s * 6.2), Y(hy + 3.4)], [X(hx + s * 4.4), Y(hy + 1.4)]], [u * 3.2, u * 2.8, u * 2.3, u * 2], ROBE, [-0.7, -0.7], u * 0.3);
  // the head: a bald skull, temples sunken, the cheeks drawn in by the scream
  g.save(); g.translate(X(hx), Y(hy)); g.rotate(wave(55) * 0.02); g.scale(u * 0.82, u * 0.82);
  const head = () => { g.beginPath(); g.moveTo(0, -9.5); g.bezierCurveTo(5.4, -9.6, 6.4, -4, 5.2, 0.5); g.bezierCurveTo(4.6, 3, 3.6, 5.6, 2.6, 7.6); g.quadraticCurveTo(1.4, 10, 0, 10); g.quadraticCurveTo(-1.4, 10, -2.6, 7.6); g.bezierCurveTo(-3.6, 5.6, -4.6, 3, -5.2, 0.5); g.bezierCurveTo(-6.4, -4, -5.4, -9.6, 0, -9.5); g.closePath(); };
  g.strokeStyle = `rgb(${SK.line})`; g.lineWidth = 0.4; head(); g.stroke();
  paintedFill(head, SK.light, SK.dark, 1.5, 84, 120, 1, -4, -9, 4, 9);
  g.save(); head(); g.clip();
  const shade = (x, y, rx, ry, a, col) => { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.fillStyle = col; g.fill(); };
  for (const s of [-1, 1]) {
    shade(s * 4.4, -2.6, 1.4, 2.8, s * 0.2, "rgba(110,120,80,0.45)"); // sunken temples, a little green
    shade(s * 3, 3.6, 1.1, 2.6, -s * 0.25, "rgba(120,110,74,0.5)"); // hollow cheeks
  }
  shade(0, -6, 3.6, 1.6, 0, "rgba(250,238,196,0.5)"); // light on the crown
  g.restore();
  for (const s of [-1, 1]) { // wide, staring eyes in deep sockets
    shade(s * 2.1, -1.8, 1.6, 2 + open * 0.3, s * 0.15, "rgb(104,94,64)");
    shade(s * 2.1, -1.6, 0.9, 1.1 + open * 0.2, 0, "rgb(190,178,134)");
    shade(s * 2.1, -1.5, 0.45, 0.5, 0, "rgb(26,24,26)");
  }
  g.fillStyle = "rgb(80,70,50)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 0.55, 1.9, 0.28, 0.55, s * 0.3, 0, TAU); g.fill(); } // nostrils
  g.beginPath(); g.ellipse(0, 5.4, 1.2 + open * 0.35, 0.9 + open * 1.5, 0, 0, TAU); g.fillStyle = "rgb(150,110,80)"; g.fill(); // lips
  g.beginPath(); g.ellipse(0, 5.5, 0.9 + open * 0.3, 0.6 + open * 1.35, 0, 0, TAU); g.fillStyle = "rgb(36,24,22)"; g.fill(); // the open mouth
  // two long hands clamped over the ears, fingers spread up the sides of the skull
  for (const s of [-1, 1]) {
    const palm = () => { g.beginPath(); g.moveTo(s * 4.2, -1.2); g.quadraticCurveTo(s * 6.8, -0.6, s * 6.8, 2.8); g.quadraticCurveTo(s * 6.2, 6.2, s * 4.2, 6.6); g.quadraticCurveTo(s * 3.4, 3.4, s * 4.2, -1.2); g.closePath(); };
    g.strokeStyle = `rgb(${SK.line})`; g.lineWidth = 0.35; palm(); g.stroke();
    paintedFill(palm, SK.light, SK.dark, 1.5, 85 + s, 30, 0.7, s * 4, -1, s * 6.6, 6);
    for (let f = 0; f < 4; f++) tube([[s * (4.6 + f * 0.55), -0.6 + f * 0.25], [s * (4.4 + f * 0.6), -3.4 + f * 0.6], [s * (4 + f * 0.65), -5.6 + f * 0.9]], [0.95, 0.85, 0.7], SK, [-0.7, -0.7], 0.14);
    tube([[s * 4.3, 5.2], [s * 3.2, 4.2], [s * 2.6, 2.8]], [1, 0.9, 0.75], SK, [-0.7, -0.7], 0.14); // thumb along the jaw
  }
  g.restore();
  }
  g.restore();
}const MUNCH_FS = PAINT_COMMON + `
uniform sampler2D tP, tD; uniform vec2 uRes; uniform float uScale, uA, uPh, uBr, uU;
in vec2 vUv; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 css = uRes / uScale;
  // position in the painting's own units (a hundredth of its height, y downward), as it was drawn
  vec2 p = vec2(uv.x, 1. - uv.y) * css / uU;
  float W8 = css.x / uU;
  float env = .55 + .45 * fb(p * .035 + vec2(uPh * .05, -uPh * .03));          // the swell is never even across the sky
  // the sky: its bands rise and fall as one body, rolling along their own curves, and the whole sky swells about the horizon
  vec2 ds = vec2(.5 * sin(p.y * .3 + uPh * .6 + p.x * .02),
                 .65 * sin(p.y * .55 - uPh + .9 * sin(p.x * .05 + uPh * .3)) + .35 * sin(p.x * .08 + p.y * .2 - uPh * .8)) * uA * env;
  ds.y += uBr * (p.y - 40.) * .045 * uU;
  // the fjord and its shore: they swirl along the great curve of the bay
  float curl = sin(p.x / W8 * 3.14159) * 9., dcurl = cos(p.x / W8 * 3.14159) * 9. * 3.14159 / W8;
  float psi = p.y + curl;
  vec2 nrm = normalize(vec2(dcurl, 1.)), tan2 = vec2(nrm.y, -nrm.x);
  vec2 df = (nrm * .8 * sin(psi * .6 - uPh * .9) + tan2 * .6 * sin(p.x * .1 - uPh * .5 + psi * .1)) * uA * env;
  vec2 d = mix(ds, df, smoothstep(34., 44., p.y));
  // nothing moves on or near the bridge and the figure
  float stillW = texture(tD, uv).r;
  d *= stillW;
  vec2 duv = vec2(d.x, -d.y) * uScale / uRes;
  o = vec4(texture(tP, clamp(uv - duv, .5 / uRes, 1. - .5 / uRes)).rgb, 1.);
}`;
function screamFlow(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.8), rect = { x: box.x + (box.w - w) / 2, y: box.y, w, h };
  const key = Math.round(box.w) + "x" + Math.round(box.h) + "@" + DPR;
  if (munch.key !== key && (PAINT.gl !== null || (paintSetup(), true)) && PAINT.gl) {
    munch.key = key;
    scream.key = "";
    const cv = r4Bake(() => { screamDraw(box, "bg"); }, box, rect, "munch");     // the landscape, without the figure
    munch.tP = manuTex(cv, munch.tP);
    // where the painting must stay still: the bridge and its railing, with a wide soft margin
    const m = offscreen(w, h, () => { scream.key = ""; screamDraw({ x: 0, y: 0, w, h }, "mask"); });
    const Wd = cv.width, Hd = cv.height, md = m.getContext("2d").getImageData(0, 0, m.width, m.height).data, n = Wd * Hd, f = new Float32Array(n);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const sx = Math.min(m.width - 1, x), sy = Math.min(m.height - 1, y); f[y * Wd + x] = md[(sy * m.width + sx) * 4 + 3] > 128 ? 1 : 0; }
    const rad = Math.max(2, Math.round(DPR * 9)), tmp = new Float32Array(n), a = Float32Array.from(f);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < Hd; y++) { let acc = 0; const o = y * Wd; for (let x = -rad; x < Wd; x++) { if (x + rad < Wd) acc += a[o + x + rad]; if (x - rad - 1 >= 0) acc -= a[o + x - rad - 1]; if (x >= 0) tmp[o + x] = acc / (2 * rad + 1); } }
      for (let x = 0; x < Wd; x++) { let acc = 0; for (let y = -rad; y < Hd; y++) { if (y + rad < Hd) acc += tmp[(y + rad) * Wd + x]; if (y - rad - 1 >= 0) acc -= tmp[(y - rad - 1) * Wd + x]; if (y >= 0) a[y * Wd + x] = acc / (2 * rad + 1); } }
    }
    const dc = document.createElement("canvas"); dc.width = Wd; dc.height = Hd; const dx = dc.getContext("2d"), id = dx.createImageData(Wd, Hd);
    for (let i = 0; i < n; i++) { const wgt = f[i] > 0.5 ? 0 : Math.pow(Math.max(0, 1 - a[i] * 3.2), 2); id.data[i * 4] = Math.round(wgt * 255); id.data[i * 4 + 3] = 255; }
    dx.putImageData(id, 0, 0);
    munch.tD = manuTex(dc, munch.tD);
  }
  if (!munch.tP) return;
  // the music's intensity, followed slowly: crescendos build the waves gradually, and they ebb more slowly still
  const goal = Math.min(1, S.bass * 0.7 + S.mid * 0.8 + S.pulse * 0.2);
  munch.amp += (goal - munch.amp) * Math.min(1, dt * (goal > munch.amp ? 0.6 : 0.3));
  const I = Math.pow(munch.amp, 1.4);
  munch.ph += dt * (0.22 + I * 0.55);
  munch.brPh += dt * (0.3 + I * 0.35);
  r3Tex("munch", MUNCH_FS, rect, { uA: 0.35 + I * 7.5, uPh: munch.ph, uBr: Math.sin(munch.brPh) * (0.1 + I * 0.9), uU: h / 100 }, { tP: munch.tP, tD: munch.tD });
  // the figure, on its own layer in front: it sways and breathes to its own slower rhythm, and screams on the strong beats
  munch.fsw += (Math.min(1, S.bass * 0.8 + S.mid * 0.5) - munch.fsw) * Math.min(1, dt * 1.2);
  munch.fph += dt * (0.45 + munch.fsw * 0.7);
  scream.mouth *= Math.pow(0.3, dt);
  screamDraw(box, "fig", munch.fph, munch.fsw, 0.45 + scream.mouth * 0.55 + munch.fsw * 0.2);
}
