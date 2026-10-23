// ================================================================
// ROOM 5, pieces ii and iii — Japanese, each in its own medium.
//   ii  koi in sumi-e and watercolour on washi: ink outlines laid with a brush, translucent washes of
//       vermilion, orange and charcoal that pool at their edges, a great deal of untouched paper
//   iii a blooming ornament of traditional textile patterns (asanoha, shippo, seigaiha, kiku), printed in
//       indigo, ivory, muted gold, sage and vermilion, that opens outward like a flower on each beat
// Both are painted by a shader at the screen's full pixel density, so lines stay sharp on Retina displays.
// ================================================================

// a shader straight onto the page, with array uniforms (koi spines, ripples) as well as plain ones
function r5Render(name, fs, rect, uniforms, arrays) {
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return false;
  const { gl } = PAINT, p = r2Prog(name, fs);
  const x = Math.round(rect.x * DPR), y = Math.round(rect.y * DPR), w = Math.round(rect.w * DPR), h = Math.round(rect.h * DPR);
  paintResize(w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  paintUse(p, Object.assign({ uRes: [w, h], uScale: DPR }, uniforms));
  for (const k in arrays) { const loc = p.u[k] !== undefined ? p.u[k] : (p.u[k] = gl.getUniformLocation(p, k)); if (loc === null) continue;
    const a = arrays[k]; if (a.kind === 2) gl.uniform2fv(loc, a.data); else gl.uniform4fv(loc, a.data); }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAINT.cv, x, y); g.restore();
  return true;
}

// ----------------------------------------------------------------
// 5ii  KOI. Four fish: a kohaku (white with vermilion), a tancho (a single red crown), a muted orange
// ogon, and a showa in charcoal and vermilion. Each swims along its own wandering path; its body follows
// the head like a real fish, a wave runs down it to the tail, the pectoral fins scull. Ripples open
// where a fish rises on the beat. The music sets their pace, how the water moves, how far the pigment bleeds.
// ----------------------------------------------------------------
const KOI_N = 4, KOI_P = 8;
const ink5 = { fish: null, rip: [], drift: 0, diff: 0, energy: 0, w: 0, h: 0, nextRip: 3 };
function koiInit(w, h) {
  const r = seeded(1788);
  ink5.w = w; ink5.h = h; ink5.rip = [];
  ink5.fish = [0, 1, 2, 3].map(i => {
    const L = h * (i === 1 ? 0.2 : 0.24) * (0.92 + r() * 0.16);
    const f = { x: w * (0.25 + r() * 0.5), y: h * (0.15 + i * 0.22), a: r() * TAU, v: 0, L, ph: r() * TAU, turn: 0, seed: i * 17 + 3, kind: i, trail: [] };
    for (let k = 0; k < 120; k++) f.trail.push([f.x - Math.cos(f.a) * k * 2, f.y - Math.sin(f.a) * k * 2]);
    return f;
  });
}
function koiStep(t, dt) {
  const { w, h } = ink5, energy = ink5.energy;
  ink5.fish.forEach((f, i) => {
    // wander: a slow turning that comes from the fish's own noise, steering home from the edges and away from the others
    let turn = (noise2(t * 0.11 + f.seed, i * 3.1) - 0.5) * 1.6;
    const mx = w * 0.12, my = h * 0.1, home = Math.atan2(h / 2 - f.y, w / 2 - f.x);
    const out = Math.max(0, mx - f.x, f.x - (w - mx)) / mx + Math.max(0, my - f.y, f.y - (h - my)) / my;
    let da = Math.atan2(Math.sin(home - f.a), Math.cos(home - f.a)); turn += da * Math.min(2.2, out * 2.5);
    ink5.fish.forEach((o, j) => { if (j === i) return; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < f.L * 0.9) { const aw = Math.atan2(dy, dx); turn += Math.atan2(Math.sin(aw - f.a), Math.cos(aw - f.a)) * (1 - d / (f.L * 0.9)) * 1.2; } });
    f.turn += (turn - f.turn) * Math.min(1, dt * 1.5);
    const vGoal = f.L * (0.16 + energy * 0.32) * (0.8 + 0.4 * noise2(t * 0.07, f.seed));
    f.v += (vGoal - f.v) * Math.min(1, dt * 0.8);
    f.a += f.turn * dt * (0.35 + f.v / f.L * 0.8);
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
    // the tail beats faster as it swims faster
    f.ph += dt * (1.6 + f.v / f.L * 9);
    const last = f.trail[0]; if (Math.hypot(f.x - last[0], f.y - last[1]) > 0.8) { f.trail.unshift([f.x, f.y]); if (f.trail.length > 400) f.trail.pop(); }
  });
}
// the spine: points spaced along the path the head has taken, with a travelling wave laid across it
function koiSpine(f) {
  const seg = f.L * 0.85 / (KOI_P - 1), pts = [];
  let acc = 0, k = 0, prev = [f.x, f.y];
  pts.push(prev);
  for (let j = 1; j < KOI_P; j++) {
    const want = j * seg;
    while (k < f.trail.length - 1) { const a = f.trail[k], b = f.trail[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + d >= want) { const u = (want - acc) / d; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); break; } acc += d; k++; }
    if (pts.length <= j) { const p = pts[pts.length - 1]; pts.push([p[0] - Math.cos(f.a) * seg, p[1] - Math.sin(f.a) * seg]); }
  }
  for (let j = 1; j < KOI_P; j++) {
    const a = pts[j - 1], b = pts[j], nx = -(b[1] - a[1]), ny = b[0] - a[0], n = Math.hypot(nx, ny) || 1, s = j / (KOI_P - 1);
    const amp = f.L * 0.03 * Math.pow(s, 1.6) * (0.7 + Math.min(1, f.v / f.L * 2));
    const o = Math.sin(f.ph - j * 0.85) * amp; pts[j] = [b[0] + nx / n * o, b[1] + ny / n * o];
  }
  return pts;
}
const KOI_FS = PAINT_COMMON + `
uniform vec2 uRes; uniform float uScale, uT, uDrift, uDiff;
uniform vec2 uSp[${KOI_N * KOI_P}];
uniform vec4 uK[${KOI_N}];      // length, tail flap, pectoral angle, kind
uniform vec4 uR[8];             // ripples: x, y, radius, strength
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
// a wash of pigment over paper: subtractive, so it is mixed as a multiply
vec3 wash(vec3 base, vec3 pig, float a){ return base * mix(vec3(1.), pig, clamp(a, 0., 1.)); }
float seg(vec2 p, vec2 a, vec2 b, out float t, out float sd){ vec2 ab = b - a, ap = p - a; t = clamp(dot(ap, ab) / dot(ab, ab), 0., 1.);
  vec2 q = a + ab * t; sd = sign(ab.x * ap.y - ab.y * ap.x); return length(p - q); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;      // CSS pixels, y down, as the fish are simulated
  vec2 css = uRes / uScale;
  // ---- washi: kozo fibres lying every which way, a soft mottle, the paper's warmth ----
  vec3 paper = lin(vec3(.95, .925, .87));
  float mott = fb(px * .012) - .5;
  float fib = 0.;
  for (int k = 0; k < 3; k++) { float an = float(k) * 2.1 + .4; vec2 d = vec2(cos(an), sin(an)); vec2 q = vec2(dot(px, d), dot(px, vec2(-d.y, d.x)));
    float line = vn(vec2(q.x * .035, q.y * .9) + float(k) * 13.); fib += smoothstep(.82, .97, line) * .5; }
  paper *= 1. + mott * .04 - fib * .025;
  vec3 col = paper;
  // ---- the water: a few pale blue-grey washes, their wet edges darker, drifting very slowly ----
  vec2 wp = px * vec2(.0028, .0075) + vec2(uDrift * .6, uDrift * .25);
  float wv = fb(wp + fb(wp * 1.7 + 4.) * .6);
  float wa = smoothstep(.52, .6 - uDiff * .03, wv);
  float wedge = smoothstep(.52, .55, wv) - smoothstep(.55, .62, wv);
  float corner = smoothstep(.95, .25, length((px / css - vec2(.92, .1)) * vec2(1., 1.3)));   // the wash gathers toward one corner; the rest is left bare
  col = wash(col, lin(vec3(.8, .85, .88)), (wa * .32 + wedge * .2) * corner);
  // ---- ripples: thin grey rings that widen and fade ----
  float ripple = 0.; vec2 refr = vec2(0.);
  for (int i = 0; i < 8; i++) { vec4 R = uR[i]; if (R.w <= 0.) continue; vec2 d = px - R.xy; float r = length(d);
    float ring = exp(-pow((r - R.z) / 1.4, 2.)) + .5 * exp(-pow((r - R.z * .78) / 1.2, 2.));
    ripple += ring * R.w * (.85 + .3 * vn(vec2(atan(d.y, d.x) * 6., R.z * .1)));
    refr += normalize(d + 1e-4) * exp(-pow((r - R.z) / 6., 2.)) * R.w * 2.; }
  vec2 fp = px + refr;                                           // the fish seen through the moving surface
  // ---- the fish ----
  for (int i = 0; i < ${KOI_N}; i++) {
    vec4 K = uK[i]; float L = K.x, kind = K.w;
    // a soft shadow on the pond floor, offset and pale
    // closest point on the spine
    float best = 1e9, bs = 0., bside = 1.; vec2 tdir = vec2(1., 0.), tail = vec2(0.);
    float bestS = 1e9, sS = 0.;
    for (int j = 0; j < ${KOI_P - 1}; j++) {
      vec2 a = uSp[i * ${KOI_P} + j], b = uSp[i * ${KOI_P} + j + 1]; float t, sd;
      float d = seg(fp, a, b, t, sd); if (d < best) { best = d; bs = (float(j) + t) / ${(KOI_P - 1).toFixed(1)}; bside = sd; }
      float d2 = seg(fp - vec2(7., 9.), a, b, t, sd); if (d2 < bestS) { bestS = d2; sS = (float(j) + t) / ${(KOI_P - 1).toFixed(1)}; }
    }
    vec2 pA = uSp[i * ${KOI_P} + ${KOI_P - 2}], pB = uSp[i * ${KOI_P} + ${KOI_P - 1}];
    float fa = atan(pB.y - pA.y, pB.x - pA.x) + K.y; tdir = vec2(cos(fa), sin(fa));
    float s = bs * .85;
    float Wm = L * .15;
    float wb = s < .3 ? Wm * (.62 + .38 * sin(s / .3 * 1.5708)) : Wm * mix(1., .2, smoothstep(.3, .85, s));   // a round snout, the full shoulders, a slim wrist before the tail
    float shS = sS * .85, wS = shS < .3 ? Wm * (.62 + .38 * sin(shS / .3 * 1.5708)) : Wm * mix(1., .2, smoothstep(.3, .85, shS));
    col = wash(col, lin(vec3(.74, .78, .82)), .28 * (1. - smoothstep(wS - 3., wS + 5., bestS)));
    // tail fin: a forked fan beyond the spine's end, flapping
    vec2 tq = fp - pB; float ta = dot(tq, tdir), tb = dot(tq, vec2(-tdir.y, tdir.x));
    float tl = L * .26, tw = L * .025 + max(ta, 0.) * .85, notch = smoothstep(tl * .45, tl, ta) * tw * .55;
    float inTail = step(0., ta) * step(ta, tl) * step(abs(tb), tw) * step(notch, abs(tb) + (1. - step(tl * .45, ta)) * 1e3) * smoothstep(tl, tl * .8, ta + abs(tb) * .35);
    // pectoral fins: two paddles behind the head, sculling
    vec2 pc = uSp[i * ${KOI_P} + 1], pn = normalize(uSp[i * ${KOI_P}] - pc), pnr = vec2(-pn.y, pn.x);
    float fins = 0., finRay = 0.;
    for (int sgn = -1; sgn <= 1; sgn += 2) { float sg = float(sgn), ang = K.z * sg;
      vec2 fd = normalize(-pn * cos(ang) + pnr * sg * sin(ang) * 1.6), base = pc + pnr * sg * Wm * .75;
      vec2 q = fp - base; float u = dot(q, fd), v = dot(q, vec2(-fd.y, fd.x));
      float e = (u / (L * .22) - .5) * 2.; float inside = step(0., u) * step(e * e + pow(v / (L * .075), 2.) * 1.2, 1.);
      fins = max(fins, inside); finRay = max(finRay, inside * smoothstep(.35, .0, abs(fract(atan(v, u + L * .04) * 12.) - .5)) * .5); }
    float body = 1. - smoothstep(wb - .6, wb + .6, best);
    float edgeD = wb - best;                                           // distance inside the outline
    // fins and tail first: the thinnest, palest wash, with ink rays
    float finA = max(inTail, fins) * (1. - body);
    vec3 finPig = kind < .5 ? lin(vec3(.93, .86, .8)) : kind < 1.5 ? lin(vec3(.94, .9, .86)) : kind < 2.5 ? lin(vec3(.95, .78, .6)) : lin(vec3(.78, .76, .76));
    col = wash(col, finPig, finA * .75);
    float rays = inTail * smoothstep(.3, 0., abs(fract(atan(tb, ta + L * .05) * 14.) - .5)) * .35;
    col = wash(col, lin(vec3(.35, .32, .32)), (rays + finRay) * (.4 + .4 * smoothstep(.0, tl, ta)));
    col = wash(col, lin(vec3(.25, .22, .22)), max(inTail, fins) * (1. - body) * .2 * smoothstep(1.2, .2, abs(abs(tb) - tw)));   // the fin's faint edge
    // the body: white koi are left as paper with a cool shadow down the flanks; pigment patches over it
    vec2 bq = vec2(s * 6., (best * bside) / max(wb, 1.) * 1.3);
    float lat = clamp((best * bside) / max(wb, 1.), -1., 1.);
    vec3 bodyPig = kind < 2.5 ? lin(vec3(.88, .89, .9)) : lin(vec3(.34, .33, .34));
    if (kind > 1.5 && kind < 2.5) bodyPig = lin(vec3(.93, .7, .48));
    col = wash(col, bodyPig, body * (.2 + .55 * pow(abs(lat), 2.5)) * (kind > 2.5 ? 1.6 : 1.) * (.85 + .3 * fb(fp * .05 + 9.)));
    // pigment patches, with the darker rim a wash leaves where it dries
    // the wash's own life: uneven density, pigment settling into the paper's grain, edges that bled while wet
    float dens = .82 + .3 * fb(fp * .045 + K.w), gran = .9 + .2 * vn(fp * .8);
    float bleed = (vn(fp * .22 + K.w * 5.) - .5) * (.07 + uDiff * .06);
    float pn1 = fb(bq + K.w * 7.3) + (vn(bq * 3. + 5.) - .5) * (.15 + uDiff * .1) + bleed;
    float pat = 0.;
    if (kind < .5) pat = smoothstep(.5, .54 - uDiff * .02, pn1) * step(.05, s) * step(s, .78);
    else if (kind < 1.5) pat = smoothstep(.13, .11 - uDiff * .01, length(vec2((s - .07) * 1.6, lat * Wm / L)));
    else if (kind > 2.5) pat = smoothstep(.55, .59, pn1) * step(.03, s) * step(s, .7);
    float rim = pat * (1. - smoothstep(0., .04, pat - .5) * .0) * smoothstep(.0, .3, pat) * (1. - smoothstep(.3, 1., pat)) ;
    vec3 ver = lin(vec3(.8, .32, .22));
    col = wash(col, ver, (body * pat * (.8 + .15 * smoothstep(.6, 1., abs(lat))) + body * rim * .25) * dens * gran);
    if (kind > 2.5) { float wht = smoothstep(.36, .33, pn1) * step(.15, s); col = mix(col, paper * .96, body * wht * .7); }
    if (kind > 1.5 && kind < 2.5) col = wash(col, lin(vec3(.78, .5, .32)), body * .35 * smoothstep(.4, 0., abs(lat)) * step(s, .7));   // the ogon's darker back
    // a few loose scale marks on the back, as a brush suggests them
    vec2 sc = vec2(s * L / (Wm * .5), lat * 2.6 + .5 * mod(floor(s * L / (Wm * .5)), 2.));
    float scale = smoothstep(.12, .0, abs(length(fract(sc) - vec2(.0, .5)) - .5)) * step(.2, s) * step(s, .7) * step(abs(lat), .55);
    col = wash(col, lin(vec3(.3, .28, .28)), body * scale * .14 * vn(sc * .7 + K.w));
    // the dorsal fin, seen from above: a darker stroke down the spine
    col = wash(col, kind > 2.5 ? lin(vec3(.15, .14, .15)) : lin(vec3(.55, .42, .38)), body * smoothstep(.12, .02, abs(lat)) * step(.24, s) * step(s, .62) * .28);
    // ink: an outline laid with a brush, heavy at the head and lifting off toward the tail, with gaps where the brush ran dry
    float lw = (.45 + .9 * (1. - bs)) * (.6 + .8 * vn(vec2(bs * 9. + K.w * 3., bside)));
    float dry = smoothstep(.25, .45, vn(vec2(bs * 14. + K.w, bside * 3.)));
    float outline = smoothstep(-.6, .1, edgeD) * smoothstep(lw + .5, lw - .3, edgeD) * dry * smoothstep(.95, .5, bs);
    col = wash(col, lin(vec3(.13, .12, .12)), outline * .9);
    // gill line, eyes, a whisker of a mouth
    float gill = smoothstep(.9, .2, abs(s - .13 - lat * lat * .03) * L) * smoothstep(1., .7, abs(lat)) * body;
    col = wash(col, lin(vec3(.2, .18, .18)), gill * .55);
    for (int sgn = -1; sgn <= 1; sgn += 2) { vec2 ep = uSp[i * ${KOI_P}] + (pc - uSp[i * ${KOI_P}]) * .25 + pnr * float(sgn) * Wm * .5;
      col = wash(col, lin(vec3(.1, .1, .1)), smoothstep(L * .011 + .5, L * .011 - .5, length(fp - ep))); }
  }
  // ripples drawn last, in thin grey ink-water over everything
  col = wash(col, lin(vec3(.55, .6, .63)), clamp(ripple, 0., 1.) * .45);
  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}`;
function koiInkScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.7), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  if (!ink5.fish || Math.abs(ink5.w - w) > 1 || Math.abs(ink5.h - h) > 1) koiInit(w, h);
  ink5.energy += (Math.min(1, S.mid * 0.8 + S.bass * 0.5) - ink5.energy) * Math.min(1, dt * 0.8);
  ink5.drift += dt * (0.004 + ink5.energy * 0.02);
  ink5.diff += (Math.min(1, S.mid * 1.2) - ink5.diff) * Math.min(1, dt * 0.5);
  koiStep(t, Math.min(dt, 0.05));
  // ripples widen and fade; the music sometimes lets a fish rise on its own
  ink5.nextRip -= dt; if (ink5.nextRip < 0) { koiBeatInk(0.3); ink5.nextRip = 5 + Math.random() * 5; }
  ink5.rip.forEach(r => { r.r += dt * (18 + r.s * 10); r.a = r.s * Math.max(0, 1 - r.r / r.max); });
  ink5.rip = ink5.rip.filter(r => r.a > 0.01);
  const sp = new Float32Array(KOI_N * KOI_P * 2), K = new Float32Array(KOI_N * 4), R = new Float32Array(32);
  ink5.fish.forEach((f, i) => { koiSpine(f).forEach((p, j) => { sp[(i * KOI_P + j) * 2] = p[0]; sp[(i * KOI_P + j) * 2 + 1] = p[1]; });
    K.set([f.L, Math.sin(f.ph - KOI_P * 0.85) * 0.38, 0.75 + 0.35 * Math.sin(f.ph * 0.5 + i), f.kind], i * 4); });
  ink5.rip.slice(0, 8).forEach((r, i) => R.set([r.x, r.y, r.r, r.a], i * 4));
  const ok = r5Render("koiInk", KOI_FS, { x: x0, y: y0, w, h }, { uT: t, uDrift: ink5.drift, uDiff: ink5.diff }, { uSp: { kind: 2, data: sp }, uK: { kind: 4, data: K }, uR: { kind: 4, data: R } });
  if (!ok) { g.fillStyle = "#F2ECDF"; g.fillRect(x0, y0, w, h); }
  // the painter's seal in vermilion, low on the left
  const s = w * 0.055, sx = x0 + w * 0.07, sy = y0 + h * 0.86;
  g.save(); g.fillStyle = "rgba(178,58,44,0.86)"; g.fillRect(sx, sy, s, s * 1.25);
  g.strokeStyle = "rgba(246,238,226,0.92)"; g.lineWidth = s * 0.07; g.lineCap = "square";
  g.beginPath(); g.moveTo(sx + s * 0.2, sy + s * 0.22); g.lineTo(sx + s * 0.8, sy + s * 0.22); g.moveTo(sx + s * 0.5, sy + s * 0.22); g.lineTo(sx + s * 0.5, sy + s * 1.05);
  g.moveTo(sx + s * 0.22, sy + s * 0.55); g.lineTo(sx + s * 0.78, sy + s * 0.55); g.moveTo(sx + s * 0.25, sy + s * 0.8); g.lineTo(sx + s * 0.4, sy + s * 1.0); g.moveTo(sx + s * 0.75, sy + s * 0.8); g.lineTo(sx + s * 0.6, sy + s * 1.0); g.stroke();
  g.restore();
}
function koiBeatInk(strength) {
  if (!ink5.fish) return;
  const f = ink5.fish[Math.floor(Math.random() * KOI_N)], s = strength == null ? Math.min(1, 0.35 + S.bass * 0.8) : strength;
  if (ink5.rip.length < 8) ink5.rip.push({ x: f.x + Math.cos(f.a) * f.L * 0.05, y: f.y + Math.sin(f.a) * f.L * 0.05, r: 2, s, a: s, max: f.L * (0.8 + s * 0.8) });
}

// ----------------------------------------------------------------
// 5iii  THE BLOOM. Rings of petals, each petal-ring printed with its own traditional pattern: asanoha
// (hemp leaf), seigaiha (blue ocean waves), shippo (seven treasures), kiku (chrysanthemum). The rings
// are laid out in log-polar space, so every pattern keeps its true shape while it grows outward.
// Each real beat opens the flower a little: a stronger beat opens it further; between beats it breathes
// and settles back a little, never all the way. New petals keep forming at the heart as the outer
// rings open, overlap, and finally fade into the paper at the edge.
// ----------------------------------------------------------------
const bloom = { B: 0.6, v: 0, target: 0.6, peak: 0.6, lastT: -1, shim: 0 };
const BLOOM_FS = PAINT_COMMON + `
uniform vec2 uRes; uniform float uScale, uT, uB, uShim;
in vec2 vUv; out vec4 o;
const float TAU = 6.2831853, KX = .55;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float sgm(vec2 p, vec2 a, vec2 b){ vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0., 1.); return length(p - a - ab * t); }
// asanoha: equilateral triangles, each joined from its centre to its three corners
float asanoha(vec2 p){
  const float S3 = 1.7320508;
  vec2 sk = vec2(p.x - p.y / S3, 2. * p.y / S3), c = floor(sk), f = fract(sk);
  bool up = f.x + f.y < 1.;
  vec2 A = up ? c : c + 1., B = up ? c + vec2(1., 0.) : c + vec2(0., 1.), C = up ? c + vec2(0., 1.) : c + vec2(1., 0.);
  mat2 toC = mat2(1., 0., .5, S3 * .5);
  vec2 a = toC * A, b = toC * B, cc = toC * C, m = (a + b + cc) / 3.;
  return min(min(min(sgm(p, a, b), sgm(p, b, cc)), sgm(p, cc, a)), min(min(sgm(p, m, a), sgm(p, m, b)), sgm(p, m, cc)));
}
// seigaiha: overlapping fans of concentric arcs, each row in front of the one beyond it
float seigaiha(vec2 p, out float ring){
  float d = 9.; ring = 0.; float best = -1e9;
  for (int j = -1; j <= 2; j++) for (int i = -1; i <= 1; i++) {
    float row = floor(p.y * 2.) - float(j); vec2 c = vec2(floor(p.x) + float(i) + .5 * mod(row, 2.), row * .5);
    float r = length(p - c);
    if (r < .5 && c.y > best && p.y >= c.y - .02) { best = c.y; float k = r / .5 * 4.; ring = k; d = abs(fract(k) - .5) * .5 / 4. * 2.; d = min(d, abs(r - .5)); }
  }
  return d;
}
// shippo: two lattices of circles that overlap into four-petalled flowers
float shippo(vec2 p, out float lens){
  float d = 9.; int inside = 0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c1 = floor(p) + vec2(i, j), c2 = c1 + .5;
    float r1 = length(p - c1), r2 = length(p - c2);
    d = min(d, min(abs(r1 - .5), abs(r2 - .5)));
    inside += int(r1 < .5) + int(r2 < .5);
  }
  lens = inside >= 2 ? 1. : 0.;
  return d;
}
void main(){
  vec2 css = uRes / uScale, px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float M = min(css.x, css.y), R0 = M * .07;
  vec2 c = vec2(css.x * .5, css.y * .48), d = px - c;
  float r = length(d), th = atan(d.y, d.x);
  float x = log(r / R0 + 1.) / KX;                                      // log-radius: equal steps look equal at every size
  float dxdr = 1. / (KX * (r + R0));                                     // how much x changes per CSS pixel
  // washi beneath it all
  vec3 paper = lin(vec3(.95, .93, .88)) * (1. + (fb(px * .015) - .5) * .035);
  vec3 col = paper;
  // which ring of petals owns this point: the innermost whose scalloped edge still reaches past it
  int owner = -1; float own_edge = 0., shadow = 0.;
  float g0 = floor(uB - x);
  for (int k = 1; k >= -1; k--) {
    float G = g0 + float(k); if (G < 0.) continue;
    float age = uB - G; if (age <= 0.) continue;
    float n = mod(G, 5.) < 1. ? 8. : mod(G, 5.) < 2. ? 12. : mod(G, 5.) < 3. ? 10. : mod(G, 5.) < 4. ? 16. : 12.;
    float rot = G * .61 + age * .06 * (mod(G, 2.) < 1. ? 1. : -1.);     // each ring turns a little as it unfolds
    float open = smoothstep(0., 1.4, age);
    float pet = sqrt(abs(cos(n * .5 * (th - rot))));                       // n rounded petals, notched between
    float edge = age - .34 * open + .42 * open * pet;                     // the scalloped outer edge of this ring
    if (x < edge) { owner = int(G); own_edge = edge; break; }
    shadow = max(shadow, exp(-(x - edge) / dxdr / 3.5) * .35 * (1. - smoothstep(3.7, 4.7, age)));          // just outside a ring: the shadow of its petals on the ring below
  }
  if (owner >= 0) {
    float G = float(owner), age = uB - G, T = mod(G, 5.);
    float rot = G * .61 + age * .06 * (mod(G, 2.) < 1. ? 1. : -1.);
    // pattern space: angle and log-radius, measured from this ring's own edge so the pattern travels with it
    float N = 14.;
    vec2 q = vec2((th - rot) * N / TAU, (x - age) * KX * N / TAU);
    q += (vec2(vn(q * .35 + G), vn(q * .35 + G + 9.)) - .5) * .04;      // a carver's hand, never quite true
    float fw = max(fwidth(q.x), fwidth(q.y));
    vec3 ground, lineC; float d2 = 1., extra = 0.;
    // the traditional dyers' colours: kon (deep indigo), asagi (pale blue-green), uguisu (bush-warbler green),
    // shu (vermilion), sakura (cherry pink), kinari (unbleached silk) and kin (gold leaf)
    vec3 KON = lin(vec3(.13, .19, .33)), ASAGI = lin(vec3(.5, .68, .7)), UGUISU = lin(vec3(.45, .48, .33)), SHU = lin(vec3(.72, .27, .2)),
         SAKURA = lin(vec3(.91, .76, .75)), IVO = lin(vec3(.94, .91, .83)), GOLD = lin(vec3(.76, .62, .34)), IND = KON;
    if (T < 1.) { ground = KON; lineC = GOLD; d2 = asanoha(q * 1.2) / 1.2; }
    else if (T < 2.) { ground = ASAGI; lineC = IVO; float rg; d2 = seigaiha(q, rg); extra = step(2., rg) * step(rg, 3.) * .12; }
    else if (T < 3.) { ground = UGUISU; lineC = GOLD; float lens; d2 = shippo(q * .9, lens) / .9; extra = lens; }
    else if (T < 4.) { ground = SHU; lineC = GOLD; d2 = abs(fract(q.x * 2.) - .5) / 2.; }  // kiku: the chrysanthemum's ribbed petals
    else { ground = SAKURA; lineC = SHU; d2 = asanoha(q * .8) / .8; }
    float lw = .045;
    float line = 1. - smoothstep(lw - fw, lw + fw, d2);
    // the printed ground: a woodblock's slightly uneven ink, with the paper's fibres showing through
    float dens = .9 + .12 * fb(px * .03 + G) - .06 * smoothstep(.7, .95, vn(px * vec2(.02, .6)));
    vec3 base = mix(paper, ground, clamp(dens, 0., 1.));
    if (T > 1.5 && T < 2.5) base = mix(base, mix(base, GOLD, .35), extra);                  // gilded lenses in the shippo
    if (T > .5 && T < 1.5) base = mix(base, IND, extra);
    // lines: gold catches a slow, travelling light; ivory and indigo stay matte
    vec3 lc = lineC;
    if (lineC == GOLD) lc *= .85 + .35 * pow(.5 + .5 * sin(th * 3. - x * 1.3 + uShim), 4.);
    vec3 cl = mix(base, lc, line);
    // petal modelling: a soft crease down each petal's centre, the base in the shade of the ring inside it
    float n = T < 1. ? 8. : T < 2. ? 12. : T < 3. ? 10. : T < 4. ? 16. : 12.;
    float pet = abs(cos(n * .5 * (th - rot)));
    float toEdge = (own_edge - x) / dxdr;                                   // CSS pixels from this ring's edge
    cl *= .9 + .1 * smoothstep(.0, 1., pet);
    cl *= .86 + .14 * smoothstep(0., 18., toEdge) * 0. + .14 * smoothstep(40., 0., toEdge);
    // each petal edged in a fine gold line
    float rim = 1. - smoothstep(.6, 1.6, toEdge);
    cl = mix(cl, GOLD * (.9 + .3 * pow(pet, 6.)), rim * .95);
    cl *= 1. - shadow;
    // the outermost rings fade back into the paper as they leave the flower
    // the oldest rings let go: each fades as a whole back into the paper, like ink lifting, before it leaves the frame
    float fade = 1. - smoothstep(3.7, 4.7, age);
    col = mix(paper * (1. - shadow * .5), cl, fade);
  } else col *= 1. - shadow;
  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}`;
function bloomScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.82), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  if (t - bloom.lastT > 1.5) Object.assign(bloom, { B: 2.2, v: 0, target: 2.2, peak: 2.2 });   // a new visit begins with the bud
  bloom.lastT = t;
  // between beats the flower settles back a little, never further than a third of a ring
  bloom.target = Math.max(bloom.peak - 0.3, bloom.target - dt * 0.06);
  // a slow-motion spring: petals open smoothly toward where the beats have pushed them
  bloom.v += ((bloom.target - bloom.B) * 5 - bloom.v * 4.2) * dt; bloom.B += bloom.v * dt;
  bloom.shim += dt * (0.25 + S.high * 1.2);
  const breath = Math.sin(t * 0.7) * (0.025 + S.mid * 0.04);
  const ok = r5Render("bloom", BLOOM_FS, { x: x0, y: y0, w, h }, { uT: t, uB: bloom.B + breath, uShim: bloom.shim }, {});
  if (!ok) { g.fillStyle = "#F2ECDF"; g.fillRect(x0, y0, w, h); }
}
function bloomBeat() {
  const strength = Math.min(1, 0.2 + S.bass * 0.9 + S.pulse * 0.2);
  bloom.target = Math.max(bloom.target, bloom.B) + 0.18 + strength * 0.5;
  bloom.peak = bloom.target;
}
