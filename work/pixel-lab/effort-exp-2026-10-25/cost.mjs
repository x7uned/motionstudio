// Effort experiment 2026-10-25: cost of a chat session from its Claude Code transcript (usage of every API response).
// Opus 5.5 list prices per 1M tokens: input $4, output $20 (thinking included), cache write 5 min $5 / 1 h $8, cache read $0.20.
// (Checked against the studio's own CLI cost: director 178dad90-medium → $0.709 in both.)
//   node cost.mjs <marker text in the first user message> [...more markers]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DIR = path.join(os.homedir(), ".claude/projects/-Users-rv-Desktop-Motion-Studio");
const P = { input: 4, output: 20, w5: 5, w1h: 8, read: 0.2 };
const firstUserText = (file) => {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue; let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.type === "user" && j.message?.role === "user") { const c = j.message.content; return typeof c === "string" ? c : (c || []).map((b) => b.text || "").join(" "); }
  }
  return "";
};
function measure(files) {
  const seen = new Map(); let first = Infinity, last = 0, tools = 0, turns = 0; const efforts = new Set(), models = new Set();
  for (const file of files) for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue; let j; try { j = JSON.parse(line); } catch { continue; }
    const t = Date.parse(j.timestamp || ""); if (t) { first = Math.min(first, t); last = Math.max(last, t); }
    if (j.type !== "assistant" || !j.message?.usage) continue;
    if (j.effort) efforts.add(j.effort); if (j.message.model) models.add(j.message.model);
    for (const b of j.message.content || []) if (b.type === "tool_use") tools++;
    // One API response is split into several transcript lines (one per content block) with the same usage: count it once.
    const key = j.message.id || j.requestId || j.uuid; if (!seen.has(key)) { seen.set(key, j.message.usage); turns++; }
  }
  const sum = { input: 0, w5: 0, w1h: 0, read: 0, output: 0, thinking: 0 };
  for (const u of seen.values()) {
    sum.input += u.input_tokens || 0; sum.read += u.cache_read_input_tokens || 0; sum.output += u.output_tokens || 0;
    sum.thinking += u.output_tokens_details?.thinking_tokens || 0;
    const c = u.cache_creation || {}; const w1h = c.ephemeral_1h_input_tokens || 0, w5 = c.ephemeral_5m_input_tokens ?? Math.max(0, (u.cache_creation_input_tokens || 0) - w1h);
    sum.w5 += w5; sum.w1h += w1h;
  }
  const usd = (sum.input * P.input + sum.output * P.output + sum.w5 * P.w5 + sum.w1h * P.w1h + sum.read * P.read) / 1e6;
  return { files: files.map((f) => path.basename(f)), apiResponses: turns, toolCalls: tools, efforts: [...efforts], models: [...models], tokens: sum, usd: Math.round(usd * 100) / 100,
    split: { output: +(sum.output * P.output / 1e6).toFixed(2), cacheWrite: +((sum.w5 * P.w5 + sum.w1h * P.w1h) / 1e6).toFixed(2), cacheRead: +(sum.read * P.read / 1e6).toFixed(2), input: +(sum.input * P.input / 1e6).toFixed(2) },
    wallClockMin: Math.round((last - first) / 6000) / 10 };
}
const markers = process.argv.slice(2);
const all = fs.readdirSync(DIR).filter((n) => n.endsWith(".jsonl")).map((n) => path.join(DIR, n));
const out = {};
for (const m of markers) {
  const main = all.filter((f) => firstUserText(f).includes(m));
  // Subagent transcripts live next to the main one: <session-id>/subagents/*.jsonl (none expected: the brief forbids them).
  const subs = main.flatMap((f) => { const d = path.join(f.replace(/\.jsonl$/, ""), "subagents"); return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.endsWith(".jsonl")).map((n) => path.join(d, n)) : []; });
  out[m] = main.length ? { ...measure([...main, ...subs]), subagentFiles: subs.length } : { missing: true };
}
console.log(JSON.stringify(out, null, 1));
