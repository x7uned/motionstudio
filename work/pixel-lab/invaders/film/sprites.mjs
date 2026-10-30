// Our own pixel drawings in the spirit of a 1978 alien-invasion arcade game (not the original bitmaps): three alien
// kinds with two march frames each, the cannon, the saucer, the shields, three bomb shapes and the player's shot.
// Units are "game pixels"; render.mjs draws each one as a lit block at the camera's zoom.
const G = (s) => s.trim().split(/\s+/).map((r) => r.replace(/\./g, " "));
// '#' body, 'h' highlight, 'd' shade, 'e' eye
export const ALIEN = {
  // top row: a small jellyfish with a dome and curling legs
  jelly: [G(`
    ....##....
    ...####...
    ..#hhhh#..
    .##e##e##.
    .########.
    ...#..#...
    ..#.##.#..
    .#.#..#.#.`), G(`
    ....##....
    ...####...
    ..#hhhh#..
    .##e##e##.
    .########.
    ..#.##.#..
    .#......#.
    ..#....#..`)],
  // middle rows: a beetle with feelers and pincers
  beetle: [G(`
    ..#......#..
    ...#....#...
    ..##hhhh##..
    .###e##e###.
    #.########.#
    #.#dddddd#.#
    ...##..##...
    ..#......#..`), G(`
    ..#......#..
    #..#....#..#
    #.##hhhh##.#
    ####e##e####
    ..########..
    ..#dddddd#..
    .#.##..##.#.
    #..........#`)],
  // bottom rows: a wide squid with three eyes and a skirt of feet
  squid: [G(`
    ....####....
    .##hhhhhh##.
    ############
    ##e##ee##e##
    ############
    ..##.##.##..
    .##..##..##.
    ##........##`), G(`
    ....####....
    .##hhhhhh##.
    ############
    ##e##ee##e##
    ############
    ...##..##...
    ..##.##.##..
    ...##..##...`)],
};
export const ALIEN_W = { jelly: 10, beetle: 12, squid: 12 };
export const ALIEN_COL = {
  jelly: { "#": "#FF5FA2", h: "#FFC2DD", d: "#B02A6A", e: "#2A0A1E" },
  beetle: { "#": "#4FE3F0", h: "#C8FBFF", d: "#1F8FA8", e: "#062A33" },
  squid: { "#": "#FFC23A", h: "#FFF0B0", d: "#C07A10", e: "#3A1E00" },
};
export const CANNON = G(`
  ......#......
  .....###.....
  .....#h#.....
  .###########.
  #hhhhhhhhhhh#
  #############
  #############
  #ddddddddddd#`);
export const CANNON_COL = { "#": "#5BE36A", h: "#C9FFC9", d: "#2A8A3A" };
export const SAUCER = G(`
  .....######.....
  ...##########...
  ..##hhhhhhhh##..
  .##e##e##e##e##.
  ################
  ..###..##..###..
  ...#........#...`);
export const SAUCER_COL = { "#": "#FF4A4A", h: "#FFC2C2", d: "#A01818", e: "#FFF3B0" };
// bombs (3 × 8): a zigzag, a plunger and a twisting rod; 4 frames each, cycling as they fall
export const BOMB = {
  zig: [G(`#.. .#. ..# .#. #.. .#. ..# .#.`), G(`.#. ..# .#. #.. .#. ..# .#. #..`), G(`..# .#. #.. .#. ..# .#. #.. .#.`), G(`.#. #.. .#. ..# .#. #.. .#. ..#`)],
  plunger: [G(`.#. .#. .#. .#. .#. .#. ### .#.`), G(`.#. .#. ### .#. .#. .#. .#. .#.`), G(`.#. .#. .#. .#. ### .#. .#. .#.`), G(`### .#. .#. .#. .#. .#. .#. .#.`)],
  rod: [G(`.#. .#. .## .#. ##. .#. .#. .#.`), G(`.#. ##. .#. .## .#. ##. .#. .#.`), G(`.#. .## .#. ##. .#. .## .#. .#.`), G(`.#. .#. ##. .#. .## .#. .#. .#.`)],
};
export const SHOT = G(`# # # #`);
// an alien's burst (13 × 8) and the shot's small pop (6 × 8): our own shapes
export const BURST = G(`
  ...#..#..#...
  #...#...#...#
  .#.........#.
  ..#..###..#..
  ##..#####..##
  ..#..###..#..
  .#...#.#...#.
  #...#...#...#`);
export const POP = G(`
  #...#.
  ..#..#
  .####.
  ######
  .####.
  #.##.#
  ..#...
  #...#.`);
// a shield (22 × 16): an arch with a doorway; aliens wipe it where they pass (render.mjs)
export const SHIELD = G(`
  ....##############....
  ...################...
  ..##################..
  .####################.
  ######################
  ######################
  ######################
  ######################
  ######################
  ######################
  ######################
  ######################
  #######........#######
  ######..........######
  #####............#####
  #####............#####`);
export const SHIELD_COL = "#5BE36A";
