// «Why do dogs spin before lying down?» timeline: every scene, camera key and event is anchored to a measured word of the
// single take. Loop film: «…round and round, and round…» runs into «Why does your dog spin in circles…»; the dog keeps
// spinning across the seam. END makes the seam pause ≈ a sentence pause.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) time of the n-th occurrence of a spoken word, e.g. W("circles", 2) or W("round", 3, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// the last «round» trails off: audible to 55.49 s at −35 dBFS, a breath to 55.72 at −44; first onset 0.10 s → pause ≈ 0.35–0.58 s
export const END = 1679 / FPS; // 55.967 s

export const EV = {
  why: W("why"), spin: W("spin"), circles1: W("circles", 1), lies: W("lies"), down1: W("down", 1),
  lost: W("lost"), making1: W("making", 1), bed1: W("bed", 1),
  long: W("long"), sofas: W("sofas"), wild: W("wild"), relatives: W("relatives"), slept: W("slept"), outside: W("outside"),
  wolves: W("wolves"), walk: W("walk"), circles2: W("circles", 2), press: W("press"), tall: W("tall"), grass: W("grass"), snow: W("snow"), flat1: W("flat", 1), nest: W("nest"),
  yourDog: W("your", 2), runs: W("runs"), old: W("old"), plan: W("plan"), even1: W("even", 1), soft: W("soft"), pillow: W("pillow"),
  scientist: W("scientist"), stanley: W("stanley"), coren: W("coren"), tested1: W("tested", 1), sixtyTwo: W("sixty-two"), dogs: W("dogs"),
  smooth: W("smooth"), mat: W("mat"), only: W("only"), one1: W("one", 1), five: W("five"), turned: W("turned"), around: W("around"), lying: W("lying"),
  lumpy: W("lumpy"), shaggy: W("shaggy"), rug: W("rug"), more1: W("more", 1), half: W("half"), did: W("did"), some1: W("some", 1), dug: W("dug"), first: W("first"),
  bumps: W("bumps"), more2: W("more", 2), circles3: W("circles", 3),
  then: W("then"), circle: W("circle"), ends: W("ends"), curl: W("curl"), nose: W("nose"), tucked: W("tucked"), tail: W("tail"), face: W("face"),
  keeps: W("keeps"), heat: W("heat"), cold: W("cold"), night: W("night"),
  experts: W("experts"), circling: W("circling"), check: W("check"), danger: W("danger"), but: W("but"), tested2: W("tested", 2), yet: W("yet"),
  warning: W("warning"), circles4: W("circles", 4), lot: W("lot"), settle: W("settle"), ask: W("ask"), vet: W("vet"), pain: W("pain"),
  otherwise: W("otherwise"), making2: W("making", 2), bed2: W("bed", 2), round1: W("round", 1), round2: W("round", 2), round3: W("round", 3),
};

export const SC = {
  hook: [0, EV.long - 0.3],
  wild: [EV.long - 0.3, EV.yourDog - 0.3],
  pillow: [EV.yourDog - 0.3, EV.scientist - 0.3],
  study: [EV.scientist - 0.3, EV.then - 0.3],
  curl: [EV.then - 0.3, EV.experts - 0.3],
  danger: [EV.experts - 0.3, EV.warning - 0.3],
  vet: [EV.warning - 0.3, EV.otherwise - 0.2],
  loop: [EV.otherwise - 0.2, END],
};
