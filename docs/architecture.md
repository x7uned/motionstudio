# Architecture

The studio is one chat-agent skill (`.agents/skills/motion-studio/SKILL.md`) with a CLI, and runs on macOS, Windows 10/11 and Linux. The Next.js web UI was removed on 2026-10-30 (user decision); its code is kept only in the git tag `web-ui-final`. There is no web server and no HTTP API.

- **CLI:** `npm run studio -- <cmd>` → `scripts/studio.ts` (engine control, create/run/agent tasks, approve, templates) and `scripts/studio-commands.ts` (every action of the former UI routes, with the same guards: list, events, scenes, review, revise, report, compare, profile, health, models, apify, voices, refs, style refs).
- **Engine:** `scripts/worker.ts`, one long-lived Node process started with `npm run studio -- start` (or `start --foreground`) and stopped with `npm run studio -- stop`. Expensive jobs never depend on a chat or terminal call staying open. One process per workspace: `data/worker.lock`; heartbeat every 5 s in `data/worker.beat`; graceful stop through `data/engine.stop` (on Windows signals are hard kills, so the stop file is the normal way). Jobs run in parallel; only local rendering takes the render slot.
- **State:** SQLite WAL (`data/studio.sqlite`) is the source of truth; jobs are atomically claimed in FIFO order with rowid as a timestamp tie breaker.
- **OS layer:** `src/lib/platform.ts` resolves FFmpeg, Python venvs, Chrome, Tavily, Codex and Claude per OS (optional `STUDIO_*` overrides in `.env.local`). `src/lib/remotion-bundle.ts` makes a Remotion bundle whose public folder is the live project folder on every OS; on Windows it uses a directory junction (no admin rights) because Remotion would otherwise copy the folder once.
- **Setup:** `npm install` → `npm run setup` (`scripts/setup.mjs`: Python venvs, FFmpeg, Remotion headless Chrome, heavy assets; safe to run again; never touches secrets).
- **Heavy style assets:** music-bed WAVs, reference MP4s and source archives are not in git. `assets/manifest.json` lists them with SHA-256; `npm run assets -- status|fetch` (`scripts/assets.mjs`) downloads and verifies them from the GitHub Release. Existing files are never overwritten.

## Pipeline

Original (legacy) pipeline, still used by `create --engine legacy` and old projects. In agent mode every LLM role goes to the driving chat agent instead ([agent-mode.md](agent-mode.md)); newer quality steps are in [quality-pipeline.md](quality-pipeline.md).

1. Snapshot the active style profile; validate topic, format, duration, voice.
2. Use the local authenticated Codex CLI for JSON constrained by a schema. Normalize scene boundaries to exact 30 fps frames. Save the script and context. Generated code is never used as a render entrypoint.
3. Synthesize Russian speech per scene with Edge TTS. Decode PCM, trim only edge silence, measure each clip, fit within its scene with at most 1.2× tempo. Preserve breathing room. Fail with a request to shorten the scene if speech does not fit.
4. Generate a quiet procedural bed and boundary accents. Master to -16 LUFS and place speech using the same scene clock.
5. Bundle and render a fixed Remotion composition with system Chrome. Render portrait natively at 1080×1920 or landscape at 1920×1080, not by cropping a horizontal composition.
6. Export H.264 yuv420p BT.709 limited + AAC 48 kHz with faststart. Fully decode the actual file, inspect duration/dimensions/frame count, measure loudness and true peak, check narration bounds.
7. Render a frame from every scene and ask Codex to critique the contact sheet and script. This checks static readability and structure, not playback. A final editor decision controls approval.

## Boundaries

- All media is stored under this workspace as plain files (`data/projects/<id>`, `archive/`, reference folders). The agent and the user open them from disk; there is no asset route.
- CLI commands parameterize SQLite queries, bound topic/transcript/upload sizes, validate image content with Sharp, validate JSON with schemas, and use random file IDs.
- Codex calls use fixed spawn arguments, read-only sandbox, ephemeral runs and schema validation. No shell interpolation. Tools for shell, browser, computer, apps and delegation are disabled for the generation adapter. Account credentials remain in the existing Codex installation. Each request uses an isolated temporary working directory and removes inherited CODEX_* execution/session metadata except CODEX_HOME. Preserve this boundary: a long-lived local service must not reuse the chat tool pipe or tool-call identity.
- The studio opens no network service at all (no port, no web server). Public hosting and multi-user authorization would require a separate deployment design.
- A render or model-review error is shown explicitly. A new render is required after script edits. Human approval is distinct from technical pass.
- Existing project profiles are immutable snapshots. Updating the current profile affects future projects.

## Commands (former API)

All via `npm run studio -- …`:

- `list [--all]`, `status [id]`: projects, jobs and engine state. `health`: actual tool/auth availability.
- `events <id>`: project log.
- `create …`, `scenes <id> show|export|save <file>` (former «save»), `retry <id>`, `cancel <id>`, `approve <id> --quote "…"`, `revise <id> --feedback "…"`, `review <id>` (review-only job on the finished MP4).
- `profile get|set <file>`: style profile. `style analyze --agent "…"` (or `--engine legacy`): extract rules.
- `style refs list|add <files…>|add --text-file <file> --name "…"|archive <id>|restore <id>`: style reference materials (former upload of `file` or `name` + `text`).
- Media files are read from disk (former `/api/assets`).

## Extension points

Replace `src/lib/provider.ts` for a different script/image-analysis provider. Keep schema validation and context provenance. Replace `scripts/speech.py` for a different TTS provider; preserve measured alignment. Add visual templates to `renderer/index.tsx`; keep deterministic rendering from frame time. Add publishing as a separate job only after editor approval.
