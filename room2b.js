// ================================================================
// ROOM 2, pieces ii and iii — redesigned Oct 23.
//   ii  AZULEJOS: a wall of glazed Andalusian tiles on which the ornament draws and glazes itself
//   iii FLAMENCO: a ruffled silk skirt and a painted fan, moved by an unseen dancer
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
// 2iii  FLAMENCO. The skirt of a traje de flamenca and a painted fan, in a dark tablao under a warm
// spotlight, moved by a dancer we never see. The skirt is fitted to the knee, then opens into three tiers
// of volantes (circle-cut flounces, burgundy and crimson silk, each edged with a gold galón and black lace).
// The cloth is simulated: thousands of points joined by threads that stretch a little and bend a little,
// under gravity and air resistance, held at the hips and pushed by the legs. Nothing is animated directly:
// the music moves the unseen body (hips swaying to the compás, a step, a turn of the hips, a full turn on
// the strongest beats) and the silk follows as silk does, late and in waves. Quiet passages leave only the
// slow sway and a soft stir of air. The fan, silk painted with roses on black lacquered ribs with gilded
// guards, snaps open on the beat with a turn of the wrist, then drifts half closed.
// ----------------------------------------------------------------
const FLA = { ready: false };
const fla = { yaw: { x: 0, v: 0 }, sway: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, spin: 0, spinV: 0, spinGoal: 0, side: 1, lastSpin: -9, knee: [0, 0], fan: 0.5, fanV: 0, fanGoal: 0.5, wrist: { x: 0, v: 0 }, lastT: -9, now: 0 };
const FL_NU = 64, FL_PIN = 8, FL_FREE = 17, FL_NV = FL_NU * 0 + FL_PIN + FL_FREE, FL_DV = 0.0325;
const FL_VU = 160, FL_VV = 10, FL_DVV = 0.028, FL_REP = 40, FL_TIERS = [FL_PIN - 1, FL_PIN - 1 + 6, FL_PIN - 1 + 12];

// the body inside the skirt, in its own frame: half-widths of the fitted skirt from the waist to the knee
function flProfile(y) {
  const K = [[1.12, 0.135, 0.105], [0.9, 0.185, 0.15], [0.72, 0.168, 0.132], [0.55, 0.14, 0.115]];
  for (let i = 0; i < K.length - 1; i++) if (y >= K[i + 1][0]) { const a = K[i], b = K[i + 1], s = (y - b[0]) / (a[0] - b[0]), e = s * s * (3 - 2 * s);
    return [b[1] + (a[1] - b[1]) * e, b[2] + (a[2] - b[2]) * e]; }
  return [K[3][1], K[3][2]];
}
function flCloth() {
  const P = [], W = [], C = [], A = [];                         // particles, inverse masses, constraints, attachments
  const add = (x, y, z, w) => { P.push(x, y, z); W.push(w); return W.length - 1; };
  const con = (i, j, r, k) => C.push([i, j, r, k]);
  // the skirt: fitted rows pinned to the body, then the free cloth below the knee, flaring into godets
  const base = W.length, ringR = [];
  for (let v = 0; v < FL_NV; v++) {
    const f = v - (FL_PIN - 1), y = v < FL_PIN ? 1.12 - v * (0.57 / (FL_PIN - 1)) : 0.55 - f * FL_DV * Math.cos(0.42);
    const [rx, rz] = v < FL_PIN ? flProfile(y) : [0.14 + f * FL_DV * Math.sin(0.42), 0.115 + f * FL_DV * Math.sin(0.42)];
    ringR.push((rx + rz) / 2);
    for (let u = 0; u < FL_NU; u++) { const a = u / FL_NU * TAU; add(Math.sin(a) * rx, y, Math.cos(a) * rz, v < FL_PIN ? 0 : 1); }
  }
  const B = (u, v) => base + v * FL_NU + ((u % FL_NU) + FL_NU) % FL_NU;
  const restU = v => { const f = Math.max(0, v - (FL_PIN - 1)); return TAU * (0.128 + f * FL_DV * Math.sin(0.42)) * (1 + f * 0.012) / FL_NU; };
  for (let v = FL_PIN - 1; v < FL_NV; v++) for (let u = 0; u < FL_NU; u++) {
    const ru = restU(v);
    if (v >= FL_PIN) con(B(u, v), B(u + 1, v), ru, 1);
    if (v + 1 < FL_NV) { con(B(u, v), B(u, v + 1), FL_DV, 1);
      const rd = Math.hypot((ru + restU(v + 1)) / 2, FL_DV); con(B(u, v), B(u + 1, v + 1), rd, 0.6); con(B(u + 1, v), B(u, v + 1), rd, 0.6); }
    if (v >= FL_PIN) con(B(u, v), B(u + 2, v), ru * 2, 0.12);
    if (v + 2 < FL_NV) con(B(u, v), B(u, v + 2), FL_DV * 2, 0.12);
  }
  // three volantes: circle-cut flounces whose lower edge is twice as long as the seam they hang from,
  // so they fall in deep, rolling folds; a horsehair braid in the hem gives the edge a little spring
  const tiers = FL_TIERS.map((row, k) => {
    const t0 = W.length, R = ringR[row], top = TAU * R / FL_VU, full = 2.4;
    for (let j = 0; j < FL_VV; j++) {
      const s = j / (FL_VV - 1), rr = R + j * FL_DVV * 0.5, y = (row < FL_PIN ? 0.55 : 0.55 - (row - FL_PIN + 1) * FL_DV) - j * FL_DVV * 0.85;
      // start already folded: waves deep enough that each row has the length it was cut with
      const ratio = Math.max(1, (1 + full * s) * R / rr), amp = rr * Math.sqrt(2 * (ratio * ratio - 1)) / 19;
      for (let u = 0; u < FL_VU; u++) { const a = u / FL_VU * TAU, wv = Math.sin(a * 19 + k * 2) * amp;
        add(Math.sin(a) * (rr + wv) * 1.1, y + Math.cos(a * 19 + k * 2) * amp * 0.3, Math.cos(a) * (rr + wv) * 0.92, j === 0 && row < FL_PIN ? 0 : 1); }
    }
    const V = (u, j) => t0 + j * FL_VU + ((u % FL_VU) + FL_VU) % FL_VU;
    const ru = j => top * (1 + full * j / (FL_VV - 1));
    for (let j = 0; j < FL_VV; j++) for (let u = 0; u < FL_VU; u++) {
      con(V(u, j), V(u + 1, j), ru(j), 1);
      if (j + 1 < FL_VV) { con(V(u, j), V(u, j + 1), FL_DVV, 1); const rd = Math.hypot((ru(j) + ru(j + 1)) / 2, FL_DVV); con(V(u, j), V(u + 1, j + 1), rd, 0.5); con(V(u + 1, j), V(u, j + 1), rd, 0.5); }
      con(V(u, j), V(u + 2, j), ru(j) * 2, j > FL_VV - 3 ? 0.14 : 0.07);
      if (j + 2 < FL_VV) con(V(u, j), V(u, j + 2), FL_DVV * 2, 0.35);
    }
    // the seam: each point of the flounce's top edge is sewn to the skirt between two of its points
    for (let u = 0; u < FL_VU; u++) { const pu = u * FL_NU / FL_VU, a = Math.floor(pu), wb = pu - a; A.push([V(u, 0), B(a, row), B(a + 1, row), wb]); }
    return { t0, row, V };
  });
  const n = W.length, X = new Float32Array(P), O = new Float32Array(P);
  const ci = new Int32Array(C.length * 2), cr = new Float32Array(C.length), ck = new Float32Array(C.length);
  C.forEach(([i, j, r, k], m) => { ci[m * 2] = i; ci[m * 2 + 1] = j; cr[m] = r; ck[m] = k; });
  // for each volante point: which ring of the skirt lies beneath it (it must stay outside that ring)
  const under = new Int32Array(n).fill(-1), lift = new Float32Array(n);
  tiers.forEach(T => { for (let j = 0; j < FL_VV; j++) for (let u = 0; u < FL_VU; u++) {
    under[T.V(u, j)] = Math.min(FL_NV - 1, T.row + Math.round(j * FL_DVV * 0.85 / FL_DV)); lift[T.V(u, j)] = 0.006 + j * 0.0025; } });
  return { n, X, O, W: new Float32Array(W), ci, cr, ck, A, tiers, base, under, lift, L: new Float32Array(n * 3), N: new Float32Array(n * 3) };
}

// the textures of the silk: ground colour, a gold galón, then black lace with a scalloped edge
function flSilkTex(col) {
  const w = 256, h = 1024, c = casaCv(w, h), x = c.getContext("2d"), a = casaCv(w, h), y = a.getContext("2d"), m = casaCv(w, h), z = m.getContext("2d");
  const r = seeded(31), lace0 = 0.8 * h;
  x.fillStyle = col; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,220,210"},${0.012 + r() * 0.02})`; x.fillRect(0, r() * h, w, 1 + r() * 2); }   // slubs in the weave
  y.fillStyle = "#fff"; y.fillRect(0, 0, w, h);
  z.fillStyle = "rgb(0,110,0)"; z.fillRect(0, 0, w, h);
  // the galón: a narrow woven gold braid sewn just above the lace
  const g0 = lace0 - 26;
  x.fillStyle = "#B88C3E"; x.fillRect(0, g0, w, 18); z.fillStyle = "rgb(0,95,255)"; z.fillRect(0, g0, w, 18);
  for (let i = 0; i < w; i += 6) { x.fillStyle = "rgba(255,230,170,0.35)"; x.fillRect(i, g0 + 2, 3, 14); x.fillStyle = "rgba(70,40,10,0.35)"; x.fillRect(i + 3, g0 + 2, 1, 14); }
  // the lace: black, a scalloped edge, a flower in each scallop, eyelets and a net
  x.fillStyle = "#060405"; x.fillRect(0, lace0 - 6, w, h - lace0 + 6); z.fillStyle = "rgb(0,195,0)"; z.fillRect(0, lace0 - 6, w, h - lace0 + 6);
  y.fillStyle = "#000"; y.fillRect(0, lace0, w, h - lace0);
  y.fillStyle = "#fff";
  const sc = () => { y.beginPath(); y.moveTo(0, lace0); y.lineTo(w, lace0); y.lineTo(w, h - 70); y.bezierCurveTo(w * 0.85, h - 4, w * 0.15, h - 4, 0, h - 70); y.closePath(); };
  sc(); y.fill();
  // holes of the net, then the solid motifs drawn back over it
  y.fillStyle = "#000";
  for (let j = 0; j < 14; j++) for (let i = 0; i < 22; i++) { const px = i * 12 + (j % 2) * 6, py = lace0 + 14 + j * 12; y.beginPath(); y.arc(px, py, 3.6, 0, TAU); y.fill(); }
  y.fillStyle = "#fff"; y.strokeStyle = "#fff";
  const cx = w / 2, cy = lace0 + 88;
  for (let k = 0; k < 6; k++) { y.save(); y.translate(cx, cy); y.rotate(k / 6 * TAU); y.beginPath(); y.ellipse(0, -26, 13, 24, 0, 0, TAU); y.fill(); y.restore(); }
  y.fillStyle = "#000"; for (let k = 0; k < 6; k++) { y.save(); y.translate(cx, cy); y.rotate(k / 6 * TAU); y.beginPath(); y.ellipse(0, -28, 5, 13, 0, 0, TAU); y.fill(); y.restore(); }
  y.fillStyle = "#fff"; y.beginPath(); y.arc(cx, cy, 9, 0, TAU); y.fill();
  for (const sx of [0, w]) { y.save(); y.translate(sx, lace0 + 60); for (let k = 0; k < 5; k++) { y.beginPath(); y.ellipse(Math.cos(k * 1.26) * 18, Math.sin(k * 1.26) * 18, 7, 12, k * 1.26 + 1.57, 0, TAU); y.fill(); } y.restore(); }
  y.lineWidth = 7; sc(); y.stroke();                                // the cord along the scalloped edge
  y.fillStyle = "#fff"; y.fillRect(0, lace0, w, 10);
  y.fillStyle = "#000"; for (let i = 0; i < w; i += 16) { y.beginPath(); y.arc(i + 8, lace0 + 26, 4.5, 0, TAU); y.fill(); }   // a row of eyelets
  // where the silk sheen shows: the fabric, not the braid or the lace
  const sh = casaCv(w, h), q = sh.getContext("2d"); q.fillStyle = "#fff"; q.fillRect(0, 0, w, h); q.fillStyle = "#111"; q.fillRect(0, g0, w, h - g0);
  return { c, a, m, sh };
}
// the fan leaf: silk painted in gouache with roses and carnations, framed by gilded bands
function flFanTex(r2, r1, span) {
  const S2 = 2048, c = casaCv(S2, S2 / 2 + 40), x = c.getContext("2d"), sc = (S2 / 2 - 24) / r2, cx = S2 / 2, cy = S2 / 2 + 10, r = seeded(902);
  x.fillStyle = "#E9DEC8"; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "120,90,60" : "255,250,240"},${0.03 + r() * 0.04})`; x.fillRect(r() * c.width, r() * c.height, 1 + r() * 30, 1); }
  const P = (rad, a) => [cx + Math.sin(a) * rad * sc, cy - Math.cos(a) * rad * sc];
  const band = (ra, rb, col) => { x.beginPath(); x.arc(cx, cy, rb * sc, -Math.PI / 2 - span / 2 - 0.05, -Math.PI / 2 + span / 2 + 0.05); x.arc(cx, cy, ra * sc, -Math.PI / 2 + span / 2 + 0.05, -Math.PI / 2 - span / 2 - 0.05, true); x.closePath(); x.fillStyle = col; x.fill(); };
  band(r2 - 0.012, r2, "#B98E43"); band(r2 - 0.015, r2 - 0.012, "#2A1A12"); band(r1, r1 + 0.01, "#B98E43"); band(r1 + 0.01, r1 + 0.012, "#2A1A12");
  // leaves first, then the flowers over them: crimson and burgundy roses, a few white carnations, gold sprigs
  const leafC = ["#4B5233", "#3C4429", "#5E6340"], flowers = [];
  for (let i = 0; i < 9; i++) { const a = -span / 2 + 0.18 + (span - 0.36) * (i / 8) + (r() - 0.5) * 0.08, rad = r1 + (r2 - r1) * (0.5 + Math.sin(i * 1.7) * 0.15); flowers.push([a, rad, i]); }
  for (const [a, rad] of flowers) for (let k = 0; k < 5; k++) {
    const [px, py] = P(rad + (r() - 0.5) * 0.025, a + (r() - 0.5) * 0.12), ang = r() * TAU, L = (0.016 + r() * 0.012) * sc / 40;
    x.save(); x.translate(px, py); x.rotate(ang); x.fillStyle = leafC[k % 3];
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 18, -L * 9, L * 40, 0); x.quadraticCurveTo(L * 18, L * 9, 0, 0); x.fill();
    x.strokeStyle = "rgba(230,220,180,0.25)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(2, 0); x.lineTo(L * 36, 0); x.stroke(); x.restore();
  }
  for (const [a, rad, i] of flowers) {
    const [px, py] = P(rad, a), R = (i % 3 === 1 ? 0.014 : 0.018) * sc, white = i % 4 === 2, base = white ? [236, 228, 214] : i % 2 ? [128, 22, 38] : [92, 14, 30];
    for (let ring = 0; ring < 4; ring++) for (let k = 0; k < 7 - ring; k++) {
      const an = k / (7 - ring) * TAU + ring * 0.5 + i, rr = R * (1 - ring * 0.22), sh = 1 - ring * 0.12 + (r() - 0.5) * 0.1;
      x.fillStyle = `rgb(${base.map(q => Math.round(Math.min(255, q * (white ? 1 - ring * 0.04 : sh + ring * 0.12)))).join(",")})`;
      x.beginPath(); x.ellipse(px + Math.cos(an) * rr * 0.45, py + Math.sin(an) * rr * 0.45, rr * 0.55, rr * 0.38, an, 0, TAU); x.fill();
      x.strokeStyle = white ? "rgba(140,30,40,0.5)" : "rgba(255,200,190,0.18)"; x.lineWidth = 1.2; x.stroke();
    }
    x.fillStyle = white ? "#C9A24D" : "rgba(40,6,10,0.6)"; x.beginPath(); x.arc(px, py, R * 0.16, 0, TAU); x.fill();
  }
  x.strokeStyle = "#B98E43"; x.lineWidth = 2.2;
  for (let i = 0; i < 26; i++) { const a = -span / 2 + 0.1 + r() * (span - 0.2), rad = r1 + 0.02 + r() * (r2 - r1 - 0.05), [px, py] = P(rad, a), an = r() * TAU;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(an) * 14, py + Math.sin(an) * 14, px + Math.cos(an + 0.6) * 26, py + Math.sin(an + 0.6) * 26); x.stroke();
    x.fillStyle = "#C9A24D"; x.beginPath(); x.arc(px + Math.cos(an + 0.6) * 26, py + Math.sin(an + 0.6) * 26, 2.8, 0, TAU); x.fill(); }
  return { c, uv: (rad, a) => [(cx + Math.sin(a) * rad * sc) / c.width, 1 - (cy - Math.cos(a) * rad * sc) / c.height] };
}
function flWoodTex() {
  const w = 1024, h = 1024, c = casaCv(w, h), x = c.getContext("2d"), m = casaCv(w, h), z = m.getContext("2d"), r = seeded(55);
  const bw = w / 30;
  for (let i = 0; i < 30; i++) {
    let y0 = -r() * 400;
    while (y0 < h) { const L = 300 + r() * 500, v = 0.75 + r() * 0.35;
      x.fillStyle = `rgb(${Math.round(52 * v)},${Math.round(34 * v)},${Math.round(24 * v)})`; x.fillRect(i * bw, y0, bw, L);
      for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(${r() < 0.5 ? "20,10,6" : "110,80,55"},${0.08 + r() * 0.1})`; x.fillRect(i * bw + r() * bw, y0, 1 + r() * 2, L); }
      x.fillStyle = "rgba(10,6,4,0.9)"; x.fillRect(i * bw, y0, bw, 2);
      z.fillStyle = `rgb(0,${Math.round(90 + r() * 70)},0)`; z.fillRect(i * bw, y0, bw, L); y0 += L; }
    x.fillStyle = "rgba(8,5,3,0.95)"; x.fillRect(i * bw, 0, 1.5, h);
  }
  return { c, m };
}

function flBuild() {
  const T = THREE, scene = new T.Scene();
  const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.9;
  const aniso = r.capabilities.getMaxAnisotropy();
  scene.background = new T.Color(0x060404);
  const tex = (cv, srgb, rep) => { const t = new T.CanvasTexture(cv); t.anisotropy = aniso; t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  // reflections: a dark room with two warm softboxes
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ color: 0x0c0807, side: T.BackSide })));
  const sb = (x, y, z, w, h, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0.6, 0); env.add(m); };
  sb(-5, 8, 7, 4, 3, 0xffcf9a); sb(6, 6, -7, 3, 5, 0xd8925a); sb(0, -3, 9, 10, 2, 0x2a1a12);
  scene.environment = new T.PMREMGenerator(r).fromScene(env, 0.03).texture;

  // the tablao: a floor of dark boards, and a black velvet curtain behind
  const wood = flWoodTex(), wm = tex(wood.c, true), wr = tex(wood.m);
  [wm, wr].forEach(t => t.repeat.set(2, 2));
  const floor = new T.Mesh(new T.PlaneGeometry(8, 8), new T.MeshStandardMaterial({ map: wm, roughnessMap: wr, roughness: 0.8, color: new T.Color(0x8a8a8a).convertSRGBToLinear(), envMapIntensity: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cg = new T.PlaneGeometry(9, 4.5, 360, 1), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) { const xx = cp.getX(i); cp.setZ(i, Math.sin(xx * 5.3) * 0.07 + Math.sin(xx * 11.7 + 1) * 0.03); }
  cg.computeVertexNormals();
  const curtain = new T.Mesh(cg, new T.MeshPhysicalMaterial({ color: new T.Color(0x170408).convertSRGBToLinear(), roughness: 0.95, sheen: 1, sheenRoughness: 0.5, sheenColor: new T.Color(0x5a1420).convertSRGBToLinear(), envMapIntensity: 0.3 }));
  curtain.position.set(0, 2.2, -2.6); curtain.receiveShadow = true; scene.add(curtain);

  // light: a warm spot from the front left, a rim light from behind on the right, a little fill
  const key = new T.SpotLight(0xffd2a0, 1.6, 0, 0.3, 0.6, 0); key.position.set(-1.7, 3.4, 2.6); key.target.position.set(0.05, 0.45, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1.5; key.shadow.camera.far = 8; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.012; key.shadow.radius = 3;
  const rim = new T.SpotLight(0xffbe86, 1.6, 0, 0.22, 0.6, 0); rim.position.set(1.8, 2.6, -2.0); rim.target.position.set(0, 0.5, 0);
  const rim2 = new T.SpotLight(0xff9a70, 0.7, 0, 0.25, 0.7, 0); rim2.position.set(-2.2, 1.2, -1.6); rim2.target.position.set(0, 0.4, 0);
  scene.add(key, key.target, rim, rim.target, rim2, rim2.target, new T.HemisphereLight(0x3a2520, 0x080404, 0.2));

  // the cloth
  const cl = flCloth(), meshes = [];
  const silk = (col) => { const t = flSilkTex(col), m = tex(t.c, true), a = tex(t.a), mr = tex(t.m);
    return new T.MeshPhysicalMaterial({ map: m, alphaMap: a, sheenColorMap: tex(t.sh), alphaTest: 0.5, roughnessMap: mr, metalnessMap: mr, roughness: 1, metalness: 1, sheen: 1, sheenRoughness: 0.4,
      sheenColor: new T.Color(col).convertSRGBToLinear().multiplyScalar(1.5), side: T.DoubleSide, envMapIntensity: 0.6 }); };
  const BURG = "#3F0A15", CRIM = "#62192A";
  const grid = (nu, nv, idx, uRep, mat) => {
    const nV = (nu + 1) * nv, pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), map = new Int32Array(nV), ind = [];
    for (let v = 0; v < nv; v++) for (let u = 0; u <= nu; u++) { const k = v * (nu + 1) + u; map[k] = idx(u % nu, v); uv[k * 2] = u / nu * uRep; uv[k * 2 + 1] = 1 - v / (nv - 1); }
    for (let v = 0; v < nv - 1; v++) for (let u = 0; u < nu; u++) { const a = v * (nu + 1) + u, b = a + 1, c = a + nu + 1, d = c + 1; ind.push(a, c, b, b, c, d); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.BufferAttribute(uv, 2)); geo.setIndex(ind);
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
    meshes.push({ geo, map, nu }); return mesh;
  };
  const skirtMat = silk(BURG);
  skirtMat.alphaMap = null; skirtMat.sheenColorMap = null; skirtMat.alphaTest = 0; skirtMat.map = tex((() => { const c = casaCv(1024, 64), x = c.getContext("2d"); x.fillStyle = BURG; x.fillRect(0, 0, 1024, 64);
    // the panels of the fitted skirt, joined by seams
    for (let i = 0; i < 8; i++) { x.fillStyle = "rgba(10,0,2,0.55)"; x.fillRect(i * 128, 0, 2, 64); x.fillStyle = "rgba(255,180,180,0.08)"; x.fillRect(i * 128 + 2, 0, 2, 64); } return c; })(), true);
  skirtMat.roughnessMap = skirtMat.metalnessMap = null; skirtMat.roughness = 0.6; skirtMat.metalness = 0;
  grid(FL_NU, FL_NV, (u, v) => cl.base + v * FL_NU + u, 1, skirtMat);
  const mats = [silk(CRIM), silk(BURG)];
  cl.tiers.forEach((Tr, k) => grid(FL_VU, FL_VV, (u, j) => Tr.V(u, j), FL_REP, mats[k % 2]));

  // the fan
  const fan = new T.Group(); scene.add(fan);
  const r1 = 0.105, r2 = 0.245, span = 2.9, NR = 15, FC = (NR - 1) * 2, FR = 7, ft = flFanTex(r2, r1, span);
  const fpos = new Float32Array((FC + 1) * FR * 3), fuv = new Float32Array((FC + 1) * FR * 2), fi = [];
  for (let j = 0; j < FR; j++) for (let c = 0; c <= FC; c++) { const k = j * (FC + 1) + c, rad = r1 + (r2 - r1) * j / (FR - 1), a = -span / 2 + span * c / FC, [uu, vv] = ft.uv(rad, a); fuv[k * 2] = uu; fuv[k * 2 + 1] = vv; }
  for (let j = 0; j < FR - 1; j++) for (let c = 0; c < FC; c++) { const a = j * (FC + 1) + c, b = a + 1, d = a + FC + 1, e = d + 1; fi.push(a, b, d, b, e, d); }
  const fgeo = new T.BufferGeometry(); fgeo.setAttribute("position", new T.BufferAttribute(fpos, 3)); fgeo.setAttribute("uv", new T.BufferAttribute(fuv, 2)); fgeo.setIndex(fi);
  const fmap = new T.CanvasTexture(ft.c); fmap.encoding = T.sRGBEncoding; fmap.anisotropy = aniso;
  const leafM = new T.Mesh(fgeo, new T.MeshPhysicalMaterial({ map: fmap, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new T.Color(0x9a9080), side: T.DoubleSide, envMapIntensity: 0.7 }));
  leafM.castShadow = leafM.receiveShadow = true; fan.add(leafM);
  const lacquer = new T.MeshPhysicalMaterial({ color: new T.Color(0x0b0706).convertSRGBToLinear(), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.5 });
  const gilt = new T.MeshStandardMaterial({ color: new T.Color(0xc8a050).convertSRGBToLinear(), metalness: 1, roughness: 0.35, envMapIntensity: 1 });
  const ribs = [];
  for (let i = 0; i < NR; i++) { const guard = i === 0 || i === NR - 1, L = r2 + (guard ? 0.012 : 0.004);
    const m = new T.Mesh(new T.BoxGeometry(guard ? 0.014 : 0.008, L, guard ? 0.005 : 0.0025), guard ? gilt : lacquer); m.geometry.translate(0, L / 2, 0);
    m.castShadow = true; fan.add(m); ribs.push(m); }
  const pin = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.018, 20), gilt); pin.rotation.x = Math.PI / 2; fan.add(pin);

  const cam = new T.PerspectiveCamera(20, 1.45, 0.1, 30); cam.position.set(0, 0.42, 2.55); cam.lookAt(0, 0.39, 0);
  Object.assign(FLA, { r, scene, cam, cl, meshes, fan, fgeo, ribs, fdim: { r1, r2, span, NR, FC, FR }, ready: true });
  flReset();
}

// where the unseen body is: hips swaying, turning, a step
function flBody(t) {
  return { x: fla.sway.x, y: -0.012 * S.bass, yaw: fla.yaw.x + fla.spin, roll: -fla.sway.x * 0.9, k0: fla.knee[0], k1: fla.knee[1] };
}
function flPinned(bd, cl) {
  const { X } = cl, cy = Math.cos(bd.yaw), sy = Math.sin(bd.yaw), cr = Math.cos(bd.roll), sr = Math.sin(bd.roll);
  for (let v = 0; v < FL_PIN; v++) {
    const y = 1.12 - v * (0.57 / (FL_PIN - 1)), [rx, rz] = flProfile(y);
    for (let u = 0; u < FL_NU; u++) { const a = u / FL_NU * TAU, lx = Math.sin(a) * rx, lz = Math.cos(a) * rz, ly = y - 1.0;
      // roll about the hips (in the body's side-to-side plane), then yaw about the vertical
      const rx2 = lx * cr - ly * sr, ry2 = lx * sr + ly * cr + 1.0;
      const i = (cl.base + v * FL_NU + u) * 3; X[i] = bd.x + rx2 * cy + lz * sy; X[i + 1] = ry2 + bd.y; X[i + 2] = -rx2 * sy + lz * cy; }
  }
  cl.tiers.forEach(T => { if (T.row < FL_PIN) for (let u = 0; u < FL_VU; u++) {
    const pu = u * FL_NU / FL_VU, a = Math.floor(pu), wb = pu - a, ia = (cl.base + T.row * FL_NU + a) * 3, ib = (cl.base + T.row * FL_NU + (a + 1) % FL_NU) * 3, k = T.V(u, 0) * 3;
    for (let d = 0; d < 3; d++) X[k + d] = X[ia + d] * (1 - wb) + X[ib + d] * wb; } });
}
function flStep(cl, bd, h, t) {
  const { X, O, W, ci, cr, ck, A, n, under, lift, N } = cl;
  const cy = Math.cos(bd.yaw), sy = Math.sin(bd.yaw);
  const air = 0.6 + S.mid * 2 + S.high;
  // move: Verlet, with gravity, air resistance against the cloth, and a soft stir of air
  for (let p = 0; p < n; p++) {
    if (W[p] === 0) continue;
    const i = p * 3; let vx = (X[i] - O[i]) * 0.996, vy = (X[i + 1] - O[i + 1]) * 0.996, vz = (X[i + 2] - O[i + 2]) * 0.996;
    const vn = (vx * N[i] + vy * N[i + 1] + vz * N[i + 2]) * 0.06;        // drag acts across the cloth, not along it
    vx -= N[i] * vn; vy -= N[i + 1] * vn; vz -= N[i + 2] * vn;
    const wx = Math.sin(X[i + 1] * 7.3 + t * 1.1 + X[i + 2] * 3.1) * Math.sin(t * 0.37 + X[i] * 2.3) * air * 0.5, wz = Math.sin(X[i + 1] * 6.1 - t * 0.9 + X[i] * 2.7) * Math.sin(t * 0.29 + X[i + 2] * 2.9) * air * 0.5;
    O[i] = X[i]; O[i + 1] = X[i + 1]; O[i + 2] = X[i + 2];
    X[i] += vx + wx * h * h; X[i + 1] += vy - 9.8 * h * h; X[i + 2] += vz + wz * h * h;
  }
  for (let it = 0; it < 6; it++) {
    for (let m = 0, M = cr.length; m < M; m++) {
      const a = ci[m * 2], b = ci[m * 2 + 1], wa = W[a], wb = W[b], ws = wa + wb; if (ws === 0) continue;
      const ia = a * 3, ib = b * 3, dx = X[ib] - X[ia], dy = X[ib + 1] - X[ia + 1], dz = X[ib + 2] - X[ia + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const f = (d - cr[m]) / d * ck[m] / ws;
      X[ia] += dx * f * wa; X[ia + 1] += dy * f * wa; X[ia + 2] += dz * f * wa; X[ib] -= dx * f * wb; X[ib + 1] -= dy * f * wb; X[ib + 2] -= dz * f * wb;
    }
    // the seams: each flounce is sewn to the skirt, and pulls on it
    for (const [p, a, b, wb] of A) { if (W[p] === 0) continue;
      const ip = p * 3, ia = a * 3, ib = b * 3, la = W[a] ? 0.4 : 0;
      for (let d = 0; d < 3; d++) { const tgt = X[ia + d] * (1 - wb) + X[ib + d] * wb, e = tgt - X[ip + d]; X[ip + d] += e * (1 - la); X[ia + d] -= e * la * (1 - wb); X[ib + d] -= e * la * wb; } }
  }
  // collisions: the floor, the legs, and each flounce stays outside the skirt beneath it
  const legs = [0, 1].map(s => { const sx = s ? 0.085 : -0.085, k = s ? bd.k1 : bd.k0;
    return [[sx, 0.86, 0], [sx * 0.95, 0.5 + k * 0.05, 0.03 + k * 0.16], [sx * 0.9, 0.07 + k * 0.1, k * 0.06]]; });
  // how far out the skirt reaches in each direction, ring by ring (binned by angle, as the skirt turns)
  const R = cl.R || (cl.R = new Float32Array(FL_NV * FL_NU)); R.fill(0);
  for (let v = 0; v < FL_NV; v++) {
    for (let u = 0; u < FL_NU; u++) { const i = (cl.base + v * FL_NU + u) * 3, lx = X[i] - bd.x, lz = X[i + 2];
      const bin = ((Math.floor(Math.atan2(lx, lz) / TAU * FL_NU) % FL_NU) + FL_NU) % FL_NU, rr = Math.hypot(lx, lz); if (rr > R[v * FL_NU + bin]) R[v * FL_NU + bin] = rr; }
    for (let pass = 0; pass < 2; pass++) for (let u = 0; u < FL_NU; u++) { const k = v * FL_NU + u; if (R[k] === 0) R[k] = Math.max(R[v * FL_NU + (u + 1) % FL_NU], R[v * FL_NU + (u + FL_NU - 1) % FL_NU]); }
  }
  for (let p = 0; p < n; p++) {
    if (W[p] === 0) continue;
    const i = p * 3;
    if (X[i + 1] < 0.004) X[i + 1] = 0.004;
    let lx = X[i] - bd.x, lz = X[i + 2];
    const bx = lx * cy - lz * sy, bz = lx * sy + lz * cy, by = X[i + 1] - bd.y;       // into the body's frame
    let px = bx, pz = bz, moved = false;
    for (const L of legs) for (let s = 0; s < 2; s++) {
      const A0 = L[s], B0 = L[s + 1], rad = s ? 0.062 : 0.08, ex = B0[0] - A0[0], ey = B0[1] - A0[1], ez = B0[2] - A0[2];
      const q = Math.max(0, Math.min(1, ((px - A0[0]) * ex + (by - A0[1]) * ey + (pz - A0[2]) * ez) / (ex * ex + ey * ey + ez * ez)));
      const cx = A0[0] + ex * q, cyy = A0[1] + ey * q, cz = A0[2] + ez * q, dx = px - cx, dy = by - cyy, dz = pz - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < rad && d > 1e-6) { const f = rad / d; px = cx + dx * f; pz = cz + dz * f; moved = true; }
    }
    if (under[p] >= 0) {
      const rr = Math.hypot(px, pz), u = ((Math.floor(Math.atan2(lx, lz) / TAU * FL_NU) % FL_NU) + FL_NU) % FL_NU;
      const need = R[under[p] * FL_NU + u] + lift[p];
      if (rr < need && rr > 1e-5) { px *= need / rr; pz *= need / rr; moved = true; }
    }
    if (moved) { X[i] = bd.x + px * cy + pz * sy; X[i + 2] = -px * sy + pz * cy; }
  }
}
function flReset() {
  const cl = FLA.cl = flCloth();
  Object.assign(fla, { yaw: { x: 0, v: 0 }, sway: { x: 0, v: 0 }, spin: 0, spinV: 0, spinGoal: 0, knee: [0, 0], fan: 0.5, fanV: 0, fanGoal: 0.5, wrist: { x: 0, v: 0 } });
  const bd = flBody(0); flPinned(bd, cl);
  for (let s = 0; s < 180; s++) { flStep(cl, bd, 1 / 120, s / 120); if (s % 15 === 0) flNormals(cl); }     // let it settle into its folds
  cl.O.set(cl.X);
}
function flNormals(cl) {
  FLA.meshes.forEach(M => { const pos = M.geo.attributes.position.array;
    for (let k = 0; k < M.map.length; k++) { const p = M.map[k] * 3; pos[k * 3] = cl.X[p]; pos[k * 3 + 1] = cl.X[p + 1]; pos[k * 3 + 2] = cl.X[p + 2]; }
    M.geo.attributes.position.needsUpdate = true; M.geo.computeVertexNormals();
    const nr = M.geo.attributes.normal.array, nu = M.nu, rows = M.map.length / (nu + 1);
    for (let v = 0; v < rows; v++) { const a = v * (nu + 1) * 3, b = (v * (nu + 1) + nu) * 3;   // close the seam where the cloth wraps round
      for (let d = 0; d < 3; d++) { const m = (nr[a + d] + nr[b + d]) / 2; nr[a + d] = nr[b + d] = m; } }
    for (let k = 0; k < M.map.length; k++) { const p = M.map[k] * 3; cl.N[p] = nr[k * 3]; cl.N[p + 1] = nr[k * 3 + 1]; cl.N[p + 2] = nr[k * 3 + 2]; }
  });
}
function flFan(t, dt, bd) {
  const { r1, r2, span, NR, FC, FR } = FLA.fdim, A = Math.max(0.12, Math.min(span, fla.fan));
  const pos = FLA.fgeo.attributes.position.array, full = span / FC * 1.18;
  for (let j = 0; j < FR; j++) { const rad = r1 + (r2 - r1) * j / (FR - 1);
    for (let c = 0; c <= FC; c++) { const a = -A / 2 + A * c / FC, k = (j * (FC + 1) + c) * 3, half = A / FC;
      const z = c % 2 ? (c % 4 === 1 ? 1 : -1) * rad * Math.sqrt(Math.max(0, full * full - half * half)) * 0.5 : 0;
      pos[k] = Math.sin(a) * rad; pos[k + 1] = Math.cos(a) * rad; pos[k + 2] = z; } }
  FLA.fgeo.attributes.position.needsUpdate = true; FLA.fgeo.computeVertexNormals();
  FLA.ribs.forEach((m, i) => { const a = -A / 2 + A * i / (NR - 1); m.rotation.set(0, 0, -a); m.position.set(0, 0, i === 0 || i === NR - 1 ? 0.0035 : -0.003 - i * 0.0002); });   // the sticks behind the leaf, the gilded guards over it
  // the hand: low at the right of the hips, following them, the wrist turning with each flick
  const f = FLA.fan;
  f.position.set(0.3 + bd.x * 0.7, 0.47 + Math.sin(t * 0.8) * 0.015 + fla.wrist.x * 0.02, 0.32);
  f.rotation.set(-0.15 + fla.wrist.x * 0.12, -0.3 + Math.sin(t * 0.5) * 0.06, -0.35 + fla.wrist.x * 0.3);
}
function flamencoScene(t, dt, box) {
  if (typeof THREE === "undefined") return;
  if (!FLA.ready) flBuild();
  if (t - fla.lastT > 1.5) flReset();
  fla.lastT = t; fla.now = t;
  const h = box.h, w = Math.min(box.w, h * 1.45), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const k = Math.min(DPR, Math.sqrt(7e6 / (w * h))), pw = Math.round(w * k), ph = Math.round(h * k);
  if (FLA.pw !== pw || FLA.ph !== ph) { FLA.pw = pw; FLA.ph = ph; FLA.r.setSize(pw, ph, false); FLA.cam.aspect = pw / ph; FLA.cam.updateProjectionMatrix(); }
  dt = Math.min(dt, 1 / 20);
  // the cloth steps at 120 Hz at most; a slow frame slows the whole dance down rather than destabilising the silk
  const steps = Math.max(1, Math.min(3, Math.round(dt * 120))), hs = Math.min(dt / steps, 1 / 110); dt = steps * hs;
  const energy = Math.min(1, S.bass * 0.5 + S.mid * 0.5);
  // the body: a slow sway marking the compás, louder music swings it wider
  fla.sway.v += ((Math.sin(t * 1.1) * 0.025 * (0.4 + energy) - fla.sway.x) * 26 - fla.sway.v * 6.5) * dt; fla.sway.x += fla.sway.v * dt;
  fla.yaw.v += ((Math.sin(t * 0.45) * 0.3 * (0.3 + energy) - fla.yaw.x) * 14 - fla.yaw.v * 5) * dt; fla.yaw.x += fla.yaw.v * dt;
  fla.spinV += ((fla.spinGoal - fla.spin) * 9 - fla.spinV * 5.2) * dt; fla.spin += fla.spinV * dt;
  fla.knee = fla.knee.map(q => q * Math.pow(0.08, dt));
  fla.fanGoal += (0.6 + S.mid * 0.9 - fla.fanGoal) * Math.min(1, dt * 0.7);
  fla.fanV += ((fla.fanGoal - fla.fan) * 60 - fla.fanV * 11) * dt; fla.fan += fla.fanV * dt;
  fla.wrist.v += (-fla.wrist.x * 30 - fla.wrist.v * 6) * dt; fla.wrist.x += fla.wrist.v * dt;
  const cl = FLA.cl, bd = flBody(t);
  const b0 = FLA.bd || bd; FLA.bd = bd;
  for (let s = 0; s < steps; s++) { const q = (s + 1) / steps, bi = {};
    for (const key in bd) bi[key] = b0[key] + (bd[key] - b0[key]) * q;
    flPinned(bi, cl); flStep(cl, bi, hs, t); }
  flNormals(cl);
  flFan(t, dt, bd);
  FLA.r.render(FLA.scene, FLA.cam);
  g.drawImage(FLA.r.domElement, x0, y0, w, h);
}
function flamencoBeat() {
  const s = Math.min(1, 0.2 + S.bass * 0.9 + S.pulse * 0.2);
  fla.side *= -1;
  fla.sway.v += fla.side * (0.25 + s * 0.4);                 // the hip answers the beat
  fla.yaw.v += fla.side * (0.45 + s * 0.9);                   // and turns with it
  fla.knee[fla.side > 0 ? 1 : 0] = Math.min(1, 0.4 + s * 0.6);
  fla.fanGoal = Math.max(fla.fanGoal, 1.6 + s * 1.25); fla.wrist.v += fla.side * (2 + s * 3);
  if (s > 0.7 && fla.now - fla.lastSpin > 6) { fla.spinGoal += fla.side * TAU; fla.lastSpin = fla.now; }   // a full turn
}
