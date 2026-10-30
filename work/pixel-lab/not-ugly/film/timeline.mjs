// «You're not ugly» timeline: every beat is anchored to measured words of the single voice take (voice/words.json,
// retimed on Scribe). W() matches words without punctuation ("30%" → "30"). Not a loop.
//
// ONE side-view bedroom at night (warm lamp, window with the night city). YOU = the recurring hero (purple bobble hat,
// light-blue striped pyjamas, yellow slippers; cat-zoomies/film/person.mjs) stands left of centre. YOUR FRIEND = the
// channel's own character (sprite sheet) stands to the right, "one and a half metres" away. Above them floats the VIEW:
// a big screen-space viewfinder panel that shows what a camera (or your ear) gets — your face up close (wide-angle
// distortion), from 1.5 m, mirrored vs real, an X-ray of your head with the two sound paths, a recording, a blind test.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = words[words.length - 1].end;
export const END = Math.ceil((VOICE_END + 1.6) * FPS) / FPS;

// ---------------------------------------------------------------- world layout (grid px, y grows down, z = 1)
// screen = (270 + (x − cx), 480 + (y − cy)); the camera rests at cx 0, cy −160, so the floor y = 0 is at screen y 640.
export const WORLD_W = 1080;
export const LAND = 0;                        // the floor (feet)
export const YOU_X = -120;                    // you: feet at (YOU_X, LAND), facing right (toward the friend) at rest
export const PHONE_NEAR = { x: YOU_X + 49, y: LAND - 187 };   // the selfie phone at arm's length ("30 cm") — where the hero's hand really reaches
export const FRIEND_X = 150;                  // the channel's character, "1.5 m" away, faces left (mirrored sprite)
export const MIRROR = { x: -235, y0: LAND - 250, y1: LAND - 8 };   // a tall standing mirror left of you (you turn left to it)
export const VIEW = { x: 70, y: 96, w: 400, h: 300 };           // screen rect of the viewfinder panel (builder B)
export const REST = { cx: 0, cy: -160 };
export const TOD_KEYS = [[-2000, 6.4], [2000, 6.4]];           // night outside the window
export const SEA_RANGES = [];
export const DISC = { x: 470, y: 150 };                        // the moon (only visible through the window if the room shows it)

// ---------------------------------------------------------------- events (seconds), by narration
export const EV = {
  // "You're not ugly. Your phone is lying to you."
  youre: W("you're"), ugly: W("ugly"), phone: W("phone"), lying: W("lying"), you1End: W("you", 1, "end"),
  // "A selfie is taken about 30 centimetres from your face."
  selfie: W("selfie"), taken: W("taken"), n30cm: W("30"), centimetres: W("centimetres"), face1: W("face"),
  // "That close, the camera makes your nose look about 30% wider than from one and a half metres away."
  thatClose: W("that"), camera: W("camera"), nose: W("nose"), n30pct: W("30", 2), wider: W("wider"), than: W("than"), half: W("half"), metres: W("metres"), away: W("away"),
  // "Nobody else sees you from that close."
  nobody: W("nobody"), sees: W("sees"), close2: W("close", 2), close2End: W("close", 2, "end"),
  // "Photos also feel wrong because they aren't flipped."
  photos: W("photos"), wrong: W("wrong"), arent: W("aren't"), flipped: W("flipped"),
  // "You see your face in the mirror every day, so you like the mirror version."
  see: W("see"), face2: W("face", 2), mirror1: W("mirror"), every: W("every"), like: W("like"), mirror2: W("mirror", 2), version: W("version"),
  // "In a 1977 study, people chose their mirror photo, and their friends chose the real one."
  y1977: W("1977"), study: W("study"), people1: W("people"), chose1: W("chose"), mirror3: W("mirror", 3), photo: W("photo"), friends: W("friends"), chose2: W("chose", 2), real: W("real"), realEnd: W("one", 2, "end"),
  // "And your voice? When you talk, you hear it through the air and through the bones of your head."
  voice1: W("voice"), when: W("when"), talk: W("talk"), hear: W("hear"), air1: W("air"), through2: W("through", 2), bones1: W("bones"), head1: W("head"),
  // "Bones carry the low sounds, so in your head your voice is deeper."
  bones2: W("bones", 2), carry: W("carry"), low: W("low"), sounds: W("sounds"), head2: W("head", 2), deeper: W("deeper"), deeperEnd: W("deeper", 1, "end"),
  // "A recording only catches the air."
  recording: W("recording"), only: W("only"), catches: W("catches"), air2: W("air", 2), air2End: W("air", 2, "end"),
  // "But in one test, people rated voices without knowing theirs was among them."
  but: W("but"), test: W("test"), rated: W("rated"), voices: W("voices"), without: W("without"), theirs: W("theirs"), among: W("among"),
  // "They gave their own voice higher scores than other people did."
  gave: W("gave"), own: W("own"), higher: W("higher"), scores: W("scores"), other: W("other"), did: W("did"), didEnd: W("did", 1, "end"),
  // "So it's not your face. It's the distance, the mirror and your skull."
  so3: W("so", 3), face3: W("face", 3), distance: W("distance"), mirror4: W("mirror", 4), skull: W("skull"), skullEnd: W("skull", 1, "end"),
  // call to action: "Liked this video? Send it to a friend, and follow so you don't miss the next one."
  liked: W("liked"), video: W("video"), send: W("send"), friend: W("friend"), follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- the VIEW (viewfinder) modes, one at a time, crossfaded
// The panel itself is persistent from VIEW_IN to VIEW_OUT; its content crossfades between modes (≥ 0.3 s dissolves).
export const VIEW_IN = 0.04, VIEW_OUT = EV.liked - 0.25;           // open from the first frame: the big face is the hook
export const MODE = {
  hook: [VIEW_IN, EV.selfie - 0.1],              // your face, normal, a little sad; "lying" → the phone UI frame glitches
  selfie: [EV.selfie - 0.1, EV.nobody - 0.1],     // the camera comes close: wide-angle bulge, NOSE +30% calipers; on "one and a half metres" the
                                                  // view backs off to 1.5 m (the friend's spot): face normal, NOSE −30% → normal
  nobody: [EV.nobody - 0.1, EV.photos - 0.15],    // "Nobody else sees you from that close": the 1.5 m face smiles; distance tag "1.5 M"
  flip: [EV.photos - 0.15, EV.y1977 - 0.15],      // photo vs mirror: the face flips (card-turn squash, never a one-frame swap); part, mole, hat pompom swap sides
  study: [EV.y1977 - 0.15, EV.voice1 - 0.2],      // 1977 study: MIRROR | REAL side by side; YOU ♥ → MIRROR, FRIENDS ♥ → REAL
  xray: [EV.voice1 - 0.2, EV.recording - 0.15],   // your head in X-ray side profile: AIR path (cyan rings from the mouth to the ear) and BONE path
                                                  // (orange, through the skull to the inner ear); "low sounds" → bass rings swell; "deeper" → pitch meter drops
  record: [EV.recording - 0.15, EV.but - 0.15],   // a recording: the waveform without the bone part — thinner, higher; REC dot
  test: [EV.but - 0.15, EV.so3 - 0.15],           // blind test: 8 voice cards "?", stars; "theirs" → one card is YOURS; "own … higher" → YOU ★★★★☆ vs OTHERS ★★★☆☆
  happy: [EV.so3 - 0.15, VIEW_OUT],               // your face, normal, smiling, blush; the three causes tag around it (lead's overlay)
};

// ---------------------------------------------------------------- the people in the room
// YOU: selfie arm up with the phone [EV.selfie − 0.3 → EV.away]; the phone drifts out of your hand to the friend's spot on
// "one and a half metres" (it floats like a game item); you turn left to the mirror on "mirror" (EV.mirror1) and back on
// "study"; you talk/hum during the voice part (mouth moves with the narration, sound rings drawn in-world too); a happy
// little hop on "skull".
export const SELFIE_ARM = [EV.selfie - 0.35, EV.away + 0.2];
export const PHONE_FLY = [EV.than - 0.05, EV.metres + 0.15];     // the phone glides from 30 cm to the friend's hands (1.5 m)
export const TURN_TO_MIRROR = [EV.mirror1 - 0.25, EV.mirror1 + 0.2];
export const TURN_BACK = [EV.study - 0.3, EV.study + 0.1];
export const HOP = [EV.skull + 0.05, EV.skull + 0.5];

// ---------------------------------------------------------------- camera: nearly static (tiny drifts only)
const K = (t, cx, cy) => ({ t, cx, cy });
export const CAM = [K(0, 20, -160), K(EV.selfie, 0, -160), K(EV.voice1, 0, -160), K(EV.recording, -10, -160), K(EV.so3, 0, -160), K(END + 10, 0, -160)];
