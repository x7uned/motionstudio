import { sceneClock, type Storyboard } from "../src/lib/model";
import type { SpeechAlignment } from "./Explainer";
import { smooth } from "./motion";

/** Absolute word cues on the existing, uninterrupted narration clock. */
export function systemCues(plan: Storyboard, alignment: SpeechAlignment[]) {
  const clock = sceneClock(plan);
  const cue = (scene: number, word: string, fallback: number) =>
    alignment[scene]?.words?.find((w) => w.text.toLocaleLowerCase("ru").includes(word))?.start
    ?? clock[scene].start + fallback;
  return {
    users: 0, app: .35, database: .85,
    servers: cue(2, "добавляем", 2),
    balance: cue(2, "балансировщик", 3.5),
    cache: cue(3, "кэш", 1),
    replica: cue(3, "реплик", 2.7),
    lag: cue(3, "отставать", 4.7),
    shards: cue(4, "делим", 1.3),
    files: cue(4, "файлы", 3.1),
    cdn: cue(4, "си-ди", 5),
    queue: cue(5, "очередь", 2.1),
    workers: cue(5, "воркеры", 3.1),
    fail: cue(6, "сбое", .4),
    reserve: cue(6, "запасной", 1.7),
    logs: cue(7, "логи", .1),
    metrics: cue(7, "метрики", .7),
    traces: cue(7, "трассировка", 1.4),
    final: cue(7, "сложность", 5),
  };
}
export type SystemCues = ReturnType<typeof systemCues>;
export function growthState(t: number, c: SystemCues) {
  const p = (at: number, duration = .7) => smooth(t, at, at + duration);
  const shards = p(c.shards, 1.05), files = p(c.files, .65), queue = p(c.queue, .7);
  const observation = p(c.logs, .85);
  return {
    users: p(c.users, .5), app: p(c.app, .65), database: p(c.database, .7),
    servers: p(c.servers, .85), balance: p(c.balance, .65),
    cache: p(c.cache) * (1 - shards),
    replica: p(c.replica) * (1 - shards),
    lag: p(c.lag, .5) * (1 - shards), shards,
    files: files * (1 - queue), cdn: p(c.cdn, .55) * (1 - queue),
    queue: queue * (1 - p(c.fail, .65)),
    workers: p(c.workers, .65) * (1 - p(c.fail, .65)),
    failure: p(c.fail, .6), reserve: p(c.reserve, .7), observation,
    logs: p(c.logs, .5), metrics: p(c.metrics, .5), traces: p(c.traces, .6),
    final: p(c.final, .65),
    dbX: 430 - 180 * shards,
    dbY: 430 - 24 * observation,
    dbWidth: 212 + 144 * shards,
    appY: 250,
  };
}
