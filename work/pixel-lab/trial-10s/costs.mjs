// Cost table of the trial calls (runs/*/report.json ← Claude CLI usage of every call) → costs.json + a printed table.
// Measured = the CLI's own total_cost_usd (list prices, costBasis "list"). Checked by hand from usage:
// Opus 5.5 per 1M tokens — input $4, output $20 (thinking included), cache write 1 h $8 (the CLI writes 1 h), read $0.20.
// API projection (what a SaaS would pay calling the Messages API itself, not the CLI): the static system prompt + schema is
// read from a shared prompt cache (one 5-min/1-h write per cache lifetime, amortised to ~0 across users); the per-user part
// is plain input; output as measured. Cold = the static prefix written once (1 h write) for that call.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url)), P = { in: 4, out: 20, w1h: 8, w5: 5, read: 0.2 };
const rows = [];
for (const name of fs.readdirSync(HERE + "runs").filter((n) => !n.startsWith("_")).sort()) {
  const rep = JSON.parse(fs.readFileSync(HERE + `runs/${name}/report.json`, "utf8"));
  const calls = rep.calls.map((c) => { const u = c.usage, cw = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0, out = u.output_tokens, th = u.output_tokens_details?.thinking_tokens || 0;
    const usd = (u.input_tokens * P.in + out * P.out + (u.cache_creation?.ephemeral_1h_input_tokens ?? cw) * P.w1h + (u.cache_creation?.ephemeral_5m_input_tokens ?? 0) * P.w5 + cr * P.read) / 1e6;
    return { label: c.label, cli: c.costUsd, check: +usd.toFixed(6), input: u.input_tokens, cacheWrite: cw, cacheRead: cr, output: out, thinking: th, seconds: +(c.elapsedMs / 1000).toFixed(1), apiSeconds: +(c.apiMs / 1000).toFixed(1) }; });
  rows.push({ run: name, topic: rep.topic, effort: rep.effort, status: rep.status, calls, retry: rep.calls.length > 1, retryReason: rep.retry?.map((i) => i.msg) ?? [], repairs: rep.repairFinal ?? rep.repairFirst ?? [] });
}
// the static prefix (system prompt + schema) = the smallest non-zero cache read: identical for every topic and effort.
// Larger reads (pumpkin-low 6016, sunlight-low 5933) also hit the same topic's user message cached by the medium call.
const STATIC = Math.min(...rows.flatMap((r) => r.calls.map((c) => c.cacheRead)).filter((x) => x > 0));
for (const r of rows) {
  r.cli = +r.calls.reduce((s, c) => s + c.cli, 0).toFixed(4);
  r.output = r.calls.reduce((s, c) => s + c.output, 0); r.thinking = r.calls.reduce((s, c) => s + c.thinking, 0);
  r.seconds = +r.calls.reduce((s, c) => s + c.seconds, 0).toFixed(1);
  // projection: per call, user part = everything that is not the static prefix
  r.apiWarm = +r.calls.reduce((s, c) => { const user = c.input + c.cacheWrite + c.cacheRead - STATIC; return s + (STATIC * P.read + user * P.in + c.output * P.out) / 1e6; }, 0).toFixed(4);
  r.apiCold = +(r.apiWarm + (STATIC * (P.w1h - P.read)) / 1e6).toFixed(4);
}
const by = (e) => rows.filter((r) => r.effort === e), mean = (a, k) => +(a.reduce((s, r) => s + r[k], 0) / a.length).toFixed(4);
const summary = Object.fromEntries(["medium", "low"].map((e) => [e, { films: by(e).length, cliMean: mean(by(e), "cli"), cliMax: Math.max(...by(e).map((r) => r.cli)), apiWarmMean: mean(by(e), "apiWarm"), apiColdMean: mean(by(e), "apiCold"), outputMean: Math.round(mean(by(e), "output")), thinkingMean: Math.round(mean(by(e), "thinking")), secondsMean: mean(by(e), "seconds"), retries: by(e).filter((r) => r.retry).length }]));
fs.writeFileSync(HERE + "costs.json", JSON.stringify({ prices: P, staticPrefixTokens: STATIC, rows, summary }, null, 1));
console.log("static prefix tokens", STATIC);
for (const r of rows) console.log(r.run.padEnd(16), r.status, `cli $${r.cli.toFixed(4)}`, `api warm $${r.apiWarm.toFixed(4)} cold $${r.apiCold.toFixed(4)}`, `calls ${r.calls.length}`, `out ${r.output} (think ${r.thinking})`, `${r.seconds}s`, r.calls.map((c) => `[cw ${c.cacheWrite} cr ${c.cacheRead} check $${c.check.toFixed(4)}]`).join(" "));
console.log(JSON.stringify(summary, null, 1));
