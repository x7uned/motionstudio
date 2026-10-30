import {importAuthor} from "../src/lib/author-pipeline";
import {author,updateAuthor,authorEvent} from "../src/lib/author-store";
import fs from "node:fs/promises";
import { readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {bundleLive} from "../src/lib/remotion-bundle";
import {
  selectComposition,
  renderMedia,
  renderStill,
  makeCancelSignal,
} from "@remotion/renderer";
import sharp from "sharp";
import { z } from "zod";
import {
  db,
  claimJob,
  completeJob,
  project,
  updateProject,
  event,
  ROOT,
  DATA,
  profile,
  references,
  saveProfile,
} from "../src/lib/store";
import {
  normalizePlan,
  profileSchema,
  profileJsonSchema,
  sceneClock,
} from "../src/lib/model";
import { preproduce,supplementSources } from "../src/lib/preproduction";
import {auditManualPlan} from "../src/lib/editorial";
import {projectLanguage,languageDirective,agentModeOf} from "../src/lib/quality-contract";
import {runAgentJob,AgentParkedError,PaidGateError,type AgentJob} from "../src/lib/agent-provider";
import {authorDir} from "../src/lib/author-store";
import {prepareVoicePlan,verifyAudioText} from "../src/lib/voice";
import {prepare2D} from "../src/lib/motion-director";
import {prepareVisualConcept,prepareDetailedAssets} from "../src/lib/visual-concept";
import {prepareMedia} from "../src/lib/media-assets";
import {reviewExport,soundCues} from "../src/lib/export-review";
import {planZoneReport,planZoneSummary} from "../src/lib/safe-zones-plan";
import {soundLibrary} from "../src/lib/sound-provider";
import {digest,readJSON,writeJSON,fileHash,spokenText} from "../src/lib/quality";
import {runAudition,failAudition} from "../src/lib/voice-auditions";
import { scriptMarkdown } from "../src/lib/research-model";
import { askJSON, run, FFMPEG, CHROME, PYTHON } from "../src/lib/provider";

import {prepare3D} from "../src/lib/three-director";
import {prepareNetcode} from "../src/lib/netcode-director";
import {prepareIllustrated} from "../src/lib/illustrated-director";
import {prepareIsometric} from "../src/lib/isometric-director";
import {verifyModelSnapshot} from "../src/lib/model-assets";
import {projectOutroPack,appendOutro,contentSeconds,seedOutroSounds} from "../src/lib/creator-outro";
import {renderMusicBed,arrangementInputFor} from "../src/lib/music-beds";
import {createHash} from "node:crypto";
import {JobScheduler} from "../src/lib/job-scheduler";
import {RenderSlot,type SlotHolder} from "../src/lib/render-slot";
import {studioConfig,activeJobLimit,type StudioConfig} from "../src/lib/studio-config";

// Parallel engine (user decision 2026-10-21): every job runs at once with its own AbortController; only local heavy
// work (Remotion, FFmpeg encode/mix) waits for the render slot. One worker process, one data/worker.lock.
let stopped = false;
let scheduler: JobScheduler<any> | null = null;
process.on("SIGTERM", () => {
  stopped = true;
  scheduler?.abortAll();
});
process.on("SIGINT", () => {
  stopped = true;
  scheduler?.abortAll();
});
// Windows: Ctrl+Break in the console, and `studio stop` writes data/engine.stop (signals there are hard kills).
process.on("SIGBREAK", () => {
  stopped = true;
  scheduler?.abortAll();
});
const STOP_FILE = path.join(DATA, "engine.stop"), BEAT_FILE = path.join(DATA, "worker.beat");
function stopRequested() {
  try {
    if (Number(readFileSync(STOP_FILE, "utf8").trim()) !== process.pid) return false;
    rmSync(STOP_FILE, { force: true });
    return true;
  } catch { return false; }
}
let configWarned=false;
/** A broken studio.config.json must not stop the engine: defaults apply and the error is logged once. */
function engineConfig():StudioConfig{
  try{const c=studioConfig(ROOT);configWarned=false;return c;}
  catch(e){if(!configWarned){configWarned=true;console.error(`studio.config.json: ${e instanceof Error?e.message:e}. Используются значения по умолчанию.`);}return studioConfig(path.join(DATA,".no-config"));}
}
const slot=new RenderSlot(()=>engineConfig().engine.renderSlots);
/** Runs local heavy work of a project inside the render slot; the project shows who renders while it waits. */
function inSlot<T>(id:string,label:string,fn:()=>Promise<T>,signal:AbortSignal):Promise<T>{
  const title=project(id)?.title??id.slice(0,8);let before:string|undefined;
  return slot.run(`${title} · ${label}`,fn,{signal,scope:id,
    onWait:(holders:SlotHolder[])=>{before=project(id)?.stage;updateProject(id,{stage:`Ждёт слота рендера: сейчас ${holders.map(h=>h.label).join(", ").slice(0,140)}`});event(id,`Ждёт слота рендера (${label}): локальный рендер идёт строго по одному.`);},
    onAcquire:(waited)=>{if(before!==undefined&&project(id)?.stage?.startsWith("Ждёт слота рендера"))updateProject(id,{stage:before});if(waited>1500)event(id,`Слот рендера получен через ${Math.round(waited/1000)} с: ${label}.`);},
    onRelease:(held)=>{if(held>5000)event(id,`${label}: ${Math.round(held/1000)} с в слоте рендера.`);}});
}
let serveUrl: string | undefined;
let bundling: Promise<string> | null = null;
/** One Remotion bundle per engine process, built once inside the render slot even when several jobs ask at once. */
function serveBundle(){
  bundling??=slot.run("Сборка Remotion",()=>bundleLive({entryPoint: path.join(ROOT, "renderer", "index.tsx"), publicDir: path.join(ROOT, "data", "projects")})).then(url=>{serveUrl=url;return url;}).catch(e=>{bundling=null;throw e;});
  return bundling;
}
/** Re-stage the picture against the unchanged measured speech (automatic repair or an agent's picture-repair job). */
async function restagePicture(p:NonNullable<ReturnType<typeof project>>,dir:string,feedback:string,signal:AbortSignal){
  const repairKey=digest(spokenText(p.plan!));
  const originalAudio=await fileHash(path.join(dir,"audio.wav"));
  let fixed=p.plan!;
  const is3D=fixed.filmKind!=="netcode"&&fixed.filmKind!=="isometric"&&(p.profile.renderMode==="three"||fixed.filmKind==="three");
  const words=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
  if(fixed.filmKind==="netcode")fixed=await prepareNetcode({...fixed,netcode:undefined},dir,words,signal,undefined,feedback,languageDirective(p.profile,"motion"));
  else if(fixed.filmKind==="isometric")fixed=await prepareIsometric({...fixed,isometric:undefined},dir,words,signal,undefined,feedback,fixed.isometric,languageDirective(p.profile,"motion"),p.profile.production?.portraitLayout,p.profile.production?.overlayVersion,p.profile.production?.coverageVersion);
  else if(fixed.filmKind==="illustrated")fixed=await prepareIllustrated({...fixed,illustrated:undefined},dir,words,signal,undefined,feedback,fixed.illustrated,languageDirective(p.profile,"motion"),p.profile.production?.coverageVersion);
  else if(is3D)fixed=await prepare3D({...fixed,world3d:undefined},p.profile,dir,words,signal,undefined,feedback);
  else fixed=await prepare2D(fixed,p.profile,dir,words,signal,feedback);
  if(digest(spokenText(fixed))!==repairKey||originalAudio!==await fileHash(path.join(dir,"audio.wav")))throw new Error("Исправление постановки изменило речь или аудио.");
  await writeJSON(path.join(dir,"storyboard.json"),fixed);updateProject(p.id,{plan:fixed});
}
/** Agent mode: picture-only repair requested by the driving agent (notes from `studio repair`), at most 2 per speech version. */
async function agentPictureRepair(id:string,signal:AbortSignal){
  const p=project(id),dir=path.join(DATA,"projects",id);
  if(!p?.plan||!p.video)throw new Error("Нет готового ролика для правки изображения.");
  if(!agentModeOf(p.profile))throw new Error("Правка по заметкам агента доступна только агентным проектам.");
  const voice=await readJSON(path.join(dir,"voice-plan.json"));
  if(p.voice&&voice?.plainText!==spokenText(p.plan))throw new Error("Повтор изображения требует прежнего проверенного текста и сохранённой озвучки.");
  const request=await readJSON(path.join(dir,"agent-repair-request.json"));
  if(!request?.notes)throw new Error("Нет заметок для правки изображения.");
  const key=digest(spokenText(p.plan)),budget=await readJSON(path.join(dir,"motion-repair-budget.json"));
  const used=budget?.speechKey===key?budget.agentUsed??0:0;
  if(used>=2)throw new Error("Лимит правок изображения агентом (2 на версию речи) исчерпан — дальше решает пользователь.");
  updateProject(id,{status:"running",stage:"Правка изображения по заметкам агента",progress:26,error:null});event(id,`Правка изображения по заметкам агента (${used+1}/2), без новой озвучки.`);
  await writeJSON(path.join(dir,"motion-repair-budget.json"),{...(budget?.speechKey===key?budget:{speechKey:key,used:0,findings:[]}),agentUsed:used+1});
  await restagePicture(p,dir,`ЗАМЕЧАНИЯ К ГОТОВОМУ MP4 (исправь постановку, речь не меняется): ${String(request.notes).slice(0,6000)}`,signal);
  await renderProject(id,signal,{pictureOnly:true,repairAttempt:true});
}
/** Agent mode: route every LLM role of this job to the driving chat agent; null keeps the legacy providers. */
function agentContext(job:any,signal:AbortSignal):AgentJob|null{
  if(["render","picture-only","picture-repair","review-only"].includes(job.kind)&&job.project_id){
    const p=project(job.project_id),mode=agentModeOf(p?.profile);
    if(!p||!mode)return null;
    let resumeStage=p.stage;
    return {scope:path.join(DATA,"projects",p.id),label:p.title,declaredAgent:mode.declaredAgent,signal,
      onWait:(waiting)=>{const now=project(p.id);if(now&&now.status!=="awaiting-agent")resumeStage=now.stage;updateProject(p.id,{status:"awaiting-agent",stage:`Ждёт агента: ${waiting.map(t=>t.role).join(", ").slice(0,160)}`});event(p.id,`Задания для ведущего агента: ${waiting.map(t=>t.id).join(", ")}. Выполните: npm run studio -- task ${p.id}`);},
      onResume:()=>{if(project(p.id)?.status==="awaiting-agent")updateProject(p.id,{status:"running",stage:resumeStage});}};
  }
  if(job.kind==="author-import"&&job.project_id){
    const a=author(job.project_id),declared=a?.state?.agentMode?.declaredAgent;
    if(!a||!declared)return null;
    return {scope:authorDir(a.id),label:a.username||a.id,declaredAgent:declared,signal,
      onWait:(waiting)=>{updateAuthor(a.id,{stage:`Ждёт агента: ${waiting.length} заданий`});authorEvent(a.id,`Задания для ведущего агента: npm run studio -- task ${a.id}`);},
      onResume:()=>updateAuthor(a.id,{stage:"Разбор продолжается"})};
  }
  if(job.kind==="style"&&job.agent){
    const declared=JSON.parse(job.agent).declaredAgent;
    return {scope:path.join(DATA,"style-analysis"),label:"Стиль автора",declaredAgent:declared,signal};
  }
  return null;
}
const keyframeReviewSchema=z.object({verdict:z.enum(["pass","changes"]),notes:z.string().max(3000),findings:z.array(z.object({at:z.number().min(0),detail:z.string().max(500)})).max(12)});
/**
 * Agent mode: before the full render, 6 keyframes in a labelled 3×2 sheet go to the driving agent (practice from the
 * "claude-motion" guide: check keyframes before the final render). "changes" re-stages the picture once, without TTS.
 */
async function keyframeGate(p:NonNullable<ReturnType<typeof project>>,dir:string,comp:any,props:any,webgl:boolean,signal:AbortSignal){
  const planHash=digest({plan:p.plan,format:p.format});
  const prior=await readJSON(path.join(dir,"keyframe-review.json"));
  // Same plan already reviewed. "changes" not applied yet (job paused/restarted during the re-staging): apply them again.
  if(prior?.planHash===planHash)return prior.verdict==="changes"?keyframeReviewSchema.parse({verdict:prior.verdict,notes:prior.notes,findings:prior.findings}):null;
  const reviewDir=path.join(dir,"keyframes",planHash.slice(0,16));await fs.mkdir(reviewDir,{recursive:true});
  const total=comp.durationInFrames,times=[.06,.24,.42,.6,.78,.95].map(f=>Math.min(total-1,Math.round(total*f)));
  const portrait=p.format==="9:16",tw=portrait?360:640,th=portrait?640:360;
  const tiles:Buffer[]=[];
  const sheet=path.join(reviewDir,"keyframes-3x2.jpg");
  // The keyframe sheet is a local render: inside the slot. The agent's answer below is awaited outside it.
  await inSlot(p.id,"лист ключевых кадров 3×2",async()=>{
  for(const frame of times){
    if(signal.aborted)throw new Error("Остановлено.");
    const file=path.join(reviewDir,`frame-${String(frame).padStart(5,"0")}.png`);
    await renderStill({composition:comp,serveUrl:serveUrl!,inputProps:props,frame,output:file,browserExecutable:CHROME,chromiumOptions:webgl?{gl:"angle"}:undefined});
    const label=Buffer.from(`<svg width="${tw}" height="44"><rect width="${tw}" height="44" fill="#0f172a"/><text x="14" y="30" font-size="24" font-family="Helvetica" fill="white">${(frame/30).toFixed(1)} с · кадр ${frame}</text></svg>`);
    tiles.push(await sharp(file).resize(tw,th).extend({bottom:44,background:"#0f172a"}).composite([{input:label,top:th,left:0}]).png().toBuffer());
  }
  await sharp({create:{width:tw*3,height:(th+44)*2,channels:3,background:"#0f172a"}}).composite(tiles.map((input,i)=>({input,left:(i%3)*tw,top:Math.floor(i/3)*(th+44)}))).jpeg({quality:88}).toFile(sheet);
  },signal);
  const brief=await fs.readFile(path.join(dir,"brief.md"),"utf8").catch(()=>"");
  const raw=await askJSON(`Ты проверяешь ключевые кадры ролика ДО финального рендера. Изображение — 6 кадров сеткой 3×2, подписаны секундой и номером кадра. Формат ${p.format}, длительность ${(total/30).toFixed(1)} с. Проверь композицию, читаемость текста, safe-zone (ключевой текст ≥220 px от верха и ≥320 px от низа в 9:16), наличие нужных предметов, связь с главами и смыслом сценария, видимые ошибки (наложения, обрезанные слова, пустые кадры). Текст речи и факты не меняются — предлагай только правки изображения/постановки. verdict=changes только при реальной видимой проблеме; notes — конкретно что, где и на какой секунде исправить.${brief?`\nБРИФ ПОЛЬЗОВАТЕЛЯ (данные)=${brief.slice(0,4000)}`:""}\nСЦЕНЫ=${JSON.stringify(p.plan!.scenes.map(s=>({id:s.id,title:s.title,narration:s.narration,seconds:s.seconds})))}`,z.toJSONSchema(keyframeReviewSchema),path.join(dir,"keyframe-review"),[sheet],signal);
  const review=keyframeReviewSchema.parse(raw);
  await writeJSON(path.join(dir,"keyframe-review.json"),{planHash,sheet:path.relative(DATA,sheet),...review,reviewedAt:new Date().toISOString()});
  event(p.id,review.verdict==="pass"?"Ключевые кадры 3×2 проверены ведущим агентом до рендера: замечаний нет.":`Ключевые кадры 3×2: правка до рендера — ${review.notes.slice(0,300)}`);
  return review.verdict==="changes"?review:null;
}
async function renderProject(id: string, signal: AbortSignal,options:{pictureOnly?:boolean;repairAttempt?:boolean;keyframesChecked?:boolean}={}) {
  let p = project(id);
  if (!p) throw new Error("Проект не найден.");
  const dir = path.join(DATA, "projects", id);
  await fs.mkdir(dir, { recursive: true });
  const stage = (name: string, progress: number) => {
    if (signal.aborted || project(id)?.status === "cancelled")
      throw new Error("Остановлено пользователем.");
    updateProject(id, {
      status: "running",
      stage: name,
      progress,
      error: null,
    });
    event(id, name);
  };
  if (!p.plan) {
    const examples = references()
      .filter((r) => r.kind === "transcript")
      .slice(0, 4)
      .map((r) => ({ id: r.id, name: r.name, text: r.text.slice(0, 6000) }));
    await fs.writeFile(
      path.join(dir, "context.json"),
      JSON.stringify(
        { profile: p.profile, examples, created: new Date().toISOString() },
        null,
        2,
      ),
    );
    // The fixed @xtuned line is appended below; the story itself is written for the remaining budget.
    const outro = projectOutroPack(dir, p.profile);
    const plan = await preproduce(outro ? {...p, duration: contentSeconds(p.duration, outro)} : p, dir, stage, signal);
    updateProject(id, { title: plan.title, plan });
  } else {
    event(
      id,
      "Сохранённый сценарий используется без перезаписи: повторный рендер сохраняет правки редактора.",
    );
  }
  p = project(id)!;
  const outroPack=projectOutroPack(dir,p.profile);
  if(outroPack&&p.plan&&!p.plan.creatorOutro){
    updateProject(id,{plan:appendOutro(p.plan,id,outroPack,p.profile.creatorOutro!.sha256,p.profile.creatorOutro!.language,p.profile.creatorOutro!.brand)});p=project(id)!;
    event(id,`Заставка ${p.plan!.creatorOutro!.username}: фиксированная последняя фраза общего дубля дописана к сценарию.`);
  }
  // Loop ending (2026-10-22): the plan carries the marker into TTS (frame-exact clock, sentence pause at the seam), the
  // director (lands on the first frame), the renderer and the music (seamless cycle). Never added to an outro project.
  if(p.profile.production?.ending==="loop"&&p.plan&&!p.plan.loopEnding&&!p.plan.creatorOutro){
    updateProject(id,{plan:{...p.plan,loopEnding:{version:1}}});p=project(id)!;
    event(id,"Петля: последняя фраза общего дубля переходит в первые слова, на стыке пауза как между предложениями.");
  }
  for(const a of [p.plan?.headerAvatar,p.profile.headerAvatar])if(a&&(!a.file.startsWith(`${id}/branding/`)||await fileHash(path.join(DATA,"projects",a.file))!==a.sha256))throw new Error("Снимок аватара в шапке изменён или принадлежит другому проекту.");
  if(p.plan?.creatorBranding){const b=p.plan.creatorBranding;if(!b.avatarFile.startsWith(`${id}/branding/`)||await fileHash(path.join(DATA,"projects",b.avatarFile))!==b.avatarSha256)throw new Error("Снимок аватара изменён или принадлежит другому проекту.");}
  const budgetFile = path.join(dir, "duration-budget.json");
  const requestedDuration = await fs.readFile(budgetFile, "utf8").then((raw) => {
    const value = JSON.parse(raw).seconds;
    if (!Number.isInteger(value) || value < 3 || value > 180) throw new Error("Некорректный предел длительности.");
    return value as number;
  }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return p!.duration;
  });
  await fs.writeFile(budgetFile, JSON.stringify({seconds: requestedDuration}));
  if(!options.pictureOnly){
    if(p.profile.production?.visualDesignVersion===1){
      stage("Визуальный редактор: что показать зрителю",18);
      const visual=await prepareVisualConcept(p,dir,signal);
      if(visual){
        stage("Claude: собираем детальные 3D-предметы",19);
        let prepared=await prepareDetailedAssets(p,visual,dir,signal);
        // Real logos / people photos the concept recommends (user decision 2026-10-21): Wikidata → Commons, with licence.
        if(visual.media?.length){stage("Берём логотипы и фото из Wikimedia Commons",19);prepared=await prepareMedia(prepared,visual.media,dir,id,projectLanguage(p.profile),signal,m=>event(id,m));}
        updateProject(id,{plan:prepared});p=project(id)!;
        await writeJSON(path.join(dir,"storyboard.json"),prepared);
      }
    }
    if(p.profile.production?.version===2){
      stage("Проверяем актуальный сценарий перед озвучкой",18);
      await auditManualPlan(p,dir,signal,supplementSources);
      if(p.voice)await prepareVoicePlan(p,dir,signal);
    }
  stage(
    p.voice ? (projectLanguage(p.profile)==="en"?"Записываем английскую озвучку":"Записываем русскую озвучку") : "Собираем звуковую дорожку",
    20,
  );
  await fs.writeFile(
    path.join(dir, "render.json"),
    JSON.stringify({
      plan: p.plan,
      voice: p.voice,
      maxDuration: requestedDuration,
      ttsProvider: await fs
        .readFile(path.join(dir, "tts-provider.txt"), "utf8")
        .then((x) => x.trim())
        .catch(() => undefined),
      // Agent mode: a new paid take after a successful one needs the user's explicit confirmation.
      ...(agentModeOf(p.profile)?{paidGate:{confirmed:(await readJSON(path.join(dir,"paid-confirmations.json")))?.tts??[]}}:{}),
    }),
  );
  await fs.writeFile(path.join(dir, "storyboard.json"), JSON.stringify(p.plan));
  // ElevenLabs runs in parallel with other jobs; a 429 / concurrency limit is retried with backoff inside speech.py.
  await run(PYTHON, [path.join(ROOT, "scripts", "speech.py"), dir, FFMPEG], {
    signal,
    timeout: 360_000,
  }).catch((error) => {
    throw PaidGateError.from(String(error?.message ?? error)) ?? error;
  });
  }else{
    await fs.access(path.join(dir,"audio.wav"));
    event(id,"Правим только изображение. Успешная озвучка не вызывается повторно.");
  }
  // Speech provider writes the measured storyboard before rendering. One clock for voice and visuals.
  const measuredSource = JSON.parse(await fs.readFile(path.join(dir, "storyboard.json"), "utf8"));
  const measuredExact = Math.round(measuredSource.scenes.reduce((n: number, s: {seconds: number}) => n + s.seconds, 0) * 30) / 30;
  // A loop film keeps its frame-exact clock (the seam pause must stay a sentence pause); the project row keeps whole seconds ≥ it.
  const loopClock = !!measuredSource.loopEnding;
  const measuredDuration = loopClock ? Math.ceil(measuredExact - 1e-6) : Math.round(measuredExact);
  if (measuredDuration > requestedDuration || measuredDuration > 180) throw new Error("Озвучка превысила предел длительности.");
  let measuredPlan = normalizePlan(measuredSource, loopClock ? measuredExact : measuredDuration, p.voice, requestedDuration, projectLanguage(p.profile));
  const is3D=measuredPlan.filmKind!=="netcode"&&measuredPlan.filmKind!=="isometric"&&p.profile.filmKind!=="isometric"&&(p.profile.renderMode==="three"||measuredPlan.filmKind==="three");
  let models=verifyModelSnapshot(dir);
  if(is3D&&!options.pictureOnly){
    if(p.profile.modelSnapshot&&createHash("sha256").update(JSON.stringify(models)).digest("hex")!==p.profile.modelSnapshot)throw new Error("Снимок библиотеки моделей изменён.");
    stage("3D-режиссёр: модели, свет и движение камеры",27);
    measuredPlan=await prepare3D(measuredPlan,p.profile,dir,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),signal);
    await fs.writeFile(path.join(dir,"storyboard.json"),JSON.stringify(measuredPlan,null,2));
    await fs.writeFile(path.join(dir,"three-plan.json"),JSON.stringify(measuredPlan.world3d,null,2));
  }
  if(measuredPlan.filmKind==="netcode"&&!options.pictureOnly){
    if(!models.length)throw new Error("Для сетевого ролика нужен снимок моделей арены.");
    stage("Motion-режиссёр Claude Opus 5.5: события и камера",27);
    measuredPlan=await prepareNetcode(measuredPlan,dir,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),signal,undefined,"",languageDirective(p.profile,"motion"));
    await fs.writeFile(path.join(dir,"storyboard.json"),JSON.stringify(measuredPlan,null,2));
  }
  // A restyled picture-only job may introduce the illustrated plan; it never touches the measured speech master.
  // Projects created from an illustrated template switch the measured plan to that film kind before staging.
  if(p.profile.filmKind==="illustrated"&&measuredPlan.filmKind!=="illustrated")measuredPlan={...measuredPlan,filmKind:"illustrated"};
  if(measuredPlan.filmKind==="illustrated"&&(!options.pictureOnly||!measuredPlan.illustrated)){
    stage("Motion-режиссёр Claude Opus 5.5: иллюстрированная сцена",27);
    // A translated film re-stages its source project's approved world: same objects and camera, cues moved to the new words.
    const translation=measuredPlan.illustrated?null:await readJSON(path.join(dir,"illustrated-translation-source.json"));
    const feedback=translation?`ПЕРЕВОД ОДОБРЕННОЙ ПОСТАНОВКИ. previousPlan — постановка исходного ролика ${translation.sourceProjectId} на языке ${translation.sourceLanguage}; сценарий выше — его проверенный перевод, главы те же по смыслу и порядку. Сохрани мир, предметы, их координаты, состояния, камеру, рентген и логику переездов. Перенеси каждый anchor на слово с тем же смыслом в той же главе нового текста, переведи label, выноски и bigWords на язык проекта только словами проверенного сценария. В кадре не должно остаться ни одного слова исходного языка. Сохрани уроки исходной постановки: крупное слово не лежит на табличках и выносках, предметы не срезаны краем кадра.`:"";
    measuredPlan=await prepareIllustrated(measuredPlan,dir,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),signal,undefined,feedback,translation?.illustrated,languageDirective(p.profile,"motion"),p.profile.production?.coverageVersion);
    await fs.writeFile(path.join(dir,"storyboard.json"),JSON.stringify(measuredPlan,null,2));
  }
  // isometric/v1 (2026-10-21): projects that chose the «Изометрия» city switch the measured plan to it before staging.
  if(p.profile.filmKind==="isometric"&&measuredPlan.filmKind!=="isometric")measuredPlan={...measuredPlan,filmKind:"isometric"};
  if(measuredPlan.filmKind==="isometric"&&(!options.pictureOnly||!measuredPlan.isometric)){
    stage("Motion-режиссёр Claude Opus 5.5: изометрический город",27);
    measuredPlan=await prepareIsometric(measuredPlan,dir,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),signal,undefined,"",undefined,languageDirective(p.profile,"motion"),p.profile.production?.portraitLayout,p.profile.production?.overlayVersion,p.profile.production?.coverageVersion);
    await fs.writeFile(path.join(dir,"storyboard.json"),JSON.stringify(measuredPlan,null,2));
  }
  if(p.profile.production?.version===2&&!is3D&&!["netcode","telephone-history","illustrated","isometric"].includes(measuredPlan.filmKind||"")&&!options.pictureOnly){
    stage("Claude: постановка сквозной 2D-системы",27);
    measuredPlan=await prepare2D(measuredPlan,p.profile,dir,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),signal);
  }
  const webgl=is3D||measuredPlan.filmKind==="netcode"||measuredPlan.filmKind==="isometric";
  updateProject(id, { plan: measuredPlan, duration: measuredDuration });
  p = project(id)!;
  // Safe zones v1 (2026-10-25): plan-level warnings (text, tiles, cards, landings in zones the platform covers); never blocks.
  if(p.format==="9:16"&&p.profile.production?.safeZonesVersion)try{const zones=planZoneReport(measuredPlan,(await readJSON(path.join(dir,"alignment.json")))||[],p.profile,p.format,ROOT);
    if(zones){await writeJSON(path.join(dir,"safe-zones-plan.json"),zones);if(zones.checked)event(id,planZoneSummary(zones));}}
  catch(e){event(id,`Безопасные зоны: предупреждения по плану не посчитаны (${e instanceof Error?e.message.slice(0,200):"ошибка"}); проверка кадров MP4 остаётся.`);}
  await writeJSON(path.join(dir,"storyboard.json"),measuredPlan);
  if(p.profile.production?.version===2){
    stage("Независимо проверяем подписи постановки",28);
    await auditManualPlan(p,dir,signal,supplementSources);
    if(p.voice){stage("Scribe: сверяем слова непрерывного мастера",30);await verifyAudioText(p,dir,signal);}
    stage("Сводим сохранённый мастер и звуковые акценты",32);
    const outroSounds=outroPack&&measuredPlan.creatorOutro?seedOutroSounds(dir,outroPack):undefined;
    if(outroSounds&&!(outroSounds.click&&outroSounds.success))event(id,"Звуки заставки ещё не выбраны редактором: на входе только утверждённый whoosh.");
    // Mandatory background music (docs/background-music.md): only projects that chose a bed; others keep cue sheet v8.
    let musicBed;
    if(p.profile.musicBed){
      const outro=measuredPlan.creatorOutro?sceneClock(measuredPlan).find(s=>s.id===measuredPlan.creatorOutro!.sceneId):undefined;
      const alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
      const bed=p.profile.musicBed;
      musicBed=await inSlot(id,"фоновая музыка",()=>renderMusicBed(dir,bed,Math.round(measuredPlan.scenes.reduce((n,s)=>n+s.seconds,0)*48000),outro?outro.start:null,signal,{input:arrangementInputFor(measuredPlan,alignment),ffmpeg:FFMPEG,...(measuredPlan.loopEnding?{loop:true}:{})}),signal);
      event(id,`Фоновая музыка ${musicBed.id}: построена под ${(musicBed.samples/48000).toFixed(2)} с${musicBed.arrangement?`, аранжировка по сюжету: ${musicBed.arrangement.accents.length} акцентов, ${musicBed.arrangement.tension.length} провалов`:""}, приглушена под голосом.`);
    }
    const cues=soundCues(measuredPlan,JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8")),outroSounds,musicBed);
    const prepared=await soundLibrary().prepare(cues,dir,signal);
    await writeJSON(path.join(dir,"sound-cues.json"),prepared);
    const effects=await readJSON(path.join(dir,"sound-assets.json"));
    for(const [type,result] of Object.entries(effects.resolutions))if(!["local","openverse","project-snapshot","existing-procedural"].includes(String(result)))event(id,`SFX ${type}: ${result}; используем процедурный акцент.`);
    await inSlot(id,"сведение звука",()=>run(PYTHON,[path.join(ROOT,"scripts/remix.py"),dir,FFMPEG],{signal,timeout:240000}),signal);
  }
  await writeJSON(path.join(dir,"render-input.json"),{version:2,inputHash:digest({plan:p.plan,profile:p.profile,format:p.format}),createdAt:new Date().toISOString()});
  await fs.writeFile(
    path.join(dir, "script.md"),
    scriptMarkdown(
      measuredPlan,
      JSON.parse(await fs.readFile(path.join(dir, "alignment.json"), "utf8")),
    ),
  );
  stage("Рендерим анимацию", 34);
  const props = {
    plan: p.plan!,
    profile: p.profile,
    format: p.format,
    audio: `${id}/audio.wav`,
    models,
    modelBase:`${id}/models`,
    alignment: JSON.parse(
      await fs.readFile(path.join(dir, "alignment.json"), "utf8"),
    ),
  };
  const comp = await inSlot(id,"подготовка рендера",async()=>selectComposition({
    serveUrl: await serveBundle(),
    id: "StudioFilm",
    inputProps: props,
    browserExecutable: CHROME,
    chromiumOptions: webgl?{gl:"angle"}:undefined,
  }),signal);
  const serve=serveUrl!;
  if(agentModeOf(p.profile)&&!options.keyframesChecked&&p.profile.production?.version===2){
    stage("Ведущий агент проверяет 6 ключевых кадров до рендера",34);
    const changes=await keyframeGate(p,dir,comp,props,webgl,signal);
    if(changes){
      stage("Правим постановку по ключевым кадрам без новой озвучки",34);
      await restagePicture(p,dir,`ЗАМЕЧАНИЯ ПО КЛЮЧЕВЫМ КАДРАМ ДО РЕНДЕРА: ${changes.notes} ${JSON.stringify(changes.findings)}`,signal);
      return renderProject(id,signal,{...options,pictureOnly:true,keyframesChecked:true});
    }
  }
  const video = path.join(dir, "video.mp4");
  // Remotion + the final FFmpeg encode are the heavy local part: strictly one render at a time (render slot).
  await inSlot(id,"рендер Remotion и кодирование MP4",async()=>{
  stage("Рендерим анимацию", 34);
  let prev = 34;
  const cancel = makeCancelSignal();
  signal.addEventListener("abort", cancel.cancel, { once: true });
  await renderMedia({
    composition: comp,
    serveUrl: serve,
    codec: "h264",
    outputLocation: path.join(dir, "render.mp4"),
    inputProps: props,
    browserExecutable: CHROME,
    chromiumOptions: webgl?{gl:"angle"}:undefined,
    concurrency: webgl?2:3,
    crf: 20,
    muted: false,
    onProgress: ({ progress }) => {
      if(stopped||signal.aborted)return;
      const n = Math.round(34 + progress * 44);
      if (n >= prev + 3) {
        prev = n;
        updateProject(id, { progress: n });
      }
    },
    cancelSignal: cancel.cancelSignal,
  });
  signal.removeEventListener("abort", cancel.cancel);
  stage("Проверяем файл и тайминги", 80);
  await run(
    FFMPEG,
    [
      "-y",
      "-v",
      "error",
      "-i",
      path.join(dir, "render.mp4"),
      // Use the measured continuous PCM mix directly, avoiding the renderer's intermediate AAC priming delay.
      "-i",
      path.join(dir, "audio.wav"),
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-af",
      `atrim=duration=${p.duration},asetpts=PTS-STARTPTS`,
      "-t",
      String(p.duration),
      "-shortest",
      "-movflags",
      "+faststart",
      video,
    ],
    { signal },
  );
  },signal);
  stage("Проверяем кадры итогового MP4 и непрерывность",85);
  const {review,repairFindings}=await reviewExport(p,dir,signal);
  const repairKey=digest(spokenText(p.plan!));
  const previousRepair=await readJSON(path.join(dir,"motion-repair-budget.json"));
  const agentMode=agentModeOf(p.profile);
  // Agent mode also repairs template films that have a director; an interrupted repair resumes instead of being skipped.
  const repairAllowed=!p.profile.productionTemplate||(!!agentMode&&p.plan!.filmKind!=="telephone-history");
  const unfinished=!!agentMode&&previousRepair?.speechKey===repairKey&&previousRepair?.status==="started";
  if(p.profile.production?.version===2&&repairFindings.length&&!options.repairAttempt&&(previousRepair?.speechKey!==repairKey||unfinished)&&repairAllowed){
    stage("Один проход исправления изображения без новой озвучки",94);
    const budget={speechKey:repairKey,used:1,findings:repairFindings,...(agentMode?{status:"started",agentUsed:previousRepair?.speechKey===repairKey?previousRepair.agentUsed??0:0}:{})};
    await writeJSON(path.join(dir,"motion-repair-budget.json"),budget);
    await restagePicture(p,dir,JSON.stringify(repairFindings),signal);
    await renderProject(id,signal,{pictureOnly:true,repairAttempt:true});
    if(agentMode)await writeJSON(path.join(dir,"motion-repair-budget.json"),{...budget,status:"done"});
    return;
  }
  updateProject(id,{status:review.technicalPassed?"review":"failed",stage:"На просмотре",progress:100,video:`data/projects/${id}/video.mp4`,poster:`data/projects/${id}/poster.jpg`,sheet:`data/projects/${id}/contact-sheet.jpg`,review});
  event(id,"Готово к редакторскому просмотру. Проверки не заменяют проигрывание и прослушивание.");
  await fs.rm(path.join(dir, "render.mp4"), { force: true });
}
async function analyzeStyle(signal: AbortSignal) {
  const refs = references();
  if (!refs.length) throw new Error("Добавьте референсы или транскрипт.");
  const images = refs
    .filter((r) => r.kind === "image")
    .slice(0, 8)
    .map((r) => path.join(ROOT, r.file));
  const transcripts = refs
    .filter((r) => r.kind === "transcript")
    .slice(0, 8)
    .map((r) => ({ name: r.name, text: r.text.slice(0, 11000) }));
  const prompt =
    "Составь краткий профиль стиля по изображению и тексту. По 2 правила в каждом списке, до 1 примера. Поля по-русски. Выделяй только наблюдаемые черты. Если материалов для раздела нет, оставь список пустым и укажи это в description. Это анализ примеров, не обучение модели. Текст: " +
    transcripts.map((t) => t.text).join("\n\n");
  const p = profileSchema.parse(
    await askJSON(
      prompt,
      profileJsonSchema,
      path.join(DATA, "style-analysis", String(Date.now())),
      images,
      signal,
    ),
  );
  const identity = profile();
  saveProfile({
    ...p,
    template: identity.template,
    username: identity.username,
  });
}
/** Jobs whose thinking roles go to the legacy Codex/Claude CLIs keep their old one-at-a-time order among themselves. */
const LLM_KINDS=new Set(["render","picture-only","picture-repair","review-only","author-import","style"]);
const legacyCli=(job:any)=>LLM_KINDS.has(job.kind)&&!agentContext(job,new AbortController().signal);
/** One job from claim to its final row status. Its controller is its own: cancel/pause/park/paid gate stay local. */
async function handleJob(job:any,controller:AbortController){
  const signal=controller.signal,agent=agentContext(job,signal);
  let paused=false;
  // Every job watches its own row and project: `pause` (row → held) or cancel (project/set → cancelled) aborts only it.
  const watch=setInterval(()=>{
    try{
      const row=db().prepare("SELECT status FROM jobs WHERE id=?").get(job.id) as {status:string}|undefined;
      if(row?.status==="held"){paused=true;controller.abort();return;}
      const owner=job.kind==="author-import"?author(job.project_id)?.status:job.project_id?project(job.project_id)?.status:undefined;
      if(owner==="cancelled")controller.abort();
    }catch{}
  },1000);
  try {
    const execute=async()=>{
      if(job.kind === "voice-audition")await runAudition(job.project_id,signal);
      else if(job.kind === "picture-only"){
        const p=project(job.project_id),dir=path.join(DATA,"projects",job.project_id),voice=await readJSON(path.join(dir,"voice-plan.json"));
        if(!p?.plan||p.profile.production?.version!==2||p.voice&&voice?.plainText!==spokenText(p.plan))throw new Error("Повтор изображения требует прежнего проверенного текста и сохранённой озвучки.");
        await renderProject(job.project_id,signal,{pictureOnly:true,repairAttempt:true});
      }
      else if(job.kind === "review-only"){const p=project(job.project_id);if(!p?.plan||!p.video)throw new Error("Нет готового ролика.");const result=await reviewExport(p,path.join(DATA,"projects",p.id),signal);const approvalCurrent=p.status==="approved"&&p.review?.quality?.artifactHash===result.artifactHash&&p.review?.quality?.inputHash===result.review.quality.inputHash;updateProject(p.id,{review:result.review,status:result.review.technicalPassed?(approvalCurrent?"approved":"review"):"failed",stage:"Проверка файла обновлена",progress:100,error:null});}
      else if(job.kind === "author-import")await importAuthor(job.project_id,signal);
      else if(job.kind === "picture-repair")await agentPictureRepair(job.project_id,signal);
      else if (job.kind === "style") await analyzeStyle(signal);
      else await renderProject(job.project_id, signal);
    };
    if(agent)await runAgentJob(agent,execute);else await execute();
    completeJob(job.id, "completed");
  } catch (err) {
    if(paused&&!stopped){
      // `npm run studio -- pause <id>`: the row is already held; answered agent tasks and caches are kept for resume.
      if(job.kind==="author-import"){updateAuthor(job.project_id,{stage:"На паузе"});authorEvent(job.project_id,"Задача на паузе. Продолжить: npm run studio -- resume <id>.");}
      else if(job.project_id&&project(job.project_id)){updateProject(job.project_id,{status:"paused",stage:"На паузе"});event(job.project_id,"Задача поставлена на паузу; другие ролики продолжают работу. Продолжить: npm run studio -- resume "+job.project_id);}
      return;
    }
    if((err instanceof AgentParkedError||err instanceof PaidGateError)&&!stopped&&!signal.aborted){
      // Agent mode: park the job without failing it; other jobs keep running until the agent/user answers.
      db().prepare("UPDATE jobs SET status='held',started=NULL WHERE id=?").run(job.id);
      const message=err instanceof PaidGateError?`Нужно решение пользователя: новая платная озвучка ElevenLabs, ${err.chars} символов. После явного «да»: npm run studio -- confirm ${job.project_id} tts`:err.message;
      if(err instanceof PaidGateError&&job.project_id)await writeJSON(path.join(DATA,"projects",job.project_id,"paid-gate.json"),{kind:"tts",key:err.key,chars:err.chars,requestedAt:new Date().toISOString()});
      if(job.kind==="author-import"){updateAuthor(job.project_id,{stage:"Пауза: ждёт ответов агента"});authorEvent(job.project_id,message);}
      else if(job.project_id){updateProject(job.project_id,{status:err instanceof PaidGateError?"awaiting-user":"awaiting-agent",stage:err instanceof PaidGateError?"Ждёт решения: платная озвучка":"Пауза: ждёт ответов агента"});event(job.project_id,message);}
      return;
    }
    const raw = err instanceof Error ? err.message : String(err);
    if(job.kind==="voice-audition"){await failAudition(job.project_id,raw);completeJob(job.id,"failed",raw.slice(0,700));return;}
    if(job.kind==="author-import"){
      const cancelled=author(job.project_id)?.status==="cancelled";
      if(stopped&&!cancelled){db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=?").run(job.id);updateAuthor(job.project_id,{status:"queued",stage:"Ожидает запуска студии"});return;}
      const message=raw.includes("codex завершился")?"Не удалось завершить анализ Codex. Готовые этапы сохранены.":raw.slice(0,700);
      if(!cancelled){updateAuthor(job.project_id,{status:"failed",stage:"Нужно продолжить обработку",error:message});authorEvent(job.project_id,message);}
      completeJob(job.id,cancelled?"cancelled":"failed",cancelled?null:message);return;
    }
    const cancelled =
      job.project_id && project(job.project_id)?.status === "cancelled";
    if (stopped && !cancelled) {
      // Engine restart: running → queued; agent tasks are reused by prompt hash, caches keep paid work.
      db()
        .prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=?")
        .run(job.id);
      if (job.project_id)
        updateProject(job.project_id, {
          status: "queued",
          stage: "Ожидает запуска студии",
        });
      return;
    }
    let msg = raw;
    if (raw.includes("codex завершился"))
      msg =
        "Не удалось получить ответ Codex. Проверьте вход в Настройках и повторите задачу.";
    const fitting = /Сцена \d+: озвучка[^\n]+/.exec(raw);
    if (fitting) msg = fitting[0];
    else if (raw.includes("ElevenLabs:"))
      msg = raw.slice(raw.indexOf("ElevenLabs:")).split("\n")[0];
    else if (raw.includes("speech.py") || raw.includes("edge_tts"))
      msg =
        "Сервис озвучки недоступен. Повторите задачу или создайте ролик без речи.";
    if (job.project_id && !cancelled) {
      updateProject(job.project_id, {
        status: "failed",
        stage: "Нужна доработка",
        error: msg.slice(0, 800),
      });
      event(job.project_id, msg.slice(0, 800));
    }
    completeJob(
      job.id,
      cancelled ? "cancelled" : "failed",
      msg.slice(0, 800),
    );
    console.error(`Задача ${job.id}: ${msg.slice(0, 300)}`);
  } finally {
    clearInterval(watch);
  }
}
/** What `npm run studio -- status` shows: active jobs of this engine and the render slot. */
function engineState(){
  const config=engineConfig();
  return {pid:process.pid,updatedAt:new Date().toISOString(),maxActiveJobs:config.engine.maxActiveJobs,renderSlots:config.engine.renderSlots,
    active:[...(scheduler?.active.values()??[])].map(a=>({job:a.job.id,kind:a.job.kind,project:a.job.project_id,startedAt:new Date(a.startedAt).toISOString()})),
    slot:slot.state()};
}
async function main() {
  await fs.mkdir(DATA, { recursive: true });
  const lock = path.join(DATA, "worker.lock");
  try {
    const pid = Number(await fs.readFile(lock, "utf8"));
    try {
      process.kill(pid, 0);
      // On Windows a reused PID may belong to another program: trust the lock only with a fresh heartbeat.
      const fresh = (() => { try { return Date.now() - statSync(BEAT_FILE).mtimeMs < 90_000; } catch { return false; } })();
      if (process.platform !== "win32" || fresh) throw new Error("Очередь уже запущена.");
      throw Object.assign(new Error("stale"), { code: "ESRCH" });
    } catch (e: any) {
      if (e.code !== "ESRCH") throw e;
    }
    await fs.rm(lock);
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
  }
  await fs.writeFile(lock, String(process.pid), { flag: "wx" });
  db()
    .prepare(
      "UPDATE jobs SET status='queued',started=NULL WHERE status='running'",
    )
    .run();
  console.log(`Движок Motion Studio запущен (pid ${process.pid}): задачи идут параллельно, рендер — по одному.`);
  const beat = () =>{
    const d=db().prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)");
    d.run("workerSeen", new Date().toISOString());
    d.run("engineState", JSON.stringify(engineState()));
    try { writeFileSync(BEAT_FILE, String(process.pid)); } catch {}
  };
  scheduler=new JobScheduler<any>({
    claim:(running)=>{const legacyBusy=running.some(legacyCli);return claimJob(job=>!(legacyBusy&&legacyCli(job)));},
    execute:handleJob,
    limit:()=>activeJobLimit(engineConfig()),
    onCrash:(job,e)=>console.error(`Задача ${job.id}: ${e instanceof Error?e.message:e}`),
  });
  beat();
  const heartbeat = setInterval(()=>{try{beat();}catch(e){console.error(e);}}, 5000);
  while (!stopped) {
    if (stopRequested()) { stopped = true; break; }
    if(scheduler.fill())beat();
    await scheduler.tick(1200);
  }
  scheduler.abortAll();
  await scheduler.drain();
  clearInterval(heartbeat);
  db().prepare("DELETE FROM settings WHERE key='engineState'").run();
  await fs.rm(lock, { force: true });
  await fs.rm(BEAT_FILE, { force: true });
  db().close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
