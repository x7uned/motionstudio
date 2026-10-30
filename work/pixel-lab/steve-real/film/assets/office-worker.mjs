// init · people · office-worker: a woman office worker (olive skin, long chestnut hair, white shirt, red tie, blue lanyard badge, navy trousers).
import { makePerson, SKIN, hairRamp, clothRamp, WHITE, skinRamp } from "../lib/people-rig.mjs";
export default makePerson({
  kind: "office-worker", covers: ["office-worker", "office worker", "clerk", "employee", "manager", "businessman", "secretary"],
  desc: "chibi office worker with long hair, white shirt, red tie and a lanyard badge: stands, talks, points, waves, cheers",
  hw: 66, hh: 95,
  skin: skinRamp("#DDA876"), hair: { style: "bob", ramp: hairRamp("#7A3E22") }, iris: ["#10161A", "#1E3A2A", "#2E5E3E", "#4A8658", "#7AB284"],
  shirt: WHITE, sleeve: WHITE, sleeveBase: 3.9, collar: WHITE[6], tie: clothRamp("#D8404A"), badge: { lan: "#3A7AD8", photo: "#9AA6C4" }, pants: clothRamp("#2E3A68"), shoe: clothRamp("#2A2430"),
});
