import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
// Compatibility launcher (2026-10-21): UI + engine together, as before. The skill itself uses
// `npm run studio -- start` (engine only) and `npm run studio -- ui` (UI on request).
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
let configuredPort;
try { configuredPort = JSON.parse(fs.readFileSync("studio.config.json", "utf8"))?.ui?.port; } catch {}
const port = process.env.PORT || String(configuredPort || 3210);
const engineRunning = (() => {
  try { const pid = Number(fs.readFileSync(path.join("data", "worker.lock"), "utf8")); process.kill(pid, 0); return pid; }
  catch (e) { return e?.code === "EPERM" ? -1 : 0; }
})();
const dev = process.argv.includes("--dev");
const free = await new Promise((resolve) => {
  const s = net.createServer();
  s.once("error", () => resolve(false));
  s.listen(Number(port), "127.0.0.1", () => s.close(() => resolve(true)));
});
if (!free) {
  console.error(
    `Порт ${port} занят. Откройте http://127.0.0.1:${port} или задайте PORT=3211.`,
  );
  process.exit(1);
}
if (!dev && !fs.existsSync(".next/BUILD_ID")) {
  console.error("Сначала выполните npm run build.");
  process.exit(1);
}
const ui = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    dev ? "dev" : "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { stdio: "inherit", env: process.env },
);
const children = [ui];
if (engineRunning) console.log(`Движок уже запущен отдельно (pid ${engineRunning}); запускаем только UI.`);
else {
  const engine = spawn(process.execPath, ["--import", "tsx", "scripts/worker.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  children.push(engine);
  // The engine can be stopped and restarted on its own (npm run studio -- stop/start); the UI keeps serving.
  engine.on("exit", (code) => { if (!closing) console.log(`Движок остановлен (код ${code ?? 0}); UI продолжает работать. Запуск: npm run studio -- start`); });
}
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  const exits = children.map(
    (p) =>
      new Promise((resolve) =>
        p.exitCode !== null ? resolve(null) : p.once("exit", resolve),
      ),
  );
  for (const p of children) p.kill("SIGTERM");
  const timer = setTimeout(() => {
    for (const p of children) p.kill("SIGKILL");
    process.exit(code);
  }, 8000);
  Promise.all(exits).then(() => {
    clearTimeout(timer);
    process.exit(code);
  });
}
ui.on("exit", (code) => close(code || 0));
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
console.log(`Motion Studio → http://127.0.0.1:${port}`);
