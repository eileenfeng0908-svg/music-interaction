// ================================================================
// ROOM 2, pieces ii and iii — redesigned Oct 23.
//   ii  AZULEJOS: a wall of glazed Andalusian tiles on which the ornament draws and glazes itself
//   iii SEDA: two lengths of crimson silk and chiffon suspended in moving air, a living sculpture
// ================================================================

// ----------------------------------------------------------------
// 2ii  AZULEJOS. Cuerda seca tiles, as made in Seville and Toledo from the 15th century: the pattern is
// drawn on the tile in a line of manganese and grease, each cell is then filled with its own glaze, and in
// the kiln the line burns to a matt dark cord that keeps the colours apart, each glaze swelling slightly
// between its cords. Tin-white, cobalt, copper turquoise, honey ochre and iron terracotta.
// Three traditional designs grow across the wall one after another, each from a point inside the last:
//   lacería   the Mudéjar strapwork of interlaced bands that makes eight-pointed stars (as at the Alhambra)
//   flores    the Sevillian rosette with leaves meeting at the tile corners
//   ataurique a vine of spirals and palmettes, the vegetal arabesque
// Wherever a growth front passes, the cords are drawn first, then the glazes flood each cell from its
// edges, then the small ornaments appear, and lastly a lustre on the honey glaze. The music drives the
// fronts: beats push them outward, strong beats much further; quiet passages barely move them.
// Each tile sits a little out of true, so the window light breaks across the wall tile by tile.
// ----------------------------------------------------------------
const AZU_FS = PAINT_COMMON + `
uniform vec2 uRes; uniform float uScale, uTile, uN, uLight, uGlint, uT;
uniform vec4 uF[4];
in vec2 vUv; out vec4 o;
const float PI = 3.14159265, TAU = 6.2831853;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 COB, IVO, TER, TUR, OCH, MAN, WHT;
struct Lay { float dl; vec3 col; float rid; float dd; vec3 dcol; float och; };
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// a pointed leaf along +x from x0 to x1, half width w at its widest
float leaf(vec2 p, float x0, float x1, float w){
  float hl = (x1 - x0) * .5, s = (p.x - x0 - hl) / hl;
  return max(abs(p.y) - w * max(0., 1. - s * s), (abs(s) - 1.) * hl);
}
// one family of parallel lines at X = k - off and X = k + off: distance and which line
vec2 fam(float X, float off){
  float a = X - off, b = X + off, ka = floor(a + .5), kb = floor(b + .5), da = abs(a - ka), db = abs(b - kb);
  return da < db ? vec2(da, 2. * ka) : vec2(db, 2. * kb + 1.);
}

// LACERÍA: four families of straps (two square, two diagonal) that cross into eight-pointed stars
Lay D0(vec2 P){
  Lay L; vec2 q = fract(P) - .5;
  const float b = .25, c = .35355, w = .03;
  vec2 F[4]; F[0] = fam(P.x, b); F[1] = fam(P.y, b);
  F[2] = fam(P.x + P.y, c) * vec2(.70711, 1.); F[3] = fam(P.x - P.y, c) * vec2(.70711, 1.);
  // which strap lies on top where two cross: alternating over and under along each strap
  int top = -1;
  for (int i = 0; i < 4; i++) if (F[i].x < w) {
    if (top < 0) top = i;
    else if (mod(F[i].y + F[top].y + float(i + top), 2.) < 1.) top = i;
  }
  float dl = 9.;
  for (int i = 0; i < 4; i++) {
    bool hidden = false;
    for (int j = 0; j < 4; j++) if (j != i && F[j].x < w) {
      // j hides i's edge if j is over i at this crossing
      if (j == top) hidden = true;
    }
    if (i == top) hidden = false;
    if (!hidden) dl = min(dl, abs(F[i].x - w));
  }
  L.dl = dl;
  float ax = abs(q.x), ay = abs(q.y);
  bool inA = max(ax, ay) < b, inB = ax + ay < c * 1.41421 * .70711 * 1.41421;
  inB = ax + ay < c;
  L.och = 0.;
  if (top >= 0) { L.col = IVO; L.rid = .05; }
  else if (inA && inB) { L.col = COB; L.rid = .15; }
  else if (inA || inB) { L.col = TER; L.rid = .45; }
  else if (ax > b && ay > b) { L.col = OCH; L.rid = .3; L.och = 1.; }
  else { L.col = TUR; L.rid = .6; }
  // the small ornaments: an eight-petalled flower in each star, a four-petalled one in each corner
  float r = length(q), th = atan(q.y, q.x);
  float fl = r - .085 * (.55 + .45 * pow(abs(cos(4. * th)), .8));
  vec2 cq = q - sign(q) * .5; float rc = length(cq), tc = atan(cq.y, cq.x);
  float f4 = rc - .07 * (.5 + .5 * pow(abs(cos(2. * tc)), .8));
  L.dd = 9.; L.dcol = OCH;
  if (top < 0 && inA && inB) { L.dd = fl; L.dcol = r < .03 ? TER : IVO; if (r < .03) L.dd = r - .03; }
  if (top < 0 && ax > b && ay > b) { L.dd = f4; L.dcol = rc < .025 ? COB : IVO; if (rc < .025) L.dd = rc - .025; }
  return L;
}

// FLORES: a rosette in each tile; at each corner four tiles meet in a flower of leaves
Lay D1(vec2 P){
  Lay L; vec2 q = fract(P) - .5;
  float r = length(q), th = atan(q.y, q.x);
  float ros = (r - .25 * (.6 + .4 * pow(abs(cos(4. * th)), .7))) * .85;
  float core = r - .07;
  vec2 cq = q - sign(q) * .5; float tc = atan(cq.y, cq.x);
  float aA = floor(tc / (PI * .5) + .5) * PI * .5, aD = floor((tc - PI * .25) / (PI * .5) + .5) * PI * .5 + PI * .25;
  float lA = leaf(rot(-aA) * cq, .035, .25, .055), lD = leaf(rot(-aD) * cq, .03, .17, .04);
  float cc = length(cq) - .03;
  L.dl = min(min(abs(ros), abs(core)), min(min(abs(lA), abs(lD)), abs(cc)));
  L.och = 0.;
  if (core < 0.) { L.col = OCH; L.rid = .5; L.och = 1.; }
  else if (ros < 0.) { L.col = COB; L.rid = .1; }
  else if (cc < 0.) { L.col = TER; L.rid = .55; }
  else if (lA < 0.) { L.col = TUR; L.rid = .3; }
  else if (lD < 0.) { L.col = OCH; L.rid = .4; L.och = 1.; }
  else { L.col = IVO; L.rid = .0; }
  // the small ornaments: a white tear in each petal, red seeds between the petals, a vein in each leaf
  float ap = floor(th / (PI * .25) + .5) * PI * .25; vec2 pp = rot(-ap) * q;
  float tear = leaf(pp, .1, .2, .022);
  float ag = floor((th - PI * .125) / (PI * .25) + .5) * PI * .25 + PI * .125; vec2 pg = rot(-ag) * q;
  float seed = length(pg - vec2(.3, 0.)) - .02;
  float vein = max(abs((rot(-aA) * cq).y) - .006, max(.06 - (rot(-aA) * cq).x, (rot(-aA) * cq).x - .2));
  L.dd = 9.; L.dcol = IVO;
  if (ros < 0. && core > 0.) { L.dd = tear; }
  else if (ros > 0. && lA > 0. && lD > 0. && cc > 0.) { L.dd = seed; L.dcol = TER; }
  else if (lA < 0.) { L.dd = vein; L.dcol = COB; }
  return L;
}

// ATAURIQUE: a running vine; above each crest and below each trough it curls into a spiral,
// and between the spirals a three-lobed palmette rises from the vine
float spiral(vec2 p, vec2 c, float R, float a0, float dir, float turns){
  vec2 d = p - c; float r = length(d), th = atan(d.y, d.x);
  float ph = mod((th - a0) * dir, TAU), best = 9.;
  for (int n = 0; n < 3; n++) {
    float phi = ph + TAU * float(n); if (phi > turns * TAU) break;
    best = min(best, abs(r - R * (1. - phi / (turns * TAU))));
  }
  return best;
}
Lay D2(vec2 P){
  Lay L; vec2 q = fract(P) - .5;
  const float A = .15, Rs = .16, w = .016;
  float s = A * sin(TAU * q.x), sl = A * TAU * cos(TAU * q.x);
  float vine = abs(q.y - s) / sqrt(1. + sl * sl);
  float sp1 = spiral(q, vec2(.25, A + Rs), Rs, -PI * .5, -1., 1.55);
  float sp2 = spiral(q, vec2(-.25, -A - Rs), Rs, PI * .5, -1., 1.55);
  float stem = min(vine, min(sp1, sp2));
  float bud = min(length(q - vec2(.25, A + Rs)), length(q - vec2(-.25, -A - Rs))) - .035;
  // palmettes: centre lobe and two side lobes, rising from the trough (up) and hanging from the crest (down)
  vec2 b1 = q - vec2(-.25, -A + .01), b2 = vec2(.25, A - .01) - q;
  float pc = min(leaf(rot(-PI * .5) * b1, .0, .3, .06), leaf(rot(-PI * .5) * b2, .0, .3, .06));
  float ps = min(min(leaf(rot(-PI * .5 - .62) * b1, .02, .21, .045), leaf(rot(-PI * .5 + .62) * b1, .02, .21, .045)),
                 min(leaf(rot(-PI * .5 - .62) * b2, .02, .21, .045), leaf(rot(-PI * .5 + .62) * b2, .02, .21, .045)));
  L.dl = min(min(abs(stem - w), abs(bud)), min(abs(pc), abs(ps)));
  L.och = 0.;
  if (bud < 0.) { L.col = TER; L.rid = .5; }
  else if (stem < w) { L.col = IVO; L.rid = .05; }
  else if (pc < 0.) { L.col = TUR; L.rid = .3; }
  else if (ps < 0.) { L.col = OCH; L.rid = .4; L.och = 1.; }
  else { L.col = COB; L.rid = .15; }
  // the small ornaments: white pearls scattered on the blue ground, a vein down each palmette
  vec2 pq = q - vec2(0., .36) * sign(q.y + 1e-4);
  float pearl = min(length(pq) - .022, min(length(q - vec2(.47, .02)) - .016, length(q + vec2(.47, .02)) - .016));
  float vein = min(max(abs(b1.x) - .006, max(.04 - b1.y, b1.y - .25)), max(abs(b2.x) - .006, max(.04 - b2.y, b2.y - .25)));
  L.dd = 9.; L.dcol = IVO;
  if (L.col == COB) L.dd = pearl;
  else if (pc < 0.) { L.dd = vein; L.dcol = COB; }
  return L;
}
Lay design(float k, vec2 P){ if (k < .5) return D0(P); if (k < 1.5) return D1(P); return D2(P); }

void main(){
  COB = lin(vec3(.13, .25, .56)); IVO = lin(vec3(.94, .91, .82)); TER = lin(vec3(.71, .34, .21));
  TUR = lin(vec3(.27, .58, .56)); OCH = lin(vec3(.84, .6, .24)); MAN = lin(vec3(.17, .11, .1)); WHT = lin(vec3(.95, .93, .87));
  vec2 css = uRes / uScale, px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  vec2 P = px / uTile, q = fract(P) - .5, ti = floor(P);
  float aa = .9 / (uTile * uScale), lw = max(.0075, 1.1 / uTile);
  // the tile itself: tin-white glaze over the clay, until the ornament reaches it
  vec3 C = WHT * (1. + (h12(ti * 3.1) - .5) * .03);
  float cord = 9., och = 0., lus = 0.;
  // find the newest growth front that has reached this point, and the one beneath it
  float eTop = -1., eUnd = -1., kTop = 0., kUnd = 0.;
  for (int i = 3; i >= 0; i--) {
    if (float(i) >= uN) continue;
    vec4 F = uF[i];
    float a = length(P - F.xy) + (fb(P * .55 + F.w * 7.3 + float(i) * 3.1) - .5) * 1.8;
    float e = F.z - a;
    if (e > 0.) { if (eTop < 0.) { eTop = e; kTop = F.w; } else if (eUnd < 0.) { eUnd = e; kUnd = F.w; } }
  }
  float fillTop = 0.;
  for (int pass = 0; pass < 2; pass++) {
    float e = pass == 0 ? eUnd : eTop, k = pass == 0 ? kUnd : kTop;
    if (e <= 0.) continue;
    Lay L = design(mod(k, 3.), P);
    // 1. the manganese cord is drawn
    float on = smoothstep(0., .05, e);
    // 2. the glaze floods each cell from its cords inward, cell after cell
    float st = .12 + L.rid * .7, flood = (e - st) * .32;
    float fill = clamp((flood - L.dl) / aa + .5, 0., 1.) * step(st, e);
    C = mix(C, L.col, fill);
    och = mix(och, L.och, fill);
    if (pass == 1) fillTop = fill;
    if (pass == 1 && fill > .5) cord = 9.;   // fresh glaze covers the older cords
    cord = min(cord, mix(9., L.dl, on));
    // 3. the small ornaments swell up out of the glaze
    float g2 = clamp((e - 1.05 - L.rid * .6) * 1.4, 0., 1.);
    if (g2 > 0.) {
      float dd = L.dd + (1. - g2) * .06;
      C = mix(C, L.dcol, clamp(-dd / aa + .5, 0., 1.));
      cord = min(cord, abs(dd));
      if (dd < 0.) och = L.dcol == OCH ? 1. : 0.;
    }
    // 4. last of all, a golden lustre on the honey glaze
    lus = mix(lus, smoothstep(2.1, 3.2, e), fill);
  }
  // the cords: matt and sunk a little below the glaze on either side
  float cm = clamp((lw - cord) / aa + .5, 0., 1.);
  // relief: each glaze swells between its cords; the tile edges round over into the joint
  vec2 qe = .5 - abs(q); float ge = min(qe.x, qe.y) * uTile;
  float H = smoothstep(0., .065, cord - lw) * .045 * uTile - (1. - smoothstep(0., 4., ge)) * 1.4;
  vec2 grad = vec2(dFdx(H), dFdy(H)) * uScale;
  vec3 n = normalize(vec3(-grad * .9, 1.));
  // every tile set slightly out of true, and the glaze itself gently uneven
  vec2 tilt = (h22(ti + 17.) - .5) * .045 + (vec2(vn(P * 2.3 + ti), vn(P * 2.3 + ti + 9.)) - .5) * .018;
  n = normalize(n + vec3(tilt.x, -tilt.y, 0.));
  // crazing: a fine net of cracks in the glaze, on some tiles more than others
  vec2 cp = P * 7.5; vec2 ci = floor(cp), cf = fract(cp); float d1 = 9., d2 = 9.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(i, j), o2 = h22(ci + g) * .9 + .05; float d = length(g + o2 - cf); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  float craze = (1. - clamp((d2 - d1) * uTile * uScale / 7.5 / 1.1, 0., 1.)) * step(.45, h12(ti + 3.)) * step(.35, vn(P * 1.7 + 4.));
  // lighting: a window to the upper left; the room behind the viewer is dim and warm
  vec3 Ld = normalize(vec3(-.45, .55, .75));
  float dif = .8 + .28 * max(dot(n, Ld), 0.) - .1;
  vec3 alb = C;
  float lum = dot(alb, vec3(.3, .59, .11));
  alb *= 1. - craze * .14 * smoothstep(.1, .6, lum);
  alb *= 1. - (h12(floor(px * uScale * .5)) > .9993 ? .5 : 0.);          // pinholes
  vec3 col = alb * dif;
  col = mix(col, MAN * (.9 + .2 * vn(px * .9)), cm);
  // the reflected window, broken by each tile and each swelling of glaze
  vec3 R = reflect(vec3(0., 0., -1.), n);
  vec2 wd = R.xy - vec2(-.33 + uLight * .12, .42 + uLight * .04);
  float win = smoothstep(.0, .012, .13 - abs(wd.x)) * smoothstep(0., .012, .17 - abs(wd.y));
  win *= smoothstep(.0, .006, abs(wd.x) - .006) * smoothstep(0., .006, abs(wd.y - .03) - .006);   // the mullion and transom
  float fres = .04 + .96 * pow(1. - n.z, 5.);
  float gloss = 1. - cm * .9;
  vec3 env = lin(vec3(.62, .58, .52)) * .25 * (.6 + .4 * R.y) + vec3(win) * (7. + uGlint * 5.);
  col += env * fres * gloss;
  // the lustre: a metallic gold over the honey glaze where it has been fired a third time
  float lu = lus * och * (1. - cm);
  vec3 gold = lin(vec3(.86, .66, .32));
  col = mix(col, col * .55 + gold * (.18 + .8 * win + .25 * pow(max(dot(reflect(-Ld, n), vec3(0, 0, 1)), 0.), 12.)) * (1. + uGlint * .4), lu * .7);
  // the joints of lime mortar between the tiles
  float joint = clamp((1. - ge) / (uScale > 0. ? 1. / uScale : 1.) * .5 + .5, 0., 1.);
  vec3 mortar = lin(vec3(.74, .71, .64)) * (.82 + .2 * vn(px * .7));
  col = mix(col, mortar, clamp((1.1 - ge) * uScale, 0., 1.));
  o = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

const azu = { fronts: [], lastT: -9, cols: 5, rows: 6, k: 0, glint: 0 };
function azuReach(f) {
  let m = 0; for (const [x, y] of [[0, 0], [azu.cols, 0], [0, azu.rows], [azu.cols, azu.rows]]) m = Math.max(m, Math.hypot(x - f.x, y - f.y));
  return m + 1;
}
function azuReset() {
  azu.fronts = [{ x: azu.cols / 2, y: azu.rows / 2, R: 0, v: 0, target: 0.35, k: 0 }];
  azu.k = 0; azu.rng = seeded(4471);
}
function azulejoScene(t, dt, box) {
  const h = box.h, T = Math.min(box.w / azu.cols, h / azu.rows), w = T * azu.cols, ph = T * azu.rows;
  const x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = Math.round((box.y + (h - ph) / 2) * DPR) / DPR;
  if (t - azu.lastT > 1.5) azuReset();
  azu.lastT = t;
  const energy = Math.min(1, S.bass * 0.5 + S.mid * 0.45 + S.high * 0.2);
  azu.fronts.forEach((f, i) => {
    f.target += dt * (0.015 + energy * 0.16);                    // the music keeps it growing; silence nearly stops it
    f.v += ((f.target - f.R) * 6 - f.v * 4.4) * dt; f.R += f.v * dt;
  });
  const top = azu.fronts[azu.fronts.length - 1];
  // when the newest design has covered most of the wall, the next one begins inside it, on one of its stars
  if (top.R > azuReach(top) * 0.6) {
    if (azu.fronts.length >= 4) {
      if (azu.fronts[1].R > azuReach(azu.fronts[1]) + 3.5) azu.fronts.shift();
    }
    if (azu.fronts.length < 4) {
      const r = azu.rng, a = r() * TAU, d = top.R * (0.25 + r() * 0.35);
      const x = Math.floor(Math.min(azu.cols - 1, Math.max(0, top.x + Math.cos(a) * d))) + 0.5, y = Math.floor(Math.min(azu.rows - 1, Math.max(0, top.y + Math.sin(a) * d))) + 0.5;
      azu.k++; azu.fronts.push({ x, y, R: 0, v: 0, target: 0.3, k: azu.k % 3 });
    }
  }
  azu.glint += (Math.min(1, S.high * 1.2 + S.pulse * 0.3) - azu.glint) * Math.min(1, dt * 3);
  const F = new Float32Array(16);
  azu.fronts.forEach((f, i) => { F.set([f.x, f.y, f.R, f.k], i * 4); });
  const light = S.pitchOn ? Math.max(-1, Math.min(1, (S.pitch - 1.5) / 1.5)) : Math.sin(t * 0.05) * 0.4;
  azu.light = (azu.light || 0) + (light - (azu.light || 0)) * Math.min(1, dt * 0.6);
  const ok = r5Render("azulejo", AZU_FS, { x: x0, y: y0, w, h: ph }, { uTile: T, uN: azu.fronts.length, uLight: azu.light, uGlint: azu.glint, uT: t }, { uF: { kind: 4, data: F } });
  if (!ok) { g.fillStyle = "#EDE8DA"; g.fillRect(x0, y0, w, ph); }
}
function azulejoBeat() {
  const strength = Math.min(1, 0.15 + S.bass * 0.9 + S.pulse * 0.25);
  azu.fronts.forEach((f, i) => { f.target = Math.max(f.target, f.R) + (0.08 + strength * 0.5) * (i === azu.fronts.length - 1 ? 1 : 0.6); });
}


// ----------------------------------------------------------------
// 2iii  SEDA. An installation, not a dress: two long lengths of fabric hang from points above the frame
// in a warm, softly lit gallery space: a crimson matte silk crêpe and, behind it, a sheer muted-red
// chiffon. Each is gathered where it is held, so folds fan out from the top, and its end pools on the floor.
// The cloth is simulated (gravity, inertia, threads that stretch little and bend easily, air resistance
// across the cloth), and only the music moves it: it carries the points where the fabric is held in
// slow arcs whose pace follows the music's intensity, and every beat is a sweep, the way a dancer swings
// a mantón or kicks the train of a bata de cola. A beat sends a gust in the direction of the sweep and turns
// the hold so the fabric twists; the strongest beats raise a rising spiral of air that lifts the silk and
// unfolds it. Quiet passages leave it floating and barely moving. The backlight glows through the cloth.
// ----------------------------------------------------------------
const SIL = { ready: false };
const sil = { E: 0, ph: 0, side: 1, n: 0, gust: [0, 0, 0], vort: 0, lastVort: -9, lastT: -9, now: 0, queue: [] };
const SIL_P = [
  // columns, rows, spacing (m), drag (the sheer chiffon catches more air), and the two points it is held by
  { cols: 38, rows: 88, sp: 0.04, drag: 0.12, holds: [[-1.0, 3.0, 0.1], [0.1, 3.08, 0.3]] },
  { cols: 34, rows: 80, sp: 0.04, drag: 0.2, holds: [[0.15, 3.08, -0.6], [1.15, 3.0, -0.45]] }
];
function silCloth() {
  const P = [], W = [], K = [], C = [], panels = [];
  SIL_P.forEach((Q, k) => {
    const t0 = W.length, { cols, rows, sp } = Q, [A, B] = Q.holds;
    for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) {
      const s = u / (cols - 1);
      P.push(A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s - v * sp * 0.97, A[2] + (B[2] - A[2]) * s + Math.sin(u * 0.7 + v * 0.11) * 0.02);
      W.push(1); K.push(Q.drag);
    }
    const I = (u, v) => t0 + v * cols + u;
    for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) {
      if (u + 1 < cols) C.push([I(u, v), I(u + 1, v), sp, 1]);
      if (v + 1 < rows) { C.push([I(u, v), I(u, v + 1), sp, 1]);
        if (u + 1 < cols) { C.push([I(u, v), I(u + 1, v + 1), sp * Math.SQRT2, 0.45]); C.push([I(u + 1, v), I(u, v + 1), sp * Math.SQRT2, 0.45]); } }
      if (u + 2 < cols) C.push([I(u, v), I(u + 2, v), sp * 2, 0.05]);    // silk bends easily, so the bending threads are soft
      if (v + 2 < rows) C.push([I(u, v), I(u, v + 2), sp * 2, 0.05]);
    }
    // held at two corners of the top edge, each gathered a little in the hand of an unseen holder
    const holds = [[0, 1, 2], [cols - 3, cols - 2, cols - 1]].map((us, h) => { us.forEach(u => W[I(u, 0)] = 0); return { us, home: Q.holds[h], a: { p: Q.holds[h].slice(), v: [0, 0, 0] } }; });
    panels.push({ t0, cols, rows, Q, I, holds });
  });
  const n = W.length, ci = new Int32Array(C.length * 2), cr = new Float32Array(C.length), ck = new Float32Array(C.length);
  C.forEach(([i, j, r, k], m) => { ci[m * 2] = i; ci[m * 2 + 1] = j; cr[m] = r; ck[m] = k; });
  return { n, X: new Float32Array(P), O: new Float32Array(P), W: new Float32Array(W), K: new Float32Array(K), N: new Float32Array(n * 3), ci, cr, ck, panels };
}
function silPin(cl) {
  for (const pn of cl.panels) for (const H of pn.holds) H.us.forEach((u, j) => { const i = pn.I(u, 0) * 3; cl.X[i] = H.a.p[0] + (j - 1) * 0.025; cl.X[i + 1] = H.a.p[1]; cl.X[i + 2] = H.a.p[2]; });
}
// the air: a faint drift that follows the music, the gust of the last sweep, and on the strongest beats a rising spiral
function silWind(x, y, z, out) {
  const E = sil.E, ph = sil.ph;
  let wx = Math.sin(ph * 0.7 + y * 0.8) * 0.25 * E + sil.gust[0], wy = sil.gust[1] + Math.sin(ph * 0.5 + x * 1.3) * 0.12 * E, wz = Math.cos(ph * 0.6 + y * 0.6) * 0.2 * E + sil.gust[2];
  if (sil.vort > 0.01) { const dx = x - 0.1, dz = z + 0.1, r = Math.hypot(dx, dz) + 0.25, f = sil.vort * Math.exp(-r * r * 0.8);
    wx += -dz / r * f * 1.8 + dx / r * f * 0.4; wz += dx / r * f * 1.8 + dz / r * f * 0.4; wy += f * 1.6 * Math.max(0, 1.4 - y * 0.45); }
  out[0] = wx; out[1] = wy; out[2] = wz;
}
function silStep(cl, h) {
  const { X, O, W, K, N, ci, cr, ck, n } = cl, w = [0, 0, 0];
  for (let p = 0; p < n; p++) {
    if (W[p] === 0) continue;
    const i = p * 3;
    let vx = X[i] - O[i], vy = X[i + 1] - O[i + 1], vz = X[i + 2] - O[i + 2];
    if (p % 3 === 0) silWind(X[i], X[i + 1], X[i + 2], w);           // the air varies slowly in space: sample it sparsely
    // air resistance across the cloth (relative to the moving air), a little along it
    const rx = w[0] * h - vx, ry = w[1] * h - vy, rz = w[2] * h - vz, rn = rx * N[i] + ry * N[i + 1] + rz * N[i + 2];
    const k = K[p];
    vx += N[i] * rn * k + rx * 0.006; vy += N[i + 1] * rn * k + ry * 0.006; vz += N[i + 2] * rn * k + rz * 0.006;
    O[i] = X[i]; O[i + 1] = X[i + 1]; O[i + 2] = X[i + 2];
    X[i] += vx * 0.998; X[i + 1] += vy * 0.998 - 9.8 * h * h; X[i + 2] += vz * 0.998;
  }
  for (let it = 0; it < 6; it++) for (let m = 0, M = cr.length; m < M; m++) {
    const a = ci[m * 2], b = ci[m * 2 + 1], wa = W[a], wb = W[b], ws = wa + wb; if (ws === 0) continue;
    const ia = a * 3, ib = b * 3, dx = X[ib] - X[ia], dy = X[ib + 1] - X[ia + 1], dz = X[ib + 2] - X[ia + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const f = (d - cr[m]) / d * ck[m] / ws;
    X[ia] += dx * f * wa; X[ia + 1] += dy * f * wa; X[ia + 2] += dz * f * wa; X[ib] -= dx * f * wb; X[ib + 1] -= dy * f * wb; X[ib + 2] -= dz * f * wb;
  }
  // the floor: silk that reaches it slides and settles
  for (let p = 0; p < n; p++) { const i = p * 3; if (X[i + 1] < 0.004) { X[i + 1] = 0.004; O[i] = X[i] - (X[i] - O[i]) * 0.5; O[i + 2] = X[i + 2] - (X[i + 2] - O[i + 2]) * 0.5; O[i + 1] = X[i + 1]; } }
}
function silNormals(cl) {
  SIL.meshes.forEach(M => { const pos = M.geo.attributes.position.array, X = cl.X;
    pos.set(X.subarray(M.t0 * 3, (M.t0 + M.count) * 3));
    M.geo.attributes.position.needsUpdate = true; M.geo.computeVertexNormals();
    cl.N.set(M.geo.attributes.normal.array, M.t0 * 3); });
}
// the fabric: dyed by hand, so the colour varies a little; a fine crêpe weave in the surface
function silTex(col, seed, sheer) {
  const S2 = 1024, c = casaCv(S2, S2), x = c.getContext("2d"), r = seeded(seed);
  x.fillStyle = col; x.fillRect(0, 0, S2, S2);
  for (let i = 0; i < 0; i++) { const g = x.createRadialGradient(r() * S2, r() * S2, 0, r() * S2, r() * S2, 150 + r() * 300);
    const d = r() < 0.5; g.addColorStop(0, d ? "rgba(40,0,8,0.05)" : "rgba(200,60,60,0.035)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, S2, S2); }
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "30,0,6" : "230,140,140"},${0.03 + r() * 0.04})`; const v = r() < 0.5; x.fillRect(r() * S2, r() * S2, v ? 1 : 20 + r() * 120, v ? 20 + r() * 120 : 1); }
  const hc = casaCv(512, 512), y = hc.getContext("2d"), img = y.createImageData(512, 512), d = img.data;
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    // a crêpe: warp and weft threads with a twist that makes the surface pebbled
    const wv = Math.sin(i * Math.PI / 2) * 0.5 + 0.5, wf = Math.sin(j * Math.PI / 2) * 0.5 + 0.5, cr = hash2(i >> 1, j >> 1);
    const v = (sheer ? 0.5 + (wv * wf - 0.25) * 0.6 : 0.45 + (wv + wf) * 0.15 + cr * 0.25) * 255, k = (j * 512 + i) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
  y.putImageData(img, 0, 0);
  return { c, nrm: casaNormal(hc, sheer ? 0.6 : 1.1) };
}
function silBackdrop() {
  const c = casaCv(1024, 1024), x = c.getContext("2d"), r = seeded(77);
  x.fillStyle = "#CFC4B4"; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(r() * 1024, r() * 1024, 0, r() * 1024, r() * 1024, 200 + r() * 400);
    g.addColorStop(0, r() < 0.5 ? "rgba(120,100,80,0.05)" : "rgba(255,245,230,0.05)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 1024, 1024); }
  return c;
}
function silBuild() {
  const T = THREE, scene = new T.Scene();
  const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
  const aniso = r.capabilities.getMaxAnisotropy(), lc = h => new T.Color(h).convertSRGBToLinear();
  const BG = lc(0xC9BDAC);
  scene.background = BG; scene.fog = new T.Fog(BG, 5.5, 13);
  // a soft warm room for the sheen to pick up
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ color: 0x6a5e52, side: T.BackSide })));
  const sb = (x, y, z, w, h, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1.2, 0); env.add(m); };
  sb(-6, 8, 7, 6, 4, 0xfff0dc); sb(5, 6, -8, 4, 6, 0xffd9b0);
  scene.environment = new T.PMREMGenerator(r).fromScene(env, 0.04).texture;
  // the gallery: a seamless backdrop, floor curving up into the wall
  const shape = [];
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; shape.push([Math.sin(a) * 1.2, 1.2 - Math.cos(a) * 1.2]); }
  const cyc = new T.BufferGeometry(), cv = [], cuv = [], cix = [], prof = [[0, 0, 6]].concat(shape.map(([s, y]) => [y, 0, -2.4 - s])).concat([[6, 0, -3.6]]);
  prof.forEach(([y, , z], j) => { for (let i = 0; i <= 40; i++) { const x = -7 + i * 14 / 40; cv.push(x, y, z); cuv.push(i / 40 * 3, j / prof.length * 3); } });
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < 40; i++) { const a = j * 41 + i, b = a + 1, c = a + 41, d = c + 1; cix.push(a, b, c, b, d, c); }
  cyc.setAttribute("position", new T.Float32BufferAttribute(cv, 3)); cyc.setAttribute("uv", new T.Float32BufferAttribute(cuv, 2)); cyc.setIndex(cix); cyc.computeVertexNormals();
  const bt = new T.CanvasTexture(silBackdrop()); bt.encoding = T.sRGBEncoding; bt.wrapS = bt.wrapT = T.RepeatWrapping;
  const back = new T.Mesh(cyc, new T.MeshStandardMaterial({ map: bt, roughness: 1, envMapIntensity: 0.25 })); back.receiveShadow = true; scene.add(back);
  // light: a large warm key from the upper left that throws soft shadows, a stronger backlight from the upper right
  // that glows through the cloth, and warm fill from the room
  const key = new T.DirectionalLight(0xffe6c8, 1.9); key.position.set(-3.2, 5.5, 4.2); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1.5, near: 1, far: 16 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  const backL = new T.DirectionalLight(0xffc896, 1.6); backL.position.set(2.6, 3.6, -4.5); backL.target.position.set(0, 1.2, 0);
  scene.add(key, key.target, backL, backL.target, new T.HemisphereLight(0xfff1e0, 0x8a7460, 0.38));
  // the cloth materials: matte, the light passing through the thin fabric from behind
  const fabric = (col, seed, sheer) => { const t = silTex(col, seed, sheer), map = new T.CanvasTexture(t.c), nm = new T.CanvasTexture(t.nrm);
    map.encoding = T.sRGBEncoding; [map, nm].forEach(q => { q.wrapS = q.wrapT = T.RepeatWrapping; q.anisotropy = aniso; });
    const m = new T.MeshPhysicalMaterial({ map, normalMap: nm, normalScale: new T.Vector2(0.35, 0.35), roughness: sheer ? 0.6 : 0.72, sheen: 0.5, sheenRoughness: 0.6,
      sheenColor: lc(col).multiplyScalar(1.3), side: T.DoubleSide, envMapIntensity: 0.35, transparent: !!sheer, opacity: sheer ? 0.78 : 1 });
    const trans = lc(col).multiplyScalar(sheer ? 1.3 : 0.8);
    m.onBeforeCompile = sh => { sh.uniforms.uTrans = { value: trans };
      sh.fragmentShader = "uniform vec3 uTrans;\n" + sh.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) { float bt = max(dot(-normal, directionalLights[i].direction), 0.); reflectedLight.directDiffuse += directionalLights[i].color * bt * uTrans * diffuseColor.rgb; }
        #endif`); };
    return m; };
  const mats = [fabric("#510A17", 11, false), fabric("#6E1A25", 12, true)];
  const cl = silCloth(), meshes = [];
  cl.panels.forEach((pn, k) => {
    const { cols, rows, Q } = pn, count = cols * rows, uv = new Float32Array(count * 2), ind = [];
    for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) { const i = v * cols + u; uv[i * 2] = u * Q.sp / 0.35; uv[i * 2 + 1] = v * Q.sp / 0.35; }
    for (let v = 0; v < rows - 1; v++) for (let u = 0; u < cols - 1; u++) { const a = v * cols + u, b = a + 1, c = a + cols, d = c + 1; ind.push(a, c, b, b, c, d); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(new Float32Array(count * 3), 3)); geo.setAttribute("uv", new T.BufferAttribute(uv, 2)); geo.setIndex(ind);
    const mesh = new T.Mesh(geo, mats[k]); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = k; scene.add(mesh);
    meshes.push({ geo, t0: pn.t0, count });
  });
  const cam = new T.PerspectiveCamera(30, 1.45, 0.1, 40); cam.position.set(0, 1.25, 5.0); cam.lookAt(0, 1.12, 0);
  Object.assign(SIL, { r, scene, cam, meshes, ready: true, cl });
  silReset();
}
function silReset() {
  const cl = SIL.cl = silCloth(); 
  Object.assign(sil, { E: 0, ph: 0, gust: [0, 0, 0], vort: 0, queue: [] });
  silPin(cl);
  for (let s = 0; s < 240; s++) { silStep(cl, 1 / 120); if (s % 10 === 0) silNormals(cl); }   // let it hang and settle into its folds
  cl.O.set(cl.X); silNormals(cl);
}
function silMove(h) {
  // the holds drift in slow arcs whose pace is the music's; each springs back from the sweeps
  SIL.cl.panels.forEach((pn, k) => pn.holds.forEach((Hd, j) => { const a = Hd.a, H = Hd.home, ph = sil.ph + k * 1.7 + j * 2.3;
    const tg = [H[0] + Math.sin(ph * 0.9) * 0.3 * (0.3 + sil.E), H[1] + Math.sin(ph * 0.55) * 0.05, H[2] + Math.sin(ph * 0.7 + 1) * 0.35 * (0.3 + sil.E)];
    for (let d = 0; d < 3; d++) { a.v[d] += ((tg[d] - a.p[d]) * 5.5 - a.v[d] * 2.8) * h; a.p[d] += a.v[d] * h; } }));
  const gd = Math.exp(-h * 1.6); sil.gust = sil.gust.map(q => q * gd); sil.vort *= Math.exp(-h * 1.1);
}
function flamencoScene(t, dt, box) {
  if (typeof THREE === "undefined") return;
  if (!SIL.ready) silBuild();
  if (t - sil.lastT > 1.5) silReset();
  sil.lastT = t; sil.now = t;
  const h = box.h, w = Math.min(box.w, h * 1.45), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const k = Math.min(DPR, Math.sqrt(7e6 / (w * h))), pw = Math.round(w * k), ph = Math.round(h * k);
  if (SIL.pw !== pw || SIL.ph !== ph) { SIL.pw = pw; SIL.ph = ph; SIL.r.setSize(pw, ph, false); SIL.cam.aspect = pw / ph; SIL.cam.updateProjectionMatrix(); }
  dt = Math.min(dt, 1 / 20);
  // the cloth steps at 120 Hz at most; a slow frame slows the whole piece down rather than destabilising the silk
  const steps = Math.max(1, Math.min(3, Math.round(dt * 120))), hs = Math.min(dt / steps, 1 / 110);
  const energy = Math.min(1, S.bass * 0.45 + S.mid * 0.45 + S.high * 0.2);
  sil.E += (energy - sil.E) * Math.min(1, dt * 1.5);
  sil.ph += steps * hs * (0.1 + sil.E * 0.7);
  // a sweep reaches the second length of fabric a moment after the first
  sil.queue = sil.queue.filter(q => { if (t >= q.at) { const a = SIL.cl.panels[q.k].holds[q.j].a; a.v[0] += q.vx; a.v[1] += q.vy; a.v[2] += q.vz; return false; } return true; });
  for (let s = 0; s < steps; s++) { silMove(hs); silPin(SIL.cl); silStep(SIL.cl, hs); }
  silNormals(SIL.cl);
  SIL.r.render(SIL.scene, SIL.cam);
  g.drawImage(SIL.r.domElement, x0, y0, w, h);
}
function flamencoBeat() {
  if (!SIL.ready) return;
  const s = Math.min(1, 0.15 + S.bass * 0.9 + S.pulse * 0.2), t = sil.now;
  sil.side *= -1; sil.n++;
  const dz = ((sil.n % 3) - 1) * 0.5;
  // a sweep: the holds swing across, the fabric twists, and the air follows the sweep
  // one hand leads each sweep and the other answers; the strongest beats move all four, the chiffon a moment later
  const lead = sil.n % 2, big = s > 0.6;
  SIL.cl.panels.forEach((pn, k) => { if (k === 1 && !big && sil.n % 3) return;
    pn.holds.forEach((H, j) => { const m = j === lead ? 1 : 0.45;
      sil.queue.push({ k, j, at: t + k * 0.14 + (j === lead ? 0 : 0.09), vx: sil.side * (0.5 + s * 1.8) * m, vy: s * 0.3 * m, vz: dz * (0.4 + s) * m }); }); });
  sil.gust[0] += sil.side * (0.6 + s * 2.4); sil.gust[2] += dz * s * 1.2; sil.gust[1] += s * 0.25;
  if (s > 0.72 && t - sil.lastVort > 4) { sil.vort = 1; sil.lastVort = t; }    // the strongest beats: a rising spiral of air
}
