# Wave brief · porting the remaining assets (2026-10-26, user-approved scheme)

You port 2–4 already-drawn pixel assets from the channel's films into catalog-v1. The art is already good: TRANSFER
it into the catalog contract, do not redraw or improve it.

Working folder: /Users/rv/Desktop/Motion Studio/work/pixel-lab/catalog-v1 (absolute paths; `cd "<folder>" && node …`).
Many agents work in this folder at the same time: touch only your own `items/<kind>.mjs`, your sheets and NEW lib
files you create (name them after their source, e.g. `lib/deadliest-lion.mjs`). Never modify existing lib files —
reuse them as they are, or copy to a new file.

1. Read `items/README.md` (interface, hard rules, no-one-frame-change rule, house style, backdrop section) and follow
   it. Read ONE example close to your item: props → `items/arrow.mjs` or `items/ball.mjs`; cute front-facing animals of
   the animals-heart family → `items/mouse.mjs` + `items/lib/cute-family.mjs` (adapter: a new animal = short config);
   other characters → `items/mosquito.mjs` or `items/shark.mjs`; backdrops → `items/backyard.mjs` or `items/forest.mjs`.
2. Your context pack per item is `packs/<kind>.md`: the source function and everything it uses from its file, with
   line numbers and the file's imports. Start from it; open the original file only for a dependency it imports.
3. Economy: keep the film drawing, map what it already does to 2–6 states (props), no new parts; targeted reads only;
   iterate with `node tools/sheet.mjs --small <kind>`; at most 3 sheet views per item; ≈ 15–25 tool calls per item.
   Tiny remaining flags (≤ 60 novel px) may stay with a one-line note in `notes`.
4. `covers`: the registry name(s) given in your task. Text only from `s.label`, digits only from `s.value`. No logos,
   brands or game IP (if the source shows any, remove it; if it cannot be removed, skip the item and say why).
5. Done = `jumps 0 pops 0 pure true footprint ok` (backdrops: `jumps 0 pops 0 pure true`, ≤ 40 ms/frame) or a flag
   explained in `notes`; the footprint hw/hh must match what you draw at size m.
6. Append a short section per item to `batches/W.md` (append only, never rewrite others): kind, source, lib files,
   states, final check line, visible issues. Reply with a 2-line summary incl. your tool-call count.

Rules: copy, never edit film folders / trial-10s / renderer; never import from film folders; do not read
work/pixel-lab/ant-zombie; no video, TTS, paid APIs, commits or subagents; do not change shared files (contract.mjs,
engine/, tools/, items/index.mjs, existing items/lib files, README/BRIEF files).
