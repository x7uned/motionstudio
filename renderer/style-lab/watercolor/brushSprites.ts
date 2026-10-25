// Prepared p5.brush sprite atlas for the «Акварель и маркер» style.
// Every sprite is painted ONCE per browser tab with a fixed per-object seed,
// then copied into its own 2D canvas. Frames only composite these canvases,
// so the picture is identical no matter which frame a render tab starts at.

export type Brush = any; // p5.brush has no bundled typings
export type P5 = any;

export type SpriteSpec = {
  id: string;
  w: number;
  h: number;
  seed: number;
  draw: (b: Brush, p: P5) => void;
};

export type SpriteSet = Record<string, HTMLCanvasElement>;

const PAGE_W = 1080;
const PAGE_H = 1920;
const GAP = 24;

type Placed = SpriteSpec & {x: number; y: number};

const pack = (specs: SpriteSpec[]): Placed[][] => {
  const pages: Placed[][] = [];
  let page: Placed[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const s of specs) {
    if (s.w > PAGE_W || s.h > PAGE_H) throw new Error(`sprite ${s.id} too large`);
    if (x + s.w > PAGE_W) {
      x = 0;
      y += rowH + GAP;
      rowH = 0;
    }
    if (y + s.h > PAGE_H) {
      pages.push(page);
      page = [];
      x = 0;
      y = 0;
      rowH = 0;
    }
    page.push({...s, x, y});
    x += s.w + GAP;
    rowH = Math.max(rowH, s.h);
  }
  if (page.length) pages.push(page);
  return pages;
};

let cache: Promise<SpriteSet> | null = null;

export const buildSprites = (specs: SpriteSpec[]): Promise<SpriteSet> => {
  if (!cache) cache = paint(specs);
  return cache;
};

async function paint(specs: SpriteSpec[]): Promise<SpriteSet> {
  const P5mod = await import("p5");
  const P5ctor = (P5mod as any).default ?? P5mod;
  // p5.brush registers its p5 lifecycle addon only when a global p5 exists at import time.
  (window as any).p5 = P5ctor;
  // @ts-ignore untyped package
  const brushMod = await import("p5.brush");
  const brush: Brush = brushMod;

  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:-${PAGE_W * 3}px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;pointer-events:none;`;
  document.body.appendChild(holder);

  let current: Placed[] = [];
  let firstDraw: (() => void) | null = null;
  const ready = new Promise<void>((r) => (firstDraw = r));

  const inst = new P5ctor((p: P5) => {
    brush.instance(p);
    p.setup = () => {
      p.createCanvas(PAGE_W, PAGE_H, p.WEBGL);
      p.pixelDensity(1);
      p.angleMode(p.DEGREES);
      brush.load();
      brush.scaleBrushes(2.2);
      p.noLoop();
    };
    p.draw = () => {
      // White ground: sprites are composited with "multiply", so white = untouched paper.
      p.background(255);
      for (const item of current) {
        p.push();
        p.translate(-PAGE_W / 2 + item.x, -PAGE_H / 2 + item.y);
        p.randomSeed(item.seed);
        p.noiseSeed(item.seed);
        brush.seed(item.seed);
        brush.noiseSeed(item.seed);
        brush.noField();
        item.draw(brush, p);
        p.pop();
      }
      if (firstDraw) {
        const f = firstDraw;
        firstDraw = null;
        f();
      }
    };
  }, holder);
  await ready;
  // let p5 leave its first draw() before driving redraw() manually (setup-only wait, not frame timing)
  for (let i = 0; i < 200 && (inst._inUserDraw || !inst._setupDone); i++) await new Promise((r) => setTimeout(r, 5));

  const out: SpriteSet = {};
  for (const page of pack(specs)) {
    current = page;
    await Promise.resolve(inst.redraw());
    const src: HTMLCanvasElement = inst.canvas ?? inst._renderer.canvas;
    for (const item of page) {
      const c = document.createElement("canvas");
      c.width = item.w;
      c.height = item.h;
      c.getContext("2d")!.drawImage(src, item.x, item.y, item.w, item.h, 0, 0, item.w, item.h);
      out[item.id] = c;
    }
  }
  current = [];
  inst.remove();
  holder.remove();
  return out;
}

// --- deterministic helpers (no Math.random) ---
export const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Warm cotton paper: base tone + fibre grain + soft vignette, drawn with Canvas 2D.
export const paintPaper = (w: number, h: number, seed: number): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const rnd = mulberry32(seed);
  // low-frequency mottling grid
  const gw = 28;
  const gh = 48;
  const grid = new Float32Array((gw + 1) * (gh + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = rnd() - 0.5;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const base = [242, 233, 216];
  for (let y = 0; y < h; y++) {
    const gy = (y / h) * gh;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = (x / w) * gw;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const a = grid[y0 * (gw + 1) + x0];
      const b = grid[y0 * (gw + 1) + x0 + 1];
      const cc = grid[(y0 + 1) * (gw + 1) + x0];
      const dd = grid[(y0 + 1) * (gw + 1) + x0 + 1];
      const mott = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + dd * fx) * fy;
      const grain = (rnd() - 0.5) * 14;
      const nx = x / w - 0.5;
      const ny = y / h - 0.5;
      const vig = -(nx * nx * 0.9 + ny * ny * 0.6) * 46;
      const v = mott * 10 + grain + vig;
      const i = (y * w + x) * 4;
      d[i] = base[0] + v;
      d[i + 1] = base[1] + v * 0.96;
      d[i + 2] = base[2] + v * 0.9;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // cotton fibres
  ctx.lineCap = "round";
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 6 + rnd() * 22;
    const ang = rnd() * Math.PI * 2;
    ctx.strokeStyle = rnd() < 0.5 ? "rgba(120,96,70,0.10)" : "rgba(255,252,244,0.35)";
    ctx.lineWidth = 0.6 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang + 0.6) * len * 0.5, y + Math.sin(ang + 0.6) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  return c;
};
