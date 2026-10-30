// One place for OS differences (macOS, Linux, Windows 10/11). The studio is a skill: it must run from a plain clone
// on any of them, so binaries are resolved here instead of hard-coded macOS paths.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export const IS_WIN = process.platform === "win32";

// STUDIO_* tool overrides (STUDIO_FFMPEG, STUDIO_PYTHON, STUDIO_CHROME, STUDIO_TAVILY, STUDIO_CODEX, STUDIO_CLAUDE) may live
// in .env.local next to the secrets; only these non-secret keys are copied into this process, so every command (not
// only the engine) sees the same tools.
try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const file = parseEnv(fs.readFileSync(path.join(root, ".env.local"), "utf8"));
  for (const [k, v] of Object.entries(file)) if (/^STUDIO_[A-Z]+$/.test(k) && process.env[k] === undefined) process.env[k] = v;
} catch {}
const EXE = IS_WIN ? ".exe" : "";

/** Interpreter or console script inside a Python venv: <venv>/bin/x on POSIX, <venv>\Scripts\x.exe on Windows. */
export function venvBin(venv: string, name: string) {
  return IS_WIN ? path.join(venv, "Scripts", `${name}.exe`) : path.join(venv, "bin", name);
}

/** First executable named `name` on PATH (also tries .exe/.cmd on Windows), or "". */
export function onPath(name: string, env: NodeJS.ProcessEnv = process.env) {
  const dirs = String(env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const exts = IS_WIN ? (env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";").map((e) => e.toLowerCase()) : [""];
  for (const dir of dirs)
    for (const ext of exts) {
      const p = path.join(dir, name + ext);
      try { if (fs.statSync(p).isFile()) return p; } catch {}
    }
  return "";
}

/** A local tool in <root>/bin (ffmpeg, ffmpeg.exe), else the one on PATH, else the expected local path. */
export function localTool(root: string, name: string, override?: string) {
  if (override) return override;
  const local = path.join(root, "bin", name + EXE);
  if (fs.existsSync(local)) return local;
  return onPath(name) || local;
}

/** Remotion's own chrome-headless-shell download for this OS (npm run browser:install). */
export function remotionChrome(root: string) {
  const base = path.join(root, "node_modules", ".remotion", "chrome-headless-shell");
  if (IS_WIN) return path.join(base, "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe");
  if (process.platform === "linux")
    return process.arch === "arm64"
      ? path.join(base, "linux-arm64", "chrome-headless-shell-linux-arm64", "headless_shell")
      : path.join(base, "linux64", "chrome-headless-shell-linux64", "chrome-headless-shell");
  return path.join(base, `mac-${process.arch}`, `chrome-headless-shell-mac-${process.arch}`, "chrome-headless-shell");
}

/**
 * PATH for child processes. Homebrew is added only on macOS; the separator is the OS one. On Windows the variable may be
 * spelled `Path`, so the existing key is replaced rather than duplicated.
 */
export function childPath(env: NodeJS.ProcessEnv = process.env) {
  const current = String(env.PATH ?? env.Path ?? "");
  if (process.platform !== "darwin") return current;
  return ["/opt/homebrew/bin", "/usr/bin", "/bin", current].filter(Boolean).join(path.delimiter);
}
export function withChildPath(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out = { ...env };
  const value = childPath(env);
  for (const k of Object.keys(out)) if (k.toUpperCase() === "PATH") delete out[k];
  out[IS_WIN ? "Path" : "PATH"] = value;
  return out;
}

/** Variables Windows needs in every child (Winsock, TLS, temp dirs) even when the env is otherwise minimal. */
export function systemEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!IS_WIN) return {};
  const keep = ["SystemRoot", "SYSTEMROOT", "windir", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "PATHEXT", "ComSpec", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"];
  return Object.fromEntries(keep.filter((k) => env[k] !== undefined).map((k) => [k, env[k]]));
}

/** Python must read and write UTF-8 (Russian text) whatever the Windows code page is. */
export const PYTHON_UTF8 = { PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" } as const;

/** fs.renameSync with short retries: on Windows antivirus/indexer can hold a just-written file for a moment. */
export function renameRetry(from: string, to: string) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(from, to); return; } catch (e: any) {
      if (!IS_WIN || i >= 8 || !["EPERM", "EBUSY", "EACCES"].includes(e?.code)) throw e;
      const until = Date.now() + 25 * (i + 1);
      while (Date.now() < until) {}
    }
  }
}
export async function renameRetryAsync(from: string, to: string) {
  const fsp = await import("node:fs/promises");
  for (let i = 0; ; i++) {
    try { await fsp.rename(from, to); return; } catch (e: any) {
      if (!IS_WIN || i >= 8 || !["EPERM", "EBUSY", "EACCES"].includes(e?.code)) throw e;
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
}

/**
 * A command may be a JavaScript file (an override like STUDIO_CODEX=…/codex.js, a test stub, an npm shim's entry):
 * run it with this Node. Windows cannot spawn .cmd shims or shebang scripts without a shell.
 */
export function spawnTarget(command: string, args: string[]): [string, string[]] {
  return /\.(?:c|m)?js$/i.test(command) ? [process.execPath, [command, ...args]] : [command, args];
}
