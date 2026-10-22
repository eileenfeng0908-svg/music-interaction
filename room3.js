// ================================================================
// ROOM 3, pieces i and ii — each in its own historical medium.
//   i   the Sun card in the manner of Pamela Colman Smith's tarot (1909): a pen-and-ink key drawing
//       printed over flat, muted lithographic colour on card stock, gently aged
//   ii  a Baroque heaven painted in oil: two putti meeting for a kiss in a stormy sky, lit by a single
//       shaft of divine light (chiaroscuro), modelled in 3D and finished like an old canvas
// ================================================================

// ----------------------------------------------------------------
// 3i  THE SUN. Smith drew each card in black ink; the colours were laid in flat and printed by
// lithography, so they sit slightly off the lines (mis-registration), are a little uneven, and the
// paper shows through them. Everything is drawn as clean vector lines and then printed by a shader.
// The sun climbs with the melody and opens its eyes at the top; its wavy rays stir; the flowers nod.
// ----------------------------------------------------------------
const sun = { y: 0.3, smile: 0, yods: [] };
const INK = "#211B16", PAPER = "#F1EAD7";
const SMITH = { sky: "#A9C6CF", sun: "#E9BD45", ray: "#E7A63C", petal: "#E8B83E", seed: "#7A4E2A", leaf: "#7E9B58", stem: "#6F8C4C", wall: "#BDB7A8", wallDark: "#A39D8E", ground: "#8FA566", red: "#B5483B", cheek: "#E39A6A" };
// draw a path in flat colour, nudged a little off the line (the colour plate never sat exactly on the key drawing)
function smith(pathFn, fill, line = 1.1) {
  if (fill) { g.save(); g.translate(0.8, -0.55); pathFn(); g.fillStyle = fill; g.fill(); g.restore(); }
  if (line) { pathFn(); g.strokeStyle = INK; g.lineWidth = line; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
}
function sunScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.585), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const b = w * 0.06, top = h * 0.06, foot = h * 0.075;
  const px = x0 + b, py = y0 + b + top, pw = w - 2 * b, ph = h - 2 * b - top - foot;
  // the melody lifts the sun; at the top of the scale it opens its eyes
  const goal = S.pitchOn ? Math.max(0, Math.min(1, (S.pitch - 0.8) / 2.6)) : 0.25;
  sun.y += (goal - sun.y) * Math.min(1, dt * 2.5);
  sun.smile += ((S.pitchOn ? sun.y : 0) - sun.smile) * Math.min(1, dt * 2);

  // the card, with a faint shadow on the wall
  const round = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  g.save(); g.shadowColor = "rgba(60,45,30,0.22)"; g.shadowBlur = 14; g.shadowOffsetY = 5; round(x0, y0, w, h, w * 0.035); g.fillStyle = PAPER; g.fill(); g.restore();

  // ---- the picture ----
  g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
  g.save(); g.translate(0.8, -0.55); g.fillStyle = SMITH.sky; g.fillRect(px - 2, py - 2, pw + 4, ph + 4); g.restore();
  const R = pw * 0.2 * (1 + S.bass * 0.02), cx = px + pw / 2, cy = py + ph * (0.36 - sun.y * 0.16);
  // rays, alternately straight and wavy, as Smith drew them
  const N = 22;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + k * TAU / N, straight = k % 2 === 0, e = S.spec[k % 16];
    const len = R * (straight ? 0.95 : 0.78) * (1 + e * 0.08), wd = R * (straight ? 0.1 : 0.075);
    const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [cx + ca * u - sa * v, cy + sa * u + ca * v];
    smith(() => {
      g.beginPath();
      if (straight) { const A = P(R * 0.95, -wd), B2 = P(R + len, 0), C = P(R * 0.95, wd); g.moveTo(...A); g.lineTo(...B2); g.lineTo(...C); }
      else {
        const pts = n => { const L = [], Rr = []; for (let i = 0; i <= n; i++) { const p = i / n, sw = Math.sin(p * 9 - t * 1.6 + k) * wd * 0.9 * p, half = wd * (1 - p * 0.92);
          L.push(P(R * 0.95 + len * p, sw - half)); Rr.push(P(R * 0.95 + len * p, sw + half)); } return [L, Rr]; };
        const [L, Rr] = pts(14); g.moveTo(...L[0]); L.forEach(q => g.lineTo(...q)); for (let i = Rr.length - 1; i >= 0; i--) g.lineTo(...Rr[i]);
      }
      g.closePath();
    }, straight ? SMITH.sun : SMITH.ray, 1);
  }
  // the disc and its face
  smith(() => { g.beginPath(); g.arc(cx, cy, R, 0, TAU); }, SMITH.sun, 1.4);
  g.save(); g.translate(cx, cy); g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round";
  g.globalAlpha = 0.55; g.fillStyle = SMITH.cheek; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * R * 0.42 + 0.8, R * 0.2 - 0.55, R * 0.13, 0, TAU); g.fill(); } g.globalAlpha = 1;
  g.lineWidth = 1.1;
  const open = Math.max(0.12, Math.min(1, sun.smile * 1.4));
  for (const s of [-1, 1]) {
    const ex = s * R * 0.33, ey = -R * 0.12, ew = R * 0.17;
    g.beginPath(); g.moveTo(ex - ew * 1.1, ey - R * 0.16); g.quadraticCurveTo(ex, ey - R * 0.3, ex + ew * 1.1, ey - R * 0.15); g.stroke(); // brow
    g.beginPath(); g.moveTo(ex - ew, ey); g.quadraticCurveTo(ex, ey - R * 0.12 * open, ex + ew, ey); g.stroke(); // upper lid
    if (open > 0.3) { g.beginPath(); g.moveTo(ex - ew * 0.8, ey + R * 0.02); g.quadraticCurveTo(ex, ey + R * 0.07 * open, ex + ew * 0.8, ey + R * 0.02); g.stroke();
      g.beginPath(); g.arc(ex, ey - R * 0.015, R * 0.04 * open, 0, TAU); g.fillStyle = INK; g.fill(); }
  }
  g.beginPath(); g.moveTo(R * 0.02, -R * 0.12); g.quadraticCurveTo(R * 0.06, R * 0.08, R * 0.1, R * 0.14); g.quadraticCurveTo(R * 0.02, R * 0.2, -R * 0.08, R * 0.15); g.stroke(); // nose
  g.beginPath(); g.moveTo(-R * 0.2, R * 0.36); g.quadraticCurveTo(0, R * (0.42 + sun.smile * 0.06), R * 0.2, R * 0.36); g.stroke(); // mouth
  g.lineWidth = 0.8; g.beginPath(); g.moveTo(-R * 0.1, R * 0.47); g.quadraticCurveTo(0, R * 0.5, R * 0.1, R * 0.47); g.stroke(); // lower lip
  g.restore();
  // drops of light (yods) falling on the beat
  sun.yods = sun.yods.filter(d => d.y < py + ph * 0.8);
  sun.yods.forEach(d => { d.y += d.v * dt; d.x += Math.sin(t * 2 + d.p) * 5 * dt;
    smith(() => { g.beginPath(); g.moveTo(d.x, d.y - d.s * 1.8); g.quadraticCurveTo(d.x + d.s, d.y, d.x, d.y + d.s); g.quadraticCurveTo(d.x - d.s, d.y, d.x, d.y - d.s * 1.8); }, SMITH.sun, 0.9); });
  sun.yodFrom = [cx, cy + R, pw];
  // sunflowers peering over the wall, turned towards the sun, nodding to the music
  const wallTop = py + ph * 0.72;
  [[0.12, 0.6, 1], [0.34, 0.55, 0.9], [0.62, 0.57, 1.05], [0.86, 0.62, 0.95]].forEach(([fx, fy, sc], k) => {
    const bx = px + fx * pw, nod = Math.sin(t * 1.3 + k * 1.7) * 0.04 + S.spec[(k * 4 + 1) % 16] * 0.08;
    const hx = bx + (cx - bx) * 0.05, hy = py + ph * fy + nod * 10, r = pw * 0.07 * sc;
    smith(() => { g.beginPath(); g.moveTo(bx - 1.2, wallTop + 4); g.quadraticCurveTo(bx - 1.2, (wallTop + hy) / 2, hx - 1.2, hy + r * 0.5); g.lineTo(hx + 1.2, hy + r * 0.5); g.quadraticCurveTo(bx + 1.2, (wallTop + hy) / 2, bx + 1.2, wallTop + 4); g.closePath(); }, SMITH.stem, 0.9);
    for (const s of [-1, 1]) { const ly = (wallTop + hy) / 2 + s * r * 0.6, lx = bx + s * 1;
      smith(() => { g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + s * r * 0.8, ly - r * 0.6, lx + s * r * 1.5, ly - r * 0.2); g.quadraticCurveTo(lx + s * r * 0.8, ly + r * 0.2, lx, ly); }, SMITH.leaf, 0.9);
      g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + s * r * 0.8, ly - r * 0.25, lx + s * r * 1.35, ly - r * 0.2); g.strokeStyle = INK; g.lineWidth = 0.6; g.stroke(); }
    g.save(); g.translate(hx, hy); g.rotate((cx - hx) / pw * 0.5 + nod);
    for (let p = 0; p < 16; p++) { const a = p * TAU / 16, ca = Math.cos(a), sa = Math.sin(a), q = (u, v) => [ca * u - sa * v, sa * u + ca * v];
      smith(() => { g.beginPath(); g.moveTo(...q(r * 0.5, -r * 0.13)); g.quadraticCurveTo(...q(r * 0.85, -r * 0.13), ...q(r * 1.12, 0)); g.quadraticCurveTo(...q(r * 0.85, r * 0.13), ...q(r * 0.5, r * 0.13)); }, SMITH.petal, 0.8); }
    smith(() => { g.beginPath(); g.arc(0, 0, r * 0.52, 0, TAU); }, SMITH.seed, 1);
    g.strokeStyle = INK; g.lineWidth = 0.5; g.beginPath();
    for (let i = -3; i <= 3; i++) { g.moveTo(i * r * 0.14 - r * 0.3, -r * 0.4); g.lineTo(i * r * 0.14 + r * 0.3, r * 0.4); g.moveTo(i * r * 0.14 + r * 0.3, -r * 0.4); g.lineTo(i * r * 0.14 - r * 0.3, r * 0.4); }
    g.save(); g.beginPath(); g.arc(0, 0, r * 0.45, 0, TAU); g.clip(); g.stroke(); g.restore();
    g.restore();
  });
  // the wall: grey stones in courses, drawn in ink
  const wy = wallTop, wh = ph * 0.2;
  smith(() => { g.beginPath(); g.rect(px - 2, wy, pw + 4, wh); }, SMITH.wall, 1.2);
  g.save(); g.translate(0.8, -0.55); g.fillStyle = SMITH.wallDark; g.fillRect(px - 2, wy, pw + 4, wh * 0.12); g.restore();
  g.beginPath(); g.moveTo(px, wy + wh * 0.12); g.lineTo(px + pw, wy + wh * 0.12); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
  const rr = seeded(19), rows = 4, rh = wh * 0.88 / rows;
  g.lineWidth = 0.8; g.beginPath();
  for (let j = 0; j < rows; j++) { const y = wy + wh * 0.12 + j * rh; if (j) { g.moveTo(px, y); g.lineTo(px + pw, y); }
    for (let x = px + (j % 2) * pw * 0.07 + rr() * pw * 0.05; x < px + pw; x += pw * (0.12 + rr() * 0.08)) { g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 1.5, y + rh); } }
  g.stroke();
  // the ground at the foot of the wall
  smith(() => { g.beginPath(); g.rect(px - 2, wy + wh, pw + 4, ph - (wy + wh - py) + 2); }, SMITH.ground, 1.2);
  g.beginPath(); for (let i = 0; i < 18; i++) { const x = px + (i + 0.5) * pw / 18, y = py + ph - 3 - (i % 3) * 2; g.moveTo(x - 3, y); g.quadraticCurveTo(x - 1, y - 4, x, y - 6); g.moveTo(x + 3, y); g.quadraticCurveTo(x + 1, y - 4, x, y - 6); }
  g.strokeStyle = INK; g.lineWidth = 0.6; g.stroke();
  g.restore();

  // ---- the border, numeral and title in Smith's hand-lettered style ----
  g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(px, py, pw, ph);
  g.lineWidth = 1.1; g.strokeRect(px, y0 + b, pw, h - 2 * b);
  g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 ${Math.round(top * 0.62)}px Georgia, "Times New Roman", serif`;
  g.fillText("XIX", x0 + w / 2, y0 + b + top / 2 + 0.5);
  g.font = `600 ${Math.round(foot * 0.5)}px Georgia, "Times New Roman", serif`;
  if (g.letterSpacing !== undefined) g.letterSpacing = `${Math.round(foot * 0.08)}px`;
  g.fillText("THE SUN", x0 + w / 2, py + ph + foot / 2 + 0.5);
  if (g.letterSpacing !== undefined) g.letterSpacing = "0px";

  // ---- printed on card stock, and gently aged ----
  sun.rect = { x: x0, y: y0, w, h };
  R3.print(t);
}
function sunBeat() {
  if (!sun.yodFrom) return;
  const [cx, cy, pw] = sun.yodFrom;
  for (let k = 0; k < 2; k++) sun.yods.push({ x: cx + (Math.random() - 0.5) * pw * 0.6, y: cy, v: 26 + Math.random() * 26, s: 2.5 + Math.random() * 2, p: Math.random() * 6 });
}
const PRINT_FS = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; uniform float uT, uScale;
in vec2 vUv; out vec4 o;
vec4 S(vec2 px){ return texture(uSrc, uBox.xy + clamp(px, vec2(.5), uRes - .5) / uRes * uBox.zw); }
void main(){
  vec2 px = gl_FragCoord.xy, q = px / uScale, size = uRes / uScale;
  vec4 c0 = S(px); if (c0.a < .99) { o = vec4(c0.rgb * c0.a, c0.a); return; }
  vec3 c = c0.rgb, paper = vec3(.945, .918, .843);
  float lum = dot(c, vec3(.3, .59, .11));
  // the card stock: fine fibres running mostly one way, a faint mottle
  float fib = vn(vec2(q.x * .35, q.y * 2.2)) * .6 + vn(q * .9) * .4;
  float tone = .985 + .03 * (fib - .5) + .02 * (fb(q * .02) - .5);
  bool ink = lum < .2;
  vec3 col;
  if (ink) col = mix(vec3(.13, .105, .085), c, .3);                              // pen line, a little brown with age
  else {
    // litho colour: slightly uneven, never quite solid, the paper breathing through it
    float dens = .9 + .07 * fb(q * .06 + 3.) + .05 * (h12(floor(q * 1.4)) - .5);
    col = mix(paper, c, clamp(dens, 0., 1.));
    col = mix(vec3(dot(col, vec3(.3, .59, .11))), col, .9);                    // a century of light: colours a touch faded
  }
  col *= tone;
  // handling: the card is a little darker towards its edges, a few faint foxing spots
  vec2 e = min(q, size - q); float edge = 1. - smoothstep(0., 22., min(e.x, e.y));
  col *= 1. - edge * .05;
  vec2 cell = floor(q / 38.); vec2 fc = (h22(cell) * .8 + .1) * 38.; float fox = step(.9, h12(cell + 7.)) * smoothstep(3.5, 0., length(q - cell * 38. - fc));
  col = mix(col, col * vec3(.93, .86, .76), fox * .35);
  col = mix(col, col * vec3(1.02, 1., .95), .5);                                // warm, like old paper, but not yellowed
  o = vec4(clamp(col, 0., 1.) * c0.a, c0.a);
}`;
const R3 = { print: () => { if (sun.rect) r2Pass("print", PRINT_FS, sun.rect, { uT: 0 }); } };

// ----------------------------------------------------------------
// 3ii  THE BAROQUE HEAVEN. In the manner of the 17th-century painters of putti (Rubens, Reni, the
// Carracci): a dark, stormy sky torn open at the upper left by a glory of golden light; two plump
// putti, modelled as real 3D forms, fly together for a kiss.
// One concentrated light falls on them from the glory, so their bodies turn from luminous flesh
// into deep shadow (chiaroscuro); everything else sinks into darkness (tenebrism).
// The putti are drawn by ray-marching smooth 3D shapes, with soft shadows and light scattering
// under the skin; the picture is then finished like an old canvas: a linen weave, a faint crackle,
// warm varnish. The music swells the light and shifts it, beats the wings, and lets petals fall.
// ----------------------------------------------------------------
const heaven = { key: "", garland: null, frame: null, petals: [], lastNote: 0, meet: 0, li: 0.8, la: 0 };
const HEAVEN_FS = PAINT_COMMON + `
uniform vec2 uRes; uniform float uScale, uT, uLi, uLa, uSc;
uniform vec4 uA, uB; uniform vec3 uKa, uKb;   // position x, y, tilt, wing beat; reach, kick, head turn
in vec2 vUv; out vec4 o;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1. / l2;
  vec3 pa = p - a; float y = dot(pa, ba), z = y - l2; vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
const vec3 HC = vec3(.13, .2, 0.);
float curl(vec3 q){ vec3 hq = q - HC; return sin(hq.x * 60.) * sin(hq.y * 60. + 1.) * sin(hq.z * 60. + 2.); }
// one putto, flying towards +x, its near side towards us. Returns distance and material (1 skin, 2 hair, 3 wing).
vec2 putto(vec3 p, float flap, vec3 k){
  float reach = k.x, kick = k.y;
  vec3 q = p; q.xy = rot(.6) * q.xy;
  float d = sdEll(q - vec3(0., .02, 0.), vec3(.1, .14, .09));                       // chest and back
  d = smin(d, length(p - vec3(.03, -.03, 0.)) - .088, .06);                          // round belly
  d = smin(d, length(p - vec3(-.06, -.09, .034)) - .064, .04);                      // the bottom
  d = smin(d, length(p - vec3(-.06, -.09, -.034)) - .064, .04);
  // head: skull, cheeks, chin, nose, pursed lips
  vec3 hc = HC; vec3 ph = p - hc; ph.xy = rot(k.z) * ph.xy; ph += hc;
  float hd = length(ph - hc) - .094;
  hd = smin(hd, length(ph - (hc + vec3(.045, -.04, .044))) - .05, .03);
  hd = smin(hd, length(ph - (hc + vec3(.045, -.04, -.044))) - .05, .03);
  hd = smin(hd, length(ph - (hc + vec3(.03, -.065, 0.))) - .05, .03);
  hd = smin(hd, sdEll(ph - (hc + vec3(.094, -.012, 0.)), vec3(.016, .02, .015)), .012);
  hd = smin(hd, sdEll(ph - (hc + vec3(.088, -.052, 0.)), vec3(.02, .013, .022)), .01);
  d = smin(d, hd, .05);
  // arms: the near one reaches towards the other putto, the far one rises
  vec3 S1 = vec3(.06, .1, .068), E1 = vec3(.13, .03 + .05 * reach, .105), W1 = vec3(.2 + .03 * reach, .07 + .07 * reach, .095);
  vec3 S2 = vec3(.06, .1, -.068), E2 = vec3(.14, .13, -.11), W2 = vec3(.19, .2, -.08);
  d = smin(d, sdRC(p, S1, E1, .04, .032), .03); d = smin(d, sdRC(p, E1, W1, .032, .025), .015); d = smin(d, sdEll(p - W1 - vec3(.022, .004, 0.), vec3(.03, .02, .024)), .015);
  d = smin(d, sdRC(p, S2, E2, .038, .03), .03); d = smin(d, sdRC(p, E2, W2, .03, .024), .015); d = smin(d, sdEll(p - W2 - vec3(.016, .018, 0.), vec3(.022, .03, .02)), .015);
  // legs: chubby thighs, bent knees, small feet
  vec3 H1 = vec3(-.05, -.09, .045), K1 = vec3(-.17, -.035 + .035 * kick, .075), A1 = vec3(-.26, -.12 + .025 * kick, .065);
  vec3 H2 = vec3(-.05, -.09, -.045), K2 = vec3(-.15, -.16, -.06), A2 = vec3(-.27, -.18, -.05);
  d = smin(d, sdRC(p, H1, K1, .062, .044), .04); d = smin(d, sdRC(p, K1, A1, .044, .027), .02); d = smin(d, sdEll(p - A1 - vec3(-.024, -.012, 0.), vec3(.036, .017, .021)), .015);
  d = smin(d, sdRC(p, H2, K2, .06, .042), .04); d = smin(d, sdRC(p, K2, A2, .042, .026), .02); d = smin(d, sdEll(p - A2 - vec3(-.024, -.012, 0.), vec3(.034, .016, .02)), .015);
  vec2 res = vec2(d, 1.);
  // hair: a cap of tight curls over the back and top of the head
  vec3 hq = ph - hc;
  float hr = length(hq) - .094;
  for (int i = 0; i < 64; i++) {
    float fi = float(i), yy = 1. - (fi + .5) / 64. * 1.6, rr = sqrt(max(0., 1. - yy * yy)), a = fi * 2.39996;
    vec3 dir = vec3(cos(a) * rr, yy, sin(a) * rr);
    if (dir.x > .38 || dir.y < -.5) continue;
    hr = smin(hr, length(hq - dir * .094) - .019, .007);
  }
  hr = max(hr, dot(hq, normalize(vec3(.75, -.55, 0.))) - .02);
  if (hr < res.x + .002) res = vec2(min(hr, res.x), 2.);
  // wings: a fan of long flight feathers over a rounded shoulder of small ones, beating
  for (int s = 0; s < 2; s++) {
    float sd = s == 0 ? 1. : -1.;
    vec3 w = p - vec3(-.02, .11, .03 * sd);
    w.yz = rot(sd * (.55 + flap)) * w.yz;
    float wd = sdEll(vec3(rot(-.9) * (w.xy - vec2(-.03, .07)), w.z), vec3(.09, .06, .014));
    for (int f = 0; f < 7; f++) {
      float ff = float(f), a = 1.25 + ff * .19, len = .17 + .07 * sin(ff * .45 + .3);
      vec2 dir = vec2(cos(a), sin(a)), pp = vec2(-dir.y, dir.x);
      vec3 qf = vec3(dot(w.xy, dir) - len * .5, dot(w.xy, pp), w.z + ff * .002 * sd);
      wd = smin(wd, sdEll(qf, vec3(len * .5, .026, .006)), .01);
    }
    if (wd < res.x) res = vec2(wd, 3.);
  }
  return res;
}
vec3 toA(vec3 p){ vec3 q = p - vec3(uA.xy, 0.); q.xy = rot(-uA.z) * q.xy; return q / uSc; }
vec3 toB(vec3 p){ vec3 q = p - vec3(uB.xy, 0.); q.x = -q.x; q.xy = rot(-uB.z) * q.xy; return q / uSc; }
vec2 map(vec3 p){
  vec3 a = toA(p), b = toB(p);
  vec2 ra = length(a) > .55 ? vec2((length(a) - .45) * uSc, 0.) : putto(a, uA.w, uKa) * vec2(uSc, 1.);
  vec2 rb = length(b) > .55 ? vec2((length(b) - .45) * uSc, 0.) : putto(b, uB.w, uKb) * vec2(uSc, 1.);
  if (rb.x < ra.x) { rb.y += 10.; return rb; }
  return ra;
}
vec3 nrm(vec3 p){ vec2 e = vec2(.0008, -.0008);
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x); }
float shadow(vec3 ro, vec3 rd){ float res = 1., t = .01; for (int i = 0; i < 28; i++) { float h = map(ro + rd * t).x; res = min(res, 10. * h / t); t += clamp(h, .006, .08); if (res < .002 || t > 1.2) break; } return clamp(res, 0., 1.); }
float occl(vec3 p, vec3 n){ float o = 0., s = 1.; for (int i = 1; i <= 5; i++) { float h = .012 * float(i); o += (h - map(p + n * h).x) * s; s *= .7; } return clamp(1. - o * 9., 0., 1.); }
// the sky: dark storm clouds, torn open by a glory of gold light at the upper left
vec3 sky(vec2 p, vec3 L){
  // worked out in the painter's (display) values, then turned into light for the mix with the putti
  vec2 G = vec2(-.36, .68);
  float dg = length(p - G);
  vec3 col = mix(vec3(.05, .04, .045), vec3(.13, .1, .075), smoothstep(-1.2, 1., p.y - p.x * .6));
  vec2 w = p * 1.4 + vec2(fb(p * 1.1 + uT * .01), fb(p * 1.1 + 5.)) * .9 + vec2(uT * .005, 0.);
  float d = fb(w) * .6 + fb(w * 2.4 + 3.) * .4;
  // the glory: a hole of golden light in the clouds
  float hole = smoothstep(.75, .2, dg + (d - .5) * .5);
  col = mix(col, mix(vec3(.95, .72, .38), vec3(1., .95, .8), smoothstep(.45, .0, dg)) * (.75 + .3 * uLi), hole);
  // crepuscular rays falling from it
  float an = atan(p.y - G.y, p.x - G.x);
  col += vec3(.9, .7, .45) * pow(vn(vec2(an * 13., uT * .04)), 3.) * smoothstep(1.8, .3, dg) * (1. - hole) * .22 * uLi;
  // the storm clouds around it, lit on the side that faces the light
  vec2 toG = normalize(G - p);
  vec2 p2 = p + toG * .06, w2 = p2 * 1.4 + vec2(fb(p2 * 1.1 + uT * .01), fb(p2 * 1.1 + 5.)) * .9 + vec2(uT * .005, 0.);
  float d2 = fb(w2) * .6 + fb(w2 * 2.4 + 3.) * .4;
  float mask = smoothstep(.46, .6, d) * (1. - hole);
  float lit = clamp((d - d2) * 7. + .3, 0., 1.) * exp(-dg * .9) * uLi;
  vec3 cc = mix(vec3(.07, .055, .05), vec3(.2, .15, .11), smoothstep(.5, .85, d)) + vec3(.95, .72, .45) * lit * .8;
  col = mix(col, cc, mask);
  return pow(col, vec3(2.2));
}
void main(){
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y * 2.;
  vec3 L = normalize(vec3(-.8 + uLa, .72, .32));
  vec3 col = sky(p, L);
  // march the putti (an orthographic view, like a painter's)
  vec3 ro = vec3(p, 2.), rd = vec3(0., 0., -1.);
  float t = 1.4; vec2 h = vec2(1.);
  for (int i = 0; i < 90; i++) { h = map(ro + rd * t); if (h.x < .0004 || t > 2.6) break; t += h.x * .9; }
  if (t < 2.6) {
    vec3 pos = ro + rd * t, n = nrm(pos), V = -rd;
    float mat = mod(h.y, 10.); vec3 q = h.y > 9. ? toB(pos) : toA(pos);
    float dif = max(dot(n, L), 0.), sh = shadow(pos + n * .004, L), ao = occl(pos, n);
    float wrap = clamp((dot(n, L) + .4) / 1.4, 0., 1.);
    vec3 Lc = vec3(1., .86, .66) * 2.1 * uLi;
    vec3 amb = (vec3(.014, .015, .011) + vec3(.025, .016, .009) * clamp(-n.y, 0., 1.)) * ao;  // warm bounce from the clouds below, little else
    vec3 alb; float spec = 0.;
    if (mat < 1.5) {
      alb = vec3(.8, .6, .47);
      vec3 qh = q - HC;
      alb = mix(alb, vec3(.86, .42, .36), smoothstep(.05, .0, length(qh - vec3(.045, -.04, .044))) * .6);  // rosy cheek
      alb = mix(alb, vec3(.72, .28, .26), smoothstep(.025, .0, length(qh - vec3(.088, -.052, 0.))) * .8); // lips
      // the closed eye, a soft line of lashes
      vec2 e = qh.xy - vec2(.066, .006); float lid = abs(e.y + 6. * e.x * e.x) ;
      alb *= 1. - smoothstep(.004, .0015, lid) * step(abs(e.x), .02) * step(.02, qh.z) * .65;
      vec3 sss = vec3(.8, .24, .1) * smoothstep(0., .6, wrap) * (1. - smoothstep(.2, .9, dif)) * .35;
      // painted flesh: cool olive half-tones in the shadow, rose in the middle tones, warm ivory in the light
      float lum = dif * sh;
      vec3 tone = mix(vec3(.3, .25, .19), alb, smoothstep(.0, .45, lum));
      tone = mix(tone, vec3(1., .9, .78), smoothstep(.55, 1., lum) * .7);
      col = tone * (Lc * (lum * .95 + .06) + amb * 1.2) + alb * Lc * sss * mix(.4, 1., sh);
      vec3 H = normalize(L + V); spec = pow(max(dot(n, H), 0.), 26.) * .14 * sh;
      col *= .96 + .06 * vn(vec2(dot(pos.xy, vec2(.7, .7)) * 260., dot(pos.xy, vec2(-.7, .7)) * 40.)) * smoothstep(.3, .9, dif * sh); // the soft drag of the brush in the lights
      col += Lc * spec;
    } else if (mat < 2.5) {
      alb = vec3(.52, .32, .13) * (.85 + .3 * smoothstep(-.5, 1., curl(q)));
      col = alb * (Lc * (dif * sh * .9 + .1 * wrap) + amb);
      vec3 H = normalize(L + V); col += Lc * vec3(1., .8, .5) * pow(max(dot(n, H), 0.), 40.) * .25 * sh;
    } else {
      // feathers: soft grooves running out from the shoulder
      float f = .5 + .5 * sin(atan(q.y - .11, q.x + .02) * 90.);
      alb = vec3(.8, .76, .68) * (.94 + .06 * f);
      col = alb * (Lc * (dif * .75 + wrap * .2) * mix(.3, 1., sh) + amb * 1.5);
    }
    col += vec3(.25, .3, .4) * pow(1. - max(dot(n, V), 0.), 4.) * .08 * ao;   // a cool edge of reflected sky
  }
  
  col = 1. - exp(-col * 1.25);
  col = pow(col, vec3(1. / 2.2));
  o = vec4(col, 1.);
}`;
// an old canvas: linen weave pressing faintly through the paint, a fine crackle, warm varnish
const OILAGE_FS = PAINT_COMMON + `
uniform sampler2D uSrc; uniform vec4 uBox; uniform vec2 uRes; uniform float uT, uScale;
in vec2 vUv; out vec4 o;
vec4 S(vec2 px){ return texture(uSrc, uBox.xy + clamp(px, vec2(.5), uRes - .5) / uRes * uBox.zw); }
float crackle(vec2 p){ vec2 id = floor(p), f = fract(p); float d1 = 9., d2 = 9.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(i, j), r = g + h22(id + g) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return 1. - smoothstep(0., .04, sqrt(d2) - sqrt(d1)); }
void main(){
  vec2 px = gl_FragCoord.xy, q = px / uScale;
  vec4 c0 = S(px); vec3 c = c0.rgb; float l = dot(c, vec3(.3, .59, .11));
  float wv = (sin(q.x * 2.2) * .5 + .5) * (sin(q.y * 2.2) * .5 + .5) * .5 + vn(q * .8) * .5;
  c *= .985 + .03 * wv * (.4 + l);
  float k = crackle(q * .09 + fb(q * .015)) * smoothstep(.4, .65, fb(q * .005 + 3.)); c *= 1. - k * .06 * smoothstep(.1, .6, l);
  c = mix(c, c * vec3(1.04, .97, .84), .35);
  o = vec4(clamp(c, 0., 1.) * c0.a, c0.a);
}`;
// draw a shader straight onto the page (no scene underneath to read)
function r3Render(name, fs, rect, uniforms) {
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return false;
  const { gl } = PAINT, p = r2Prog(name, fs);
  const x = Math.round(rect.x * DPR), y = Math.round(rect.y * DPR), w = Math.round(rect.w * DPR), h = Math.round(rect.h * DPR);
  paintResize(w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  paintUse(p, Object.assign({ uRes: [w, h], uScale: DPR }, uniforms));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAINT.cv, x, y); g.restore();
  return true;
}
function heavenScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.66), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const key = Math.round(w) + "x" + Math.round(h) + "@" + DPR;
  if (heaven.key !== key) {
    heaven.key = key;
    heaven.garland = offscreen(w, h * 0.3, (gw, gh) => { // roses, peonies, leaves and strings of pearls along the bottom, in the shadows
      const r = seeded(9);
      for (let i = 0; i < 14; i++) paintLeaf(r() * gw, gh * (0.45 + r() * 0.5), gh * 0.22, (r() - 0.5) * 2.5, i);
      [[0.1, 0.75, 0.2, [150, 40, 50], [214, 120, 120]], [0.32, 0.85, 0.17, [200, 176, 140], [240, 226, 200]], [0.55, 0.8, 0.22, [190, 150, 90], [236, 206, 150]], [0.8, 0.78, 0.19, [120, 24, 36], [190, 80, 90]], [0.95, 0.92, 0.15, [200, 176, 140], [240, 226, 200]]]
        .forEach(([px, py, pr, b, tp], k) => paintBloom(px * gw, py * gh, pr * gh, b, tp, 60 + k));
      for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 40; i++) { const p = i / 39, x = p * gw, y = gh * (0.55 + s2 * 0.15) + Math.sin(p * Math.PI * (2 + s2)) * gh * 0.12; pearl(x, y, gh * 0.025); }
      // the garland lies in shadow: only its left side catches the light
      g.globalCompositeOperation = "source-atop";
      const sh = g.createLinearGradient(0, 0, gw, gh); sh.addColorStop(0, "rgba(20,10,4,0.35)"); sh.addColorStop(1, "rgba(10,5,2,0.8)");
      g.fillStyle = sh; g.fillRect(0, 0, gw, gh); g.globalCompositeOperation = "source-over";
    });
    heaven.frame = offscreen(w, h, (fw, fh) => { // a carved, gilded frame with an arched top
      const b = fw * 0.05, inner = () => { g.moveTo(b, fh - b); g.lineTo(fw - b, fh - b); g.lineTo(fw - b, b + fw * 0.25); g.bezierCurveTo(fw - b, b, b, b, b, b + fw * 0.25); g.closePath(); };
      g.beginPath(); g.rect(0, 0, fw, fh); inner();
      const gold = g.createLinearGradient(0, 0, fw, fh);
      gold.addColorStop(0, "rgb(214,176,98)"); gold.addColorStop(0.3, "rgb(120,84,30)"); gold.addColorStop(0.55, "rgb(206,166,92)"); gold.addColorStop(0.8, "rgb(96,64,24)"); gold.addColorStop(1, "rgb(170,130,64)");
      g.fillStyle = gold; g.fill("evenodd");
      g.lineWidth = 1.5; g.strokeStyle = "rgba(60,36,10,0.8)"; g.beginPath(); inner(); g.stroke();
      g.strokeStyle = "rgba(255,230,160,0.5)"; g.lineWidth = 1; g.strokeRect(b * 0.35, b * 0.35, fw - b * 0.7, fh - b * 0.7);
      g.strokeStyle = "rgba(60,36,10,0.6)"; g.strokeRect(b * 0.55, b * 0.55, fw - b * 1.1, fh - b * 1.1);
    });
  }
  // the light swells and shifts with the music, like a cloud passing the sun
  heaven.li += ((0.72 + S.mid * 0.45 + S.pulse * 0.25) - heaven.li) * Math.min(1, dt * 1.5);
  heaven.la = Math.sin(t * 0.13) * 0.12 + Math.sin(t * 0.07) * 0.06;
  heaven.meet += dt / 13.3;
  const ph = heaven.meet % 1, close = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 3);
  const sc = 0.85, gap = 0.205 * sc + (1 - close) * 0.11, cy = 0.1;
  const beat = f => Math.sin(t * (6 + S.mid * 5) + f) * 0.35;
  const ok = r3Render("heaven", HEAVEN_FS, { x: x0, y: y0, w, h }, {
    uT: t, uLi: heaven.li, uLa: heaven.la, uSc: sc,
    uA: [-gap, cy + Math.sin(t * 1.6) * 0.025 + close * 0.02, 0.08 + close * 0.08, beat(0)],
    uB: [gap, cy + Math.sin(t * 1.6 + 1.3) * 0.025 + close * 0.02, 0.08 + close * 0.08, beat(1)],
    uKa: [close, Math.sin(t * 1.1) * 0.5 + 0.5, -0.1 + close * 0.12], uKb: [close * 0.8 + 0.2, Math.sin(t * 1.1 + 2) * 0.5 + 0.5, -0.04 + close * 0.08] });
  if (!ok) { g.fillStyle = "#1a140f"; g.fillRect(x0, y0, w, h); }
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  // every note of the harpsichord lets a rose petal (or sometimes a pearl) fall through the light
  const now = ctx ? ctx.currentTime : 0;
  while (NOTES.length && NOTES[0].t + 2 < now) NOTES.shift();
  NOTES.forEach(n => { if (n.t <= now && n.t > heaven.lastNote) { heaven.lastNote = n.t; if (heaven.petals.length < 70) heaven.petals.push({ x: x0 + w * (0.1 + Math.random() * 0.6), y: y0 - 10, vx: (Math.random() - 0.3) * 20, vy: 22 + Math.random() * 22, a: Math.random() * TAU, spin: (Math.random() - 0.5) * 4, pearl: Math.random() < 0.12, col: pick([[170, 40, 52], [214, 120, 128], [236, 200, 186], [140, 20, 36]]) }); } });
  heaven.petals = heaven.petals.filter(p => p.y < y0 + h + 20);
  heaven.petals.forEach(p => {
    p.x += (p.vx + Math.sin(t * 2 + p.a) * 16) * dt; p.y += p.vy * dt; p.a += p.spin * dt;
    // lit only where the glory reaches; elsewhere they fall in shadow
    const gx = (p.x - x0) / w - 0.18, gy = (p.y - y0) / h - 0.05, lit = Math.max(0.15, Math.min(1, Math.exp(-Math.hypot(gx, gy) * 2.2) * 1.6 * heaven.li));
    if (p.pearl) { g.globalAlpha = 0.4 + lit * 0.6; pearl(p.x, p.y, 3.5); g.globalAlpha = 1; return; }
    g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.abs(Math.cos(t * 2 + p.a)) * 0.7 + 0.3);
    g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(6, -5, 5, 4, 0, 6); g.bezierCurveTo(-5, 4, -6, -5, 0, -6);
    const c = p.col.map(v => Math.round(v * (0.25 + lit * 0.85))), c2 = mixc(c, [255, 230, 190], 0.25 * lit);
    const pg = g.createLinearGradient(0, -6, 0, 6); pg.addColorStop(0, `rgb(${c})`); pg.addColorStop(1, `rgb(${c2.map(Math.round)})`); g.fillStyle = pg; g.fill();
    g.restore();
  });
  blit(heaven.garland, x0, y0 + h * 0.72);
  g.restore();
  r2Pass("oilage", OILAGE_FS, { x: x0, y: y0, w, h }, { uT: 0 });
  blit(heaven.frame, x0, y0);
}
