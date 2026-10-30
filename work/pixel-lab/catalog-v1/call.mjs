// ONE structured Claude Opus 5.5 call → script + plan, then deterministic validation and repair, at most one retry.
// Isolation as the studio's askClaudeJSON (src/lib/claude-provider.ts): Claude Code CLI -p, --restricted, no tools,
// no MCP, no session persistence, isolated temp cwd, env without ELEVENLABS_/TAVILY_/APIFY_/CODEX_/OPENAI_/CLAUDE*.
// Difference (on purpose): the static rules + catalog go into --system-prompt so every topic shares that prefix.
//   node call.mjs <topic-id> <effort>        (topics in topics.json; writes runs/<topic>-<effort>/)
// Must run where the Claude CLI is logged in (the user's terminal), not in the sandboxed shell.
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SCHEMA, issues, repair, resolve } from "./contract.mjs";
import { STATIC, userMessage, retryMessage } from "./prompt.mjs";
import { fromTake, estimate } from "./timing.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const MODEL = "claude-opus-5-5";
const [topicId, effort = "medium"] = process.argv.slice(2);
const TOPICS = JSON.parse(fs.readFileSync(HERE + "topics.json", "utf8"));
const topic = TOPICS[topicId]; if (!topic) throw new Error(`unknown topic ${topicId}`);
const fixedScript = topic.narration ? fs.readFileSync(path.resolve(HERE, topic.narration), "utf8").trim() : null;
const OUT = HERE + `runs/${topicId}-${effort}/`; fs.mkdirSync(OUT, { recursive: true });

function claudeBinary() {
  if (process.env.STUDIO_CLAUDE) return process.env.STUDIO_CLAUDE;
  for (const p of [path.join(os.homedir(), ".local/bin/claude"), "/opt/homebrew/bin/claude", "/usr/local/bin/claude"]) if (fs.existsSync(p)) return p;
  const base = path.join(os.homedir(), "Library/Application Support/Claude/claude-code"), key = (v) => v.split(".").map((n) => Number(n) || 0).reduce((a, n) => a * 1000 + n, 0);
  for (const v of fs.readdirSync(base).sort((a, b) => key(b) - key(a))) for (const h of fs.readdirSync(path.join(base, v))) { const bin = path.join(base, v, h, "claude.app/Contents/MacOS/claude"); if (fs.existsSync(bin)) return bin; }
  throw new Error("Claude Code CLI not found");
}
function env() {
  const e = {};
  for (const [k, v] of Object.entries(process.env)) { if (v === undefined) continue; if (/^(ELEVENLABS_|TAVILY_|APIFY_|CODEX_|OPENAI_)/.test(k)) continue; if ((k.startsWith("CLAUDE") && k !== "CLAUDE_CONFIG_DIR") || k === "ANTHROPIC_BASE_URL") continue; e[k] = v; }
  e.PATH = `/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`; return e;
}
async function ask(user, label) {
  const dir = OUT + label + "/"; fs.mkdirSync(dir, { recursive: true });
  const args = ["-p", "--model", MODEL, "--effort", effort, "--output-format", "json", "--json-schema", JSON.stringify(SCHEMA), "--tools", "", "--restricted", "--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands", "--permission-mode", "dontAsk", "--system-prompt", STATIC];
  fs.writeFileSync(dir + "system.txt", STATIC); fs.writeFileSync(dir + "user.txt", user);
  fs.writeFileSync(dir + "request.json", JSON.stringify({ model: MODEL, effort, startedAt: new Date().toISOString(), systemChars: STATIC.length, userChars: user.length }, null, 2));
  const isolated = await fsp.mkdtemp(path.join(os.tmpdir(), "catalog-v1-claude-")), t0 = Date.now();
  try {
    const raw = await new Promise((res, rej) => {
      const child = spawn(claudeBinary(), args, { cwd: isolated, env: env(), stdio: ["pipe", "pipe", "pipe"] });
      let out = "", err = ""; const timer = setTimeout(() => child.kill("SIGTERM"), 900_000);
      child.stdin.end(user + "\nReturn only JSON by the schema. Do not run commands or change files.");
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data", (x) => (out += x)); child.stderr.on("data", (x) => (err = (err + x).slice(-8000)));
      child.on("error", rej); child.on("close", (code) => { clearTimeout(timer); if (code !== 0 && !out.trim()) rej(new Error(`claude exited ${code}: ${err}`)); else res(out); });
    });
    const meta = JSON.parse(raw.trim().split("\n").filter(Boolean).at(-1));
    fs.writeFileSync(dir + "cli-result.json", JSON.stringify(meta, null, 2));
    if (meta.is_error || meta.subtype !== "success") throw new Error("Claude: " + String(meta.result || meta.subtype).slice(0, 600));
    const used = Object.entries(meta.modelUsage || {}).map(([n, v]) => v.canonicalModel || n);
    if (!used.includes(MODEL)) throw new Error(`model not confirmed: ${used.join(", ")}`);
    const value = meta.structured_output ?? JSON.parse(String(meta.result).slice(String(meta.result).indexOf("{"), String(meta.result).lastIndexOf("}") + 1));
    fs.writeFileSync(dir + "answer.json", JSON.stringify(value, null, 2));
    const progress = { model: MODEL, effort, usedModels: [...new Set(used)], elapsedMs: Date.now() - t0, apiMs: meta.duration_api_ms, turns: meta.num_turns, costUsd: meta.total_cost_usd, usage: meta.usage, modelUsage: meta.modelUsage };
    fs.writeFileSync(dir + "progress.json", JSON.stringify(progress, null, 2));
    return { value, progress };
  } finally { await fsp.rm(isolated, { recursive: true, force: true }); }
}

const timingFor = (script) => (topic.words ? fromTake(path.resolve(HERE, topic.words)) : estimate(script));
const report = { topic: topicId, topicText: topic.topic, effort, fixedScript: !!fixedScript, calls: [] };
let { value, progress } = await ask(userMessage(topic.topic, fixedScript), "call-1");
report.calls.push({ label: "call-1", ...progress });
let ctx = { fixedScript, timing: timingFor(value.script) };
report.issuesFirst = issues(value, ctx);
let { plan, log } = repair(value, ctx);
ctx = { fixedScript, timing: timingFor(plan.script) };
let left = issues(plan, ctx);
report.repairFirst = log;
if (left.some((i) => i.fix === "retry")) {
  report.retry = left;
  ({ value, progress } = await ask(retryMessage(topic.topic, fixedScript, plan, left), "call-2"));
  report.calls.push({ label: "call-2", ...progress });
  ctx = { fixedScript, timing: timingFor(value.script) };
  report.issuesSecond = issues(value, ctx);
  ({ plan, log } = repair(value, ctx));
  ctx = { fixedScript, timing: timingFor(plan.script) };
  left = issues(plan, ctx); report.repairSecond = log;
}
report.remaining = left;
report.status = left.some((i) => i.fix === "retry") ? "failed" : "ok";
report.costUsd = +report.calls.reduce((s, c) => s + (c.costUsd || 0), 0).toFixed(4);
fs.writeFileSync(OUT + "plan.json", JSON.stringify(plan, null, 2));
fs.writeFileSync(OUT + "timing.json", JSON.stringify(ctx.timing, null, 2));
if (report.status === "ok") fs.writeFileSync(OUT + "resolved.json", JSON.stringify(resolve(plan, ctx.timing), null, 2));
fs.writeFileSync(OUT + "report.json", JSON.stringify(report, null, 2));
console.log(`${topicId} ${effort}: ${report.status} · $${report.costUsd} · calls ${report.calls.length} · ${report.calls.map((c) => Math.round(c.elapsedMs / 1000) + "s").join("+")} · script: ${plan.script}`);
