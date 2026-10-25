// p5.brush drawings for every prepared object of «Акварель и маркер».
// Each sprite has a fixed seed; anchors map sprite pixels to scene coordinates.
import type {Brush, SpriteSpec} from "./brushSprites";
import {C, PACKET_COLORS, ROUTERS, ROUTES, W, H} from "./scene";

const OUT = 2.5; // ink outline weight

type XY = [number, number];

const rrect = (x: number, y: number, w: number, h: number, r: number, n = 5): XY[] => {
  const pts: XY[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
};

const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 28): XY[] =>
  Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as XY;
  });

const shift = (pts: XY[], dx: number, dy: number): XY[] => pts.map(([x, y]) => [x + dx, y + dy] as XY);

const wash = (b: Brush, color: string, opacity: number, bleed = 0.22, tex = 0.5, border = 0.6) => {
  b.noStroke();
  b.noHatch();
  b.fill(color, opacity);
  b.fillBleed(bleed, "out");
  b.fillTexture(tex, border);
};
const ink = (b: Brush, w = OUT, name = "pen", color = C.ink) => {
  b.noFill();
  b.noHatch();
  b.set(name, color, w);
};
const hatchOnly = (b: Brush, dist: number, angle: number, w = 0.7, name = "2B", color = C.graphite) => {
  b.noStroke();
  b.noFill();
  b.hatch(dist, angle, {rand: 0.25});
  b.hatchStyle(name, color, w);
};
const done = (b: Brush) => {
  b.noHatch();
  b.noFill();
  b.noStroke();
};

export const ANCHOR: Record<string, {x: number; y: number}> = {
  band: {x: 500, y: 115},
  laptop: {x: 0, y: 0},
  card: {x: 270, y: 90},
  button: {x: 130, y: 55},
  cursor: {x: 24, y: 20},
  packet: {x: 100, y: 100},
  badge: {x: 50, y: 50},
  cut: {x: 20, y: 95},
  router: {x: 120, y: 131},
  ring: {x: 110, y: 110},
  server: {x: 160, y: 185},
  tray: {x: 310, y: 59},
  orb: {x: 100, y: 100},
  checkBadge: {x: 70, y: 70},
  check: {x: 70, y: 70},
};

export const CHECK_PTS: XY[] = [
  [44, 72],
  [63, 93],
  [100, 47],
];
export const CURSOR_PTS: XY[] = [
  [24, 20],
  [24, 128],
  [50, 104],
  [70, 148],
  [90, 139],
  [70, 96],
  [106, 96],
];

export const buildSpecs = (): SpriteSpec[] => {
  const specs: SpriteSpec[] = [];

  // --- full-page layers (one atlas page each) ---
  specs.push({
    id: "blooms",
    w: W,
    h: H,
    seed: 101,
    draw: (b) => {
      wash(b, C.rose, 28, 0.35, 0.7, 0.4);
      b.polygon(ellipsePts(70, 560, 190, 150));
      wash(b, C.indigo, 24, 0.35, 0.7, 0.4);
      b.polygon(ellipsePts(1010, 1640, 260, 200));
      wash(b, C.sage, 26, 0.35, 0.7, 0.4);
      b.polygon(ellipsePts(1040, 1130, 150, 190));
      wash(b, C.mustard, 22, 0.35, 0.7, 0.4);
      b.polygon(ellipsePts(60, 1820, 240, 150));
      done(b);
    },
  });

  specs.push({
    id: "wires",
    w: W,
    h: H,
    seed: 102,
    draw: (b) => {
      b.noFill();
      b.noHatch();
      b.set("HB", C.graphite, 1.3);
      const [r1, r2, r3] = ROUTERS;
      b.spline([[r1.x + 60, r1.y + 10], [365, 985], [r2.x - 70, r2.y + 5]], 0.5);
      b.spline([[r2.x + 70, r2.y], [715, 975], [r3.x - 70, r3.y + 10]], 0.5);
      b.spline([[r1.x - 10, r1.y - 70], [175, 820], [165, 752]], 0.5);
      b.spline([[r3.x - 20, r3.y - 70], [850, 850], [820, 808]], 0.5);
      b.spline([[r2.x, r2.y - 45], [500, 860], [445, 752]], 0.5);
      b.spline([[r1.x + 20, r1.y + 45], [215, 1030], [230, 1080]], 0.5);
      b.spline([[r2.x - 30, r2.y + 45], [470, 1050], [450, 1080]], 0.5);
      b.spline([[r3.x - 20, r3.y + 45], [800, 1040], [720, 1085]], 0.5);
      done(b);
    },
  });

  ROUTES.forEach((r, i) => {
    specs.push({
      id: `trail${i}`,
      w: W,
      h: H,
      seed: 110 + i,
      draw: (b) => {
        b.noFill();
        b.noHatch();
        b.set("marker", PACKET_COLORS[i], 2.4);
        const dash = 20;
        const gap = 15;
        let d = 0;
        while (d < r.len - 70) {
          const a = at(r, d);
          const e = at(r, Math.min(d + dash, r.len));
          b.line(a[0], a[1], e[0], e[1]);
          d += dash + gap;
        }
        done(b);
      },
    });
  });

  // --- objects ---
  specs.push({
    id: "band",
    w: 1000,
    h: 230,
    seed: 201,
    draw: (b) => {
      wash(b, C.mustard, 70, 0.18, 0.6, 0.55);
      b.polygon(rrect(56, 38, 888, 156, 26));
      done(b);
    },
  });

  specs.push({
    id: "laptop",
    w: 560,
    h: 380,
    seed: 202,
    draw: (b) => {
      // ground shadow
      hatchOnly(b, 7, 12, 0.7, "2B");
      b.polygon(ellipsePts(262, 336, 230, 20));
      // lid + base washes (offset from the ink line)
      wash(b, C.indigo, 120, 0.2, 0.5, 0.65);
      b.polygon(shift(rrect(60, 22, 400, 258, 18), 6, 5));
      wash(b, C.indigo, 150, 0.15, 0.5, 0.7);
      b.polygon(shift([[20, 282], [500, 282], [472, 318], [48, 318]], 5, 4));
      // screen
      wash(b, C.cream, 160, 0.1, 0.4, 0.4);
      b.polygon(shift(rrect(82, 42, 356, 214, 8), 3, 3));
      // ink
      ink(b);
      b.polygon(rrect(60, 22, 400, 258, 18));
      b.polygon(rrect(82, 42, 356, 214, 8));
      b.polygon([[20, 282], [500, 282], [472, 318], [48, 318]]);
      ink(b, 1.6);
      b.line(220, 300, 300, 300);
      b.circle(260, 32, 3);
      // hatch shading on lid edge
      hatchOnly(b, 6, 60, 0.55, "HB");
      b.polygon([[440, 40], [458, 40], [458, 262], [440, 262]]);
      done(b);
    },
  });

  specs.push({
    id: "card",
    w: 540,
    h: 180,
    seed: 203,
    draw: (b) => {
      hatchOnly(b, 6, 30, 0.55, "HB");
      b.polygon([[52, 152], [512, 152], [518, 160], [58, 160]]);
      wash(b, C.indigo, 46, 0.18, 0.55, 0.5);
      b.polygon(shift(rrect(30, 30, 480, 120, 16), 5, 4));
      ink(b);
      b.polygon(rrect(30, 30, 480, 120, 16));
      done(b);
    },
  });

  specs.push({
    id: "button",
    w: 260,
    h: 110,
    seed: 204,
    draw: (b) => {
      wash(b, C.terracotta, 140, 0.2, 0.5, 0.65);
      b.polygon(shift(rrect(30, 27, 200, 56, 28), 4, 3));
      ink(b, 2.1);
      b.polygon(rrect(30, 27, 200, 56, 28));
      done(b);
    },
  });

  specs.push({
    id: "cursor",
    w: 130,
    h: 170,
    seed: 205,
    draw: (b) => {
      wash(b, C.rose, 70, 0.1, 0.4, 0.5);
      b.polygon(shift(CURSOR_PTS, 3, 3));
      ink(b, 2.2);
      b.polygon(CURSOR_PTS);
      done(b);
    },
  });

  PACKET_COLORS.forEach((col, i) => {
    specs.push({
      id: `packet${i}`,
      w: 200,
      h: 200,
      seed: 210 + i,
      draw: (b) => {
        hatchOnly(b, 6, 35, 0.55, "HB");
        b.polygon([[52, 160], [164, 160], [170, 168], [58, 168]]);
        wash(b, col, 150, 0.22, 0.55, 0.7);
        b.polygon(shift(rrect(40, 40, 120, 120, 12), 5, 4));
        ink(b);
        b.polygon(rrect(40, 40, 120, 120, 12));
        done(b);
      },
    });
    specs.push({
      id: `badge${i}`,
      w: 100,
      h: 100,
      seed: 220 + i,
      draw: (b) => {
        wash(b, C.indigo, 190, 0.12, 0.45, 0.6);
        b.circle(52, 52, 25, 0.3);
        ink(b, 1.7);
        b.circle(50, 50, 25, 0.3);
        done(b);
      },
    });
  });

  specs.push({
    id: "cut",
    w: 40,
    h: 190,
    seed: 230,
    draw: (b) => {
      ink(b, 2, "2B", C.ink);
      for (let y = 12; y < 176; y += 22) b.line(20, y, 20 + (y % 3) * 0.4, y + 13);
      done(b);
    },
  });

  ROUTERS.forEach((_, i) => {
    specs.push({
      id: `router${i}`,
      w: 240,
      h: 210,
      seed: 240 + i,
      draw: (b) => {
        hatchOnly(b, 6, 20, 0.6, "2B");
        b.polygon(ellipsePts(124, 182, 92, 12));
        wash(b, C.sage, 150, 0.2, 0.55, 0.7);
        b.polygon(shift(rrect(45, 95, 150, 72, 20), 5, 4));
        ink(b);
        b.polygon(rrect(45, 95, 150, 72, 20));
        ink(b, 2);
        b.line(82, 95, 66, 42);
        b.line(158, 95, 174, 42);
        wash(b, C.mustard, 200, 0.1, 0.4, 0.5);
        b.circle(98, 131, 7, 0.2);
        b.circle(120, 131, 7, 0.2);
        wash(b, C.terracotta, 200, 0.1, 0.4, 0.5);
        b.circle(142, 131, 7, 0.2);
        ink(b, 1.6);
        b.circle(65, 38, 7, 0.2);
        b.circle(175, 38, 7, 0.2);
        done(b);
      },
    });
  });

  specs.push({
    id: "ring",
    w: 220,
    h: 220,
    seed: 250,
    draw: (b) => {
      ink(b, 1.4, "2B", C.graphite);
      b.circle(110, 110, 88, 0.5);
      done(b);
    },
  });

  specs.push({
    id: "server",
    w: 320,
    h: 400,
    seed: 260,
    draw: (b) => {
      hatchOnly(b, 7, 15, 0.7, "2B");
      b.polygon(ellipsePts(166, 352, 140, 18));
      wash(b, C.indigo, 165, 0.2, 0.55, 0.75);
      b.polygon(shift(rrect(50, 40, 220, 290, 18), 6, 5));
      wash(b, C.cream, 190, 0.1, 0.4, 0.4);
      b.circle(162, 121, 40, 0.2);
      for (const y of [196, 234, 272]) {
        wash(b, C.paper, 120, 0.05, 0.3, 0.3);
        b.polygon(rrect(84, y - 11, 120, 22, 8));
      }
      wash(b, C.sage, 220, 0.08, 0.3, 0.4);
      for (const y of [196, 234]) b.circle(232, y, 7, 0.2);
      wash(b, C.mustard, 220, 0.08, 0.3, 0.4);
      b.circle(232, 272, 7, 0.2);
      ink(b);
      b.polygon(rrect(50, 40, 220, 290, 18));
      ink(b, 2);
      b.circle(160, 119, 40, 0.2);
      for (const y of [196, 234, 272]) b.polygon(rrect(84, y - 11, 120, 22, 8));
      hatchOnly(b, 6, 70, 0.55, "HB");
      b.polygon([[246, 60], [262, 60], [262, 312], [246, 312]]);
      done(b);
    },
  });

  specs.push({
    id: "tray",
    w: 620,
    h: 120,
    seed: 270,
    draw: (b) => {
      hatchOnly(b, 6, 25, 0.55, "HB");
      b.polygon([[64, 80], [556, 80], [540, 96], [80, 96]]);
      wash(b, C.mustard, 90, 0.15, 0.5, 0.6);
      b.polygon(shift([[40, 40], [580, 40], [560, 78], [60, 78]], 4, 3));
      ink(b, 2.2);
      b.polygon([[40, 40], [580, 40], [560, 78], [60, 78]]);
      done(b);
    },
  });

  specs.push({
    id: "orb",
    w: 200,
    h: 200,
    seed: 280,
    draw: (b) => {
      wash(b, C.rose, 90, 0.3, 0.6, 0.5);
      b.circle(100, 100, 42, 0.4);
      wash(b, C.mustard, 150, 0.25, 0.5, 0.6);
      b.circle(96, 96, 28, 0.4);
      done(b);
    },
  });

  specs.push({
    id: "checkBadge",
    w: 140,
    h: 140,
    seed: 290,
    draw: (b) => {
      wash(b, C.sage, 170, 0.18, 0.5, 0.7);
      b.circle(73, 73, 44, 0.3);
      ink(b);
      b.circle(70, 70, 44, 0.3);
      done(b);
    },
  });

  specs.push({
    id: "check",
    w: 140,
    h: 140,
    seed: 291,
    draw: (b) => {
      ink(b, 4.2, "pen");
      b.line(CHECK_PTS[0][0], CHECK_PTS[0][1], CHECK_PTS[1][0], CHECK_PTS[1][1]);
      b.line(CHECK_PTS[1][0], CHECK_PTS[1][1], CHECK_PTS[2][0], CHECK_PTS[2][1]);
      done(b);
    },
  });

  return specs;
};

const at = (r: (typeof ROUTES)[number], d: number): XY => {
  let k = 1;
  while (k < r.cum.length - 1 && r.cum[k] < d) k++;
  const a = r.pts[k - 1];
  const e = r.pts[k];
  const seg = r.cum[k] - r.cum[k - 1] || 1;
  const f = Math.max(0, Math.min(1, (d - r.cum[k - 1]) / seg));
  return [a.x + (e.x - a.x) * f, a.y + (e.y - a.y) * f];
};
