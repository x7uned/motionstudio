// Catalog v1 · topic coverage of the ported set, with the logic of catalog-sizing/merge.mjs (2026-10-26): an idea is covered
// when every prop it needs is in the set (genericFree: generic diagram props count as free); the "WithBackdrop" variants
// also need its backdrop. Baseline = the trial-10s catalog alone. node tools/coverage.mjs → coverage-now.json
import fs from "node:fs";
import { fileURLToPath } from "node:url";
process.env.CATALOG_QUIET = "1";
const { ITEMS, BACKDROP_ITEMS, TRIAL_COVERS, TRIAL_BACKDROP_COVERS } = await import("../contract.mjs");
const HERE = fileURLToPath(new URL("..", import.meta.url)), SZ = HERE + "../catalog-sizing/";
const ideas = JSON.parse(fs.readFileSync(SZ + "ideas-props.json", "utf8")), reg = JSON.parse(fs.readFileSync(SZ + "coverage.json", "utf8")).prop_registry;
const generic = new Set(Object.entries(reg).filter(([, v]) => v.generic).map(([k]) => k));
const cover = (set, { genericFree = false, onlyUnbranded = false, bd = null } = {}) => {
  const pool = ideas.filter((i) => !onlyUnbranded || !i.branded);
  const ok = pool.filter((i) => i.props.every((p) => set.has(p.name) || (genericFree && generic.has(p.name))) && (!bd || bd.has(i.backdrop)));
  return { covered: ok.length, of: pool.length, pct: Math.round((100 * ok.length) / pool.length), ideas: ok };
};
const variants = (props, bds) => { const o = {}; for (const [k, opt] of Object.entries({ all: {}, genericFree: { genericFree: true }, unbranded: { onlyUnbranded: true }, unbrandedGenericFree: { onlyUnbranded: true, genericFree: true }, unbrandedGenericFreeWithBackdrop: { onlyUnbranded: true, genericFree: true, bd: bds } })) { const r = cover(props, opt); o[k] = { covered: r.covered, of: r.of, pct: r.pct }; } return o; };
const trialProps = new Set(Object.values(TRIAL_COVERS).flat()), trialBd = new Set(Object.values(TRIAL_BACKDROP_COVERS).flat());
const nowProps = new Set([...trialProps, ...Object.values(ITEMS).flatMap((m) => m.covers || [m.kind])]);
const nowBd = new Set([...trialBd, ...Object.values(BACKDROP_ITEMS).flatMap((m) => m.covers || [m.kind])]);
const unknown = [...nowProps].filter((n) => !reg[n]), unknownBd = [...nowBd].filter((n) => !ideas.some((i) => i.backdrop === n));
const miss = {}; for (const i of ideas.filter((i) => !i.branded)) for (const p of i.props) if (!nowProps.has(p.name) && !generic.has(p.name)) miss[p.name] = (miss[p.name] || 0) + 1;
const missBd = {}; for (const i of ideas.filter((i) => !i.branded)) if (!nowBd.has(i.backdrop)) missBd[i.backdrop] = (missBd[i.backdrop] || 0) + 1;
const before = new Set(cover(trialProps, { onlyUnbranded: true, genericFree: true }).ideas.map((i) => i.title));
const out = {
  ported: { props: Object.keys(ITEMS).length, backdrops: Object.keys(BACKDROP_ITEMS).length, kinds: Object.keys(ITEMS), backdropKinds: Object.keys(BACKDROP_ITEMS) },
  names: { props: nowProps.size, backdrops: nowBd.size, notInRegistry: unknown, backdropsNotInIdeas: unknownBd },
  baselineTrial10s: variants(trialProps, trialBd), now: variants(nowProps, nowBd),
  newlyCoveredUnbrandedGenericFree: cover(nowProps, { onlyUnbranded: true, genericFree: true }).ideas.filter((i) => !before.has(i.title)).map((i) => i.title),
  topMissingUnbrandedProps: Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 25), topMissingUnbrandedBackdrops: Object.entries(missBd).sort((a, b) => b[1] - a[1]).slice(0, 12),
};
fs.writeFileSync(HERE + "coverage-now.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ported: out.ported.props + " props + " + out.ported.backdrops + " backdrops", baseline: out.baselineTrial10s, now: out.now, notInRegistry: unknown, backdropsNotInIdeas: unknownBd }, null, 1));
