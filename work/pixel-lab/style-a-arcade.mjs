// Style A · 8-bit arcade: 180×320 grid ×6, flat brand palette only, house plan as a neon maze.
import { Canvas, MAIN, TINY, loadImage, mix } from "./pixel.mjs";

const S = 6, W = 180, H = 320;
const K = "#000000", CARD = "#120C1D", DEEP = "#1D1628", P = "#8D59DA", L = "#E0CDF8", Y = "#F4CA50", YL = "#FAE375",
  IV = "#FDFEED", GR = "#65DA41", PK = "#E03056", MU = "#959595", DIM = mix(IV, K, 0.62), EATEN = "#3A2A5C";
const c = new Canvas(W, H, K);

// Sky: sparse stars + crescent moon.
for (const [x, y] of [[8, 70], [30, 66], [52, 80], [128, 68], [150, 84], [170, 76], [112, 74], [64, 70], [166, 96], [10, 90], [40, 92]]) c.px(x, y, x % 3 ? MU : L);
c.disc(160, 72, 5, Y); c.disc(162, 70, 5, K);

// Roof: double neon line, 2:1 slope.
const roof = (x0, y0, col) => { const top = y0 - Math.round((90 - x0) / 3); c.line(x0, y0, 90, top, col); c.line(180 - x0, y0, 90, top, col); return top; };
const apex = roof(12, 113, P); roof(18, 113, P);
// Antenna with a blinking tip and two short arcs; round attic window.
c.rect(90, apex - 8, 1, 8, L); c.rect(89, apex - 10, 3, 2, Y);
for (const [r, col] of [[4, L], [7, P]]) c.ering(90, apex - 9, r, r, col, Math.PI * 1.2, Math.PI * 1.8);
c.ring(90, 102, 5, L); c.disc(90, 102, 4, DEEP); c.rect(86, 102, 9, 1, L); c.rect(90, 98, 1, 9, L); c.px(88, 100, YL);

// Double-line walls (Pac-Man maze language, our purple).
const block = (x, y, w, h) => { c.rframe(x, y, w, h, P, 1); };
c.rframe(14, 112, 152, 106, P, 2); c.rframe(17, 115, 146, 100, P, 1);
block(87, 115, 6, 26); block(87, 178, 6, 37);            // centre wall, gap for the hub plaza
block(17, 162, 46, 6); block(117, 162, 46, 6);            // floor between rooms, gap for the plaza

// Hub plaza: smart speaker broadcasting.
const hub = ["..YYYYY..", ".LPPPPPL.", "LPPPPPPPL", "LPLPLPLPL", "LPPPPPPPL", "LPLPLPLPL", "LPPPPPPPL", "LPLPLPLPL", ".LPPPPPL.", "..LLLLL.."];
c.sprite(86, 160, hub, { Y, L, P });
c.ering(90, 165, 11, 11, L, -Math.PI * 0.95, -Math.PI * 0.05); c.ering(90, 165, 16, 16, P, -Math.PI * 0.9, -Math.PI * 0.1);
c.text(TINY, "HUB", 85, 172, L);

// Pellet routes from the hub (2×2 dots every 5 px); the lamp route is eaten behind the packet.
const pellets = (pts, from = 0) => {
  let n = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 0; s < len; s += 5) { const x = ax + Math.sign(bx - ax) * s, y = ay + Math.sign(by - ay) * s; c.rect(x, y, 2, 2, n++ >= from ? IV : EATEN); }
  }
};
pellets([[82, 151], [52, 151], [52, 138]], 99);          // to the lamp: all eaten, the packet has arrived
pellets([[98, 152], [124, 152], [124, 142]]);            // to the thermostat
pellets([[82, 180], [52, 180]]);               // to the blinds
pellets([[98, 180], [127, 180]]);  // to the lock

// Living room: floor lamp ON + sofa.
const lamp = ["...YYYYY...", "..YYYYYYY..", ".YYYYYYYYY.", "YYYYYYYYYYY", ".....W.....", ".....P.....", ".....P.....", ".....P.....", ".....P.....", ".....P.....", ".....P.....", ".....P.....", "...PPPPP..."];
c.sprite(24, 124, lamp, { Y, W: IV, P });
for (const [x, y] of [[20, 120], [38, 120], [29, 118], [18, 127], [40, 127], [21, 132], [37, 132]]) c.px(x, y, YL);
const sofa = ["..LLLLLLLLLLLLLL..", ".LPPPPPPPPPPPPPPL.", "LLPPPPPPPPPPPPPPLL", "LPLLLLLLLLLLLLLLPL", "LPPPPPPPPPPPPPPPPL", "LLLLLLLLLLLLLLLLLL", ".L..............L."];
c.sprite(56, 126, sofa, { L, P });
c.text(TINY, "LAMP", 20, 141, L); c.text(TINY, "ON", 20 + c.measure(TINY, "LAMP ") , 141, GR);
// Packet arriving at the lamp, with a short trail.
const packet = ["YYYYYYY", "YWYYYWY", "YYWYWYY", "YYYWYYY", "YYYYYYY"];
c.sprite(40, 131, packet, { Y, W: IV }); c.px(48, 133, YL); c.px(51, 133, Y);

// Kitchen: thermostat on the wall.
c.disc(124, 130, 8, P); c.disc(124, 130, 6, CARD); c.ering(124, 130, 6, 6, GR, Math.PI * 0.8, Math.PI * 2.2);
c.text(TINY, "21", 120, 128, GR); c.px(128, 128, GR);
c.text(TINY, "HEAT", 98, 128, L);
// Fridge.
c.sprite(148, 120, ["LLLLLLLL", "LPPPPPPL", "LPPPPPYL", "LPPPPPPL", "LLLLLLLL", "LPPPPPPL", "LPPPPPYL", "LPPPPPPL", "LPPPPPPL", "LPPPPPPL", "LPPPPPPL", "LLLLLLLL"], { L, P, Y });

// Bedroom: window with smart blinds + bed.
c.frame(26, 172, 22, 18, L); c.rect(27, 173, 20, 16, DEEP);
for (let j = 0; j < 4; j++) c.rect(27, 173 + j * 2, 20, 1, P);
c.px(37, 186, IV); c.px(31, 184, MU); c.px(43, 185, MU);
c.text(TINY, "BLINDS", 22, 194, L);
c.sprite(58, 196, ["L..............", "LII............", "LIIPPPPPPPPPPPL", "LPPPPPPPPPPPPPL", "LLLLLLLLLLLLLLL", "L.............L"], { L, P, I: IV });

// Hall: front door + smart lock.
c.frame(140, 180, 14, 32, L); c.rect(141, 181, 12, 31, CARD); c.rect(150, 196, 2, 2, Y);
c.sprite(124, 184, ["..LLL..", ".L...L.", ".L...L.", "GGGGGGG", "GGGKGGG", "GGGKGGG", "GGGGGGG"], { L, G: GR, K });
c.text(TINY, "LOCK", 120, 194, L);

// Ground and HUD line.
c.rect(6, 219, 168, 1, P);


// Header (overlay v2, TikTok-safe rows): avatar, handle, duration, title.
c.sprite(13, 41, ["...PPPPP...", "..PHhHHhP..", ".PHHHHHHHP.", "PhHHhHHHHhP", "PHHSSSSSHHP", "PKKKKSKKKKP", "PSKKSSSKKSP", "PSSSSSSSSSP", ".PSSShSSSP.", "..PSSSSSP..", "...PPPPP..."],
  { P, H: "#F2A24A", h: "#B5642C", S: "#F6C9A2", K: "#3A2752" });
c.text(TINY, "@KAGENAMI_AI", 28, 44, IV);
c.text(TINY, "10 S", 156 - c.measure(TINY, "10 S"), 44, MU);
c.text(MAIN, "HOW A SMART HOME THINKS", 13, 55, IV);

// Karaoke caption: spoken words ivory, current word filling yellow, next words dim.
const cap = "THE HUB WAKES THE LAMP", capW = c.measure(MAIN, cap), cx = Math.round(90 - capW / 2), fillTo = cx + c.measure(MAIN, "THE HUB WAKES THE LA");
c.text(MAIN, cap, cx, 230, (x) => (x < cx + c.measure(MAIN, "THE HUB WAKES THE ") ? IV : x < fillTo ? Y : DIM));

await c.save("work/pixel-lab/style-a-arcade.png", S);
console.log("ok");
