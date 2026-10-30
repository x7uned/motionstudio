// «You're not ugly» — Builder ROOM's beat sheet: every in-world motion of the room as times derived from the narration
// (EV) and the lead's windows in timeline.mjs. Shared by the picture (room-cast.mjs) and the sound list (room-motions.mjs),
// so every 8-bit sound lasts exactly as long as its motion. No heavy imports here.
import { EV, SELFIE_ARM, PHONE_FLY, TURN_TO_MIRROR, TURN_BACK, HOP, WORDS } from "../timeline.mjs";

export const T = {
  // YOU
  selfieUp: [SELFIE_ARM[0], SELFIE_ARM[0] + 0.55],          // the phone goes from the chest to arm's length
  selfieDown: [SELFIE_ARM[1], SELFIE_ARM[1] + 0.55],        // the empty hand comes down after the phone has gone
  handOpen: [PHONE_FLY[0], PHONE_FLY[0] + 0.3],             // the fist opens as the phone floats off
  turnTo: TURN_TO_MIRROR, turnBack: TURN_BACK,
  jaw: [EV.bones1 - 0.35, EV.head1 + 0.25],                 // hand to the jaw on "bones of your head"
  deeper: [EV.deeper - 0.1, EV.deeperEnd + 0.1],            // a little squat on "deeper"
  cringe: [EV.only - 0.25, EV.air2End + 0.25],              // hands up, wince while the recording plays
  chin: [EV.test - 0.05, EV.gave - 0.35],                   // thinking, hand on the chin (blind test)
  yay: [EV.higher - 0.15, EV.did],                          // little fist on "own voice higher"
  hop: HOP,
  wave: [EV.send - 0.15, EV.follow + 0.45],                 // you wave on "Send it to a friend"
  // the phone
  fly: PHONE_FLY,
  pocket: [EV.so3 + 3.85, EV.so3 + 4.3],                     // the friend slips the phone into his pocket (≈ 47.75–48.2)
  rec: [EV.recording - 0.05, EV.air2End + 0.3],              // red REC light on the friend's phone
  // the dimension line
  lineIn: [EV.n30cm - 0.35, EV.n30cm],                        // dotted line grows face → phone; "30 CM" pops on "30"
  tag30: EV.n30cm,
  tag15: EV.half - 0.05,                                     // the tag turns into "1.5 M" on "half"
  lineOut: [EV.close2End + 0.05, EV.close2End + 0.45],
  // hearts and pulses
  heartMirror: EV.like - 0.02,
  heartFriend: EV.friends + 0.2,
  heartsHappy: [EV.face3 + 0.1, EV.mirror4 + 0.1],
  bonePulses: [EV.bones1, EV.bones2, EV.low, EV.deeper],
};

// the friend (channel sprite, mirrored = facing left): [t0, row, frames, seconds per frame]
export const FRIEND_POSES = [
  [-5, 0, [0, 1, 3, 4, 5, 6, 5, 4, 3, 1], 0.36],             // relaxed idle
  [PHONE_FLY[0] - 0.25, 8, [0, 3, 5, 3], 1.0],               // hands ready → holds the phone
  [EV.nobody - 0.04, 9, [0, 3, 5, 3, 0, 3], 0.3],      // happy nod: "Nobody else sees you from that close"
  [EV.close2End + 0.05, 8, [0, 3, 5, 3], 1.0],
  [EV.friends - 0.2, 4, [0, 3, 4, 5, 4, 3], 0.28],     // points at you on "their friends"
  [EV.realEnd - 0.04, 8, [0, 3, 5, 3], 1.0],                 // films you
  [EV.so3 - 0.15, 9, [0, 3, 5, 3, 0, 5, 3, 0, 3, 5, 3, 0, 3], 0.28],  // excited: "So it's not your face…"
  [EV.so3 + 3.85, 0, [0, 1, 3, 4, 5, 6], 0.24],              // pockets the phone
  [EV.send - 0.12, 1, [0, 1, 2, 1, 2, 1, 2, 3], 0.25], // waves on "Send it to a friend"
  [EV.follow + 0.5, 0, [0, 1, 3, 4, 5, 6, 5, 4], 0.26],
  [EV.next + 0.05, 0, [2], 0.7],                              // a wink on "next one"
  [EV.next + 0.75, 0, [3, 4, 5, 6, 5, 4, 3, 1, 0, 1], 0.26],
];

/** The words YOU mouth during the voice part (narration in-world). */
export const TALK_WORDS = WORDS.filter((w) => w.start >= EV.voice1 - 0.4 && w.start < EV.deeperEnd);
