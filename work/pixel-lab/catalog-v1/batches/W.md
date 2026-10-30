
## park (backdrop, WS1)
- Source: dogs/kit/park.mjs#back,front; lib: dogs-park.mjs (back/front), dogs-park-{px,geo,lawn,sky,flora,props,layout}.mjs (copies, import paths only; layout LAYOUT re-laid: oak x 300, bench -300, lamp -215).
- Adapter in items/park.mjs: catalog camera -> park camera (lawn line stage y 570 at every zoom). Squirrel not drawn.
- States: none (backdrop). Check: `park (backdrop): jumps 0 pops 0 pure true 31.3 ms/frame`.
- Visible issues: oak trunk out of frame at wide (crown only); 31 ms/frame is close to the 40 ms limit.

## savanna (backdrop, WS1)
- Source: cat-zoomies/film/dream.mjs#drawDream; lib: zoomies-savanna.mjs (no mound, dirt patch, stones, mouse, bubble; grass meadow everywhere; world offset layer).
- Golden dusk (light 0) kept. Check: `savanna (backdrop): jumps 0 pops 0 pure true 17.9 ms/frame`.
- Visible issues: very dark meadow below the line (film look), dark props read weakly on it; banded look at close-up zoom; no foreground front().

## sky (backdrop) · WS2
Source aura-full/film/world.mjs#drawSky,drawSunMoon,drawClouds,drawCloudSea; lib/aura-sky.mjs. Day gradient, sun upper right, drifting mid clouds, cloud sea from y ~575 down. Check: `jumps 0 pops 0 pure true 42 ms/frame` (sheet tool; isolated profile ~23 ms; cloud sea paints near rows first with a done-mask). Visible issues: marginally above the 40 ms budget in the sheet measurement; night/moon not exposed.

## city-skyline (backdrop) · WS2
Source animals-speed/film/levels/city-sky.mjs#drawFar (FAR, paintFar); lib/speed-skyline.mjs. Dawn mauve towers, sparse windows, pulsing spire beacons, added dawn sky gradient and dark rooftop band below base y 580. Check: `jumps 0 pops 0 pure true 18.7 ms/frame`. Issues: close-ups enlarge 1x pixels; dawn palette only.

## cloud (prop) · WS2
Source aura-full/film/world.mjs#drawClouds (blob cloud, ramp); no lib (inline). States drift, puff, rain (storm-grey crossfade + dithered rain streaks), fade. covers ["cloud"]. Check: `jumps 0 pops 0 pure true footprint ok (108x76)`. Issues: dark outline hard to see on dark backdrops.

## pond + cave (WS4)
- **pond** (backdrop, covers pond): source animals-wingbeat/film/levels/pond.mjs#back; lib/wingbeat-pond.mjs + lib/wingbeat-pond-kit.mjs (pond-kit painters, cosmos). Far waterline y 560, strip x −60..600, water to y 1000, front stones/reeds on the bottom edge, daylight sky + clouds + slow sun glitter. Check: `pond (backdrop): jumps 0 pops 0 pure true` ~26 ms/frame. Not ported: frog, damselfly, ripples, grade. Issues: bottom water shows film row banding.
- **cave** (backdrop, covers cave): source animals-speed/film/levels/cave.mjs#back; lib/speed-cave.mjs. Ground y 560, hill + cave mouth, crystals, savanna grass, wall + lamp, blinking eyes, new star/moon night sky. Check: `cave (backdrop): jumps 0 pops 0 pure true` ~22 ms/frame. Not ported: bat, viaduct/city, grade. Issues: cave mouth too dark to hold a prop; rock pillar at the right edge.
# Catalog v1 · batch W (agent WH1, 2026-10-26)

Three effect props ported (covers: music-note, sparkle, bubble). Each particle is a deterministic loop with its own
dissolve in and out (Bayer `fade`), and each count/strength change is an eased weight, so nothing appears or vanishes in
one frame. Checks are the last `node tools/sheet.mjs --small <kind>` run.

## 1. music-note (prop, effect)
- Source: `mosquito-buzz/film/fx.mjs#note` (+ `render.mjs` bob, y − 3·sin(5t)).
- Lib: `lib/mosquito-buzz-note.mjs` (the note function only; fade from raster.mjs; colours inlined from the film palette).
- Look: up to four eighth notes born in the slot, drifting up and sideways, dissolving at the top.
- States: quiet (one note bobs), play (three notes float up), many (four, faster), fade (count to 0, notes dissolve out).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 37×63, measured 37×63)`. Draw 22 ms/frame harness, incl. overhead.
- Visible issues: the note is a ×2 block of the film's pixels and does not grow with the camera zoom (fixed size, so
  no size steps during a zoom); at z 1.85 it reads small. Notes share one colour (the film's yellow).

## 2. sparkle (prop, effect)
- Source: `deadliest/film/levels/desert-kit.mjs#sparkle` (+ village spell ring, desert poke).
- Lib: `lib/deadliest-desert-sparkle.mjs` (the star function only; fade from raster.mjs; R inlined).
- Look: seven four-point yellow sparkles on their own angles and radii, each twinkling on its own phase.
- States: faint (three glints at half strength), twinkle (six, in turn), burst (seven, pushed out 1.9× and flaring),
  fade (strength to 0, glints dissolve).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 57×52, measured 57×52)`. Draw 17 ms/frame harness, incl. overhead.
- Visible issues: the faint state is very light (half strength) and may be lost on a busy backdrop. A star's ray length
  is an integer, so it steps one pixel per ray at its size changes, which the checker does not flag.

## 3. bubble (prop, effect)
- Source: `deadliest/film/levels/river-kit.mjs#bubble` (+ river.mjs rising string).
- Lib: `lib/deadliest-river-bubble.mjs` (the ring function only; fade from raster.mjs; R inlined).
- Look: up to eight pale rings rising from the slot with a small sway; the film's dotted ring and highlight, at ×2.2 size.
- States: few (three bubbles), stream (eight, faster), pop (bubbles swell and burst at the top; the pop line glides
  down as `pop` eases 0 → 1), stop (count to 0, rising bubbles dissolve out).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 22×76, measured 22×76)`. Draw 19 ms/frame harness, incl. overhead.
- Visible issues: at pop the bubbles swell by 45% before they dissolve (the film has no pop, so this is new drawing);
  stop dissolves the whole column at once rather than letting each bubble rise out.

Files: items/music-note.mjs, items/sparkle.mjs, items/bubble.mjs; items/lib/mosquito-buzz-note.mjs,
items/lib/deadliest-desert-sparkle.mjs, items/lib/deadliest-river-bubble.mjs; sheets/{music-note,sparkle,bubble}.{png,json}.

## desert (backdrop, agent WS3)

- Source: `deadliest/film/levels/desert.mjs#back/front` (scenery only; scorpion, ruler, "LV 5" sign, film timing dropped).
- Lib: `items/lib/deadliest-desert.mjs` (build, strip widened to world 2100..2760), `items/lib/deadliest-desert-kit.mjs`
  (Layer, ripple sand ground made one plain sand, shrub, pebble).
- Look: rose mesa + butte, soft far dunes with oasis, golden mid dunes, hoodoo at the left edge, boulders at the right
  edge, ripple sand floor, drifting sand grains in front; new 6-band rose-to-gold sky; sand line y 560.
- Check: `jumps 1 pops 0 pure true` (≈ 38 ms/frame). The one jump (t 5.567, novel 336 vs threshold 120) is the sheet's
  slow camera push-in re-rasterising the 1-px sand ripple lines of the lower half in one frame (nearest-neighbour scale
  of the cached layer); not a visible pop of an object. Left as is.
- Visible: centre x 100–380 is open dunes/sand (calm); close-ups enlarge ripple pixels.

## jungle (backdrop, agent WS3)

- Source: `animals-speed/film/levels/jungle.mjs#back/front` (scenery only; sloth, snail, moth and the sloth's hanging leaf twig dropped).
- Lib: `items/lib/speed-jungle.mjs` (paintBack/paintFront, lianas, morpho, shafts; layer 620×1020, floor extended and the
  film's garden-lawn/hedge seams removed), `items/lib/speed-jungle-kit.mjs` (Layer, leaf, fern, thick, pline).
- Look: far canopy skyline, trunks with vines at both edges, mossy branch across the top (y 185), hanging canopy, undergrowth with
  heliconia/orchids at the ground line y 580, mossy floor with sunflecks, litter, roots, log + rocks low (y 800–850), front
  leaves/ferns at the corners; ambient light shafts, two swaying lianas, a blue butterfly; new green-teal sky.
- Check: `jumps 0 pops 0 pure true` (≈ 40 ms/frame measured alone, 43–48 under shared load, so borderline).
- Visible: the middle is busier than other backdrops (undergrowth with red flowers); the sky is a flat band gradient.

## squirrel (prop, character) · agent WH5
- Source: dogs/kit/park-squirrel.mjs#drawSquirrel (+ state rig, RUST/CREAM/NUT/CAP/EYE); pack packs/squirrel.md.
- Lib: items/lib/dogs-squirrel.mjs (copy: cute kit from items/lib/cute.mjs, park-geo cyc/phase inlined, eye aim hook o.aimX/aimY).
- States: sit (initial, acorn held, tail sways) · nibble (chew bouts) · alert (ears up, blip) · drop (acorn dissolves, empty paws).
  The rig's tail flick and blink stay time-driven. Eyes aim at s.look, blended by s.lookK; faces the frame centre by slot.
- Check: jumps 0 · pops 0 · pure true · footprint ok (66×74 measured = declared). 16–20 ms/frame.
- Visible issues: none that matter at 1×. Sit and nibble look close at 1× (the chew is a small bob).

## dog-bed (prop) · agent WH5
- Source: dogs/kit/nest-bed.mjs#bedBack,bedFront (+ dogs/kit/nest-hf.mjs engine); pack packs/dog-bed.md. Back and front in one item.
- Lib: items/lib/dogs-nest-bed.mjs and items/lib/dogs-nest-hf.mjs (copies; import paths only).
- States: empty (initial) · dent (press 1, a hollow sinks, fold) · turn (hollow slides to one side, swish) · spring (back to flat, swell).
- Not offered: plump and glow. The film rig has only a pressed-in hollow (press, dent); a puffed cushion or a glow needs new geometry.
- Check: jumps 0 · pops 0 · pure true · footprint ok (67×34 measured = declared). 16–19 ms/frame.
- Visible issues: the dent is subtle at 1× (about 9 px deep at z 1); it reads in the close-up. The memo re-renders the heightfield on each frame while a state moves.

## ruler (diagram prop) · agent WH5
- Source: not-ugly/film/levels/room-props.mjs#dimLine,pill; pack packs/ruler.md.
- Lib: items/lib/notugly-ruler.mjs (pill unchanged; dimLine fixed: both end ticks travel with the drawn line, so none pops in).
- States: start (initial: start tick + label pill) · grow (line draws out, linear, swish) · measure (far end reaches s.look blended by s.lookK, scan) · done (settles back, ding).
- Text: s.value + s.unit when a number is spoken, else s.label. value/valueOptional flags so numbers pass the plan without dropping the other keys; an unlabelled ruler is dropped by the plan (no value, no label).
- Check: jumps 0 · pops 0 · pure true · footprint OFF in the sheet, by design: the measure state reaches the demo target about 185 px away (measured 197×193). At rest the footprint is 60×18 (declared). 16–20 ms/frame.

## WS5 · underwater (backdrop, covers underwater)
- Source: animals/film/levels/sea.mjs#back (+ sea-common, sea-life plants, sea-terrain sand/reef/corals). Lib: items/lib/sea-kit.mjs. Item: items/underwater.mjs.
- Re-laid out: sand floor at stage y ≈ 565, rock mounds with corals at both edges, kelp/grass/tube worms/anemone at the sides, open calm middle; banded dithered water, swaying light shafts, caustics on the sand. Baby sponge face and all characters omitted.
- Check: `underwater (backdrop): jumps 0 pops 0 pure true 26.3 ms/frame`.
- Issues: rock mounds are fairly plain at wide shot (detail small); plants are drawn per frame into a world layer, so they scale with the camera as pixels (nearest).

## WS5 · snow (backdrop, covers snow)
- Source: animals-heart/film/levels/snow.mjs#back (ground, rock, pine, mountains, hills, snowfall). Lib: items/lib/snow-kit.mjs (uses sea-kit makeCache). Item: items/snow.mjs.
- Re-laid out: pastel dawn sky, pink/lavender mountains low in the middle and tall at the sides, tiny pines on hills, big snow pines at the edges, snow top at y 565, frozen soil/clay/granite to the bottom edge, falling snow that dissolves before the ground. Groundhog, burrow, shore, thermometer omitted.
- Check: `snow (backdrop): jumps 0 pops 0 pure true 29.6 ms/frame`.
- Issues: sky is a new ramp (film sky lives in its world renderer); no sun disc.
# Batch W (2026-10-26) · agent WH4 · items: snake, skull, spider-web

## snake
- Kind: `snake` · covers `snake` · prop (cute green cobra, coil, neck, hood, hiss)
- Source: deadliest/film/levels/jungle-snake.mjs#drawSnake (+ snakePose and JT timing turned into state parameters)
- Lib: `items/lib/deadliest-snake.mjs` (copy: GREEN/HOODR/BELLY, coil raster, tail, neck, shade, snakeEye, drawHead, drawSnake; scale S = 0.7·z; coil cached per S to 1 %)
- States: coil (start) · raise · hood · hiss (fangs, angry brows, tongue flicks as an integrated phase) · look (eyes to the target by lookK) · relax (happy blink and smile)
- Final check: `jumps 0 pops 0 pure true footprint ok` (declared 90×150, measured 89×151), 22 ms/frame
- Visible issues: at RISE 0.6 the raised head makes the item about 200 px tall (the film stands 290 units); eye, mouth and tongue loops are film-pixel loops placed through the scale (crisp at z 1, may leave dots at z ≥ 2); tongue keeps its 3-px film width; no separate strike lunge (hiss covers it).

## skull
- Kind: `skull` · covers `skull` · prop (cute 9×8 pixel skull)
- Source: deadliest/film/levels/meter.mjs#skull
- Lib: `items/lib/deadliest-skull.mjs` (copy of the rows and colours; each skull pixel a 12 px block at z 1; float block edges with single-owner rows and Bayer dithered edges, so there are no seam dots and no whole-row jumps)
- States: grin (start) · glow (eyes mix toward the film's pink) · chatter (jaw drops up to 0.3 block at 2.4 Hz, eased in and out)
- Final check: `jumps 0 pops 0 pure true footprint ok` (declared 54×48, measured 54×52), ~16 ms/frame
- Visible issues: chatter is new (the film's skull is still): a sinusoid at 0.4 block and 3.2 Hz made the checker flag two turnaround frames, so the amplitude and rate were lowered; the close-up at z 1.85 shows the dithered edges only on the jaw.

## spider-web
- Kind: `spider-web` · covers `spider-web` · prop (corner web: six spokes, six sagging rings, two violets)
- Source: trial-10s/engine/night.mjs#drawWeb (copied, trial folder not imported)
- Lib: `items/lib/trial10s-web.mjs` (copy of drawWeb with a plain screen mapping at scale S = 0.8·z; sway, shake jitter, ring sag and glint as parameters; mixHex helper)
- States: sway (start, the film's breeze) · still · shake (jitter, integrated phase) · sag (rings sag 1.6× more) · glint (both violets mixed toward silver)
- Final check: `jumps 0 pops 0 pure true footprint ok` (declared 52×52, measured 50×50), ~15 ms/frame
- Visible issues: the film has no dew or droplets, so the brief's dew state became a silver glint of the same lines (no new parts); the glint is strong at 0.8 mix, lower it in `lib/trial10s-web.mjs` (k) if it reads too bright; lines are the film's 1-px lines.
## thermometer (prop, valueOptional)
- Source: `cat-boxes/film/props-ui.mjs#thermometer` (+ card, RED, WARM, COOL; pack `packs/thermometer.md`).
- Lib: `lib/cat-boxes-thermometer.mjs` (film code on a half-size grid, 82 × 150), `lib/raster-buffer.mjs` (new: offscreen
  grid + nearest-neighbour blit through c.px, so the dissolve still applies), `lib/zoomies-hud.mjs` (otext, for the spoken value only).
- States: show (mercury at room level), rise (0.92, bulb warms), hot (0.97, bulb glow), cold (mercury sinks, turns blue), drop (0.42).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 62×116, measured 62×116)`, ≈ 25 ms/frame incl. harness.
- Visible issues: the tick numbers and the texts °C, CATS, 30-38°C, ROOM, 21°C are removed (text rule); UNITS has no
  degree sign, so no unit is drawn; the spoken value sits top right. The first red → blue version used a per-pixel Bayer
  mix and jumped twice (3.9 s, 5.6 s); the blue now rises from the bulb as a wipe with a two-row dithered edge. The 1.5×
  nearest blit makes 1-px ticks slightly uneven at close-up.

## water-drop (prop)
- Source: `dog/film/props.mjs#droplet` (+ WATER; pack `packs/water-drop.md`).
- Lib: `lib/dog-droplet.mjs` (droplet with its IV glint, plus `gateG`, a Bayer-gated view for dissolves).
- States: hang (bobs), fall (eased, quadratic drop, stretches), splash (drop dissolves, six arcs of small droplets spread and
  dissolve, a few stay on the floor), shine (white glint).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 22×25, measured 22×24)`.
- Visible issues: the splash is a stylised set of six fixed arcs, not a fluid simulation. Its settled pose keeps a sparse
  set of droplets (otherwise the state would be empty).

## cup (prop)
- Source: `cat-zoomies/film/person.mjs#drawGlass` (+ segD, sline; pack `packs/cup.md`).
- Lib: `lib/cat-zoomies-glass.mjs` (film code; two optional parameters added: `wob` surface ripple amplitude and `ph` phase).
- States: full (0.88 water), tilt (rotates 0.5 rad, slosh), sip (level drops to 0.25), ripple (surface wobbles per column).
- Check: `jumps 0 pops 0 pure true footprint ok (declared 41×47, measured 41×47)`.
- Visible issues: the water line stays horizontal when the glass tilts (as in the film), so a tilted glass reads as spilled
  rather than poured. The footprint covers the tilted corners.

## WS8 · village (backdrop)
- Source deadliest/film/levels/village.mjs#back/front; lib/deadliest-village.mjs (reuses deadliest-desert-kit, cute). Dusk village entrance: adobe gate, lilac + peach cottages, well, far rooftops/trees, banana leaves, string lights, lantern, chimney smoke, fireflies; plum-to-peach sky added (film sky is global).
- Check: jumps 0 pops 0 pure true, 26 ms/frame. Issues: ground is the catalog desert-kit golden sand (the film's dirt-road seam was removed in that copy), not packed dirt; dog, LV 6 sign, lantern moth not ported.

## WS8 · night-sky (backdrop)
- Source zombie-mouse/film/clearing.mjs#drawClearing; lib/zombiemouse-clearing.mjs + zombiemouse-{layout,W-util,W-trees,clearing-tex,places}.mjs. Starry sky with Milky Way, moon, moonlit spruce layers, fog, mossy clearing, moonbeams. Campfire, log, ring, firewood, grass strip removed (calm).
- Check: jumps 0 pops 0 pure true, ≈ 40 ms/frame (at the limit; floor computed only where no object covers it). Issues: dark overall (ground lifted slightly); moon is fixed in screen space (sky at infinity); first build ≈ 0.7 s.

## beach (backdrop) · WS6
Source animals-weight/film/levels/shore.mjs#back (+ ocean-sea.mjs helpers); lib/weight-shore.mjs, lib/ws6-common.mjs (new). Daylight sea with light shafts, foam swash, wet to dry sand, shells, driftwood, dune + flowering meadow at the right, hazy far shore, clouds. Re-laid: waterline stage x ~98, flat sand y 570 across slots, sand/dune/meadow moved 120 px right, starfish/driftwood moved; film balance/bees/whale not drawn. Check: `beach (backdrop): jumps 0 pops 0 pure true 31.9 ms/frame`. Visible issues: close-ups enlarge 1x pixels; sea is only a ~100 px cutaway strip at the left; dithered seabed/land seam visible in close-left; meadow edge is blocky at zoom; 32 ms/frame is near the 40 ms limit.

## farm (backdrop) · WS6
Source animals-heart/film/levels/barn.mjs#back,front; lib/heart-barn.mjs, lib/ws6-common.mjs. Red barn (doorway with hay, loft door) at the right edge, hay bales + sacks + rail fence left, flowering lawn with dirt track down to the frame bottom, hills, far mountains, clouds, foreground grass tufts via front(). Re-laid: barn +80 px right (clipped by the right edge at wide), hay/fence to the left, mountains later, rocks/lantern/mouse not drawn. Check: `farm (backdrop): jumps 0 pops 0 pure true 30 ms/frame`. Visible issues: close-ups enlarge 1x pixels; hay bales read as a long low band behind the fence line; bright palette, white props need outlines.

## WS7 · mountains (backdrop)
- Source: `animals-heart/film/levels/gorge.mjs#back` (static BACK/FRONT layers, per-frame waterfall).
- Lib: `lib/animals-gorge.mjs` (build, wall, tubeCluster, olive, streamX; strip widened to 3940..4740, right wall + waterfall + pool pushed 40 px right, outer wall copies, farm/sea seams removed). Item: `items/mountains.mjs` (daylight sky with two slow clouds, nearest blit through the camera, waterfall evaluated per screen pixel so it stays crisp at any zoom).
- Look: sandstone walls with ledges/shrubs/red tube flowers at both sides, snow-tipped blue peaks in the gap, green valley floor (line y 565), a winding stream, waterfall into a pool with foam and mist.
- Check: `jumps 0 pops 0 pure true`, ≈ 45 ms/frame on the loaded machine (backyard 31, forest 65 at the same time); build 140 ms once.
- Visible issues: slightly over 40 ms on this machine under load; nearest scaling makes pixel columns uneven at non-integer zoom; brown cliffs need dark-outlined props; the film's hummingbird and heart pickups are not drawn.

## WS7 · race-track (backdrop)
- Source: `animals-speed/film/levels/stadium.mjs#back` (static scenery).
- Lib: `lib/animals-stadium.mjs` (crowd/wall strips, track, hedges, verges, tower, pennants; painted once into a 620×1020 cache, scene lifted 60 px when sampled). Item: `items/race-track.mjs`.
- Look: daylight sprint stadium: crowd stand with pennants (the only motion, smooth waving), padded blue wall, floodlight tower, hedges at both edges, red track with perspective lane lines and a kerb; stand foot/track edge at y 580.
- Check: `jumps 0 pops 0 pure true`, ≈ 27 ms/frame; build 86 ms once.
- Visible issues: the crowd rows (y 392–552) are busy behind tall props; red/orange props blend into the track; sky dither is coarse at zoom. Runner, speed board (text/numbers), start/finish lines, cheering crowd and flashes are not drawn.

Files: items/mountains.mjs, items/race-track.mjs; items/lib/animals-gorge.mjs, items/lib/animals-stadium.mjs; sheets/{mountains,race-track}.{png,json}.

## scorpion (agent WH3)
- Source: deadliest/film/levels/desert-scorpion.mjs#drawScorpion (palettes, cub, along, drawScorpion; icon not copied).
- Lib: items/lib/deadliest-scorpion.mjs (import path only). Drawn natively at film scale s = 0.8 × zoom, no resampling.
- States: calm (claws out, tail low, blinks) · look (eyes turn to the target) · scuttle (walk = 1, gait phase integrated) · rise (tail raised over the head, stinger forward) · clack (claws snap shut on an accent of the open key) · worry (tail sinks, claws tucked, brows raised at the inner ends).
- Final check: jumps 0 · pops 0 · pure true · footprint ok (declared 100×120, measured 89×116) · 27 ms/frame.
- Visible issues: the worry brows are 2-px strokes at scale 1, so worry reads mainly by the sunk tail and tucked claws; look aims the eyes only when a target is present; scuttle is leg motion only (the film has no body move).

## crocodile (agent WH3)
- Source: deadliest/film/levels/swamp-croc.mjs#drawCroc (CROC/BELLY/IRIS, SC, FEET, HINGE, sprite parts, tooth).
- Lib: items/lib/deadliest-croc.mjs (copy; river-kit xf/spriteCache replaced by local versions on roofs-kit's Layer; underwater options ignored) and items/lib/deadliest-scaled.mjs (new: nearest-neighbour resample of a film-scale drawing; the film has no scale option).
- Changes in the copy: the head-angle quantum 0.03 → 0.01 rad (a 0.03 step was a visible jump of the head); the open mouth fades in from snap 0.015 instead of appearing at once.
- States: rest (closed toothy grin) · look (eyes turn to the target) · snap (jaws open on an accent, then shut) · swish (tail wag) · worry (snout sinks, eyes glance down, half-shut lids).
- Final check: jumps 0 · pops 0 · pure true · footprint ok (declared 105×62, measured 103×51) · 37 ms/frame.
- Visible issues: the worry state is the film's lid + a lowered snout (the film has no worried face); the blink uses a slower, eased curve (0.4 s) because the film's 0.2 s sine jumped; the croc is drawn on land (no water, no shadow); the resampled outlines thin out at the wide shot.

## lion (agent WH3)
- Source: deadliest/film/levels/savanna-lion.mjs#drawLion (palettes, body/mane/ears/face/tail sprites, features; icon not copied).
- Lib: items/lib/deadliest-lion.mjs (copy; ocean-kit Layer replaced by a subclass of roofs-kit's view-aware Layer with the same anchored blit API; tail, mane puff and ear keys quantised finer: 1/8, 1/4, 1/8) and items/lib/deadliest-scaled.mjs (shared resampler, see crocodile).
- States: idle (smile, mane still, tail sways) · look (head and eyes lean toward the target) · roar (mane puff, mouth open with fangs) · proud (happy arcs, deeper blush, smug grin) · worry (squint 0.45, head sinks 8 px).
- Final check: jumps 0 · pops 0 · pure true · footprint ok (declared 88×78, measured 89×79) · 31 ms/frame.
- Visible issues: the film's ears twist on one side only, so they cannot flatten back in worry; the worry state reads as a sleepy squint more than as worry; the tail sits slightly apart from the body at the right edge in the nearest-neighbour sample; the scaled outlines are thinner than the film's.

## WH6 · bee, hummingbird, dragonfly (2026-10-26, agent WH6)

### bee (covers: bee)
- Source: animals-weight/film/levels/meadow-bee.mjs#drawBee (art copied whole, unchanged), states from meadow.mjs actors/beeState.
- Lib: items/lib/animals-weight-meadow-bee.mjs (imports re-pointed), items/lib/animals-weight-meadow-kit.mjs (new copy; byte-identical with animals-wingbeat/film/levels/meadow-kit.mjs).
- States: hover (base) · look (gaze at target, lookK-blended) · load (nectar: wings amp +45 %, sinks 7 px, worried brows, sweat) · cheer (mouth open, joy).
- Final: jumps 0 · pops 0 · pure true · footprint ok (declared 79×88, measured 79×88) · 23.6 ms/frame.
- Visible: wing flap 5.2 Hz (film 562 cycles per loop strobes at 30 fps); the film's extra flap cycles while loaded are not copied, the load shows as amplitude. Fully opaque body blit needs `a: s.a` (see note below).

### hummingbird (covers: hummingbird)
- Source: animals-wingbeat/film/levels/tropic-hummingbird.mjs#drawHummingbird (kind "anna", art copied whole), states from tropic.mjs hbState.
- Lib: items/lib/animals-wingbeat-tropic-hummingbird.mjs (imports re-pointed to ./cute.mjs and ./animals-weight-meadow-kit.mjs).
- States: hover · look · bill (pulls out of the flower, whole bird backs off ≈ 22 px·z, film hbState) · hum (buzz 0.8) · smile (closed smiling eyes, tilt −0.14 rad).
- Final: jumps 0 · pops 0 · pure true · footprint ok (declared 86×76, measured 86×76) · 20.9 ms/frame.
- Visible: wing flicker at 5.6 Hz (film 44 beats/s); the blur fan stays the film's. Sheen phase 0.3 cycles/s (film 19 per loop). drawHummingbird quantises tilt to 0.02 rad (film code, no jump flagged).

### dragonfly (covers: dragonfly)
- Source: animals-wingbeat/film/levels/pond-damselfly.mjs#drawDamselfly, states from pond.mjs damselState/actors.
- Lib: items/lib/animals-wingbeat-pond-damselfly.mjs (copy, NOT the film art unchanged: every size now takes o.k, the scale, because the film draws at fixed px; at k = 1 the pixels are the film's; stripes sampled finer when k > 1).
- States: hover · look (gaze, lookK-blended) · smile (open mouth 0.3 → 0.75, the film's happy).
- Final: jumps 0 · pops 0 · pure true · footprint ok (declared 78×86, measured 78×86) · 24.2 ms/frame.
- Visible: wing stroke 5.6 Hz (film 20 beats/s); the sway keeps the film's whole-pixel rounding (1 px steps on the abdomen tip); the happy state opens the mouth only, the eyes stay open (the film does the same).

### Note for the shared engine (not changed here)
- `blitMasked` in meadow-kit writes `dst.d` directly, so a sprite blit bypasses the dissolve view `c`. The first version of bee/hummingbird jumped at the enter frame (jumps 2). Fix used: pass the presence `a: s.a` to the drawing options so the blit fades. Other items that blit cached sprites may need the same.

## desktop-computer (WS11)
Source ping/film/people.mjs#drawDesk (via lib/ping-desk.mjs); new lib/ping-computer.mjs (monitor + PC tower + short slab, no chair/desk/person). States on, off, busy, glow, lag. Check: jumps 0 pops 0 pure true footprint ok (hw 74 hh 46), ~21 ms. Issues: screen is small at wide shot; busy bars are abstract (no text).

## server-rack (WS11)
Source ping/film/world.mjs#drawServerHall (rack loop); lib/ping-server-rack.mjs (one rack + plinth). States idle, busy, alert, off. LEDs fade smoothly instead of hard threshold. Check: jumps 0 pops 0 pure true footprint ok (hw 25 hh 87), ~21 ms. Issues: LEDs are 1-px dots, the red alert pulse is subtle at wide shot (visible in close-up).

## zoom-inset (WS10)
- kind zoom-inset, covers zoom-inset; source animals-wingbeat/film/levels/marsh.mjs#drawLens; no lib file (inlined in items/zoom-inset.mjs).
- states: show (mag 1.7), zoom (mag to 3.5), sweep (lens glides sideways), close (shrinks to a small dot). Resamples s.raw around s.look (blended by lookK) or around itself; rim + handle shaded in house ramp.
- check: `jumps 0 pops 0 pure true footprint ok` (declared 68x68, measured 105x70 incl. sweep).
- issues: nothing drawn inside the glass beyond the canvas resample; on a plain backdrop it looks like an empty glass; 1-px detail shimmers slightly while mag eases.

## photograph (WS10)
- kind photograph, covers photograph; source not-ugly/film/levels/finder-view.mjs#card,drawFlip; no lib file (inlined). Face/mirror/study not ported.
- states: show, flash (eased white halo, print goes pale), develop (picture fades in via Bayer gate), flip (turns over to a paper back). Picture = snapshot of canvas around s.look (blend by lookK) or dusk gradient; label in bottom strip.
- check: `jumps 0 pops 0 pure true footprint ok` (declared 72x100, measured 86x112 with flash halo).
- issues: flash halo not visually inspected in a sheet tile (the sheet samples settled states); the paper back has no text.

## frog (prop, animal) · WH7
- Source: animals-wingbeat/film/levels/pond-kit.mjs#peekFrog (L117–133), the film frog peeking out of the pond.
- Lib: items/lib/wingbeat-frog.mjs (peekFrog verbatim, imports re-pointed to ./cute.mjs); items/lib/wingbeat-scale.mjs (new blockView helper, every film pixel → k×k block; shared with pigeon).
- States: peek (base), look (eyes turn to s.look, blended by lookK), croak (throat puff), sink (head down 6 film px, waterline moves with it). Params: look, throat, dip.
- Final check: jumps 1 · pops 0 · pure true · footprint ok (74×68 declared and measured).
- Visible issues: the one flagged jump is at the start of look (≈2.5 s): the pupils step one film pixel (3 screen px) when the aim crosses a rounding threshold. Explained in notes; a dissolve would fade the whole body for that frame. croak and sink are cross-dissolved between neighbouring levels, so they do not step.
- Files: items/frog.mjs; sheets/frog.{png,json}.

## pigeon (prop, animal) · WH7
- Source: animals-wingbeat/film/levels/city-pigeon.mjs#drawPigeon (L87–117), with ocean-wing.mjs#wingFrame/drawWing.
- Lib: items/lib/wingbeat-pigeon.mjs (pigeonWing, pigeonFrames, bodySprite and drawPigeon verbatim; bodySprite takes a scale k; new drawPigeonK at k screen px per film unit); items/lib/wingbeat-ocean-wing.mjs (verbatim, import re-pointed); items/lib/wingbeat-scale.mjs (blockView).
- States: rest (amt 0.15, wings held low), look (eyes to s.look), lean (tilt 0.12, amt 0.4), flap (amt 1). Params: amt, tilt, look; the sheen slides on the clock; wing beat 3 strokes/s from the clock.
- Final check: jumps 0 · pops 0 · pure true · footprint ok (115×84 declared and measured).
- Visible issues: the film beats 6 strokes/s; here 3/s (30 fps strobe). Body sprite and wings are the film's; the presence is passed as the alpha option, because the sprite blit ignores a dissolve view. The wing span at full beat is the measured width.
- Files: items/pigeon.mjs; sheets/pigeon.{png,json}.

## falcon (prop, animal) · WH7
- Source: animals-speed/film/levels/city-falcon.mjs#drawFalcon (L182–205) with its head, perch, fly, wing and streak sprites (whole file).
- Lib: items/lib/speed-falcon.mjs (city-falcon.mjs verbatim, imports re-pointed); items/lib/speed-falcon-kit.mjs (spriteCache re-exported from speed-jungle-kit, xform, R, clamp01, lerp copied from city-kit).
- States: perch (base), look (sharp eye turns to s.look), lift (fly pose, wings beat 2.6/s from the clock), dive (streak pose, fierce brows, heading toward the target). Params: perch, fly, streak, look, fierce.
- Final check: jumps 0 · pops 0 · pure true · footprint ok (110×76 declared and measured).
- Visible issues: the three poses crossfade by alpha (the dissolve), and the presence goes in on the raw canvas, because sprite blits ignore a dissolve view. The fly pose's spread wings set the footprint width (the widest pose at z 1); the streak is the film's long teardrop. Scale 0.5 keeps the perched body about 70 px wide.
- Files: items/falcon.mjs; sheets/falcon.{png,json}.

## airplane (prop) · WS9
Source plane/film/plane.mjs#drawPlane (no lib; inline in items/airplane.mjs, shade from lib/shade.mjs). covers ["airplane"]. Film hull/fin/wing/nacelle/windshield/exhaust kept; closed hull with small passenger windows instead of the cabin cut-away, dark outline, everything through one rotation. States cruise, bank (far wing rises, near wing/engine drop), climb, descend, contrail. Check: `airplane: jumps 0 pops 0 pure true footprint ok (declared 110×60, measured 119×81)`. Issues: bank is a side-view cheat, not a real 3D roll; the footprint measured wider than declared only at the pitched/banked extremes (flagged ok); trail rotates with the plane.

## airplane-cabin (backdrop) · WS9
Source plane/film/plane.mjs#drawCabin,drawSeatRow,drawPassenger; lib/plane-cabin.mjs (copy re-laid out: scale 3.2, floor y 570, ceiling/bins to the top edge, carpet aisle to the bottom, wall at parallax 0.9, seats at 1; cockpit, hero, picocell, cargo hold dropped; half the seats empty; smooth star twinkle). Check: `airplane-cabin (backdrop): jumps 1 pops 0 pure true` (flag at 1.567 s: whole seat row re-rasterises 1 px under the slow camera crawl, z 1.007; no object appears/vanishes). Real draw ~25 ms/frame isolated (sheet figure ~100 ms includes the test scene). Issues: seats and passengers are small (y 435-570) so dark props blend with the seat row; no front() layer.

## airplane-window (prop) · WS12
Source plane-windows/film/levels/plane-window.mjs#drawWindowBack,glass,groove (+ blind); no lib (inline; plane-kit sdRR rewritten as plain SDF since it was not in the pack). Rubber seal ring, cream bezel, glass streaks and corner glint kept; the sky outside is new simple procedural fill. States day, night (Bayer crossfade, stars, moon), shade (blind slides down, dithered leading edge), frost (edge-in Bayer-gated noise), shine (glint sweep). covers ["airplane-window"]. Check: `jumps 0 pops 0 pure true footprint ok (declared 71x91, measured 70x96)`, ~21 ms/frame. Issues: film passengers/pressure arrows/cabin parallax not ported; frost is fairly white; measured hh 96 vs 91 (shadow-free; sheet reports ok).

## mirror (prop) · WS12
Source not-ugly/film/levels/room-cast.mjs#drawMirror,mirrorView (glass tint, two diagonal glints); no lib. Frame was not in the pack: new wood-ramp frame. Channel hero reflection not ported (plain violet gradient + drifting light bar). States still, shine (glint sweep), fog (eased noise-gated coverage), crack (polylines grow from an impact point). covers ["mirror"]. Check: `jumps 0 pops 0 pure true footprint ok (62x92 declared, 62x96 measured)`, ~28 ms/frame. Issues: fog reads very white; crack star is a fixed pattern. Note: sheet tool also printed `lamp.mjs not loaded` (another agent's item, missing export `wbox` in zoomies-props-canvas.mjs).

## car (prop, covers car) · agent WH10
- Source: `fake-buttons/film/levels/street-sprites.mjs#carSprite` (sedan branch, PAL.blue, CAR_DIM.sedan, makeSprite, wheel) and `street-sprites.mjs` drawSprite idea (per-sprite-pixel blit).
- Lib: `items/lib/fakebuttons-car.mjs` (copy: makeSprite with outline and rim, sedan body, wheels; sedan only; no labels, no flip; per-frame blocks of S = 2·z grid px; spokes, brake-light glow, head-light halo drawn per frame).
- States: parked (start, still, lights off) · drive (wheels spin at 6 rad/s integrated, body bobs) · brake (wheels slow to 0 with the integral, tail lamps glow) · honk (9 Hz side shake, sound thump) · lights (head halo and tail glow).
- Final check: `jumps 0 pops 0 pure true footprint ok (declared 86×24, measured 95×28)` 17.7 ms/frame. The measured width includes the head-light halo, which reaches past the sprite edge.
- Visible issues: no brand, no text (the film's taxi number and bus route text are not used). The body is a generic blue sedan, not the film's taxi. Spokes are two 1-px lines per wheel, so they read as a "+" when still. The halo is a dithered block ring, not a light cone.

## snowflake (prop, covers snowflake) · agent WH10
- Source: `touch/film/street.mjs#snowLayer` (rnd, Bayer flake rule, two film colours).
- Lib: `items/lib/touch-street-snow.mjs` (copy: rnd, flake rule; drawn in a box at the slot, z scales the box, flake sizes fixed; presence order per flake; fall phase = integral of speed; top and bottom fades at the wrap; eased sway).
- States: light (start, 40 % of flakes, slow) · heavy (all 40 flakes, faster, sound swish) · swirl (80 %, sway amplitude 1, whoosh) · stop (count to 0, flakes dissolve out, dim).
- Final check: `jumps 0 pops 0 pure true footprint ok (declared 75×90, measured 75×84)` 16.4 ms/frame.
- Visible issues: the 1 px flakes (#B4B4D2) are faint on the purple backdrop, mostly visible in the heavy state. Flake size classes do not grow with the zoom, so the close-up shows small flakes.

## brick-wall (prop, covers brick-wall) · agent WH10
- Source: `ping/film/world.mjs#brickWall` (BRICK ramp, rnd, the per-pixel brick rule, mortar at top and left of each brick, light falloff from the left).
- Lib: `items/lib/ping-brick-wall.mjs` (copy of the brick rule, painted brick by brick in world units, z scale; new crack polylines from one impact point with eased progress; crumble of the 30 % brick subset (o < 0.3), each falling eased and dissolving; dithered warm lamp light from the top left).
- States: solid (start) · crack (cracks spread, sound creak) · crumble (30 % of bricks drop out, one by one, fall 28 px while dissolving, sound fall) · lit (dithered warm light on the top-left part).
- Final check: `jumps 0 pops 0 pure true footprint ok (declared 100×98, measured 100×92)` 21.3 ms/frame.
- Visible issues: the fallen brick leaves a dark plate, so the hole reads as a dark patch rather than as the backdrop. Only the top-left quarter of the wall takes the warm light at full strength. Brick size is the film's 12×5 world px, so the close-up is busy. The crumble subset is fixed (bricks o ≥ 0.3 never fall), so the settled wall keeps about 70 % of its bricks.

Files: items/car.mjs, items/snowflake.mjs, items/brick-wall.mjs; items/lib/fakebuttons-car.mjs, items/lib/touch-street-snow.mjs, items/lib/ping-brick-wall.mjs; sheets/{car,snowflake,brick-wall}.{png,json}.

## shrew (covers, agent WH8, 2026-10-26)

- Source: animals-heart/film/levels/wall-shrew.mjs#drawShrew (LV10 Etruscan shrew, head and hands; body sprite kept).
- Lib: items/lib/animals-heart-wall-shrew.mjs (drawShrew copy: scale o.s on every part, sprites per 1 % scale, o.wide eye height, anchor-relative sprites via roofs-kit so the enter/exit dissolve reaches them); items/shrew.mjs through cute-family (S0 1.25, headY 78).
- States: sit (initial) · look (eyes aim at s.look, lookK-blended) · wide (eyes taller, startled) · sleepy (eyes shut) · sniff (snout lifts, slow twitch). The film's happy state is dropped (no happy eyes in the drawing).
- Check: jumps 2 pops 0 pure true footprint ok (declared 62×88, measured 60×100) 23.8 ms/frame; jumps at 4.1 and 4.167 s (110 novel px in two frames).
- Visible issues: no stone gap is drawn, so the body's lower velvet shows under the hands; the 4.1 s step is the shared cute eye's lash line (blink > 0.02). Otherwise the drawing matches the film at 1×.

## sloth (agent WH8, 2026-10-26)

- Source: animals-speed/film/levels/jungle-sloth.mjs#drawSloth (LV2 sloth) and the branch piece of jungle.mjs (colours and wave copied, cut to the grip span).
- Lib: items/lib/animals-speed-jungle-sloth.mjs (drawSloth lines 13–197 + furry from yard-catkit with helpers); items/lib/animals-speed-jungle-kit.mjs (copy of speed-jungle-kit whose Layer.blit writes through the dissolve view and honours pick there, so the entry dissolve and the algae both reach the cached sprites). Item in items/sloth.mjs.
- States: hang (initial, breathes slowly) · reach (near arm reaches toward s.look, eyes turn to it, lookK-blended) · sleepy (eyes close, head sinks) · algae (green algae spreads through the fur over 1.5 s).
- Check: jumps 0 pops 0 pure true footprint ok (declared 86×80, measured 86×82) 23.4 ms/frame.
- Visible issues: the film's moth, the snail on the branch and the warm/algae timeline are not in the item; the branch is a 180-px piece (film colours), so the scene's own branch is not needed. Looks right at 1× and in the close-up.

## snail (agent WH8, 2026-10-26)

- Source: animals-speed/film/levels/garden-snail.mjs#drawSnail (garden snail, 3 lines of drawing kept as is).
- Lib: items/lib/animals-speed-garden-snail.mjs (drawSnail lines 10–81 copy; the race-bib number is drawn only from o.num = s.value; one fixed text scale, the film switched scale at s 0.9). Item in items/snail.mjs.
- States: glide (initial, creeps forward slowly; crawl phase integrated with s.integ) · look (stalks turn to s.look, lookK-blended, sway) · push (crawl faster, eyes squeeze into "> <", sweat drop) · stop (no crawl, eyes droop shut).
- Check: jumps 0 pops 0 pure true footprint ok (declared 76×72, measured 76×76) 25 ms/frame.
- Visible issues: the film's clip reveal is not used; with the eyes shut the stalk tips read as beige lids (intended); the bib shows no number unless s.value is given.

## cardboard-box (prop, covers cardboard-box) · WH9
- Source: cat-boxes/film/props-box.mjs#drawBox (+ props-kit.mjs helpers). Lib: `lib/cat-boxes-box.mjs` (drawBox, geom, BOX; one added term o.squash), `lib/cat-boxes-kit.mjs` (props-kit: math, faces, contact, volume; room light import dropped, view() = alpha only).
- States: closed (flat lid), open (flaps swing open, eased, creak), wobble (one-off swing, envelope sin, ends at rest after 85 % of the key), squash (sit-down squash, sin of the key's progress).
- Scale K 1.2 screen px per film unit; box centre on the slot centre.
- Check: `cardboard-box: jumps 0 pops 0 pure true footprint ok (declared 93×73, measured 93×73) 22.7 ms/frame`.
- Visible issues: the film's cat-bed doodle and «this side up» arrows stay on the label (no logo). Squash is a sit-down squash only (no stretch state). The open side flaps are wide, so the footprint is wide at the open state.

## paper-sheet (prop, covers paper-sheet, kanizsa-square) · WH9
- Source: cat-boxes/film/props-paper.mjs#drawPaper (kind square / kanizsa). Lib: `lib/cat-boxes-paper.mjs` (the print block now has two Bayer-gated dissolves, o.sq for the square ink and o.dk for the disc inks with the illusory-square glow; kind "blank" = plain sheet), `lib/cat-boxes-kit.mjs` (shared with the box).
- States: flat (blank sheet, two tape corners), flutter (eased amplitude on a slow rotation), square (ink square dissolves in), kanizsa (four ink wedges + illusory glow; the square ink dissolves out at the same time).
- Check: `paper-sheet: jumps 1 pops 0 pure true footprint ok (declared 72×28, measured 72×28) 16.6 ms/frame jumps@4.6`.
- Flag (not fixed): one frame at 4.6 s, 108 px, the end of the kanizsa key. Removing the glow clears it; a linear glow, an earlier-saturating glow and no edge shimmer each keep it, so it is a glow-threshold step at the key end. Visible issues: the fold state is not ported (the dog-ear is a fixed corner in the film); the Kanizsa wedges are the film's pac-style inducers, a generic illusion shape, not a game sprite.

## power-line (prop, covers power-line) · WH9
- Source: zombie-mouse/film/town-street.mjs#powerPole (+ #wire; colours from town-art.mjs). Drawn directly with the film's palette inline (no film import); no lib file.
- States: still (wires hang), sway (eased sag change, slow sine), spark (one-off flash at an insulator: cubed sin envelope, dithered halo, rays grow with it), hum (eased dithered glow breathing along the wires).
- Check: `power-line: jumps 0 pops 0 pure true footprint ok (declared 134×90, measured 134×90) 20.8 ms/frame`.
- Visible issues: the film's pole is a 5 px wood post with a red rim column, which reads as a red line at prop size; wires are dark on the dark night, so they are faint at the wide shot; the spark is small at z 1 (reads best in the close-up).

## WS15 · fossil
- kind `fossil` (covers fossil) · source animals/film/levels/sea-terrain.mjs#dinoDraw (+ stamp shading, skull details) · lib/animals-fossil.mjs · items/fossil.mjs
- states: buried (dim dusty slab) → reveal (dust clears left→right, dithered per-pixel) → glow (gold pulsing ring) → show
- check: `fossil: jumps 0 pops 0 pure true footprint ok (declared 90×62, measured 89×64)` · 24 ms/frame
- issues: rock slab around the bones is new filler (film has the pale sea bed); buried state shows flat sand cover only.

## WS15 · dog-toy
- kind `dog-toy` (covers dog-toy) · source animals/film/levels/yard.mjs#toyPile + duck · lib/animals-toys.mjs · items/dog-toy.mjs
- states: still, squeak (duck double squash), toss (duck hop arc), wobble (heap sways, sheared sampling)
- check: `dog-toy: jumps 0 pops 0 pure true footprint ok (declared 93×76, measured 93×110)` · 22 ms/frame
- issues: no «scatter» (heap baked as one picture); squash/shear are nearest-neighbour resamples.

## crosswalk-button (prop) · WS13
Source fake-buttons/film/levels/street-props.mjs#drawButtonBox,boxScreen (BOXART); lib/fakebuttons-street.mjs (Layer, blitS via c.px, glow, box art). States idle, press (dome dip, eased + dithered sub-pixel), wait (orange lamp pulses), go (green lamp), fake (two faint blinks). covers ["crosswalk-button"]. Text removed: plate lines are grey bars, WAIT letters a lit bar. Check: `jumps 0 pops 0 pure true footprint ok (38x116)`. Issues: highlight outline of the film not ported; close-up magnifies 1x pixels.

## traffic-light (prop) · WS13
Source street-props.mjs#drawSignals (car signal + pedestrian hand/man signals stacked on one pole, new layout); lib/fakebuttons-street.mjs (HAND, MAN, icon). States red, amber, green, walk, blink (lamps crossfade via Bayer gates). covers ["traffic-light"]. Check: `jumps 0 pops 0 pure true footprint ok (42x82)`. Issues: stacked layout is new; close-up magnifies 1x pixels.

## WH11 · radio-wave (prop, effect)
- Source: plane/film/render.mjs#rings (L50–53, the yellow radio rings); pack packs/radio-wave.md.
- Lib: items/lib/plane-rings.mjs (new; emission as an integrated phase, dither-gated dots, cone via aim/half). Item: items/radio-wave.mjs.
- States: quiet, send, strong, toward (cone at s.look, blended by lookK), stop.
- Check: `radio-wave: jumps 0 pops 0 pure true footprint ok (declared 70×70, measured 66×68) 21 ms/frame`.
- Visible issues: the 4-px yellow point with a dark outline is the only addition (≈ 40 px, not in the film frame). Toward narrows to a few arcs at the target; the film's green whisper rings are not drawn.

## WH11 · calendar (prop, valueOptional)
- Source: animals/film/levels/bay.mjs#calendar (L244–266) and CAL timing (L183–184); pack packs/calendar.md.
- Lib: items/lib/bay-calendar.mjs (new; flips as an integrated phase, one flight per flip, scale 2×). Item: items/calendar.mjs.
- Removed from the film: the year list 1…20 and the word «YEAR» (digits come only from s.value, blank ruled pages without one; words only from s.label, drawn above the calendar).
- States: show, flip (0.5 s pages), mark (red ring sweeps around the number), fast (5 flips/s, 0.2 s each).
- Check: `calendar: jumps 0 pops 0 pure true footprint ok (declared 96×90, measured 96×76) 20.5 ms/frame`.
- Visible issues: the first version had flights of 0.075 s (flagged as pops); fixed by one flight per flip. Flights are shorter than the film's (24/16 film units instead of 44/30) to keep the footprint compact. Digits at 6× pixel scale fill the page; a 4-digit value would drop to scale 3–4.

## WH11 · songbird (character prop)
- Source: cat-eyes/film/panels.mjs#bird (L26–36); pack packs/songbird.md.
- Lib: items/lib/cat-eyes-bird.mjs (new; optional dy/squash/beak/pupil, defaults = the film drawing; beak split into two mandibles along the film's edge). Item: items/songbird.mjs. Cute kit reused from items/lib/cute.mjs.
- States: perch, sing (beak opens and closes, head bob), hop (landing squash, bottom kept on the twig), look (pupil toward s.look, blended by lookK).
- Check: `songbird: jumps 0 pops 0 pure true footprint ok (declared 48×36, measured 48×37) 19.8 ms/frame`.
- Visible issues: the first squash (8 %/10 % in 0.3 phase) gave a one-frame spike at each landing; softened to 5 %/6 % over 0.45. No fly-off: the film bird has no wings, so flying away would need new parts (not added). The film's blink and tail flick are not drawn. Whole-bird pupil aim only (no body turn).

## chimpanzee · WS14
Source animals/film/levels/jungle.mjs#chimpHead; lib/animals-jungle-chimp.mjs (sprite scaled by s, Layer.blit passes s.a). The film draws only the head sprite, so the item is a head (bust); bead eyes, brows, mouth added live with the cute kit. Via cute-family. States sit, look, wide, happy, sleepy, hoot. Check: `jumps 0 pops 0 pure true footprint ok (62x54)`. Issues: ears/fur static; no body.

## crow · WS14
Source animals/film/levels/forest.mjs#drawCrow; lib/animals-forest-crow.mjs (all geometry scaled by s; threshold parts alpha-ramped; flap phase via s.integ). Via cute-family. States sit, look, wide, happy, glare, spread (wings open + flap, beak opens). Check: `jumps 0 pops 0 pure true footprint ok (66x68)`. Issues: perched only (no air/tail fan, no sleepy); happy = shut eyes; spread wings read as flat side planks.

## worm · WS14
Source animals/film/levels/forest.mjs#drawGrub; lib/animals-forest-grub.mjs (redrawn at scale: shaded segments in the grub colours, bead eyes, smile, wriggle sin(t*9+i*0.9) kept). Via cute-family. States sit, look (leans toward target), wide, happy, sleepy, rear. Check: `jumps 0 pops 0 pure true footprint ok (46x66)`. Issues: not a pixel-exact copy (film grub is 11 px wide); lean persists from the look param in other states.

## WH12 · cat-zoomies apartment props (2026-10-26)

Shared new lib: `items/lib/zoomies-props-canvas.mjs` (adapter: the film's scratch-raster primitives, same names, drawn into the catalog view `c`; `vol`, `smooth`, `rr` re-used from zoomies-px.mjs). Existing lib files reused unchanged: `zoomies-props.mjs` (PAL), `zoomies-layout.mjs` (LAYOUT).

### window (prop)
- Source: cat-zoomies/film/apartment-props.mjs#drawWindow (+ drawCurtain from the same file, lib copy in zoomies-props.mjs). Pack packs/window.md.
- Film geometry: LAYOUT.window / curtain of the catalog lib (x 60–230, sill −128).
- States: day (0.6 s) · night (0.9 s, glow) · breeze (0.8 s, swish; curtain sways, the glass keeps its time of day).
- Glass is item-drawn (the film's sky pass is not in the prop): day gradient + a cloud rocking ±6 units (no wrap), night gradient + 40 fixed stars + crescent; night dissolves over day on the Bayer gate. Reveal is drawn under the glass (film order).
- Final check: `jumps 0 pops 0 pure true footprint ok` (declared 72×120, measured 72×120).
- Visible issues: rain not ported (no rain in the film apartment); breeze is shown as the curtain hem only, still frames look nearly like night.

### lamp (prop)
- Source: cat-zoomies/film/apartment-props.mjs#drawFloorLamp. Pack packs/lamp.md. Film: LAYOUT.floorLamp (lib layout).
- States: off (0.5 s) · on (0.8 s, glow) · flicker (0.8 s, flutter; smooth, within 26 %) · dim (0.6 s, dim).
- Added: halo (three dithered steps blended over the backdrop, strength = light), warm tint of the linen shade (0.4 × light), small bulb disc through the dissolve gate.
- Final check: `jumps 0 pops 0 pure true footprint ok` (declared 24×96, measured 22×96).
- Visible issues: the halo is a quiet dither, not a bright bloom: deliberate for the wide frame.

### fridge (prop)
- Source: cat-zoomies/film/apartment-props.mjs#drawKitchen, fridge part only. Pack packs/fridge.md (L420–496). Film geometry LAYOUT.fridge {x0 652, x1 752, top −372} from the film's layout.mjs (not in the catalog layout; copied as numbers).
- Film parts drawn as they are: body (pillow shading), seam, plinth, basket weave, freezer handle, magnets, child's cat drawing. The lower door's parts are mapped onto the leaf.
- States: closed (0.6 s) · open (0.9 s, creak; lower door swings on the right hinge, free edge narrows with cos, nearer edge taller) · hum (0.8 s, whirr; whole-pixel trembling).
- New part: the inside of the open door (mint gradient, four shelf lines). The film has no open fridge.
- Final check: `jumps 3 pops 0 pure true footprint ok` (declared 26×104, measured 26×104). Flags at 1.47 s (first whole-pixel steps of the free edge while the door starts to open), 3.33 s and 4.57 s (hum onset steps). Each is about 100–200 px on a slow edge, not a swap; accepted as pixel-grid motion and noted in the item.
- Visible issues: no light pool on the floor when open; counter and cabinets are not part of this prop.

### bed (prop)
- Source: cat-zoomies/film/apartment-props.mjs#drawBedroom, bed part only (headboard, footboard, rails, mattress, pillow, quilt with stitches, turned-down sheet, floor contact shadow). Pack packs/bed.md. Film geometry LAYOUT.bed (x −720…−420, headTop −178, mattressTop −80, blanketTop −96).
- States: made (0.5 s) · messy (0.8 s, fold; quilt top sags and rumples, continuous) · lit (0.7 s, glow; warm tint 0.22 × lit on every bed colour) · shake (0.4 s, thump; whole-pixel bounce from the film envelope).
- Not in the prop: nightstand, bedside lamp, picture, shelf, rug.
- Final check: `jumps 1 pops 0 pure true footprint ok` (declared 105×68, measured 105×68). One jump at 3.9 s, the first whole-pixel step of the bounce onset, accepted as pixel-grid motion.
- Visible issues: the lit state reads as a warmer quilt more than a lamp light; the messy state is a soft sag, not a crumpled pillow (the pillow dent was not ported).
