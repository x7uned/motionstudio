// Re-apply the deterministic contract (issues → repair → resolve) to the saved model answer of a run, without a new
// Claude call (after a repair-rule change). Uses call-2/answer.json when the run needed its one retry.
//   node replan.mjs <run-dir-name>…
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { issues, repair, resolve } from "./contract.mjs";
import { fromTake, estimate } from "./timing.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), TOPICS = JSON.parse(fs.readFileSync(HERE + "topics.json", "utf8"));
for (const name of process.argv.slice(2)) {
  const dir = HERE + "runs/" + name + "/", report = JSON.parse(fs.readFileSync(dir + "report.json", "utf8")), topic = TOPICS[report.topic];
  const fixedScript = topic.narration ? fs.readFileSync(path.resolve(HERE, topic.narration), "utf8").trim() : null;
  const answer = JSON.parse(fs.readFileSync(dir + (fs.existsSync(dir + "call-2/answer.json") ? "call-2" : "call-1") + "/answer.json", "utf8"));
  const timingFor = (s) => (topic.words ? fromTake(path.resolve(HERE, topic.words)) : estimate(s));
  let ctx = { fixedScript, timing: timingFor(answer.script) };
  const { plan, log } = repair(answer, ctx); ctx = { fixedScript, timing: timingFor(plan.script) };
  const left = issues(plan, ctx);
  report.repairFinal = log; report.remainingFinal = left;
  fs.writeFileSync(dir + "plan.json", JSON.stringify(plan, null, 2));
  fs.writeFileSync(dir + "timing.json", JSON.stringify(ctx.timing, null, 2));
  fs.writeFileSync(dir + "resolved.json", JSON.stringify(resolve(plan, ctx.timing), null, 2));
  fs.writeFileSync(dir + "report.json", JSON.stringify(report, null, 2));
  console.log(name, left.length ? left : "ok", log);
}
