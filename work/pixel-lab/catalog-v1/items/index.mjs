// Catalog v1 (2026-10-26) · registry of ported items. Every items/<kind>.mjs default-exports one item (see items/README.md).
// Shared drawing code lives in items/lib/ (not auto-loaded). A file that fails to load is reported, never silently used.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL(".", import.meta.url));
export const ITEMS = {}, BACKDROP_ITEMS = {}, LOAD_ERRORS = {};
const REQ = ["kind", "desc", "hw", "hh", "start", "states", "base", "st", "draw"], REQ_BD = ["kind", "desc", "theme", "draw"];
for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith(".mjs") && n !== "index.mjs" && !n.startsWith("_")).sort()) {
  try {
    const m = (await import("./" + f)).default;
    if (m?.backdrop) {   // a backdrop: one persistent world drawn behind (draw) and optionally in front of (front) the props
      const miss = REQ_BD.filter((k) => m[k] == null); if (miss.length) throw new Error("missing " + miss.join(", "));
      if (BACKDROP_ITEMS[m.kind]) throw new Error("duplicate backdrop " + m.kind);
      BACKDROP_ITEMS[m.kind] = m; continue;
    }
    const miss = REQ.filter((k) => m?.[k] == null); if (miss.length) throw new Error("missing " + miss.join(", "));
    if (ITEMS[m.kind]) throw new Error("duplicate kind " + m.kind);
    const n = Object.keys(m.states).length; if (n < 2 || n > 6) throw new Error(`${n} states (2–6 allowed)`);
    for (const s of Object.keys(m.states)) if (!m.st[s]) throw new Error(`state ${s} has no parameter targets in st`);
    ITEMS[m.kind] = m;
  } catch (e) { LOAD_ERRORS[f] = e.message; }
}
if (Object.keys(LOAD_ERRORS).length && !process.env.CATALOG_QUIET) console.error("catalog-v1: items not loaded:", LOAD_ERRORS);
