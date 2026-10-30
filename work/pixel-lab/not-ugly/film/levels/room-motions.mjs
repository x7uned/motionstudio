// «You're not ugly» — Builder ROOM's motion cues for synth (cues.mjs loads every levels/*-motions.mjs). Computed from the
// same beat sheet as the picture (room-times.mjs), so every sound lasts exactly as long as its motion. Deliberately silent:
// the talk rings and bone pulses (the VIEW's X-ray carries those sounds), the small happy hearts (the lead's three tags
// sound on the same words), the waves at the end (the share/follow card sounds there), soft dissolves.
import { EV } from "../timeline.mjs";
import { T, FRIEND_POSES } from "./room-times.mjs";

const pose = (row, after = 0) => FRIEND_POSES.find((p) => p[1] === row && p[0] >= after)?.[0];
const m = (t0, t1, kind, note) => ({ t0, t1, kind, level: "room", note });

export const MOTIONS = [
  m(T.selfieUp[0], T.selfieUp[1], "swish", "you raise the phone to arm's length"),
  m(T.lineIn[0], T.lineIn[1], "draw", "dotted line grows from your face to the phone"),
  m(T.tag30, T.tag30 + 0.22, "tag", "30 CM tag pops"),
  m(T.fly[0], T.fly[1], "float", "the phone floats like a game item to the friend's hands"),
  m(T.tag15 - 0.15, T.tag15 + 0.25, "tag", "tag turns into 1.5 M"),
  m(T.selfieDown[0], T.selfieDown[1], "swish", "your empty hand comes down"),
  m(pose(9, EV.nobody - 1), pose(9, EV.nobody - 1) + 0.3, "pose", "the friend nods happily"),
  m(T.turnTo[0], T.turnTo[1], "turn", "you turn to the mirror"),
  m(T.heartMirror, T.heartMirror + 0.36, "heart", "a heart between you and your reflection"),
  m(T.turnBack[0], T.turnBack[1], "turn", "you turn back to the friend"),
  m(pose(4), pose(4) + 0.3, "pose", "the friend points at you"),
  m(T.heartFriend, T.heartFriend + 0.12, "pop", "a heart from the friend to you"),
  m(T.rec[0], T.rec[0] + 0.12, "on", "red REC light on the friend's phone"),
  m(T.cringe[0], T.cringe[0] + 0.3, "uhoh", "you wince at your recorded voice"),
  m(T.yay[0], T.yay[0] + 0.25, "grin", "a little fist: your own voice scored higher"),
  m(T.hop[0], T.hop[1], "boing", "a happy hop on skull"),
  m(T.hop[1], T.hop[1] + 0.06, "step", "landing from the hop"),
  m(T.pocket[0], T.pocket[1], "swish", "the friend slips the phone into his pocket"),
  m(EV.next + 0.05, EV.next + 0.15, "dab", "the friend winks"),
];
