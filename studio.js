// ================================================================
// ♪ THE STUDIO — compose a short piece and watch it become a sculpture of particles.
// A piano roll, five instruments, a drum row, and a Three.js particle field that is driven
// by the very same note events the audio scheduler plays, at the same audio-clock times.
// Everything lives inside this one closure so nothing here can clash with the rooms.
// ================================================================
(function () {
"use strict";

const KEYS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const SCALES = {
  major:      { label: "Major",      steps: [0, 2, 4, 5, 7, 9, 11] },
  minor:      { label: "Minor",      steps: [0, 2, 3, 5, 7, 8, 10] },
  pentatonic: { label: "Pentatonic", steps: [0, 2, 4, 7, 9] },
  dorian:     { label: "Dorian",     steps: [0, 2, 3, 5, 7, 9, 10] },
  chromatic:  { label: "All notes",  steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
};
const INSTRUMENTS = {
  piano:    { label: "Piano",     prog: 0,  col: [0.20, 0.27, 0.36], css: "#33455C" },
  strings:  { label: "Strings",   prog: 48, col: [0.47, 0.30, 0.21], css: "#784D36" },
  synth:    { label: "Synthesiser", prog: 81, col: [0.22, 0.42, 0.40], css: "#386B66" },
  musicbox: { label: "Music box", prog: 10, col: [0.66, 0.51, 0.24], css: "#A8823D" },
  bass:     { label: "Bass",      prog: 33, col: [0.25, 0.19, 0.25], css: "#3F3040" }
};
const DRUMS = [{ id: "kick", label: "kick", midi: 36 }, { id: "snare", label: "snare", midi: 38 }, { id: "hat", label: "hi-hat", midi: 42 }];
const LOW = 36, HIGH = 96;               // C2 to C7
const STEPS_PER_BAR = 16;

// ---------- The composition ----------
function example() {
  const n = (p, s, l) => ({ p, s, l, v: 0.8 });
  const notes = [
    n(55, 0, 16), n(60, 0, 16), n(64, 0, 16),
    n(76, 0, 4), n(74, 4, 2), n(72, 6, 2), n(67, 8, 6), n(69, 14, 2),
    n(53, 16, 16), n(57, 16, 16), n(60, 16, 16),
    n(69, 16, 4), n(72, 20, 4), n(77, 24, 6), n(76, 30, 2),
    n(57, 32, 16), n(60, 32, 16), n(64, 32, 16),
    n(76, 32, 4), n(74, 36, 2), n(72, 38, 2), n(69, 40, 6), n(71, 46, 2),
    n(55, 48, 16), n(59, 48, 16), n(62, 48, 16),
    n(74, 48, 4), n(71, 52, 4), n(67, 56, 8)
  ];
  const lane = f => Array.from({ length: 64 }, (_, i) => f(i % 16, i));
  return {
    v: 1, tempo: 88, volume: 0.8, key: 0, scale: "major", inst: "piano", bars: 4, loop: true, notes,
    drums: {
      kick:  lane((s, i) => (s === 0 ? (i === 0 ? 2 : 1) : s === 10 ? 1 : 0)),
      snare: lane(s => (s === 4 || s === 12 ? 1 : 0)),
      hat:   lane(s => (s % 2 === 0 ? (s % 4 === 0 ? 1 : 1) : 0))
    }
  };
}
function blank(from) {
  return { v: 1, tempo: from.tempo, volume: from.volume, key: from.key, scale: from.scale, inst: from.inst, bars: from.bars, loop: from.loop,
    notes: [], drums: { kick: new Array(64).fill(0), snare: new Array(64).fill(0), hat: new Array(64).fill(0) } };
}
function sanitize(c) {
  const d = example();
  if (!c || typeof c !== "object") return d;
  const out = {
    v: 1,
    tempo: Math.min(160, Math.max(50, +c.tempo || d.tempo)),
    volume: Math.min(1, Math.max(0, c.volume == null ? d.volume : +c.volume)),
    key: Math.min(11, Math.max(0, (c.key | 0))),
    scale: SCALES[c.scale] ? c.scale : "major",
    inst: INSTRUMENTS[c.inst] ? c.inst : "piano",
    bars: c.bars === 2 ? 2 : 4,
    loop: c.loop !== false,
    notes: (Array.isArray(c.notes) ? c.notes : []).filter(n => n && isFinite(n.p) && isFinite(n.s) && isFinite(n.l))
      .map(n => ({ p: Math.min(HIGH, Math.max(LOW, Math.round(n.p))), s: Math.max(0, Math.min(63, Math.round(n.s))), l: Math.max(1, Math.min(64, Math.round(n.l))), v: Math.min(1, Math.max(0.1, +n.v || 0.8)) })),
    drums: {}
  };
  DRUMS.forEach(dr => { const a = c.drums && Array.isArray(c.drums[dr.id]) ? c.drums[dr.id] : []; out.drums[dr.id] = Array.from({ length: 64 }, (_, i) => Math.min(2, Math.max(0, a[i] | 0))); });
  return out;
}

let song = null;
const steps = () => song.bars * STEPS_PER_BAR;
const stepDur = () => 60 / song.tempo / 4;

// The rows of the piano roll: only the notes of the chosen key and scale, so every note sounds right.
let rows = [];
function inScale(p) { return SCALES[song.scale].steps.includes(((p - song.key) % 12 + 12) % 12); }
function buildRows() { rows = []; for (let p = HIGH; p >= LOW; p--) if (inScale(p)) rows.push(p); }
function snap(p) {
  if (inScale(p)) return p;
  for (let d = 1; d < 12; d++) { if (p - d >= LOW && inScale(p - d)) return p - d; if (p + d <= HIGH && inScale(p + d)) return p + d; }
  return p;
}

// ---------- Storage (every read and write may fail, e.g. in a private window) ----------
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
let draftTimer = 0;
function saveDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(() => store.set("studio-draft", song), 300); }

// ================================================================
// SOUND — five instruments and three drums, made with the Web Audio API.
// Every voice takes (ac, bus, time, ...) so the same code plays live and renders the WAV offline.
// ================================================================
const noiseFor = new WeakMap();
function noise(ac) {
  let b = noiseFor.get(ac);
  if (!b) { b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseFor.set(ac, b); }
  return b;
}
function hall(ac, secs, decay) {
  const len = Math.round(ac.sampleRate * secs), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) { const x = i / len; lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.4 * x); d[i] = lp * Math.pow(1 - x, decay) * (i < ac.sampleRate * 0.012 ? i / (ac.sampleRate * 0.012) : 1); }
  }
  return b;
}
// The mixing desk: dry and reverb paths into a gentle compressor and the volume.
function makeBus(ac, dest) {
  const dry = ac.createGain(), wet = ac.createGain(), rev = ac.createConvolver(), comp = ac.createDynamicsCompressor(), vol = ac.createGain();
  rev.buffer = hall(ac, 2.8, 2.6);
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.25; comp.knee.value = 10;
  wet.gain.value = 0.9;
  dry.connect(comp); wet.connect(rev).connect(comp); comp.connect(vol).connect(dest);
  return { ac, dry, wet, vol };
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// what actually sounds: the music box rings an octave up, the bass an octave down
function sounding(inst, m) {
  if (inst === "musicbox") return Math.min(108, m + 12);
  if (inst === "bass") { let q = m - 12; while (q < 28) q += 12; return q; }
  return m;
}
// One note's output stage: level, stereo place, reverb send, and a "kill" gain so pause can silence it at once.
function voiceOut(bus, t, m, send) {
  const ac = bus.ac, kill = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null, rs = ac.createGain();
  rs.gain.value = send;
  if (pan) { pan.pan.value = Math.max(-0.6, Math.min(0.6, (m - 66) / 40)); kill.connect(pan); pan.connect(bus.dry); pan.connect(rs); }
  else { kill.connect(bus.dry); kill.connect(rs); }
  rs.connect(bus.wet);
  return kill;
}
function playNote(bus, inst, m, t, dur, vel) {
  const ac = bus.ac, f = hz(sounding(inst, m)), end = t + dur, nodes = [];
  let stopAt = end + 0.6, send = 0.22;
  const osc = (type, freq, det) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; if (det) o.detune.value = det; nodes.push(o); return o; };
  const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  let out;
  if (inst === "piano") {
    send = 0.2; out = voiceOut(bus, t, m, send);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(15000, f * 7 + 1500 * vel); lp.Q.value = 0.5; lp.connect(out);
    const T = Math.min(6, Math.max(0.7, 3.4 * Math.sqrt(261 / f)));
    [[1, 1], [2, 0.42], [3, 0.24], [4, 0.14], [5, 0.08], [6, 0.05], [8, 0.025]].forEach(([n, a]) => {
      const fn = n * f * Math.sqrt(1 + 0.00035 * n * n);
      if (fn > 18000) return;
      const o = osc("sine", fn), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vel * 0.16, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.006, T / Math.pow(n, 0.75) / 2.2);
      g.gain.setTargetAtTime(0, end, 0.09);          // the damper falls when the key is let go
      o.connect(g).connect(lp); o.start(t);
    });
    const h = ac.createBufferSource(), bp = ac.createBiquadFilter(), hg = gain(0);
    h.buffer = noise(ac); bp.type = "bandpass"; bp.frequency.value = Math.min(9000, f * 3); bp.Q.value = 1.2;
    hg.gain.setValueAtTime(0.05 * vel, t); hg.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
    h.connect(bp).connect(hg).connect(out); h.start(t, Math.random() * 0.5, 0.05); nodes.push(h);
    stopAt = end + 0.7;
  } else if (inst === "strings") {
    send = 0.42; out = voiceOut(bus, t, m, send);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(9000, 1800 + f * 2.2); lp.Q.value = 0.6;
    const env = gain(0), lfo = osc("sine", 5.3), depth = gain(0);
    depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(9, t + 0.6); lfo.connect(depth); lfo.start(t);
    [-8, 0, 8].forEach(d => { const o = osc("sawtooth", f, d); depth.connect(o.detune); o.connect(lp); o.start(t); });
    const o2 = osc("triangle", f / 2); const g2 = gain(0.35); depth.connect(o2.detune); o2.connect(g2).connect(lp); o2.start(t);
    const a = 0.055 * vel;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(a, t + 0.16); env.gain.setTargetAtTime(a * 0.82, t + 0.16, 0.3);
    env.gain.setTargetAtTime(0, end, 0.22);
    lp.connect(env).connect(out); stopAt = end + 1.4;
  } else if (inst === "synth") {
    send = 0.26; out = voiceOut(bus, t, m, send);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 5;
    const top = Math.min(12000, 500 + f * 4 + 3500 * vel);
    lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(top, t + 0.02); lp.frequency.setTargetAtTime(Math.min(top, 700 + f * 1.5), t + 0.02, 0.18);
    const env = gain(0), a = 0.06 * vel;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(a, t + 0.01); env.gain.setTargetAtTime(a * 0.6, t + 0.01, 0.2); env.gain.setTargetAtTime(0, end, 0.12);
    const o1 = osc("sawtooth", f, -6), o2 = osc("square", f, 6), o3 = osc("sine", f / 2), g3 = gain(0.7);
    o1.connect(lp); o2.connect(lp); o3.connect(g3).connect(lp); [o1, o2, o3].forEach(o => o.start(t));
    lp.connect(env).connect(out); stopAt = end + 0.8;
  } else if (inst === "musicbox") {
    send = 0.55; out = voiceOut(bus, t, m, send);
    [[1, 1, 1.5], [2, 0.18, 0.5], [3.01, 0.22, 0.22], [5.43, 0.1, 0.07], [8.9, 0.05, 0.03]].forEach(([r, a, tau]) => {
      const fr = f * r; if (fr > 18000) return;
      const o = osc("sine", fr), g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vel * 0.13, t + 0.002); g.gain.setTargetAtTime(0, t + 0.003, tau);
      o.connect(g).connect(out); o.start(t);
    });
    stopAt = t + Math.max(dur, 0.5) + 5;             // a tine rings on by itself
  } else { // bass
    send = 0.04; out = voiceOut(bus, t, 50, send);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.8;
    lp.frequency.setValueAtTime(160 + f * 6 + 900 * vel, t); lp.frequency.setTargetAtTime(140 + f * 2.5, t, 0.12);
    const env = gain(0), a = 0.2 * vel;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(a, t + 0.008); env.gain.setTargetAtTime(a * 0.7, t + 0.008, 0.25); env.gain.setTargetAtTime(0, end, 0.07);
    const o1 = osc("sawtooth", f), o2 = osc("sine", f), g2 = gain(1.2);
    o1.connect(lp); o2.connect(g2).connect(lp); o1.start(t); o2.start(t);
    lp.connect(env).connect(out); stopAt = end + 0.5;
  }
  nodes.forEach(n => { try { n.stop(stopAt); } catch (e) {} });
  return {
    end: stopAt,
    kill(at) { out.gain.setTargetAtTime(0, at, 0.015); nodes.forEach(n => { try { n.stop(at + 0.15); } catch (e) {} }); }
  };
}
function playDrum(bus, id, t, vel) {
  const ac = bus.ac, out = ac.createGain(), nodes = [];
  out.connect(bus.dry);
  const ns = (type, f, q, peak, len, off) => {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise(ac); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0004, t + len);
    s.connect(fl).connect(g).connect(out); s.start(t, off || Math.random() * 0.5, len + 0.05); nodes.push(s);
  };
  const v = vel > 1 ? 1 : 0.72;
  if (id === "kick") {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.85 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.55); nodes.push(o);
    ns("highpass", 2500, 0.7, 0.08 * v, 0.012);
  } else if (id === "snare") {
    ns("bandpass", 1900, 0.8, 0.32 * v, 0.2);
    ns("highpass", 5000, 0.7, 0.12 * v, 0.12);
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle";
    o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(165, t + 0.08);
    g.gain.setValueAtTime(0.25 * v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.15); nodes.push(o);
    const rs = ac.createGain(); rs.gain.value = 0.18; out.connect(rs).connect(bus.wet);
  } else {
    ns("highpass", 7200, 0.8, 0.12 * v, vel > 1 ? 0.11 : 0.05);
  }
  return { end: t + 0.6, kill(at) { out.gain.setTargetAtTime(0, at, 0.01); nodes.forEach(n => { try { n.stop(at + 0.1); } catch (e) {} }); } };
}

// ================================================================
// THE SCHEDULER — looks a little ahead on the audio clock, so timing stays exact.
// A worker keeps ticking even when the tab is in the background.
// ================================================================
let bus = null;
const T = { playing: false, step: 0, resumeStep: 0, nextT: 0, endAt: 0, ending: false, voices: new Set(), queue: [], marks: [], timer: null, worker: null };
function audio() {
  setupAudio();                                   // the site's shared context (rooms use it too)
  if (!bus) bus = makeBus(ctx, master);
  bus.vol.gain.setTargetAtTime(song.volume * song.volume * 1.2, ctx.currentTime, 0.03);
  return ctx;
}
function startTimer() {
  if (T.worker === null) {
    try {
      const src = "let id=0;onmessage=e=>{clearInterval(id);if(e.data==='go')id=setInterval(()=>postMessage(0),25)}";
      T.worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
      T.worker.onmessage = tick;
    } catch (e) { T.worker = false; }
  }
  if (T.worker) T.worker.postMessage("go"); else if (!T.timer) T.timer = setInterval(tick, 25);
}
function stopTimer() {
  if (T.worker) T.worker.postMessage("stop");
  if (T.timer) { clearInterval(T.timer); T.timer = null; }
}
function tick() {
  if (!T.playing) return;
  const now = ctx.currentTime;
  for (const v of T.voices) if (v.end < now) T.voices.delete(v);
  if (T.ending) { if (now > T.endAt) finish(); return; }
  while (T.nextT < now + 0.12) {
    if (T.step >= steps()) T.step = 0;
    scheduleStep(T.step, T.nextT);
    T.nextT += stepDur(); T.step++;
    if (T.step >= steps()) {
      if (song.loop) T.step = 0;
      else { T.ending = true; T.endAt = T.nextT + 0.05; break; }
    }
  }
}
function scheduleStep(s, t) {
  T.marks.push({ s, t, d: stepDur() });
  if (T.marks.length > 96) T.marks.splice(0, 32);
  const sd = stepDur();
  for (const n of song.notes) if (n.s === s) {
    const dur = Math.max(1, Math.min(n.l, steps() - n.s)) * sd * 0.97;
    T.voices.add(playNote(bus, song.inst, n.p, t, dur, n.v));
    T.queue.push({ t, type: "note", note: n, p: n.p, dur, v: n.v, inst: song.inst });
  }
  let strong = 0;
  DRUMS.forEach(dr => {
    const val = song.drums[dr.id][s];
    if (!val) return;
    T.voices.add(playDrum(bus, dr.id, t, val));
    T.queue.push({ t, type: "drum", id: dr.id, v: val });
    if (dr.id === "kick") strong = Math.max(strong, val > 1 ? 1 : s % 16 === 0 ? 0.75 : 0.45);
    else if (val > 1) strong = Math.max(strong, 0.6);
  });
  if (!strong && s % 16 === 0 && song.notes.some(n => n.s === s)) strong = 0.4; // a downbeat carried by the melody alone
  if (strong) T.queue.push({ t, type: "beat", v: strong });
}
function playheadNow() { return ctx.currentTime - (ctx.outputLatency || 0); }
function start() {
  if (T.playing) return;                          // never two loops at once
  audio(); ctx.resume();
  T.playing = true; T.ending = false;
  T.step = T.resumeStep < steps() ? T.resumeStep : 0;
  T.nextT = ctx.currentTime + 0.06;
  T.marks = [];
  startTimer(); tick();
  ui.root.classList.add("s-playing");
  ui.play.setAttribute("aria-label", "Pause");
}
function silence(fade) {
  const at = ctx ? ctx.currentTime : 0;
  for (const v of T.voices) v.kill(at + (fade || 0));
  T.voices.clear();
  T.queue = T.queue.filter(e => e.t <= at);       // nothing scheduled in the future reaches the sculpture
}
function pauseStudio() {
  if (!T.playing) return;
  T.playing = false; stopTimer();
  const m = currentMark();
  T.resumeStep = m ? m.s : 0;
  silence(0.02);
  ui.root.classList.remove("s-playing");
  ui.play.setAttribute("aria-label", "Play");
}
function stopStudio() {
  pauseStudio();
  T.resumeStep = 0; T.marks = [];
  sounding_.clear();
  dirty = true;
}
function finish() { // the piece has reached its end without looping: let the last notes ring and settle
  T.playing = false; T.ending = false; stopTimer();
  T.resumeStep = 0;
  ui.root.classList.remove("s-playing");
  ui.play.setAttribute("aria-label", "Play");
  setTimeout(() => { if (!T.playing) { T.marks = []; dirty = true; } }, 400);
}
function currentMark() {
  if (!ctx) return null;
  const now = playheadNow(); let m = null;
  for (const k of T.marks) if (k.t <= now) m = k; else break;
  return m;
}
function preview(p, len) {
  audio(); ctx.resume();
  const t = ctx.currentTime + 0.01, dur = len || 0.35;
  T.voices.add(playNote(bus, song.inst, p, t, dur, 0.7));
  T.queue.push({ t, type: "note", note: null, p, dur, v: 0.7, inst: song.inst });
}

// ================================================================
// THE SCULPTURE — thousands of particles. At rest they hold a slow, flowing knot.
// Each note gathers particles into its own structure; chords cross and thread into each other.
// ================================================================
const V = { ready: false };
function visBuild() {
  const N = V.N = (navigator.hardwareConcurrency || 4) >= 8 ? 20000 : 14000;
  V.pos = new Float32Array(N * 3); V.vel = new Float32Array(N * 3); V.col = new Float32Array(N * 3);
  V.mix = new Float32Array(N); V.size = new Float32Array(N); V.seed = new Float32Array(N * 7); V.owner = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const a = Math.random(), b = Math.random(), c = Math.random(), d = Math.random();
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    V.seed.set([a, b, c, d, s * Math.cos(th), u, s * Math.sin(th)], i * 7);
    V.size[i] = 0.75 + Math.pow(Math.random(), 4) * 0.7;
  }
  V.forms = []; V.ripples = []; V.E = 0; V.ex = 0; V.exv = 0; V.rot = 0; V.dragX = 0.18; V.dragY = 0; V.claim = 0; V.time = 0;
  const tmp = [0, 0, 0];
  for (let i = 0; i < N; i++) { ambient(i, 0, tmp); V.pos.set(tmp, i * 3); }
  ambientColour();

  const T3 = THREE;
  V.r = new T3.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  V.r.setClearColor(0x000000, 0);
  V.scene = new T3.Scene();
  V.cam = new T3.PerspectiveCamera(32, 1, 0.1, 50);
  V.cam.position.set(0, 0, 7.4);
  V.geo = new T3.BufferGeometry();
  V.aPos = new T3.BufferAttribute(V.pos, 3); V.aPos.setUsage(T3.DynamicDrawUsage);
  V.aCol = new T3.BufferAttribute(V.col, 3); V.aCol.setUsage(T3.DynamicDrawUsage);
  V.aMix = new T3.BufferAttribute(V.mix, 1); V.aMix.setUsage(T3.DynamicDrawUsage);
  V.geo.setAttribute("position", V.aPos); V.geo.setAttribute("color", V.aCol); V.geo.setAttribute("aMix", V.aMix);
  V.geo.setAttribute("aSize", new T3.BufferAttribute(V.size, 1));
  V.geo.boundingSphere = new T3.Sphere(new T3.Vector3(), 6);
  V.mat = new T3.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uPx: { value: 1 }, uMin: { value: 1.2 }, uGround: { value: new T3.Color(0xF0EEE4) } },
    vertexShader: `
      attribute vec3 color; attribute float aSize; attribute float aMix;
      uniform float uPx; uniform float uMin; uniform vec3 uGround;
      varying vec3 vCol; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        gl_PointSize = max(uMin, uPx * aSize * (1.0 + 0.55 * aMix) / depth);
        // soft light from the upper left: particles turned away from it fall into the ground colour
        vec3 n = normalize((modelMatrix * vec4(position, 1.0)).xyz + vec3(0.0, 0.0001, 0.0));
        float lit = 0.5 + 0.5 * dot(n, normalize(vec3(-0.55, 0.7, 0.45)));
        float far = smoothstep(6.0, 9.6, depth);        // air between the viewer and the far side
        vCol = mix(color, uGround, clamp(0.02 + 0.22 * (1.0 - lit) * (1.0 - aMix) + far * 0.45, 0.0, 0.8));
        vA = mix(0.8, 0.97, aMix) * (1.0 - far * 0.35);
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.32, 0.5, r)) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
      }`
  });
  V.points = new T3.Points(V.geo, V.mat);
  V.group = new T3.Group(); V.group.add(V.points); V.scene.add(V.group);
  V.offY = 0;
  V.ready = true;
}
const INK = [0.165, 0.172, 0.165];
function ambientColour() {
  for (let i = 0; i < V.N; i++) {
    const w = V.seed[i * 7 + 3];
    const k = w < 0.08 ? 0 : 1;                  // a few warm ochre motes among the ink
    V.col[i * 3] = k ? INK[0] + w * 0.06 : 0.62; V.col[i * 3 + 1] = k ? INK[1] + w * 0.05 : 0.49; V.col[i * 3 + 2] = k ? INK[2] + w * 0.03 : 0.27;
  }
}
// The resting form: a slow trefoil knot whose tube swells and thins, warped so it flows rather than repeats.
function ambient(i, t, out) {
  const S = V.seed, o = i * 7, a = S[o], d = S[o + 3];
  const u = a * Math.PI * 2 + t * 0.045;
  let x = Math.sin(u) + 2 * Math.sin(2 * u), y = Math.cos(u) - 2 * Math.cos(2 * u), z = -Math.sin(3 * u);
  const tube = (0.035 + 0.16 * d * d * d) * (1 + 0.5 * Math.sin(3 * u + t * 0.23));
  x = x * 0.42 + S[o + 4] * tube; y = y * 0.42 + S[o + 5] * tube; z = z * 0.55 + S[o + 6] * tube;
  const wx = 0.12 * Math.sin(1.3 * y + t * 0.21), wy = 0.16 * Math.sin(1.7 * z + t * 0.17), wz = 0.16 * Math.sin(1.1 * x + t * 0.19);
  const k = (1 + V.ex) * (1 + 0.025 * Math.sin(t * 0.5));
  out[0] = (x + wx) * k; out[1] = (y + wy) * k * 0.92 - 0.05; out[2] = (z + wz) * k;
}
// A note's structure, in its own unit space. Each instrument has its own architecture.
function shape(kind, a, b, c, age, spin, out) {
  let x, y, z, th;
  if (kind === "piano") {                       // a ring, like a struck bell's ripple
    th = a * 6.2832 + spin * age; const ph = b * 6.2832, tw = 0.05 * c * c;
    x = Math.cos(th) * (1 + tw * Math.cos(ph)); y = tw * Math.sin(ph) * 0.7; z = Math.sin(th) * (1 + tw * Math.cos(ph));
  } else if (kind === "strings") {              // a long ribbon wound into a helix, rippling along its length
    th = a * 6.2832 * 1.6 + spin * age; const rad = 0.5 + 0.5 * Math.sin(Math.PI * a), w = (b - 0.5) * 0.16;
    x = (rad + w) * Math.cos(th); z = (rad + w) * Math.sin(th); y = (a - 0.5) * 1.7 + 0.12 * Math.sin(3 * th + age * 1.6) + (c - 0.5) * 0.02;
  } else if (kind === "synth") {                // a lattice sphere: rings of latitude turning against each other
    const band = Math.floor(b * 7), lat = ((band + 0.5) / 7 - 0.5) * Math.PI;
    th = a * 6.2832 + spin * age * (band % 2 ? 1 : -1);
    x = Math.cos(lat) * Math.cos(th); y = Math.sin(lat); z = Math.cos(lat) * Math.sin(th);
    const j = (c - 0.5) * 0.012; x += j; y += j;
  } else if (kind === "musicbox") {             // a small crown of petals
    th = a * 6.2832 + spin * age; const rr = 0.3 + 0.7 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.6) * (0.55 + 0.45 * b);
    x = rr * Math.cos(th); z = rr * Math.sin(th); y = 0.3 * Math.sin(5 * th) * b + (c - 0.5) * 0.06;
  } else {                                      // bass: a dense, low vortex
    const rr = Math.sqrt(a); th = b * 6.2832 + spin * age * 0.7 / (rr + 0.25);
    x = rr * Math.cos(th); z = rr * Math.sin(th); y = (c - 0.5) * 0.16 * (1.1 - rr);
  }
  out[0] = x; out[1] = y; out[2] = z;
}
// Note-on: make a structure, gather particles into it, send a ripple through the whole field.
function noteOn(ev, now) {
  const h = Math.min(1, Math.max(0, (ev.p - LOW) / (HIGH - LOW))), pc = ((ev.p % 12) + 12) % 12, kind = ev.inst;
  const sc = { piano: 1, strings: 0.95, synth: 0.78, musicbox: 0.62, bass: 1.05 }[kind];
  const az = pc / 12 * 6.2832 + 0.4;
  const f = {
    kind, p: ev.p, h, v: ev.v, t0: now, end: now + ev.dur, dur: ev.dur, env: 0,
    tau: Math.min(1.8, 0.35 + 0.28 * ev.dur),          // longer notes hold their structure longer
    cx: 0.42 * Math.cos(az), cy: (kind === "bass" ? -1.15 + 1.0 * h : -0.95 + 1.95 * h), cz: 0.42 * Math.sin(az) * 0.8,
    r: (0.34 + 0.46 * h) * (0.85 + 0.2 * ev.v) * sc,
    k: 4.5 + 6 * h, spin: (0.25 + 0.9 * h) * (pc % 2 ? 1 : -1), rise: 0.1 * h,
    col: INSTRUMENTS[kind].col, ids: [], partner: null, phase: Math.random() * 6.28
  };
  // tilt: different notes lean differently, so the rings of a chord interlock instead of stacking
  const ax = ((pc * 0.37) % 1 - 0.5) * 1.3 + (kind === "bass" ? 0 : 0.25), az2 = (h - 0.5) * 0.9 + (pc % 3 - 1) * 0.3;
  const cX = Math.cos(ax), sX = Math.sin(ax), cZ = Math.cos(az2), sZ = Math.sin(az2);
  f.m = [cZ, -sZ * cX, sZ * sX, sZ, cZ * cX, -cZ * sX, 0, sX, cX];
  // chords: notes beginning together lean on each other and are joined by fine threads
  for (const g of V.forms) if (Math.abs(g.t0 - now) < 0.06 && g.end > now) { f.partner = g; if (!g.partner) g.partner = f; }
  // lower notes gather more particles: denser and heavier; high notes fewer: lighter, more open
  const want = Math.round((1400 - 900 * h) * (0.6 + 0.5 * ev.v) * (kind === "bass" ? 1.3 : 1));
  // gather from nearby first, so particles flow a short way into the shape instead of crossing the whole form
  const N = V.N, P = V.pos; let got = 0;
  for (const lim of [0.55, 1.1, 1e9]) {
    const l2 = lim * lim * f.r * f.r * 4;
    for (let n = 0; n < N && got < want; n++) {
      const i = V.claim; V.claim = (V.claim + 7919) % N;
      if (V.owner[i] !== -1) continue;
      const dx = P[i * 3] - f.cx, dy = P[i * 3 + 1] - f.cy, dz = P[i * 3 + 2] - f.cz;
      if (dx * dx + dy * dy + dz * dz > l2) continue;
      V.owner[i] = 1; f.ids.push(i); got++;
    }
    if (got >= want) break;
  }
  if (V.forms.length >= 14) { const old = V.forms[0]; old.end = Math.min(old.end, now); old.tau = 0.3; }
  V.forms.push(f);
  V.ripples.push({ x: f.cx, y: f.cy, z: f.cz, t0: now, amp: (0.16 + 0.22 * (1 - h)) * ev.v, w: 0.2 });
  if (V.ripples.length > 10) V.ripples.shift();
  V.E = Math.min(1.6, V.E + 0.1 + 0.12 * ev.v);
}
function beat(v, now) { // strong beats open the whole sculpture outwards
  V.exv += 0.4 * v;
  V.ripples.push({ x: 0, y: 0, z: 0, t0: now, amp: 0.4 * v, w: 0.3 });
  if (V.ripples.length > 10) V.ripples.shift();
  V.E = Math.min(1.6, V.E + 0.25 * v);
}
function drumHit(id, v, now) {
  if (id === "snare") { V.ripples.push({ x: 0, y: 0.2, z: 0, t0: now, amp: 0.12 * v, w: 0.16 }); if (V.ripples.length > 10) V.ripples.shift(); V.E = Math.min(1.6, V.E + 0.06); }
  if (id === "hat") { // a shimmer: a scatter of particles is nudged
    for (let n = 0; n < 160; n++) { const i = (Math.random() * V.N) | 0; V.vel[i * 3] += (Math.random() - 0.5) * 0.12; V.vel[i * 3 + 1] += (Math.random() - 0.3) * 0.12; V.vel[i * 3 + 2] += (Math.random() - 0.5) * 0.12; }
    V.E = Math.min(1.6, V.E + 0.015);
  }
}
function visStep(dt, now) {
  const N = V.N, P = V.pos, Vv = V.vel, S = V.seed, own = V.owner;
  // the whole form breathes out on strong beats and returns on a soft spring
  V.exv += (-14 * V.ex - 4.2 * V.exv) * dt; V.ex += V.exv * dt; V.ex = Math.max(-0.08, Math.min(0.28, V.ex));
  V.E *= Math.exp(-dt / 2.4);
  const calm = Math.min(1, V.E), flow = 0.015 + 0.13 * calm, fs = 0.18 + 0.6 * calm;
  // envelopes of the structures
  for (const f of V.forms) {
    const age = now - f.t0;
    f.env = now < f.end ? Math.min(1, age / 0.09) : Math.exp(-(now - f.end) / f.tau) * Math.min(1, age / 0.09);
  }
  // structures that have faded give their particles back to the knot
  V.forms = V.forms.filter(f => {
    if (now > f.end && f.env < 0.03) { for (const i of f.ids) own[i] = -1; if (f.partner && f.partner.partner === f) f.partner.partner = null; return false; }
    return true;
  });
  const tmp = [0, 0, 0], loc = [0, 0, 0];
  // ambient particles
  for (let i = 0; i < N; i++) {
    if (own[i] !== -1) continue;
    ambient(i, now, tmp);
    const o = i * 3;
    for (let k = 0; k < 3; k++) Vv[o + k] += ((tmp[k] - P[o + k]) * 2.2 - Vv[o + k] * 2.4) * dt;
    V.mix[i] *= Math.exp(-dt * 1.5);
  }
  // particles held by note structures
  for (const f of V.forms) {
    const age = now - f.t0, e = f.env, k = f.k, damp = 2 * Math.sqrt(k) * 0.75, m = f.m, sc = f.r * (1 + V.ex) * (0.82 + 0.18 * e);
    const cy = f.cy + f.rise * Math.min(age, 3);
    const cr = f.col, pt = f.partner && V.forms.includes(f.partner) ? f.partner : null;
    for (const i of f.ids) {
      const o = i * 3, so = i * 7;
      let tx, ty, tz;
      if (pt && S[so + 3] < 0.14) {              // a thread of the chord, drawn between two structures
        const s = S[so + 1], sag = Math.sin(Math.PI * s) * 0.18;
        tx = f.cx + (pt.cx - f.cx) * s + S[so + 4] * 0.03; ty = cy + (pt.cy - cy) * s - sag + S[so + 5] * 0.03; tz = f.cz + (pt.cz - f.cz) * s + S[so + 6] * 0.03;
      } else {
        shape(f.kind, S[so], S[so + 1], S[so + 2], age, f.spin, loc);
        tx = f.cx + (m[0] * loc[0] + m[1] * loc[1] + m[2] * loc[2]) * sc;
        ty = cy + (m[3] * loc[0] + m[4] * loc[1] + m[5] * loc[2]) * sc;
        tz = f.cz + (m[6] * loc[0] + m[7] * loc[1] + m[8] * loc[2]) * sc;
      }
      ambient(i, now, tmp);
      // blend from the knot into the structure and back again as the note sounds and fades
      tx = tmp[0] + (tx - tmp[0]) * e; ty = tmp[1] + (ty - tmp[1]) * e; tz = tmp[2] + (tz - tmp[2]) * e;
      const kk = 2.2 + (k - 2.2) * e, dd = 2.4 + (damp - 2.4) * e;
      Vv[o] += ((tx - P[o]) * kk - Vv[o] * dd) * dt; Vv[o + 1] += ((ty - P[o + 1]) * kk - Vv[o + 1] * dd) * dt; Vv[o + 2] += ((tz - P[o + 2]) * kk - Vv[o + 2] * dd) * dt;
      V.mix[i] = Math.max(V.mix[i] * Math.exp(-dt * 1.5), e);
      const w = e * 0.85;
      V.col[o] = V.col[o] + (cr[0] - V.col[o]) * Math.min(1, dt * 6 * w);
      V.col[o + 1] = V.col[o + 1] + (cr[1] - V.col[o + 1]) * Math.min(1, dt * 6 * w);
      V.col[o + 2] = V.col[o + 2] + (cr[2] - V.col[o + 2]) * Math.min(1, dt * 6 * w);
    }
  }
  // ripples travel out through every particle
  V.ripples = V.ripples.filter(r => now - r.t0 < 1.8);
  const rp = V.ripples;
  for (let i = 0; i < N; i++) {
    const o = i * 3, so = i * 7;
    let px = P[o], py = P[o + 1], pz = P[o + 2];
    for (let j = 0; j < rp.length; j++) {
      const r = rp[j], age = now - r.t0, dx = px - r.x, dy = py - r.y, dz = pz - r.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4;
      const x = (d - age * 2.1) / r.w;
      if (x > -2.5 && x < 2.5) { const g = Math.exp(-x * x) * r.amp * (1 - age / 1.8) * dt * 7 / d; Vv[o] += dx * g; Vv[o + 1] += dy * g; Vv[o + 2] += dz * g; }
    }
    // a slow current: almost still in quiet passages, livelier as the music fills
    const ph = S[so + 3] * 6.28;
    Vv[o] += Math.sin(1.7 * py + now * fs + ph) * flow * dt;
    Vv[o + 1] += Math.sin(1.3 * pz + now * fs * 0.8 + ph) * flow * dt * 0.8;
    Vv[o + 2] += Math.sin(1.5 * px + now * fs * 0.9 + ph) * flow * dt;
    P[o] = px + Vv[o] * dt; P[o + 1] = py + Vv[o + 1] * dt; P[o + 2] = pz + Vv[o + 2] * dt;
    // colour drifts back to ink when a particle is free again
    if (own[i] === -1 && V.mix[i] < 0.5) {
      const w = S[so + 3], warm = w < 0.08, tr = warm ? 0.62 : INK[0] + w * 0.06, tg = warm ? 0.49 : INK[1] + w * 0.05, tb = warm ? 0.27 : INK[2] + w * 0.03, q = Math.min(1, dt * 0.8);
      V.col[o] += (tr - V.col[o]) * q; V.col[o + 1] += (tg - V.col[o + 1]) * q; V.col[o + 2] += (tb - V.col[o + 2]) * q;
    }
  }
  V.aPos.needsUpdate = true; V.aCol.needsUpdate = true; V.aMix.needsUpdate = true;
}

// ================================================================
// THE PAGE
// ================================================================
const CSS = `
body.studio #art, body.studio #hint, body.studio #pieces, body.studio #play, body.studio .credit { display: none !important; }
.st { position: fixed; inset: 0; display: none; }
body.studio .st { display: block; }
.st-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.st-canvas:active { cursor: grabbing; }
.st-title { position: absolute; left: 0; right: 0; top: 22px; margin: 0; text-align: center; font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--soft); pointer-events: none; }
.st-panel { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(80px + env(safe-area-inset-bottom, 0px)); width: min(1040px, calc(100% - 32px));
  background: rgba(240, 238, 228, 0.94); border-top: 1px solid var(--line); padding: 14px 0 0; display: grid; gap: 10px; }
.st-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 22px; }
.st-group { display: flex; align-items: center; gap: 8px; }
.st-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--soft); }
.st-val { font-family: var(--serif); font-size: 16px; min-width: 2.2em; font-variant-numeric: lining-nums tabular-nums; }
.st-play { width: 44px; height: 44px; border-color: var(--ink); display: grid; place-items: center; }
.st-play:hover { background: rgba(42, 44, 42, 0.05); }
.st-play svg, .st-icon svg { width: 14px; height: 14px; fill: var(--ink); }
.st-play .pause { display: none; }
.s-playing .st-play .pause { display: block; }
.s-playing .st-play .start { display: none; }
.st-icon { width: 32px; height: 32px; display: grid; place-items: center; }
.st-icon:hover, .st-text:hover { border-color: var(--line); }
.st-icon[aria-pressed="true"] { border-color: var(--ink); }
.st-pill { height: 26px; padding: 0 9px; font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--soft); }
.st-pill:hover { color: var(--ink); }
.st-pill[aria-pressed="true"] { color: var(--ink); border-color: var(--line); }
.st-text { height: 26px; padding: 0 10px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
.st input[type=range] { -webkit-appearance: none; appearance: none; width: 92px; height: 18px; background: transparent; cursor: pointer; }
.st input[type=range]::-webkit-slider-runnable-track { height: 1px; background: var(--ink); opacity: 0.5; }
.st input[type=range]::-moz-range-track { height: 1px; background: rgba(42, 44, 42, 0.5); }
.st input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; margin-top: -5px; border-radius: 50%; background: var(--ink); border: 0; }
.st input[type=range]::-moz-range-thumb { width: 11px; height: 11px; border-radius: 50%; background: var(--ink); border: 0; }
.st select { font-family: var(--serif); font-size: 16px; color: var(--ink); background: transparent; border: 0; border-bottom: 1px solid var(--line); padding: 1px 2px; cursor: pointer; }
.st select:focus-visible, .st input:focus-visible { outline: 1.5px solid var(--ink); outline-offset: 3px; }
.st-roll { height: 168px; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.st-roll canvas, .st-drums canvas { position: static; inset: auto; display: block; touch-action: none; }
.st-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding-bottom: 2px; }
.st-tip { margin: 0; font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--soft); }
.st-msg { font-size: 10px; color: var(--soft); min-width: 7em; }
.st-collapsed .st-roll, .st-collapsed .st-drums, .st-collapsed .st-foot, .st-collapsed .st-more { display: none; }
.st-spacer { flex: 1; }
@media (max-width: 720px) { .st-panel { bottom: calc(76px + env(safe-area-inset-bottom, 0px)); } .st-roll { height: 150px; } .st-title { display: none; } }
`;
const ui = {};
let dirty = true, selected = null, lastLen = 2;
const sounding_ = new Map();   // notes sounding right now -> end time (for highlights)
const KEYW = 46, RH = 12, LANE = 20;

function el(tag, props, kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) { if (k === "class") e.className = props[k]; else if (k === "text") e.textContent = props[k]; else if (k === "html") e.innerHTML = props[k]; else e.setAttribute(k, props[k]); }
  (kids || []).forEach(c => e.appendChild(c));
  return e;
}
function buildUI() {
  document.head.appendChild(el("style", { text: CSS }));
  const root = ui.root = el("section", { class: "st", "aria-label": "Studio: compose music and watch it become a sculpture" });
  ui.canvas = el("canvas", { class: "st-canvas", "aria-label": "A sculpture of particles shaped by the music you compose. Drag to turn it." });
  root.appendChild(ui.canvas);
  root.appendChild(el("p", { class: "st-title", text: "Compose music. Watch it become art." }));
  const panel = ui.panel = el("div", { class: "st-panel" });

  // transport and sound
  ui.play = el("button", { class: "st-play", "aria-label": "Play", html: '<svg class="start" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg><svg class="pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z"/></svg>' });
  ui.stop = el("button", { class: "st-icon", "aria-label": "Stop", title: "Stop", html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h9v9h-9z"/></svg>' });
  ui.loop = el("button", { class: "st-icon", "aria-label": "Loop", title: "Loop", html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 5.2h6.3V3l3.2 3-3.2 3V6.8H4.9a1.8 1.8 0 0 0-1.8 1.8v.6H1.5v-.6a3.4 3.4 0 0 1 2.7-3.4zM11.8 10.8H5.5V13l-3.2-3 3.2-3v2.2h5.6a1.8 1.8 0 0 0 1.8-1.8v-.6h1.6v.6a3.4 3.4 0 0 1-2.7 3.4z"/></svg>' });
  ui.tempo = el("input", { type: "range", min: "50", max: "160", step: "1", "aria-label": "Tempo" });
  ui.tempoV = el("span", { class: "st-val" });
  ui.vol = el("input", { type: "range", min: "0", max: "1", step: "0.01", "aria-label": "Volume" });
  ui.key = el("select", { "aria-label": "Key" }); KEYS.forEach((k, i) => ui.key.appendChild(el("option", { value: String(i), text: k })));
  ui.scale = el("select", { "aria-label": "Scale" }); Object.keys(SCALES).forEach(s => ui.scale.appendChild(el("option", { value: s, text: SCALES[s].label })));
  ui.insts = el("div", { class: "st-group", role: "group", "aria-label": "Instrument" });
  Object.keys(INSTRUMENTS).forEach(id => {
    const b = el("button", { class: "st-pill", "data-inst": id, text: INSTRUMENTS[id].label });
    b.addEventListener("click", () => { song.inst = id; refresh(); saveDraft(); preview(rows[Math.floor(rows.length * 0.45)] || 72, 0.5); });
    ui.insts.appendChild(b);
  });
  ui.fold = el("button", { class: "st-icon", "aria-label": "Hide the studio", title: "Hide the studio", html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5-1.2-1.2L8 8.6 4.2 4.8z"/></svg>' });
  panel.appendChild(el("div", { class: "st-row" }, [
    el("div", { class: "st-group" }, [ui.play, ui.stop, ui.loop]),
    el("div", { class: "st-group st-more" }, [el("span", { class: "st-label", text: "Tempo" }), ui.tempo, ui.tempoV]),
    el("div", { class: "st-group st-more" }, [el("span", { class: "st-label", text: "Volume" }), ui.vol]),
    el("div", { class: "st-group st-more" }, [el("span", { class: "st-label", text: "Key" }), ui.key, ui.scale]),
    el("span", { class: "st-spacer" }),
    ui.insts, ui.fold
  ]));

  // piano roll and drums
  ui.rollWrap = el("div", { class: "st-roll" });
  ui.roll = el("canvas", { "aria-label": "Piano roll: click to place a note, drag to move it, drag its right end to lengthen it, double-click to remove it" });
  ui.rollWrap.appendChild(ui.roll);
  ui.drums = el("canvas", { "aria-label": "Drums: click a dot to add a beat, click again for a strong beat, a third time to remove it" });
  panel.appendChild(ui.rollWrap);
  panel.appendChild(el("div", { class: "st-drums" }, [ui.drums]));

  // tips, files
  ui.bars = el("div", { class: "st-group", role: "group", "aria-label": "Length" });
  [2, 4].forEach(n => { const b = el("button", { class: "st-pill", "data-bars": String(n), text: n + " bars" }); b.addEventListener("click", () => { song.bars = n; if (selected && selected.s >= steps()) selected = null; refresh(); saveDraft(); }); ui.bars.appendChild(b); });
  ui.clear = el("button", { class: "st-text", text: "Clear" });
  ui.reset = el("button", { class: "st-text", text: "Example" });
  ui.save = el("button", { class: "st-text", text: "Save" });
  ui.saved = el("select", { "aria-label": "Saved compositions" });
  ui.del = el("button", { class: "st-text", text: "Delete", hidden: "" });
  ui.midi = el("button", { class: "st-text", text: "MIDI" });
  ui.wav = el("button", { class: "st-text", text: "WAV" });
  ui.msg = el("span", { class: "st-msg", role: "status" });
  panel.appendChild(el("div", { class: "st-foot" }, [
    el("div", { class: "st-group" }, [ui.bars, ui.clear, ui.reset]),
    el("p", { class: "st-tip", text: "Click the grid to place a note. Press play." }),
    el("div", { class: "st-group" }, [ui.save, ui.saved, ui.del, el("span", { class: "st-label", text: "Export" }), ui.midi, ui.wav, ui.msg])
  ]));
  root.appendChild(panel);
  document.body.insertBefore(root, document.querySelector("nav.controls"));

  // ---- wiring ----
  ui.play.addEventListener("click", () => (T.playing ? pauseStudio() : start()));
  ui.stop.addEventListener("click", stopStudio);
  ui.loop.addEventListener("click", () => { song.loop = !song.loop; refresh(); saveDraft(); });
  ui.tempo.addEventListener("input", () => { song.tempo = +ui.tempo.value; ui.tempoV.textContent = song.tempo; saveDraft(); });
  ui.vol.addEventListener("input", () => { song.volume = +ui.vol.value; if (bus) bus.vol.gain.setTargetAtTime(song.volume * song.volume * 1.2, ctx.currentTime, 0.03); saveDraft(); });
  ui.key.addEventListener("change", () => {
    let d = (+ui.key.value - song.key + 12) % 12; if (d > 6) d -= 12;      // move the melody the shortest way
    song.key = +ui.key.value;
    song.notes.forEach(n => { n.p = Math.min(HIGH, Math.max(LOW, n.p + d)); });
    buildRows(); song.notes.forEach(n => { n.p = snap(n.p); }); refresh(); saveDraft();
  });
  ui.scale.addEventListener("change", () => { song.scale = ui.scale.value; buildRows(); song.notes.forEach(n => { n.p = snap(n.p); }); refresh(); saveDraft(); });
  ui.fold.addEventListener("click", () => {
    const c = panel.classList.toggle("st-collapsed");
    ui.fold.setAttribute("aria-label", c ? "Show the studio" : "Hide the studio"); ui.fold.title = ui.fold.getAttribute("aria-label");
    ui.fold.style.transform = c ? "rotate(180deg)" : "";
    layout();
  });
  ui.clear.addEventListener("click", () => { song = blank(song); selected = null; refresh(); saveDraft(); say("Cleared"); });
  ui.reset.addEventListener("click", () => { stopStudio(); song = example(); selected = null; buildRows(); refresh(); saveDraft(); centreRoll(); say("Example loaded"); });
  ui.save.addEventListener("click", saveComposition);
  ui.saved.addEventListener("change", () => loadComposition(ui.saved.value));
  ui.del.addEventListener("click", deleteComposition);
  ui.midi.addEventListener("click", () => { download(makeMidi(), "composition.mid", "audio/midi"); say("MIDI saved"); });
  ui.wav.addEventListener("click", exportWav);
  rollEvents(); drumEvents(); sculptureDrag();
  new ResizeObserver(layout).observe(panel);
  window.addEventListener("resize", () => { if (open_) layout(); });
}
function say(s) { ui.msg.textContent = s; clearTimeout(say.t); say.t = setTimeout(() => { ui.msg.textContent = ""; }, 2600); }
function refresh() {
  ui.tempo.value = song.tempo; ui.tempoV.textContent = song.tempo; ui.vol.value = song.volume;
  ui.key.value = String(song.key); ui.scale.value = song.scale;
  ui.loop.setAttribute("aria-pressed", String(song.loop));
  [...ui.insts.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.inst === song.inst)));
  [...ui.bars.children].forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.bars === song.bars)));
  sizeRoll(); dirty = true;
}

// ---------- piano roll ----------
let rollW = 0, DPRr = 1;
function sizeRoll() {
  DPRr = Math.min(window.devicePixelRatio || 1, 2);
  rollW = Math.max(300, ui.rollWrap.clientWidth);
  const h = rows.length * RH;
  ui.roll.style.width = rollW + "px"; ui.roll.style.height = h + "px";
  ui.roll.width = Math.round(rollW * DPRr); ui.roll.height = Math.round(h * DPRr);
  ui.drums.style.width = rollW + "px"; ui.drums.style.height = DRUMS.length * LANE + "px";
  ui.drums.width = Math.round(rollW * DPRr); ui.drums.height = Math.round(DRUMS.length * LANE * DPRr);
  dirty = true;
}
function centreRoll() {
  const i = rows.findIndex(p => p <= 72);
  ui.rollWrap.scrollTop = Math.max(0, i * RH - ui.rollWrap.clientHeight * 0.35);
}
const stepW = () => (rollW - KEYW) / steps();
const noteName = p => ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][p % 12] + (Math.floor(p / 12) - 1);
function drawRoll(head) {
  const g = ui.roll.getContext("2d"), w = rollW, h = rows.length * RH, sw = stepW(), n = steps();
  g.setTransform(DPRr, 0, 0, DPRr, 0, 0);
  g.clearRect(0, 0, w, h);
  const ins = INSTRUMENTS[song.inst];
  // rows: the home note of the key is gently marked, as the place melodies like to return to
  rows.forEach((p, r) => {
    const y = r * RH;
    if ((p - song.key) % 12 === 0) { g.fillStyle = "rgba(196,154,62,0.10)"; g.fillRect(KEYW, y, w - KEYW, RH); }
    g.fillStyle = "rgba(42,44,42,0.07)"; g.fillRect(KEYW, y + RH - 0.5, w - KEYW, 0.5);
  });
  for (let s = 0; s <= n; s++) {
    const x = Math.round(KEYW + s * sw) + 0.5;
    g.fillStyle = s % 16 === 0 ? "rgba(42,44,42,0.32)" : s % 4 === 0 ? "rgba(42,44,42,0.14)" : "rgba(42,44,42,0.05)";
    g.fillRect(x - 0.5, 0, s % 16 === 0 ? 1 : 0.6, h);
  }
  // keyboard
  const lit = new Set(); for (const [nn, e] of sounding_) lit.add(nn.p !== undefined ? nn.p : nn);
  rows.forEach((p, r) => {
    const y = r * RH, black = [1, 3, 6, 8, 10].includes(p % 12);
    g.fillStyle = lit.has(p) ? "#C49A3E" : black ? "#3A3B39" : "#FAF8F1";
    g.fillRect(0, y + 0.5, KEYW - 6, RH - 1);
    if (p % 12 === 0) { g.fillStyle = lit.has(p) ? "#FAF8F1" : "#8C8A80"; g.font = "9px 'DM Mono', monospace"; g.textBaseline = "middle"; g.fillText(noteName(p), 4, y + RH / 2 + 0.5); }
  });
  g.fillStyle = "rgba(42,44,42,0.16)"; g.fillRect(KEYW - 6, 0, 0.6, h);
  // notes
  for (const nt of song.notes) {
    const r = rows.indexOf(nt.p); if (r < 0 || nt.s >= n) continue;
    const x = KEYW + nt.s * sw + 1, y = r * RH + 1.5, ww = Math.max(3, Math.min(nt.l, n - nt.s) * sw - 2), hh = RH - 3;
    const on = sounding_.has(nt);
    g.fillStyle = on ? "#C49A3E" : ins.css;
    g.globalAlpha = on ? 1 : 0.86;
    rr(g, x, y, ww, hh, 2.5); g.fill(); g.globalAlpha = 1;
    if (ww > 10) { g.fillStyle = "rgba(250,248,241,0.55)"; g.fillRect(x + ww - 3.5, y + 2.5, 1, hh - 5); }
    if (nt === selected) { g.strokeStyle = "#2A2C2A"; g.lineWidth = 1.2; rr(g, x - 1, y - 1, ww + 2, hh + 2, 3); g.stroke(); }
  }
  if (head != null) { const x = KEYW + head * sw; g.fillStyle = "#2A2C2A"; g.fillRect(x, 0, 1, h); }
  // drums
  const d = ui.drums.getContext("2d");
  d.setTransform(DPRr, 0, 0, DPRr, 0, 0); d.clearRect(0, 0, w, DRUMS.length * LANE);
  const hs = head != null ? Math.floor(head) : -1;
  DRUMS.forEach((dr, li) => {
    const y = li * LANE + LANE / 2;
    d.fillStyle = "#8C8A80"; d.font = "9px 'DM Mono', monospace"; d.textBaseline = "middle"; d.fillText(dr.label, 0, y + 0.5);
    for (let s = 0; s < n; s++) {
      const x = KEYW + (s + 0.5) * sw, v = song.drums[dr.id][s], now = s === hs;
      d.beginPath();
      if (!v) { d.arc(x, y, 2.2, 0, Math.PI * 2); d.strokeStyle = s % 4 === 0 ? "rgba(42,44,42,0.38)" : "rgba(42,44,42,0.2)"; d.lineWidth = 0.8; d.stroke(); }
      else { d.arc(x, y, v > 1 ? 5 : 3.6, 0, Math.PI * 2); d.fillStyle = now ? "#C49A3E" : "#2A2C2A"; d.fill(); if (v > 1) { d.beginPath(); d.arc(x, y, 7, 0, Math.PI * 2); d.strokeStyle = now ? "#C49A3E" : "rgba(42,44,42,0.45)"; d.lineWidth = 0.8; d.stroke(); } }
    }
  });
  if (head != null) { d.fillStyle = "rgba(42,44,42,0.5)"; d.fillRect(KEYW + head * sw, 0, 1, DRUMS.length * LANE); }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rollPoint(e) { const b = ui.roll.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
function hitNote(x, y) {
  const r = Math.floor(y / RH), sw = stepW();
  for (let i = song.notes.length - 1; i >= 0; i--) {
    const n = song.notes[i];
    if (rows.indexOf(n.p) !== r || n.s >= steps()) continue;
    const x0 = KEYW + n.s * sw, x1 = x0 + Math.min(n.l, steps() - n.s) * sw;
    if (x >= x0 && x <= x1) return { n, edge: x > x1 - Math.min(7, (x1 - x0) * 0.35) };
  }
  return null;
}
function rollEvents() {
  const c = ui.roll; let drag = null;
  c.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const { x, y } = rollPoint(e), r = Math.floor(y / RH);
    if (r < 0 || r >= rows.length) return;
    if (x < KEYW) { preview(rows[r], 0.6); return; }
    c.setPointerCapture(e.pointerId);
    const s = Math.max(0, Math.min(steps() - 1, Math.floor((x - KEYW) / stepW())));
    const hit = hitNote(x, y);
    if (hit) {
      selected = hit.n;
      drag = hit.edge ? { mode: "size", n: hit.n } : { mode: "move", n: hit.n, grab: s - hit.n.s, x0: x, y0: y, moved: false };
    } else {
      const n = { p: rows[r], s, l: Math.min(lastLen, steps() - s), v: 0.8 };
      song.notes.push(n); selected = n;
      drag = { mode: "draw", n, x0: x };
      preview(n.p);
    }
    dirty = true;
  });
  c.addEventListener("pointermove", e => {
    const { x, y } = rollPoint(e);
    if (!drag) {
      const h = x >= KEYW && hitNote(x, y);
      c.style.cursor = x < KEYW ? "pointer" : h ? (h.edge ? "ew-resize" : "grab") : "crosshair";
      return;
    }
    const n = drag.n, sw = stepW(), s = Math.floor((x - KEYW) / sw);
    if (drag.mode === "move") {
      if (!drag.moved && Math.abs(x - drag.x0) + Math.abs(y - drag.y0) < 4) return;
      drag.moved = true;
      const r = Math.max(0, Math.min(rows.length - 1, Math.floor(y / RH)));
      const ns = Math.max(0, Math.min(steps() - n.l, s - drag.grab));
      if (rows[r] !== n.p) { n.p = rows[r]; preview(n.p, 0.25); }
      n.s = Math.max(0, ns);
    } else if (drag.mode === "size" || (drag.mode === "draw" && Math.abs(x - drag.x0) > 4)) {
      n.l = Math.max(1, Math.min(steps() - n.s, Math.round((x - (KEYW + n.s * sw)) / sw)));
    }
    dirty = true;
  });
  const up = () => { if (drag) { lastLen = drag.n.l; drag = null; saveDraft(); dirty = true; } };
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  const remove = e => {
    const { x, y } = rollPoint(e), h = hitNote(x, y);
    if (h) { e.preventDefault(); song.notes.splice(song.notes.indexOf(h.n), 1); if (selected === h.n) selected = null; sounding_.delete(h.n); saveDraft(); dirty = true; }
  };
  c.addEventListener("dblclick", remove);
  c.addEventListener("contextmenu", remove);
}
function drumEvents() {
  const c = ui.drums; let paint = null;
  const cell = e => { const b = c.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; return { lane: Math.floor(y / LANE), s: Math.floor((x - KEYW) / stepW()) }; };
  c.addEventListener("pointerdown", e => {
    const { lane, s } = cell(e); if (lane < 0 || lane >= DRUMS.length || s < 0 || s >= steps()) return;
    c.setPointerCapture(e.pointerId);
    const arr = song.drums[DRUMS[lane].id], v = (arr[s] + 1) % 3;
    arr[s] = v; paint = { lane, v };
    if (v) { audio(); ctx.resume(); T.voices.add(playDrum(bus, DRUMS[lane].id, ctx.currentTime + 0.005, v)); }
    dirty = true;
  });
  c.addEventListener("pointermove", e => {
    if (!paint) return;
    const { s } = cell(e); if (s < 0 || s >= steps()) return;
    const arr = song.drums[DRUMS[paint.lane].id];
    if (arr[s] !== paint.v) { arr[s] = paint.v; dirty = true; }
  });
  const up = () => { if (paint) { paint = null; saveDraft(); } };
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
}
function sculptureDrag() {
  let d = null;
  ui.canvas.addEventListener("pointerdown", e => { d = { x: e.clientX, y: e.clientY }; ui.canvas.setPointerCapture(e.pointerId); });
  ui.canvas.addEventListener("pointermove", e => {
    if (!d) return;
    V.dragY += (e.clientX - d.x) * 0.006; V.dragX = Math.max(-0.7, Math.min(0.9, V.dragX + (e.clientY - d.y) * 0.004));
    d = { x: e.clientX, y: e.clientY };
  });
  const up = () => { d = null; };
  ui.canvas.addEventListener("pointerup", up); ui.canvas.addEventListener("pointercancel", up);
}

// ---------- layout: the sculpture sits in the open space above the studio ----------
function layout() {
  if (!V.ready) return;
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  V.r.setPixelRatio(dpr); V.r.setSize(W, H, false);
  const top = ui.panel.getBoundingClientRect().top, free = Math.max(160, top - 50);
  V.free = free; V.W = W; V.H = H;
  // fit the sculpture (about 4.2 units tall, 4.6 wide) into the free area
  const tn = Math.tan(V.cam.fov / 2 * Math.PI / 180), aspect = W / H;
  const needH = 3.9 / 2 / tn * (H / free), needW = 4.6 / 2 / (tn * aspect);
  V.cam.position.z = Math.max(needH, needW, 6.2);
  V.cam.aspect = aspect;
  V.targetOff = H / 2 - (50 + free / 2);
  if (V.offY === 0) V.offY = V.targetOff;
  V.cam.setViewOffset(W, H, 0, V.offY, W, H);
  V.mat.uniforms.uPx.value = dpr * 0.034 * Math.min(free, 900) * (V.cam.position.z / 7.4); V.mat.uniforms.uMin.value = 1.3 * dpr;
  sizeRoll();
}

// ---------- the studio's own frame loop (runs only while the studio is open) ----------
let raf = 0, lastF = 0;
function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(1 / 30, (now - lastF) / 1000 || 0.016); lastF = now;
  V.time += dt;
  // hand note events to the sculpture exactly when they are heard
  if (ctx) {
    const at = playheadNow();
    while (T.queue.length && T.queue[0].t <= at) {
      const ev = T.queue.shift();
      if (ev.type === "note") { noteOn(ev, V.time); sounding_.set(ev.note || ev.p, at + ev.dur); dirty = true; }
      else if (ev.type === "beat") beat(ev.v, V.time);
      else drumHit(ev.id, ev.v, V.time);
    }
    for (const [k, end] of sounding_) if (end < at) { sounding_.delete(k); dirty = true; }
  }
  // the camera eases when the studio is folded away or unfolded
  if (Math.abs(V.offY - V.targetOff) > 0.5) { V.offY += (V.targetOff - V.offY) * Math.min(1, dt * 6); V.cam.setViewOffset(V.W, V.H, 0, V.offY, V.W, V.H); }
  visStep(dt, V.time);
  V.rot += dt * (0.035 + 0.06 * Math.min(1, V.E));
  V.group.rotation.set(V.dragX, V.rot + V.dragY, 0);
  V.r.render(V.scene, V.cam);
  const m = (T.playing || T.marks.length) ? currentMark() : null;
  const head = m ? m.s + Math.min(1, Math.max(0, (playheadNow() - m.t) / m.d)) : null;
  if (dirty || head != null) { drawRoll(head); dirty = false; }
}

// ---------- save, load, export ----------
function savedList() { const l = store.get("studio-saved"); return Array.isArray(l) ? l : []; }
function fillSaved(sel) {
  const l = savedList();
  ui.saved.innerHTML = "";
  ui.saved.appendChild(el("option", { value: "", text: l.length ? "Open…" : "Nothing saved yet" }));
  l.forEach((s, i) => ui.saved.appendChild(el("option", { value: String(i), text: s.name })));
  ui.saved.value = sel != null ? String(sel) : "";
  ui.del.hidden = sel == null;
}
function saveComposition() {
  const l = savedList(), d = new Date();
  const name = "Composition " + (l.length + 1) + " · " + d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  l.push({ name, song: JSON.parse(JSON.stringify(song)) });
  if (store.set("studio-saved", l)) { fillSaved(l.length - 1); say("Saved"); } else say("This browser won’t let the page save");
}
function loadComposition(v) {
  if (v === "") { ui.del.hidden = true; return; }
  const item = savedList()[+v]; if (!item) return;
  stopStudio(); song = sanitize(item.song); selected = null; buildRows(); refresh(); saveDraft(); centreRoll();
  ui.del.hidden = false; say("Opened");
}
function deleteComposition() {
  const i = ui.saved.value; if (i === "") return;
  const l = savedList(); l.splice(+i, 1); store.set("studio-saved", l); fillSaved(); say("Deleted");
}
function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = el("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function makeMidi() {
  const PPQ = 480, TPS = PPQ / 4;
  const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  const str = s => [...unescape(encodeURIComponent(s))].map(ch => ch.charCodeAt(0));
  const track = evs => {
    evs.sort((a, b) => a.t - b.t || a.o - b.o);
    let last = 0; const out = [];
    for (const e of evs) { out.push(...vlq(e.t - last), ...e.b); last = e.t; }
    out.push(0, 0xff, 0x2f, 0);
    const n = out.length;
    return [0x4d, 0x54, 0x72, 0x6b, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, ...out];
  };
  const us = Math.round(60e6 / song.tempo), n = steps();
  const t0 = track([{ t: 0, o: 0, b: [0xff, 0x03, ...vlq(str("Composition").length), ...str("Composition")] },
    { t: 0, o: 0, b: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] },
    { t: 0, o: 0, b: [0xff, 0x58, 4, 4, 2, 24, 8] }]);
  const mel = [{ t: 0, o: 0, b: [0xff, 0x03, ...vlq(str(INSTRUMENTS[song.inst].label).length), ...str(INSTRUMENTS[song.inst].label)] }, { t: 0, o: 0, b: [0xc0, INSTRUMENTS[song.inst].prog] }];
  song.notes.filter(x => x.s < n).forEach(x => {
    const p = sounding(song.inst, x.p), l = Math.min(x.l, n - x.s);
    mel.push({ t: x.s * TPS, o: 1, b: [0x90, p, Math.round(x.v * 112)] }, { t: (x.s + l) * TPS - 1, o: 0, b: [0x80, p, 0] });
  });
  const dr = [{ t: 0, o: 0, b: [0xff, 0x03, 5, ...str("Drums")] }];
  DRUMS.forEach(d => song.drums[d.id].slice(0, n).forEach((v, s) => { if (v) dr.push({ t: s * TPS, o: 1, b: [0x99, d.midi, v > 1 ? 120 : 88] }, { t: s * TPS + 60, o: 0, b: [0x89, d.midi, 0] }); }));
  const tracks = [t0, track(mel), track(dr)];
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
  return new Uint8Array([].concat(head, ...tracks));
}
async function exportWav() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) { say("WAV isn’t supported in this browser"); return; }
  ui.wav.disabled = true; say("Rendering…");
  try {
    const sr = 44100, sd = stepDur(), n = steps(), len = n * sd + 3.2;
    const oc = new OAC(2, Math.ceil(len * sr), sr), ob = makeBus(oc, oc.destination);
    ob.vol.gain.value = song.volume * song.volume * 1.2;
    const t0 = 0.05;
    for (let s = 0; s < n; s++) {
      const t = t0 + s * sd;
      song.notes.forEach(x => { if (x.s === s) playNote(ob, song.inst, x.p, t, Math.min(x.l, n - x.s) * sd * 0.97, x.v); });
      DRUMS.forEach(d => { const v = song.drums[d.id][s]; if (v) playDrum(ob, d.id, t, v); });
    }
    const buf = await oc.startRendering();
    download(encodeWav(buf), "composition.wav", "audio/wav");
    say("WAV saved");
  } catch (e) { say("Couldn’t render the WAV"); }
  ui.wav.disabled = false;
}
function encodeWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); data.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, "data"); data.setUint32(40, len * ch * 2, true);
  const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
  let peak = 0; for (const c of chans) for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(c[i]));
  const k = peak > 0.98 ? 0.98 / peak : 1;
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i] * k)); data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return data.buffer;
}

// ================================================================
// ENTERING AND LEAVING — ♪ sits between 6 and ? in the site's own navigation
// ================================================================
let open_ = false, built = false;
const navBtn = document.createElement("button");
navBtn.textContent = "♪";
navBtn.className = "st-nav";
navBtn.setAttribute("aria-label", "Studio: compose your own music");
navBtn.setAttribute("aria-current", "false");
const qBtn = [...roomsEl.querySelectorAll("button")].find(b => b.textContent === "?");
roomsEl.insertBefore(navBtn, qBtn || null);
navBtn.addEventListener("click", openStudio);
// any room button leaves the studio first (capture runs before the room button's own handler)
roomsEl.addEventListener("click", e => { const b = e.target.closest("button"); if (b && b !== navBtn && open_) closeStudio(); }, true);

function openStudio() {
  if (open_) return;
  if (typeof THREE === "undefined") return;
  if (wantSound) pause();                          // the room's music stops; the studio has its own
  open_ = true; window.STUDIO_OPEN = true;
  if (!built) {
    built = true;
    song = sanitize(store.get("studio-draft") || example());
    buildUI(); buildRows(); visBuild(); refresh(); fillSaved();
  }
  document.body.classList.add("studio");
  [...roomsEl.querySelectorAll("button")].forEach(b => b.setAttribute("aria-current", String(b === navBtn)));
  try { history.replaceState(null, "", "#studio"); } catch (e) {}
  live.textContent = "Studio";
  layout(); centreRoll();
  lastF = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function closeStudio() {
  if (!open_) return;
  stopStudio();
  open_ = false; window.STUDIO_OPEN = false;
  cancelAnimationFrame(raf); raf = 0;
  document.body.classList.remove("studio");
  navBtn.setAttribute("aria-current", "false");
  renderControls();
}
// keys inside the studio: space plays or pauses the composition, Delete removes the chosen note
document.addEventListener("keydown", e => {
  if (!open_) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "select" || tag === "textarea") return;
  if (e.key === " ") { if (tag === "button") return; e.preventDefault(); e.stopPropagation(); T.playing ? pauseStudio() : start(); }
  else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
    e.preventDefault(); song.notes.splice(song.notes.indexOf(selected), 1); sounding_.delete(selected); selected = null; saveDraft(); dirty = true;
  }
}, true);
document.addEventListener("visibilitychange", () => { if (document.hidden && open_) lastF = performance.now(); });

if (location.hash === "#studio") openStudio();
})();
