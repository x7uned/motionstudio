// The maze for «Only the red ghost is chasing you»: our own layout in the spirit of the 1980 arcade maze (not the original
// map). Tile grid 21 × 27; '#' wall, '.' corridor with a dot, 'o' power pellet, ' ' corridor without a dot, '-' ghost door,
// 'H' ghost house. Coordinates: x right, y down, tile centres at integer + 0.5.
export const ROWS = [
  "#####################",
  "#.........#.........#",
  "#o###.###.#.###.###o#",
  "#.###.###.#.###.###.#",
  "#...................#",
  "#.###.#.#####.#.###.#",
  "#.....#...#...#.....#",
  "#####.###.#.###.#####",
  "#####.#       #.#####",
  "#####.# ##-## #.#####",
  "#.... # #HHH# # ....#",
  "#.###.# ##### #.###.#",
  "#...#.#       #.#...#",
  "###.#.#.#####.#.#.###",
  "#.........#.........#",
  "#.###.###.#.###.###.#",
  "#...#...........#...#",
  "###.#.#.#####.#.#.###",
  "#.....#.......#.....#",
  "#.###.#.#####.#.###.#",
  "#o..#...........#..o#",
  "###.#.###.#.###.#.###",
  "#.........#.........#",
  "#.#######.#.#######.#",
  "#...................#",
  "#####################",
];
export const MW = ROWS[0].length, MH = ROWS.length;
export const cell = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? "#" : ROWS[y][x]);
export const isWall = (x, y) => { const c = cell(x, y); return c === "#" || c === "H" || c === "-"; };
export const isOpen = (x, y) => !isWall(x, y);
export const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
export const ORDER = ["up", "left", "down", "right"];
export const REV = { up: "down", down: "up", left: "right", right: "left" };
export const exits = (x, y) => ORDER.filter((d) => isOpen(x + DIRS[d][0], y + DIRS[d][1]));
export const DOTS = [];
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const c = cell(x, y); if (c === "." || c === "o") DOTS.push({ x, y, big: c === "o" }); }
// scatter targets sit just outside the maze corners (as in the arcade game, they are never reached: ghosts circle near them)
export const CORNER = { red: [MW - 2, -3], pink: [1, -3], blue: [MW - 1, MH + 1], orange: [0, MH + 1] };
export const HOUSE = { x0: 8, y0: 9, x1: 12, y1: 11, door: [10, 9] };

export function validate() {
  const errs = [];
  ROWS.forEach((r, y) => { if (r.length !== MW) errs.push(`row ${y} width ${r.length}`); if ([...r].reverse().join("") !== r) errs.push(`row ${y} not symmetric`); });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!isOpen(x, y)) continue;
    const n = exits(x, y).length; if (n < 2) errs.push(`dead end at ${x},${y}`);
    if (isOpen(x + 1, y) && isOpen(x, y + 1) && isOpen(x + 1, y + 1)) errs.push(`2x2 open at ${x},${y}`);
  }
  // connectivity
  const start = DOTS[0], seen = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
  while (q.length) { const [x, y] = q.pop(); for (const d of exits(x, y)) { const k = `${x + DIRS[d][0]},${y + DIRS[d][1]}`; if (!seen.has(k)) { seen.add(k); q.push([x + DIRS[d][0], y + DIRS[d][1]]); } } }
  let open = 0; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (isOpen(x, y)) open++;
  if (seen.size !== open) errs.push(`disconnected: ${seen.size}/${open}`);
  return errs;
}
