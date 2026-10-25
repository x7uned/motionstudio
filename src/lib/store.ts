import {profileSnapshot,referenceCapability} from "./author-store";
import {snapshotModels} from "./model-assets";
import {createHash,randomInt} from "node:crypto";
import {backgroundAt,BACKGROUND_IDS} from "./backgrounds";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { defaultProfile, profileSchema, type Storyboard, type StyleProfile } from "./model";
import {QUALITY_VERSION,voiceProfileSchema,DEFAULT_EN_VOICE_PROFILE,type VoiceProfile} from "./quality-contract";
import {qualityInstructions} from "./quality-instructions";
import {snapshotOutro} from "./creator-outro";
import {chooseMusicBed,snapshotMusicBed,type MusicBedId} from "./music-beds";
import {LOOP_MUSIC_PACK} from "./music-bed-schema";
import {OUTRO_BRANDS,type OutroBrand} from "./xtuned-outro";
import type {PortraitLayout} from "./illustrated-layout";
import {DEFAULT_CAPTION_STYLE} from "./caption-style";
import {SAFE_ZONES_VERSION} from "./safe-zones";

import {loadVideoTemplate,listVideoTemplates,templateProfile,snapshotVideoTemplate,snapshotTemplateAvatar,IMPLEMENTED_STYLE_SAMPLES,CHANNEL_AVATAR_TEMPLATE} from "./video-templates";

export const ROOT = process.cwd();
export const DATA = path.join(ROOT, "data");
let instance: DatabaseSync | undefined;
export function db() {
  if (instance) return instance;
  fs.mkdirSync(DATA, { recursive: true });
  instance = new DatabaseSync(path.join(DATA, "studio.sqlite"));
  instance.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,title TEXT NOT NULL,topic TEXT NOT NULL,status TEXT NOT NULL,stage TEXT NOT NULL,progress INTEGER DEFAULT 0,format TEXT NOT NULL,duration INTEGER NOT NULL,voice INTEGER NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL,plan TEXT,profile TEXT NOT NULL,video TEXT,poster TEXT,sheet TEXT,review TEXT,error TEXT,feedback TEXT,imported INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project_id TEXT,kind TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL,started TEXT,finished TEXT,error TEXT);
 CREATE TABLE IF NOT EXISTS refs(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,file TEXT,text TEXT,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,project_id TEXT,message TEXT NOT NULL,created TEXT NOT NULL);`);
  if (
    !(instance.prepare("PRAGMA table_info(refs)").all() as any[]).some(
      (c) => c.name === "archived",
    )
  )
    instance.exec("ALTER TABLE refs ADD COLUMN archived INTEGER DEFAULT 0");
  // Agent mode for jobs without a project profile (style analysis): {"declaredAgent":...}; null keeps the legacy providers.
  if (!(instance.prepare("PRAGMA table_info(jobs)").all() as any[]).some((c) => c.name === "agent"))
    instance.exec("ALTER TABLE jobs ADD COLUMN agent TEXT");
  instance
    .prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)")
    .run("profile", JSON.stringify(defaultProfile));
  return instance;
}
export type Project = {
  id: string;
  title: string;
  topic: string;
  status: string;
  stage: string;
  progress: number;
  format: string;
  duration: number;
  voice: boolean;
  created: string;
  updated: string;
  plan: Storyboard | null;
  profile: StyleProfile;
  video: string | null;
  poster: string | null;
  sheet: string | null;
  review: Record<string, any> | null;
  error: string | null;
  feedback: string | null;
  imported: boolean;
};
function decode(row: any): Project {
  return {
    ...row,
    voice: !!row.voice,
    imported: !!row.imported,
    plan: row.plan ? JSON.parse(row.plan) : null,
    profile: JSON.parse(row.profile),
    review: row.review ? JSON.parse(row.review) : null,
  };
}
export function projects() {
  return (
    db()
      .prepare(
        "SELECT * FROM projects ORDER BY julianday(created) DESC,rowid DESC",
      )
      .all() as any[]
  ).map(decode);
}
export function project(id: string) {
  const row = db().prepare("SELECT * FROM projects WHERE id=?").get(id);
  return row ? decode(row) : null;
}
export function profile(): StyleProfile {
  return JSON.parse(
    (
      db()
        .prepare("SELECT value FROM settings WHERE key=?")
        .get("profile") as any
    ).value,
  );
}
export function saveProfile(p: StyleProfile) {
  db()
    .prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)")
    .run("profile", JSON.stringify(p));
  db()
    .prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)")
    .run("profileUpdated", new Date().toISOString());
}
export function references() {
  return db()
    .prepare("SELECT * FROM refs WHERE archived=0 ORDER BY created DESC")
    .all() as any[];
}
export function events(id: string) {
  return db()
    .prepare(
      "SELECT message,created FROM events WHERE project_id=? ORDER BY id DESC LIMIT 35",
    )
    .all(id);
}
export function event(id: string, msg: string) {
  db()
    .prepare("INSERT INTO events(project_id,message,created) VALUES(?,?,?)")
    .run(id, msg, new Date().toISOString());
}
export function updateProject(id: string, patch: Record<string, unknown>) {
  const allowed = [
    "title",
    "duration",
    "status",
    "stage",
    "progress",
    "plan",
    "video",
    "poster",
    "sheet",
    "review",
    "error",
    "feedback",
  ];
  const fields = Object.keys(patch).filter((k) => allowed.includes(k));
  if (!fields.length) return;
  const vals = fields.map((k) =>
    ["plan", "review"].includes(k) && patch[k] !== null
      ? JSON.stringify(patch[k])
      : (patch[k] as any),
  );
  db()
    .prepare(
      `UPDATE projects SET ${fields.map((k) => `${k}=?`).join(",")},updated=? WHERE id=?`,
    )
    .run(...vals, new Date().toISOString(), id);
}
export function enqueue(id: string | null, kind = "render", agent?: {declaredAgent:string}) {
  const active = db()
    .prepare(
      "SELECT id FROM jobs WHERE project_id IS ? AND kind=? AND status IN ('queued','running')",
    )
    .get(id, kind);
  if (active) throw new Error("Задача уже в очереди.");
  const jobid = randomUUID();
  db()
    .prepare(
      "INSERT INTO jobs(id,project_id,kind,status,created,agent) VALUES(?,?,?,?,?,?)",
    )
    .run(jobid, id, kind, "queued", new Date().toISOString(), agent ? JSON.stringify(agent) : null);
  return jobid;
}
/** Style rules of the saved sample «Изометрия» v1 (read-only) for isometric projects created before a connected
 *  template version exists; the project's profile carries them to the script and the director. */
const isometricSample=()=>{try{return loadVideoTemplate("isometric@v1",ROOT);}catch{return null;}};
export const ISOMETRIC_WRITING_RULE="Пиши то, что можно показать в изометрическом городе: маршруты и машины, пробки, эстакада, вышки и сигнал, выделенные здания, районы со светом, метки на карте, связи между точками и одно число на карточке.";
function isometricProfile(base:StyleProfile):StyleProfile{
  const rules=isometricSample()?.manifest.profile;
  return profileSchema.parse({...base,name:"Изометрия",description:"Изометрическая low-poly 3D-диорама: один постоянный процедурный город, светящиеся маршруты, трафик, метки и карточки интерфейса.",
    ...(rules?{template:rules.template,font:rules.font,hookRules:rules.hookRules,writingRules:[...rules.writingRules,ISOMETRIC_WRITING_RULE].slice(0,12),visualRules:rules.visualRules,avoid:rules.avoid,examples:rules.examples}:{writingRules:[...base.writingRules,ISOMETRIC_WRITING_RULE].slice(0,12)})});
}
export function createProject(opts: {
  topic: string;
  duration: number;
  format: string;
  voice: boolean;
  productionTemplateId?: string;
  authorProfileId?: string;
  referenceSetId?: string;
  renderMode?: "auto"|"2d"|"three";
  modelIds?: string[];
  initialPlan?: import("./model").Storyboard;
  voiceProfileOverride?:VoiceProfile;
  contentModel?:"gpt-6.1-sol"|"claude-opus-5-5";
  factCheck?:"strict"|"lenient"|"off";
  language?:"ru"|"en";
  /** Agent mode (user decision 2026-10-19): the driving chat agent answers every LLM role; self-declared identity. */
  agentMode?:{declaredAgent:string};
  /** Outro brand (editor decision 2026-10-20): handle in the header and outro plate, brand in the fixed spoken line. */
  brand?:OutroBrand;
  /** Portrait layout of illustrated films (editor decision 2026-10-20); absent keeps the original header at y108. */
  portraitLayout?:PortraitLayout|"classic";
  /** Explicit editor choice of the background music bed; absent chooses by topic (docs/background-music.md). */
  musicBed?:MusicBedId;
  /** Explicit film kind (2026-10-21): "isometric" = the «Изометрия» city renderer before a connected template exists. */
  filmKind?:"isometric";
  /** Explicit loop ending (user request 2026-10-22): the film ends on its own first frame instead of the outro plate. */
  ending?:"loop";
}) {
  if(opts.agentMode&&opts.contentModel)throw new Error("В агентном режиме все роли выполняет ведущий агент: модель сценария не выбирается отдельно.");
  if(opts.agentMode&&opts.initialPlan)throw new Error("Агентный режим создаёт новый проект с исследованием, а не готовый план.");
  const template=opts.productionTemplateId?loadVideoTemplate(opts.productionTemplateId,ROOT):null;
  const implemented=template?.manifest.styleSample?IMPLEMENTED_STYLE_SAMPLES[template.manifest.styleSample.renderer]:undefined;
  if(template?.manifest.styleSample)throw new Error(implemented?`«${template.manifest.name}» v${template.manifest.version} — сохранённый образец стиля; он реализован как рендерер ${implemented}. Создайте проект без шаблона с --film-kind ${implemented}; подключённая версия шаблона сохраняется из первого ролика, который одобрит пользователь.`:`«${template.manifest.name}» — сохранённый образец стиля: его рендерер ещё не подключён к конвейеру. Скажите, что этот стиль нужно реализовать, и он станет рабочим шаблоном.`);
  if(template&&opts.format!==template.manifest.defaults.format)throw new Error(`Шаблон «${template.manifest.name}» рассчитан на формат ${template.manifest.defaults.format}.`);
  const templateKind=template?.manifest.runtime&&"filmKind" in template.manifest.runtime?template.manifest.runtime.filmKind:undefined;
  if(opts.filmKind){
    if(template)throw new Error("Тип фильма задаётся шаблоном; --film-kind — только для проекта без шаблона.");
    if(opts.initialPlan)throw new Error("Изометрический ролик создаётся с исследованием, а не из готового плана.");
    if(opts.format!=="9:16")throw new Error("Изометрический рендер пока только вертикальный 9:16.");
    if(opts.renderMode==="three"||opts.modelIds?.length||opts.referenceSetId||opts.authorProfileId)throw new Error("Изометрия — свой подготовленный рендер города: без 3D-моделей, разборов и режима three.");
  }
  const filmKind=opts.filmKind??templateKind;
  // Loop ending (2026-10-22): implemented for the illustrated renderer only, 9:16, new researched projects.
  if(opts.ending==="loop"&&(filmKind!=="illustrated"||opts.format!=="9:16"||opts.initialPlan))throw new Error("Петля (--ending loop) пока есть только у новых иллюстрированных роликов 9:16 (шаблон illustrated-scene).");
  // Editor decision 2026-10-20: every new illustrated 9:16 film gets the TikTok-safe header unless "classic" is asked for;
  // isometric films (2026-10-21) share the same header and captions.
  const portraitLayout:PortraitLayout|undefined=opts.portraitLayout==="classic"?undefined:opts.portraitLayout??((filmKind==="illustrated"||filmKind==="isometric")&&opts.format==="9:16"&&!opts.initialPlan?"tiktok-safe":undefined);
  // Editor decision 2026-10-21: new illustrated 9:16 films get the clean overlay — no chapter bars, no chapter label, taller stage.
  // The same decision covers the isometric city (the user's words: it applies to the common layout, not one renderer).
  // User decision 2026-10-22: no overlay at all (v3) — no avatar, handle, duration or title; the picture fills the whole
  // 9:16 frame and only the captions stay. Projects created before keep their v2 field.
  const overlayVersion=(filmKind==="illustrated"||filmKind==="isometric")&&opts.format==="9:16"&&!opts.initialPlan?3 as const:undefined;
  if(opts.portraitLayout==="tiktok-safe"&&(opts.initialPlan||(filmKind!=="illustrated"&&filmKind!=="isometric")||opts.format!=="9:16"))throw new Error("Раскладка tiktok-safe есть только у новых иллюстрированных и изометрических роликов 9:16.");
  const savedProfile=template?templateProfile(profile(),template):opts.filmKind==="isometric"?isometricProfile(profile()):profile();
  const id = randomUUID();
  // Choose once on the server, then freeze in the project's profile; frames never draw randomness.
  if(template&&!template.manifest.runtime?.backgroundSelection)delete savedProfile.backgroundDesign;
  else savedProfile.backgroundDesign=backgroundAt(randomInt(BACKGROUND_IDS.length));
  if(template)snapshotVideoTemplate(template,path.join(DATA,"projects",id));
  const referenceId=opts.referenceSetId||opts.authorProfileId;
  const capability=referenceId?referenceCapability(referenceId):null;
  if(capability&&!capability.engine)throw new Error(capability.reason);
  const templateMode=template?.manifest.runtime?.renderMode;
  if(templateMode&&opts.renderMode&&opts.renderMode!=="auto"&&opts.renderMode!==templateMode)throw new Error(templateMode==="three"?"Этот шаблон требует 3D-рендер.":"Этот шаблон использует свой 2D-рендер.");
  const renderMode=templateMode||(opts.renderMode&&opts.renderMode!=="auto"?opts.renderMode:capability?.engine||"2d");
  if(capability?.engine==="three"&&renderMode!=="three")throw new Error("Для этого разбора выбран 3D. Используйте 3D-рендер, чтобы не заменять объём схемами.");
  if(renderMode==="three"&&template&&!templateMode)throw new Error("Сохранённый шаблон истории использует свой рендерер. Для 3D выберите текущий стиль автора.");
  if(opts.modelIds?.length&&renderMode!=="three")throw new Error("Загруженные модели используются в 3D-рендере.");
  savedProfile.renderMode=renderMode;
  const runtime=template?.manifest.runtime;
  if(runtime&&"filmKind" in runtime)savedProfile.filmKind=runtime.filmKind;
  if(opts.filmKind)savedProfile.filmKind=opts.filmKind;
  const english=opts.language==="en";
  if(english&&(opts.initialPlan||(template&&!template.manifest.runtime)))throw new Error("Английский выпуск доступен для новых проектов режима качества. Сохранённый шаблон «История технологий» и готовые планы остаются русскими.");
  if(opts.brand&&!OUTRO_BRANDS[opts.brand].languages[english?"en":"ru"])throw new Error(`Бренд ${opts.brand} пока доступен только для английских роликов: русское произношение ещё не выбрано.`);
  if(!opts.initialPlan){
    const selected=db().prepare("SELECT value FROM settings WHERE key=?").get(english?"selectedVoiceProfileEn":"selectedVoiceProfile") as {value:string}|undefined;
    // English never inherits a Russian delivery or a template's Russian voice profile; the editor's EN choice is Dennis · v4.
    const voiceProfile=english?(selected?voiceProfileSchema.parse(JSON.parse(selected.value)):DEFAULT_EN_VOICE_PROFILE):opts.voiceProfileOverride??template?.manifest.runtime?.voiceProfile??(selected?voiceProfileSchema.parse(JSON.parse(selected.value)):undefined);
    const snapshot=qualityInstructions(ROOT,path.join(DATA,"projects",id),true);
    savedProfile.production={version:2,policyVersion:QUALITY_VERSION,...(template&&!template.manifest.runtime?.visualDesignVersion?{}:{visualDesignVersion:1 as const}),...(snapshot?{instructionsHash:snapshot.sha256}:{}),...(voiceProfile?{voiceProfile}:{}),...(opts.contentModel==="claude-opus-5-5"?{contentAgent:"claude-opus-5-5" as const}:{}),...(opts.factCheck==="lenient"||opts.factCheck==="off"?{factCheck:opts.factCheck}:{}),...(english?{language:"en" as const,plainEnglish:1 as const}:{}),...(opts.agentMode?{agentMode:{version:1 as const,declaredAgent:opts.agentMode.declaredAgent}}:{}),...(portraitLayout?{portraitLayout}:{}),...(overlayVersion?{overlayVersion,captionStyle:DEFAULT_CAPTION_STYLE}:{}),...(opts.ending==="loop"?{ending:"loop" as const}:{}),...(opts.format==="9:16"?{safeZonesVersion:SAFE_ZONES_VERSION}:{})};
  }
  if(referenceId)savedProfile.authorReference=profileSnapshot(referenceId,path.join(DATA,"projects",id));
  // @xtuned outro v1: new researched projects, plus templates that ask for it (illustrated-scene/v2).
  // tech-story/v1, illustrated-scene/v1 and supplied plans stay unchanged.
  delete savedProfile.creatorOutro;delete savedProfile.headerAvatar;
  const templateRuntime=template?.manifest.runtime,templateOutro=!!templateRuntime&&"creatorOutro" in templateRuntime&&!!templateRuntime.creatorOutro;
  // A loop film has no outro plate: the brand is only the handle in the header and is not spoken (docs/publishing-and-retention.md).
  if((!template||templateOutro)&&!opts.initialPlan&&opts.ending!=="loop")savedProfile.creatorOutro=snapshotOutro(ROOT,path.join(DATA,"projects",id),english?"en":"ru");
  if(opts.brand){
    if(opts.ending==="loop")savedProfile.username=OUTRO_BRANDS[opts.brand].username;
    else{
      if(!savedProfile.creatorOutro)throw new Error("Бренд задаётся заставке: у этого проекта заставки нет.");
      savedProfile.creatorOutro={...savedProfile.creatorOutro,brand:opts.brand};savedProfile.username=OUTRO_BRANDS[opts.brand].username;
    }
  }
  // Mandatory background music (user decision 2026-10-20): the same new projects that get the outro, chosen once by topic.
  // tech-story/v1, illustrated-scene/v1 and supplied plans keep their sound unless the editor names a bed.
  delete savedProfile.musicBed;
  if(opts.musicBed||((!template||templateOutro)&&!opts.initialPlan))savedProfile.musicBed=snapshotMusicBed(ROOT,path.join(DATA,"projects",id),opts.musicBed?{id:opts.musicBed,selection:"editor"}:chooseMusicBed(opts.topic,randomInt),opts.ending==="loop"?LOOP_MUSIC_PACK:undefined);
  const avatar=template?snapshotTemplateAvatar(template,path.join(DATA,"projects",id),id):opts.filmKind?snapshotTemplateAvatar(loadVideoTemplate(CHANNEL_AVATAR_TEMPLATE,ROOT),path.join(DATA,"projects",id),id):undefined;
  if(avatar)savedProfile.headerAvatar=avatar;
  if(renderMode==="three"){
    const assets=snapshotModels(ROOT,path.join(DATA,"projects",id),opts.modelIds||[]);
    savedProfile.modelSnapshot=createHash("sha256").update(JSON.stringify(assets)).digest("hex");
  }
  const now = new Date().toISOString();
  db()
    .prepare(
      "INSERT INTO projects(id,title,topic,status,stage,format,duration,voice,created,updated,profile) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      opts.topic.slice(0, 72),
      opts.topic,
      "queued",
      "В очереди",
      opts.format,
      opts.duration,
      Number(opts.voice),
      now,
      now,
      JSON.stringify(savedProfile),
    );
  if(opts.initialPlan)updateProject(id,{plan:opts.initialPlan,title:opts.initialPlan.title});
  enqueue(id);
  event(id, template?`Проект создан по шаблону «${template.manifest.name}», v${template.manifest.version}. Инструкции сохранены в проекте.`:"Проект добавлен в очередь.");
  if(savedProfile.production?.contentAgent==="claude-opus-5-5")event(id,"Исследование, сценарий, редактура, фактчекинг, визуальная концепция и ревью кадров: Claude Opus 5.5 · xhigh по явному выбору редактора вместо GPT‑6.1 Sol.");
  if(savedProfile.production?.agentMode)event(id,`Агентный режим: исследование, сценарий, редактура, постановка и ревью кадров выполняет ведущий агент в чате (${savedProfile.production.agentMode.declaredAgent}, самоотчёт — студия не может проверить модель). CLI Codex/Claude не запускаются.`);
  if(savedProfile.production?.language==="en")event(id,`Язык ролика: английский по выбору редактора. Сценарий, подписи, голос (${savedProfile.production.voiceProfile?.name??"EN"} · ${savedProfile.production.voiceProfile?.model??""}) и сверка Scribe — на английском; заставка — EN-вариант.`);
  if(opts.filmKind==="isometric")event(id,`Рендер «Изометрия» (isometric/v1) по выбору редактора: один постоянный изометрический город, постановку по меткам слов делает motion-режиссёр (JSON, без кода). ${(()=>{const sample=isometricSample();return sample?`Правила стиля взяты из сохранённого образца «Изометрия» v1 (${sample.sha256.slice(0,12)})`:"Образец «Изометрия» v1 не найден: правила стиля — только у режиссёра";})()}${savedProfile.production?.overlayVersion===3?"; без оверлея — город на весь кадр, только субтитры":"; аватар канала в шапке"}.`);
  if(savedProfile.production?.ending==="loop")event(id,`Концовка — петля (явный выбор редактора 2026-10-22): без заставки «Follow …», последняя фраза переходит в первые слова, камера садится в первый кадр, музыка ${LOOP_MUSIC_PACK} идёт через стык без затухания. ${savedProfile.production?.overlayVersion===3?"В кадре ника нет (без оверлея).":`Ник ${savedProfile.username??"@xtuned"} — только в шапке.`}`);
  if(savedProfile.production?.overlayVersion===3)event(id,"Без оверлея (решение пользователя 2026-10-22): нет аватара, ника, названия и длительности; картинка на весь кадр 9:16 без чёрных полос и затемнений сверху и снизу; остаются только субтитры внизу с мягкой тенью под строкой.");
  if(savedProfile.production?.portraitLayout==="tiktok-safe")event(id,(opts.portraitLayout?"Раскладка по выбору редактора":"Раскладка по умолчанию (решение редактора 2026-10-20)")+(savedProfile.production?.overlayVersion===3?": tiktok-safe — субтитры, сцена и карточки держатся ниже верхних вкладок TikTok и выше его нижней подписи.":": tiktok-safe — шапка с аватаром, ником, заголовком и полосками глав опущена ниже верхних вкладок TikTok, сцена и субтитры сдвинуты вместе с ней."));
  if(opts.brand)event(id,opts.ending==="loop"?(savedProfile.production?.overlayVersion===3?`Бренд по выбору редактора: ${savedProfile.username} — для публикации и обложки; в кадре шапки нет, в петле бренд не произносится.`:`Бренд по выбору редактора: ${savedProfile.username} в шапке; в петле бренд не произносится.`):`Бренд по выбору редактора: ${savedProfile.username} в шапке и на заставке, последняя фраза голоса — «${OUTRO_BRANDS[opts.brand].languages[english?"en":"ru"]!.spoken}».`);
  if(savedProfile.production?.safeZonesVersion)event(id,`Безопасные зоны v${savedProfile.production.safeZonesVersion} (решение пользователя 2026-10-25): ревью готового MP4 проверяет OCR-текст вне строки субтитров по video-design/safe-zones.json — верх до y 250, низ от y 1500 и колонка кнопок справа — только фон, y 1360–1500 — только субтитры; нарушение — замечание с секундой и рамкой.`);
  if(savedProfile.production?.factCheck==="off")event(id,"Фактчекинг выключен по выбору редактора: сценарий пересказывает прочитанный материал, утверждения не проверяются и озвучку не останавливают.");
  if(savedProfile.production?.factCheck==="lenient")event(id,"Фактчекинг: мягкий режим по выбору редактора. Озвучку останавливают только прямые противоречия прочитанным источникам; неподтверждённые формулировки отмечаются в отчёте.");
  return id;
}
export function jobs() {
  return db()
    .prepare("SELECT * FROM jobs ORDER BY created DESC,rowid DESC LIMIT 30")
    .all();
}
/** One project (or reference set / style analysis) runs at most one job at a time; different projects run in parallel. */
export const jobScope = (j: { project_id: string | null; kind: string }) => j.project_id ?? `kind:${j.kind}`;
/**
 * Oldest queued job whose project has no running job. `eligible` lets the engine skip jobs it cannot start yet
 * (legacy CLI jobs keep their one-at-a-time order).
 */
export function claimJob(eligible: (job: any) => boolean = () => true): any {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const busy = new Set((d.prepare("SELECT project_id,kind FROM jobs WHERE status='running'").all() as any[]).map(jobScope));
    const j = (d
      .prepare(
        "SELECT * FROM jobs WHERE status='queued' ORDER BY created,rowid",
      )
      .all() as any[]).find((job) => !busy.has(jobScope(job)) && eligible(job));
    if (j)
      d.prepare("UPDATE jobs SET status='running',started=? WHERE id=?").run(
        new Date().toISOString(),
        j.id,
      );
    d.exec("COMMIT");
    return j;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function completeJob(
  id: string,
  status: string,
  error: string | null = null,
) {
  db()
    .prepare("UPDATE jobs SET status=?,finished=?,error=? WHERE id=?")
    .run(status, new Date().toISOString(), error, id);
}
export function assetUrl(file: string | null) {
  return file
    ? `/api/assets/${file.split(path.sep).map(encodeURIComponent).join("/")}`
    : null;
}
export function uiState() {
  return {
    projects: projects().map((p) => ({
      ...p,
      videoUrl: assetUrl(p.video),
      posterUrl: assetUrl(p.poster),
      sheetUrl: assetUrl(p.sheet),
    })),
    references: references().map((r) => ({ ...r, url: assetUrl(r.file) })),
    profile: profile(),
    videoTemplates: listVideoTemplates(ROOT),
    jobs: jobs(),
    profileUpdated:
      (
        db()
          .prepare("SELECT value FROM settings WHERE key=?")
          .get("profileUpdated") as any
      )?.value ?? null,
  };
}
