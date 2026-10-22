// ================================================================
// EXPERIMENT — 4iii as a real Gothic chapel in 3D (Three.js), shown only on chapel-3d.html.
// A thick limestone wall pierced by two lancet windows and a rose (plate tracery), its deep reveals
// and roll mouldings in real depth. The stained glass is lit from outside by the sun: the sunlight
// passes through it as a coloured beam (a projector light shaped and tinted by the glass itself),
// throws pools of jewel colour onto the stone, and shows as shafts in the faint haze of the nave,
// with dust drifting through them. A candle on the stone altar flickers warm against the cool daylight.
// The music only changes light: the glow of the glass, the strength of the beams, the dust, the flame.
// ================================================================
const CH3 = { ready: false };

// ---- the stained glass, painted once: medallions, mosaic grounds, borders, grisaille, lead cames ----
// window space in metres: two lancets and a rose
const CH3W = { L: [[-1.0, -0.15], [0.15, 1.0]], sill: 2.3, spring: 4.5, rose: [0, 5.85, 0.45], box: [-1.05, 2.25, 1.05, 6.35] };
function ch3Lancet(P, a, b) { const w = b - a, s = CH3W.spring; P.moveTo(a, CH3W.sill); P.lineTo(b, CH3W.sill); P.lineTo(b, s); P.absarc(a, s, w, 0, Math.PI / 3, false); P.absarc(b, s, w, Math.PI * 2 / 3, Math.PI, false); P.lineTo(a, CH3W.sill); }
function ch3Glass(ppm) {
  const [bx0, by0, bx1, by1] = CH3W.box, W = Math.round((bx1 - bx0) * ppm), H = Math.round((by1 - by0) * ppm);
  const c = casaCv(W, H), x = c.getContext("2d"), r = seeded(1209);
  const X = v => (v - bx0) * ppm, Y = v => (by1 - v) * ppm;
  const RUBY = [148, 18, 28], BLUE = [26, 48, 138], GREEN = [38, 104, 58], GOLD = [206, 152, 40], WHITE = [212, 214, 196], PURPLE = [92, 40, 96];
  const tintC = (c, k = 30) => { const v = 0.7 + r() * 0.45; return `rgb(${c.map(q => Math.max(0, Math.min(255, Math.round(q * v + (r() - 0.5) * k)))).join(",")})`; };
  const piece = (path, col) => { x.beginPath(); path(); const gr = x.createLinearGradient(0, 0, ppm * 0.2, ppm * 0.3); x.fillStyle = tintC(col); x.fill(); };
  const lead = (path, wd = 0.012) => { x.beginPath(); path(); x.strokeStyle = "rgb(18,16,14)"; x.lineWidth = wd * ppm; x.lineJoin = "round"; x.stroke(); };
  const paintLine = (fn, wd = 0.006) => { x.beginPath(); fn(); x.strokeStyle = "rgba(48,30,16,0.75)"; x.lineWidth = wd * ppm; x.lineCap = "round"; x.stroke(); };
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  for (const [a, b] of CH3W.L) {
    const cx = (a + b) / 2, hw = (b - a) / 2, bd = 0.075;
    x.save(); x.beginPath(); const P = { moveTo: (p, q) => x.moveTo(X(p), Y(q)), lineTo: (p, q) => x.lineTo(X(p), Y(q)), absarc: (p, q, rr, s0, s1) => x.arc(X(p), Y(q), rr * ppm, -s0, -s1, true) };
    ch3Lancet(P, a, b); x.clip();
    // mosaic ground: blue diamond quarries with small ruby squares at the crossings
    const q = 0.075;
    for (let yy = CH3W.sill - q; yy < CH3W.spring + 0.9; yy += q / 2) for (let xx = a - q; xx < b + q; xx += q) {
      const ox = xx + ((Math.round((yy - CH3W.sill) / (q / 2)) % 2) ? q / 2 : 0);
      const J = (vx, vy) => { const kx = Math.round(vx * 1000), ky = Math.round(vy * 1000); return [vx + (hash2(kx, ky) - 0.5) * q * 0.3, vy + (hash2(ky, kx) - 0.5) * q * 0.3]; };
      const V = [J(ox, yy + q / 2), J(ox + q / 2, yy), J(ox, yy - q / 2), J(ox - q / 2, yy)];
      const dia = () => { x.moveTo(X(V[0][0]), Y(V[0][1])); for (let i = 1; i < 4; i++) x.lineTo(X(V[i][0]), Y(V[i][1])); x.closePath(); };
      piece(dia, r() < 0.08 ? PURPLE : BLUE); lead(dia, 0.008);
      const sq = () => { x.rect(X(ox + q / 2 - 0.012), Y(yy + 0.012), 0.024 * ppm, 0.024 * ppm); }; piece(sq, RUBY); lead(sq, 0.005);
    }
    // three medallions down each lancet
    [2.85, 3.65, 4.45].forEach((my, k) => {
      const R = hw - bd - 0.05;
      // the medallion's frame: a band of small alternating pieces between two leads
      for (let i = 0; i < 20; i++) { const a0 = i * TAU / 20, a1 = (i + 1) * TAU / 20, seg = () => { x.arc(X(cx), Y(my), R * ppm, -a0, -a1, true); x.arc(X(cx), Y(my), (R - 0.03) * ppm, -a1, -a0, false); x.closePath(); };
        piece(seg, [WHITE, GOLD, WHITE, GREEN][i % 4]); lead(seg, 0.007); }
      const inner = () => x.arc(X(cx), Y(my), (R - 0.03) * ppm, 0, TAU);
      piece(inner, k === 1 ? BLUE : RUBY); lead(inner);
      // a rosette of eight petals, each painted with veins, round a ring of small pieces
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + (k % 2) * 0.39, R2 = R - 0.05;
        const pt = () => { const px0 = cx + Math.cos(an) * R2 * 0.22, py0 = my + Math.sin(an) * R2 * 0.22, px1 = cx + Math.cos(an) * R2 * 0.95, py1 = my + Math.sin(an) * R2 * 0.95, nx = -Math.sin(an) * R2 * 0.24, ny = Math.cos(an) * R2 * 0.24;
          x.moveTo(X(px0), Y(py0)); x.quadraticCurveTo(X((px0 + px1) / 2 + nx), Y((py0 + py1) / 2 + ny), X(px1), Y(py1)); x.quadraticCurveTo(X((px0 + px1) / 2 - nx), Y((py0 + py1) / 2 - ny), X(px0), Y(py0)); };
        piece(pt, [GREEN, GOLD, PURPLE, GOLD][(i + k) % 4]); lead(pt, 0.008);
        for (const sd of [-1, 0, 1]) paintLine(() => { x.moveTo(X(cx + Math.cos(an) * R2 * 0.3), Y(my + Math.sin(an) * R2 * 0.3)); x.lineTo(X(cx + Math.cos(an + sd * 0.12) * R2 * 0.8), Y(my + Math.sin(an + sd * 0.12) * R2 * 0.8)); }, 0.003); }
      for (let i = 0; i < 10; i++) { const a0 = i * TAU / 10, a1 = (i + 1) * TAU / 10, seg = () => { x.arc(X(cx), Y(my), R * 0.24 * ppm, -a0, -a1, true); x.arc(X(cx), Y(my), R * 0.13 * ppm, -a1, -a0, false); x.closePath(); };
        piece(seg, i % 2 ? WHITE : RUBY); lead(seg, 0.006); }
      const ctr = () => x.arc(X(cx), Y(my), R * 0.13 * ppm, 0, TAU); piece(ctr, GOLD); lead(ctr);
      paintLine(() => { x.arc(X(cx), Y(my), R * 0.07 * ppm, 0, TAU); }, 0.004);
    });
    // border: small alternating pieces, with a painted vine
    for (const side of [-1, 1]) {
      const bx = side < 0 ? a : b - bd;
      for (let yy = CH3W.sill; yy < CH3W.spring + 0.75; yy += 0.09) {
        const pc = () => x.rect(X(bx), Y(yy + 0.09), bd * ppm, 0.09 * ppm); piece(pc, [WHITE, GOLD, RUBY][Math.floor(r() * 3)]); lead(pc, 0.008);
        paintLine(() => { x.moveTo(X(bx + bd * 0.2), Y(yy)); x.quadraticCurveTo(X(bx + bd * 0.9), Y(yy + 0.045), X(bx + bd * 0.2), Y(yy + 0.09)); }, 0.004);
      }
    }
    x.restore();
    x.beginPath(); ch3Lancet(P, a, b); x.strokeStyle = "rgb(18,16,14)"; x.lineWidth = 0.02 * ppm; x.stroke();
    // iron saddle bars across the light
    for (const yy of [3.25, 4.05]) { x.fillStyle = "rgb(14,12,10)"; x.fillRect(X(a), Y(yy) - 0.008 * ppm, (b - a) * ppm, 0.016 * ppm); }
  }
  // the rose: eight petals round a centre
  const [rx, ry, rr] = CH3W.rose;
  x.save(); x.beginPath(); x.arc(X(rx), Y(ry), rr * ppm, 0, TAU); x.clip();
  const bg = () => x.arc(X(rx), Y(ry), rr * ppm, 0, TAU); piece(bg, BLUE);
  for (let i = 0; i < 8; i++) { const an = i * TAU / 8, pt = () => x.ellipse(X(rx + Math.cos(an) * rr * 0.55), Y(ry + Math.sin(an) * rr * 0.55), rr * 0.36 * ppm, rr * 0.18 * ppm, -an, 0, TAU);
    piece(pt, i % 2 ? RUBY : GOLD); lead(pt); paintLine(() => { x.moveTo(X(rx + Math.cos(an) * rr * 0.3), Y(ry + Math.sin(an) * rr * 0.3)); x.lineTo(X(rx + Math.cos(an) * rr * 0.8), Y(ry + Math.sin(an) * rr * 0.8)); }); }
  const ctr = () => x.arc(X(rx), Y(ry), rr * 0.2 * ppm, 0, TAU); piece(ctr, WHITE); lead(ctr);
  x.restore();
  x.beginPath(); x.arc(X(rx), Y(ry), rr * ppm, 0, TAU); x.strokeStyle = "rgb(18,16,14)"; x.lineWidth = 0.02 * ppm; x.stroke();
  // grisaille matting: the glass painter's thin brown wash, wiped back in the middle of each piece
  x.globalCompositeOperation = "multiply";
  for (let i = 0; i < 2200; i++) { const px = r() * W, py = r() * H, rad = (0.01 + r() * 0.03) * ppm, gr = x.createRadialGradient(px, py, 0, px, py, rad);
    gr.addColorStop(0, "rgba(120,100,80,0.0)"); gr.addColorStop(1, "rgba(120,100,80,0.18)"); x.fillStyle = gr; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); }
  x.globalCompositeOperation = "source-over";
  // the uneven density of old glass: streaks and darker patches, painted into the colour itself
  const img = x.getImageData(0, 0, W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 4, n = 0.82 + 0.3 * fbm(i / 40, j / 40) + 0.08 * (fbm(i / 6, j / 90) - 0.5), l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11);
    for (let c2 = 0; c2 < 3; c2++) d[k + c2] = (d[k + c2] * 0.86 + l * 0.14) * n;
  }
  x.putImageData(img, 0, 0);
  return c;
}

// ---- stone: limestone ashlar, every block cut and weathered on its own ----
function ch3Stone(wM, hM, seed, ppm = 120) {
  const T = THREE, w = Math.round(wM * ppm), h = Math.round(hM * ppm);
  const C = casaCv(w, h), Hh = casaCv(w, h), R = casaCv(w, h), c = C.getContext("2d"), hh = Hh.getContext("2d"), rr = R.getContext("2d"), r = seeded(seed);
  c.fillStyle = "rgb(150,142,128)"; c.fillRect(0, 0, w, h); hh.fillStyle = "rgb(70,70,70)"; hh.fillRect(0, 0, w, h); rr.fillStyle = "rgb(235,235,235)"; rr.fillRect(0, 0, w, h);
  const j = 0.008 * ppm;
  for (let y = h; y > 0;) {
    const ch = (0.3 + r() * 0.16) * ppm; let xx = -r() * 0.5 * ppm;
    while (xx < w) {
      const bw = (0.45 + r() * 0.5) * ppm, k = 0.86 + r() * 0.18, warm = r() * 10;
      c.fillStyle = `rgb(${Math.round((196 + warm) * k)},${Math.round(188 * k)},${Math.round((170 - warm) * k)})`; c.fillRect(xx + j / 2, y - ch + j / 2, bw - j, ch - j);
      hh.fillStyle = `rgb(${200 + Math.round(r() * 30)},0,0)`.replace(/rgb\((\d+),0,0\)/, (m, v) => `rgb(${v},${v},${v})`); hh.fillRect(xx + j / 2, y - ch + j / 2, bw - j, ch - j);
      // tooling: fine diagonal claw marks, and the odd chipped arris
      hh.strokeStyle = "rgba(160,160,160,0.5)"; hh.lineWidth = 1; hh.beginPath();
      for (let s = 0; s < bw * ch / 400; s++) { const px = xx + r() * bw, py = y - ch + r() * ch; hh.moveTo(px, py); hh.lineTo(px + ch * 0.12, py - ch * 0.12); } hh.stroke();
      for (let s = 0; s < 3; s++) { hh.fillStyle = "rgb(110,110,110)"; hh.beginPath(); hh.arc(xx + (r() < 0.5 ? j : bw - j), y - ch + r() * ch, 1 + r() * 3, 0, TAU); hh.fill(); }
      rr.fillStyle = `rgb(${205 + Math.round(r() * 35)},0,0)`.replace(/rgb\((\d+),0,0\)/, (m, v) => `rgb(${v},${v},${v})`); rr.fillRect(xx, y - ch, bw, ch);
      xx += bw;
    }
    y -= ch;
  }
  casaGrain(c, w, h, 14, 0.1, seed); casaGrain(c, w, h, 3, 0.04, seed + 1);
  // a little darker low down, where centuries of damp and hands have touched it
  const gr = c.createLinearGradient(0, h, 0, h * 0.7); gr.addColorStop(0, "rgba(60,50,40,0.25)"); gr.addColorStop(1, "rgba(60,50,40,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  const tex = (cv, srgb) => { const t = new T.CanvasTexture(cv); t.anisotropy = CH3.aniso; t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  return { map: tex(C, true), normalMap: tex(casaNormal(Hh, 3)), roughnessMap: tex(R) };
}

function ch3Build() {
  const T = THREE, scene = new T.Scene();
  const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  CH3.aniso = r.capabilities.getMaxAnisotropy(); CASA.aniso = CH3.aniso;
  scene.background = new T.Color(0x0b0a09);
  const add = (geo, mat, x, y, z, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m; };

  // a quiet interior environment for reflections: dim stone, the bright window, the warm candle
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(20, 32, 16), new T.MeshBasicMaterial({ color: 0x15130f, side: T.BackSide })));
  const wpl = new T.Mesh(new T.PlaneGeometry(4, 6), new T.MeshBasicMaterial({ color: 0x9fb4d8 })); wpl.position.set(0, 4, -12); env.add(wpl);
  const cpl = new T.Mesh(new T.SphereGeometry(0.6), new T.MeshBasicMaterial({ color: 0xffb060 })); cpl.position.set(-3, 1, 8); env.add(cpl);
  scene.environment = new T.PMREMGenerator(r).fromScene(env, 0.04).texture;

  // ---- the wall: 1 m of limestone with the openings cut clean through ----
  const WW = 9, WH = 9, depth = 1.0, stone = ch3Stone(WW, WH, 71);
  [stone.map, stone.normalMap, stone.roughnessMap].forEach(t => { t.repeat.set(1 / WW, 1 / WH); t.offset.set(0.5, 0); });
  const stoneMat = new T.MeshStandardMaterial({ map: stone.map, normalMap: stone.normalMap, roughnessMap: stone.roughnessMap, roughness: 1, envMapIntensity: 0.12 });
  const wallShape = new T.Shape(); wallShape.moveTo(-WW / 2, 0); wallShape.lineTo(WW / 2, 0); wallShape.lineTo(WW / 2, WH); wallShape.lineTo(-WW / 2, WH); wallShape.closePath();
  for (const [a, b] of CH3W.L) { const hp = new T.Path(); ch3Lancet(hp, a, b); wallShape.holes.push(hp); }
  const rh = new T.Path(); rh.absarc(CH3W.rose[0], CH3W.rose[1], CH3W.rose[2], 0, TAU, true); wallShape.holes.push(rh);
  // the deep reveal would swallow a high sun; the cookie already masks the light to the glass, so the wall only receives
  const wall = add(new T.ExtrudeGeometry(wallShape, { depth, bevelEnabled: false, curveSegments: 48 }), stoneMat, 0, 0, -depth, { cast: false });
  // roll mouldings round each opening and a hood mould over the whole window
  const ring = (pts, rad, z) => add(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false), 160, rad, 10, false), stoneMat, 0, 0, z);
  const archPts = (a, b, s, base, out) => { const w = b - a, P = []; P.push(new T.Vector3(a - out, base, 0));
    for (let i = 0; i <= 40; i++) { const an = Math.PI - (Math.PI / 3) * (i / 40); P.push(new T.Vector3(b + Math.cos(an) * (w + out), s + Math.sin(an) * (w + out), 0)); }
    for (let i = 0; i <= 40; i++) { const an = Math.PI / 3 - (Math.PI / 3) * (i / 40); P.push(new T.Vector3(a + Math.cos(an) * (w + out), s + Math.sin(an) * (w + out), 0)); }
    P.push(new T.Vector3(b + out, base, 0)); return P; };
  for (const [a, b] of CH3W.L) ring(archPts(a, b, CH3W.spring, CH3W.sill, 0.05), 0.045, 0.02);
  ring(Array.from({ length: 81 }, (_, i) => { const an = i / 80 * TAU; return new T.Vector3(CH3W.rose[0] + Math.cos(an) * (CH3W.rose[2] + 0.05), CH3W.rose[1] + Math.sin(an) * (CH3W.rose[2] + 0.05), 0); }), 0.045, 0.02);
  ring(archPts(-1.3, 1.3, CH3W.spring, CH3W.sill - 0.05, 0.0), 0.07, 0.05);
  // the sill: a sloping stone ledge inside the window, and a string course along the wall below it
  add(new T.BoxGeometry(2.5, 0.12, 0.3), stoneMat, 0, CH3W.sill - 0.06, 0.13);
  add(new T.BoxGeometry(WW, 0.16, 0.12), stoneMat, 0, CH3W.sill - 0.5, 0.06);
  // floor of worn stone flags
  const fl = ch3Stone(10, 10, 72, 70);
  [fl.map, fl.normalMap, fl.roughnessMap].forEach(t => t.repeat.set(1, 1));
  const floor = add(new T.PlaneGeometry(10, 10), new T.MeshStandardMaterial({ map: fl.map, normalMap: fl.normalMap, roughness: 0.62, envMapIntensity: 0.5 }), 0, 0, 5, { cast: false }); floor.rotation.x = -Math.PI / 2;

  // ---- the glass, set deep in the wall towards the outside ----
  const glassCv = ch3Glass(360), glassTex = new T.CanvasTexture(glassCv); glassTex.encoding = T.sRGBEncoding; glassTex.anisotropy = CH3.aniso;
  const [bx0, by0, bx1, by1] = CH3W.box;
  CH3.glassU = { tGlass: { value: glassTex }, uSky: { value: 1 }, uT: { value: 0 } };
  const glassMat = new T.ShaderMaterial({ uniforms: CH3.glassU, side: T.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = vec2((position.x - ${bx0.toFixed(3)}) / ${(bx1 - bx0).toFixed(3)}, (position.y - ${by0.toFixed(3)}) / ${(by1 - by0).toFixed(3)}); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tGlass; uniform float uSky, uT; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 q = vUv * vec2(${(bx1 - bx0).toFixed(3)}, ${(by1 - by0).toFixed(3)});      // metres
        vec2 wob = vec2(n2(q * 9.), n2(q * 9. + 7.)) - .5;                             // blown glass bends the light a little
        vec3 g = texture2D(tGlass, vUv + wob * .0016).rgb;
        float thick = .82 + .3 * n2(q * 3.5) + .08 * n2(vec2(q.x * 40., q.y * 4.));    // thicker and thinner, streaky
        float seed = smoothstep(.9965, 1., h(floor(q * 260.)));                          // tiny trapped bubbles
        vec3 sky = vec3(.92, .97, 1.06) * 1.35 * uSky;                                   // daylight behind it
        float pit = smoothstep(.55, .8, n2(q * 1.3 + 20.)) * smoothstep(.985, 1., h(floor(q * 400.)));  // weathering pits from outside
        vec3 c = g * thick * sky * (1. - pit * .7) + seed * g * 1.5;
        c += vec3(.05, .045, .04) * pow(n2(q * 2. + uT * .02), 6.);                    // a faint reflection from inside
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }` });
  const gshape = new T.Shape(); ch3Lancet(gshape, CH3W.L[0][0], CH3W.L[0][1]);
  const gshape2 = new T.Shape(); ch3Lancet(gshape2, CH3W.L[1][0], CH3W.L[1][1]);
  const gshape3 = new T.Shape(); gshape3.absarc(CH3W.rose[0], CH3W.rose[1], CH3W.rose[2], 0, TAU, false);
  [gshape, gshape2, gshape3].forEach(s => add(new T.ShapeGeometry(s, 48), glassMat, 0, 0, -0.3, { cast: false }));

  // ---- the sun through the glass: a projector light shaped and coloured by the window ----
  const sunDir = new T.Vector3(0.12, -0.88, 0.4).normalize();
  const wc = new T.Vector3(0, 4.3, -0.3);
  const sun = new T.SpotLight(0xfff2dc, 7.0, 0, 0.12, 0.0, 0);
  sun.position.copy(wc).addScaledVector(sunDir, -22); sun.target.position.copy(wc); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 12; sun.shadow.camera.far = 40; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
  const VP = new T.Matrix4().multiplyMatrices(sun.shadow.camera.projectionMatrix, sun.shadow.camera.matrixWorldInverse);
  // draw the cookie: the glass as seen from the sun (black wherever there is no opening)
  const CS = 1024, cookie = casaCv(CS, CS), cx = cookie.getContext("2d");
  cx.fillStyle = "#000"; cx.fillRect(0, 0, CS, CS);
  const proj = (x, y) => { const v = new T.Vector3(x, y, -0.3).applyMatrix4(VP); return [(v.x * 0.5 + 0.5) * CS, (1 - (v.y * 0.5 + 0.5)) * CS]; };
  const p0 = proj(bx0, by1), p1 = proj(bx1, by1), p2 = proj(bx0, by0);
  cx.save(); cx.setTransform((p1[0] - p0[0]) / glassCv.width, (p1[1] - p0[1]) / glassCv.width, (p2[0] - p0[0]) / glassCv.height, (p2[1] - p0[1]) / glassCv.height, p0[0], p0[1]);
  cx.filter = "brightness(1.8) saturate(1.25)"; cx.drawImage(glassCv, 0, 0); cx.restore();
  const cookieTex = new T.CanvasTexture(cookie); cookieTex.encoding = T.sRGBEncoding; sun.map = cookieTex;
  CH3.sun = sun; CH3.VP = VP;

  // soft daylight from the window filling the embrasure and the wall, and the dim nave
  const fill = new T.PointLight(0xb8c8e8, 0.3, 8, 2); fill.position.set(0, 4.3, 0.6); scene.add(fill);
  scene.add(new T.HemisphereLight(0x9aa6b8, 0x2a2420, 0.05));
  // light bouncing up off the coloured pool on the floor: the only thing that reaches the altar front
  const bounce = new T.PointLight(0xa89cc0, 0.35, 5, 2); bounce.position.set(0.5, 0.25, 2.6); scene.add(bounce); CH3.bounce = bounce;

  // ---- shafts of light in the haze: thin glowing slices that pick up the window's colours ----
  CH3.shaftU = { tCookie: { value: cookieTex }, uVP: { value: VP }, uI: { value: 1 }, uT: { value: 0 } };
  const shaftMat = new T.ShaderMaterial({ uniforms: CH3.shaftU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tCookie; uniform mat4 uVP; uniform float uI, uT; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        vec4 c = uVP * vec4(vW, 1.); vec2 uv = c.xy / c.w * .5 + .5;
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1. || vW.y < 0.) discard;
        vec3 col = texture2D(tCookie, uv).rgb;
        float haze = .55 + .45 * n3(vW * 1.6 + vec3(uT * .03, uT * .01, 0.)) * n3(vW * .7 - vec3(0., uT * .02, 0.));
        float fade = exp(-vW.z * .22) * smoothstep(0., .5, vW.z);
        gl_FragColor = vec4(col * haze * fade * .05 * uI, 1.);
      }` });
  for (let i = 0; i < 40; i++) { const z = 0.05 + i * 0.12; add(new T.PlaneGeometry(9, 9), shaftMat, 0, 4.5, z, { cast: false }).receiveShadow = false; }

  // ---- dust drifting through the beams ----
  const ND = 900, dpos = new Float32Array(ND * 3), rs = seeded(5);
  for (let i = 0; i < ND; i++) { dpos[i * 3] = (rs() - 0.5) * 3.2; dpos[i * 3 + 1] = rs() * 5.5; dpos[i * 3 + 2] = rs() * 4; }
  const dg = new T.BufferGeometry(); dg.setAttribute("position", new T.BufferAttribute(dpos, 3));
  CH3.dustU = { tCookie: { value: cookieTex }, uVP: { value: VP }, uT: { value: 0 }, uI: { value: 1 }, uPx: { value: 2 } };
  const dust = new T.Points(dg, new T.ShaderMaterial({ uniforms: CH3.dustU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `uniform mat4 uVP; uniform float uT, uPx; uniform sampler2D tCookie; varying vec3 vC;
      void main(){ vec3 p = position; float s = fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5);
        p += vec3(sin(uT * .13 + s * 40.) * .25, mod(uT * .02 * (.5 + s), 5.5) - fract(s * 7.) * .2, cos(uT * .11 + s * 30.) * .2);
        p.y = mod(p.y, 5.5);
        vec4 c = uVP * vec4(p, 1.); vec2 uv = c.xy / c.w * .5 + .5;
        vC = (uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1.) ? texture2D(tCookie, uv).rgb : vec3(0.);
        vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (1.2 + s) * 4. / -mv.z; }`,
    fragmentShader: `uniform float uI; varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vC * (1. - d * 2.) * .9 * uI, 1.); }` }));
  scene.add(dust);

  // ---- the altar: a stone table with mouldings, a linen cloth ----
  const az = 1.05;
  add(new T.BoxGeometry(1.7, 0.92, 0.8), stoneMat, 0, 0.46, az);
  add(new T.BoxGeometry(1.86, 0.1, 0.95), stoneMat, 0, 0.97, az);
  add(new T.BoxGeometry(1.84, 0.12, 0.92), stoneMat, 0, 0.06, az);
  const linenCv = casaCv(256, 256), lc = linenCv.getContext("2d"); lc.fillStyle = "rgb(232,228,214)"; lc.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) { lc.fillStyle = "rgba(0,0,0,0.035)"; lc.fillRect(i, 0, 1, 256); lc.fillRect(0, i, 256, 1); }
  const linenTex = new T.CanvasTexture(linenCv); linenTex.encoding = T.sRGBEncoding; linenTex.wrapS = linenTex.wrapT = T.RepeatWrapping; linenTex.repeat.set(6, 6);
  const linen = new T.MeshStandardMaterial({ map: linenTex, roughness: 0.85, envMapIntensity: 0.3 });
  add(new T.BoxGeometry(1.9, 0.012, 0.97), linen, 0, 1.026, az);
  const front = new T.PlaneGeometry(1.9, 0.34, 60, 4), fp = front.attributes.position;
  for (let i = 0; i < fp.count; i++) { const xx = fp.getX(i), yy = fp.getY(i); fp.setZ(i, Math.sin(xx * 9) * 0.008 * (0.17 - yy)); }
  front.computeVertexNormals(); add(front, linen, 0, 1.03 - 0.17, az + 0.487);
  // a brass cross on a stepped foot, a little to the right
  const brass = new T.MeshStandardMaterial({ color: 0xb08a3a, metalness: 1, roughness: 0.3 });
  const cX = 0.32, cZ = az - 0.05, top = 1.032;
  add(new T.BoxGeometry(0.2, 0.04, 0.2), brass, cX, top + 0.02, cZ); add(new T.BoxGeometry(0.13, 0.04, 0.13), brass, cX, top + 0.06, cZ);
  add(new T.BoxGeometry(0.035, 0.6, 0.035), brass, cX, top + 0.38, cZ); add(new T.BoxGeometry(0.34, 0.035, 0.035), brass, cX, top + 0.52, cZ);
  for (const [dx, dy] of [[0, 0.68], [0.17, 0.52], [-0.17, 0.52]]) add(new T.SphereGeometry(0.03, 20, 12), brass, cX + dx, top + dy, cZ);
  // the candle on a turned brass stick, to the left
  const kX = -0.42, kZ = az - 0.02;
  add(new T.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.015], [0.04, 0.04], [0.02, 0.1], [0.028, 0.16], [0.016, 0.22], [0.045, 0.25], [0.045, 0.265], [0, 0.265]].map(([a, b]) => new T.Vector2(a, b)), 32), brass, kX, top, kZ);
  const wax = new T.MeshStandardMaterial({ color: 0xefe7d4, roughness: 0.45, emissive: 0xffa040, emissiveIntensity: 0.04, envMapIntensity: 0.3 });
  add(new T.CylinderGeometry(0.027, 0.03, 0.3, 24), wax, kX, top + 0.265 + 0.15, kZ);
  const fy = top + 0.265 + 0.3 + 0.035;
  CH3.flameU = { uT: { value: 0 }, uF: { value: 1 } };
  const flame = new T.Mesh(new T.PlaneGeometry(0.045, 0.1), new T.ShaderMaterial({ uniforms: CH3.flameU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uT, uF; varying vec2 vUv;
      void main(){ vec2 p = vUv - vec2(.5, .3); p.x += sin(uT * 9. + p.y * 6.) * .03 * p.y * uF;
        float r = length(vec2(p.x * 2.6, p.y > 0. ? p.y * (1.1 - p.y) : p.y * 3.)); float body = smoothstep(.36, .05, r);
        vec3 c = mix(vec3(1., .45, .1), vec3(1., .92, .7), smoothstep(.25, .02, r)); c = mix(c, vec3(.3, .4, 1.), smoothstep(.0, -.15, p.y) * .5);
        gl_FragColor = vec4(c * body * 2.4 * uF, 1.); }` }));
  flame.position.set(kX, fy, kZ); scene.add(flame);
  add(new T.CylinderGeometry(0.0025, 0.0025, 0.025, 6), new T.MeshBasicMaterial({ color: 0x1a120a }), kX, fy - 0.03, kZ, { cast: false });
  const candle = new T.PointLight(0xffa54f, 0.9, 4.5, 2); candle.position.set(kX, fy + 0.02, kZ + 0.04);
  candle.castShadow = true; candle.shadow.mapSize.set(1024, 1024); candle.shadow.bias = -0.002; candle.shadow.radius = 4; scene.add(candle);
  CH3.candle = candle; CH3.flame = flame;

  const cam = new T.PerspectiveCamera(50, 0.62, 0.1, 60);
  cam.position.set(0, 2.8, 8.2); cam.lookAt(0, 2.95, 0);
  Object.assign(CH3, { r, scene, cam, ready: true, glow: 1, fl: 1 });
}

function chapel3dScene(t, dt, box) {
  if (typeof THREE === "undefined") return;
  if (!CH3.ready) ch3Build();
  const h = box.h, w = Math.min(box.w, h * 0.62), x0 = Math.round((box.x + (box.w - w) / 2) * DPR) / DPR, y0 = box.y;
  const k = Math.min(DPR, Math.sqrt(4.5e6 / (w * h))), pw = Math.round(w * k), ph = Math.round(h * k);
  if (CH3.pw !== pw || CH3.ph !== ph) { CH3.pw = pw; CH3.ph = ph; CH3.r.setSize(pw, ph, false); CH3.cam.aspect = pw / ph; CH3.cam.updateProjectionMatrix(); }
  // the music changes only the light: the glass breathes brighter, the beams and dust with it; the flame quickens
  const cloud = 0.88 + 0.12 * noise2(t * 0.05, 3.1);   // a cloud passing slowly over the sun
  CH3.glow += ((0.85 + S.mid * 0.4 + S.pulse * 0.15) * cloud - CH3.glow) * Math.min(1, dt * 1.2);
  const flick = 1 + (noise2(t * 7, 1.3) - 0.5) * (0.18 + S.high * 0.5) + (noise2(t * 23, 4.2) - 0.5) * 0.06;
  CH3.fl += (flick - CH3.fl) * Math.min(1, dt * 20);
  CH3.glassU.uSky.value = CH3.glow; CH3.glassU.uT.value = t;
  CH3.sun.intensity = 7.0 * CH3.glow;
  CH3.bounce.intensity = 0.35 * CH3.glow;
  CH3.shaftU.uI.value = CH3.glow * (0.9 + S.bass * 0.3); CH3.shaftU.uT.value = t;
  CH3.dph = (CH3.dph || 0) + dt * (1 + S.bass * 0.6); CH3.dustU.uT.value = CH3.dph; CH3.dustU.uI.value = CH3.glow; CH3.dustU.uPx.value = pw / 400;
  CH3.candle.intensity = 0.9 * CH3.fl; CH3.flameU.uT.value = t; CH3.flameU.uF.value = CH3.fl;
  CH3.flame.quaternion.copy(CH3.cam.quaternion);
  CH3.r.render(CH3.scene, CH3.cam);
  g.drawImage(CH3.r.domElement, x0, y0, w, h);
}
