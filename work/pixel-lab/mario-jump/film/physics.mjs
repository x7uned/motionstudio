// The vertical jump physics of Super Mario Bros. (NES, NTSC), re-implemented from the commented disassembly
// (JumpSwimSub / ImposeGravity / InitJS, tables PlayerYSpdData, JumpMForceData, FallMForceData — see ../facts.md):
//   speed in px/frame with a 1/256 fraction; gravity in 1/256 px/frame²; position moves by the speed, then gravity acts.
//   Light gravity only while Mario is rising AND A is held; at the apex or on release the strong gravity takes over
//   (release can't be undone); the tier is fixed by the run speed at takeoff; top fall speed 4 px/frame.
export const TIERS = {
  stand: { launch: 4, light: 0x20, strong: 0x70 },   // run speed 0–15 (1/16 px/f)
  walk: { launch: 4, light: 0x1e, strong: 0x60 },    // 16–24
  run: { launch: 5, light: 0x28, strong: 0x90 },     // 25–40
};
/** simulate a jump: hold = frames A is held (Infinity = to the top); returns per-frame heights (px above takeoff, up +) and the frame flags */
export function jump(tier, hold = Infinity, frames = 120) {
  const T = TIERS[tier]; let v = -T.launch * 256, y = 0, force = T.light, heavyAt = null; const out = [{ f: 0, h: 0, v: v / 256, heavy: false }];
  for (let f = 1; f <= frames; f++) {
    // the gravity choice (this frame)
    if (v >= 0) force = T.strong; else if (f <= hold) { /* keep */ } else if (-y < 256) { /* first pixel: keep */ } else force = T.strong;
    if (force === T.strong && heavyAt == null) heavyAt = f;
    y += v; v += force; if (v > 4 * 256 + 0x80) v = 4 * 256;
    out.push({ f, h: -y / 256, v: v / 256, heavy: force === T.strong });
    if (-y < 0 && f > 2) { out[out.length - 1].h = 0; break; }
  }
  return { tier, hold, pts: out, heavyAt, peak: Math.max(...out.map((p) => p.h)), apexF: out.reduce((b, p) => (p.h > out[b].h ? p.f : b), 0), landF: out[out.length - 1].f };
}
/** height at fractional game frame gf (linear between frames) */
export function heightAt(J, gf) { const p = J.pts; if (gf <= 0) return 0; if (gf >= p.length - 1) return 0; const i = Math.floor(gf), k = gf - i; return p[i].h + (p[i + 1].h - p[i].h) * k; }
