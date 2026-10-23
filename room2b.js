// ================================================================
// ROOM 2, pieces ii and iii — redesigned Oct 23.
//   ii  AZULEJOS: a wall of glazed Andalusian tiles on which the ornament draws and glazes itself
//   iii ABANICOS: Spanish folding fans that open and turn with the music, forming rosettes and arcs
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
// 2iii  ABANICOS. Three Spanish folding fans mounted before a warm plaster wall, as in a display of
// decorative arts: a large fan in the centre, deep red silk with a gilded rinceau and a painted rose in a
// cartouche, and on either side a fan of ivory bobbin lace whose carved, pierced sticks show through it.
// Each has its own fixed pivot and resting angle; nothing drifts. The leaf is pleated and folds for real.
// The music only opens, closes and gently tilts them: beats flick them open in turn (left, centre, right,
// centre, like the compás), a strong beat opens all three to their fullest, louder passages hold them
// wider, quiet ones let them settle back to a calm, half-open rest. Before anything is drawn, the furthest
// reach of every fan at its widest opening and tilt is measured, and the camera is framed to that with a
// margin, for whatever shape the window is, so no fan can ever leave the frame.
// (The leaf designs pintado and bordado below are kept from the earlier seven-fan version but unused.)
// ----------------------------------------------------------------
const ABA = { ready: false, SPAN: 2.8, NR: 18, FR: 8, R1: 0.44 };
const aba = { E: 0, ph: 0, n: 0, side: 1, lastStrong: -9, queue: [], lastT: -9, now: 0 };
const ABA_COL = { burg: [84, 16, 30], deep: [112, 18, 28], ivory: [238, 229, 210], gold: [182, 148, 86], goldD: [126, 96, 50] };
const abaRGB = (c, k = 1, a = 1) => `rgba(${c.map(q => Math.round(Math.max(0, Math.min(255, q * k)))).join(",")},${a})`;

// the flat leaf, as it would lie fully opened: canvas coordinates of a point at radius rad (0..1) and angle a
const ABA_W = 2048, ABA_H = 1100, ABA_SC = 1000, ABA_CX = 1024, ABA_CY = 1062;
const abaP = (rad, a) => [ABA_CX + Math.sin(a) * rad * ABA_SC, ABA_CY - Math.cos(a) * rad * ABA_SC];
function abaClip(x, r1, r2, pad = 0.03) {
  const h = ABA.SPAN / 2 + pad; x.beginPath(); x.arc(ABA_CX, ABA_CY, r2 * ABA_SC, -Math.PI / 2 - h, -Math.PI / 2 + h); x.arc(ABA_CX, ABA_CY, r1 * ABA_SC, -Math.PI / 2 + h, -Math.PI / 2 - h, true); x.closePath();
}
function abaBand(x, r1, r2, fill) { abaClip(x, r1, r2, 0.04); x.fillStyle = fill; x.fill(); }
// silk: a fine weave and a little unevenness of dye
function abaSilk(x, base, seed) {
  const r = seeded(seed); x.fillStyle = abaRGB(base); x.fillRect(0, 0, ABA_W, ABA_H);
  for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(r() * ABA_W, r() * ABA_H, 0, r() * ABA_W, r() * ABA_H, 200 + r() * 400);
    g.addColorStop(0, r() < 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,240,220,0.035)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, ABA_W, ABA_H); }
  for (let y = 0; y < ABA_H; y += 2) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,250,240"},${0.012 + r() * 0.02})`; x.fillRect(0, y, ABA_W, 1); }
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,250,240"},${0.02 + r() * 0.03})`; x.fillRect(r() * ABA_W, r() * ABA_H, 6 + r() * 60, 1); }
}
// a rose in gouache: two rings of cupped petals, the heart curled inward, light from the upper left
function abaRose(x, px, py, R, col, rot, r) {
  x.save(); x.translate(px, py); x.rotate(rot);
  const ring = (n, s, k0, off) => { for (let i = 0; i < n; i++) { const a = off + i / n * TAU + (r() - 0.5) * 0.25; x.save(); x.rotate(a);
    const lit = 0.85 + 0.35 * Math.max(0, Math.cos(a + 2.4)), g = x.createLinearGradient(0, -R * 0.1 * s, 0, -R * s);
    g.addColorStop(0, abaRGB(col, 0.6 * k0)); g.addColorStop(0.6, abaRGB(col, lit * k0)); g.addColorStop(1, abaRGB(col, (lit + 0.25) * k0));
    x.fillStyle = g; x.beginPath(); x.moveTo(-R * 0.18 * s, -R * 0.05 * s);
    x.bezierCurveTo(-R * 0.78 * s, -R * 0.3 * s, -R * 0.6 * s, -R * 1.02 * s, 0, -R * 0.96 * s); x.bezierCurveTo(R * 0.6 * s, -R * 1.02 * s, R * 0.78 * s, -R * 0.3 * s, R * 0.18 * s, -R * 0.05 * s); x.closePath(); x.fill();
    x.strokeStyle = abaRGB([255, 220, 205], 1, 0.28); x.lineWidth = Math.max(1, R * 0.025); x.beginPath(); x.moveTo(-R * 0.5 * s, -R * 0.75 * s); x.quadraticCurveTo(0, -R * 1.02 * s, R * 0.5 * s, -R * 0.75 * s); x.stroke();
    x.restore(); } };
  ring(6, 1, 0.92, r() * 6); ring(5, 0.68, 1.0, r() * 6);
  x.lineCap = "round";
  for (let i = 0; i < 5; i++) { x.strokeStyle = abaRGB(col, 0.55 + i * 0.12); x.lineWidth = R * 0.075; x.beginPath(); x.arc(R * 0.02 * i, -R * 0.02 * i, R * (0.08 + i * 0.065), i * 1.9 + 0.3, i * 1.9 + 3.4); x.stroke(); }
  x.restore();
}
function abaLeafShape(x, px, py, L, W, rot, fill, vein) {
  x.save(); x.translate(px, py); x.rotate(rot); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(L * 0.3, -W, L * 0.75, -W * 0.8, L, 0); x.bezierCurveTo(L * 0.75, W * 0.8, L * 0.3, W, 0, 0);
  x.fillStyle = fill; x.fill(); if (vein) { x.strokeStyle = vein; x.lineWidth = Math.max(1, W * 0.12); x.beginPath(); x.moveTo(L * 0.05, 0); x.quadraticCurveTo(L * 0.5, -W * 0.12, L * 0.92, 0); x.stroke();
    for (let k = 1; k < 5; k++) { const t = k / 5; x.beginPath(); x.moveTo(L * t, 0); x.lineTo(L * (t + 0.1), -W * 0.55 * (1 - t * 0.5)); x.moveTo(L * t, 0); x.lineTo(L * (t + 0.1), W * 0.55 * (1 - t * 0.5)); x.stroke(); } }
  x.restore();
}
function abaGoldLeaf(x, px, py, L, W, rot) {
  const g = x.createLinearGradient(px - L, py - L, px + L, py + L); g.addColorStop(0, abaRGB(ABA_COL.gold, 1.15)); g.addColorStop(1, abaRGB(ABA_COL.goldD, 0.95));
  abaLeafShape(x, px, py, L, W, rot, g, abaRGB(ABA_COL.goldD, 0.7));
}
// the borders every leaf shares: a gilt band at the top edge and at the foot, each with a fine coloured line
function abaBorders(x, line) {
  abaBand(x, 0.955, 1.0, abaRGB(ABA_COL.gold)); abaBand(x, 0.942, 0.952, line);
  abaBand(x, 0.44, 0.475, abaRGB(ABA_COL.gold)); abaBand(x, 0.478, 0.486, line);
  x.fillStyle = abaRGB(ABA_COL.goldD, 0.8);
  for (let a = -ABA.SPAN / 2; a <= ABA.SPAN / 2; a += 0.022) { const [px, py] = abaP(0.978, a); x.beginPath(); x.arc(px, py, 2.6, 0, TAU); x.fill(); }
}

function abaPintado() {
  const c = casaCv(ABA_W, ABA_H), x = c.getContext("2d"), r = seeded(301);
  abaSilk(x, ABA_COL.ivory, 41);
  abaClip(x, 0.486, 0.942); x.save(); x.clip();
  // gilded sprays first, then roses and buds over them
  const roses = [[0, 0.71, 96, ABA_COL.deep], [-0.24, 0.66, 66, ABA_COL.burg], [0.25, 0.65, 68, ABA_COL.burg], [-0.7, 0.71, 70, ABA_COL.deep], [0.71, 0.71, 70, ABA_COL.deep],
                 [-1.12, 0.7, 54, ABA_COL.burg], [1.12, 0.7, 54, ABA_COL.burg], [-0.45, 0.82, 40, ABA_COL.burg], [0.47, 0.82, 40, ABA_COL.burg]];
  for (const [a, rad, R] of roses) for (let k = 0; k < 6; k++) { const [px, py] = abaP(rad + (r() - 0.5) * 0.05, a + (r() - 0.5) * 0.16); abaGoldLeaf(x, px, py, R * (1.1 + r() * 0.6), R * 0.38, r() * TAU); }
  // a garland: a thin gilt tendril running along the arc
  x.strokeStyle = abaRGB(ABA_COL.gold, 0.95); x.lineWidth = 3; x.beginPath();
  for (let a = -1.3; a <= 1.3; a += 0.01) { const [px, py] = abaP(0.72 + Math.sin(a * 9) * 0.04, a); a === -1.3 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke();
  for (let a = -1.25; a <= 1.25; a += 0.12) { const [px, py] = abaP(0.72 + Math.sin(a * 9) * 0.04, a); abaGoldLeaf(x, px, py, 34, 12, a + (Math.sin(a * 9) > 0 ? -2.2 : -0.9)); }
  for (const [a, rad, R, col] of roses) { const [px, py] = abaP(rad, a); abaRose(x, px, py, R, col, a, r); }
  // buds and small blossoms scattered among the sprays
  for (let i = 0; i < 16; i++) { const a = -1.3 + r() * 2.6, rad = 0.55 + r() * 0.33, [px, py] = abaP(rad, a);
    if (i % 2) { x.save(); x.translate(px, py); x.rotate(a + (r() - 0.5)); x.fillStyle = abaRGB(ABA_COL.deep, 0.9); x.beginPath(); x.ellipse(0, -14, 11, 18, 0, 0, TAU); x.fill();
      x.fillStyle = abaRGB(ABA_COL.gold, 0.9); x.beginPath(); x.moveTo(-12, 0); x.quadraticCurveTo(0, -18, 12, 0); x.quadraticCurveTo(0, 6, -12, 0); x.fill(); x.restore(); }
    else for (let k = 0; k < 5; k++) { const an = k / 5 * TAU; x.fillStyle = abaRGB(ABA_COL.ivory, 1.04); x.beginPath(); x.ellipse(px + Math.cos(an) * 9, py + Math.sin(an) * 9, 8, 5.5, an, 0, TAU); x.fill();
      x.strokeStyle = abaRGB(ABA_COL.burg, 1, 0.5); x.lineWidth = 1; x.stroke(); } }
  x.restore();
  abaBorders(x, abaRGB(ABA_COL.burg));
  return { c };
}

function abaEncaje() {
  const c = casaCv(ABA_W, ABA_H), x = c.getContext("2d"), a = casaCv(ABA_W, ABA_H), y = a.getContext("2d"), r = seeded(77);
  x.fillStyle = abaRGB(ABA_COL.ivory, 1.02); x.fillRect(0, 0, ABA_W, ABA_H);
  y.fillStyle = "#000"; y.fillRect(0, 0, ABA_W, ABA_H);
  // the net (réseau): fine twisted threads in a diamond mesh
  y.save(); abaClip(y, 0.44, 1.0); y.clip(); y.strokeStyle = "#fff"; y.lineWidth = 6;
  x.save(); abaClip(x, 0.44, 1.0); x.clip(); x.strokeStyle = abaRGB(ABA_COL.ivory, 0.86); x.lineWidth = 2;
  for (let k = -ABA_W; k < ABA_W * 2; k += 30) for (const ctx of [y, x]) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + ABA_H * 0.58, ABA_H); ctx.moveTo(k, 0); ctx.lineTo(k - ABA_H * 0.58, ABA_H); ctx.stroke(); }
  y.restore(); x.restore();
  // the motifs: solid cloth-stitch shapes outlined with a raised cord (cordonnet)
  const solid = (path, holes) => { y.fillStyle = "#fff"; y.beginPath(); path(y); y.fill(); x.fillStyle = abaRGB(ABA_COL.ivory, 1.03); x.beginPath(); path(x); x.fill();
    x.strokeStyle = abaRGB(ABA_COL.ivory, 0.72); x.lineWidth = 3; x.stroke(); x.strokeStyle = abaRGB([255, 252, 245]); x.lineWidth = 1.2; x.stroke();
    if (holes) { y.fillStyle = "#000"; y.beginPath(); holes(y); y.fill(); x.strokeStyle = abaRGB(ABA_COL.ivory, 0.7); x.lineWidth = 2; x.beginPath(); holes(x); x.stroke(); } };
  const flower = (px, py, R, n, rot) => solid(ctx => { for (let k = 0; k < n; k++) { const an = rot + k / n * TAU; ctx.moveTo(px, py); ctx.ellipse(px + Math.cos(an) * R * 0.55, py + Math.sin(an) * R * 0.55, R * 0.5, R * 0.3, an, 0, TAU); } ctx.moveTo(px + R * 0.25, py); ctx.arc(px, py, R * 0.25, 0, TAU); },
    ctx => { for (let k = 0; k < n; k++) { const an = rot + k / n * TAU; ctx.moveTo(px, py); ctx.ellipse(px + Math.cos(an) * R * 0.58, py + Math.sin(an) * R * 0.58, R * 0.2, R * 0.08, an, 0, TAU); } ctx.moveTo(px + R * 0.09, py); ctx.arc(px, py, R * 0.09, 0, TAU); });
  const scroll = (px, py, R, rot, dir) => solid(ctx => { ctx.moveTo(px, py); for (let t = 0; t <= 1.001; t += 0.05) { const an = rot + dir * t * 4.2, rr = R * (1 - t * 0.75); ctx.lineTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr); }
    for (let t = 1; t >= 0; t -= 0.05) { const an = rot + dir * t * 4.2, rr = R * (1 - t * 0.75) - R * 0.16 * (1 - t * 0.6); ctx.lineTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr); } ctx.closePath(); });
  for (let i = 0; i < 9; i++) { const an = -1.24 + i * 0.31, [px, py] = abaP(0.71, an); flower(px, py, i % 2 ? 64 : 84, i % 2 ? 6 : 8, an);
    const [sx, sy] = abaP(0.71, an + 0.155); scroll(sx, sy - 14, 50, an * 2 + 1, 1); scroll(sx, sy + 16, 44, an * 2 - 2, -1);
    const [ux, uy] = abaP(0.86, an + 0.08); flower(ux, uy, 34, 5, an); const [lx, ly] = abaP(0.56, an + 0.08); flower(lx, ly, 28, 5, an); }
  // the foot: a solid band with a row of eyelets
  y.fillStyle = "#fff"; abaClip(y, 0.44, 0.5, 0.04); y.fill(); x.fillStyle = abaRGB(ABA_COL.ivory, 1.02); abaClip(x, 0.44, 0.5, 0.04); x.fill();
  for (let an = -1.38; an <= 1.38; an += 0.045) { const [px, py] = abaP(0.47, an); y.fillStyle = "#000"; y.beginPath(); y.arc(px, py, 5, 0, TAU); y.fill(); x.strokeStyle = abaRGB(ABA_COL.ivory, 0.7); x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.stroke(); }
  // the scalloped edge: everything outside the scallops is cut away, and a cord runs round it
  const h0 = ABA.SPAN / 2 + 0.03, n = 30, st = h0 * 2 / n;
  const edge = ctx => { ctx.moveTo(...abaP(0.95, -h0)); for (let k = 0; k < n; k++) { const an = -h0 + k * st; ctx.quadraticCurveTo(...abaP(1.04, an + st / 2), ...abaP(0.95, an + st)); } };
  y.save(); y.globalCompositeOperation = "destination-in"; y.beginPath(); y.moveTo(...abaP(0.44, -h0)); edge(y); y.lineTo(...abaP(0.44, h0)); y.closePath(); y.fillStyle = "#fff"; y.fill(); y.restore();
  y.save(); y.strokeStyle = "#fff"; y.lineWidth = 9; y.beginPath(); edge(y); y.stroke(); y.restore();
  x.save(); x.strokeStyle = abaRGB(ABA_COL.ivory, 0.75); x.lineWidth = 5; x.beginPath(); edge(x); x.stroke(); x.restore();
  return { c, a };
}

// a carnation (clavel), embroidered: a fan of frilled petals in satin stitch, a gold calyx and stem
function abaClavel(x, px, py, R, col, rot, r) {
  x.save(); x.translate(px, py); x.rotate(rot);
  x.strokeStyle = abaRGB(ABA_COL.gold); x.lineWidth = R * 0.07; x.lineCap = "round";
  x.beginPath(); x.moveTo(0, R * 0.25); x.quadraticCurveTo(R * 0.15, R * 0.9, -R * 0.1, R * 1.5); x.stroke();
  abaLeafShape(x, -R * 0.02, R * 1.05, R * 0.75, R * 0.12, 2.5, abaRGB(ABA_COL.gold, 0.95), null); abaLeafShape(x, R * 0.05, R * 0.8, R * 0.7, R * 0.11, 0.5, abaRGB(ABA_COL.gold, 0.95), null);
  for (let layer = 0; layer < 3; layer++) {
    const s = 1 - layer * 0.22, spread = 1.15 - layer * 0.2;
    x.save(); x.beginPath(); x.moveTo(0, R * 0.25);
    for (let k = 0; k <= 22; k++) { const an = -Math.PI / 2 - spread + spread * 2 * k / 22, rr = R * s * (k % 2 ? 0.92 : 1.0) * (0.94 + r() * 0.08); x.lineTo(Math.cos(an) * rr, R * 0.25 + Math.sin(an) * rr); }
    x.closePath(); x.clip();
    // satin stitch: long parallel threads radiating from the calyx, each catching the light a little differently
    for (let k = -60; k <= 60; k++) { const an = -Math.PI / 2 + k / 60 * spread * 1.05; x.strokeStyle = abaRGB(col, (0.8 + layer * 0.12) * (k % 2 ? 1.12 : 0.92) * (0.9 + 0.2 * Math.cos(an + 2.2)));
      x.lineWidth = 2.2; x.beginPath(); x.moveTo(0, R * 0.25); x.lineTo(Math.cos(an) * R * 1.1, R * 0.25 + Math.sin(an) * R * 1.1); x.stroke(); }
    x.restore();
  }
  x.fillStyle = abaRGB(ABA_COL.gold); x.beginPath(); x.moveTo(-R * 0.2, R * 0.12); x.lineTo(R * 0.2, R * 0.12); x.lineTo(R * 0.09, R * 0.42); x.lineTo(-R * 0.09, R * 0.42); x.closePath(); x.fill();
  x.strokeStyle = abaRGB(ABA_COL.goldD); x.lineWidth = 1.5; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(-R * 0.17 + k * R * 0.085, R * 0.14); x.lineTo(-R * 0.08 + k * R * 0.04, R * 0.4); x.stroke(); }
  x.restore();
}
function abaBordado() {
  const c = casaCv(ABA_W, ABA_H), x = c.getContext("2d"), r = seeded(515);
  abaSilk(x, ABA_COL.burg, 52);
  abaClip(x, 0.486, 0.942); x.save(); x.clip();
  for (let i = 0; i < 7; i++) { const an = -1.12 + i * 0.373, [px, py] = abaP(0.6, an); abaClavel(x, px, py, i === 3 ? 112 : 92, i % 2 ? ABA_COL.ivory : [176, 34, 44], an, r); }
  for (let i = 0; i < 6; i++) { const an = -0.93 + i * 0.373, [px, py] = abaP(0.87, an); abaClavel(x, px, py, 44, [176, 34, 44], an, r); }
  // a chain stitch in gold along the top and foot of the field
  x.strokeStyle = abaRGB(ABA_COL.gold); x.lineWidth = 2;
  for (const rad of [0.925, 0.505]) for (let an = -1.38; an < 1.38; an += 0.014) { const [px, py] = abaP(rad, an); x.beginPath(); x.ellipse(px, py, 5, 2.4, an, 0, TAU); x.stroke(); }
  x.restore();
  abaBorders(x, abaRGB(ABA_COL.ivory, 0.95));
  return { c };
}
function abaGrande() {
  const c = casaCv(ABA_W, ABA_H), x = c.getContext("2d"), r = seeded(808);
  abaSilk(x, ABA_COL.deep, 63);
  abaClip(x, 0.486, 0.942); x.save(); x.clip();
  // gilded arabesques: pairs of C-scrolls springing from a stem, with acanthus leaves
  const sc = (px, py, R, rot, dir) => { x.save(); x.translate(px, py); x.rotate(rot); x.strokeStyle = abaRGB(ABA_COL.gold, 1.05); x.lineCap = "round";
    for (let t = 0; t < 1; t += 0.02) { const a0 = dir * t * 5, a1 = dir * (t + 0.02) * 5, r0 = R * (1 - t * 0.8), r1 = R * (1 - (t + 0.02) * 0.8); x.lineWidth = 7 * (1 - t * 0.7);
      x.beginPath(); x.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); x.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); x.stroke(); }
    for (let k = 1; k < 5; k++) { const t = k * 0.16, an = dir * t * 5, rr = R * (1 - t * 0.8); abaGoldLeaf(x, Math.cos(an) * rr, Math.sin(an) * rr, R * 0.38 * (1 - t * 0.5), R * 0.1, an + dir * 1.9); }
    x.restore(); };
  // a gilt rinceau: a running stem that curls into a spiral at every crest, leaves along it, rosettes between
  const stem = an => 0.69 + Math.sin(an * 7.3) * 0.08;
  x.strokeStyle = abaRGB(ABA_COL.gold, 1.05); x.lineCap = "round"; x.lineWidth = 7; x.beginPath();
  for (let an = -1.38; an <= 1.38; an += 0.004) { const [px, py] = abaP(stem(an), an); an === -1.38 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke();
  for (let k = -3; k <= 3; k++) { const ac = (k + 0.25) * Math.PI / 7.3 * 2 / 2 * 2 / 2, crest = (Math.PI / 2 + k * Math.PI) / 7.3, up = k % 2 === 0;
    const [cx0, cy0] = abaP(stem(crest) + (up ? 0.075 : -0.075), crest);
    x.lineWidth = 6; x.beginPath();
    for (let t = 0; t <= 1; t += 0.01) { const an2 = (up ? -1 : 1) * t * 4.6 + (up ? Math.PI / 2 : -Math.PI / 2) + crest, rr = 75 * (1 - t * 0.78);
      const px = cx0 + Math.cos(an2) * rr, py = cy0 + Math.sin(an2) * rr; t === 0 ? x.moveTo(px, py) : x.lineTo(px, py); x.lineWidth = 6 * (1 - t * 0.6); } x.stroke();
    x.fillStyle = abaRGB(ABA_COL.gold); x.beginPath(); x.arc(cx0, cy0, 10, 0, TAU); x.fill();
    const tr = crest + Math.PI / 7.3, [rx, ry] = abaP(stem(tr), tr);
    for (let q = 0; q < 6; q++) { const an3 = q / 6 * TAU; x.fillStyle = abaRGB(ABA_COL.gold, 1.08); x.beginPath(); x.ellipse(rx + Math.cos(an3) * 16, ry + Math.sin(an3) * 16, 13, 7, an3, 0, TAU); x.fill(); }
    x.fillStyle = abaRGB(ABA_COL.deep, 0.8); x.beginPath(); x.arc(rx, ry, 6, 0, TAU); x.fill(); }
  for (let an = -1.32; an <= 1.32; an += 0.065) { const [px, py] = abaP(stem(an), an), d = Math.cos(an * 7.3); abaGoldLeaf(x, px, py, 40, 12, an + (Math.floor(an / 0.065) % 2 ? -0.6 : -2.5) + d * 0.3); }
  // a gilt lace border (puntilla) under the top edge: little arches and dots
  x.strokeStyle = abaRGB(ABA_COL.gold, 1.05); x.lineWidth = 3;
  for (let an = -1.38; an < 1.38; an += 0.04) { x.beginPath(); const [ax, ay] = abaP(0.9, an), [bx, by] = abaP(0.9, an + 0.04), [cx2, cy2] = abaP(0.935, an + 0.02); x.moveTo(ax, ay); x.quadraticCurveTo(cx2, cy2, bx, by); x.stroke();
    const [dx, dy] = abaP(0.918, an + 0.02); x.fillStyle = abaRGB(ABA_COL.gold); x.beginPath(); x.arc(dx, dy, 3, 0, TAU); x.fill(); }
  // the cartouche: an ivory oval framed in gilt, with a painted rose
  const [cx, cy] = abaP(0.7, 0); x.save(); x.translate(cx, cy);
  x.fillStyle = abaRGB(ABA_COL.gold); x.beginPath(); x.ellipse(0, 0, 150, 118, 0, 0, TAU); x.fill();
  x.fillStyle = abaRGB(ABA_COL.goldD); x.beginPath(); x.ellipse(0, 0, 140, 108, 0, 0, TAU); x.fill();
  x.fillStyle = abaRGB(ABA_COL.ivory); x.beginPath(); x.ellipse(0, 0, 132, 100, 0, 0, TAU); x.fill(); x.restore();
  for (let k = 0; k < 7; k++) abaLeafShape(x, cx + (r() - 0.5) * 120, cy + (r() - 0.5) * 70, 50 + r() * 30, 15, r() * TAU, abaRGB([88, 92, 60], 0.9), abaRGB([50, 54, 30]));
  abaRose(x, cx - 30, cy, 54, ABA_COL.deep, 0.2, r); abaRose(x, cx + 50, cy + 20, 36, ABA_COL.burg, 1, r);
  x.restore();
  abaBorders(x, abaRGB(ABA_COL.ivory, 0.95));
  return { c };
}

// the sticks: carved and pierced where they show below the leaf, a slender blade behind it; guards whole and inlaid
function abaStick(wood, guard) {
  const w = 96, h = 1024, c = casaCv(w, h), x = c.getContext("2d"), a = casaCv(w, h), y = a.getContext("2d"), r = seeded(guard ? 9 : 5);
  const Y = v => h - v * h;                                   // v: 0 at the pivot end, 1 at the tip
  x.fillStyle = abaRGB(wood); x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const x0 = r() * w; x.strokeStyle = abaRGB(wood, r() < 0.5 ? 0.78 : 1.15, 0.5); x.lineWidth = 0.6 + r() * 1.4; x.beginPath();
    for (let v = 0; v <= 1; v += 0.02) { const px = x0 + Math.sin(v * 9 + i) * 3; v ? x.lineTo(px, Y(v)) : x.moveTo(px, Y(v)); } x.stroke(); }
  y.fillStyle = "#000"; y.fillRect(0, 0, w, h); y.fillStyle = "#fff";
  const half = v => guard ? (v < 0.04 ? 0.42 : 0.47 - v * 0.08) : v < 0.46 ? 0.45 - Math.abs(v - 0.25) * 0.12 : Math.max(0.12, 0.28 - (v - 0.46) * 0.3);
  y.beginPath(); y.moveTo(w / 2 - half(0.03) * w, Y(0.03));
  for (let v = 0.03; v <= 0.985; v += 0.005) y.lineTo(w / 2 - half(v) * w, Y(v));
  for (let v = 0.985; v >= 0.03; v -= 0.005) y.lineTo(w / 2 + half(v) * w, Y(v));
  y.closePath(); y.fill(); y.beginPath(); y.arc(w / 2, Y(0.03), w * 0.42, 0, TAU); y.fill();
  const hole = (px, py, rx, ry) => { y.fillStyle = "#000"; y.beginPath(); y.ellipse(px, py, rx, ry, 0, 0, TAU); y.fill();
    x.strokeStyle = abaRGB(wood, 0.45); x.lineWidth = 4; x.beginPath(); x.ellipse(px, py, rx + 2, ry + 2, 0, 0, TAU); x.stroke(); };
  y.fillStyle = "#000"; y.beginPath(); y.arc(w / 2, Y(0.03), w * 0.09, 0, TAU); y.fill();     // the rivet hole
  if (!guard) {
    // fretwork: a lozenge between pairs of round piercings, repeated up the stick
    for (let v = 0.1; v < 0.42; v += 0.085) { hole(w / 2, Y(v), w * 0.13, h * 0.026); hole(w * 0.27, Y(v + 0.042), w * 0.07, w * 0.07); hole(w * 0.73, Y(v + 0.042), w * 0.07, w * 0.07); }
    x.strokeStyle = abaRGB(ABA_COL.gold, 0.95); x.lineWidth = 2;
    for (const s of [-1, 1]) { x.beginPath(); for (let v = 0.06; v < 0.44; v += 0.005) { const px = w / 2 + s * (half(v) - 0.07) * w; v === 0.06 ? x.moveTo(px, Y(v)) : x.lineTo(px, Y(v)); } x.stroke(); }
  } else {
    // the guard: a carved vine inlaid with gold running its whole length
    x.strokeStyle = abaRGB(wood, 0.5); x.lineWidth = 5; x.beginPath(); for (let v = 0.06; v < 0.97; v += 0.004) { const px = w / 2 + Math.sin(v * 40) * w * 0.18; v === 0.06 ? x.moveTo(px, Y(v)) : x.lineTo(px, Y(v)); } x.stroke();
    x.strokeStyle = abaRGB(ABA_COL.gold, 1.05); x.lineWidth = 2.5; x.stroke();
    for (let v = 0.08; v < 0.95; v += 0.0785) { abaGoldLeaf(x, w / 2 + Math.sin(v * 40) * w * 0.18, Y(v), w * 0.28, w * 0.07, Math.cos(v * 40) > 0 ? 0.4 : 2.7); }
    for (const s of [-1, 1]) { x.strokeStyle = abaRGB(ABA_COL.gold, 0.9); x.lineWidth = 2; x.beginPath(); x.moveTo(w / 2 + s * 0.4 * w, Y(0.07)); x.lineTo(w / 2 + s * 0.37 * w, Y(0.96)); x.stroke(); }
  }
  return { c, a };
}

function abaWall() {
  const w = 1024, h = 1024, c = casaCv(w, h), x = c.getContext("2d"), r = seeded(19);
  x.fillStyle = "#E3D8C5"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const g = x.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 60 + r() * 220); g.addColorStop(0, r() < 0.5 ? "rgba(140,115,85,0.05)" : "rgba(255,248,236,0.06)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "120,100,80" : "255,250,240"},${0.04 + r() * 0.05})`; x.fillRect(r() * w, r() * h, 1, 1); }
  const v = x.createRadialGradient(w / 2, h * 0.45, w * 0.2, w / 2, h * 0.5, w * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,40,25,0.18)"); x.fillStyle = v; x.fillRect(0, 0, w, h);
  return c;
}

// the three fans: pivot (x, y), resting direction (radians, positive leans left), size, widest opening, resting openness
const ABA_FANS = [
  { leaf: "encaje", wood: "dark", x: -0.74, y: -0.25, dir: 0.75, R: 0.36, M: 2.5, rest: 0.68, z: 0.035 },
  { leaf: "grande", wood: "dark", x: 0, y: -0.3, dir: 0, R: 0.56, M: 2.75, rest: 0.62, z: 0 },
  { leaf: "encaje", wood: "dark", x: 0.74, y: -0.25, dir: -0.75, R: 0.36, M: 2.5, rest: 0.68, z: 0.035 }
];
const ABA_SWAY = 0.07;                    // the most any fan may tilt away from its resting direction
// the furthest any fan can reach: its whole arc at the widest opening and tilt, and the sticks' ends at the pivot
function abaBounds() {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const add = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const F of ABA_FANS) {
    const lo = -F.dir - F.M / 2 - ABA_SWAY, hi = -F.dir + F.M / 2 + ABA_SWAY;
    for (let k = 0; k <= 60; k++) { const p = lo + (hi - lo) * k / 60; add(F.x + Math.sin(p) * F.R * 1.02, F.y + Math.cos(p) * F.R * 1.02); }
    for (let k = 0; k < 16; k++) { const p = k / 16 * TAU; add(F.x + Math.cos(p) * F.R * 0.07, F.y + Math.sin(p) * F.R * 0.07); }
  }
  return { x0, x1, y0, y1 };
}
function abaBuild() {
  const T = THREE, scene = new T.Scene();
  const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
  const aniso = r.capabilities.getMaxAnisotropy(), lc = h => new T.Color(h).convertSRGBToLinear();
  const tex = (cv, srgb) => { const t = new T.CanvasTexture(cv); t.anisotropy = aniso; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  scene.background = lc(0xE3D8C5);
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ color: 0x8a7a66, side: T.BackSide })));
  const sb = new T.Mesh(new T.PlaneGeometry(8, 5), new T.MeshBasicMaterial({ color: 0xfff1de, side: T.DoubleSide })); sb.position.set(-6, 7, 8); sb.lookAt(0, 0, 0); env.add(sb);
  scene.environment = new T.PMREMGenerator(r).fromScene(env, 0.04).texture;
  // the wall the fans are mounted before
  const wall = new T.Mesh(new T.PlaneGeometry(4, 2.8), new T.MeshStandardMaterial({ map: tex(abaWall(), true), roughness: 0.95, envMapIntensity: 0.2 }));
  wall.position.set(0, 0, -0.07); wall.receiveShadow = true; scene.add(wall); ABA.wall = wall;
  const key = new T.DirectionalLight(0xfff0dc, 1.9); key.position.set(-1.3, 1.7, 2.4); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.1, right: 1.1, top: 0.9, bottom: -0.9, near: 0.5, far: 6 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.004; key.shadow.radius = 5;
  scene.add(key, key.target, new T.HemisphereLight(0xfff4e6, 0xb8a58a, 0.45));
  const fill = new T.DirectionalLight(0xffe2c0, 0.25); fill.position.set(1.5, -0.4, 2); scene.add(fill);
  // materials
  const leafMat = (L, alpha) => { const m = new T.MeshStandardMaterial({ map: tex(L.c, true), roughness: 0.82, side: T.DoubleSide, envMapIntensity: 0.4 });
    if (alpha) Object.assign(m, { alphaMap: tex(L.a), alphaTest: 0.5, alphaToCoverage: true }); return m; };
  const leaves = { pintado: leafMat(abaPintado()), encaje: leafMat(abaEncaje(), true), bordado: leafMat(abaBordado()), grande: leafMat(abaGrande()) };
  const stickMat = (wood, guard) => { const s = abaStick(wood, guard); return new T.MeshStandardMaterial({ map: tex(s.c, true), alphaMap: tex(s.a), alphaTest: 0.5, alphaToCoverage: true, roughness: 0.55, side: T.DoubleSide, envMapIntensity: 0.6 }); };
  const woods = { light: [196, 160, 112], dark: [86, 52, 34], red: [104, 40, 30] };
  const sticks = {}; for (const k in woods) sticks[k] = [stickMat(woods[k], false), stickMat(woods[k], true)];
  const gilt = new T.MeshStandardMaterial({ color: lc(0xb8975a), metalness: 1, roughness: 0.42, envMapIntensity: 0.9 });
  const { NR, FR, SPAN, R1 } = ABA, FC = (NR - 1) * 2;
  const fans = ABA_FANS.map((F, i) => { const { leaf, wood } = F;
    const grp = new T.Group(), R = 1;
    const pos = new Float32Array((FC + 1) * FR * 3), uv = new Float32Array((FC + 1) * FR * 2), ind = [];
    for (let j = 0; j < FR; j++) for (let c = 0; c <= FC; c++) { const k = j * (FC + 1) + c, rad = 0.44 + 0.555 * j / (FR - 1), a = -SPAN / 2 + SPAN * c / FC, [px, py] = abaP(rad, a); uv[k * 2] = px / ABA_W; uv[k * 2 + 1] = 1 - py / ABA_H; }
    for (let j = 0; j < FR - 1; j++) for (let c = 0; c < FC; c++) { const a = j * (FC + 1) + c, b = a + 1, d = a + FC + 1, e = d + 1; ind.push(a, b, d, b, e, d); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.BufferAttribute(uv, 2)); geo.setIndex(ind);
    const leafM = new T.Mesh(geo, leaves[leaf]); leafM.castShadow = leafM.receiveShadow = true; grp.add(leafM);
    const ribs = [];
    for (let k = 0; k < NR; k++) { const guard = k === 0 || k === NR - 1, L = 0.985, wd = 0.085;
      const g2 = new T.PlaneGeometry(wd, L); g2.translate(0, L / 2 - 0.03 * L, 0);
      const m = new T.Mesh(g2, sticks[wood][guard ? 1 : 0]); m.castShadow = m.receiveShadow = true; grp.add(m); ribs.push(m); }
    const rivet = new T.Mesh(new T.CylinderGeometry(0.026, 0.026, 0.03, 24), gilt); rivet.rotation.x = Math.PI / 2; rivet.castShadow = true; grp.add(rivet);
    scene.add(grp);
    // each fan stays on its own anchor: position, size and depth are set once and never animated
    grp.position.set(F.x, F.y, F.z); grp.scale.setScalar(F.R); grp.rotation.set(0, 0, F.dir);
    return { F, grp, geo, ribs, rivet, o: { x: F.rest * F.M, v: 0 }, fl: 0, sw: { x: 0, v: 0 } };
  });
  const bb = abaBounds();
  Object.assign(key.shadow.camera, { left: bb.x0 - 0.3, right: bb.x1 + 0.3, top: bb.y1 + 0.3, bottom: bb.y0 - 0.3 }); key.shadow.camera.updateProjectionMatrix();
  const cam = new T.PerspectiveCamera(24, 1.45, 0.1, 20);
  Object.assign(ABA, { r, scene, cam, fans, FC, bb, ready: true });
  abaFrame(1.45);
}
function abaShape(f) {
  const { NR, FR, SPAN } = ABA, FC = ABA.FC, A = Math.max(0.05, Math.min(SPAN, f.o.x));
  const pos = f.geo.attributes.position.array, full = SPAN / FC * 1.12, half = A / FC, dep = Math.sqrt(Math.max(0, full * full - half * half)) * 0.5;
  for (let j = 0; j < FR; j++) { const rad = 0.44 + 0.555 * j / (FR - 1);
    for (let c = 0; c <= FC; c++) { const a = -A / 2 + A * c / FC, k = (j * (FC + 1) + c) * 3, z = c % 2 ? (c % 4 === 1 ? 1 : -1) * rad * dep : 0;
      pos[k] = Math.sin(a) * rad; pos[k + 1] = Math.cos(a) * rad; pos[k + 2] = z; } }
  f.geo.attributes.position.needsUpdate = true; f.geo.computeVertexNormals();
  // the sticks lie under the leaf, each a hair behind the last; the guards close over the front and the back
  f.ribs.forEach((m, k) => { const a = -A / 2 + A * k / (NR - 1); m.rotation.set(0, 0, -a);
    m.position.z = k === NR - 1 ? dep + 0.012 : k === 0 ? -dep - 0.012 : -0.008 - k * 0.0012; });
  f.rivet.position.z = 0;
}
// frame the camera on the measured reach of the fans, centred, with a margin of wall all round
function abaFrame(aspect) {
  const { bb, cam } = ABA, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  const hw = (bb.x1 - bb.x0) / 2 * 1.16, hh = (bb.y1 - bb.y0) / 2 * 1.2, tn = Math.tan(cam.fov / 2 * Math.PI / 180);
  const d = Math.max(hh / tn, hw / (tn * aspect)) + 0.05;          // + the fans' own depth in front of the wall
  cam.aspect = aspect; cam.position.set(cx, cy, d); cam.lookAt(cx, cy, 0); cam.updateProjectionMatrix();
  // the wall always fills the view, however tall or wide the window is
  const vh = 2 * (d + 0.07) * tn, vw = vh * aspect;
  ABA.wall.position.set(cx, cy, -0.07); ABA.wall.scale.setScalar(Math.max(1, vw / 4 * 1.08, vh / 2.8 * 1.08));
}
function abaReset() {
  Object.assign(aba, { E: 0, ph: 0, n: 0, queue: [], lastStrong: -9 });
  ABA.fans.forEach(f => { f.o.x = f.F.rest * f.F.M; f.o.v = 0; f.fl = 0; f.sw.x = f.sw.v = 0; });
}
function flamencoScene(t, dt, box) {
  if (typeof THREE === "undefined") return;
  if (!ABA.ready) abaBuild();
  if (t - aba.lastT > 1.5) abaReset();
  aba.lastT = t; aba.now = t;
  const h = box.h, w = Math.min(box.w, h * 1.45), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const k = Math.min(DPR, Math.sqrt(8e6 / (w * h))), pw = Math.round(w * k), ph = Math.round(h * k);
  if (ABA.pw !== pw || ABA.ph !== ph) { ABA.pw = pw; ABA.ph = ph; ABA.r.setSize(pw, ph, false); abaFrame(pw / ph); }
  dt = Math.min(dt, 1 / 20);
  const energy = Math.min(1, S.bass * 0.45 + S.mid * 0.45 + S.high * 0.2);
  aba.E += (energy - aba.E) * Math.min(1, dt * 1.4);
  aba.ph = (aba.ph + dt * (0.1 + aba.E * 0.6)) % 1000;
  aba.queue = aba.queue.filter(q => { if (t >= q.at) { const f = ABA.fans[q.i]; f.fl = Math.min(0.6, Math.max(f.fl, q.amt)); f.sw.v += q.tilt; return false; } return true; });
  ABA.fans.forEach((f, i) => {
    const F = f.F;
    f.fl *= Math.exp(-dt * 1.1);
    // how open: a calm rest, wider with louder music, a slow breath, and the flick of the beats; always within its limits
    const q = Math.max(0.3, Math.min(1, F.rest + 0.22 * aba.E + 0.03 * (0.3 + aba.E) * Math.sin(aba.ph * 1.2 + i * 2.1) + f.fl));
    f.o.v += ((q * F.M - f.o.x) * 45 - f.o.v * 9.5) * dt; f.o.x += f.o.v * dt;        // a slight overshoot: the snap of a fan flicked open
    if (f.o.x > F.M) { f.o.x = F.M; f.o.v = Math.min(0, f.o.v); } if (f.o.x < 0.12) { f.o.x = 0.12; f.o.v = Math.max(0, f.o.v); }
    // a small tilt with the music that always springs back to the fan's own resting angle
    f.sw.v += ((0.03 * aba.E * Math.sin(aba.ph * 0.7 + i * 1.9) - f.sw.x) * 12 - f.sw.v * 5.5) * dt; f.sw.x += f.sw.v * dt;
    if (Math.abs(f.sw.x) > ABA_SWAY) { f.sw.x = Math.sign(f.sw.x) * ABA_SWAY; f.sw.v = 0; }
    abaShape(f);
    f.grp.rotation.z = F.dir + f.sw.x;
  });
  ABA.r.render(ABA.scene, ABA.cam);
  g.drawImage(ABA.r.domElement, x0, y0, w, h);
}
function flamencoBeat() {
  if (!ABA.ready) return;
  const s = Math.min(1, 0.15 + S.bass * 0.9 + S.pulse * 0.2), t = aba.now;
  aba.n++;
  // the beats go round the three fans like the compás: left, centre, right, centre
  const i = [0, 1, 2, 1][aba.n % 4], side = i === 0 ? 1 : i === 2 ? -1 : (aba.n % 8 < 4 ? 1 : -1);
  aba.queue.push({ i, at: t, amt: 0.18 + 0.32 * s, tilt: side * (0.15 + 0.25 * s) });
  // a strong beat opens all three to their fullest, the centre first
  if (s > 0.7 && t - aba.lastStrong > 1.5) { aba.lastStrong = t; [1, 0, 2].forEach((j, k) => aba.queue.push({ i: j, at: t + k * 0.06, amt: 0.6, tilt: 0 })); }
}
