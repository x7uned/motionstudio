#!/usr/bin/env node
// One-time setup of a fresh clone on macOS, Linux or Windows 10/11:  npm install  →  npm run setup
// Creates the Python venvs (edge-tts; Tavily CLI), provides FFmpeg, downloads Remotion's headless Chrome and the heavy
// style assets from the GitHub Release. Safe to run again: finished steps are skipped. Secrets are never touched —
// keys go only into .env.local by the user (see .env.example).
//   node scripts/setup.mjs [--no-assets] [--no-browser] [--no-tavily]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIN = process.platform === "win32";
const args = new Set(process.argv.slice(2));
const venvBin = (venv, name) => (WIN ? path.join(venv, "Scripts", `${name}.exe`) : path.join(venv, "bin", name));
const step = (s) => console.log(`\n▸ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const warn = (s) => console.log(`  ! ${s}`);
const sh = (cmd, a, opts = {}) => spawnSync(cmd, a, {cwd: ROOT, encoding: "utf8", windowsHide: true, env: {...process.env, PYTHONUTF8: "1"}, ...opts});
let problems = 0;

// Node: node:sqlite without a flag needs 22.13+.
step("Node.js");
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 13)) { console.error(`  ✗ Нужен Node.js 22.13 или новее (сейчас ${process.versions.node}). Установите LTS с nodejs.org и повторите.`); process.exit(1); }
ok(`Node ${process.versions.node}`);
if (!fs.existsSync(path.join(ROOT, "node_modules", "remotion"))) { console.error("  ✗ Сначала: npm install"); process.exit(1); }

// Python 3.10+: Windows usually has the `py` launcher; `python3` there is often the Store stub.
step("Python");
// Newest first; macOS ships an old /usr/bin/python3 (3.9), Homebrew installs python3.1x.
const minors = [14, 13, 12, 11, 10];
const posix = [...minors.map((m) => [`python3.${m}`]), ...minors.map((m) => [`/opt/homebrew/bin/python3.${m}`]), ...minors.map((m) => [`/usr/local/bin/python3.${m}`]), ["python3"], ["python"]];
const candidates = process.env.STUDIO_PYTHON_BOOTSTRAP ? [[process.env.STUDIO_PYTHON_BOOTSTRAP]] : WIN ? [["py", "-3"], ["python"], ["python3"]] : posix;
let python = null;
for (const [cmd, ...pre] of candidates) {
  const r = sh(cmd, [...pre, "-c", "import sys;print('%d.%d'%sys.version_info[:2])"]);
  const v = (r.stdout || "").trim().split(".").map(Number);
  if (r.status === 0 && (v[0] > 3 || (v[0] === 3 && v[1] >= 10))) { python = [cmd, ...pre]; ok(`${[cmd, ...pre].join(" ")} → Python ${v.join(".")}`); break; }
}
if (!python) warn("Python 3.10+ не найден (macOS: brew install python; Windows: python.org с «Add python.exe to PATH»; или STUDIO_PYTHON_BOOTSTRAP=<путь>)");
function venv(dir, packages, label) {
  const py = venvBin(dir, "python");
  if (!fs.existsSync(py)) {
    if (!python) { warn(`${label}: нет Python 3.10+ (python.org; на Windows отметьте «Add python.exe to PATH»)`); problems++; return; }
    const r = sh(python[0], [...python.slice(1), "-m", "venv", dir], {stdio: "inherit"});
    if (r.status !== 0) { warn(`${label}: не удалось создать ${path.relative(ROOT, dir)}`); problems++; return; }
  }
  const r = sh(py, ["-m", "pip", "install", "--disable-pip-version-check", "-q", ...packages], {stdio: "inherit"});
  if (r.status === 0) ok(`${label}: ${packages.join(", ")} в ${path.relative(ROOT, dir)}`); else { warn(`${label}: pip install не прошёл`); problems++; }
}
venv(path.join(ROOT, ".runtime", "venv"), ["edge-tts==7.3.1"], "Речь");
if (!args.has("--no-tavily")) venv(path.join(ROOT, ".runtime", "research"), ["tavily-cli==0.1.8"], "Исследование (Tavily CLI)");

// FFmpeg: STUDIO_FFMPEG → bin/ffmpeg(.exe) → PATH → download a static GPL build (libx264, loudnorm/ebur128).
step("FFmpeg");
const exe = WIN ? "ffmpeg.exe" : "ffmpeg";
const local = path.join(ROOT, "bin", exe);
const onPath = () => { const r = sh(WIN ? "where" : "which", ["ffmpeg"]); return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : ""; };
let ffmpeg = process.env.STUDIO_FFMPEG || (fs.existsSync(local) ? local : onPath());
if (!ffmpeg) {
  const name = `ffmpeg-${process.platform}-${process.arch}.gz`;
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${name}`;
  console.log(`  скачиваю ${url}`);
  try {
    const res = await fetch(url, {redirect: "follow"});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bin = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
    fs.mkdirSync(path.dirname(local), {recursive: true});
    fs.writeFileSync(`${local}.part`, bin, {mode: 0o755});
    fs.renameSync(`${local}.part`, local);
    ffmpeg = local;
  } catch (e) { warn(`не удалось скачать FFmpeg (${e.message}). Установите сами (Windows: winget install Gyan.FFmpeg) или задайте STUDIO_FFMPEG в .env.local.`); problems++; }
}
if (ffmpeg) {
  const enc = sh(ffmpeg, ["-hide_banner", "-encoders"]).stdout || "", fil = sh(ffmpeg, ["-hide_banner", "-filters"]).stdout || "";
  const missing = [["libx264", enc], ["loudnorm", fil], ["ebur128", fil]].filter(([k, t]) => !t.includes(k)).map(([k]) => k);
  if (missing.length) { warn(`${ffmpeg}: нет ${missing.join(", ")} — нужен GPL-билд FFmpeg`); problems++; } else ok(ffmpeg);
}

// Remotion's headless Chrome for this OS (node_modules/.remotion/...).
if (!args.has("--no-browser")) {
  step("Chrome для рендера (Remotion)");
  const r = sh(process.execPath, ["--input-type=module", "-e", "import {ensureBrowser} from '@remotion/renderer'; await ensureBrowser({chromeMode:'headless-shell'});"], {stdio: "inherit"});
  if (r.status === 0) ok("chrome-headless-shell"); else { warn("ensureBrowser не прошёл: npm run browser:install"); problems++; }
}

// Heavy style assets (music-bed WAVs, reference MP4s) from the GitHub Release, verified by SHA-256.
if (!args.has("--no-assets")) {
  step("Тяжёлые файлы стилей (GitHub Release)");
  const r = sh(process.execPath, [path.join(ROOT, "scripts", "assets.mjs"), "fetch"], {stdio: "inherit"});
  if (r.status !== 0) { warn("не все файлы скачаны: npm run assets -- fetch"); problems++; }
}

step("Готово");
if (!fs.existsSync(path.join(ROOT, ".env.local"))) console.log("  Ключи (ElevenLabs, по желанию Apify) пользователь кладёт сам в .env.local — образец: .env.example.");
console.log(problems ? `  Есть замечания: ${problems}. Остальное готово.` : "  Всё готово.");
console.log("  Проверка: npm run studio -- status   ·   движок: npm run studio -- start");
process.exit(problems ? 2 : 0);
