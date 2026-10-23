// ================================================================
// ROOM 3, pieces i and ii — each in its own historical medium.
//   i   a page of a French Book of Hours, about 1420: vellum, iron-gall ink, mineral pigments, burnished gold
//   ii  a carved and gilded Baroque panel: acanthus scrolls, festoons and a silk-lined cartouche on stucco
// ================================================================

// ----------------------------------------------------------------
// 3i  THE ILLUMINATED PAGE. A leaf from a French Book of Hours of about 1420, opening Psalm 95,
// "Cantate domino canticum novum" (sing to the Lord a new song): a miniature of the enclosed garden
// with its fountain on a tooled gold ground, a painted initial C, a line of chant on a red staff,
// textura script in iron-gall ink, and an ivy border of hairline stems and burnished gold leaves.
// The page is drawn once, by hand-like vector strokes with small irregularities, into two layers:
// the pigments, and a map of where the gold lies and how high its gesso is raised. A shader then
// lights the page: matte vellum and pigments, and burnished gold that mirrors a moving light.
// The music moves only the light: the melody lifts it, swells brighten it, notes make leaves glint.
// ----------------------------------------------------------------
const manu = { key: "", alb: null, mat: null, tA: null, tM: null, lx: 0.3, ly: 0.7, li: 1, tw: 0, rect: null };
const MC = { vellum: "#EEE3CA", ink: "#2A1E17", red: "#B8402C", blue: "#2F4E8E", blueD: "#1C2F5C", rose: "#C26C78", roseD: "#8A3646",
  green: "#4F7746", greenD: "#2E4E31", ochre: "#CFA84A", white: "#F5F0E4", gold: "#C49A44", brown: "#7A5634", stone: "#C9C3B3" };

// a broad nib held at 40°, so verticals are thick and hairlines thin, as in textura
const NIB = { a: 40 * Math.PI / 180 };
function nibPath(c, pts, w) {
  const nx = Math.cos(NIB.a) * w / 2, ny = -Math.sin(NIB.a) * w / 2;
  c.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const Q = [[x0 - nx, y0 - ny], [x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny]];
    if ((x1 - x0) * ny - (y1 - y0) * nx < 0) Q.reverse();                       // keep every quad wound the same way so overlaps never cancel
    c.moveTo(...Q[0]); c.lineTo(...Q[1]); c.lineTo(...Q[2]); c.lineTo(...Q[3]); c.closePath();
  }
  c.fill("nonzero");
}
// textura letters, x-height 1, y up; each is a list of pen strokes
const TEXTURA = (() => {
  const M = (x, top = 1, bot = 0) => [[x - 0.1, top - 0.08], [x, top], [x, bot + 0.06], [x + 0.1, bot - 0.02]];
  const bowlR = [[0.42, 0.94], [0.3, 1], [0.12, 1], [0, 0.88], [0, 0.12], [0.12, 0], [0.42, 0.06]];
  const G = {
    a: [[[0.06, 0.88], [0.18, 1], [0.42, 1], [0.42, 0.06], [0.52, -0.02]], [[0.42, 0.55], [0.12, 0.5], [0, 0.38], [0, 0.12], [0.12, 0], [0.42, 0.1]]],
    b: [[[-0.1, 1.55], [0, 1.65], [0, 0.05]], [[0, 0.88], [0.12, 1], [0.42, 0.94], [0.42, 0.1], [0.3, 0], [0, 0.05]]],
    c: [[[0.38, 0.92], [0.3, 1], [0.12, 1], [0, 0.88], [0, 0.12], [0.12, 0], [0.38, 0.06]]],
    d: [[[0.42, 0.2], [0.42, 1.0], [0.12, 1.6]], [[0.42, 0.94], [0.3, 1], [0.12, 1], [0, 0.88], [0, 0.12], [0.12, 0], [0.42, 0.06], [0.52, -0.02]]],
    e: [[[0.38, 0.92], [0.3, 1], [0.12, 1], [0, 0.88], [0, 0.12], [0.12, 0], [0.38, 0.06]], [[0.02, 0.52], [0.38, 0.7], [0.38, 0.9]]],
    g: [[[0.42, 1], [0.42, -0.4], [0.3, -0.55], [0.05, -0.5]], bowlR],
    i: [M(0), [[0.0, 1.22], [0.1, 1.34]]],
    l: [[[-0.1, 1.55], [0, 1.65], [0, 0.1], [0.12, 0], [0.2, 0.04]]],
    m: [M(0), [[0, 0.88], [0.12, 1], [0.4, 1], [0.4, 0.06], [0.5, -0.02]], [[0.4, 0.88], [0.52, 1], [0.8, 1], [0.8, 0.06], [0.9, -0.02]]],
    n: [M(0), [[0, 0.88], [0.12, 1], [0.42, 1], [0.42, 0.06], [0.52, -0.02]]],
    o: [[[0.12, 1], [0, 0.88], [0, 0.12], [0.12, 0], [0.3, 0], [0.42, 0.12], [0.42, 0.88], [0.3, 1], [0.12, 1]]],
    p: [[[-0.1, 0.92], [0, 1], [0, -0.62]], [[0, 0.88], [0.12, 1], [0.42, 0.94], [0.42, 0.1], [0.3, 0], [0, 0.05]], [[-0.12, -0.62], [0.12, -0.62]]],
    q: [[[0.42, 1], [0.42, -0.62]], bowlR, [[0.3, -0.62], [0.54, -0.62]]],
    r: [M(0), [[0, 0.85], [0.15, 1], [0.36, 0.98]]],
    s: [[[0, -0.02], [0, 1.4], [0.12, 1.62], [0.38, 1.55]], [[-0.16, 1], [0, 1]]],                 // long s, inside a word: the nub only on the left
    f: [[[0, -0.02], [0, 1.4], [0.12, 1.62], [0.38, 1.55]], [[-0.16, 1], [0.3, 1]]],
    z: [[[0.44, 0.9], [0.32, 1], [0.1, 0.98], [0.02, 0.78], [0.44, 0.28], [0.4, 0.04], [0.18, 0], [0, 0.1]]],  // round s, at a word's end
    t: [[[0, 1.3], [0, 0.1], [0.12, 0], [0.3, 0.04]], [[-0.12, 1], [0.3, 1]]],
    u: [[[-0.1, 0.92], [0, 1], [0, 0.1], [0.12, 0], [0.42, 0.02]], M(0.42)],
    v: [[[-0.1, 0.92], [0, 1], [0, 0.35], [0.22, 0], [0.42, 0.3], [0.42, 1], [0.52, 1.04]]],
    "·": [[[0.02, 0.2], [0.12, 0.3]]], ":": [[[0.0, 0.62], [0.1, 0.7]], [[0.0, 0.08], [0.1, 0.16]]]
  };
  const adv = { f: 0.5, a: 0.72, b: 0.72, c: 0.6, d: 0.72, e: 0.62, g: 0.72, i: 0.4, l: 0.42, m: 1.1, n: 0.72, o: 0.72, p: 0.72, q: 0.72, r: 0.5, s: 0.44, z: 0.56, t: 0.5, u: 0.72, v: 0.72, "·": 0.3, ":": 0.3 };
  return { G, adv };
})();
function texturaWord(c, word, x, y, em, r) {
  // long s inside words, round s at the end; j and y as i
  let wd = word.replace(/j|y/g, "i");
  wd = wd.replace(/s(?=[a-z])/g, "s").replace(/s$/, "z");
  for (const ch of wd) {
    const gl = TEXTURA.G[ch]; if (!gl) { x += em * 0.5; continue; }
    const jy = (r() - 0.5) * em * 0.05, sl = (r() - 0.5) * 0.04;     // a scribe's hand: baselines and slant drift a hair
    for (const st of gl) nibPath(c, st.map(([u, v]) => [x + (u + v * sl) * em, y + jy - v * em]), em * 0.27);
    x += (TEXTURA.adv[ch] + 0.1) * em;
  }
  return x;
}
function texturaWidth(word, em) { let w = 0; for (const ch of word.replace(/s$/, "z")) w += ((TEXTURA.adv[ch] || 0.5) + 0.1) * em; return w; }

// an ivy leaf: three pointed lobes on a short stalk
function ivyPath(c, x, y, s, a) {
  const P = (r, t) => [x + Math.cos(a + t) * r * s, y + Math.sin(a + t) * r * s];
  const tips = [[1, 0], [0.78, 1.15], [0.78, -1.15]], notch = [[0.48, 0.55], [0.48, -0.55]];
  c.beginPath(); c.moveTo(...P(0.18, Math.PI));
  c.quadraticCurveTo(...P(0.55, 1.9), ...P(...tips[1].slice(0, 1), tips[1][1]));
  c.quadraticCurveTo(...P(notch[0][0], notch[0][1]), ...P(tips[0][0], 0));
  c.quadraticCurveTo(...P(notch[1][0], notch[1][1]), ...P(tips[2][0], tips[2][1]));
  c.quadraticCurveTo(...P(0.55, -1.9), ...P(0.18, Math.PI));
  c.closePath();
}

// The page is drawn twice over: once in colour (alb), once as a gold map (mat: R gold, G gesso height, B leaf id).
function manuBuild(W, H, k) {
  const mk = () => { const cv = document.createElement("canvas"); cv.width = Math.round(W * k); cv.height = Math.round(H * k); const c = cv.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0); return [cv, c]; };
  const [aCv, A] = mk(), [gCv, Gm] = mk(), [hCv, Hm] = mk(), [tCv, Tm] = mk();   // colour; gold coverage + id; gesso; tooling dents
  const r = seeded(1420), J = (s = 1) => (r() - 0.5) * s;
  A.fillStyle = MC.vellum; A.fillRect(0, 0, W, H);
  Gm.fillStyle = "#000"; Gm.fillRect(0, 0, W, H); Hm.fillStyle = "#000"; Hm.fillRect(0, 0, W, H); Tm.fillStyle = "#000"; Tm.fillRect(0, 0, W, H);
  // gold: fill a path on every layer; raised gold also goes into the gesso layer
  let leafId = 0;
  const gild = (path, raised = 1, id = 0, self = false) => {
    const go = (c, col) => { c.fillStyle = col; path(c); if (!self) { c.fillStyle = col; c.fill(); } };
    go(A, MC.gold); go(Gm, `rgb(255,0,${id})`);
    if (raised) go(Hm, `rgb(${Math.round(255 * raised)},0,0)`);
  };
  const ink = (w = 0.5, col = MC.ink) => { A.strokeStyle = col; A.lineWidth = w; A.lineCap = "round"; A.lineJoin = "round"; A.stroke(); };
  const fill = col => { A.fillStyle = col; A.fill(); };
  const U = W / 100;                                         // one hundredth of the page width

  // ---- the layout: text block, miniature, margins as in a Book of Hours ----
  const tb = { x: W * 0.17, y: H * 0.085, w: W * 0.6, h: H * 0.735 };
  const mini = { x: tb.x, y: tb.y, w: tb.w, h: tb.h * 0.47 };
  const pitch = (tb.h - mini.h - U * 3) / 13, em = pitch * 0.42;   // 13 ruled lines below the miniature
  const line0 = mini.y + mini.h + U * 3 + pitch * 0.82;

  // ruling: faint drypoint/plummet lines, as the scribe pricked and ruled them
  A.strokeStyle = "rgba(150,110,90,0.18)"; A.lineWidth = 0.35;
  for (let i = 0; i < 13; i++) { const y = line0 + i * pitch; A.beginPath(); A.moveTo(tb.x - U * 1.5, y + J(0.3)); A.lineTo(tb.x + tb.w + U * 1.5, y + J(0.3)); A.stroke(); }
  A.beginPath(); for (const x of [tb.x - U * 0.6, tb.x + tb.w + U * 0.6]) { A.moveTo(x, tb.y - U * 2); A.lineTo(x, H * 0.95); } A.stroke();

  // ---- the frame of the miniature: gold fillet, blue and rose bands with white filigree ----
  const arch = (c, x, y, w, h, rise) => { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + rise); c.quadraticCurveTo(x + w / 2, y - rise, x + w, y + rise); c.lineTo(x + w, y + h); c.closePath(); };
  const F = U * 1.1, rise = mini.h * 0.22;
  arch(A, mini.x - F * 1.6, mini.y - F * 1.6, mini.w + F * 3.2, mini.h + F * 3.2, rise); fill(MC.blue);
  A.save(); arch(A, mini.x - F * 1.6, mini.y - F * 1.6, mini.w + F * 3.2, mini.h + F * 3.2, rise); A.clip();
  A.fillStyle = MC.rose; A.fillRect(mini.x - F * 2, mini.y + mini.h * 0.5, mini.w + F * 4, mini.h);   // rose below, blue above, as the painters split the bands
  A.restore();
  arch(A, mini.x - F * 1.6, mini.y - F * 1.6, mini.w + F * 3.2, mini.h + F * 3.2, rise); ink(0.6);
  // white filigree on the bands: a running zigzag with dots
  A.save(); arch(A, mini.x - F * 1.6, mini.y - F * 1.6, mini.w + F * 3.2, mini.h + F * 3.2, rise); arch(A, mini.x - F * 0.4, mini.y - F * 0.4, mini.w + F * 0.8, mini.h + F * 0.8, rise); A.clip("evenodd");
  A.strokeStyle = "rgba(246,240,226,0.9)"; A.lineWidth = 0.45; A.fillStyle = "rgba(246,240,226,0.9)";
  const per = 2 * (mini.w + mini.h) + F * 12, steps = Math.round(per / (F * 0.9));
  const around = s => { // a point on the band's centre line, s in [0,1)
    const P = 2 * (mini.w + mini.h), d = s * P, x0 = mini.x - F, y0 = mini.y - F, w = mini.w + 2 * F, h = mini.h + 2 * F;
    if (d < h) return [x0, y0 + h - d]; if (d < h + w) { const u = (d - h) / w; return [x0 + u * w, y0 + rise * (1 - 4 * u * (1 - u))]; }
    if (d < 2 * h + w) return [x0 + w, y0 + (d - h - w)]; return [x0 + w - (d - 2 * h - w) / w * w, y0 + h]; };
  for (let i = 0; i < steps; i++) {
    const [x, y] = around(i / steps), [x2, y2] = around((i + 0.5) / steps);
    A.beginPath(); A.moveTo(x, y); A.lineTo(x2 + (i % 2 ? 1 : -1) * F * 0.25, y2 + (i % 2 ? -1 : 1) * F * 0.25); A.stroke();
    A.beginPath(); A.arc(x, y, F * 0.1, 0, TAU); A.fill();
  }
  A.restore();
  // a raised gold fillet just inside the bands
  gild(c => { arch(c, mini.x - F * 0.4, mini.y - F * 0.4, mini.w + F * 0.8, mini.h + F * 0.8, rise); arch(c, mini.x, mini.y, mini.w, mini.h, rise); }, 0.8);
  // (the evenodd fill for the fillet)
  A.save(); arch(A, mini.x - F * 0.4, mini.y - F * 0.4, mini.w + F * 0.8, mini.h + F * 0.8, rise); arch(A, mini.x, mini.y, mini.w, mini.h, rise); A.fillStyle = MC.gold; A.fill("evenodd"); A.restore();
  for (const c of [Gm, Hm]) { c.save(); arch(c, mini.x, mini.y, mini.w, mini.h, rise); c.fillStyle = "#000"; c.fill(); c.restore(); }

  // ---- the miniature: the enclosed garden with the fountain of life ----
  A.save(); arch(A, mini.x, mini.y, mini.w, mini.h, rise); A.clip();
  const mx = mini.x, my = mini.y, mw = mini.w, mh = mini.h, hz = my + mh * 0.52;
  // burnished gold sky, tooled with a lozenge diaper and punched dots
  A.fillStyle = MC.gold; A.fillRect(mx, my - rise, mw, hz - my + rise + mh * 0.06);
  Gm.save(); arch(Gm, mx, my, mw, mh, rise); Gm.clip(); Gm.fillStyle = "rgb(255,0,0)"; Gm.fillRect(mx, my - rise, mw, hz - my + rise + mh * 0.06); Gm.restore();
  Hm.save(); arch(Hm, mx, my, mw, mh, rise); Hm.clip(); Hm.fillStyle = "rgb(90,0,0)"; Hm.fillRect(mx, my - rise, mw, hz - my + rise + mh * 0.06); Hm.restore();
  const dz = mw / 9;
  Tm.save(); arch(Tm, mx, my, mw, mh, rise); Tm.clip(); Tm.strokeStyle = "rgb(110,0,0)"; Tm.fillStyle = "rgb(200,0,0)"; Tm.lineWidth = 0.3;
  for (let i = -12; i < 22; i++) { Tm.beginPath(); Tm.moveTo(mx + i * dz, my - rise); Tm.lineTo(mx + i * dz + (hz - my + rise) , hz); Tm.stroke(); Tm.beginPath(); Tm.moveTo(mx + i * dz, my - rise); Tm.lineTo(mx + i * dz - (hz - my + rise), hz); Tm.stroke(); }
  for (let j = 0; j < 30; j++) for (let i = -2; i < 22; i++) {          // a punched dot in the middle of every lozenge, and a ring of four
    const x = mx + (i + (j % 2) * 0.5) * dz, y = my - rise + j * dz * 0.5 + dz * 0.25; if (y > hz) continue;
    Tm.beginPath(); Tm.arc(x + J(0.25), y + J(0.25), U * 0.32, 0, TAU); Tm.fill();
    for (let q = 0; q < 4; q++) { Tm.beginPath(); Tm.arc(x + Math.cos(q * Math.PI / 2) * dz * 0.17, y + Math.sin(q * Math.PI / 2) * dz * 0.17, U * 0.13, 0, TAU); Tm.fill(); }
  }
  Tm.restore();
  // the meadow
  A.beginPath(); A.moveTo(mx, hz + mh * 0.04); for (let i = 0; i <= 20; i++) A.lineTo(mx + mw * i / 20, hz + mh * 0.03 + Math.sin(i * 0.9) * mh * 0.006); A.lineTo(mx + mw, my + mh); A.lineTo(mx, my + mh); A.closePath();
  const mg = A.createLinearGradient(0, hz, 0, my + mh); mg.addColorStop(0, "#5C8048"); mg.addColorStop(1, "#3E6236"); A.fillStyle = mg; A.fill();
  for (const c of [Gm, Hm]) { c.save(); c.beginPath(); c.moveTo(mx, hz + mh * 0.04); for (let i = 0; i <= 20; i++) c.lineTo(mx + mw * i / 20, hz + mh * 0.03 + Math.sin(i * 0.9) * mh * 0.006); c.lineTo(mx + mw, my + mh); c.lineTo(mx, my + mh); c.closePath(); c.fillStyle = "#000"; c.fill(); c.restore(); }
  // distant rose hedge behind the wattle fence
  for (let i = 0; i < 160; i++) { const x = mx + r() * mw, y = hz + mh * 0.02 + r() * mh * 0.06, s = U * (0.9 + r() * 1.2);
    A.beginPath(); A.arc(x, y, s, 0, TAU); A.fillStyle = r() < 0.5 ? MC.greenD : "#3B5E37"; A.fill(); }
  for (let i = 0; i < 46; i++) { const x = mx + r() * mw, y = hz + mh * 0.015 + r() * mh * 0.06, s = U * (0.35 + r() * 0.25), white = r() < 0.4;
    A.beginPath(); A.arc(x, y, s, 0, TAU); A.fillStyle = white ? "#EDE6D8" : "#B33A3E"; A.fill(); A.beginPath(); A.arc(x, y, s * 0.4, 0, TAU); A.fillStyle = white ? MC.ochre : "#7E1F28"; A.fill(); }
  // the wattle fence: stakes and woven withies
  const fy0 = hz + mh * 0.07, fy1 = hz + mh * 0.17;
  A.fillStyle = "#8C6A44"; A.fillRect(mx, fy0, mw, fy1 - fy0);
  for (let i = 0; i <= 26; i++) { const x = mx + i * mw / 26; A.fillStyle = "#5E432A"; A.fillRect(x - U * 0.35, fy0 - U * 1.2, U * 0.7, fy1 - fy0 + U * 1.4); A.beginPath(); A.moveTo(x - U * 0.35, fy0 - U * 1.2); A.lineTo(x, fy0 - U * 1.9); A.lineTo(x + U * 0.35, fy0 - U * 1.2); A.fill(); }
  for (let row = 0; row < 5; row++) { const y = fy0 + (row + 0.5) * (fy1 - fy0) / 5;
    A.beginPath(); for (let i = 0; i <= 52; i++) { const x = mx + i * mw / 52; A.lineTo(x, y + Math.sin(i * Math.PI + row * Math.PI) * U * 0.35); }
    A.strokeStyle = "#B08A5C"; A.lineWidth = U * 0.55; A.stroke(); A.strokeStyle = "rgba(60,40,22,0.6)"; A.lineWidth = 0.4; A.stroke(); }
  // two trees, an orange and a pomegranate, in the manner of the Boucicaut workshop
  const tree = (tx, ty, R, fruit) => {
    A.fillStyle = "#5A3E26"; A.beginPath(); A.moveTo(tx - U * 0.8, fy1 + mh * 0.06); A.lineTo(tx - U * 0.45, ty + R * 0.4); A.lineTo(tx + U * 0.45, ty + R * 0.4); A.lineTo(tx + U * 0.8, fy1 + mh * 0.06); A.fill();
    A.strokeStyle = MC.ink; A.lineWidth = 0.4; A.stroke();
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.75; A.beginPath(); A.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.85, R * (0.3 + r() * 0.15), 0, TAU); A.fillStyle = i < 14 ? "#2C4A2E" : "#3B6236"; A.fill(); }
    for (let i = 0; i < 160; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; const x = tx + Math.cos(a) * d, y = ty + Math.sin(a) * d * 0.85;   // leaves picked out one by one in a lighter green
      A.save(); A.translate(x, y); A.rotate(r() * TAU); A.beginPath(); A.ellipse(0, 0, U * 0.45, U * 0.2, 0, 0, TAU); A.fillStyle = r() < 0.6 ? "#6B9156" : "#86A866"; A.fill(); A.restore(); }
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.8; A.beginPath(); A.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.85, U * 0.5, 0, TAU); A.fillStyle = fruit; A.fill(); A.strokeStyle = "rgba(60,30,10,0.7)"; A.lineWidth = 0.3; A.stroke();
      A.beginPath(); A.arc(tx + Math.cos(a) * d - U * 0.15, ty + Math.sin(a) * d * 0.85 - U * 0.15, U * 0.13, 0, TAU); A.fillStyle = "rgba(255,240,210,0.8)"; A.fill(); }
  };
  tree(mx + mw * 0.15, hz - mh * 0.12, mw * 0.13, "#D9822E"); tree(mx + mw * 0.85, hz - mh * 0.1, mw * 0.12, "#A8323A");
  // the fountain: an octagonal basin, a shaft with a gilt pinnacle, jets falling back
  const fx = mx + mw / 2, fb = my + mh * 0.86, bw = mw * 0.3, bh = mh * 0.11;
  const stoneG = (x0, x1) => { const gg = A.createLinearGradient(x0, 0, x1, 0); gg.addColorStop(0, "#9A9384"); gg.addColorStop(0.35, "#E4DFD2"); gg.addColorStop(0.7, "#C4BDAE"); gg.addColorStop(1, "#857E70"); return gg; };
  A.beginPath(); A.ellipse(fx, fb + bh * 0.45, bw * 0.62, bh * 0.28, 0, 0, TAU); A.fillStyle = "rgba(30,50,25,0.35)"; A.fill();
  A.beginPath(); A.moveTo(fx - bw / 2, fb - bh); A.lineTo(fx - bw / 2, fb); A.quadraticCurveTo(fx, fb + bh * 0.5, fx + bw / 2, fb); A.lineTo(fx + bw / 2, fb - bh); A.closePath(); A.fillStyle = stoneG(fx - bw / 2, fx + bw / 2); A.fill(); ink(0.5);
  for (const u of [-0.32, -0.12, 0.12, 0.32]) { A.beginPath(); A.moveTo(fx + u * bw, fb - bh); A.lineTo(fx + u * bw * 1.02, fb + bh * 0.22 * (1 - Math.abs(u) * 2)); A.strokeStyle = "rgba(70,62,50,0.55)"; A.lineWidth = 0.35; A.stroke(); }
  A.beginPath(); A.ellipse(fx, fb - bh, bw / 2, bh * 0.22, 0, 0, TAU); A.fillStyle = "#DCD6C8"; A.fill(); ink(0.5);
  A.beginPath(); A.ellipse(fx, fb - bh, bw / 2 * 0.86, bh * 0.16, 0, 0, TAU); const wg = A.createLinearGradient(0, fb - bh * 1.2, 0, fb - bh * 0.8); wg.addColorStop(0, "#5E7FB6"); wg.addColorStop(1, "#2F4E8E"); A.fillStyle = wg; A.fill();
  const sh = mh * 0.3, sw = bw * 0.09;
  A.beginPath(); A.rect(fx - sw / 2, fb - bh - sh, sw, sh); A.fillStyle = stoneG(fx - sw / 2, fx + sw / 2); A.fill(); ink(0.45);
  A.beginPath(); A.ellipse(fx, fb - bh - sh * 0.62, bw * 0.2, bh * 0.08, 0, 0, TAU); A.fillStyle = "#D8D2C4"; A.fill(); ink(0.45);
  gild(c => { c.beginPath(); c.moveTo(fx - sw * 0.9, fb - bh - sh); c.lineTo(fx + sw * 0.9, fb - bh - sh); c.lineTo(fx + sw * 0.25, fb - bh - sh - mh * 0.12); c.lineTo(fx, fb - bh - sh - mh * 0.16); c.lineTo(fx - sw * 0.25, fb - bh - sh - mh * 0.12); c.closePath(); }, 0.9, 40);
  A.beginPath(); A.moveTo(fx - sw * 0.9, fb - bh - sh); A.lineTo(fx + sw * 0.9, fb - bh - sh); A.lineTo(fx + sw * 0.25, fb - bh - sh - mh * 0.12); A.lineTo(fx, fb - bh - sh - mh * 0.16); A.lineTo(fx - sw * 0.25, fb - bh - sh - mh * 0.12); A.closePath(); ink(0.45);
  for (let j = 0; j < 4; j++) for (const s of [-1, 1]) {   // four gilt spouts each side, water arcing down in lead white over blue
    const y0 = fb - bh - sh * (0.62 + (j % 2) * 0.25), x0 = fx + s * sw * 0.6, x1 = fx + s * bw * (0.24 + j * 0.05), y1 = fb - bh;
    A.beginPath(); A.moveTo(x0, y0); A.quadraticCurveTo(x0 + s * bw * 0.18, y0 - mh * 0.03, x1, y1); A.strokeStyle = "rgba(80,110,170,0.7)"; A.lineWidth = U * 0.4; A.stroke();
    A.strokeStyle = "rgba(246,244,238,0.9)"; A.lineWidth = 0.4; A.stroke();
  }
  // millefleurs: tiny flowers and blades scattered over the grass
  for (let i = 0; i < 160; i++) { const x = mx + r() * mw, y = fy1 + mh * 0.02 + r() * (my + mh - fy1); if (Math.abs(x - fx) < bw * 0.62 && y > fb - bh * 1.2 && y < fb + bh * 0.6) continue;
    A.strokeStyle = r() < 0.5 ? "#2E4E2C" : "#7FA061"; A.lineWidth = 0.4; A.beginPath(); A.moveTo(x, y); A.lineTo(x + J(1.2), y - U * (0.6 + r() * 0.8)); A.stroke();
    if (r() < 0.3) { const col = pick3(r, ["#F1ECE0", "#C0404A", "#5C79B8", "#E3C25A"]); for (let p = 0; p < 5; p++) { A.beginPath(); A.arc(x + Math.cos(p * 1.257) * U * 0.28, y - U * 0.9 + Math.sin(p * 1.257) * U * 0.28, U * 0.2, 0, TAU); A.fillStyle = col; A.fill(); } } }
  A.restore();
  arch(A, mini.x, mini.y, mini.w, mini.h, rise); ink(0.6);

  // ---- the text: rubric, painted initial C, a line of chant, then the psalm ----
  const words = "antate domino canticum novum: cantate domino omnis terra· cantate domino et benedicite nomini eius: annunciate de die in diem salutare eius· annunciate inter gentes gloriam eius: in omnibus populis mirabilia eius· quoniam magnus dominus et laudabilis nimis: terribilis est super omnes deos· quoniam omnes dii gentium demonia: dominus autem celos fecit· gloria patri et filio et spiritui sancto· sicut erat in principio et nunc et semper et in secula seculorum amen".split(" ");
  const L = i => line0 + i * pitch;                               // the baseline of ruled line i
  // rubric in red on the first line
  A.fillStyle = MC.red; let x = tb.x; for (const wd of ["psalmus", "david", "ad", "vesperas"]) x = texturaWord(A, wd, x, L(0), em, r) + em * 0.55;
  // the initial C: three lines high, lapis on a raised, burnished, tooled gold square
  const ci = { x: tb.x, y: L(1) - pitch * 0.82, s: pitch * 3 - U * 0.4 };
  gild(c => { c.beginPath(); c.rect(ci.x, ci.y, ci.s, ci.s); }, 1, 0);
  A.beginPath(); A.rect(ci.x, ci.y, ci.s, ci.s); ink(0.55);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 14; j++) { const u = (j + 0.5) / 14, P = [[ci.x + u * ci.s, ci.y + U * 0.55], [ci.x + ci.s - U * 0.55, ci.y + u * ci.s], [ci.x + u * ci.s, ci.y + ci.s - U * 0.55], [ci.x + U * 0.55, ci.y + u * ci.s]][i];
    Tm.beginPath(); Tm.arc(P[0], P[1], U * 0.17, 0, TAU); Tm.fillStyle = "rgb(255,0,0)"; Tm.fill(); }
  const cx0 = ci.x + ci.s / 2, cy0 = ci.y + ci.s / 2, Ro = ci.s * 0.4, Ri = ci.s * 0.25;
  const Cpath = c => { c.beginPath(); c.arc(cx0, cy0, Ro, -Math.PI * 0.26, Math.PI * 0.26, true); c.lineTo(cx0 + Math.cos(Math.PI * 0.26) * Ri * 1.15, cy0 + Math.sin(Math.PI * 0.26) * Ri * 1.15); c.arc(cx0 + Ri * 0.08, cy0, Ri * 1.08, Math.PI * 0.3, -Math.PI * 0.3, false); c.closePath(); };
  // the counter is rose, with white tracery of tendrils
  A.beginPath(); A.arc(cx0 + Ri * 0.05, cy0, Ri * 1.05, 0, TAU); fill(MC.rose);
  A.save(); A.beginPath(); A.arc(cx0 + Ri * 0.05, cy0, Ri * 1.05, 0, TAU); A.clip(); A.strokeStyle = "rgba(246,240,226,0.92)"; A.lineWidth = 0.4;
  for (let i = 0; i < 3; i++) { A.beginPath(); const a0 = i * TAU / 3; for (let s = 0; s <= 30; s++) { const p = s / 30, a = a0 + p * 3.6, d = Ri * (0.95 - p * 0.75); A.lineTo(cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d); } A.stroke(); }
  for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + 0.3, d = Ri * 0.55; ivyPath(A, cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d, U * 0.6, a + 1.4); A.fillStyle = "rgba(246,240,226,0.92)"; A.fill(); }
  A.restore();
  Cpath(A); const cg = A.createRadialGradient(cx0 - Ro * 0.3, cy0 - Ro * 0.3, Ro * 0.1, cx0, cy0, Ro * 1.1); cg.addColorStop(0, "#4766A6"); cg.addColorStop(1, MC.blueD); A.fillStyle = cg; A.fill(); ink(0.6);
  A.save(); Cpath(A); A.clip(); A.strokeStyle = "rgba(246,240,226,0.95)"; A.lineWidth = 0.45;   // white-lead highlights and tiny trefoils along the letter's body
  A.beginPath(); A.arc(cx0, cy0, (Ro + Ri) / 2 + U * 0.2, Math.PI * 0.3, Math.PI * 1.7); A.stroke();
  for (let i = 0; i < 11; i++) { const a = Math.PI * 0.4 + i * Math.PI * 1.2 / 10, d = (Ro + Ri) / 2 + U * 0.2; for (const s of [-1, 1]) { A.beginPath(); A.arc(cx0 + Math.cos(a) * (d + s * U * 0.7), cy0 + Math.sin(a) * (d + s * U * 0.7), U * 0.2, 0, TAU); A.fillStyle = "rgba(246,240,226,0.95)"; A.fill(); } }
  A.restore();
  // the text, justified to the ruling, beginning beside the initial
  let wi = 0, li = 1;
  const right = tb.x + tb.w;
  const setLine = (i, xs, chant) => {
    let xx = xs; const lineWords = [];
    while (wi < words.length) { const wdd = words[wi].replace(/[:·]/, ""), ww = texturaWidth(wdd, em) + (words[wi] !== wdd ? em * 0.4 : 0); if (xx + ww > right) break; lineWords.push(words[wi]); xx += ww + em * 0.55; wi++; }
    const slack = right - (xx - em * 0.55), gap = lineWords.length > 1 && slack < em * 3 ? slack / (lineWords.length - 1) : 0;
    let px = xs;
    lineWords.forEach((wd, n) => {
      const bare = wd.replace(/[:·]/, ""), punct = wd.slice(bare.length);
      A.fillStyle = MC.ink; A.globalAlpha = 0.86 + r() * 0.14;              // the ink thins and thickens as the pen is re-dipped
      px = texturaWord(A, bare, px, L(i), em, r); if (punct) px = texturaWord(A, punct, px + em * 0.22, L(i), em, r);
      A.globalAlpha = 1; px += em * 0.55 + gap;
    });
    return { end: px - em * 0.55 - gap, last: lineWords[lineWords.length - 1] || "" };
  };
  // a line filler: a little painted bar to close a short line
  const filler = (x0, x1, y) => { if (x1 - x0 < em * 1.2) return; const hh = em * 0.9, yy = y - em * 0.95;
    A.beginPath(); A.rect(x0, yy, x1 - x0, hh); fill(MC.blue); A.beginPath(); A.rect(x0, yy + hh / 2, x1 - x0, hh / 2); fill(MC.rose); A.beginPath(); A.rect(x0, yy, x1 - x0, hh); ink(0.4);
    A.strokeStyle = "rgba(246,240,226,0.9)"; A.lineWidth = 0.35; A.beginPath(); for (let xx = x0 + hh * 0.3; xx < x1 - hh * 0.2; xx += hh * 0.5) { A.moveTo(xx, yy + hh * 0.3); A.lineTo(xx + hh * 0.25, yy + hh * 0.7); } A.stroke();
    const n = Math.max(1, Math.floor((x1 - x0) / (hh * 2.2))); for (let i = 0; i < n; i++) { const bx = x0 + (i + 0.5) * (x1 - x0) / n; gild(c => { c.beginPath(); c.arc(bx, yy + hh / 2, hh * 0.24, 0, TAU); }, 1, 1 + Math.floor(r() * 254)); } };
  // a one-line initial: gold letter on a split blue and rose ground with white penwork
  const smallInit = (x, y, letter) => { const s = pitch * 0.92, yy = y - pitch * 0.74;
    A.beginPath(); A.rect(x, yy, s, s); fill(MC.blue); A.beginPath(); A.moveTo(x + s, yy); A.lineTo(x + s, yy + s); A.lineTo(x, yy + s); A.closePath(); fill(MC.rose); A.beginPath(); A.rect(x, yy, s, s); ink(0.4);
    A.fillStyle = "rgba(246,240,226,0.9)"; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { A.beginPath(); A.arc(x + s * (i + 0.5) / 4, yy + s * (j + 0.5) / 4, s * 0.025, 0, TAU); A.fill(); }
    const id = 1 + Math.floor(r() * 254);
    gild(c => { texturaWord(c, letter, x + s * 0.2, yy + s * 0.84, s * 0.74, () => 0.5); }, 1, id, true);
    return x + s + em * 0.3; };
  // patch gild for text-shaped gold: draw the letter into each layer directly
  // lines 1-3 sit beside the initial C
  for (let i = 1; i <= 3; i++) { const e = setLine(i, ci.x + ci.s + U * 1.2); if (i === 3 && e.end < right - em * 1.5) filler(e.end + em * 0.4, right, L(i)); }
  // the chant: four red lines, a C clef, square notes climbing the scale of C and coming home
  { const top = L(4) - pitch * 0.62, gap = pitch * 0.31, y4 = k2 => top + k2 * gap;
    A.strokeStyle = MC.red; A.lineWidth = 0.5; for (let k2 = 0; k2 < 4; k2++) { A.beginPath(); A.moveTo(tb.x, y4(k2) + J(0.3)); A.lineTo(right, y4(k2) + J(0.3)); A.stroke(); }
    A.fillStyle = MC.ink;                                                          // the C clef on the third line from the bottom
    const clefY = y4(3); A.fillRect(tb.x + em * 0.2, clefY - gap * 0.75, em * 0.18, gap * 1.5); A.fillRect(tb.x + em * 0.38, clefY - gap * 0.6, em * 0.42, gap * 0.42); A.fillRect(tb.x + em * 0.38, clefY + gap * 0.18, em * 0.42, gap * 0.42);
    const notes = [0, 1, 2, 3, 4, 5, 6, 7, 7, 5, 4, 2, 1, 0], step = (right - tb.x - em * 2.4) / notes.length;
    notes.forEach((n, i) => { const y = clefY - n * gap / 2, xx = tb.x + em * 2 + i * step + J(em * 0.15), s = gap * 0.92;
      A.save(); A.translate(xx, y); A.beginPath(); A.moveTo(-s * 0.5, -s * 0.42); A.lineTo(s * 0.5, -s * 0.52); A.lineTo(s * 0.5, s * 0.42); A.lineTo(-s * 0.5, s * 0.52); A.closePath(); A.fillStyle = MC.ink; A.fill();
      if (i === 7) { A.fillRect(s * 0.38, -s * 0.4, s * 0.12, gap * 1.4); }      // a tail where the melody turns
      A.restore();
    });
    // the words sung under the notes, in red for the incipit
    A.fillStyle = MC.ink; let sx = tb.x + em * 1.8; for (const syl of ["can", "ta", "te", "do", "mi", "no", "can", "ti", "cum"]) { sx = texturaWord(A, syl, sx, L(5) - pitch * 0.02, em * 0.9, r) + step * 0.6; }
    A.fillRect(right - em * 0.2, top, 0.6, gap * 3);               // the double bar at the end of the phrase
    A.fillRect(right - em * 0.45, top, 0.6, gap * 3);
  }
  // the rest of the psalm, with painted one-line initials where verses begin
  li = 6; let pending = false;
  while (li < 13 && wi < words.length) {
    let xs = tb.x;
    const w0 = words[wi];
    if (li === 6 || pending) { xs = smallInit(tb.x, L(li), w0[0]); words[wi] = w0.slice(1); pending = false; }
    const e = setLine(li, xs);
    if (/·$/.test(e.last)) { pending = true; if (e.end < right - em * 1.5) filler(e.end + em * 0.4, right, L(li)); }
    li++;
  }

  // ---- the border: a bar along the inner edge and sprays of ivy over the margins ----
  const barX = tb.x - U * 4.2, barW = U * 1.5, by0 = mini.y - F * 2, by1 = L(12) + pitch * 0.4;
  gild(c => { c.beginPath(); c.rect(barX - barW * 0.45, by0, barW * 0.3, by1 - by0); c.rect(barX + barW * 1.15, by0, barW * 0.3, by1 - by0); }, 0.9, 0);
  A.beginPath(); A.rect(barX, by0, barW / 2, by1 - by0); fill(MC.blue); A.beginPath(); A.rect(barX + barW / 2, by0, barW / 2, by1 - by0); fill(MC.rose); A.beginPath(); A.rect(barX, by0, barW, by1 - by0); ink(0.5);
  A.strokeStyle = "rgba(246,240,226,0.92)"; A.lineWidth = 0.4;
  for (let y = by0 + barW * 0.4; y < by1 - barW * 0.3; y += barW * 0.9) { A.beginPath(); A.moveTo(barX + barW * 0.2, y); A.quadraticCurveTo(barX + barW * 0.5, y + barW * 0.45, barX + barW * 0.8, y); A.stroke(); A.beginPath(); A.arc(barX + barW * 0.5, y + barW * 0.6, barW * 0.06, 0, TAU); A.fillStyle = "rgba(246,240,226,0.92)"; A.fill(); }

  // ivy sprays: hairline stems spiralling out, with gold and painted leaves; kept off the text and the page edge
  const occ = new Map(), cell = U * 1.4, key2 = (x, y) => Math.floor(x / cell) + "," + Math.floor(y / cell);
  const inText = (x, y) => x > tb.x - U * 2.2 && x < tb.x + tb.w + U * 1.5 && y > mini.y - F * 2.4 && y < L(12) + pitch * 0.5;
  const inPage = (x, y) => x > W * 0.05 && x < W * 0.95 && y > H * 0.035 && y < H * 0.95;
  const free = (x, y) => inPage(x, y) && !inText(x, y) && !(Math.abs(x - barX - barW / 2) < barW * 1.2 && y > by0 - U && y < by1 + U) && !occ.has(key2(x, y));
  const stems = [];
  const grow = (x, y, a, len, curl, depth) => {
    const pts = [[x, y]]; let kk = curl * 0.006;
    for (let s = 0; s < len; s += 1.2) {
      a += kk; kk *= 1.006 + (s > len * 0.7 ? 0.035 : 0); x += Math.cos(a) * 1.2; y += Math.sin(a) * 1.2;
      if (!free(x, y) && s > 3) break;
      pts.push([x, y]);
    }
    if (pts.length < 6) return;
    pts.forEach(([px, py], i) => { if (i > 3) occ.set(key2(px, py), 1); });
    stems.push(pts);
    // leaves along the stem, alternating sides; a gold leaf or a painted bud at the curl's end
    for (let i = 8; i < pts.length - 6; i += 11 + Math.floor(r() * 5)) {
      const [px, py] = pts[i], [qx, qy] = pts[i + 1], ta = Math.atan2(qy - py, qx - px), side = (i % 2 ? 1 : -1), la = ta + side * (0.9 + r() * 0.4), sl = U * 0.9;
      const lx = px + Math.cos(la) * sl, ly = py + Math.sin(la) * sl;
      if (!inPage(lx, ly) || inText(lx, ly)) continue;
      A.beginPath(); A.moveTo(px, py); A.lineTo(lx, ly); ink(0.35);
      const leafKind = r(), sz = U * (1.2 + r() * 0.5);
      if (leafKind < 0.62) { const id = 1 + Math.floor(r() * 254); gild(c => ivyPath(c, lx, ly, sz, la), 0.9, id); ivyPath(A, lx, ly, sz, la); ink(0.4); }
      else { ivyPath(A, lx, ly, sz, la); fill(leafKind < 0.75 ? MC.blue : leafKind < 0.88 ? MC.green : MC.rose); ink(0.4);
        A.beginPath(); A.moveTo(lx, ly); A.lineTo(lx + Math.cos(la) * sz * 0.7, ly + Math.sin(la) * sz * 0.7); A.strokeStyle = "rgba(246,240,226,0.85)"; A.lineWidth = 0.3; A.stroke(); }
      if (depth < 2 && r() < 0.35) grow(px, py, ta + side * 0.8, len * 0.5, -side * (2 + r()), depth + 1);
    }
    const [ex, ey] = pts[pts.length - 1];
    if (r() < 0.5) { const id = 1 + Math.floor(r() * 254); gild(c => { c.beginPath(); c.arc(ex, ey, U * 0.45, 0, TAU); }, 1, id); A.beginPath(); A.arc(ex, ey, U * 0.45, 0, TAU); ink(0.35); }
    else { // a small five-petalled flower, blue or rose, with a gold heart
      const col = r() < 0.5 ? MC.blue : MC.rose; for (let p = 0; p < 5; p++) { A.beginPath(); A.arc(ex + Math.cos(p * 1.257) * U * 0.45, ey + Math.sin(p * 1.257) * U * 0.45, U * 0.32, 0, TAU); fill(col); ink(0.3); }
      A.beginPath(); A.arc(ex, ey, U * 0.22, 0, TAU); fill(MC.ochre); }
  };
  // the acanthus: curling two-coloured leaves at the corners of the bar, modelled with darker pigment and white lead
  const acanthus = (x, y, a, len, wid, curl, colA, colAD, colB, colBD) => {
    const sp = []; let kk = curl * 0.01;
    for (let s = 0; s <= 60; s++) { sp.push([x, y, a]); a += kk; kk *= 1.045; x += Math.cos(a) * len / 60; y += Math.sin(a) * len / 60; }
    const edge = (side) => sp.map(([px, py, pa], i) => { const s = i / 60, base = wid * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.7) * (1 - s * 0.5),
      lobe = side > 0 ? 0.7 + 0.5 * Math.pow((s * 5) % 1, 1.6) : 0.85 + 0.12 * Math.pow((s * 4 + 0.5) % 1, 2), o = base * lobe * side;
      return [px - Math.sin(pa) * o, py + Math.cos(pa) * o]; });
    const E1 = edge(1), E2 = edge(-1), cut = 40;
    const part = (i0, i1) => { A.beginPath(); A.moveTo(...E1[i0]); for (let i = i0; i <= i1; i++) A.lineTo(...E1[i]); for (let i = i1; i >= i0; i--) A.lineTo(...E2[i]); A.closePath(); };
    for (const [i0, i1, c0, c1] of [[0, cut, colA, colAD], [cut, 60, colB, colBD]]) {
      part(i0, i1); fill(c0);
      A.save(); part(i0, i1); A.clip(); A.beginPath(); for (let i = i0; i <= i1; i++) A.lineTo(...E2[i]); A.strokeStyle = c1; A.lineWidth = wid * 0.9; A.globalAlpha = 0.7; A.stroke(); A.globalAlpha = 1;
      A.strokeStyle = "rgba(246,240,226,0.9)"; A.lineWidth = 0.4;                   // white-lead veins running out to each lobe
      for (let i = i0 + 3; i < i1; i += 4) { const [px, py] = sp[i], [qx, qy] = E1[Math.min(60, i + 2)]; A.beginPath(); A.moveTo(px, py); A.quadraticCurveTo((px + qx) / 2, (py + qy) / 2 - 0.5, qx * 0.85 + px * 0.15, qy * 0.85 + py * 0.15); A.stroke(); }
      A.restore(); part(i0, i1); ink(0.5);
    }
    return sp[sp.length - 1];
  };
  acanthus(barX + barW / 2, by0 - U * 0.5, -Math.PI / 2 - 0.4, U * 14, U * 2.2, 2.2, MC.blue, MC.blueD, MC.rose, MC.roseD);
  acanthus(barX + barW / 2, by0 - U * 0.5, -Math.PI / 2 + 0.5, U * 12, U * 1.9, -2.0, MC.rose, MC.roseD, MC.green, MC.greenD);
  acanthus(barX + barW / 2, by1 + U * 0.5, Math.PI / 2 + 0.35, U * 13, U * 2.1, -2.1, MC.green, MC.greenD, MC.blue, MC.blueD);
  acanthus(barX + barW / 2, by1 + U * 0.5, Math.PI / 2 - 0.6, U * 15, U * 2.0, 2.0, MC.blue, MC.blueD, MC.rose, MC.roseD);
  for (const [cx, cy, s, c] of [[barX + barW / 2, by0 - U * 0.5, U * 1.2, MC.ochre], [barX + barW / 2, by1 + U * 0.5, U * 1.2, MC.ochre]]) { gild(cc => { cc.beginPath(); cc.arc(cx, cy, s, 0, TAU); }, 1, 77); A.beginPath(); A.arc(cx, cy, s, 0, TAU); ink(0.5); }
  // sprays from the bar ends and along the margins
  for (let i = 0; i < 160; i++) {
    const side = r(), x = side < 0.35 ? W * (0.06 + r() * 0.06) : side < 0.7 ? tb.x + tb.w + U * (2.5 + r() * 14) : W * (0.1 + r() * 0.8);
    const y = side < 0.7 ? H * (0.05 + r() * 0.9) : (r() < 0.45 ? H * (0.04 + r() * 0.035) : H * (0.84 + r() * 0.1));
    if (!free(x, y)) continue;
    grow(x, y, r() * TAU, U * (22 + r() * 26), (r() < 0.5 ? -1 : 1) * (2.2 + r() * 1.4), 0);
  }
  A.lineCap = "round"; stems.forEach(pts => { A.beginPath(); pts.forEach(([x, y]) => A.lineTo(x, y)); ink(0.42); });

  // ---- combine the gold layers into one map: R gold, G gesso height minus tooling, B leaf id ----
  const n = aCv.width * aCv.height, gd = Gm.getImageData(0, 0, aCv.width, aCv.height), hd = Hm.getImageData(0, 0, aCv.width, aCv.height), td = Tm.getImageData(0, 0, aCv.width, aCv.height);
  // round the gesso: a few box-blur passes give each raised shape a soft cushion
  const Wd = aCv.width, Hd = aCv.height, hv = new Float32Array(n), tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) hv[i] = hd.data[i * 4] / 255;
  const rad = Math.max(1, Math.round(k * U * 0.35));
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < Hd; y++) { let acc = 0; const o = y * Wd; for (let x = -rad; x < Wd; x++) { if (x + rad < Wd) acc += hv[o + x + rad]; if (x - rad - 1 >= 0) acc -= hv[o + x - rad - 1]; if (x >= 0) tmp[o + x] = acc / (2 * rad + 1); } }
    for (let x = 0; x < Wd; x++) { let acc = 0; for (let y = -rad; y < Hd; y++) { if (y + rad < Hd) acc += tmp[(y + rad) * Wd + x]; if (y - rad - 1 >= 0) acc -= tmp[(y - rad - 1) * Wd + x]; if (y >= 0) hv[y * Wd + x] = acc / (2 * rad + 1); } }
  }
  const out = new ImageData(Wd, Hd), ad = A.getImageData(0, 0, Wd, Hd).data;
  for (let i = 0; i < n; i++) {
    const raw = hd.data[i * 4] / 255, cushion = Math.min(raw, hv[i] * 1.6);
    // gold only where nothing was painted over it afterwards (tree crowns, outlines, the initial)
    const dg = Math.abs(ad[i * 4] - 196) + Math.abs(ad[i * 4 + 1] - 154) + Math.abs(ad[i * 4 + 2] - 68), keepG = Math.max(0, Math.min(1, 1 - (dg - 8) / 16));
    out.data[i * 4] = Math.round(gd.data[i * 4] * keepG); out.data[i * 4 + 1] = Math.max(0, Math.round(255 * cushion - td.data[i * 4] * 0.35)); out.data[i * 4 + 2] = gd.data[i * 4 + 2]; out.data[i * 4 + 3] = 255;
  }
  gCv.getContext("2d").putImageData(out, 0, 0);
  return { alb: aCv, mat: gCv };
}

const MANU_FS = PAINT_COMMON + `
uniform sampler2D tA, tM; uniform vec2 uRes; uniform float uScale, uT, uI, uTw, uWarm; uniform vec3 uL;
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes, px = 1. / uRes, q = gl_FragCoord.xy / uScale;
  float asp = uRes.x / uRes.y;
  vec3 alb = lin(texture(tA, uv).rgb); vec4 m = texture(tM, uv);
  vec3 P = vec3(uv.x * asp, uv.y, 0.), V = normalize(vec3(.5 * asp, .5, 2.2) - P), L = normalize(uL - P);
  // the vellum: never quite flat; it cockles a little, so the light lies unevenly across it
  float ck = fb(uv * vec2(asp, 1.) * 3.5);
  vec3 Np = normalize(vec3((fb(uv * 3.5 + vec2(.02, 0.)) - ck) * 1.2, (fb(uv * 3.5 + vec2(0., .02)) - ck) * 1.2, 1.));
  float dif = .78 + .22 * max(dot(Np, L), 0.);
  float fall = 1. - .12 * smoothstep(.2, 1.1, length(uL.xy - P.xy));             // further from the light, a touch darker
  vec3 light = vec3(1., .97, .92) * mix(vec3(1.), vec3(1.04, .99, .9), uWarm) * uI * dif * fall;
  vec3 col = alb * light;
  // burnished gold on gesso: a mirror that shows the dim room, and the light where the angle is right
  float gm = m.r;
  if (gm > .002) {
    float h = m.g;
    float hx = texture(tM, uv + vec2(px.x, 0.)).g - texture(tM, uv - vec2(px.x, 0.)).g;
    float hy = texture(tM, uv + vec2(0., px.y)).g - texture(tM, uv - vec2(0., px.y)).g;
    vec3 N = normalize(vec3(-hx * 3.5 * uScale, -hy * 3.5 * uScale, 1.));
    // the leaf itself: beaten thin, laid in overlapping squares, faintly crinkled where it was pressed down
    vec2 lq = q * .08; float cr = vn(lq * 3.) - .5, cr2 = vn(lq * 3. + 9.) - .5;
    N = normalize(N + vec3(cr, cr2, 0.) * .035);
    vec3 R = reflect(-V, N), Hh = normalize(L + V);
    float env = .2 + .38 * smoothstep(-.2, .9, dot(R, normalize(vec3(-.35, .55, .75)))) + .08 * smoothstep(.3, 1., R.y);
    float spec = pow(max(dot(N, Hh), 0.), 160.) * 1.4 + pow(max(dot(N, Hh), 0.), 20.) * .32;
    float id = m.b * 255.;
    float tw = id > .5 ? pow(max(0., sin(id * 1.7 + uTw)), 24.) : 0.;           // single leaves catch the light as the notes pass
    vec3 gold = lin(vec3(.84, .64, .3));
    vec3 g = gold * (env * uI + spec * uI + tw * .9) + vec3(1., .9, .7) * pow(spec, 2.) * .08;
    g *= mix(.82, 1., smoothstep(0., .25, h));                                   // flat (unraised) gold is a shade duller
    col = mix(col, g, gm);
  }
  col = col / (1. + col * .08);
  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}`;
function manuTex(cv, old) {
  const { gl } = PAINT; gl.activeTexture(gl.TEXTURE0); const t = old || PAINT.tex();
  gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
}
// draw a shader straight onto the page from its own textures (no scene underneath to read)
function r3Tex(name, fs, rect, uniforms, texs) {
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) return false;
  const { gl } = PAINT, p = r2Prog(name, fs);
  const x = Math.round(rect.x * DPR), y = Math.round(rect.y * DPR), w = Math.round(rect.w * DPR), h = Math.round(rect.h * DPR);
  paintResize(w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  paintUse(p, Object.assign({ uRes: [w, h], uScale: DPR }, uniforms));
  let unit = 1; for (const k in texs) paintBind(p, k, unit++, texs[k]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(PAINT.cv, x, y); g.restore();
  return true;
}
function sunScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.7), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  if (PAINT.gl === null) paintSetup();
  const key = Math.round(w * DPR) + "x" + Math.round(h * DPR);
  if (manu.key !== key && PAINT.gl) {
    manu.key = key; const L = manuBuild(Math.round(w * DPR) / DPR, Math.round(h * DPR) / DPR, DPR);
    manu.tA = manuTex(L.alb, manu.tA); manu.tM = manuTex(L.mat, manu.tM);
  }
  // the light: the melody lifts it, a slow drift moves it across, swells brighten it
  const goal = S.pitchOn ? Math.max(0, Math.min(1, (S.pitch - 0.8) / 2.6)) : 0.45;
  manu.ly += ((0.25 + goal * 0.6) - manu.ly) * Math.min(1, dt * 0.8);
  manu.lx = 0.35 + Math.sin(t * 0.06) * 0.18 + Math.sin(t * 0.023) * 0.08;
  manu.li += ((0.93 + S.mid * 0.16 + S.pulse * 0.06) - manu.li) * Math.min(1, dt * 1.5);
  manu.tw += dt * (0.25 + S.high * 0.8);
  g.save(); g.shadowColor = "rgba(60,45,30,0.2)"; g.shadowBlur = 14; g.shadowOffsetY = 5; g.fillStyle = MC.vellum; g.fillRect(x0, y0, w, h); g.restore();
  if (!PAINT.gl) return;
  const asp = w / h;
  r3Tex("manu", MANU_FS, { x: x0, y: y0, w, h }, { uT: t, uI: manu.li, uTw: manu.tw, uWarm: 0.3 + S.bass * 0.3, uL: [manu.lx * asp + 0.2, manu.ly, 0.9] }, { tA: manu.tA, tM: manu.tM });
}
function sunBeat() { manu.tw += 0.9 + Math.random() * 0.6; }

// ----------------------------------------------------------------
// 3ii  THE GILDED PANEL. Carved and water-gilded ornament of the 17th century, as on the boiserie of a
// Roman palazzo or the panels of Versailles under Le Brun: an oval cartouche lined with burgundy silk
// damask, held by symmetrical C- and S-scrolls that burst into acanthus, a scallop shell as crest,
// festoons and drops of flowers and fruit, all on an ivory stucco ground inside a gilt moulded frame.
// The carving is built as a real relief (a height map: tubes for the scrolls, cushioned leaves with
// cut veins, domed fruit, ribbed shell), then lit in a shader: burnished gold mirroring a warm room,
// soft shadows cast by the relief itself, matte stucco, and silk whose pattern turns with the light.
// The music makes the ornament unfurl outward from the cartouche, carries a glint along the scrolls,
// and slowly moves the light, so the reflections in the gold shift as it plays.
// ----------------------------------------------------------------
const heaven = { key: "", tH: null, tM: null, rev: 0.25, flow: 0, az: 2.3, li: 1, lastT: -1 };
const BQ_HMAX = 40;                                            // the deepest carving, in CSS pixels

function baroqueBuild(W, H, k) {
  const Wd = Math.round(W * k), Hd = Math.round(H * k), n = Wd * Hd;
  const mk = () => { const cv = document.createElement("canvas"); cv.width = Wd; cv.height = Hd; const c = cv.getContext("2d", { willReadFrequently: true }); c.fillStyle = "#000"; c.fillRect(0, 0, Wd, Hd); return [cv, c]; };
  // relief layers, bottom to top: scrolls, leaves, flowers and fruit, small details
  const LAY = [{ base: 0, amp: 9, blur: 3.2 }, { base: 3, amp: 7, blur: 2.4 }, { base: 6, amp: 8, blur: 2.2 }, { base: 9, amp: 4, blur: 1.2 }];
  LAY.forEach(l => [l.cv, l.c] = mk());
  const [arrCv, AR] = mk(), [grvCv, GR] = mk(), [dmCv, DM] = mk();
  const all = [...LAY.map(l => l.c), AR, GR, DM];
  all.forEach(c => c.setTransform(k, 0, 0, k, 0, 0));
  const cx = W / 2, U = W / 100;
  const r0 = seeded(1650);
  let r = r0, side = 1;
  // draw everything twice, mirrored about the centre line (each side with its own small irregularities)
  const both = fn => { for (const s of [1, -1]) { side = s; r = seeded(s > 0 ? 1650 : 1651); all.forEach(c => c.setTransform(s * k, 0, 0, k, s > 0 ? 0 : Wd, 0)); fn(); } all.forEach(c => c.setTransform(k, 0, 0, k, 0, 0)); side = 1; };
  const J = (s = 1) => (r() - 0.5) * s;
  const grey = v => { const g8 = Math.max(1, Math.min(255, Math.round(v * 255))); return `rgb(${g8},${g8},${g8})`; };
  // a carved stem: circles along a path, radius and arrival varying along it
  const tube = (li, pts) => { const c = LAY[li].c; c.fillStyle = "#fff";
    for (let i = 0; i < pts.length; i++) { const [x, y, rr, a] = pts[i]; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); AR.fillStyle = grey(a); AR.beginPath(); AR.arc(x, y, rr, 0, TAU); AR.fill(); } };
  const groove = (pts, w) => { GR.strokeStyle = "#fff"; GR.lineWidth = w; GR.lineCap = "round"; GR.beginPath(); pts.forEach(([x, y]) => GR.lineTo(x, y)); GR.stroke(); };
  const shape = (li, path, a) => { const c = LAY[li].c; c.fillStyle = "#fff"; path(c); c.fill(); AR.fillStyle = grey(a); path(AR); AR.fill(); };
  // a spiral scroll: from (x,y) heading a, curling ever tighter into a volute
  const scrollPath = (x, y, a, len, k0, grow, steps = 90) => { const P = []; let kk = k0; for (let i = 0; i <= steps; i++) { P.push([x, y, a]); a += kk; kk *= grow; x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps; } return P; };
  // a volute: a spiral whose radius shrinks from R0 to R1 along its length; dir 1 turns clockwise on screen
  const volutePath = (x, y, a, len, R0, R1, dir, N = 80) => { const ds = len / N, gr = Math.pow(R0 / R1, 1 / N); let kk = ds / R0 * dir; const P = [];
    for (let i = 0; i <= N; i++) { P.push([x, y, a]); a += kk; kk *= gr; x += Math.cos(a) * ds; y += Math.sin(a) * ds; } return P; };
  const scroll = (li, P, w0, w1, a0, a1, volute = true) => {
    tube(li, P.map(([x, y], i) => { const s = i / (P.length - 1); return [x, y, w0 + (w1 - w0) * s, a0 + (a1 - a0) * s]; }));
    // a fillet groove running along the stem, as carvers cut them
    groove(P.slice(2, -4).map(([x, y, a], i) => { const s = (i + 2) / (P.length - 1), o = (w0 + (w1 - w0) * s) * 0.35; return [x - Math.sin(a) * o, y + Math.cos(a) * o]; }), U * 0.22);
    if (volute) { const [x, y] = P[P.length - 1]; const c = LAY[Math.min(3, li + 1)].c; c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, w1 * 1.25, 0, TAU); c.fill(); AR.fillStyle = grey(a1); AR.beginPath(); AR.arc(x, y, w1 * 1.25, 0, TAU); AR.fill(); }
  };
  // an acanthus leaf in relief: a lobed blade along a curling spine, with a deep midrib and veins to each lobe
  const acanthus = (li, x, y, a, len, wid, curl, arr, lobes = 5) => {
    const sp = scrollPath(x, y, a, len, curl * 0.012, 1.035, 60);
    const ed = sgn => sp.map(([px, py, pa], i) => { const s = i / 60, base = wid * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.05)), 0.75) * (1 - s * 0.45);
      const f = (s * lobes) % 1, lobe = 0.72 + 0.42 * Math.sin(Math.min(1, f * 1.15) * Math.PI * 0.5) - (f > 0.88 ? 0.3 * (f - 0.88) / 0.12 : 0); return [px - Math.sin(pa) * base * lobe * sgn, py + Math.cos(pa) * base * lobe * sgn]; });
    const E1 = ed(1), E2 = ed(-1);
    shape(li, c => { c.beginPath(); c.moveTo(...E1[0]); E1.forEach(p => c.lineTo(...p)); for (let i = 60; i >= 0; i--) c.lineTo(...E2[i]); c.closePath(); }, arr);
    groove(sp.slice(1, -3), U * 0.42);
    for (let lb = 0; lb < lobes; lb++) for (const E of [E1, E2]) { const i0 = Math.round((lb + 0.15) / lobes * 60), i1 = Math.min(60, Math.round((lb + 0.85) / lobes * 60)); const [px, py] = sp[i0], [qx, qy] = E[i1];
      groove([[px, py], [(px * 0.4 + qx * 0.6) + J(U * 0.3), (py * 0.4 + qy * 0.6) + J(U * 0.3)], [px * 0.12 + qx * 0.88, py * 0.12 + qy * 0.88]], U * 0.2); }
    return sp[60];
  };
  const rose = (li, x, y, R, arr) => {   // a carved rose: two rings of cupped petals round a tight bud
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + ring * 0.63 + J(0.2), d = R * (ring ? 0.32 : 0.6), pr = R * (ring ? 0.42 : 0.52);
      shape(Math.min(3, li + ring), c => { c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, pr, pr * 0.8, a, 0, TAU); }, arr);
      groove([[x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4], [x + Math.cos(a) * (d + pr * 0.6), y + Math.sin(a) * (d + pr * 0.6)]], U * 0.15); }
    shape(3, c => { c.beginPath(); c.arc(x, y, R * 0.24, 0, TAU); }, arr);
    groove([[x - R * 0.14, y], [x, y - R * 0.12], [x + R * 0.12, y + R * 0.05]], U * 0.14);
  };
  const fruit = (li, x, y, R, arr) => shape(li, c => { c.beginPath(); c.arc(x, y, R, 0, TAU); }, arr);
  const laurel = (li, x, y, a, s, arr) => { shape(li, c => { c.beginPath(); c.ellipse(x, y, s, s * 0.36, a, 0, TAU); }, arr); groove([[x - Math.cos(a) * s * 0.8, y - Math.sin(a) * s * 0.8], [x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8]], U * 0.12); };

  // ---- the layout ----
  const fw = W * 0.07;                                         // frame width
  const oc = { x: cx, y: H * 0.45, rx: W * 0.2, ry: H * 0.165 };  // the cartouche
  // the damask inside the cartouche: an ogival lattice with a pomegranate in each cell
  DM.save(); DM.beginPath(); DM.ellipse(oc.x, oc.y, oc.rx, oc.ry, 0, 0, TAU); DM.clip();
  DM.fillStyle = "#fff"; DM.strokeStyle = "#fff";
  const cw = oc.rx * 0.62, ch = oc.ry * 0.62;
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
    const x = oc.x + (i + (j % 2 ? 0.5 : 0)) * cw, y = oc.y + j * ch;
    DM.lineWidth = U * 0.5; DM.beginPath(); DM.moveTo(x, y - ch * 0.62); DM.bezierCurveTo(x + cw * 0.55, y - ch * 0.35, x + cw * 0.5, y + ch * 0.25, x, y + ch * 0.62); DM.bezierCurveTo(x - cw * 0.5, y + ch * 0.25, x - cw * 0.55, y - ch * 0.35, x, y - ch * 0.62); DM.stroke();
    DM.beginPath(); DM.ellipse(x, y + ch * 0.05, cw * 0.17, ch * 0.2, 0, 0, TAU); DM.fill();         // the pomegranate
    for (const s of [-1, 1]) { DM.beginPath(); DM.ellipse(x + s * cw * 0.2, y - ch * 0.12, cw * 0.12, ch * 0.05, s * -0.7, 0, TAU); DM.fill(); }   // its two leaves
    DM.beginPath(); DM.moveTo(x - cw * 0.06, y - ch * 0.14); DM.lineTo(x, y - ch * 0.28); DM.lineTo(x + cw * 0.06, y - ch * 0.14); DM.fill();          // the crown
  }
  DM.restore();

  // ---- the carving, symmetrical about the centre ----
  both(() => {
    const sx = side;
    // 1. the great C-scroll: it rises from below the cartouche, hugs its flank, and rolls outward at the shoulder
    const flank = []; for (let i = 0; i <= 50; i++) { const th = -0.85 + i / 50 * 1.6, x = cx + oc.rx * 1.32 * Math.cos(th), y = oc.y - oc.ry * 1.2 * Math.sin(th);
      flank.push([x, y, Math.atan2(-oc.ry * 1.2 * Math.cos(th), -oc.rx * 1.32 * Math.sin(th))]); }
    const [fx1, fy1, fa1] = flank[flank.length - 1];
    const P = flank.concat(volutePath(fx1, fy1, fa1, W * 0.3, W * 0.2, W * 0.011, 1).slice(1));
    scroll(0, P, U * 2.1, U * 1.0, 0.1, 0.45);
    const top = P[P.length - 1];
    // acanthus bursting from it: one at its foot turning down and out, one from the flank curling down over the drop
    const [bx0, by0] = flank[6]; acanthus(1, bx0, by0, Math.PI * 0.15, W * 0.17, U * 4.50, 2.2, 0.14);
    const [bx1, by1] = flank[24]; acanthus(1, bx1, by1, -Math.PI * 0.1, W * 0.15, U * 4.20, 2.6, 0.27);
    const [bx2, by2] = flank[42]; acanthus(2, bx2, by2, -Math.PI * 0.55, W * 0.12, U * 3.45, 2.8, 0.37, 4);
    // 2. the lower S-scroll: from the cartouche's foot out to the side, then down into a hanging volute
    const P2 = scrollPath(cx + oc.rx * 0.12, oc.y + oc.ry * 1.12, Math.PI * 0.08, W * 0.24, -0.004, 1.0, 50)
      .concat(scrollPath(cx + oc.rx * 0.12 + W * 0.235, oc.y + oc.ry * 1.18, -Math.PI * 0.02, W * 0.3, 0.012, 1.06, 80).slice(1));
    scroll(0, P2, U * 1.6, U * 0.8, 0.15, 0.55);
    acanthus(1, cx + oc.rx * 0.05, oc.y + oc.ry * 1.18, Math.PI * 0.1, W * 0.22, U * 4.50, -1.8, 0.2);
    acanthus(2, cx + oc.rx * 0.95, oc.y + oc.ry * 1.25, Math.PI * 0.45, W * 0.15, U * 3.60, 2.4, 0.42);
    // 3. the shell's two supporting scrolls and the leaves at its foot
    const P3 = volutePath(cx + U * 1.5, oc.y - oc.ry * 1.06, -0.12, W * 0.17, W * 0.12, W * 0.009, 1);
    scroll(0, P3, U * 1.3, U * 0.7, 0.2, 0.4);
    acanthus(1, cx + U * 0.5, oc.y - oc.ry * 0.98, -Math.PI * 0.08, W * 0.13, U * 3.30, -2.8, 0.25);
    // acanthus spreading from the shell along the top, and from the foot rose
    acanthus(1, cx + W * 0.1, oc.y - oc.ry * 1.18, -0.25, W * 0.2, U * 3.6, 2.0, 0.3);
    acanthus(1, cx + U * 3, H * 0.845, 0.1, W * 0.17, U * 3.2, -1.6, 0.6);
    // 4. the festoon: a heavy swag of laurel, roses and fruit hung from the lower volutes across the bottom
    const v2 = P2[P2.length - 1], hx = v2[0], hy = v2[1];
    const sw = t2 => [cx + (hx - cx) * (1 - t2), hy + U * 2 + Math.sin(t2 * Math.PI * 0.5) * H * 0.075];
    for (let i = 0; i < 46; i++) { const t2 = i / 45, [x, y] = sw(t2), a = Math.atan2(sw(Math.min(1, t2 + 0.02))[1] - y, sw(Math.min(1, t2 + 0.02))[0] - x) + (i % 2 ? 0.9 : -0.9);
      laurel(1, x + J(U), y + J(U), a, U * (2.0 + r() * 0.6), 0.6 + (1 - t2) * 0.2); }
    for (let i = 0; i < 6; i++) { const t2 = 0.08 + i * 0.16, [x, y] = sw(t2); if (i % 2) rose(2, x, y + U * 0.5, U * 2.6, 0.7 + (1 - t2) * 0.15); else { fruit(2, x - U * 1.2, y, U * 1.5, 0.72); fruit(2, x + U * 1.0, y + U * 1.0, U * 1.3, 0.72); fruit(3, x + U * 0.1, y - U * 1.2, U * 1.0, 0.74); } }
    // 5. a drop of flowers hanging from the upper volute down the side
    for (let i = 0; i < 5; i++) { const x = top[0] + U * 6.5 + J(U * 0.6), y = top[1] + U * 6 + i * U * 4.6, s = 1 - i * 0.11;
      if (i % 2 === 0) rose(2, x, y, U * 2.3 * s, 0.6 + i * 0.05); else { laurel(1, x - U * 1.6 * s, y, 2.3, U * 2.2 * s, 0.6 + i * 0.05); laurel(1, x + U * 1.6 * s, y, 0.8, U * 2.2 * s, 0.6 + i * 0.05); fruit(2, x, y + U * 0.4, U * 1.2 * s, 0.62 + i * 0.05); } }
    tube(0, Array.from({ length: 12 }, (_, i) => [top[0] + U * (2 + i * 0.4), top[1] + U * (i * 0.35), U * 0.45, 0.55]));   // the ribbon the drop hangs from
    // 6. the corner rosettes of the frame's inner field, and a palmette at the foot
    rose(2, fw + U * 6, fw + U * 6, U * 3.2, 0.85); rose(2, fw + U * 6, H - fw - U * 6, U * 3.2, 0.85);
    for (let q = 0; q < 2; q++) acanthus(1, fw + U * 6 + U * 2.5, (q ? H - fw - U * 6 : fw + U * 6), q ? -0.1 : 0.1, W * 0.1, U * 2.25, q ? -2.2 : 2.2, 0.9, 4);
    acanthus(1, cx + U * 0.5, H * 0.86, -Math.PI * 0.62, W * 0.13, U * 3.90, -1.5, 0.55, 4);
  });
  // centre pieces, not mirrored: the scallop shell crest, the clasp at the cartouche's foot, the palmette's heart
  side = 1; r = seeded(1700);
  { const sx0 = cx, sy0 = oc.y - oc.ry * 1.02, R = W * 0.13;
    shape(1, c => { c.beginPath(); c.moveTo(sx0 - R * 0.18, sy0); for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI, rr = R * (0.92 + 0.08 * Math.cos(i / 40 * Math.PI * 13)); c.lineTo(sx0 + Math.cos(a) * rr, sy0 + Math.sin(a) * rr * 0.8); } c.lineTo(sx0 + R * 0.18, sy0); c.closePath(); }, 0.18);
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i + 0.5) / 13 * Math.PI; groove([[sx0, sy0 + U], [sx0 + Math.cos(a) * R * 0.95, sy0 + Math.sin(a) * R * 0.76]], U * 0.5); }
    shape(2, c => { c.beginPath(); c.ellipse(sx0, sy0 - U * 0.5, R * 0.22, R * 0.12, 0, 0, TAU); }, 0.16);
    fruit(3, cx, oc.y + oc.ry * 1.12, U * 2.2, 0.1); rose(2, cx, H * 0.84, U * 3.4, 0.5);
  }

  // ---- combine into one relief ----
  const read = c => c.getImageData(0, 0, Wd, Hd).data;
  // a gaussian-like blur in floating point (three box passes), so the relief stays smooth with no 8-bit steps
  const fblur = (src, px) => { const rad = Math.max(1, Math.round(px * k / 1.7)), a = Float32Array.from(src), tmp = new Float32Array(n);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < Hd; y++) { let acc = 0; const o = y * Wd; for (let x = -rad; x < Wd; x++) { if (x + rad < Wd) acc += a[o + x + rad]; if (x - rad - 1 >= 0) acc -= a[o + x - rad - 1]; if (x >= 0) tmp[o + x] = acc / (2 * rad + 1); } }
      for (let x = 0; x < Wd; x++) { let acc = 0; for (let y = -rad; y < Hd; y++) { if (y + rad < Hd) acc += tmp[(y + rad) * Wd + x]; if (y - rad - 1 >= 0) acc -= tmp[(y - rad - 1) * Wd + x]; if (y >= 0) a[y * Wd + x] = acc / (2 * rad + 1); } }
    } return a; };
  const chan = c => { const d = read(c), f = new Float32Array(n); for (let i = 0; i < n; i++) f[i] = d[i * 4] / 255; return f; };
  const Hf = new Float32Array(n), arr = new Float32Array(n), mat = new Uint8Array(n), orn = new Float32Array(n);
  // the frame: a gilt ogee moulding, a flat, and an inner bead-and-reel, all turned in one profile
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
    const i = y * Wd + x, X = x / k, Y = y / k, d = Math.min(X, Y, W - X, H - Y);
    let h = 0;
    if (d < fw) { const u = d / fw;
      h = u < 0.12 ? 10 + u / 0.12 * 4 : u < 0.55 ? 14 + 10 * Math.sin((u - 0.12) / 0.43 * Math.PI * 0.5) * (1 - 0.35 * Math.cos((u - 0.12) / 0.43 * Math.PI)) : u < 0.7 ? 22 - (u - 0.55) / 0.15 * 9 : 13 - (u - 0.7) / 0.3 * 9;
      h -= u > 0.82 && u < 0.86 ? 1.5 : 0; }
    // beads along the inner edge of the frame
    const bd = d - fw * 1.06; if (Math.abs(bd) < fw * 0.12) { const along = (d === X || d === W - X) ? Y : X, ph = (along / (fw * 0.28)) % 1, isBead = ph < 0.7, br = fw * 0.11;
      const lx = (isBead ? (ph - 0.35) / 0.7 : (ph - 0.85) / 0.3) * fw * 0.28 * (isBead ? 0.7 : 0.3) / 1, rr = isBead ? br : br * 0.55; const q2 = lx * lx * (isBead ? 1 : 3) + bd * bd; if (q2 < rr * rr) h = Math.max(h, 2 + Math.sqrt(rr * rr - q2) * 1.2); }
    // the cartouche's torus moulding
    const ex = (X - oc.x) / oc.rx, ey = (Y - oc.y) / oc.ry, e = Math.sqrt(ex * ex + ey * ey), ed = (e - 1.04) * Math.min(oc.rx, oc.ry);
    if (Math.abs(ed) < U * 2.4) h = Math.max(h, 4 + Math.sqrt(Math.max(0, (U * 2.4) ** 2 - ed * ed)) * 1.4);
    if (Math.abs(ed + U * 3) < U * 0.8) h = Math.max(h, 2 + Math.sqrt(Math.max(0, (U * 0.8) ** 2 - (ed + U * 3) ** 2)) * 1.6);
    Hf[i] = h; mat[i] = h > 0 ? 2 : e < 1.0 ? 1 : 0;
  }
  // the carved layers on top
  LAY.forEach(l => { const m = chan(l.c), b = fblur(m, l.blur * U / 4);
    for (let i = 0; i < n; i++) { const mm = m[i]; if (mm <= 0) continue; const p = Math.sqrt(Math.min(1, b[i] * 1.25)), h = (l.base + l.amp * p) * mm;
      if (h > orn[i]) orn[i] = h; } });
  const g = fblur(chan(GR), U * 0.15), ad = read(AR);
  // spread each shape's arrival a few pixels past its anti-aliased edge, so an edge never arrives before its shape
  { const R2 = Math.ceil(k * 2), src = new Float32Array(n), tmp = new Float32Array(n); for (let i = 0; i < n; i++) src[i] = ad[i * 4];
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { let m = 0; for (let d = -R2; d <= R2; d++) { const xx = x + d; if (xx >= 0 && xx < Wd) m = Math.max(m, src[y * Wd + xx]); } tmp[y * Wd + x] = m; }
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { let m = 0; for (let d = -R2; d <= R2; d++) { const yy = y + d; if (yy >= 0 && yy < Hd) m = Math.max(m, tmp[yy * Wd + x]); } ad[(y * Wd + x) * 4] = m; } }
  for (let i = 0; i < n; i++) {
    if (orn[i] > 0.01) { const hh = Math.max(0.3, orn[i] - g[i] * 2.6); if (hh + 1 > Hf[i] || mat[i] !== 2) { Hf[i] = Math.max(Hf[i] * (mat[i] === 2 ? 1 : 0), hh + (mat[i] === 2 ? 0 : 0)); arr[i] = ad[i * 4] / 255; } mat[i] = 2; }
  }
  // ambient occlusion reference: the relief, blurred wide
  const aoB = fblur(Hf, U * 1.2), dmd = read(DM);
  const [oH, cH] = mk(), [oM, cM] = mk(), dH = cH.getImageData(0, 0, Wd, Hd), dM = cM.getImageData(0, 0, Wd, Hd);
  const wr = seeded(3);
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.max(0, Math.min(1, Hf[i] / BQ_HMAX)) * 65535);
    dH.data[i * 4] = v >> 8; dH.data[i * 4 + 1] = v & 255; dH.data[i * 4 + 2] = Math.round(arr[i] * 255); dH.data[i * 4 + 3] = 255;
    dM.data[i * 4] = mat[i] === 2 ? 255 : mat[i] === 1 ? 128 : 0; dM.data[i * 4 + 1] = dmd[i * 4]; dM.data[i * 4 + 2] = Math.round(Math.min(1, aoB[i] / BQ_HMAX) * 255); dM.data[i * 4 + 3] = 255;
  }
  cH.putImageData(dH, 0, 0); cM.putImageData(dM, 0, 0);
  return { h: oH, m: oM };
}

const BAROQUE_FS = PAINT_COMMON + `
uniform sampler2D tH, tM; uniform vec2 uRes; uniform float uScale, uT, uRev, uFlow, uAz, uEl, uI, uFl;
in vec2 vUv; out vec4 o;
const float HM = ${BQ_HMAX}.;
float arrv(vec2 uv){ return texture(tH, uv).b; }
float grow(vec2 uv){ vec4 a = texture(tH, uv); return a.b < .004 ? 1. : smoothstep(a.b, a.b + .06, uRev); }
float Hs(vec2 uv){ vec4 a = texture(tH, uv); float h = (a.r * 65280. + a.g * 255.) / 65535. * HM; return h * (a.b < .004 ? 1. : smoothstep(a.b, a.b + .06, uRev)); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes, px = 1. / uRes, q = gl_FragCoord.xy / uScale;
  vec4 M = texture(tM, uv); float mat = M.r;
  float h = Hs(uv);
  // the surface normal from the relief (heights in CSS pixels, steps in device pixels)
  float hx = (Hs(uv + vec2(px.x, 0.)) - Hs(uv - vec2(px.x, 0.))) * .5 * uScale, hy = (Hs(uv + vec2(0., px.y)) - Hs(uv - vec2(0., px.y))) * .5 * uScale;
  vec3 N = normalize(vec3(-hx, -hy, 1.));
  vec3 L = normalize(vec3(cos(uAz) * cos(uEl), sin(uAz) * cos(uEl), sin(uEl))), V = vec3(0., 0., 1.);
  // shadows cast by the carving across itself, softened by the size of the light
  float sh = 1.; vec2 ld = normalize(L.xy); float tn = L.z / length(L.xy);
  for (int i = 1; i <= 28; i++) { float s = float(i) * 1.6; float hh = Hs(uv + ld * s * uScale * px); sh = min(sh, clamp(1. - (hh - h - s * tn) * .22, 0., 1.)); }
  sh = mix(.28, 1., sh);
  // ambient occlusion from the relief as it stands now (so carving that has not yet appeared casts nothing)
  float avg = 0.; for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996, rr = (3. + float(i) * .9) * uScale; avg += Hs(uv + vec2(cos(a), sin(a)) * rr * px); }
  float ao = clamp(1. - (avg / 12. - h) * .05, .45, 1.);
  float key = max(dot(N, L), 0.) * sh;
  vec3 lightC = vec3(1., .9, .76) * uI * (1. + uFl);
  vec3 col;
  // stucco ground: lime and marble dust, ivory, matte with the faintest polish
  vec3 stucco = lin(vec3(.9, .85, .74)) * (.96 + .04 * fb(q * .05));
  col = stucco * (lightC * key * .9 + vec3(.32, .3, .28) * ao);
  // the silk damask in the cartouche: satin pattern on a twill ground; the satin flashes as the light turns
  if (mat > .3 && mat < .7) {
    float pat = M.g; vec3 silk = lin(vec3(.36, .1, .12));
    float warp = abs(sin(uAz)), weft = abs(cos(uAz));
    float sheen = mix(.12 + .3 * weft, .12 + .55 * warp, pat);
    float thr = .97 + .03 * sin(q.y * 2.6 + sin(q.x * .3));     // the weave, a hair finer than a pixel at arm's length
    col = silk * (lightC * (.55 + key * .3) * thr + vec3(.12)) + lin(vec3(.85, .5, .48)) * sheen * .22 * uI * sh;
    col *= ao;
  }
  // water gilding: burnished on the high points, matte in the hollows; it mirrors a warm, dim room
  float gl2 = grow(uv) * step(.7, mat);
  if (gl2 > 0.) {
    vec3 R = reflect(-V, N);
    float rough = mix(.5, .12, smoothstep(2., 18., h));
    // the room it mirrors: a tall window up to the left, warm candlelit walls, a dark floor
    float win = pow(smoothstep(-.1, .97, dot(R, normalize(vec3(-.55, .62, .55)))), 1.8);
    float env = .07 + 1.05 * win + .3 * pow(max(dot(R, normalize(vec3(.6, .2, .78))), 0.), 5.) + .12 * smoothstep(-.2, .8, R.y);
    vec3 Hh = normalize(L + V); float ndh = max(dot(N, Hh), 0.);
    float spec = pow(ndh, mix(25., 220., 1. - rough)) * mix(.6, 3.2, 1. - rough);
    vec3 gold = lin(vec3(.78, .6, .33));
    // a glint that runs outward along the scrolls with the music
    float a2 = arrv(uv); float run = a2 > .004 ? exp(-pow((fract(a2 * 2.2 - uFlow) - .5) * 9., 2.)) : 0.;
    vec3 gc = gold * (env * mix(1., .65, rough) * uI * ao + key * .14 * lightC + spec * sh * lightC * (1. + run * .6) + run * .07)
            + lin(vec3(1., .92, .75)) * pow(spec, 1.6) * sh * .05;
    gc += gold * lin(vec3(.55, .25, .15)) * .1 * (1. - ao);    // red bole glowing faintly in the deepest cuts
    col = mix(col, gc, gl2);
  }
  col = col * (2.51 * col + .03) / (col * (2.43 * col + .59) + .14);
  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), 1.);
}`;
function heavenScene(t, dt, box) {
  const h = box.h, w = Math.min(box.w, h * 0.66), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  if (PAINT.gl === null) paintSetup();
  if (!PAINT.gl) { g.fillStyle = "#C9B07A"; g.fillRect(x0, y0, w, h); return; }
  const key = Math.round(w * DPR) + "x" + Math.round(h * DPR);
  if (heaven.key !== key) {
    heaven.key = key; const L = baroqueBuild(Math.round(w * DPR) / DPR, Math.round(h * DPR) / DPR, DPR);
    heaven.tH = manuTex(L.h, heaven.tH); heaven.tM = manuTex(L.m, heaven.tM);
  }
  // coming back to this piece: the ornament unfurls again from the cartouche
  if (t - heaven.lastT > 1.5) heaven.rev = 0.25;
  heaven.lastT = t;
  const energy = Math.min(1, S.mid * 0.7 + S.bass * 0.5 + S.pulse * 0.3);
  heaven.rev = Math.min(1.12, heaven.rev + dt * (0.02 + energy * 0.06));
  heaven.flow += dt * (0.03 + energy * 0.12);
  heaven.az += ((2.35 + Math.sin(t * 0.05) * 0.35 + (S.pitchOn ? (S.pitch - 1.5) * 0.08 : 0)) - heaven.az) * Math.min(1, dt * 0.6);
  heaven.li += ((0.9 + S.mid * 0.3 + S.pulse * 0.08) - heaven.li) * Math.min(1, dt * 1.4);
  r3Tex("baroque", BAROQUE_FS, { x: x0, y: y0, w, h }, { uT: t, uRev: heaven.rev, uFlow: heaven.flow, uAz: heaven.az, uEl: 0.62 + Math.sin(t * 0.031) * 0.06, uI: heaven.li, uFl: (noise2(t * 3, 7.7) - 0.5) * 0.04 * (1 + S.high) }, { tH: heaven.tH, tM: heaven.tM });
}
