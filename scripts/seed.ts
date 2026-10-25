import fs from "node:fs";
import path from "node:path";
import { db, ROOT } from "../src/lib/store";
import { defaultProfile } from "../src/lib/model";
const base = "archive/2026-10-18/";
const videos = [
  {
    id: "archive-cicd-voice",
    title: "CI/CD: от кода до пользователей",
    file: "CI-CD-56s-9x16-RU-voice.mp4",
    duration: 56,
    format: "9:16",
    voice: 1,
    poster: "cicd-voice-poster.jpg",
    created: "2026-10-18T01:29:00+02:00",
  },
  {
    id: "archive-cicd-reel",
    title: "CI/CD за 56 секунд",
    file: "CI-CD-56s-9x16-RU.mp4",
    duration: 56,
    format: "9:16",
    voice: 0,
    poster: "cicd-voice-poster.jpg",
    created: "2026-10-18T01:21:00+02:00",
  },
  {
    id: "archive-cicd-wide",
    title: "Как работает CI/CD: 7 этапов",
    file: "CI-CD-Explained-RU.mp4",
    duration: 94,
    format: "16:9",
    voice: 0,
    poster: "CI-CD-poster.jpg",
    created: "2026-10-18T01:02:00+02:00",
  },
  {
    id: "archive-motion-demo",
    title: "Ideas in Motion — демонстрация",
    file: "Ideas-in-Motion.mp4",
    duration: 20,
    format: "16:9",
    voice: 0,
    poster: "Ideas-in-Motion-poster.jpg",
    created: "2026-10-18T00:48:00+02:00",
  },
];
for (const v of videos) {
  if (!fs.existsSync(path.join(ROOT, base, v.file))) continue;
  db()
    .prepare(
      "INSERT OR IGNORE INTO projects(id,title,topic,status,stage,progress,format,duration,voice,created,updated,profile,video,poster,review,imported) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      v.id,
      v.title,
      v.title,
      "review",
      "Перенесён из архива",
      100,
      v.format,
      v.duration,
      v.voice,
      new Date(v.created).toISOString(),
      new Date(v.created).toISOString(),
      JSON.stringify(defaultProfile),
      base + v.file,
      base + v.poster,
      JSON.stringify({
        technicalPassed: true,
        checks: [
          {
            label: "Архивный результат",
            ok: true,
            detail:
              "Видео перенесено вместе со сценариями, исходниками и материалами проверки.",
          },
        ],
        coverage:
          "Это ранее созданный ролик. Отчёты исходной проверки находятся рядом с исходниками в archive. Новые проверки выполняются при каждом новом рендере.",
      }),
      1,
    );
}
console.log("Архив добавлен в библиотеку.");
