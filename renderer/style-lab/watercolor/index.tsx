// Style lab · «Акварель и маркер» (watercolor + ink marker picture-book look).
// Watercolor/ink sprites are painted once per tab by p5.brush (fixed seeds), then every
// frame is composited deterministically from useCurrentFrame() onto warm cotton paper.
import React, {useLayoutEffect, useRef, useState} from "react";
import {AbsoluteFill, Composition, continueRender, delayRender, registerRoot, useCurrentFrame} from "remotion";
import "@fontsource-variable/manrope";
import "@fontsource/caveat/700.css";
import story from "../../../work/style-lab/story.json";
import {buildSprites, paintPaper, SpriteSet} from "./brushSprites";
import {ANCHOR, buildSpecs, CHECK_PTS, CURSOR_PTS} from "./art";
import {
  BUTTON_C, bump, C, CARD_FINAL, CARD_H, CARD_SCREEN, CARD_SPLIT, CARD_W, CHECK_C, clamp01, easeInOut, easeOut,
  easeOutBack, FPS, FRAGS, H, LAPTOP, lerp, MESSAGE, ORB_C, PACKET, pointAt, prog, reveal, ROUTER_PASSES, ROUTERS,
  ROUTES, routeFrac, ROW_X, ROW_Y, SERVER_C, SLOT_X, smooth, TRAY_Y, W,
} from "./scene";

const SANS = '"Manrope Variable", Manrope, sans-serif';
const HAND = "Caveat, cursive";
const CARD_FONT = 64;
const PACKET_FONT = 50;

type Assets = {sprites: SpriteSet; paper: HTMLCanvasElement; cuts: number[]; prefix: number[]; textW: number};

let assetsPromise: Promise<Assets> | null = null;
const loadAssets = (): Promise<Assets> => {
  if (assetsPromise) return assetsPromise;
  assetsPromise = (async () => {
    await Promise.all([
      document.fonts.load(`800 ${CARD_FONT}px "Manrope Variable"`, MESSAGE),
      document.fonts.load(`700 40px Caveat`, "ты сервер друга @xtuned"),
    ]);
    const sprites = await buildSprites(buildSpecs());
    const paper = paintPaper(W, H, 7);
    const m = document.createElement("canvas").getContext("2d")!;
    m.font = `800 ${CARD_FONT}px ${SANS}`;
    const textW = m.measureText(MESSAGE).width;
    const prefix = [0, 1, 2, 3, 4].map((k) => m.measureText(FRAGS.slice(0, k).join("")).width);
    const xs = -textW / 2;
    // cut positions on the card (card-local px), exactly between letter groups
    const cuts = [-CARD_W / 2, Math.round(xs + prefix[1]), Math.round(xs + prefix[2]), Math.round(xs + prefix[3]), CARD_W / 2];
    return {sprites, paper, cuts, prefix, textW};
  })();
  return assetsPromise;
};

// ---------- canvas helpers ----------
type Ctx = CanvasRenderingContext2D;
type Tf = {s?: number; sx?: number; sy?: number; rot?: number; a?: number};

const put = (ctx: Ctx, spr: HTMLCanvasElement, anchor: {x: number; y: number}, x: number, y: number, o: Tf = {}) => {
  const a = o.a ?? 1;
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1);
  ctx.drawImage(spr, -anchor.x, -anchor.y);
  ctx.restore();
};

// paper "knockout" so an object occludes what is under it (watercolor then multiplies over clean paper)
const knock = (ctx: Ctx, paper: HTMLCanvasElement, x: number, y: number, o: Tf, path: (c: Ctx) => void) => {
  const a = o.a ?? 1;
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.globalCompositeOperation = "source-over";
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1);
  ctx.beginPath();
  path(ctx);
  ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paper, 0, 0);
  ctx.restore();
};

const rr = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.roundRect(x, y, w, h, r);
};

const pathTo = (m: Ctx, pts: {x: number; y: number}[], cum: number[], upto: number) => {
  m.beginPath();
  m.moveTo(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++) {
    if (cum[k] <= upto) m.lineTo(pts[k].x, pts[k].y);
    else {
      const f = (upto - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
      m.lineTo(lerp(pts[k - 1].x, pts[k].x, f), lerp(pts[k - 1].y, pts[k].y, f));
      break;
    }
  }
};

// reveal a stroke sprite through a mask stroke drawn up to `upto` px of arc length
const strokeMask = (tmp: HTMLCanvasElement, spr: HTMLCanvasElement, pts: {x: number; y: number}[], cum: number[], upto: number, width: number) => {
  const m = tmp.getContext("2d")!;
  m.globalCompositeOperation = "source-over";
  m.clearRect(0, 0, tmp.width, tmp.height);
  m.lineWidth = width;
  m.lineCap = "round";
  m.lineJoin = "round";
  m.strokeStyle = "#000";
  pathTo(m, pts, cum, upto);
  m.stroke();
  m.globalCompositeOperation = "source-in";
  m.drawImage(spr, 0, 0);
  m.globalCompositeOperation = "source-over";
};

// ---------- piece / packet state ----------
type Piece = {x: number; y: number; w: number; rot: number; k: number; textX: number; textY: number; font: number; badgeS: number; badgeA: number; lift: number};

const pieceState = (t: number, i: number, A: Assets): Piece => {
  const {cuts, prefix, textW} = A;
  const L = cuts[i];
  const R = cuts[i + 1];
  const pc = (L + R) / 2;
  const fragW = prefix[i + 1] - prefix[i];
  const xsLeft = -textW / 2 + prefix[i] - pc; // left edge of the fragment inside the card, piece-local
  const xsPacket = (-fragW * PACKET_FONT) / CARD_FONT / 2 + 4;
  // split phase
  const sep = smooth(t, 5.3, 6.3);
  let x = lerp(CARD_SPLIT.x + pc, ROW_X[i], sep);
  let y = ROW_Y + (i % 2 ? 1 : -1) * 22 * Math.sin(Math.PI * sep);
  let w = lerp(R - L, PACKET, sep);
  let rot = (i - 1.5) * 0.05 * Math.sin(Math.PI * sep);
  let k = smooth(t, 5.55, 6.35);
  let font = lerp(CARD_FONT, PACKET_FONT, sep);
  let textX = lerp(xsLeft, xsPacket, sep);
  let textY = lerp(0, 10, sep);
  const bIn = easeOutBack(prog(t, 6.0 + i * 0.22, 6.45 + i * 0.22));
  let badgeS = 0.5 + 0.5 * bIn;
  let badgeA = prog(t, 6.0 + i * 0.22, 6.3 + i * 0.22);
  let lift = 0;

  // route
  const r = ROUTES[i];
  if (t >= r.dep) {
    const fr = routeFrac(r, t);
    const {p, ang} = pointAt(r, fr);
    x = p.x;
    y = p.y;
    const speed = Math.sin(Math.PI * prog(t, r.dep, r.arr));
    rot = Math.max(-0.6, Math.min(0.6, ang + Math.PI / 2)) * 0.3 * speed;
  }
  // think: number check sweeps left→right over the tray
  const tj = 11.6 + r.slot * 0.2;
  const hb = bump(t, tj, tj + 0.4);
  badgeS *= 1 + 0.28 * hb;
  lift = -12 * hb;

  // reorder 12.5–13.2: arc to sorted slot i
  if (t >= 12.5) {
    const ks = smooth(t, 12.5, 13.2);
    const from = SLOT_X[r.slot];
    const to = SLOT_X[i];
    const dir = Math.sign(to - from);
    const arc = 55 + 30 * Math.abs(r.slot - i);
    x = lerp(from, to, ks);
    y = TRAY_Y - dir * arc * Math.sin(Math.PI * ks);
    rot = dir * 0.12 * Math.sin(Math.PI * ks);
  }
  // merge 13.2–13.8: back into card pieces
  if (t >= 13.2) {
    const m = smooth(t, 13.2, 13.8);
    x = lerp(SLOT_X[i], CARD_FINAL.x + pc, m);
    y = TRAY_Y;
    w = lerp(PACKET, R - L, m);
    rot = 0;
    k = 1 - smooth(t, 13.25, 13.75);
    font = lerp(PACKET_FONT, CARD_FONT, m);
    textX = lerp(xsPacket, xsLeft, m);
    textY = lerp(10, 0, m);
  }
  const bOut = smooth(t, 13.05, 13.45);
  badgeS *= 1 - 0.5 * bOut;
  badgeA *= 1 - bOut;
  return {x, y, w, rot, k, textX, textY, font, badgeS, badgeA: clamp01(badgeA), lift};
};

// card transform before the split
const cardPose = (t: number) => {
  const ap = reveal(t, 0.7, 0.45);
  let x = CARD_SCREEN.x;
  let y = CARD_SCREEN.y + ap.dy;
  let s = CARD_SCREEN.s * ap.s;
  let rot = 0;
  if (t > 2.65) {
    const u = t - 2.65;
    const decay = Math.exp(-u * 5);
    rot = 0.06 * Math.sin(2 * Math.PI * 6 * u) * decay;
    x += 6 * Math.sin(2 * Math.PI * 8 * u) * decay;
  }
  const lift = smooth(t, 3.3, 4.2);
  x = lerp(x, CARD_SPLIT.x, lift);
  y = lerp(y, CARD_SPLIT.y, lift) - 46 * Math.sin(Math.PI * lift);
  s = lerp(s, CARD_SPLIT.s, lift);
  return {x, y, s, rot, a: ap.a};
};

const drawText = (ctx: Ctx, text: string, x: number, y: number, font: number, color: string, align: CanvasTextAlign = "left", weight = 800) => {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color;
  ctx.font = `${weight} ${font}px ${SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
};

// ---------- frame ----------
const drawFrame = (ctx: Ctx, tmp: HTMLCanvasElement, small: HTMLCanvasElement, A: Assets, t: number) => {
  const S = A.sprites;
  const P = A.paper;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(P, 0, 0);
  put(ctx, S.blooms, {x: 0, y: 0}, 0, 0);
  put(ctx, S.band, ANCHOR.band, 540, 318);

  // network wires: grow out of each router
  if (t >= 6.75) {
    const m = tmp.getContext("2d")!;
    m.globalCompositeOperation = "source-over";
    m.clearRect(0, 0, W, H);
    m.fillStyle = "#000";
    ROUTERS.forEach((rt, j) => {
      const rad = 260 * easeOut(prog(t, 6.75 + j * 0.12, 7.9 + j * 0.12));
      if (rad <= 0) return;
      m.beginPath();
      m.arc(rt.x, rt.y, rad, 0, Math.PI * 2);
      m.fill();
    });
    m.globalCompositeOperation = "source-in";
    m.drawImage(S.wires, 0, 0);
    m.globalCompositeOperation = "source-over";
    put(ctx, tmp, {x: 0, y: 0}, 0, 0, {a: 0.85});
  }

  // packet trails, revealed behind each packet
  const trailA = 0.95 - 0.4 * smooth(t, 12.6, 13.4);
  ROUTES.forEach((r, i) => {
    const upto = routeFrac(r, t) * r.len - 40;
    if (t < r.dep || upto <= 0) return;
    strokeMask(tmp, S[`trail${i}`], r.pts, r.cum, upto, 46);
    put(ctx, tmp, {x: 0, y: 0}, 0, 0, {a: trailA});
  });

  // server + tray
  const sv = reveal(t, 0.45, 0.5);
  knock(ctx, P, SERVER_C.x, SERVER_C.y + sv.dy, {s: sv.s, a: sv.a}, (c) => rr(c, -110, -145, 220, 290, 18));
  put(ctx, S.server, ANCHOR.server, SERVER_C.x, SERVER_C.y + sv.dy, {s: sv.s, a: sv.a});
  const tr = reveal(t, 0.65, 0.5);
  put(ctx, S.tray, ANCHOR.tray, 350, 741 + tr.dy, {s: tr.s, a: tr.a});

  // think orb in the server window
  const orbA = smooth(t, 11.35, 11.65) * (1 - smooth(t, 12.45, 12.9));
  if (orbA > 0) {
    const pulse = 1 + 0.09 * Math.sin(2 * Math.PI * 1.7 * (t - 11.35));
    put(ctx, S.orb, ANCHOR.orb, ORB_C.x, ORB_C.y, {s: (0.75 + 0.25 * orbA) * pulse, a: orbA});
    ctx.save();
    ctx.globalAlpha = orbA * 0.9;
    ctx.fillStyle = C.ink;
    for (let d = 0; d < 3; d++) {
      const ang = -Math.PI / 2 + 2 * Math.PI * (0.9 * (t - 11.35) + d / 3);
      ctx.beginPath();
      ctx.arc(ORB_C.x + Math.cos(ang) * 58, ORB_C.y + Math.sin(ang) * 58, 6 - d, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // routers with pass pulses
  ROUTERS.forEach((rt, j) => {
    const rv = reveal(t, 6.6 + j * 0.2, 0.45);
    let sc = rv.s;
    for (const ps of ROUTER_PASSES) {
      if (ps.router !== j) continue;
      sc *= 1 + 0.08 * bump(t, ps.time - 0.12, ps.time + 0.3);
      const rk = prog(t, ps.time - 0.05, ps.time + 0.55);
      if (rk > 0 && rk < 1) put(ctx, S.ring, ANCHOR.ring, rt.x, rt.y, {s: 0.55 + 0.6 * easeOut(rk), a: 0.75 * Math.min(1, rk * 6) * (1 - rk)});
    }
    knock(ctx, P, rt.x, rt.y + rv.dy, {s: sc, a: rv.a}, (c) => rr(c, -75, -36, 150, 72, 20));
    put(ctx, S[`router${j}`], ANCHOR.router, rt.x, rt.y + rv.dy, {s: sc, a: rv.a});
  });

  // laptop (scales around its own centre)
  const lp = reveal(t, 0.1, 0.5);
  put(ctx, S.laptop, {x: 260, y: 170}, LAPTOP.x + 260, LAPTOP.y + 170 + lp.dy, {s: lp.s, a: lp.a});

  // send button
  const bt = reveal(t, 1.1, 0.4);
  const btOut = smooth(t, 3.35, 3.8);
  const press = bump(t, 2.55, 2.9);
  const bs = bt.s * (1 - 0.07 * press) * (1 - 0.12 * btOut);
  const ba = bt.a * (1 - btOut);
  knock(ctx, P, BUTTON_C.x, BUTTON_C.y + bt.dy, {s: bs, a: ba}, (c) => rr(c, -100, -28, 200, 56, 28));
  put(ctx, S.button, ANCHOR.button, BUTTON_C.x, BUTTON_C.y + bt.dy, {s: bs, a: ba});
  if (press > 0) put(ctx, S.button, ANCHOR.button, BUTTON_C.x, BUTTON_C.y, {s: bs, a: 0.55 * press});
  if (ba > 0.002) {
    ctx.save();
    ctx.globalAlpha = ba;
    ctx.translate(BUTTON_C.x, BUTTON_C.y + bt.dy);
    ctx.scale(bs, bs);
    drawText(ctx, "Отправить", 0, 1, 27, C.ink, "center", 750);
    ctx.restore();
  }
  const rp = prog(t, 2.62, 3.15);
  if (rp > 0 && rp < 1) put(ctx, S.ring, ANCHOR.ring, BUTTON_C.x, BUTTON_C.y, {sx: 0.6 + 0.9 * easeOut(rp), sy: 0.3 + 0.45 * easeOut(rp), a: 0.8 * Math.min(1, rp * 6) * (1 - rp)});

  // card (whole) / pieces → packets
  const whole = t < 5.3 || t >= 13.8;
  if (whole) {
    const cp = t < 5.3 ? cardPose(t) : {x: CARD_FINAL.x, y: CARD_FINAL.y, s: 1, rot: 0, a: 1};
    knock(ctx, P, cp.x, cp.y, {s: cp.s, rot: cp.rot, a: cp.a}, (c) => rr(c, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16));
    put(ctx, S.card, ANCHOR.card, cp.x, cp.y, {s: cp.s, rot: cp.rot, a: cp.a});
    if (cp.a > 0.002) {
      ctx.save();
      ctx.globalAlpha = cp.a;
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.rot);
      ctx.scale(cp.s, cp.s);
      drawText(ctx, MESSAGE, -A.textW / 2, 2, CARD_FONT, C.ink);
      ctx.restore();
    }
    // dashed cut lines, drawn top → bottom
    if (t >= 4.3 && t < 5.3) {
      for (let c = 1; c <= 3; c++) {
        const k = easeInOut(prog(t, 4.4 + (c - 1) * 0.2, 4.85 + (c - 1) * 0.2));
        if (k <= 0) continue;
        const sp = S.cut;
        const hh = Math.max(1, sp.height * k);
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.translate(cp.x, cp.y);
        ctx.scale(cp.s, cp.s);
        ctx.drawImage(sp, 0, 0, sp.width, hh, A.cuts[c] - ANCHOR.cut.x, -ANCHOR.cut.y, sp.width, hh);
        ctx.restore();
      }
    }
  } else {
    // packets that left later are drawn on top
    const order = [0, 1, 2, 3].sort((a, b) => ROUTES[a].dep - ROUTES[b].dep);
    for (const i of order) {
      const p = pieceState(t, i, A);
      const L = A.cuts[i];
      const R = A.cuts[i + 1];
      const pc = (L + R) / 2;
      const fx = p.w / (R - L);
      const py = p.y + p.lift;
      knock(ctx, P, p.x, py, {rot: p.rot}, (c) => rr(c, -p.w / 2, -60, p.w, 120, 12 * Math.min(1, p.k + 0.2)));
      // the cut slice of the card, cross-fading into the packet's own watercolor
      if (p.k < 0.999) {
        const sx0 = (i === 0 ? -CARD_W / 2 - 30 : L) + ANCHOR.card.x;
        const sx1 = (i === 3 ? CARD_W / 2 + 30 : R) + ANCHOR.card.x;
        const k0 = (i === 0 ? -CARD_W / 2 - 30 : L) - pc;
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 1 - p.k;
        ctx.translate(p.x, py);
        ctx.rotate(p.rot);
        ctx.scale(fx, 1);
        ctx.drawImage(S.card, sx0, 0, sx1 - sx0, S.card.height, k0, -ANCHOR.card.y, sx1 - sx0, S.card.height);
        ctx.restore();
      }
      put(ctx, S[`packet${i}`], ANCHOR.packet, p.x, py, {sx: p.w / PACKET, sy: 1, rot: p.rot, a: p.k});
      // fragment text (clipped to the piece)
      ctx.save();
      ctx.translate(p.x, py);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.rect(-p.w / 2 - 2, -62, p.w + 4, 124);
      ctx.clip();
      drawText(ctx, FRAGS[i], p.textX, p.textY + 2, p.font, C.ink);
      ctx.restore();
      // the dashed cut line rides on the piece's left edge and fades as the pieces part
      const cutA = 1 - smooth(t, 5.3, 5.7);
      if (i > 0 && cutA > 0.002) {
        ctx.save();
        ctx.translate(p.x, py);
        ctx.rotate(p.rot);
        put(ctx, S.cut, ANCHOR.cut, -p.w / 2, 0, {a: cutA});
        ctx.restore();
      }
      // number badge
      if (p.badgeA > 0.002) {
        ctx.save();
        ctx.translate(p.x, py);
        ctx.rotate(p.rot);
        ctx.translate(-p.w / 2 + 8, -52);
        ctx.scale(p.badgeS, p.badgeS);
        knock(ctx, P, 0, 0, {a: p.badgeA}, (c) => c.arc(0, 0, 26, 0, Math.PI * 2));
        put(ctx, S[`badge${i}`], ANCHOR.badge, 0, 0, {a: p.badgeA});
        ctx.globalAlpha = p.badgeA;
        drawText(ctx, String(i + 1), 0, 2, 30, C.badgeText, "center", 800);
        ctx.restore();
      }
    }
  }

  // cursor
  const cuA = smooth(t, 1.35, 1.65) * (1 - smooth(t, 3.05, 3.5));
  if (cuA > 0) {
    const mv = easeInOut(prog(t, 1.4, 2.4));
    const out = easeInOut(prog(t, 3.0, 3.6));
    const cx = lerp(660, BUTTON_C.x + 34, mv) + 120 * out;
    const cy = lerp(1660, BUTTON_C.y + 6, mv) - 30 * Math.sin(Math.PI * mv) + 150 * out;
    const cs = 1 - 0.12 * bump(t, 2.5, 2.85);
    knock(ctx, P, cx, cy, {s: cs, a: cuA}, (c) => {
      c.moveTo(CURSOR_PTS[0][0] - ANCHOR.cursor.x, CURSOR_PTS[0][1] - ANCHOR.cursor.y);
      for (const q of CURSOR_PTS.slice(1)) c.lineTo(q[0] - ANCHOR.cursor.x, q[1] - ANCHOR.cursor.y);
      c.closePath();
    });
    put(ctx, S.cursor, ANCHOR.cursor, cx, cy, {s: cs, a: cuA});
  }

  // final check badge
  const cb = prog(t, 13.75, 14.15);
  if (cb > 0) {
    const s = 0.88 + 0.12 * easeOutBack(cb);
    const a = easeOut(cb);
    knock(ctx, P, CHECK_C.x, CHECK_C.y, {s, a}, (c) => c.arc(0, 0, 44, 0, Math.PI * 2));
    put(ctx, S.checkBadge, ANCHOR.checkBadge, CHECK_C.x, CHECK_C.y, {s, a});
    const ck = easeInOut(prog(t, 13.9, 14.25));
    if (ck > 0) {
      const pts = CHECK_PTS.map(([x, y]) => ({x, y}));
      const l1 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const cum = [0, l1, l1 + Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y)];
      strokeMask(small, S.check, pts, cum, ck * cum[2], 26);
      put(ctx, small, ANCHOR.check, CHECK_C.x, CHECK_C.y, {s});
    }
  }
};

// ---------- HTML overlay ----------
const Captions: React.FC<{t: number}> = ({t}) => {
  const beats = story.beats;
  return (
    <div style={{position: "absolute", left: 78, top: 236, width: 924, height: 168, overflow: "hidden"}}>
      {beats.map((b, i) => {
        const kin = i === 0 ? 1 : smooth(t, b.from - 0.1, b.from + 0.1);
        const kout = i === beats.length - 1 ? 0 : smooth(t, b.to - 0.1, b.to + 0.1);
        const op = kin * (1 - kout);
        if (op <= 0.001) return null;
        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 54,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              color: C.ink,
              padding: "0 22px",
              opacity: op,
              transform: `translateY(${56 * (1 - kin) - 56 * kout}px)`,
            }}
          >
            {b.caption}
          </div>
        );
      })}
    </div>
  );
};

const Label: React.FC<{t: number; start: number; x: number; y: number; size: number; text: string}> = ({t, start, x, y, size, text}) => {
  const r = reveal(t, start, 0.45);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 200,
        top: y,
        width: 400,
        textAlign: "center",
        fontFamily: HAND,
        fontWeight: 700,
        fontSize: size,
        color: C.ink,
        opacity: r.a,
        transform: `translateY(${r.dy}px) scale(${r.s})`,
      }}
    >
      {text}
    </div>
  );
};

const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ref = useRef<HTMLCanvasElement>(null);
  const tmpRef = useRef<HTMLCanvasElement | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const released = useRef(false);
  const [handle] = useState(() => delayRender("p5.brush watercolor sprites", {timeoutInMilliseconds: 240000}));
  const [assets, setAssets] = useState<Assets | null>(null);

  useLayoutEffect(() => {
    let alive = true;
    loadAssets().then((a) => alive && setAssets(a));
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!assets || !ref.current) return;
    if (!tmpRef.current) {
      tmpRef.current = document.createElement("canvas");
      tmpRef.current.width = W;
      tmpRef.current.height = H;
      smallRef.current = document.createElement("canvas");
      smallRef.current.width = 140;
      smallRef.current.height = 140;
    }
    drawFrame(ref.current.getContext("2d")!, tmpRef.current, smallRef.current!, assets, t);
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [assets, t, handle]);

  return (
    <AbsoluteFill style={{background: C.paper}}>
      <canvas ref={ref} width={W} height={H} style={{position: "absolute", inset: 0}} />
      <Captions t={t} />
      <Label t={t} start={0.4} x={600} y={1452} size={46} text="ты" />
      <Label t={t} start={0.75} x={SERVER_C.x} y={806} size={38} text="сервер друга" />
      <div style={{position: "absolute", right: 70, top: 1548, fontFamily: HAND, fontWeight: 700, fontSize: 38, color: C.ink, opacity: 0.6}}>@xtuned</div>
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={story.fps} width={story.width} height={story.height} />);
