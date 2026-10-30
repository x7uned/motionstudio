// catalog-v1 backdrop «airplane-cabin»: the airliner cabin of the «plane» film (plane/film/plane.mjs#drawCabin/drawSeatRow/
// drawPassenger, copied to lib/plane-cabin.mjs): night windows with twinkling stars, overhead bins with a lilac mood light,
// a row of lilac seats with a few sleeping or phone-reading passengers (about half the seats are empty), red floor guide
// lights and a carpet aisle that runs to the bottom edge. Re-laid out for the 9:16 stage (scale 3.2, floor line y 570):
// the film's hull cut-away, cockpit, hero seat, picocell and cargo hold are not drawn. Ambient: stars twinkle, phone glows breathe.
import { layer } from "../engine/layout.mjs";
import { filmView, drawWall, drawSeats } from "./lib/plane-cabin.mjs";

export default {
  kind: "airplane-cabin",
  backdrop: true,
  covers: ["airplane-cabin"],
  source: "plane/film/plane.mjs#drawCabin",
  desc: "night flight cabin: window row, overhead bins, lilac seat row, carpet aisle",
  theme: { accent: "#B08AE8", gold: "#F4CA50", hot: "#FFE9A8", core: "#FFF6CE", stone: ["#231C3E", "#3B2C5C", "#140F22"], beam: "#8D59DA" },
  draw(c, cam, t) {
    c.rect(0, 0, c.w, c.h, "#231C3E");
    drawWall(c, filmView(layer(cam, 0.9)), t);
    drawSeats(c, filmView(layer(cam, 1)), t);
  },
  notes: "Dark lilac palette from the film: light props read best against the wall; dark props blend with the seat row (y 440-570) and the carpet. Seat backs/heads at y 435-540 sit behind the prop slots; the windows (y 440-480 at wide) are the calmest band. Passengers are the film's generic ones (no hero, no beanie); half the seats are empty. Bins/ceiling are filled to the top edge and the carpet to the bottom edge at every camera tested. Checker: 1 flag at 1.567 s while the camera still crawls at z 1.007: the whole seat row re-rasterises by 1 px in one frame (zoom rounding, ~220 px, not an appearing/vanishing object). Real draw ~25 ms/frame isolated (the sheet figure includes the test scene).",
};
