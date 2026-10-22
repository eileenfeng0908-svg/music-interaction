// ================================================================
// THE RAIN ROOM: three short films of rain, made with Three.js.
//   i    a field at night after an escape: heavy rain, a cold light behind, the figure in the centre
//   ii   drops falling on still water at dusk
//   iii  rain on a window, the street's lights blurred behind the glass
// Everything is drawn on its own WebGL canvas, then copied onto the page.
// ================================================================
const RAIN = {
  r: null, cv: null, w: 0, h: 0,
  lvl: 0, peak: 0.04, Es: 0, cool: 0, onset: 0, warm: 0, // what the music is doing
  flash: 0, pulses: [], nextBolt: 8, boltDir: null          // lightning
};

// --- listening: how loud (compared with the loudest recent moment), sudden attacks, warm or cold ---
function rainListen(dt) {
  let e = 0; for (let i = 0; i < 16; i++) e += S.spec[i];
  e = e / 16 + S.bass * 0.2;
  RAIN.peak = Math.max(0.03, e, RAIN.peak * Math.pow(0.96, dt));
  const lv = Math.min(1, e / RAIN.peak);
  RAIN.lvl += (lv - RAIN.lvl) * Math.min(1, dt * (lv > RAIN.lvl ? 5 : 1.2));
  RAIN.Es += (e - RAIN.Es) * Math.min(1, dt * 4);
  const flux = Math.max(0, e - RAIN.Es) / RAIN.peak;
  RAIN.cool -= dt;
  RAIN.onset = flux > 0.16 && RAIN.cool <= 0 ? flux : 0;
  if (RAIN.onset) RAIN.cool = 0.2;
  const bright = S.high / (S.mid + S.high + 0.02);
  const target = nowPlaying ? Math.min(1, 0.15 + RAIN.lvl * 0.7 - bright * 0.4) : 0;
  RAIN.warm += (target - RAIN.warm) * Math.min(1, dt * 0.25);
  // lightning is a few quick flickers that die away
  RAIN.flash = 0;
  RAIN.pulses = RAIN.pulses.filter(p => (p.a += dt) < 1.6);
  RAIN.pulses.forEach(p => { if (p.a > 0) RAIN.flash += p.k * Math.exp(-p.a * 9); });
}
function rainBolt(strength) {
  const k = 0.6 + strength;
  [0, 0.09 + Math.random() * 0.05, 0.22 + Math.random() * 0.12].forEach((d, i) => RAIN.pulses.push({ a: -d, k: k * [1, 0.6, 0.85][i] * (0.6 + Math.random() * 0.4) }));
  const az = -1.2 + Math.random() * 2.4;
  RAIN.boltDir = new THREE.Vector3(Math.sin(az), 0.35 + Math.random() * 0.3, -Math.cos(az)).normalize();
}
// notes the music has scheduled (the generated pieces), each one handed over once
function rainNotes(each) {
  const now = ctx ? ctx.currentTime : 0;
  while (NOTES.length && NOTES[0].t + 3 < now) NOTES.shift();
  for (const n of NOTES) if (!n.rain && n.t <= now + 0.3) { n.rain = 1; if (n.t > now - 0.5) each(n, n.t - now); }
}

// --- shared GLSL: hashes and noise ("hash without sine", MIT, Dave Hoskins) ---
const RAIN_GLSL = `
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
// rings on water: every cell of a grid gets a drop at its own moment, somewhere new each time.
// Returns the slope of the surface.
vec2 rings(vec2 q, float t, float density){
  vec2 id = floor(q), s = vec2(0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(i, j);
    float r1 = h12(c), per = 0.7 + r1 * 0.9, u = t / per + r1 * 13.1, cyc = floor(u), ph = fract(u);
    if (h12(c + cyc * 3.7) > density) continue;
    vec2 d = q - (c + 0.15 + 0.7 * h22(c + cyc * 1.7));
    float r = length(d) + 1e-4, x = r - ph * 0.95, fade = (1. - ph) * (1. - ph);
    s += d / r * sin(x * 31.) * exp(-x * x * 60.) * fade;
  }
  return s;
}`;
const RAIN_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// ---------- the shared camera back: renderer, render targets, film look ----------
function rainGL() {
  if (RAIN.r) return RAIN.r;
  const T = THREE, cv = document.createElement("canvas");
  const r = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: "high-performance" });
  r.setPixelRatio(1);
  RAIN.r = r; RAIN.cv = cv;
  RAIN.quadScene = new T.Scene(); RAIN.quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  RAIN.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); RAIN.quad.frustumCulled = false; RAIN.quadScene.add(RAIN.quad);
  const M = (fs, u) => new T.ShaderMaterial({ vertexShader: RAIN_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  RAIN.brightMat = M(`uniform sampler2D t; uniform float uTh; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh * 2.5, l), 1.); }`,
    { t: { value: null }, uTh: { value: 0.5 } });
  RAIN.blurMat = M(`uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb * .227;
      c += (texture2D(t, vUv + uDir * 1.385).rgb + texture2D(t, vUv - uDir * 1.385).rgb) * .316;
      c += (texture2D(t, vUv + uDir * 3.231).rgb + texture2D(t, vUv - uDir * 3.231).rgb) * .070;
      gl_FragColor = vec4(c, 1.); }`, { t: { value: null }, uDir: { value: new T.Vector2() } });
  RAIN.finalMat = M(RAIN_GLSL + `
    uniform sampler2D tCol, tDepth, tBloom, tBright; uniform vec2 uRes, uLightUV;
    uniform float uNear, uFar, uFocus, uAper, uAlphaDepth, uRays, uT, uWarm, uExpo, uHal, uSat;
    varying vec2 vUv;
    float depthAt(vec2 uv){ if (uAlphaDepth > .5) return texture2D(tCol, uv).a;
      float z = texture2D(tDepth, uv).x * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    float cocAt(float d){ return clamp(abs(d - uFocus) / max(d, 1e-3) * uAper, 0., 1.); }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    void main(){
      // depth of field: gather a disc of neighbours, each one only if its own blur reaches this pixel
      float d0 = depthAt(vUv), c0 = cocAt(d0), R = uRes.y * 0.016;
      vec3 acc = texture2D(tCol, vUv).rgb; float ws = 1.;
      if (uAper > 0.) for (int i = 1; i < 40; i++) {
        float fi = float(i), r = sqrt(fi / 39.) * R, a = fi * 2.39996;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
        float d = depthAt(uv), c = cocAt(d);
        float w = d < d0 ? clamp(c * R - r + 1., 0., 1.) : clamp(min(c, c0) * R - r + 1., 0., 1.);
        acc += texture2D(tCol, uv).rgb * w; ws += w;
      }
      vec3 col = acc / ws;
      vec3 bloom = texture2D(tBloom, vUv).rgb;
      col += bloom * 0.55 + bloom * vec3(0.22, 0.035, 0.) * uHal;    // halation: the red glow film gives bright edges
      if (uRays > 0.) {                                                 // light falling through the rain and mist
        vec2 dir = (uLightUV - vUv) / 32.; vec2 uv = vUv; float dec = 1.; vec3 sh = vec3(0);
        for (int i = 0; i < 32; i++) { uv += dir; sh += texture2D(tBright, clamp(uv, 0., 1.)).rgb * dec; dec *= 0.95; }
        col += sh / 32. * uRays;
      }
      col *= uExpo;
      col *= mix(vec3(0.88, 0.97, 1.12), vec3(1.1, 1.0, 0.86), uWarm);  // colour temperature
      float l = dot(col, vec3(.2126, .7152, .0722)); col = mix(vec3(l), col, uSat);
      col = aces(col);
      col = pow(col, vec3(1. / 2.2));
      col += vec3(0.010, 0.014, 0.020) * (1. - col);                    // shadows lifted a touch, cold
      vec2 q = vUv - .5; col *= 1. - dot(q, q) * 0.85;                   // vignette
      col += (h12(vUv * uRes + fract(uT * 7.13) * 431.) - .5) * 0.05;    // film grain
      gl_FragColor = vec4(col, 1.);
    }`, {
    tCol: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tBright: { value: null },
    uRes: { value: new T.Vector2() }, uLightUV: { value: new T.Vector2(.5, .7) },
    uNear: { value: 0.05 }, uFar: { value: 400 }, uFocus: { value: 4 }, uAper: { value: 0 }, uAlphaDepth: { value: 0 },
    uRays: { value: 0 }, uT: { value: 0 }, uWarm: { value: 0 }, uExpo: { value: 1 }, uHal: { value: 1 }, uSat: { value: 0.7 }
  });
  return r;
}
function rainTargets(w, h) {
  if (RAIN.w === w && RAIN.h === h) return;
  RAIN.w = w; RAIN.h = h;
  ["rt", "refl", "bright", "bA", "bB"].forEach(k => RAIN[k] && RAIN[k].dispose());
  const T = THREE, o = { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter };
  RAIN.rt = new T.WebGLRenderTarget(w, h, o);
  RAIN.rt.depthTexture = new T.DepthTexture(w, h); RAIN.rt.depthTexture.type = T.UnsignedIntType;
  RAIN.refl = new T.WebGLRenderTarget(w >> 1, h >> 1, o);
  RAIN.bright = new T.WebGLRenderTarget(w >> 1, h >> 1, o);
  RAIN.bA = new T.WebGLRenderTarget(w >> 2, h >> 2, o);
  RAIN.bB = new T.WebGLRenderTarget(w >> 2, h >> 2, o);
  RAIN.r.setSize(w, h, false);
}
function rainPass(mat, target) { RAIN.quad.material = mat; RAIN.r.setRenderTarget(target); RAIN.r.render(RAIN.quadScene, RAIN.quadCam); }
// bloom, light shafts, focus, grade: from RAIN.rt to the canvas
function rainFinish(t, o) {
  const r = RAIN.r, w = RAIN.w, h = RAIN.h;
  RAIN.brightMat.uniforms.t.value = RAIN.rt.texture; RAIN.brightMat.uniforms.uTh.value = o.th || 0.5;
  rainPass(RAIN.brightMat, RAIN.bright);
  const B = RAIN.blurMat.uniforms;
  [[RAIN.bright, RAIN.bA, 1, 0], [RAIN.bA, RAIN.bB, 0, 1], [RAIN.bB, RAIN.bA, 2.5, 0], [RAIN.bA, RAIN.bB, 0, 2.5]].forEach(([src, dst, x, y]) => {
    B.t.value = src.texture; B.uDir.value.set(x / (w >> 2), y / (h >> 2)); rainPass(RAIN.blurMat, dst);
  });
  const F = RAIN.finalMat.uniforms;
  F.tCol.value = RAIN.rt.texture; F.tDepth.value = RAIN.rt.depthTexture; F.tBloom.value = RAIN.bB.texture; F.tBright.value = RAIN.bright.texture;
  F.uRes.value.set(w, h); F.uT.value = t; F.uWarm.value = RAIN.warm;
  F.uAper.value = o.aper || 0; F.uFocus.value = o.focus || 1; F.uAlphaDepth.value = o.alphaDepth ? 1 : 0;
  F.uNear.value = o.near || 0.05; F.uFar.value = o.far || 400;
  F.uRays.value = o.rays || 0; if (o.lightUV) F.uLightUV.value.copy(o.lightUV);
  F.uExpo.value = o.expo || 1; F.uHal.value = o.hal == null ? 1 : o.hal; F.uSat.value = o.sat || 0.7;
  rainPass(RAIN.finalMat, null);
}
// the film's frame on the page: as wide as the room allows, never wider than cinemascope
function rainFrame(box) {
  const ar = Math.max(1, Math.min(2.39, box.w / box.h));
  let w = box.w, h = w / ar; if (h > box.h) { h = box.h; w = h * ar; }
  const x = box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
  const k = Math.min(DPR, 1.5, Math.sqrt(2.4e6 / (w * h)));
  return { x, y, w, h, pw: Math.max(64, Math.round(w * k)) & ~3, ph: Math.max(64, Math.round(h * k)) & ~3 };
}
function rainShow(f) {
  g.save(); g.shadowColor = "rgba(20,24,30,0.28)"; g.shadowBlur = 22; g.shadowOffsetY = 8;
  g.fillStyle = "#0b0d10"; g.fillRect(f.x, f.y, f.w, f.h); g.restore();
  g.drawImage(RAIN.cv, f.x, f.y, f.w, f.h);
}
function rainReady() { return typeof THREE !== "undefined"; }

// ================================================================
// FILM i: THE FIELD. A shallow creek in a field at night, storm overhead, a cold light behind.
// The figure stands in the centre. The pig is a real 3D model loaded from assets/pig.glb
// (or dropped onto the page); until there is one, the light waits for it.
// ================================================================
const FIELD = { ready: false };
function fieldSetup() {
  const T = THREE; rainGL();
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 2, 0.05, 400);
  const L = new T.Vector3(0.7, 2.6, -9);   // the light behind the figure
  const U = {
    uT: { value: 0 }, uRain: { value: 0.5 }, uFlash: { value: 0 }, uFlashDir: { value: new T.Vector3(0, 1, 0) },
    uLight: { value: L }, uLightCol: { value: new T.Color(0.72, 0.84, 1.0) }, uLightI: { value: 1 },
    uFogCol: { value: new T.Color(0.011, 0.014, 0.019) }, uFogD: { value: 0.04 }, uWind: { value: 0.8 }, uBass: { value: 0 },
    tRefl: { value: null }, uTexMat: { value: new T.Matrix4() }
  };
  const FOG = `uniform vec3 uFogCol, uLight, uLightCol; uniform float uFogD, uFlash, uLightI;
    vec3 fogIt(vec3 col, vec3 wp){ vec3 v = wp - cameraPosition; float d = length(v); v /= d;
      float f = 1. - exp(-d * uFogD * (1. + 0.5 * exp(-max(wp.y, 0.) * 0.8)));
      vec3 Ld = normalize(uLight - cameraPosition); float a = max(dot(v, Ld), 0.);
      vec3 fc = uFogCol * (1. + uFlash * 5.) + uLightCol * uLightI * (pow(a, 6.) * 0.09 + pow(a, 60.) * 0.35);
      return mix(col, fc, f); }`;
  const VDECL = `uniform vec3 uLight, uLightCol; uniform float uFlash, uLightI;` + RAIN_GLSL;
  const mat = (vs, fs, extra = {}) => new T.ShaderMaterial(Object.assign({ uniforms: U, vertexShader: VDECL + vs, fragmentShader: RAIN_GLSL + FOG + fs }, extra));
  const WVS = `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

  // sky: low storm cloud, thin where the light breaks through, lit from inside by lightning
  const sky = new T.Mesh(new T.SphereGeometry(200, 48, 24), mat(
    `varying vec3 vD; void main(){ vD = position; vec4 w = modelMatrix * vec4(position, 1.); gl_Position = projectionMatrix * viewMatrix * w; }`,
    `uniform float uT; uniform vec3 uFlashDir; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float el = max(d.y, 0.);
      vec2 cuv = d.xz / (el + 0.1);
      float c = fbm(cuv * 0.7 + vec2(uT * 0.02, uT * 0.008)); c = smoothstep(0.25, 0.85, c + 0.2 * fbm(cuv * 2.7 - uT * 0.035));
      vec3 Ld = normalize(uLight); float a = max(dot(d, Ld), 0.);
      vec3 col = mix(vec3(0.016, 0.020, 0.027), vec3(0.004, 0.005, 0.008), smoothstep(0., .4, el));
      col *= 0.7 + 0.6 * c;
      col += uLightCol * uLightI * (pow(a, 4.) * 0.04 + pow(a, 30.) * 0.35 + pow(a, 500.) * 4.) * (1.25 - c);
      col += vec3(0.55, 0.62, 0.8) * uFlash * (0.25 + c) * (0.25 + 1.4 * pow(max(dot(d, uFlashDir), 0.), 2.5));
      if (d.y < 0.) col = uFogCol * (1. + uFlash * 4.);
      gl_FragColor = vec4(col, 1.); }`, { side: T.BackSide, depthWrite: false }));
  scene.add(sky);

  // distant woods and the prison: dark shapes in the mist
  const ring = (radius, height, start, len, seed, dark) => {
    const m = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 160, 1, true, start, len), mat(WVS,
      `varying vec3 vW; varying vec2 vUv;
      void main(){ float top = 0.35 + 0.45 * fbm(vec2(vUv.x * ${(len * radius / 6).toFixed(1)}, ${seed}.)) + 0.2 * vnoise(vec2(vUv.x * ${(len * radius).toFixed(1)}, 3.));
        if (vUv.y > top) discard;
        gl_FragColor = vec4(fogIt(vec3(${dark}), vW), 1.); }`, { side: T.DoubleSide }));
    m.position.y = height / 2 - 0.3; scene.add(m);
  };
  ring(80, 8, 0, Math.PI * 2, 1, 0.003);
  ring(40, 4.5, Math.PI * 0.55, Math.PI * 0.9, 2, 0.004);
  ring(16, 1.8, Math.PI * 0.62, Math.PI * 0.76, 3, 0.005);
  const prisonMat = mat(WVS, `varying vec3 vW; void main(){ gl_FragColor = vec4(fogIt(vec3(0.006), vW), 1.); }`);
  const wall = new T.Mesh(new T.BoxGeometry(70, 9, 2), prisonMat); wall.position.set(-60, 4.3, -120); wall.rotation.y = 0.25; scene.add(wall);
  const tower = new T.Mesh(new T.BoxGeometry(4, 16, 4), prisonMat); tower.position.set(-42, 7.8, -116); scene.add(tower);
  const cap = new T.Mesh(new T.BoxGeometry(6, 2.6, 6), prisonMat); cap.position.set(-42, 16.9, -116); scene.add(cap);
  // the searchlight, sweeping slowly through the rain
  const beamGeo = new T.CylinderGeometry(0.3, 7, 80, 32, 1, true); beamGeo.translate(0, -40, 0);
  const beam = new T.Mesh(beamGeo, mat(WVS, `varying vec3 vW; varying vec2 vUv; uniform float uT;
    void main(){ float along = 1. - vUv.y; float n = 0.6 + 0.4 * fbm(vec2(vUv.x * 12., along * 6. - uT * 0.4));
      float edge = sin(vUv.x * 3.14159 * 2.); edge = 0.4 + 0.6 * edge * edge;
      gl_FragColor = vec4(vec3(0.55, 0.62, 0.7) * 0.05 * n * edge * exp(-along * 2.5), 1.); }`,
    { transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.position.set(-42, 17.5, -116); scene.add(beam);

  // the water: a shallow creek and muddy puddles, rain rings everywhere, the light's reflection broken up
  const water = new T.Mesh(new T.PlaneGeometry(400, 400, 1, 1), mat(
    `uniform mat4 uTexMat; varying vec3 vW; varying vec4 vRP;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vRP = uTexMat * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    `uniform float uT, uRain, uWind; uniform sampler2D tRefl; varying vec3 vW; varying vec4 vRP;
    void main(){
      float mud = smoothstep(0.42, 0.62, fbm(vW.xz * 0.22 + 4.) + 0.25 * smoothstep(3.5, 9., length(vW.xz)));
      vec2 s = rings(vW.xz * 3.2, uT, 0.3 + uRain * 0.7) * 0.22 + rings(vW.xz * 7.5 + 9., uT * 1.13, 0.2 + uRain * 0.8) * 0.12;
      s += (vec2(vnoise(vW.xz * 1.7 + uT * vec2(0.5, 0.2) * uWind), vnoise(vW.xz * 1.7 - uT * 0.3 + 5.)) - .5) * 0.07;
      s += (vec2(vnoise(vW.xz * 9.), vnoise(vW.xz * 9. + 3.)) - .5) * 0.25 * mud;   // the mud is rough
      vec3 n = normalize(vec3(-s.x, 1., -s.y)), v = normalize(cameraPosition - vW);
      float fres = 0.02 + 0.98 * pow(1. - max(dot(n, v), 0.), 5.);
      vec2 ruv = vRP.xy / vRP.w + n.xz * (0.05 + 0.15 * mud);
      vec3 refl = texture2D(tRefl, ruv).rgb;
      vec3 rd = reflect(-v, n), Ld = normalize(uLight - vW);
      float sp = pow(max(dot(rd, Ld), 0.), 900.) * 30. + pow(max(dot(rd, Ld), 0.), 60.) * 1.2;
      vec3 body = mix(vec3(0.006, 0.008, 0.008), vec3(0.016, 0.013, 0.010), mud);
      vec3 col = mix(body, refl, fres * (1. - 0.6 * mud)) + uLightCol * uLightI * sp * fres * (1. - 0.7 * mud);
      gl_FragColor = vec4(fogIt(col, vW), 1.); }`));
  water.rotation.x = -Math.PI / 2; scene.add(water);

  // reeds and long grass along the banks; the near ones fall out of focus
  const reedGeo = new T.InstancedBufferGeometry(); const pg = new T.PlaneGeometry(1, 1, 1, 8); pg.translate(0, 0.5, 0);
  reedGeo.index = pg.index; reedGeo.attributes.position = pg.attributes.position; reedGeo.attributes.uv = pg.attributes.uv;
  const reeds = [];
  const clump = (cx, cz, rx, rz, n, hMin, hMax) => { for (let i = 0; i < n; i++) reeds.push(cx + (Math.random() - .5) * rx, cz + (Math.random() - .5) * rz, hMin + Math.random() * (hMax - hMin), Math.random() * 6.28); };
  clump(-2.3, 1.9, 1.4, 1.6, 140, 0.5, 1.3); clump(2.4, 1.2, 1.2, 2.0, 120, 0.4, 1.1);
  clump(-3.6, -2.5, 3, 3, 160, 0.6, 1.5); clump(3.8, -3.5, 3.5, 3, 160, 0.6, 1.6); clump(0, -9, 14, 3, 260, 0.6, 1.4);
  clump(-1.7, 0.2, 0.6, 1.0, 40, 0.25, 0.7); clump(1.5, -0.8, 0.6, 0.8, 30, 0.25, 0.6);
  reedGeo.setAttribute("ins", new T.InstancedBufferAttribute(new Float32Array(reeds), 4));
  reedGeo.instanceCount = reeds.length / 4;
  const reedMesh = new T.Mesh(reedGeo, mat(
    `attribute vec4 ins; uniform float uT, uWind, uBass; varying vec3 vW; varying float vY;
    void main(){ float y = position.y; vY = y; float w = 0.012 * (1. - y * 0.9);
      float bend = (sin(uT * 1.1 + ins.w * 5.) * 0.06 + uWind * 0.12 + uBass * 0.12 * sin(uT * 6. + ins.w * 3.)) * y * y * ins.z;
      vec3 p = vec3(ins.x + position.x * w * 2. * cos(ins.w) + bend, y * ins.z, ins.y + position.x * w * 2. * sin(ins.w) + bend * 0.3);
      vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    `varying vec3 vW; varying float vY;
    void main(){ vec3 v = normalize(vW - cameraPosition), Ld = normalize(uLight - vW);
      vec3 col = vec3(0.010, 0.013, 0.010) + uLightCol * uLightI * pow(max(dot(v, Ld), 0.), 6.) * 0.25 * vY;
      col += vec3(0.5, 0.56, 0.7) * uFlash * 0.05;
      gl_FragColor = vec4(fogIt(col, vW), 1.); }`, { side: T.DoubleSide }));
  reedMesh.frustumCulled = false; scene.add(reedMesh);

  // mist: soft banks drifting low over the water, glowing where they stand in front of the light
  const mists = [];
  [[0, 0.9, -2.5, 14, 2.4, 0.18], [-3, 1.4, -6, 22, 3.5, 0.22], [4, 2, -12, 30, 5, 0.3], [0, 3, -22, 60, 9, 0.22], [-2, 0.6, 1.2, 10, 1.6, 0.08]].forEach(([x, y, z, w, h, a], i) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat(WVS, `uniform float uT; varying vec3 vW; varying vec2 vUv;
      void main(){ float n = fbm(vUv * vec2(${(w / 4).toFixed(1)}, ${(h / 3).toFixed(1)}) + vec2(uT * 0.05, ${i}. * 7.)) ;
        n = smoothstep(0.3, 0.8, n) * smoothstep(0., .35, vUv.y) * smoothstep(1., .45, vUv.y) * smoothstep(0., .2, vUv.x) * smoothstep(1., .8, vUv.x);
        vec3 v = normalize(vW - cameraPosition), Ld = normalize(uLight - vW); float sc = pow(max(dot(v, Ld), 0.), 4.);
        vec3 col = uFogCol * 1.6 * (1. + uFlash * 4.) + uLightCol * uLightI * sc * 0.35;
        gl_FragColor = vec4(col, n * ${a}); }`, { transparent: true, depthWrite: false }));
    m.position.set(x, y, z); mists.push(m); scene.add(m);
  });

  // rain curtains far away: sheets of streaks you can only see against the light
  [[-14, 40], [-24, 70], [-36, 110]].forEach(([z, w]) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, 24), mat(WVS, `uniform float uT, uRain; varying vec3 vW; varying vec2 vUv;
      void main(){ float x = vUv.x * ${(w * 22).toFixed(0)}.; float col = floor(x);
        float sp = 9. + h12(vec2(col, 1.)) * 4.;
        float y = vUv.y * 24. + uT * sp + h12(vec2(col, 2.)) * 24.;
        float streak = smoothstep(0.75, 1., fract(y / 3.)) * step(h12(vec2(col, floor(y / 3.))), uRain * 0.6 + 0.2) * (1. - abs(fract(x) - .5) * 2.);
        vec3 v = normalize(vW - cameraPosition), Ld = normalize(uLight - vW); float sc = pow(max(dot(v, Ld), 0.), 3.);
        gl_FragColor = vec4(uLightCol * uLightI * streak * sc * 0.25 + vec3(0.5, 0.56, 0.7) * uFlash * streak * 0.08, 1.); }`,
      { transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set(0, 10, z); scene.add(m);
  });

  // the rain itself: thin streaks, each lit by how much the light behind shines through it
  const N = 42000, rainGeo = new T.InstancedBufferGeometry(), seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
  rainGeo.setAttribute("position", new T.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  rainGeo.setIndex([0, 1, 2, 0, 2, 3]);
  rainGeo.setAttribute("seed", new T.InstancedBufferAttribute(seeds, 4)); rainGeo.instanceCount = N;
  const rainMat = mat(
    `attribute vec4 seed; uniform float uT, uRain, uWind; varying float vA; varying vec2 vQ;
    void main(){
      vA = 0.;
      if (seed.w > 0.25 + uRain * 0.75) { gl_Position = vec4(2., 2., 2., 1.); return; }
      vec3 size = vec3(18., 9., 18.), c = vec3(0., 4.5, -4.);
      float sp = 8.5 + seed.w * 2.5, y = mod(seed.y * size.y - uT * sp, size.y);
      vec3 vel = vec3(uWind * 1.2, -sp, uWind * 0.35);
      vec3 p = c - size * .5 + vec3(seed.x * size.x, y, seed.z * size.z);
      p.xz += vel.xz / sp * y;
      vec3 dir = normalize(vel), toCam = cameraPosition - p; float dist = length(toCam); toCam /= dist;
      vec3 side = normalize(cross(dir, toCam));
      float wdt = max(0.0016, dist * 0.0011), len = sp * 0.016;
      vec3 pos = p + side * position.x * wdt - dir * position.y * len;
      vQ = position.xy;
      vec3 Ld = normalize(uLight - p);
      float sc = pow(max(dot(-toCam, Ld), 0.), 9.);
      vA = (0.035 + 2.6 * sc * uLightI + uFlash * 1.) * (0.0016 / wdt) * smoothstep(0.4, 1.4, dist) * smoothstep(-0.05, 0.3, p.y);
      gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.); }`,
    `varying float vA; varying vec2 vQ;
    void main(){ float a = vA * (1. - abs(vQ.x)) * sin(vQ.y * 3.14159);
      gl_FragColor = vec4(mix(uLightCol, vec3(0.75, 0.8, 0.9), 0.4) * a, 1.); }`,
    { transparent: true, blending: T.AdditiveBlending, depthWrite: true, side: T.DoubleSide });   // writes depth so the focus blur treats each drop at its own distance
  const rainMesh = new T.Mesh(rainGeo, rainMat); rainMesh.frustumCulled = false; scene.add(rainMesh);

  // splashes: each impact throws a little crown of droplets that fall back
  const splash = (anchors, groups, per, lift) => {
    const geo = new T.InstancedBufferGeometry(), a = new Float32Array(groups * per * 4), b = new Float32Array(groups * per * 3);
    for (let gI = 0; gI < groups; gI++) {
      const s0 = Math.random(), s1 = Math.random(), s2 = Math.random();
      let ax, ay, az;
      if (anchors) { const k = Math.floor(Math.random() * anchors.length / 3) * 3; ax = anchors[k]; ay = anchors[k + 1]; az = anchors[k + 2]; }
      else { const rr = 9 * Math.sqrt(Math.random()), th = Math.random() * 6.283; ax = Math.sin(th) * rr; ay = 0; az = 1 - Math.cos(th) * rr * 1.2; }
      for (let k = 0; k < per; k++) { const i = gI * per + k; a.set([s0, s1, s2, k / per], i * 4); b.set([ax, ay, az], i * 3); }
    }
    geo.setAttribute("position", new T.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute("sp", new T.InstancedBufferAttribute(a, 4)); geo.setAttribute("anc", new T.InstancedBufferAttribute(b, 3));
    geo.instanceCount = groups * per;
    const m = new T.Mesh(geo, mat(
      `attribute vec4 sp; attribute vec3 anc; uniform float uT, uRain; varying float vA; varying vec2 vQ;
      void main(){ vA = 0.; vQ = position.xy;
        float per = 0.45 + sp.z * 0.5, u = uT / per + sp.x * 17., cyc = floor(u), tau = fract(u) * per;
        if (tau > 0.32 || h12(vec2(cyc, sp.y * 77.)) > 0.15 + uRain * 0.85) { gl_Position = vec4(2., 2., 2., 1.); return; }
        vec3 base = anc;
        ${anchors ? "" : "base.xz += (h22(vec2(cyc, sp.x * 91.)) - .5) * 1.2;"}
        float ang = sp.w * 6.2832 + h12(vec2(cyc, sp.y)) * 2., k = 0.5 + h12(vec2(cyc, sp.w * 13.)) * 0.8;
        vec3 v0 = vec3(cos(ang) * 0.55 * k, ${lift} * (0.7 + 0.5 * k), sin(ang) * 0.55 * k);
        vec3 p = base + v0 * tau + vec3(0., -4.9, 0.) * tau * tau;
        if (p.y < base.y - 0.01) { gl_Position = vec4(2., 2., 2., 1.); return; }
        vec3 toCam = cameraPosition - p; float dist = length(toCam);
        float r = max(0.0025, dist * 0.0009);
        vec4 vp = viewMatrix * vec4(p, 1.); vp.xy += position.xy * r;
        vec3 Ld = normalize(uLight - p);
        vA = (0.03 + 1.2 * pow(max(dot(-toCam / dist, Ld), 0.), 4.) * uLightI + uFlash * 0.6) * (0.0025 / r) * (1. - tau / 0.32);
        gl_Position = projectionMatrix * vp; }`,
      `varying float vA; varying vec2 vQ;
      void main(){ float a = vA * smoothstep(1., 0.2, length(vQ)); gl_FragColor = vec4(mix(uLightCol, vec3(0.8), 0.4) * a, 1.); }`,
      { transparent: true, blending: T.AdditiveBlending, depthWrite: true }));
    m.frustumCulled = false; return m;
  };
  scene.add(splash(null, 2600, 7, "1.5"));

  // lights for the figure: a hard cold rim from behind, a whisper of fill, lightning
  scene.add(new T.HemisphereLight(0x50607a, 0x0a0c0e, 0.35));
  const rim = new T.SpotLight(0xcfe0ff, 6, 30, 0.5, 0.8, 1); rim.position.copy(L).multiplyScalar(0.5).setY(3.2); scene.add(rim); scene.add(rim.target);
  const rim2 = new T.DirectionalLight(0xbcd0ff, 1.2); rim2.position.set(-2, 3, -5); scene.add(rim2);
  const fill = new T.DirectionalLight(0x8090a8, 0.12); fill.position.set(1, 1, 5); scene.add(fill);
  const bolt = new T.DirectionalLight(0xc8d4ff, 0); scene.add(bolt);
  scene.fog = new T.FogExp2(0x080a0d, 0.03);
  // a soft cold world for the wet skin to reflect
  const envScene = new T.Scene();
  envScene.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ side: T.BackSide, uniforms: { L: { value: L.clone().normalize() } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 L; varying vec3 vD; void main(){ vec3 d = normalize(vD); float a = max(dot(d, L), 0.);
      vec3 c = mix(vec3(0.02, 0.025, 0.03), vec3(0.06, 0.07, 0.09), smoothstep(-0.2, 0.6, d.y)) + vec3(0.8, 0.9, 1.1) * (pow(a, 20.) * 3. + pow(a, 3.) * 0.2);
      gl_FragColor = vec4(c, 1.); }` })));
  const pmrem = new T.PMREMGenerator(RAIN.r);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;

  Object.assign(FIELD, { scene, cam, U, L, water, rainMesh, rim, bolt, mists, beam, pig: null, mixer: null, ready: true,
    vcam: new T.PerspectiveCamera(28, 2, 0.05, 400), splash, flicker: 0 });
  // the pig: a real model if one has been put in the assets folder
  if (typeof fetch === "function" && location.protocol !== "file:")
    fetch("assets/pig.glb", { method: "HEAD" }).then(r => { if (r.ok) loadPig("assets/pig.glb"); }).catch(() => {});
}

// ---------- the pig ----------
// Any glTF/GLB model works: it is scaled to a real pig's length, stood in the water facing us,
// and its skin made wet (a clear film of water over its own textures).
function loadPig(url) {
  if (!rainReady() || !THREE.GLTFLoader) return;
  if (!FIELD.ready) fieldSetup();
  new THREE.GLTFLoader().load(url, gltf => {
    const T = THREE, root = gltf.scene;
    if (FIELD.pig) FIELD.scene.remove(FIELD.pig);
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root), size = box.getSize(new T.Vector3());
    const k = 1.45 / Math.max(size.x, size.z, size.y * 0.8);
    const holder = new T.Group(); holder.add(root);
    root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    holder.scale.setScalar(k); holder.position.y = -0.04; holder.rotation.y = 0.35;
    root.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      const old = Array.isArray(o.material) ? o.material[0] : o.material;
      const m = new T.MeshPhysicalMaterial({
        map: old.map || null, normalMap: old.normalMap || null, roughnessMap: old.roughnessMap || null, aoMap: old.aoMap || null,
        color: (old.color || new T.Color(1, 1, 1)).clone().multiplyScalar(0.72),
        roughness: Math.min(0.5, old.roughness == null ? 0.5 : old.roughness), metalness: 0,
        clearcoat: 0.85, clearcoatRoughness: 0.12, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new T.Color(0.6, 0.5, 0.5),
        envMapIntensity: 0.9, vertexColors: !!old.vertexColors
      });
      if (old.normalScale) m.normalScale.copy(old.normalScale);
      o.material = m;
    });
    FIELD.scene.add(holder); FIELD.pig = holder;
    FIELD.rim.target = holder;
    FIELD.mixer = null;
    if (gltf.animations && gltf.animations.length) {
      FIELD.mixer = new T.AnimationMixer(root);
      const clip = gltf.animations.find(c => /idle|breath|stand|look/i.test(c.name)) || gltf.animations[0];
      FIELD.mixer.clipAction(clip).play();
    }
    // rain lands on its back and head too
    holder.updateMatrixWorld(true);
    const pts = [], up = new T.Vector3(), v = new T.Vector3();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry.attributes.normal) return;
      const P = o.geometry.attributes.position, Nn = o.geometry.attributes.normal, nm = new T.Matrix3().getNormalMatrix(o.matrixWorld);
      const step = Math.max(1, Math.floor(P.count / 3000));
      for (let i = 0; i < P.count; i += step) {
        up.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize();
        if (up.y > 0.55) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pts.push(v.x, v.y, v.z); }
      }
    });
    if (FIELD.pigSplash) FIELD.scene.remove(FIELD.pigSplash);
    if (pts.length) { FIELD.pigSplash = FIELD.splash(pts, 500, 4, "0.9"); FIELD.scene.add(FIELD.pigSplash); }
  }, undefined, e => console.warn("pig model could not be read", e));
}
// drop a .glb file onto the page to try a model straight away
window.addEventListener("dragover", e => { e.preventDefault(); });
window.addEventListener("drop", e => {
  const f = e.dataTransfer && [...e.dataTransfer.files].find(f => /\.(glb|gltf)$/i.test(f.name));
  if (!f) return; e.preventDefault(); loadPig(URL.createObjectURL(f));
});

function fieldScene(t, dt, box) {
  rainListen(dt);
  const f = rainFrame(box);
  if (!rainReady()) return;
  if (!FIELD.ready) fieldSetup();
  rainTargets(f.pw, f.ph);
  const { scene, cam, U, L } = FIELD, lv = RAIN.lvl;
  // storm: big attacks bring lightning, and every so often it comes anyway when the music swells
  RAIN.nextBolt -= dt * (0.3 + lv);
  if ((RAIN.onset > 0.45 && RAIN.nextBolt < 4) || RAIN.nextBolt < 0) { rainBolt(Math.min(1, RAIN.onset + lv * 0.5)); RAIN.nextBolt = 7 + Math.random() * 10; }
  // the rain follows the loudness; the wind leans on it in the big moments
  FIELD.rainAmt = (FIELD.rainAmt || 0.4) + ((0.35 + 0.65 * lv) - (FIELD.rainAmt || 0.4)) * Math.min(1, dt * 1.5);
  U.uT.value = t; U.uRain.value = FIELD.rainAmt; U.uWind.value = 0.5 + lv * 1.1 + Math.sin(t * 0.13) * 0.2;
  U.uBass.value = S.bass; U.uFlash.value = RAIN.flash;
  if (RAIN.boltDir) U.uFlashDir.value.copy(RAIN.boltDir);
  // the light behind warms and grows as the music opens up: release
  const cold = new THREE.Color(0.66, 0.8, 1.0), warm = new THREE.Color(1.0, 0.86, 0.68);
  U.uLightCol.value.copy(cold).lerp(warm, RAIN.warm * 0.8);
  U.uLightI.value = 0.75 + lv * 0.6 + S.pulse * 0.15;
  FIELD.rim.intensity = 5 + lv * 5; FIELD.rim.color.copy(U.uLightCol.value);
  FIELD.bolt.intensity = RAIN.flash * 2.2; if (RAIN.boltDir) FIELD.bolt.position.copy(RAIN.boltDir).multiplyScalar(10);
  FIELD.beam.rotation.set(0.35 + Math.sin(t * 0.07) * 0.08, 0, -0.9 + Math.sin(t * 0.045) * 0.7);
  FIELD.mists.forEach(m => m.quaternion.copy(cam.quaternion));
  if (FIELD.mixer) FIELD.mixer.update(dt);
  if (FIELD.pig) { const b = 1 + Math.sin(t * 1.4) * 0.006; FIELD.pig.scale.y = FIELD.pig.scale.x * b; }
  // the camera: low in the water, slowly closing in, breathing like a handheld shot
  const ang = Math.sin(t * 0.043) * 0.2 + 0.06, rad = 4.6 - 0.6 * (0.5 + 0.5 * Math.sin(t * 0.029)) - lv * 0.25;
  cam.aspect = f.pw / f.ph; cam.updateProjectionMatrix();
  cam.position.set(Math.sin(ang) * rad, 0.4 + lv * 0.14 + Math.sin(t * 0.37) * 0.02, Math.cos(ang) * rad);
  cam.up.set(0, 1, 0); cam.lookAt(0, 0.62 + lv * 0.05, 0);
  const shake = 0.0025 * (1 + lv * 2);
  cam.rotateX((Math.sin(t * 1.7) + Math.sin(t * 2.9) * 0.6) * shake); cam.rotateY(Math.sin(t * 1.3 + 1) * shake); cam.rotateZ(Math.sin(t * 0.9) * shake * 0.8);
  cam.updateMatrixWorld();
  // reflection: the same world seen from under the water
  const vc = FIELD.vcam; vc.copy(cam); vc.position.y = -cam.position.y;
  const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).add(cam.position); look.y = -look.y;
  vc.up.set(0, -1, 0); vc.lookAt(look); vc.updateMatrixWorld(); vc.updateProjectionMatrix();
  U.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
  const r = RAIN.r;
  FIELD.water.visible = false; FIELD.rainMesh.visible = false;
  r.setRenderTarget(RAIN.refl); r.render(scene, vc);
  FIELD.water.visible = true; FIELD.rainMesh.visible = true;
  U.tRefl.value = RAIN.refl.texture;
  r.setRenderTarget(RAIN.rt); r.render(scene, cam);
  const lp = L.clone().project(cam);
  rainFinish(t, { th: 0.35, aper: 0.55, focus: cam.position.length(), near: cam.near, far: cam.far, rays: 0.45 + lv * 0.4,
    lightUV: new THREE.Vector2(lp.x * 0.5 + 0.5, lp.y * 0.5 + 0.5), expo: 1.1, sat: 0.62 });
  rainShow(f);
}

// ================================================================
// FILM ii: STILL WATER. Seen from just above a pond at dusk: each note is a drop.
// It falls, punches a small crater, throws up a bead, and sends rings out across the reflection.
// ================================================================
const POND = { mat: null, drops: [], n: 0 };
function pondSetup() {
  rainGL();
  const T = THREE, drops = []; for (let i = 0; i < 16; i++) drops.push(new T.Vector4(0, 0, -99, 0));
  POND.drops = drops;
  POND.mat = new T.ShaderMaterial({ vertexShader: RAIN_VS, depthTest: false, depthWrite: false,
    uniforms: { uT: { value: 0 }, uRain: { value: 0.3 }, uWarm: { value: 0 }, uAsp: { value: 2 }, uDrop: { value: drops }, uLook: { value: 0 } },
    fragmentShader: RAIN_GLSL + `
    uniform float uT, uRain, uWarm, uAsp, uLook; uniform vec4 uDrop[16]; varying vec2 vUv;
    // the world reflected in the pond: pale overcast sky, a dark far bank of trees, three lamps on the far path
    vec3 sky(vec3 d){
      float el = d.y, az = atan(d.x, d.z);
      vec3 col = mix(vec3(0.24, 0.27, 0.31), vec3(0.10, 0.12, 0.15), smoothstep(0.0, 0.45, el));
      col *= 0.85 + 0.3 * fbm(vec2(az * 2.5 + uT * 0.004, el * 5.));
      col = mix(col, col * vec3(1.12, 1.0, 0.86), uWarm);
      float tree = 0.035 + 0.05 * fbm(vec2(az * 7., 1.3)) + 0.018 * vnoise(vec2(az * 60., 2.));
      float shore = smoothstep(tree + 0.003, tree - 0.003, el);
      col = mix(col, vec3(0.05, 0.06, 0.065), shore * 0.85);
      for (int i = 0; i < 3; i++) { float fi = float(i);
        vec2 dd = vec2(az - (-0.42 + fi * 0.36 + 0.05 * sin(fi * 7.)), el - (0.018 + 0.004 * fi));
        float r = length(dd * vec2(1., 1.6));
        col += mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.75, 0.5), fi * 0.4) * (exp(-r * 900.) * 6. + exp(-r * 60.) * 0.08) * (0.5 + uWarm * 1.3);
      }
      return col;
    }
    // intersect an ellipsoid; returns distance, writes normal
    float ell(vec3 ro, vec3 rd, vec3 c, vec3 r, out vec3 n){
      vec3 o = (ro - c) / r, d = rd / r; float a = dot(d, d), b = dot(o, d), cc = dot(o, o) - 1., h = b * b - a * cc;
      if (h < 0.) return 1e4; float t = (-b - sqrt(h)) / a; if (t < 0.) return 1e4;
      n = normalize((ro + rd * t - c) / (r * r)); return t; }
    vec3 dropShade(vec3 rd, vec3 n){
      float fr = 0.02 + 0.98 * pow(1. - max(dot(n, -rd), 0.), 5.);
      vec3 through = sky(normalize(refract(rd, n, 0.75) * vec3(1., -1., 1.))) * 0.55 + vec3(0.01, 0.015, 0.014);
      return mix(through, sky(reflect(rd, n)), fr) + vec3(1.) * pow(max(dot(reflect(rd, n), normalize(vec3(0., 1., 0.4))), 0.), 60.) * 0.6;
    }
    void main(){
      vec2 p = (vUv - .5) * vec2(uAsp, 1.);
      vec3 ro = vec3(0., 0.1, 0.);
      vec3 fw = normalize(vec3(uLook, -0.2, 1.)), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
      vec3 rd = normalize(fw * 1.6 + rt * p.x + up * p.y);
      // drops in the air and the columns they throw up
      float tO = 1e4; vec3 nO = vec3(0, 1, 0), n;
      for (int k = 0; k < 16; k++) { vec4 D = uDrop[k]; float a = uT - D.z; if (a < -0.3 || a > 0.45) continue;
        vec3 c = vec3(D.x, 0., D.y); float s = D.w, t;
        if (a < 0.) { t = ell(ro, rd, c + vec3(0., -a * 4.4 + 0.012, 0.), vec3(0.0018, 0.012, 0.0018) * s, n); }
        else { float j = clamp(a / 0.28, 0., 1.), hgt = 0.022 * s * sin(3.1416 * j);
          t = ell(ro, rd, c + vec3(0., hgt * 0.5, 0.), vec3(0.0018 * s * (1.2 - j), hgt * 0.5 + 0.001, 0.0018 * s * (1.2 - j)), n);
          if (t < tO && a < 0.28) { tO = t; nO = n; }
          vec3 n2; float bead = a < 0.1 ? 1e4 : ell(ro, rd, c + vec3(0., hgt + 0.012 * s * (a - 0.1) * 6. - 4.9 * (a - 0.1) * (a - 0.1), 0.), vec3(0.0016 * s), n2);
          if (bead < tO) { tO = bead; nO = n2; } t = 1e4; }
        if (t < tO) { tO = t; nO = n; } }
      vec3 col; float depth;
      float tW = rd.y < 0. ? -ro.y / rd.y : 1e4;
      if (tO < tW && tO < 1e3) { col = dropShade(rd, nO); depth = tO; }
      else if (tW < 1e3) {
        vec3 hp = ro + rd * tW; vec2 q = hp.xz;
        vec2 s = rings(q * 14., uT, 0.15 + uRain * 0.6) * 0.22 + rings(q * 32. + 3., uT * 1.2, 0.1 + uRain * 0.5) * 0.11;
        s += (vec2(vnoise(q * 3. + uT * 0.1), vnoise(q * 3. - uT * 0.08 + 4.)) - .5) * 0.006;
        for (int k = 0; k < 16; k++) { vec4 D = uDrop[k]; float a = uT - D.z; if (a < 0. || a > 3.5) continue;
          vec2 d = q - D.xy; float r = length(d) + 1e-4, x = r - (0.004 + a * 0.2);
          float env = x > 0. ? exp(-x * x / 0.00004) : exp(-x * x / (0.0002 + a * 0.004));
          float w = sin(x * 360.) * env * D.w * 0.5 * exp(-a * 1.1) / (1. + r * 18.);
          w -= a < 0.12 ? exp(-r * r / 0.00003) * (1. - a / 0.12) * 0.8 * D.w * sin(r * 600.) : 0.;
          s += d / r * w; }
        vec3 nn = normalize(vec3(-s.x, 1., -s.y));
        float fr = 0.02 + 0.98 * pow(1. - max(dot(nn, -rd), 0.), 5.);
        vec3 body = vec3(0.012, 0.02, 0.018);
        col = mix(body, sky(reflect(rd, nn)), fr);
        depth = tW;
        float m = 1. - exp(-tW * 0.035);
        col = mix(col, vec3(0.2, 0.22, 0.25) * mix(vec3(1.), vec3(1.1, 1.0, 0.88), uWarm), m * (0.6 + 0.4 * fbm(vec2(hp.x * 0.1 + uT * 0.02, hp.z * 0.05))));
      } else { col = sky(rd); depth = 200.; }
      gl_FragColor = vec4(col, depth); }`
  });
}
function pondScene(t, dt, box) {
  rainListen(dt);
  const f = rainFrame(box);
  if (!rainReady()) return;
  if (!POND.mat) pondSetup();
  rainTargets(f.pw, f.ph);
  const U = POND.mat.uniforms;
  // each note becomes a drop: high notes land to the right, loud notes are bigger, some land close, some far
  rainNotes((n, lead) => {
    const x = Math.max(0, Math.min(1, Math.log2(n.f / 110) / 4)), z = 0.28 + Math.pow(Math.random(), 1.5) * 1.3;
    POND.drops[POND.n++ % 16].set((x - 0.5) * z * 1.1, z, t + lead, 0.7 + Math.min(0.8, (n.v || 0.7) * 0.6) * (1 + Math.random() * 0.4));
  });
  if (!nowPlaying && Math.random() < dt * 0.5) POND.drops[POND.n++ % 16].set((Math.random() - 0.5) * 0.8, 0.4 + Math.random(), t + 0.25, 0.8);
  POND.rain = (POND.rain || 0.3) + ((0.15 + RAIN.lvl * 0.7) - (POND.rain || 0.3)) * Math.min(1, dt);
  U.uT.value = t; U.uRain.value = POND.rain; U.uWarm.value = RAIN.warm; U.uAsp.value = f.pw / f.ph;
  U.uLook.value = Math.sin(t * 0.021) * 0.06;
  rainPass(POND.mat, RAIN.rt);
  rainFinish(t, { th: 0.6, aper: 0.7, focus: 0.6, alphaDepth: true, expo: 1.15, sat: 0.6, hal: 0.8 });
  rainShow(f);
}

// ================================================================
// FILM iii: A WINDOW. Night outside: the windows across the street, sodium lamps, cars passing
// on the wet road, a traffic light. On the glass: mist, beads of water, drops running down.
// Each drop is a small lens, so inside it the street is sharp and upside down.
// ================================================================
const PANE = { mat: null, hits: [], n: 0 };
function paneSetup() {
  rainGL();
  const T = THREE, hits = []; for (let i = 0; i < 16; i++) hits.push(new T.Vector4(0, 0, -99, 0));
  PANE.hits = hits;
  PANE.mat = new T.ShaderMaterial({ vertexShader: RAIN_VS, depthTest: false, depthWrite: false,
    uniforms: { uT: { value: 0 }, uRain: { value: 0.3 }, uWarm: { value: 0 }, uAsp: { value: 2 }, uHit: { value: hits }, uBass: { value: 0 } },
    fragmentShader: RAIN_GLSL + `
    uniform float uT, uRain, uWarm, uAsp, uBass; uniform vec4 uHit[16]; varying vec2 vUv;
    // a light seen out of focus: a disc with a slightly brighter rim; sharp and small when blur is low
    float bok(vec2 p, vec2 c, float r){ float d = length(p - c); return smoothstep(r, r * 0.86, d) * (0.8 + 0.2 * smoothstep(r * 0.3, r * 0.9, d)) / (r * r * 900. + 1.); }
    vec3 street(vec2 p, float blur){
      vec3 col = mix(vec3(0.022, 0.024, 0.03), vec3(0.008, 0.009, 0.013), smoothstep(0.3, 1., p.y));
      col += vec3(0.05, 0.03, 0.014) * smoothstep(0.45, 0.0, p.y) * (0.7 + 0.5 * uWarm);
      float R = 0.003 + blur * 0.035;
      // windows across the street
      if (p.y > 0.45) { vec2 cs = vec2(0.12, 0.1), q = p / cs, id = floor(q);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 c = id + vec2(i, j); float h = h12(c + 3.1);
          if (h > 0.26 || c.y * cs.y < 0.5 || c.y * cs.y > 0.95) continue;
          vec3 wc = h < 0.15 ? vec3(1.0, 0.62, 0.3) : h < 0.21 ? vec3(0.75, 0.85, 1.0) : vec3(0.5, 0.65, 1.0) * (0.7 + 0.3 * sin(uT * 7. + h * 50.));
          vec2 jit = (h22(c + 1.3) - .5) * 0.5;
          col += wc * bok(p, (c + 0.5 + jit) * cs, R * (0.75 + 0.5 * h12(c + 8.))) * (0.4 + 0.8 * h12(c + 2.)); } }
      // sodium lamps along the road, each pouring a long reflection down the wet tarmac
      for (int i = 0; i < 5; i++) { float fi = float(i); vec2 c = vec2(fi * 0.48 + 0.12, 0.6 - fi * 0.012);
        col += vec3(1.0, 0.56, 0.2) * (bok(p, c, R * 1.3) * 2.6 + exp(-length(p - c) * 18.) * 0.05) * (0.8 + uWarm * 0.6);
        float dx = p.x - c.x; col += vec3(1.0, 0.5, 0.16) * exp(-dx * dx / (0.00006 + blur * 0.0006)) * smoothstep(0.38, 0.12, p.y) * smoothstep(0.0, 0.2, p.y) * 0.25; }
      // cars: white headlights going one way, red tail lights the other, their reflections on the road
      for (int i = 0; i < 4; i++) { float fi = float(i);
        float hx = mod(uT * (0.09 + fi * 0.015) + fi * 0.71, uAsp + 0.8) - 0.4;
        float tx = uAsp + 0.4 - mod(uT * (0.07 + fi * 0.012) + fi * 0.53, uAsp + 0.8);
        float on = step(0.3, h12(vec2(fi, floor(uT * 0.05 + fi))));
        vec3 hc = vec3(1.0, 0.95, 0.85) * (1.6 + uBass * 2.), tc = vec3(1.0, 0.08, 0.04) * 1.4;
        col += on * hc * (bok(p, vec2(hx, 0.33), R) + bok(p, vec2(hx + 0.045, 0.33), R));
        col += on * tc * (bok(p, vec2(tx, 0.36), R * 0.8) + bok(p, vec2(tx + 0.04, 0.36), R * 0.8));
        float dh = p.x - hx - 0.022, dt = p.x - tx - 0.02, road = smoothstep(0.32, 0.1, p.y) * smoothstep(0., 0.15, p.y);
        col += on * road * (hc * exp(-dh * dh / (0.0004 + blur * 0.001)) * 0.12 + tc * exp(-dt * dt / (0.0003 + blur * 0.001)) * 0.1); }
      // the traffic light
      float ph = mod(uT, 24.); vec3 tl = ph < 11. ? vec3(0.1, 1., 0.45) : ph < 14. ? vec3(1., 0.6, 0.05) : vec3(1., 0.06, 0.03);
      col += tl * bok(p, vec2(uAsp * 0.8, 0.5), R * 0.9) * 1.6;
      return col;
    }
    void main(){
      vec2 p = vUv * vec2(uAsp, 1.);
      // condensation: thicker towards the bottom and the edges
      float fog = clamp(0.25 + 0.5 * fbm(p * 2.5 + 1.) + 0.3 * smoothstep(0.4, 0., p.y), 0., 1.);
      // drops running down: one per column, sticking and slipping, leaving a clear wet track
      float clear = 0.; vec2 dc = vec2(0); float dr = 0.;
      float cw = 0.06, col0 = floor(p.x / cw);
      for (int i = -1; i <= 1; i++) { float ci = col0 + float(i), s1 = h12(vec2(ci, 7.)), s2 = h12(vec2(ci, 9.));
        if (s1 > 0.12 + uRain * 0.6) continue;
        float per = 6. + s2 * 10., u = uT / per + s1 * 11., ph = fract(u);
        float y = 1.15 - 1.4 * (ph + 0.015 * sin(ph * 70. + s2 * 30.));
        float wob = (vnoise(vec2(p.y * 9., ci * 3.1 + floor(u))) - .5) * 0.035;
        float cx = (ci + 0.5) * cw + wob;
        float hx = (ci + 0.5) * cw + (vnoise(vec2(y * 9., ci * 3.1 + floor(u))) - .5) * 0.035;
        float hr = 0.009 + s2 * 0.009;
        vec2 q = p - vec2(hx, y); q.y *= q.y > 0. ? 0.62 : 1.05;
        if (length(q) < hr && dr == 0.) { dc = vec2(hx, y); dr = hr; }
        if (p.y > y && p.y < y + 0.5) { float w = hr * 0.42, d = abs(p.x - cx); float tr = smoothstep(w * 1.6, w * 0.8, d) * smoothstep(y + 0.5, y, p.y);
          clear = max(clear, tr);
          vec2 tq = vec2(p.x - cx, mod(p.y - y, 0.02) - 0.01); float th = h12(vec2(ci, floor((p.y - y) / 0.02) + floor(u) * 50.));
          if (dr == 0. && th < 0.5 && length(tq) < w * 0.5 * th + 0.0015) { dc = p - tq; dr = w * 0.5 * th + 0.0015; } } }
      // drops the music throws at the glass: they land, cling, then run
      for (int k = 0; k < 16; k++) { vec4 H = uHit[k]; float a = uT - H.z; if (a < 0. || a > 9. || dr > 0.) continue;
        float r = H.w * min(1., a / 0.05) * (1. - smoothstep(7., 9., a));
        vec2 c = vec2(H.x, H.y - max(0., a - 1.5) * max(0., a - 1.5) * 0.012 * H.w / 0.012);
        vec2 q = p - c; q.y *= q.y > 0. ? 0.75 : 1.;
        if (length(q) < r) { dc = c; dr = r; }
        if (a > 1.5 && p.y > c.y && p.y < H.y && abs(p.x - c.x) < r * 0.4) clear = max(clear, 0.8); }
      // beads clinging to the glass, wiped away where a drop has run through
      if (dr == 0.) for (int L = 0; L < 2; L++) { float sc = L == 0 ? 0.035 : 0.014; vec2 q = p / sc, id = floor(q);
        float h = h12(id + float(L) * 17.), life = fract(uT * 0.03 + h * 5.);
        if (h < 0.32 - float(L) * 0.04 && life < 0.9 && clear < 0.2) { float r = (0.1 + 0.22 * h12(id + 4.)) * sc * smoothstep(0., 0.05, life);
          vec2 c = (id + 0.5 + (h22(id) - .5) * 0.4) * sc; vec2 d = p - c; d.y *= 1.1;
          if (length(d) < r) { dc = c; dr = r; } } }
      vec3 col;
      if (dr > 0.) {
        vec2 q = (p - dc) / dr; float l = length(q);
        vec3 inside = street(dc - q * dr * 4. - vec2(0., 0.02), 0.3) * 1.15;   // the street seen through the drop: upside down and sharper
        float rim = smoothstep(0.6, 1., l);
        col = mix(inside, street(p, 1.), 0.35) * (1. - rim * 0.45) + street(p, 1.) * 0.2 * rim;
        col += street(dc + vec2(0., 0.05), 1.) * smoothstep(0.4, 0.95, l) * max(0., -q.y) * 0.5;   // light gathered at the bottom edge
        col += vec3(0.9) * exp(-dot(q - vec2(-0.32, 0.42), q - vec2(-0.32, 0.42)) * 50.) * 0.06;   // glint
        col *= 1. - smoothstep(0.9, 1., l) * 0.45;                            // the thin dark outline where light bends away
      } else {
        vec3 base = street(p, 1.);
        vec3 misted = street(p, 1.8) * 0.55 + vec3(0.016, 0.018, 0.022) + base * 0.15;
        col = mix(base, misted, fog * (1. - clear));
        col *= 1. - clear * 0.12;
      }
      gl_FragColor = vec4(col, 1.); }`
  });
}
function paneScene(t, dt, box) {
  rainListen(dt);
  const f = rainFrame(box);
  if (!rainReady()) return;
  if (!PANE.mat) paneSetup();
  rainTargets(f.pw, f.ph);
  const U = PANE.mat.uniforms, asp = f.pw / f.ph;
  rainNotes((n, lead) => {
    const x = Math.max(0.03, Math.min(0.97, Math.log2(n.f / 98) / 4 + (Math.random() - 0.5) * 0.15));
    PANE.hits[PANE.n++ % 16].set(x * asp, 0.25 + Math.random() * 0.7, t + lead, (n.tap ? 0.006 : 0.012) + Math.random() * 0.008);
  });
  PANE.rain = (PANE.rain || 0.3) + ((0.1 + RAIN.lvl * 0.8) - (PANE.rain || 0.3)) * Math.min(1, dt);
  U.uT.value = t; U.uRain.value = PANE.rain; U.uWarm.value = RAIN.warm; U.uAsp.value = asp; U.uBass.value = S.bass;
  rainPass(PANE.mat, RAIN.rt);
  rainFinish(t, { th: 0.5, aper: 0, expo: 1.3, sat: 0.75, hal: 1.2 });
  rainShow(f);
}

// ================================================================
// THE MUSIC for ii and iii (i is your friend's song)
// ================================================================
// a bed of rain: soft noise, lowered and lifted slowly
function rainBed(ctx, out, vol, lo, hi) {
  const sr = ctx.sampleRate, buf = ctx.createBuffer(2, sr * 3, sr);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let b = 0; for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = (Math.random() * 2 - 1) * 0.5 + b * 3; } }
  const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), gn = ctx.createGain();
  s.buffer = buf; s.loop = true; hp.type = "highpass"; hp.frequency.value = lo; lp.type = "lowpass"; lp.frequency.value = hi;
  gn.gain.value = 0; gn.gain.setTargetAtTime(vol, ctx.currentTime, 2);
  s.connect(hp).connect(lp).connect(gn).connect(out); s.start();
  const id = setInterval(() => gn.gain.setTargetAtTime(vol * (0.7 + Math.random() * 0.6), ctx.currentTime, 3), 4000);
  return () => { clearInterval(id); gn.gain.setTargetAtTime(0, ctx.currentTime, 0.2); s.stop(ctx.currentTime + 1); };
}
// ii: a felt piano in C minor, slow and sparse, notes falling like single drops
function rainDrizzle(ctx, out) {
  const K = mysteryKit(ctx, out), stopBed = rainBed(ctx, out, 0.05, 300, 5000);
  const f = tuner(130.81, MODES.minor), prog = [0, 5, 2, 6, 0, 3, 5, 4], st = 60 / 56 / 2;
  const mel = [7, 9, 8, 7, 4, 5, 4, 2, 7, 11, 9, 8, 7, 6, 4, null];
  const note = (t, fr, len, v) => { K.piano(t, fr, len, v); NOTES.push({ t, f: fr, len: 0.3, v }); };
  const stop = runScheduler(ctx, st, (i, t) => {
    const s = i % 16, bar = Math.floor(i / 16), d = prog[bar % 8], arc = 0.55 + 0.45 * Math.sin(bar * 0.4);
    if (s === 0) note(t, f(d - 7), st * 14, 0.55);
    if ([2, 5, 9, 12].includes(s) && Math.random() < 0.55 + arc * 0.3) note(t, f(d + [0, 2, 4, 7][[2, 5, 9, 12].indexOf(s)]), st * 6, 0.32 * arc + 0.1);
    if (s % 4 === 0 && bar % 4 > 0) { const m = mel[(bar * 4 + s / 4) % mel.length]; if (m !== null && Math.random() < 0.75) note(t + st * 0.05, f(m + 7), st * 5, 0.42 + arc * 0.2); }
    if (Math.random() < 0.04) note(t + st * 0.5, f(pick([14, 16, 18, 21])), st * 4, 0.18);
  });
  return () => { stop(); stopBed(); };
}
// iii: a late-night electric piano, brushes and a low bass; rain tapping the window between chords
function rainGlass(ctx, out) {
  const K = mysteryKit(ctx, out), stopBed = rainBed(ctx, out, 0.035, 1200, 9000);
  const f = tuner(98, MODES.dorian), prog = [0, 3, 5, 4, 0, 6, 2, 4], st = 60 / 68 / 4;
  const mel = [9, null, 8, 7, null, 4, 6, null, 7, null, null, 4, 2, null, 4, null];
  const stop = runScheduler(ctx, st, (i, t) => {
    const s = i % 16, bar = Math.floor(i / 16), d = prog[bar % 8];
    if (s === 0) f.chord(d + 7, 4).forEach((x, k) => { K.epiano(t + k * 0.018, x, st * 13, 0.38); NOTES.push({ t: t + k * 0.018, f: x, len: 0.3, v: 0.4 }); });
    if (s === 10 && bar % 2) f.chord(d + 9, 3).forEach(x => K.epiano(t, x, st * 5, 0.22));
    if (s === 0 || s === 11) K.bass(t, f(d - 7), st * 8, 0.6, 220, 1, "triangle");
    if (s % 2 === 0) K.shaker(t, 0.18 + (s % 8 === 4 ? 0.12 : 0));
    if (s === 8) K.snare(t, 0.07);
    if (bar % 8 >= 2) { const m = mel[s]; if (m !== null && s % 2 === 0 && Math.random() < 0.7) { K.epiano(t, f(m + 7), st * 6, 0.3); NOTES.push({ t, f: f(m + 7), len: 0.3, v: 0.5 }); } }
    if (Math.random() < 0.18) { const tt = t + Math.random() * st; K.crackle(tt); NOTES.push({ t: tt, f: 200 + Math.random() * 1800, len: 0.1, v: 0.2, tap: 1 }); }
  });
  return () => { stop(); stopBed(); };
}
