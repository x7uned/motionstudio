// init · people · child: a small girl (pale skin, ginger pigtails with bows, yellow star tee, purple shorts, pink sneakers).
import { makePerson, SKIN, hairRamp, clothRamp } from "../lib/people-rig.mjs";
export default makePerson({
  kind: "child", covers: ["child", "kid", "girl", "boy", "pupil", "toddler"],
  desc: "small chibi child with pigtails, big eyes, yellow star t-shirt and shorts: stands, talks, points, waves, cheers",
  hw: 62, hh: 78,
  dims: { legH: 36, torsoH: 44, hrx: 42, hry: 38, tw: 22, hip: 20, l1: 19, l2: 18, ar: 6.8, eyeR: 10, eyeGap: 33 },
  skin: SKIN.pale, hair: { style: "pigtails", ramp: hairRamp("#D8641C"), tie: clothRamp("#E8408A") }, iris: ["#1A1020", "#1E3A5A", "#2E5E8E", "#4A86B8", "#7AB2D8"],
  shirt: clothRamp("#F5C238"), shortSleeve: true, star: "#FFF0A8", pants: clothRamp("#8A5ED0"), legs: "skin", shoe: clothRamp("#F0709A"), blush: 1.4, neck: "v",
  freckles: true,
});
