import { z } from "zod";
import {findCue,cueCount} from "./word-cues";
import {
  storyboardSchema,
  SCRIPT_FILM_KINDS,
  diagramSchema,
  visualBeatSchema,
  sceneSchema,
  sceneClock,
  type Storyboard,
} from "./model";
export type Source = {
  id: string;
  title: string;
  url: string;
  content: string;
  retrievedAt: string;
};
const ref = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/);
export const researchSchema = z.object({
  summary: z.string().min(20).max(700),
  facts: z
    .array(
      z.object({
        id: ref,
        claim: z.string().max(350),
        whyInteresting: z.string().max(240),
        caveat: z.string().max(280),
        evidence: z
          .array(
            z.object({ sourceId: ref, quote: z.string().min(12).max(360) }),
          )
          .min(1)
          .max(3),
      }),
    )
    .min(4)
    .max(16),
  disputed: z.array(z.string().max(300)).max(6),
  angles: z
    .array(
      z.object({
        id: ref,
        title: z.string().max(100),
        why: z.string().max(240),
      }),
    )
    .length(3),
  hooks: z
    .array(
      z.object({
        id: ref,
        text: z.string().min(3).max(110),
        family: z.string().max(60),
        factIds: z.array(ref).min(1).max(3),
        why: z.string().max(180),
      }),
    )
    .length(10),
  selectedAngleId: ref,
  selectedHookId: ref,
  selectionReason: z.string().max(400),
});
export type Research = z.infer<typeof researchSchema>;
export const directedSceneSchema = sceneSchema.extend({
  visualDescription: z.string().min(20).max(600),
  diagram: diagramSchema,
  beats: z.array(visualBeatSchema).min(2).max(12),
  sourceFactIds: z.array(ref).min(1).max(6),
});
export const scriptPackageSchema = z.object({
  // The script never writes an isometric plan; omitting it keeps this role's JSON schema byte-identical.
  plan: storyboardSchema.omit({world3d:true,isometric:true}).extend({
    filmKind: z.enum(SCRIPT_FILM_KINDS).optional(),
    scenes: z.array(directedSceneSchema).min(4).max(24),
  }),
  selectedHookId: ref,
  angleId: ref,
  caption: z.string().max(350),
  audit: z.object({
    hookSupported: z.boolean(),
    factsSupported: z.boolean(),
    oneExample: z.boolean(),
    naturalRussian: z.boolean(),
    notes: z.array(z.string().max(250)).max(6),
  }),
});
export type ScriptPackage = z.infer<typeof scriptPackageSchema>;
const norm = (s: string) =>
  s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export function validateResearch(r: Research, sources: Source[]) {
  const seen = new Set<string>();
  for (const item of [...r.facts, ...r.hooks, ...r.angles]) {
    if (seen.has(item.id)) throw new Error("Повтор ID исследования");
    seen.add(item.id);
  }
  for (const f of r.facts)
    for (const e of f.evidence) {
      const s = sources.find((s) => s.id === e.sourceId);
      if (!s || !norm(s.content).includes(norm(e.quote)))
        throw new Error(
          `Факт ${f.id}: цитата не найдена в прочитанном источнике ${e.sourceId}`,
        );
    }
  for (const h of r.hooks)
    if (h.factIds.some((id) => !r.facts.some((f) => f.id === id)))
      throw new Error("Хук ссылается на отсутствующий факт");
  if (
    !r.hooks.some((h) => h.id === r.selectedHookId) ||
    !r.angles.some((a) => a.id === r.selectedAngleId)
  )
    throw new Error("Не выбран существующий хук/угол");
  return r;
}
export function validateDirectedPlan(plan: Storyboard, r: Research) {
  for (const s of plan.scenes) {
    if (!s.diagram || !s.beats?.length || !s.sourceFactIds?.length)
      throw new Error("Сцене нужен визуальный план и факты");
    const nodes = s.diagram.nodes,
      edges = s.diagram.edges;
    const ids = [...nodes, ...edges].map((n) => n.id);
    if (
      new Set(ids).size !== ids.length ||
      new Set(nodes.map((n) => `${n.row}:${n.col}`)).size !== nodes.length
    )
      throw new Error("Узлы схемы пересекаются или имеют одинаковые ID");
    if (
      edges.some(
        (e) =>
          e.from === e.to ||
          !nodes.some((n) => n.id === e.from) ||
          !nodes.some((n) => n.id === e.to),
      )
    )
      throw new Error("Связь ссылается на отсутствующий узел");
    if (s.sourceFactIds.some((id) => !r.facts.some((f) => f.id === id)))
      throw new Error("Сцена ссылается на отсутствующий факт");
    // Superset: English contractions (don't) are also valid whole-word cues; split parts stay valid as before.
    const spokenWords:string[] = [...(norm(s.narration).match(/[a-zа-яё0-9]+(?:[-‑][a-zа-яё0-9]+)*/gu) ?? []), ...(norm(s.narration).match(/[a-z0-9]+(?:['’][a-z]+)+(?:[-‑][a-z0-9]+)*/gu) ?? [])];
    for (const b of s.beats) {
      if (!ids.includes(b.target) || b.at > s.seconds - 0.3)
        throw new Error(
          "Визуальное событие выходит за границы сцены или схемы",
        );
      if (
        b.cue &&
        !spokenWords.includes(norm(b.cue).replace(/[.,!?;:]/g, ""))
      )
        throw new Error("Слово-сигнал отсутствует в озвучке");
      if(b.cueOccurrence && (!b.cue || cueCount(s.narration,b.cue)<b.cueOccurrence))throw new Error("Неверное вхождение слова-сигнала.");
      if (b.action === "connect" && !edges.some((e) => e.id === b.target))
        throw new Error("connect должен указывать на связь");
    }
    if (
      nodes.some(
        (n) =>
          !s.beats!.some((b) => b.target === n.id && b.action === "reveal"),
      )
    )
      throw new Error("Для каждого узла нужно плавное появление");
  }
  return plan;
}
export function resolveBeatAt(
  beat: { at: number; cue: string; cueOccurrence?:number },
  sceneStart: number,
  words: { text: string; start: number }[] = [],
) {
  const cue = norm(beat.cue).replace(/[.,!?;:]/g, "");
  const word = cue
    ? findCue(words,cue,beat.cueOccurrence)
    : undefined;
  return word ? Math.max(0, word.start - sceneStart) : beat.at;
}
export function scriptMarkdown(plan: Storyboard, alignment: any[] = []) {
  const clean = (s: string) => s.replace(/\|/g, "/").replace(/\n/g, " ");
  const actions: Record<string, string> = {
    reveal: "Появление",
    hide: "Уход",
    connect: "Связь",
    highlight: "Акцент",
  };
  return (
    `# ${plan.title}\n\nВремя рассчитано ${alignment.length ? "по фактической озвучке" : "по сценарию, до синтеза голоса"}.\n\n| Время | Озвучка | Что показать | Текст на экране |\n|---|---|---|---|\n` +
    sceneClock(plan)
      .map(
        (s, i) =>
          `| ${s.start.toFixed(2)}–${s.end.toFixed(2)} | ${clean(s.narration)} | ${clean(s.visualDescription ?? s.items.join(", "))} | ${clean(s.title)}; ${s.items.map(clean).join("; ")} |`,
      )
      .join("\n") +
    "\n\n## Визуальные события\n\n" +
    sceneClock(plan)
      .map(
        (s, i) =>
          `### ${s.title}\n` +
          (s.beats ?? [])
            .map(
              (b) =>
                `- ${(s.start + resolveBeatAt(b, s.start, alignment[i]?.words)).toFixed(2)} c: ${actions[b.action]}: ${s.diagram?.nodes.find((n) => n.id === b.target)?.label ?? "маршрут"}, ${b.description}${b.cue ? ` (по слову «${b.cue}»)` : ""}`,
            )
            .join("\n"),
      )
      .join("\n\n") +
    `\n\n## Ограничения\n\n${plan.factNotes}\n`
  );
}
