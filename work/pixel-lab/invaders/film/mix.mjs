// Mix (Space Invaders "Nagoya attack" film, loop): voice + 8-bit sfx + chiptune bed ducked −12 dB → invaders-pixel.mp4
import { fileURLToPath } from "node:url";
import { mixFilm } from "./lib/mix.mjs";
import { END } from "./timeline.mjs";
mixFilm(fileURLToPath(new URL(".", import.meta.url)), END, "invaders-pixel.mp4");
