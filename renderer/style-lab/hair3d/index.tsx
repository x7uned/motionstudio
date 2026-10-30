// Style lab · «Every second, your hair grows faster» — five 3D looks of one brainrot short (2026-10-26, @kagenami_fun).
// One measured voice clock, one world, one continuous camera; only the look changes. No overlay: picture edge to edge,
// a stopwatch in the main zone, karaoke captions over a soft shade, FOLLOW → FOLLOWING ✓ card over the final scene.
import React from "react";
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import "@fontsource-variable/manrope";
import "@fontsource/jetbrains-mono/800.css";
import { FPS, FRAMES, END, EV, WORDS, VOICE_TEXT, clamp01, sm, back, storySeconds, camState } from "./timeline";
import { STYLES, type Style, type StyleId } from "./styles";
import { World } from "./Scene";
import { StyledCaptions, CaptionShade } from "../../CaptionStyles";

const ALIGN = [{ scene: 0, start: 0, end: EV.voiceEnd, sceneEnd: END, speed: 1, text: VOICE_TEXT, words: WORDS }];

function Strip({ v, base, h, blur }: { v: number; base: number; h: number; blur: number }) {
  return <div style={{ height: h, overflow: "hidden", width: h * .62, position: "relative" }}>
    <div style={{ transform: `translateY(${-v * h}px)`, filter: blur > .2 ? `blur(${Math.min(6, blur * 3)}px)` : undefined }}>
      {Array.from({ length: base + 1 }, (_, i) => <div key={i} style={{ height: h, lineHeight: `${h}px`, textAlign: "center" }}>{i % base}</div>)}
    </div>
  </div>;
}
/** Odometer clock HH:MM:SS: every digit rolls continuously, carries roll in only while the lower digits wrap. */
function Clock({ t, s }: { t: number; s: Style }) {
  const S = storySeconds(t), rate = (storySeconds(t + 1 / FPS) - S) * FPS, H = 86;
  const units: [number, number][] = [[36000, 10], [3600, 10], [600, 6], [60, 10], [10, 6], [1, 10]];
  // carry window ≥ 4 frames of story time, so even the fast-spinning digits never jump in one frame
  const win = Math.max(1, rate / FPS * 4);
  const digit = (u: number, b: number) => { const q = S / u, d = Math.floor(q), rem = (q - d) * u, w = Math.min(u, win); return (d % b) + sm(u - w, u, rem); };
  const enter = sm(.05, .45, t), pulse = 1 + .06 * Math.max(0, ...[EV.oneSec, EV.tenSec, EV.minute, EV.tenMin, EV.hour].map(a => Math.exp(-((t - a - .2) ** 2) / .02)));
  const hot = sm(EV.hour, EV.hour + .4, t);
  const sep = <div style={{ height: H, lineHeight: `${H - 6}px`, width: H * .3, textAlign: "center", opacity: .8 }}>:</div>;
  const d = units.map(([u, b]) => <Strip key={u} v={digit(u, b)} base={b} h={H} blur={rate / (FPS * u)} />);
  return <div style={{ position: "absolute", left: 0, right: 0, top: 318, display: "flex", justifyContent: "center", opacity: enter, transform: `translateY(${(1 - enter) * -30}px) scale(${pulse})` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 30px 10px 22px", borderRadius: 26, background: s.hud.bg + "E6", border: `4px solid ${s.hud.accent}`, boxShadow: "0 10px 0 rgba(0,0,0,.25)" }}>
      <svg width="64" height="70" viewBox="0 0 64 70"><circle cx="32" cy="40" r="25" fill="none" stroke={s.hud.accent} strokeWidth="7" /><rect x="25" y="2" width="14" height="9" rx="3" fill={s.hud.accent} />
        <line x1="32" y1="40" x2={32 + 17 * Math.sin(S * 6.283 / 60)} y2={40 - 17 * Math.cos(S * 6.283 / 60)} stroke={s.hud.fg} strokeWidth="6" strokeLinecap="round" /></svg>
      <div style={{ display: "flex", color: hot > 0 ? `color-mix(in srgb, ${s.hud.accent} ${hot * 100}%, ${s.hud.fg})` : s.hud.fg, fontFamily: s.hud.font, fontSize: 80, fontWeight: 800, letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>
        {d[0]}{d[1]}{sep}{d[2]}{d[3]}{sep}{d[4]}{d[5]}
      </div>
    </div>
  </div>;
}
/** FOLLOW → FOLLOWING ✓ over the final scene; the bell rings on «miss». */
function Follow({ t, s }: { t: number; s: Style }) {
  const k = back(EV.follow - .05, EV.follow + .45, t), o = sm(EV.follow - .05, EV.follow + .2, t);
  if (o <= 0) return null;
  const press = 1 - .08 * Math.sin(Math.PI * clamp01((t - EV.miss) / .22)), done = sm(EV.miss + .08, EV.miss + .38, t);
  const ring = Math.sin((t - EV.miss) * 30) * 22 * Math.exp(-Math.max(0, t - EV.miss) * 3.2) * (t > EV.miss ? 1 : 0);
  return <div style={{ position: "absolute", left: 0, right: 0, top: 1010, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${(1 - k) * 160}px)` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "18px 22px", borderRadius: 34, background: "rgba(10,8,20,.82)", boxShadow: "0 14px 40px rgba(0,0,0,.35)" }}>
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: `rotate(${ring}deg)`, transformOrigin: "50% 15%" }}>
        <path d="M38 10c-12 0-20 9-20 21v13l-6 9h52l-6-9V31c0-12-8-21-20-21z" fill={s.hud.accent} /><circle cx="38" cy="60" r="7" fill={s.hud.accent} /></svg>
      <div style={{ position: "relative", width: 420, height: 96, borderRadius: 24, overflow: "hidden", transform: `scale(${press})`, background: `color-mix(in srgb, #3A3A48 ${done * 100}%, #FF2D55)`, fontFamily: "'Manrope Variable',sans-serif", fontWeight: 800, fontSize: 50, color: "#fff", letterSpacing: .5 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 - done, transform: `translateY(${-done * 70}px)` }}>FOLLOW</div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: done, transform: `translateY(${(1 - done) * 70}px)` }}>FOLLOWING ✓</div>
      </div>
    </div>
  </div>;
}

function Film({ styleId }: { styleId: StyleId }) {
  const frame = useCurrentFrame(), t = frame / FPS, s = STYLES[styleId];
  const tw = s.step ? Math.floor(t / s.step + 1e-6) * s.step : t; // clay: the world moves on twos, words stay smooth
  const W = Math.round(1080 * s.scale), H = Math.round(1920 * s.scale), c = camState(tw);
  return <AbsoluteFill style={{ background: s.pal.sky[1], overflow: "hidden", fontFamily: "'Manrope Variable',sans-serif" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${1 / s.scale})`, transformOrigin: "0 0", imageRendering: s.scale < 1 ? "pixelated" : undefined }}>
      <ThreeCanvas width={W} height={H} camera={{ position: c.pos, fov: c.fov, near: .05, far: 400 }} gl={{ antialias: s.scale >= 1, preserveDrawingBuffer: true }} dpr={1} shadows={s.shadows} style={{ imageRendering: s.scale < 1 ? "pixelated" : undefined }}>
        <World s={s} t={tw} />
      </ThreeCanvas>
    </div>
    <Clock t={t} s={s} />
    <Follow t={t} s={s} />
    <CaptionShade top={1360} />
    <div style={{ color: "#FDFEED" }}><StyledCaptions styleId="karaoke" alignment={ALIGN} t={t} lang="en" top={1360} /></div>
  </AbsoluteFill>;
}

const IDS: StyleId[] = ["toon", "clay", "voxel", "ps1", "toy"];
registerRoot(() => <>{IDS.map(id => <Composition key={id} id={`Hair-${id}`} component={Film} defaultProps={{ styleId: id }} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} />)}</>);
