# Architecture

Next.js App Router provides the local UI and route handlers. A separate long-lived Node worker performs expensive jobs; generation is not tied to an HTTP request lifetime. SQLite WAL is the source of truth; jobs are atomically claimed in FIFO order with rowid as a timestamp tie breaker. A process lock prevents duplicate workers for the same workspace.

## Pipeline

1. Snapshot the active style profile; validate topic, format, duration, voice.
2. Use the local authenticated Codex CLI for JSON constrained by a schema. Normalize scene boundaries to exact 30 fps frames. Save the script and context. Generated code is never used as a render entrypoint.
3. Synthesize Russian speech per scene with Edge TTS. Decode PCM, trim only edge silence, measure each clip, fit within its scene with at most 1.2× tempo. Preserve breathing room. Fail with a request to shorten the scene if speech does not fit.
4. Generate a quiet procedural bed and boundary accents. Master to -16 LUFS and place speech using the same scene clock.
5. Bundle and render a fixed Remotion composition with system Chrome. Render portrait natively at 1080×1920 or landscape at 1920×1080, not by cropping a horizontal composition.
6. Export H.264 yuv420p BT.709 limited + AAC 48 kHz with faststart. Fully decode the actual file, inspect duration/dimensions/frame count, measure loudness and true peak, check narration bounds.
7. Render a frame from every scene and ask Codex to critique the contact sheet and script. This checks static readability and structure, not playback. A final editor decision controls approval.

## Boundaries

- All media is stored under this workspace. Range-aware `/api/assets/[...path]` supports video seeking. It allows only media/document extensions inside archive or project/reference folders and checks real paths against the workspace root.
- Mutations validate local Host and Origin, parameterize SQLite queries, bound topic/transcript/upload sizes, validate image content with Sharp, and use random file IDs.
- Codex calls use fixed spawn arguments, read-only sandbox, ephemeral runs and schema validation. No shell interpolation. Tools for shell, browser, computer, apps and delegation are disabled for the generation adapter. Account credentials remain in the existing Codex installation. Each request uses an isolated temporary working directory and removes inherited CODEX_* execution/session metadata except CODEX_HOME. Preserve this boundary: a long-lived local service must not reuse the chat tool pipe or tool-call identity.
- The service binds to 127.0.0.1; public hosting and multi-user authorization require a separate deployment design.
- A render or model-review error is shown explicitly. A new render is required after script edits. Human approval is distinct from technical pass.
- Existing project profiles are immutable snapshots. Updating the current profile affects future projects.

## API

- `GET /api/studio`: current projects, jobs, active references and profile.
- `GET /api/studio?health=1`: actual tool/auth availability.
- `GET /api/studio?events=<project-id>`: project log.
- `POST /api/studio`: JSON actions `create`, `save`, `retry`, `cancel`, `approve`, `revise`, `profile`, `analyze`, `archiveReference`, `restoreReference`.
- `POST /api/references`: multipart `file` or `name` + `text`.
- `GET /api/assets/<relative-path>`: bounded streaming with Range support and optional `?download=1`.

## Extension points

Replace `src/lib/provider.ts` for a different script/image-analysis provider. Keep schema validation and context provenance. Replace `scripts/speech.py` for a different TTS provider; preserve measured alignment. Add visual templates to `renderer/index.tsx`; keep deterministic rendering from frame time. Add publishing as a separate job only after editor approval.
