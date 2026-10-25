import { z } from "zod";
import {world3dSchema} from "./scene3d";
import {visualConceptSchema,assemblyPlanSchema} from "./visual-contract";
import {netcodeSchema} from "./netcode";
import {illustratedSchema} from "./illustrated";
import {isometricSchema} from "./isometric";
import {productionSettingsSchema,wordsPerSecond,type ProjectLanguage} from "./quality-contract";
import {creatorBrandingSchema} from "./creator-branding";
import {creatorOutroSchema,profileOutroSchema} from "./xtuned-outro";
import {mediaAssetSchema} from "./media-contract";
import {backgroundDesignSchema} from "./backgrounds";
import {musicBedSchema} from "./music-bed-schema";

export const diagramNodeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,23}$/),
  label: z.string().min(1).max(24),
  kind: z.enum([
    "server",
    "database",
    "user",
    "cache",
    "queue",
    "worker",
    "storage",
    "cdn",
    "card",
    "log",
  ]),
  row: z.number().int().min(0).max(1),
  col: z.number().int().min(0).max(2),
  // Optional list/table card: column headings from the checked script and schematic rows without values.
  list: z.object({
    columns: z.array(z.string().min(1).max(14)).min(1).max(3),
    rows: z.number().int().min(2).max(4),
  }).optional(),
});
// Absent kind keeps the legacy purple link. request/reply/reference are explicit, distinguishable tones.
export const diagramEdgeKinds = ["request", "reply", "reference"] as const;
export const diagramEdgeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,23}$/),
  from: z.string(),
  to: z.string(),
  kind: z.enum(diagramEdgeKinds).optional(),
});
export const diagramSchema = z.object({
  nodes: z.array(diagramNodeSchema).min(1).max(6),
  edges: z.array(diagramEdgeSchema).max(7),
});
export const visualBeatSchema = z.object({
  at: z.number().min(0).max(30),
  cue: z.string().max(32),
  cueOccurrence: z.number().int().min(1).max(100).optional(),
  action: z.enum(["reveal", "highlight", "hide", "connect"]),
  target: z.string().max(24),
  description: z.string().max(180),
});
export const sceneSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(48),
  subtitle: z.string().max(105),
  narration: z.string().max(300),
  visual: z.enum([
    "flow",
    "code",
    "compare",
    "checklist",
    "timeline",
    "spotlight",
  ]),
  items: z.array(z.string().max(48)).min(1).max(4),
  seconds: z.number().min(3).max(30),
  visualDescription: z.string().max(600).optional(),
  diagram: diagramSchema.optional(),
  beats: z.array(visualBeatSchema).max(14).optional(),
  sourceFactIds: z.array(z.string().max(24)).max(8).optional(),
  history: z.object({
    era: z.string().max(36),
    mode: z.enum(["hook","telegraph","inventors","bell","patent","call","wave","network","exchange","dial","distance","mobile","legacy"]),
    imageId: z.enum(["bell-1876","bell-drawing","operators-1928","operators-1937","bell-longdistance-1892"]).optional(),
    imageCaption: z.string().max(110),
  }).optional(),
});
/** Film kinds the script role may name (unchanged since 2026-10-19: its JSON schema stays byte-identical). */
export const SCRIPT_FILM_KINDS=["explainer","telephone-history","three","netcode","illustrated"] as const;
/** isometric is applied by the project (profile.filmKind) after the measured speech exists, never chosen by the script. */
export const FILM_KINDS=[...SCRIPT_FILM_KINDS,"isometric"] as const;
export const headerAvatarSchema=z.object({file:z.string().regex(/^[a-f0-9-]{36}\/branding\/[a-zA-Z0-9_-]+\.png$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
export const storyboardSchema = z.object({
  title: z.string().min(1).max(72),
  filmKind: z.enum(FILM_KINDS).optional(),
  world3d: world3dSchema.optional(),
  visualConcept: visualConceptSchema.optional(),
  assemblies: assemblyPlanSchema.optional(),
  netcode: netcodeSchema.optional(),
  illustrated: illustratedSchema.optional(),
  // isometric/v1 (2026-10-21): the «Изометрия» city renderer; validated JSON only (src/lib/isometric.ts).
  isometric: isometricSchema.optional(),
  creatorBranding: creatorBrandingSchema.optional(),
  creatorOutro: creatorOutroSchema.optional(),
  // Loop ending (2026-10-22): set by the worker before TTS for projects with production.ending="loop". The take ends with a
  // sentence-length pause (no outro tail, frame-exact clock), the director lands on the first frame, the music cycles.
  loopEnding: z.object({version: z.literal(1)}).optional(),
  // Editor-chosen header avatar, snapshotted into the project with its SHA-256 (any film kind that draws the header).
  headerAvatar: headerAvatarSchema.optional(),
  // Real logos / people photos snapshotted into the project (2026-10-21, src/lib/media-assets.ts) for logo-tile/person-tile.
  media: z.array(mediaAssetSchema).max(16).optional(),
  summary: z.string().max(200),
  factNotes: z.string().max(500),
  scenes: z.array(sceneSchema).min(4).max(24),
});
export type Storyboard = z.infer<typeof storyboardSchema>;
export const profileSchema = z.object({
  backgroundDesign:backgroundDesignSchema.optional(),
  // Mandatory background music (user decision 2026-10-20): chosen once at creation, snapshotted with its generator.
  musicBed:musicBedSchema.optional(),
  creatorOutro:profileOutroSchema.optional(),
  // A template-provided avatar for the film header (illustrated-scene/v2); snapshotted at creation.
  headerAvatar:headerAvatarSchema.optional(),
  production: productionSettingsSchema.optional(),
  renderMode:z.enum(["2d","three"]).optional(),
  filmKind:z.enum(["illustrated","isometric"]).optional(),
  modelSnapshot:z.string().regex(/^[a-f0-9]{64}$/).optional(),
  authorReference:z.object({id:z.string().uuid(),username:z.string().max(30),name:z.string().max(80).optional(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).optional(),
  productionTemplate: z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),version:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).optional(),
  template: z.enum(["studio", "explainer"]).optional(),
  username: z
    .string()
    .max(32)
    .regex(/^@[A-Za-z0-9_.-]{1,31}$/)
    .optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font: z.enum(["Manrope", "Inter"]),
  hookRules: z.array(z.string().max(240)).max(12),
  writingRules: z.array(z.string().max(240)).max(12),
  visualRules: z.array(z.string().max(240)).max(12),
  avoid: z.array(z.string().max(240)).max(12),
  examples: z.array(z.string().max(500)).max(6),
});
export type StyleProfile = z.infer<typeof profileSchema>;
export const defaultProfile: StyleProfile = {
  name: "Студийный",
  description:
    "Чёткие объяснения на простых примерах. Базовый стиль студии; материалы автора ещё не добавлены.",
  background: "#101B2D",
  foreground: "#F3F6FC",
  accent: "#A9C9FF",
  font: "Manrope",
  hookRules: ["Начни с понятной проблемы или короткого вопроса."],
  writingRules: [
    "Одна мысль на сцену.",
    "Объясняй термин через знакомый пример.",
    "Короткие разговорные фразы на русском.",
    "Не выдумывай статистику и результаты.",
  ],
  visualRules: [
    "Крупные заголовки и высокий контраст.",
    "Показывай процесс по шагам.",
    "Движение подчёркивает смысл фразы.",
  ],
  avoid: ["Канцелярит", "Перегруженные схемы"],
  examples: [],
};

export function normalizePlan(
  input: unknown,
  duration: number,
  voice: boolean,
  narrationBudgetSeconds = duration,
  language: ProjectLanguage = "ru",
): Storyboard {
  if (!Number.isFinite(narrationBudgetSeconds) || narrationBudgetSeconds < duration || narrationBudgetSeconds > 180) throw new Error("Некорректный бюджет озвучки.");
  const p = storyboardSchema.parse(input);
  if(p.creatorBranding&&(p.filmKind!=="three"||p.creatorBranding.outro.sceneId!==`scene-${p.scenes.length}`))throw new Error("Заставка автора требует последней сцены 3D-ролика.");
  if(p.creatorOutro&&(p.creatorOutro.sceneId!==`scene-${p.scenes.length}`||p.scenes.at(-1)!.narration.replace(/\s+/g," ").trim()!==p.creatorOutro.spoken))throw new Error("Заставка @xtuned должна быть последней сценой с неизменённой фразой.");
  const raw = p.scenes.reduce((n, s) => n + s.seconds, 0);
  // Loop films keep their frame-exact measured clock (not whole seconds); integer durations are unchanged.
  const frames = Math.round(duration * 30);
  let used = 0;
  p.scenes = p.scenes.map((s, i) => {
    const count =
      i === p.scenes.length - 1
        ? frames - used
        : Math.round((s.seconds / raw) * frames);
    used += count;
    return {
      ...s,
      id: `scene-${i + 1}`,
      seconds: count / 30,
      ...(s.beats
        ? {
            beats: s.beats.map((b) => ({
              ...b,
              at: Math.min(count / 30 - 0.3, (b.at * (count / 30)) / s.seconds),
            })),
          }
        : {}),
    };
  });
  if (voice) {
    const words = p.scenes.reduce(
      (n, s) => n + s.narration.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
    if (words > narrationBudgetSeconds * wordsPerSecond(language, true))
      throw new Error(
        `Сценарий слишком длинный: ${words} слов. Нужно сократить текст для ${narrationBudgetSeconds} секунд.`,
      );
  }
  return p;
}
export function sceneClock(p: Storyboard) {
  let start = 0;
  return p.scenes.map((s) => {
    const out = {
      ...s,
      start,
      end: start + s.seconds,
      startFrame: Math.round(start * 30),
      frames: Math.round(s.seconds * 30),
    };
    start += s.seconds;
    return out;
  });
}
export const planJsonSchema = z.toJSONSchema(storyboardSchema);
export const profileJsonSchema = z.toJSONSchema(
  profileSchema.omit({ template: true, username: true, productionTemplate: true, authorReference:true, renderMode:true, filmKind:true, modelSnapshot:true, creatorOutro:true, headerAvatar:true }),
);
