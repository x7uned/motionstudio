// Arranged background beds · background-beds/v3 (2026-10-20). The user approved the arranged demo
// (work/vizavi-demo): sections and musical accents follow the film's story instead of a loop.
// node arranged.mjs <bed> <seconds> <arrangement.json> <out.f32>  → raw float32 stereo 48 kHz. Deterministic.
import fs from 'node:fs';
const SR = 48000, TAU = Math.PI * 2;
const [,, bedId, seconds, arrangementPath, out] = process.argv;
const plan = JSON.parse(fs.readFileSync(arrangementPath, 'utf8'));
const N = Math.round(Number(seconds) * SR), T = N / SR;
let seed = 2026;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const put = (b, i, v, pan) => { if (i >= 0 && i < N) { b.L[i] += v * Math.cos(pan * Math.PI / 2); b.R[i] += v * Math.sin(pan * Math.PI / 2); } };
const tri = (r, q) => q.map(i => r + i);

/* ───── Instruments ───── */
function pad(b, midi, t0, dur, amp, { attack = .5, release = .7, harm = 4, detune = 6, saw = false } = {}) {
  const f = mtof(midi), s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(N, Math.floor((t0 + dur + release) * SR));
  const H = []; for (let h = 1; h <= harm; h++) H.push([h, saw ? 1 / h : [1, .35, .15, .06, .03, .02][h - 1] ?? .01, rnd() * TAU, rnd() * TAU]);
  const fl = f * 2 ** (-detune / 1200), fr = f * 2 ** (detune / 1200);
  for (let i = s0; i < s1; i++) {
    const t = i / SR - t0, env = smooth(t / attack) * (t > dur ? 1 - smooth((t - dur) / release) : 1);
    if (env <= 0) continue;
    let l = 0, r = 0; for (const [h, a, pl, pr] of H) { l += a * Math.sin(pl + TAU * fl * h * t); r += a * Math.sin(pr + TAU * fr * h * t); }
    b.L[i] += l * env * amp; b.R[i] += r * env * amp;
  }
}
function tone(b, midi, t0, amp, pan, decay, partials, attack = .004, glide = 0) {
  const f = mtof(midi), s0 = Math.floor(t0 * SR), len = Math.floor(Math.min(decay * 5, 6) * SR); let ph = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR, fk = f * (glide ? 2 ** (-glide * (1 - Math.exp(-t * 18))) : 1); ph += TAU * fk / SR; let v = 0;
    for (const [h, a, dk = 1] of partials) v += a * Math.exp(-t * dk / decay) * Math.sin(ph * h);
    put(b, s0 + k, v * Math.min(1, t / attack) * amp, pan);
  }
}
function pluck(b, midi, t0, amp, pan, decay = 1, bright = .5) {
  const f = mtof(midi), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P);
  let y = 0; for (let i = 0; i < P; i++) { y += bright * ((rnd() * 2 - 1) - y); buf[i] = y; }
  const g = Math.exp(-1 / (decay * f)), s0 = Math.floor(t0 * SR), len = Math.floor(decay * 4 * SR); let prev = 0;
  for (let k = 0; k < len; k++) { const j = k % P, v = buf[j]; buf[j] = g * .5 * (v + prev); prev = v; put(b, s0 + k, v * amp * Math.min(1, k / 48), pan); }
}
const square = (b, m, t0, amp, pan, decay, harm = 6) => tone(b, m, t0, amp, pan, decay, Array.from({ length: harm }, (_, k) => [2 * k + 1, 1 / (2 * k + 1), 1 + k * .3]), .003);
const bell = (b, m, t0, amp, pan, decay = 1.4) => tone(b, m, t0, amp, pan, decay, [[1, 1], [2.76, .2, 2], [5.4, .06, 4]], .002);
const glass = (b, m, t0, amp, pan) => tone(b, m, t0, amp, pan, .35, [[1, 1], [2, .12, 2], [3, .06, 3]]);
const rhodes = (b, m, t0, amp, pan, decay = 1.4) => tone(b, m, t0, amp, pan, decay, [[1, 1], [2, .22], [3, .05]]);
function hat(b, t0, amp, decay = .025, pan = .62) { const s0 = Math.floor(t0 * SR); let x1 = 0, y = 0; for (let i = 0; i < decay * 6 * SR; i++) { const w = rnd() * 2 - 1; y = .6 * (y + w - x1); x1 = w; put(b, s0 + i, y * Math.exp(-i / SR / decay) * amp, pan); } }
function kick(b, t0, amp) { const s0 = Math.floor(t0 * SR); for (let i = 0; i < SR * .35; i++) { const x = i / SR; put(b, s0 + i, Math.sin(TAU * (48 * x + 1.4 * (1 - Math.exp(-x * 35)))) * Math.exp(-x * 10) * Math.min(1, x / .002) * amp, .5); } }
function swell(b, t1, len, amp) { const s0 = Math.floor((t1 - len) * SR); let lp = 0; for (let i = 0; i < len * SR; i++) { const x = i / (len * SR), w = rnd() * 2 - 1; lp += (.02 + .25 * x * x) * (w - lp); put(b, s0 + i, lp * x * x * (1 - smooth((x - .94) / .06)) * amp, .35 + .3 * x); } }
function lowpass(b, cut) { for (const arr of [b.L, b.R]) for (let p = 0; p < 2; p++) { let y = 0; for (let i = 0; i < N; i++) { y += (1 - Math.exp(-TAU * cut(i / SR) / SR)) * (arr[i] - y); arr[i] = y; } } }
function gate(b, g) { for (let i = 0; i < N; i++) { const v = g(i / SR); b.L[i] *= v; b.R[i] *= v; } }
function reverb(b, wet, room = .84, damp = .3) {
  const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const inp = new Float32Array(N); for (let i = 0; i < N; i++) inp[i] = (b.L[i] + b.R[i]) * .015;
  for (const [arr, sp] of [[b.L, 0], [b.R, 23]]) {
    const c = combs.map(n => ({ b: new Float32Array(Math.round((n + sp) * sc)), i: 0, s: 0 })), a = aps.map(n => ({ b: new Float32Array(Math.round((n + sp) * sc)), i: 0 }));
    for (let i = 0; i < N; i++) {
      let o = 0;
      for (const k of c) { const y = k.b[k.i]; k.s = y * (1 - damp) + k.s * damp; k.b[k.i] = inp[i] + k.s * room; k.i = (k.i + 1) % k.b.length; o += y; }
      for (const k of a) { const bo = k.b[k.i]; k.b[k.i] = o + bo * .5; k.i = (k.i + 1) % k.b.length; o = bo - o; }
      arr[i] = arr[i] * (1 - wet) + o * wet * 3;
    }
  }
}

/* ───── Bed voices: the approved timbres of v1/v2, with harmony per section ───── */
const BEDS = {
  'chip-soft': { prog: [tri(60, [0, 4, 7]), tri(55, [0, 4, 7]), tri(57, [0, 3, 7]), tri(53, [0, 4, 7])], intro: [tri(57, [0, 3, 7]), tri(53, [0, 4, 7])], tension: tri(53, [0, 3, 7]), dom: tri(55, [0, 4, 7]), tonic: tri(60, [0, 4, 7, 14]), padOct: -12, padAmp: .022, padCut: [1100, 650, 1400], reverb: .26 },
  'pluck-curious': { prog: [tri(53, [0, 4, 7, 14]), [52, 55, 60, 64], tri(50, [0, 3, 7, 10]), tri(46, [0, 4, 7, 11])], intro: [tri(50, [0, 3, 7, 10]), tri(46, [0, 4, 7, 11])], tension: tri(46, [0, 3, 7]), dom: tri(48, [0, 4, 7]), tonic: tri(53, [0, 4, 7, 14]), padOct: 0, padAmp: .018, padCut: [900, 600, 1100], reverb: .3 },
  'glass-arp': { prog: [tri(57, [0, 3, 7]), tri(53, [0, 4, 7, 11]), tri(48, [0, 4, 7, 14]), tri(55, [0, 4, 7, 9])], intro: [tri(57, [0, 3, 7]), tri(53, [0, 4, 7, 11])], tension: tri(50, [0, 3, 7]), dom: tri(55, [0, 4, 7]), tonic: tri(48, [0, 4, 7, 14]), padOct: 0, padAmp: .02, padCut: [800, 550, 1000], reverb: .38 },
  'lofi-pulse': { prog: [tri(53, [0, 4, 7, 11]), tri(52, [0, 3, 7, 10]), tri(50, [0, 3, 7, 10]), tri(48, [0, 4, 7, 11])], intro: [tri(50, [0, 3, 7, 10]), tri(48, [0, 4, 7, 11])], tension: tri(46, [0, 3, 7, 10]), dom: tri(48, [0, 4, 7, 10]), tonic: tri(53, [0, 4, 7, 11]), padOct: 0, padAmp: .012, padCut: [900, 600, 1200], reverb: .2 },
  'warm-pad': { prog: [tri(48, [0, 7, 11, 14, 16]), tri(45, [0, 7, 10, 12, 14]), tri(41, [0, 7, 11, 14, 16]), tri(43, [0, 7, 9, 14, 16])], intro: [tri(48, [0, 7, 11, 14, 16]), tri(45, [0, 7, 10, 12, 14])], tension: tri(41, [0, 3, 7, 12]), dom: tri(43, [0, 7, 11, 14]), tonic: tri(48, [0, 7, 11, 14, 16]), padOct: 0, padAmp: .05, padCut: [1000, 650, 1300], reverb: .45 },
  'space-drone': { prog: [[36, 43, 48, 55], [33, 40, 45, 52], [41, 48, 53, 57], [43, 50, 55, 59]], intro: [[36, 43, 48, 55], [36, 43, 48, 55]], tension: [32, 39, 44, 51], dom: [43, 50, 55, 59], tonic: [36, 43, 48, 55, 62], padOct: 0, padAmp: .035, padCut: [1800, 900, 2400], reverb: .58 },
  'music-box': { prog: [tri(48, [0, 7, 16]), tri(45, [0, 7, 15]), tri(41, [0, 7, 16]), tri(43, [0, 7, 16])], intro: [tri(48, [0, 7, 16]), tri(45, [0, 7, 15])], tension: tri(41, [0, 3, 7]), dom: tri(43, [0, 4, 7]), tonic: tri(48, [0, 4, 7, 14]), padOct: 0, padAmp: .03, padCut: [700, 500, 900], reverb: .5 },
};
const S = BEDS[bedId]; if (!S) throw new Error('No arranged voice for ' + bedId);
const BEAT = 60 / plan.bpm, BAR = 4 * BEAT, GROOVE = plan.grooveFrom, CAD = plan.cadence, END = plan.fadeEnd;
const mod = (a, n) => ((a % n) + n) % n;
const inTension = t => plan.tension.some(s => t >= s.from && t < s.to);
const phraseStart = t => Math.max(GROOVE, ...plan.chapters.filter(c => c <= t), ...plan.lifts.filter(l => l <= t), ...plan.tension.map(s => s.to).filter(x => x <= t));
function chordAt(t) {
  if (t >= CAD) return S.tonic;
  if (t >= CAD - BAR) return S.dom;
  if (inTension(t)) return S.tension;
  if (t < GROOVE) return S.intro[Math.min(1, Math.floor(t / Math.max(1, GROOVE / 2)))];
  return S.prog[Math.floor((t - phraseStart(t)) / BAR + 1e-6) % 4];
}
const energy = t => t < GROOVE ? 'intro' : t >= CAD ? 'cadence' : inTension(t) ? 'tension' : 'groove';
const master = bus(), mix = (s, g = 1) => { for (let i = 0; i < N; i++) { master.L[i] += s.L[i] * g; master.R[i] += s.R[i] * g; } };

// Pad: one voice per harmonic segment, crossfading on every change (chapter, tension, lift, bar, cadence).
const marks = new Set([0, END]);
for (const c of plan.chapters) marks.add(c); for (const l of plan.lifts) marks.add(l); for (const s of plan.tension) { marks.add(s.from); marks.add(s.to); }
marks.add(CAD - BAR); marks.add(CAD); marks.add(GROOVE);
const phrases = [...new Set([GROOVE, ...plan.chapters.filter(c => c > GROOVE), ...plan.lifts, ...plan.tension.map(s => s.to)])].sort((a, b) => a - b);
phrases.forEach((p, i) => { for (let t = p + BAR; t < Math.min(phrases[i + 1] ?? END, END); t += BAR) marks.add(t); }); // bar lines inside each phrase
for (let t = 0; t < GROOVE; t += Math.max(1, GROOVE / 2)) marks.add(t);
const times = [...marks].filter(t => t >= 0 && t <= END).sort((a, b) => a - b), segs = [];
for (let i = 0; i < times.length - 1; i++) { const c = chordAt(times[i] + 1e-3); if (segs.length && segs.at(-1).c === c) segs.at(-1).t1 = times[i + 1]; else segs.push({ t0: times[i], t1: times[i + 1], c }); }
const pd = bus();
segs.forEach((s, k) => { for (const m of s.c) pad(pd, m + S.padOct, s.t0 - .25, s.t1 - s.t0 + .1, S.padAmp * (bedId === 'space-drone' && m < 40 ? 1.4 : 1), { attack: .5, release: k === segs.length - 1 ? 1.4 : .7, harm: bedId === 'space-drone' ? 5 : 4, detune: bedId === 'space-drone' ? 8 : 6 }); });
lowpass(pd, t => { const e = energy(t); return e === 'tension' ? S.padCut[1] : e === 'intro' ? S.padCut[0] : S.padCut[2]; });

// Lead, bass and drums on the beat grid; thin in the intro, out in tension, stopped by the cadence.
const ld = bus(), bs = bus(), dr = bus();
const lastBeat = Math.floor((CAD - plan.beatPhase) / BEAT * 4) - 1;
for (let k = Math.ceil((0 - plan.beatPhase) / BEAT * 4); k <= lastBeat; k++) {
  const t = plan.beatPhase + k * BEAT / 4; if (t < .35 || t >= CAD - .01) continue;
  const e = energy(t), c = chordAt(t), sixteenth = ((k % 4) + 4) % 4, eighth = sixteenth % 2 === 0, beat = sixteenth === 0, beatIndex = Math.round((t - plan.beatPhase) / BEAT), barPos = ((beatIndex % 4) + 4) % 4;
  if (e === 'tension') { if (beat && bedId !== 'warm-pad' && bedId !== 'space-drone' && bedId !== 'music-box') { const s = plan.tension.find(x => t >= x.from && t < x.to); if (t > (s.from + s.to) / 2 && barPos % 2 === 0) { if (bedId === 'chip-soft') square(bs, c[0] - 12, t, .035, .5, .2, 4); else tone(bs, c[0] - 12, t, .07, .5, .3, [[1, 1], [2, .25, 2]]); } } continue; }
  const intro = e === 'intro', pan = (k & 1) ? .7 : .3;
  if (bedId === 'chip-soft') {
    if (intro ? eighth : true) square(ld, c[[0, 1, 2, 1][sixteenth] % c.length] + 12, t, intro ? .02 : .03, pan, .11);
    if (!intro && eighth) square(bs, c[0] - 24 + (barPos === 3 && sixteenth === 2 ? 7 : 0), t, .055, .5, .16);
    if (!intro && sixteenth === 2) hat(dr, t, .011);
  } else if (bedId === 'pluck-curious') {
    const pat = [0, 2, 1, 3, 2, -1, 3, 1], slot = (barPos * 2 + (sixteenth === 2 ? 1 : 0)) % 8;
    if (eighth && pat[slot] >= 0 && (!intro || slot % 2 === 0)) pluck(ld, c[pat[slot] % c.length] + 12, t, intro ? .11 : .16, slot % 2 ? .65 : .35, .9, .45);
    if (!intro && beat && barPos % 2 === 0) pluck(bs, c[0] - 12, t, .16, .5, 1.4, .3);
    if (!intro && sixteenth === 2) hat(dr, t, .012, .03, .55);
  } else if (bedId === 'glass-arp') {
    const order = [0, 1, 2, 3, 2, 1, 0, 2], slot = (barPos * 4 + sixteenth) % 8;
    if (!intro || eighth) glass(ld, c[order[slot] % c.length] + 12, t, intro ? .035 : .05, slot % 2 ? .75 : .25);
    if (!intro && beat && barPos % 2 === 0) tone(bs, c[0] - 12, t, .1, .5, .8, [[1, 1], [2, .3, 2]]);
  } else if (bedId === 'lofi-pulse') {
    if ((beat && barPos === 0) || (sixteenth === 2 && barPos === 2)) for (const m of c) rhodes(ld, m, t, intro ? .022 : .032, .35 + rnd() * .3, barPos === 0 ? 1.6 : 1.2);
    if (!intro && beat && barPos === 0) rhodes(bs, c[0] - 12, t, .06, .5, 2.2);
    if (!intro && beat && barPos % 2 === 0) kick(dr, t, .1);
    if (!intro && sixteenth === 2) hat(dr, t, .011, .025);
  } else if (bedId === 'warm-pad') {
    if (!intro && beat && barPos % 2 === 0) bell(ld, c[mod(beatIndex >> 1, c.length)] + 12, t, .025, .3 + .4 * rnd(), 1.8);
  } else if (bedId === 'space-drone') {
    if (!intro && beat && barPos === 0 && mod(beatIndex >> 2, 2) === 0) pad(ld, c[c.length - 1] + 12 + [0, 4, 7][mod(beatIndex >> 3, 3)], t, BAR * 1.6, .012, { attack: 1.5, release: 2, harm: 2, detune: 9 });
  } else if (bedId === 'music-box') {
    if (eighth && rnd() < (intro ? .3 : .5)) bell(ld, [72, 74, 76, 79, 81, 84][Math.floor(rnd() * 6)], t, .05, .2 + rnd() * .6, 1.6);
  }
}
lowpass(ld, t => { const e = energy(t); return e === 'intro' ? 900 + 900 * smooth(t / Math.max(1, GROOVE)) : bedId === 'lofi-pulse' ? 2400 : bedId === 'pluck-curious' ? 3500 : 2600; });
gate(ld, t => { let g = 1; for (const s of plan.tension) g *= 1 - smooth((t - s.from) / .08) * (1 - smooth((t - s.to) / .3)); return g; });
lowpass(bs, () => bedId === 'pluck-curious' ? 500 : 650);
if (bedId === 'lofi-pulse') { let x1 = 0, y = 0; const a = Math.exp(-TAU * 3000 / SR); for (let i = 0; i < N; i++) { const w = (rnd() * 2 - 1); y = a * (y + w - x1); x1 = w; const v = y * .004 + (rnd() < .00012 ? (rnd() - .5) * .08 : 0); master.L[i] += v; master.R[i] += v; } }

// Story accents (v4, user feedback 2026-10-21): every accent is ONE sound on its picture event, never a triple run.
// The cadence resolves the film; a chime marks a big word, a fall marks damage, a rise marks the visible fix.
const fx = bus(), R = 60 + (S.tonic[0] % 12), TR = 48 + (S.tension[0] % 12);
for (const a of plan.accents) {
  if (a.kind === 'chime') bell(fx, R + 24, a.at, .055, .5, 1.2);
  else if (a.kind === 'fall') { tone(fx, TR - 10, a.at, .16, .5, .5, [[1, 1], [2, .2, 2]], .002, .6); tone(fx, TR + 15, a.at + .02, .04, .5, .45, [[1, 1], [3, .15, 3]], .002, .45); }
  else if (a.kind === 'rise') bell(fx, R + 28, a.at, .055, .5, 1.3);
  else if (a.kind === 'cadence') { swell(fx, a.at, 1.1, .05); S.tonic.forEach((m, j) => bell(fx, m + (j ? 12 : 0) + (m < 48 ? 12 : 0), a.at + j * .012, j ? .045 : .07, .5, 2.4)); }
}
const low = R - 24; // the cadence root under the final chord
if (bedId === 'chip-soft') square(bs, low, CAD, .07, .5, 1.4); else if (bedId === 'pluck-curious') pluck(bs, low, CAD, .2, .5, 2.2, .3);
else if (bedId === 'glass-arp') tone(bs, low, CAD, .12, .5, 1.6, [[1, 1], [2, .3, 2]]); else if (bedId === 'lofi-pulse') rhodes(bs, low, CAD, .07, .5, 2.6);

mix(pd); mix(ld); mix(bs, .9); mix(dr); mix(fx);
reverb(master, S.reverb, bedId === 'space-drone' ? .92 : .84);
if (master.L.some(v => !Number.isFinite(v)) || master.R.some(v => !Number.isFinite(v))) throw new Error('Arranged bed produced a non-finite sample');
for (const arr of [master.L, master.R]) { let x1 = 0, y = 0; const a = Math.exp(-TAU * 35 / SR); for (let i = 0; i < N; i++) { y = a * (y + arr[i] - x1); x1 = arr[i]; arr[i] = y; } }
for (let i = 0; i < N; i++) { const t = i / SR, g = smooth(t / .4) * smooth((Math.min(T, END + .3) - t) / .5); master.L[i] *= g; master.R[i] *= g; }
const inter = new Float32Array(N * 2); for (let i = 0; i < N; i++) { inter[2 * i] = master.L[i]; inter[2 * i + 1] = master.R[i]; }
fs.writeFileSync(out, Buffer.from(inter.buffer));
