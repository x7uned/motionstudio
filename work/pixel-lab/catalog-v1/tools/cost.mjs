// Catalog v1 · Claude cost per batch, measured from this session's Claude Code transcript (same pricing and per-response
// de-duplication as work/pixel-lab/effort-exp-2026-10-25/cost.mjs: Opus 5.5 per 1M tokens — input $4, output $20 incl.
// thinking, cache write 5 min $5 / 1 h $8, cache read $0.20). A batch = a time window of the main transcript [t0, t1)
// plus every subagent transcript whose first user message contains the batch marker ("catalog-v1 batch <name>").
//   node tools/cost.mjs            (reads batches.json, writes costs.json)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL("..", import.meta.url));
const DIR = path.join(os.homedir(), ".claude/projects/-Users-rv-Desktop-Motion-Studio"), SESSION = "3ab1b9df-e721-40e0-836d-7710571f330d";
const P = { input: 4, output: 20, w5: 5, w1h: 8, read: 0.2 };
// per-model list prices per 1M tokens (claude-api skill, cached 2026-10-06): cache read / 5-min write / 1-h write.
// Haiku 5.5 has two rate cards by prompt length (≤ 100K tokens or more); cache = 0.1× / 1.25× / 2× its input rate.
const PRICES = {
  "claude-opus-5-5": () => P,
  "claude-sonnet-5-5": () => ({ input: 2, output: 10, w5: 2.5, w1h: 4, read: 0.2 }),
  "claude-haiku-5-5": (prompt) => (prompt <= 100000 ? { input: 0.1, output: 0.5, w5: 0.125, w1h: 0.2, read: 0.01 } : { input: 0.5, output: 2.5, w5: 0.625, w1h: 1, read: 0.05 }),
};
const priceOf = (model, prompt) => (PRICES[model] || PRICES["claude-opus-5-5"])(prompt);
const lines = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const firstUserText = (f) => { for (const j of lines(f)) if (j.type === "user" && j.message?.role === "user") { const c = j.message.content; return typeof c === "string" ? c : (c || []).map((b) => b.text || "").join(" "); } return ""; };
// Subagent transcripts often keep only a mid-stream usage snapshot of a response (stop_reason null): its input side
// (input, cache read/write) is final, its output_tokens is not. Such responses get an ESTIMATED output: visible output
// characters (text + tool input JSON) / chars-per-token × (1 + thinking share), both ratios measured on this session's
// main transcript, whose responses are all final. Recorded and estimated totals are both reported.
let RATIO = null;
function measure(entries, estimate = false) {
  const seen = new Map(); let tools = 0, first = Infinity, last = 0, estN = 0; const models = new Set(), efforts = new Set();
  for (const j of entries) {
    const t = Date.parse(j.timestamp || ""); if (t) { first = Math.min(first, t); last = Math.max(last, t); }
    if (j.type !== "assistant" || !j.message?.usage) continue;
    if (j.message.model) models.add(j.message.model); if (j.effort) efforts.add(j.effort);
    for (const b of j.message.content || []) if (b.type === "tool_use") tools++;
    const key = j.message.id || j.requestId || j.uuid, u = j.message.usage;
    const e = seen.get(key) || { u, out: 0, think: 0, vis: 0, final: false, model: j.message.model }; seen.set(key, e);
    e.out = Math.max(e.out, u.output_tokens || 0); e.think = Math.max(e.think, u.output_tokens_details?.thinking_tokens || 0); if (j.message.stop_reason) e.final = true;
    for (const b of j.message.content || []) e.vis += b.type === "text" ? b.text.length : b.type === "tool_use" ? JSON.stringify(b.input).length : 0;
  }
  // thinking share differs by model and effort: use this transcript's own final responses when it has ≥ 5, else the main ratio
  let R = RATIO; { let o = 0, th = 0, v = 0, n = 0; for (const e of seen.values()) if (e.final) { o += e.out; th += e.think; v += e.vis; n++; } if (n >= 5 && o - th > 0) R = { cpt: v / (o - th), think: th / (o - th), from: n, own: true }; }
  const sum = { input: 0, w5: 0, w1h: 0, read: 0, output: 0, thinking: 0, outputRecorded: 0 }, cost = { input: 0, output: 0, outputRec: 0, write: 0, read: 0 };
  for (const e of seen.values()) { const u = e.u; sum.input += u.input_tokens || 0; sum.read += u.cache_read_input_tokens || 0; sum.outputRecorded += e.out; sum.thinking += e.think;
    let out = e.out; if (estimate && !e.final && R) { const est = Math.round((e.vis / R.cpt) * (1 + R.think)); if (est > out) { out = est; estN++; } } sum.output += out;
    { const c0 = u.cache_creation || {}, h = c0.ephemeral_1h_input_tokens || 0, m5 = c0.ephemeral_5m_input_tokens ?? Math.max(0, (u.cache_creation_input_tokens || 0) - h);
      const pr = priceOf(e.model, (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0));
      cost.input += (u.input_tokens || 0) * pr.input; cost.output += out * pr.output; cost.outputRec += e.out * pr.output; cost.write += m5 * pr.w5 + h * pr.w1h; cost.read += (u.cache_read_input_tokens || 0) * pr.read; }
    const c = u.cache_creation || {}, w1h = c.ephemeral_1h_input_tokens || 0, w5 = c.ephemeral_5m_input_tokens ?? Math.max(0, (u.cache_creation_input_tokens || 0) - w1h); sum.w5 += w5; sum.w1h += w1h; }
  const usd = (cost.input + cost.output + cost.write + cost.read) / 1e6, usdRecorded = (cost.input + cost.outputRec + cost.write + cost.read) / 1e6;
  return { apiResponses: seen.size, outputEstimatedResponses: estN, ratio: R && { cpt: +R.cpt.toFixed(2), think: +R.think.toFixed(2), from: R.from, own: !!R.own }, usdRecorded: +usdRecorded.toFixed(3), toolCalls: tools, models: [...models], efforts: [...efforts], tokens: sum, usd: +usd.toFixed(3),
    split: { output: +(cost.output / 1e6).toFixed(3), cacheWrite: +(cost.write / 1e6).toFixed(3), cacheRead: +(cost.read / 1e6).toFixed(3), input: +(cost.input / 1e6).toFixed(3) },
    wallClockMin: first < Infinity ? +((last - first) / 60000).toFixed(1) : 0 };
}
const main = lines(path.join(DIR, SESSION + ".jsonl")), subDir = path.join(DIR, SESSION, "subagents");
{ // ratios from the main transcript (final usage only)
  const by = new Map(); for (const j of main) { if (j.type !== "assistant" || !j.message?.usage || !j.message.stop_reason) continue; const k = j.message.id; const e = by.get(k) || { out: 0, think: 0, vis: 0 }; by.set(k, e);
    e.out = Math.max(e.out, j.message.usage.output_tokens || 0); e.think = Math.max(e.think, j.message.usage.output_tokens_details?.thinking_tokens || 0); for (const b of j.message.content || []) e.vis += b.type === "text" ? b.text.length : b.type === "tool_use" ? JSON.stringify(b.input).length : 0; }
  let out = 0, think = 0, vis = 0; for (const e of by.values()) { out += e.out; think += e.think; vis += e.vis; }
  RATIO = { cpt: vis / Math.max(1, out - think), think: think / Math.max(1, out - think), from: by.size };
}
const subs = fs.existsSync(subDir) ? fs.readdirSync(subDir).filter((n) => n.endsWith(".jsonl")).map((n) => path.join(subDir, n)) : [];
const batches = JSON.parse(fs.readFileSync(HERE + "batches.json", "utf8")), out = {};
for (const b of batches) {
  const t0 = Date.parse(b.t0), t1 = b.t1 ? Date.parse(b.t1) : Infinity;
  const win = main.filter((j) => { const t = Date.parse(j.timestamp || ""); return t >= t0 && t < t1; });
  const mine = measure(win), files = subs.filter((f) => firstUserText(f).includes(`catalog-v1 batch ${b.name}`)), sub = files.length ? measure(files.flatMap(lines), true) : null;
  const usd = +(mine.usd + (sub?.usd || 0)).toFixed(3), usdRec = +(mine.usd + (sub?.usdRecorded || 0)).toFixed(3), n = (b.items || []).length;
  out[b.name] = { window: [b.t0, b.t1 || null], items: b.items || [], main: mine, subagents: sub && { files: files.map((f) => path.basename(f)), ...sub }, usd, usdRecordedOnly: usdRec, usdPerItem: n ? +(usd / n).toFixed(3) : null };
}
out._ratio = RATIO;
fs.writeFileSync(HERE + "costs.json", JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) if (k !== "_ratio") console.log(`${k}: $${v.usd} (main $${v.main.usd}, ${v.main.apiResponses} resp; subagents ${v.subagents ? "$" + v.subagents.usd + ", " + v.subagents.apiResponses + " resp" : "—"}) items ${v.items.length}${v.usdPerItem != null ? " → $" + v.usdPerItem + "/item" : ""}${v.subagents ? ` [recorded-only $${v.usdRecordedOnly}; ${v.subagents.outputEstimatedResponses} responses with estimated output]` : ""}`);
console.log("ratio from main:", JSON.stringify(RATIO));
// per agent (B2/B3: one agent = 2 items; the prompt names «agent B2a» …): finer per-item costs
const perAgent = {};
for (const f of subs) { const m = /catalog-v1 batch (\w+)(?: \(agent ([\w-]+)\))?/.exec(firstUserText(f)); if (!m) continue; const r = measure(lines(f), true);
  perAgent[m[2] || m[1]] = { batch: m[1], file: path.basename(f), models: r.models, efforts: r.efforts, usd: r.usd, usdRecorded: r.usdRecorded, responses: r.apiResponses, toolCalls: r.toolCalls, cacheReadM: +(r.tokens.read / 1e6).toFixed(2), outputK: +(r.tokens.output / 1e3).toFixed(1), wallClockMin: r.wallClockMin }; }
out._perAgent = perAgent;
fs.writeFileSync(HERE + "costs.json", JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(perAgent)) console.log(`agent ${k} [${v.models.join(",")} ${v.efforts.join(",")}]: $${v.usd} (recorded $${v.usdRecorded}) ${v.responses} resp, ${v.toolCalls} tools, read ${v.cacheReadM}M, out ${v.outputK}k, ${v.wallClockMin} min`);
