// Mix (Duck Hunt light-gun film, loop): voice + 8-bit sfx + chiptune bed ducked −12 dB → duck-hunt-pixel.mp4
import { fileURLToPath } from "node:url";
import { mixFilm } from "./lib/mix.mjs";
import { END } from "./timeline.mjs";
mixFilm(fileURLToPath(new URL(".", import.meta.url)), END, "duck-hunt-pixel.mp4");
