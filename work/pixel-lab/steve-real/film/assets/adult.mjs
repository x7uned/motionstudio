// init · people · adult: a neutral casual everyday person (man, tan skin, dark short hair, teal tee, jeans, sneakers).
import { makePerson, SKIN, hairRamp, clothRamp, WHITE } from "../lib/people-rig.mjs";
export default makePerson({
  kind: "adult", covers: ["adult", "person", "man", "human", "grown-up"],
  desc: "friendly casual adult in a teal t-shirt and jeans: stands, talks, points, waves, cheers",
  hw: 66, hh: 92,
  skin: SKIN.tan, hair: { style: "short", ramp: hairRamp("#3A2418") }, iris: ["#1A1020", "#3A2414", "#5A3A20", "#7A5230", "#9A6A40"],
  shirt: clothRamp("#2FB5A8"), shortSleeve: true, pants: clothRamp("#3F6CB8"), shoe: WHITE.slice(), neck: "v", stripe: "#7FE3D6",
  cuffs: null, dims: {},
});
