// Motion Studio agent CLI: a chat agent (Claude Code, Codex, ...) drives the studio from the terminal.
// Run from the studio folder: npm run studio -- <command>. See .agents/skills/motion-studio/SKILL.md.
import fs from "node:fs/promises";
import {existsSync,statSync} from "node:fs";
import path from "node:path";
import {db,project,updateProject,enqueue,event,DATA,ROOT} from "../src/lib/store";
import {listVideoTemplates,loadVideoTemplate,IMPLEMENTED_STYLE_SAMPLES} from "../src/lib/video-templates";
import {saveTemplate,saveStyleSample} from "../src/lib/template-save";
import {createFromRequest} from "../src/lib/create-request";
import {approveProject} from "../src/lib/approval";
import {activeTasks,listTasks,submitAnswer,tasksDir} from "../src/lib/agent-provider";
import {agentModeOf} from "../src/lib/quality-contract";
import {readJSON,writeJSON} from "../src/lib/quality";
import {author,authorDir,authorEvent,createReferenceSet,updateAuthor} from "../src/lib/author-store";
import {FFMPEG,CHROME,TAVILY} from "../src/lib/provider";
import {serverSecrets} from "../src/lib/server-secrets";
import {studioConfig,setConfig,configKeys,configValue,configExplicit,configPath,GUARDED_KEYS} from "../src/lib/studio-config";
import {enginePid,startEngine,stopEngine,runEngineForeground,startUi,stopUi,uiUp,enginePaths} from "../src/lib/engine-control";

const EXIT={ready:0,failed:1,cancelled:2,tasks:10,user:11,revision:12,paused:13,running:20,worker:30} as const;
const uiPort=()=>Number(process.env.PORT)||studioConfig(ROOT).ui.port;
const URL_BASE=`http://127.0.0.1:${uiPort()}`;
type Args={_:string[];[k:string]:string|boolean|string[]};
function parse(argv:string[]):Args{
 const out:Args={_:[]};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a.startsWith("--")){const key=a.slice(2),next=argv[i+1];if(next===undefined||next.startsWith("--"))out[key]=true;else{out[key]=next;i++;}}
  else out._.push(a);
 }
 return out;
}
const str=(a:Args,k:string)=>typeof a[k]==="string"?a[k] as string:undefined;
const need=(a:Args,k:string,hint:string)=>{const v=str(a,k);if(!v)throw new Error(`Нужен --${k} ${hint}`);return v;};
const say=(...lines:string[])=>console.log(lines.join("\n"));
const workerAge=()=>{const row=db().prepare("SELECT value FROM settings WHERE key='workerSeen'").get() as {value:string}|undefined;return row?Date.now()-Date.parse(row.value):Infinity;};
const jobsOf=(id:string)=>db().prepare("SELECT id,kind,status,error,agent FROM jobs WHERE project_id=? ORDER BY created DESC,rowid DESC LIMIT 5").all(id) as any[];
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

type Scope={kind:"project"|"author"|"style";id:string;dir:string};
function scopeOf(id:string):Scope{
 if(id==="style")return {kind:"style",id,dir:path.join(DATA,"style-analysis")};
 if(project(id))return {kind:"project",id,dir:path.join(DATA,"projects",id)};
 if(/^[a-f0-9-]{36}$/.test(id)&&author(id))return {kind:"author",id,dir:authorDir(id)};
 throw new Error(`Проект или подборка ${id} не найдены.`);
}
function printTasks(scope:Scope,all=false){
 const tasks=all?listTasks(scope.dir):activeTasks(scope.dir);
 if(!tasks.length){say("Заданий для агента нет.");return 0;}
 say(`Заданий: ${tasks.length}. Для каждого: прочитай prompt.md (и images/), ответь JSON строго по schema.json в answer.json, затем npm run studio -- submit ${scope.id} <id>${tasks.some(t=>t.isolation==="recommended")?" --isolated (если ответ писал отдельный сабагент)":""}.`);
 for(const t of tasks){
  const size=existsSync(path.join(t.path,"prompt.md"))?Math.round(statSync(path.join(t.path,"prompt.md")).size/1024):0;
  say(`- ${t.id} [${t.status}] роль=${t.role}${t.isolation==="recommended"?" · независимая роль: отдай свежему сабагенту":""}`,`  папка: ${path.relative(ROOT,t.path)} · prompt.md ${size} КБ${t.images.length?` · изображений ${t.images.length}`:""}${t.hint.model?` · исходная роль: ${t.hint.model}/${t.hint.effort??""}`:""}`);
 }
 return tasks.length;
}
function summary(id:string){
 const p=project(id)!;const dir=path.join(DATA,"projects",id);
 const review=p.review||{};const q=review.quality;
 const lines=[`Проект ${id} · «${p.title}» · ${p.status} · ${p.stage} · ${p.progress}%`];
 if(p.video)lines.push(`MP4: ${p.video}`,`Постер: ${p.poster??"—"} · контактный лист: ${p.sheet??"—"}`);
 if(review.checks)lines.push(...review.checks.map((c:any)=>`  ${c.ok?"✓":"✗"} ${c.label}: ${String(c.detail??"").slice(0,200)}`));
 if(q)lines.push(`Ревью итогового MP4: ${q.status}; замечаний ${q.findings?.length??0}; кадров ${q.coverage?.sampledFrames??"?"}; humanPlayback=false (кадры ≠ просмотр).`,...(q.findings||[]).slice(0,12).map((f:any)=>`  · ${f.severity} ${f.kind} ${Number(f.start).toFixed(1)}–${Number(f.end).toFixed(1)} с: ${String(f.detail).slice(0,220)}`));
 if(existsSync(path.join(dir,"quality")))lines.push(`Кадры ревью: ${path.relative(ROOT,path.join(dir,"quality"))}/<hash>/sheet-*.jpg`);
 lines.push(`В студии: ${URL_BASE} · проект ${id}`);
 return lines.join("\n");
}
async function requeueHeld(id:string,stage:string){
 const held=db().prepare("SELECT id FROM jobs WHERE project_id=? AND status='held' ORDER BY created DESC LIMIT 1").get(id) as {id:string}|undefined;
 if(!held)return false;
 db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=?").run(held.id);
 if(project(id))updateProject(id,{status:"queued",stage,error:null});else updateAuthor(id,{stage});
 return true;
}

/** One look at a run: an exit code when the agent must act (or the run ended), null while it is still in progress. */
async function check(id:string,scope:Scope,last:Map<string,string>,many:boolean):Promise<number|null>{
 const head=(line:string)=>{if(last.get(id)!==line){say(`[${new Date().toLocaleTimeString("ru-RU")}] ${many?`${id.slice(0,8)} `:""}${line}`);last.set(id,line);}};
 const tag=()=>{if(many)say(`== ${id} ==`);};
 if(scope.kind==="project"){
  const p=project(id)!;head(`${p.status} · ${p.stage} · ${p.progress}%`);
  const held=jobsOf(id).find(j=>j.status==="held");
  if(p.status==="awaiting-agent"){
   if(held){await requeueHeld(id,"Продолжаем после паузы агента");say(`${many?`${id.slice(0,8)}: `:""}Задача была на паузе — возвращена в очередь.`);return null;}
   if(activeTasks(scope.dir).length){tag();printTasks(scope);return EXIT.tasks;}
  }
  if(p.status==="awaiting-user"){tag();const gate=await readJSON(path.join(scope.dir,"paid-gate.json"));say(`Нужно решение пользователя: новая платная озвучка ElevenLabs${gate?`, ${gate.chars} символов`:""}. Спроси пользователя. Только после явного «да»: npm run studio -- confirm ${id} tts --quote "<его слова>"`);return EXIT.user;}
  if(p.status==="review"||p.status==="approved"){tag();say(summary(id));return EXIT.ready;}
  if(p.status==="failed"){tag();say(`Ошибка: ${p.error??"см. журнал"}`,`Журнал: npm run studio -- status ${id}`);return EXIT.failed;}
  if(p.status==="cancelled"){tag();say("Проект остановлен.");return EXIT.cancelled;}
  if(p.status==="paused"){tag();say(`Проект на паузе. Продолжить: npm run studio -- resume ${id}`);return EXIT.paused;}
  if(p.status==="revision"||p.status==="draft"){tag();say(`Проект изменён и ждёт рендера: npm run studio -- retry ${id}`);return EXIT.revision;}
 }else if(scope.kind==="author"){
  const r=author(id);head(`${r.status} · ${r.stage} · ${r.progress??0}%`);
  if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status='held'").get(id)&&!activeTasks(scope.dir).length){await requeueHeld(id,"Продолжаем после паузы агента");return null;}
  if(activeTasks(scope.dir).length){tag();printTasks(scope);return EXIT.tasks;}
  if(["ready","partial"].includes(r.status)){tag();say(`Подборка готова: ${r.status}. Каталог: ${path.relative(ROOT,path.join(scope.dir,"PROFILE.md"))}; планы: ${path.relative(ROOT,scope.dir)}/<videoId>/REBUILD.md`);return EXIT.ready;}
  if(r.status==="failed"){tag();say(`Ошибка: ${r.error??""}`);return EXIT.failed;}
  if(r.status==="cancelled")return EXIT.cancelled;
 }else{
  const job=db().prepare("SELECT status,error FROM jobs WHERE kind='style' ORDER BY created DESC,rowid DESC LIMIT 1").get() as any;
  if(activeTasks(scope.dir).length){tag();printTasks(scope);return EXIT.tasks;}
  if(job?.status==="completed"){say("Профиль стиля обновлён.");return EXIT.ready;}
  if(job?.status==="failed"){say(`Ошибка: ${job.error}`);return EXIT.failed;}
 }
 return null;
}
/**
 * Blocks until the run needs the agent or the user, or is finished. Several ids (one agent driving several videos):
 * returns as soon as any of them needs attention, printing which one (MOTION_STUDIO_FOCUS=<id>).
 */
async function run(a:Args){
 const ids=a._.slice(1);if(!ids.length)throw new Error("npm run studio -- run <id> [<id2> …] [--timeout 540]");
 const scopes=ids.map(id=>[id,scopeOf(id)] as const),many=ids.length>1,timeout=Number(str(a,"timeout")??540)*1000,started=Date.now();
 const last=new Map<string,string>();
 for(;;){
  if(workerAge()>15_000){
   const pid=enginePid(ROOT);
   if(!pid){
    if(!studioConfig(ROOT).engine.autostart){say(ENGINE_HINT);return EXIT.worker;}
    const r=await startEngine(ROOT);say(`Движок запущен (engine.autostart): pid ${r.pid}.`);continue;
   }
   if(workerAge()>60_000){say(`Движок (pid ${pid}) не подаёт сигнал больше минуты. Журнал: ${path.relative(ROOT,enginePaths(ROOT).log)}; перезапуск только по согласованию: npm run studio -- status, затем stop/start в терминале пользователя.`);return EXIT.worker;}
  }
  for(const [id,scope] of scopes){
   const code=await check(id,scope,last,many);
   if(code!==null){if(many)say(`MOTION_STUDIO_FOCUS=${id}`,`Остальные ролики продолжают работу; после ответа снова: npm run studio -- run ${ids.join(" ")}`);return code;}
  }
  if(Date.now()-started>timeout){say(`Ещё выполняется. Повтори: npm run studio -- run ${ids.join(" ")} --timeout 540`);return EXIT.running;}
  await sleep(2000);
 }
}

/** Flag > value set in studio.config.json > template default > built-in default. */
function setting<T>(a:Args,flag:string,key:string,template:T|undefined,parse:(v:string)=>T=(v)=>v as T):T{
 const v=str(a,flag);if(v!==undefined)return parse(v);
 if(configExplicit(key,ROOT))return configValue(studioConfig(ROOT),key) as T;
 return template!==undefined?template:configValue(studioConfig(ROOT),key) as T;
}
async function create(a:Args){
 const legacy=str(a,"engine")==="legacy",config=studioConfig(ROOT);
 const declaredAgent=legacy?undefined:(str(a,"agent")??process.env.MOTION_STUDIO_AGENT??config.agent.declared??need(a,"agent","\"<среда/модель>\", например \"claude-code/claude-opus-5-5\" или \"codex/gpt-6.1-sol\" (самоотчёт); по умолчанию можно задать: npm run studio -- config set agent.declared \"…\""));
 // Two channel accounts (2026-10-20): with defaults.brand=ask a video without a named account is not created.
 const brand=str(a,"brand")??(config.defaults.brand==="ask"?undefined:config.defaults.brand);
 if(!brand){say("Не указан аккаунт. Спроси пользователя, для какого аккаунта ролик: Kagenami (--brand kagenami) или World If Then (--brand worldifthen); @xtuned — --brand xtuned. Аккаунт по умолчанию: npm run studio -- config set defaults.brand <бренд|ask>.");return EXIT.user;}
 const templateFlag=str(a,"template"),templateId=templateFlag==="none"||(!templateFlag&&str(a,"film-kind"))?undefined:templateFlag??config.defaults.template??undefined;
 let template:any;
 if(templateId){try{template=loadVideoTemplate(templateId,ROOT).manifest;}catch(e){throw new Error(`Шаблон ${templateId} не найден или повреждён (${e instanceof Error?e.message:e}). Список: npm run studio -- templates`);}}
 const body={
  topic:need(a,"topic","\"тема и конкретный пример\""),
  duration:setting(a,"duration","defaults.duration",template?.defaults?.duration,Number),
  format:setting(a,"format","defaults.format",template?.defaults?.format),
  voice:setting(a,"voice","defaults.voice",undefined,v=>v!=="off"),
  ...(templateId?{productionTemplateId:templateId}:{}),
  ...(str(a,"render-mode")?{renderMode:str(a,"render-mode")}:{}),
  ...(str(a,"reference")?{referenceSetId:str(a,"reference")}:{}),
  factCheck:setting(a,"fact-check","defaults.factCheck",template?.defaults?.factCheck),
  // Absent language means Russian (prompts and caches byte-identical), so "ru" is never written explicitly.
  ...(setting(a,"lang","defaults.language",template?.defaults?.language==="en"?"en":undefined)==="en"?{language:"en"}:{}),
  ...(brand!=="xtuned"?{brand}:{}),
  ...(str(a,"layout")?{portraitLayout:str(a,"layout")}:{}),
  ...(str(a,"music")?{musicBed:str(a,"music")}:{}),
  ...(str(a,"film-kind")?{filmKind:str(a,"film-kind")}:{}),
  ...(str(a,"ending")?{ending:str(a,"ending")}:{}),
  ...(legacy&&str(a,"content-model")?{contentModel:str(a,"content-model")}:{}),
 };
 const id=await createFromRequest(body,declaredAgent?{agentMode:{declaredAgent}}:{});
 say(`Создан проект ${id}${declaredAgent?` · агентный режим (${declaredAgent})`:" · встроенные Codex/Claude"}`,`MOTION_STUDIO_RUN=${id}`,`Дальше: npm run studio -- run ${id} --timeout 540`);
 return 0;
}

const ENGINE_HINT="Движок студии не запущен. Запусти его в терминале пользователя: npm run studio -- start (в Claude desktop — терминальная панель / run_in_terminal: в песочнице Bash нет входа Tavily). Затем повтори run. Чтобы run запускал движок сам: npm run studio -- config set engine.autostart true (только там, где у shell агента есть вход Tavily).";
function engineLine(){
 const age=workerAge(),pid=enginePid(ROOT);
 const raw=(db().prepare("SELECT value FROM settings WHERE key='engineState'").get() as {value:string}|undefined)?.value;
 let state:any=null;try{state=raw?JSON.parse(raw):null;}catch{}
 if(age>=15_000&&!pid)return {up:false,lines:[`Движок: НЕ ЗАПУЩЕН — npm run studio -- start в терминале пользователя`]};
 if(!state)return {up:true,lines:[`Движок: работает (pid ${pid||"?"}, сигнал ${Math.round(age/1000)} с назад), но это прежняя версия с одной последовательной очередью. Параллельная включится после перезапуска (между задачами): npm run studio -- stop, затем start.`]};
 const lines=[`Движок: работает (pid ${pid||state.pid||"?"}, сигнал ${Math.round(age/1000)} с назад) · активных задач: ${state.active?.length??0} (предел: ${state.maxActiveJobs?state.maxActiveJobs:"без предела"}) · слотов рендера: ${state.renderSlots??1}`];
 if(state?.slot){const s=state.slot;lines.push(`Слот рендера: ${s.active.length?s.active.map((h:any)=>`«${h.label}» ${Math.round((Date.now()-h.since)/1000)} с`).join(", "):"свободен"}${s.waiting.length?` · ждут: ${s.waiting.map((h:any)=>`«${h.label}»`).join(", ")}`:""}`);}
 return {up:true,lines};
}
async function main(){
 const a=parse(process.argv.slice(2)),cmd=a._[0];
 switch(cmd){
  case "start":{
   if(a.foreground){if(enginePid(ROOT)){say(`Движок уже запущен (pid ${enginePid(ROOT)}).`);return 0;}say("Движок в этом терминале; Ctrl+C останавливает его (выполняющиеся задачи вернутся в очередь).");return runEngineForeground(ROOT);}
   const r=await startEngine(ROOT);
   say(r.started?`Движок запущен в фоне (pid ${r.pid}), без Next.js. Журнал: ${path.relative(ROOT,enginePaths(ROOT).log)}`:`Движок уже запущен (pid ${r.pid}).`,"Состояние: npm run studio -- status · UI по просьбе человека: npm run studio -- ui");return 0;
  }
  case "stop":{
   const pid=enginePid(ROOT);if(!pid){say("Движок не запущен.");return 0;}
   const running=db().prepare("SELECT j.kind,j.project_id,p.title,p.status,p.stage FROM jobs j LEFT JOIN projects p ON p.id=j.project_id WHERE j.status='running'").all() as any[];
   if(running.length&&!a.force){
    say(`Движок выполняет задачи (${running.length}). Остановка прервёт их: они вернутся в очередь, ответы агента и кэши сохранятся, но рендер начнётся заново.`,...running.map(j=>`  ${j.status==="awaiting-agent"?"ждёт агента":"работает"} ${j.kind} ${j.project_id??""} «${j.title??""}» ${j.stage??""}`),"Не прерывай чужие задачи. Если остановка согласована: npm run studio -- stop --force");
    return EXIT.running;
   }
   const r=await stopEngine(ROOT);say(r.stopped?`Движок остановлен (pid ${r.pid}). Выполнявшиеся задачи вернутся в очередь при следующем start.`:"Движок не запущен.");return 0;
  }
  case "ui":{
   if(a._[1]==="stop"){say(await stopUi(ROOT)?"UI остановлен.":"UI, запущенный командой studio ui, не найден (UI из npm start останавливается там же).");return 0;}
   const r=await startUi(ROOT,uiPort(),{dev:!!a.dev});
   say(r.started?`UI запущен: ${r.url} (только 127.0.0.1). Остановить: npm run studio -- ui stop`:`UI уже открыт: ${r.url}`);
   if(!enginePid(ROOT)&&workerAge()>15_000)say("Движок не запущен — UI покажет данные, но задачи не пойдут: npm run studio -- start");
   if(a.open){const {spawn}=await import("node:child_process");spawn("open",[r.url],{stdio:"ignore",detached:true}).unref();}
   return 0;
  }
  case "config":{
   const sub=a._[1],key=a._[2];
   if(!sub||sub==="get"){
    const config=studioConfig(ROOT);
    if(key){if(!configKeys().includes(key))throw new Error(`Нет такой настройки: ${key}`);say(JSON.stringify(configValue(config,key)));return 0;}
    say(`Настройки скилла: ${path.relative(ROOT,configPath(ROOT))}${existsSync(configPath(ROOT))?"":" (файла нет — всё по умолчанию)"}. Секреты здесь не хранятся: только .env.local.`);
    for(const k of configKeys())say(`  ${k} = ${JSON.stringify(configValue(config,k))}${configExplicit(k,ROOT)?"":" (по умолчанию)"}${GUARDED_KEYS.has(k)?" · меняется только по словам пользователя (--user-confirmed)":""}`);
    return 0;
   }
   if(sub==="set"){const value=a._[3];if(!key||value===undefined)throw new Error("npm run studio -- config set <ключ> <значение> [--user-confirmed \"<слова пользователя>\"]");say(`${key} = ${JSON.stringify(setConfig(key,value,{userQuote:str(a,"user-confirmed"),root:ROOT}))}`);return 0;}
   if(sub==="unset"){if(!key)throw new Error("npm run studio -- config unset <ключ>");say(`${key} = ${JSON.stringify(setConfig(key,null,{userQuote:str(a,"user-confirmed"),root:ROOT}))} (по умолчанию)`);return 0;}
   throw new Error("npm run studio -- config get [ключ] | set <ключ> <значение> | unset <ключ>");
  }
  case "status":{
   const id=a._[1];
   if(id){const s=scopeOf(id);if(s.kind==="project"){say(summary(id));const ev=db().prepare("SELECT message,created FROM events WHERE project_id=? ORDER BY id DESC LIMIT 12").all(id) as any[];say("Журнал:",...ev.reverse().map(e=>`  ${e.created.slice(11,19)} ${String(e.message).slice(0,220)}`));}else say(JSON.stringify(s.kind==="author"?{status:author(id).status,stage:author(id).stage}:{},null,1));return 0;}
   const keys=await serverSecrets(),engine=engineLine(),config=studioConfig(ROOT);
   const active=db().prepare("SELECT j.kind,j.status,j.project_id,p.title,p.status AS projectStatus,p.stage FROM jobs j LEFT JOIN projects p ON p.id=j.project_id WHERE j.status IN ('queued','running','held') ORDER BY j.created").all() as any[];
   say(...engine.lines,
    `UI: ${await uiUp(uiPort())?`открыт ${URL_BASE}`:`не запущен (по просьбе человека: npm run studio -- ui)`}`,
    `Настройки: аккаунт ${config.defaults.brand==="ask"?"— спрашивать":config.defaults.brand} · язык ${config.defaults.language} · шаблон ${config.defaults.template??"—"} · ${config.defaults.duration} с · фактчекинг ${config.defaults.factCheck} · озвучка ${config.defaults.voice?"вкл":"выкл"} · агент ${config.agent.declared??"— (--agent)"} (npm run studio -- config get)`,
    `FFmpeg: ${existsSync(FFMPEG)?"есть":"нет"} · Chrome для рендера: ${existsSync(CHROME)?"есть":"нет"} · Tavily CLI: ${existsSync(TAVILY)?"есть":"нет"}`,
    `ElevenLabs: ${keys.ELEVENLABS_API_KEY?"ключ настроен":"ключ не настроен (только ролик без речи)"} · Apify: ${keys.APIFY_TOKEN?"настроен":"не настроен"}`,
    `Активные задачи: ${active.length?"":"нет"}`,...active.map(j=>`  ${j.status==="running"&&j.projectStatus==="awaiting-agent"?"ждёт агента":j.status==="held"?"на паузе":j.status} ${j.kind} ${j.project_id??""} ${j.title??""} ${j.stage??""}`));
   return 0;
  }
  case "templates":{
   for(const t of listVideoTemplates(ROOT) as any[])say(`- ${t.id} v${t.version} · ${t.name}: ${t.description}`,`  по умолчанию: ${t.defaults?.duration} с, ${t.defaults?.format}${t.runtime?.filmKind?`, тип ${t.runtime.filmKind}`:""}${t.runtime?.renderMode?`, рендер ${t.runtime.renderMode}`:""}${t.styleSample?(IMPLEMENTED_STYLE_SAMPLES[t.styleSample.renderer]?` · ОБРАЗЕЦ СТИЛЯ, реализован как --film-kind ${IMPLEMENTED_STYLE_SAMPLES[t.styleSample.renderer]} (шаблон по нему не создаёт проект)`:" · ОБРАЗЕЦ СТИЛЯ: рендерер не подключён, проект по нему не создаётся"):""}`);
   say("Без --template проект делается в текущем стиле автора (2D/3D по --render-mode).");return 0;
  }
  case "create":return create(a);
  case "run":return run(a);
  case "task":{const id=a._[1];if(!id)throw new Error("npm run studio -- task <id> [--all]");printTasks(scopeOf(id),!!a.all);return 0;}
  case "submit":{
   const [_, id, taskId]=a._;if(!id||!taskId)throw new Error("npm run studio -- submit <id> <taskId> [--isolated]");
   const dir=path.join(tasksDir(scopeOf(id).dir),taskId);
   if(!existsSync(path.join(dir,"meta.json")))throw new Error(`Задание ${taskId} не найдено.`);
   const result=await submitAnswer(dir,{isolated:!!a.isolated});
   if(!result.ok){say("Ответ не прошёл схему — исправь answer.json и отправь снова:",...result.errors.map(e=>`  · ${e}`));return EXIT.failed;}
   say(`Принято: ${taskId}. Worker продолжит сам; дальше: npm run studio -- run ${id}`);return 0;
  }
  case "confirm":{
   const [_, id, kind]=a._;if(!id||kind!=="tts")throw new Error("npm run studio -- confirm <id> tts --quote \"<слова пользователя>\"");
   const quote=need(a,"quote","\"<дословное согласие пользователя>\"");
   const dir=path.join(DATA,"projects",id),gate=await readJSON(path.join(dir,"paid-gate.json"));
   if(!gate?.key)throw new Error("Нет ожидающего платного шага.");
   const saved=(await readJSON(path.join(dir,"paid-confirmations.json")))??{tts:[],log:[]};
   await writeJSON(path.join(dir,"paid-confirmations.json"),{tts:[...new Set([...saved.tts,gate.key])],log:[...saved.log,{kind:"tts",key:gate.key,chars:gate.chars,userQuote:quote.slice(0,500),at:new Date().toISOString()}]});
   await fs.rm(path.join(dir,"paid-gate.json"),{force:true});
   event(id,`Пользователь подтвердил новую платную озвучку (${gate.chars} символов): «${quote.slice(0,200)}».`);
   if(!await requeueHeld(id,"Озвучка подтверждена")){enqueue(id);updateProject(id,{status:"queued",stage:"Озвучка подтверждена",error:null});}
   say(`Подтверждено. Дальше: npm run studio -- run ${id}`);return 0;
  }
  case "repair":{
   const id=a._[1];if(!id)throw new Error("npm run studio -- repair <id> --notes \"...\" | --notes-file path");
   const notes=str(a,"notes")??(str(a,"notes-file")?await fs.readFile(str(a,"notes-file")!,"utf8"):undefined);
   if(!notes?.trim())throw new Error("Нужны заметки: --notes или --notes-file.");
   const p=project(id);if(!p||!agentModeOf(p.profile))throw new Error("Правка по заметкам доступна агентным проектам.");
   await writeJSON(path.join(DATA,"projects",id,"agent-repair-request.json"),{notes:notes.slice(0,6000),requestedAt:new Date().toISOString()});
   enqueue(id,"picture-repair");updateProject(id,{status:"queued",stage:"Правка изображения в очереди",error:null});
   say(`Правка изображения поставлена (без новой озвучки). Дальше: npm run studio -- run ${id}`);return 0;
  }
  case "narrative":{
   const [_, id, file]=a._;if(!id||!file)throw new Error("npm run studio -- narrative <id> <file.txt>");
   const p=project(id);if(!p)throw new Error("Проект не найден.");
   if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id))throw new Error("Дождитесь завершения задачи перед правкой.");
   const {saveManualNarrative}=await import("../src/lib/narrative-edit");
   const dir=path.join(DATA,"projects",id),budget=await readJSON(path.join(dir,"duration-budget.json"));
   const next=await saveManualNarrative(p,dir,await fs.readFile(file,"utf8"));
   if(next){updateProject(id,{plan:null,review:null,duration:budget?.seconds??p.duration,status:"revision",stage:"Цельный рассказ изменён",error:null});event(id,"Авторская редакция рассказа сохранена через агента. Новая озвучка потребует подтверждения пользователя.");}
   say(`Рассказ сохранён. Рендер: npm run studio -- retry ${id} (новая озвучка остановится на подтверждении пользователя).`);return 0;
  }
  case "retry":{
   const id=a._[1];const p=id&&project(id);if(!p)throw new Error("npm run studio -- retry <id>");
   if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running','held')").get(id))throw new Error("Задача уже в очереди или на паузе: npm run studio -- run <id>.");
   enqueue(id);updateProject(id,{status:"queued",stage:"В очереди",progress:0,error:null});say(`В очереди. Дальше: npm run studio -- run ${id}`);return 0;
  }
  case "approve":{
   const id=a._[1];const p=id&&project(id);if(!p)throw new Error("npm run studio -- approve <id> --quote \"<дословная фраза пользователя>\"");
   const quote=need(a,"quote","\"<дословная фраза пользователя>\"");
   await approveProject(id,{feedback:str(a,"feedback")??null,agentChat:{userQuote:quote,declaredAgent:agentModeOf(p.profile)?.declaredAgent??need(a,"agent","\"<среда/модель>\"")}});
   say(`Проект ${id} принят по словам пользователя: «${quote}».`);return 0;
  }
  case "cancel":{
   const id=a._[1];if(!id)throw new Error("npm run studio -- cancel <id>");
   if(project(id)){updateProject(id,{status:"cancelled",stage:"Остановлено"});db().prepare("UPDATE jobs SET status='cancelled',finished=? WHERE project_id=? AND status IN ('queued','held')").run(new Date().toISOString(),id);event(id,"Остановлено ведущим агентом по просьбе пользователя.");}
   else{updateAuthor(id,{status:"cancelled",stage:"Остановлен пользователем"});db().prepare("UPDATE jobs SET status='cancelled',finished=? WHERE project_id=? AND status IN ('queued','held')").run(new Date().toISOString(),id);authorEvent(id,"Остановлено ведущим агентом.");}
   say("Остановка запрошена.");return 0;
  }
  case "release":{const id=a._[1];if(!id)throw new Error("npm run studio -- release <id>");scopeOf(id);say("Ролик больше не удерживает эту сессию агента (его ведёт другая сессия или пользователь).",`MOTION_STUDIO_RELEASE=${id}`);return 0;}
  case "resume":{const id=a._[1];if(!id)throw new Error("npm run studio -- resume <id>");say(await requeueHeld(id,"Продолжаем")?"Возвращено в очередь.":"Нет задачи на паузе.");return 0;}
  case "pause":{
   // Pauses only this project's job (queued or running); the engine aborts it within a second, other videos continue.
   const id=a._[1];if(!id)throw new Error("npm run studio -- pause <id>");
   const r=db().prepare("UPDATE jobs SET status='held' WHERE project_id=? AND status IN ('queued','running')").run(id);
   if(r.changes&&project(id)){updateProject(id,{status:"paused",stage:"На паузе"});event(id,"Поставлено на паузу ведущим агентом; другие ролики продолжают работу.");}
   say(r.changes?`Поставлено на паузу. Продолжить: npm run studio -- resume ${id}`:"Нет задачи в очереди или в работе.");return 0;
  }
  case "template":{
   if(a._[1]==="sample"){
    // Style-lab sample → listed template that cannot be used until implemented (user decision 2026-10-20).
    const sample=a._[2];if(!sample)throw new Error("npm run studio -- template sample <style-lab-id> --user-confirmed \"<слова пользователя>\"");
    const result=await saveStyleSample(sample,{userWords:need(a,"user-confirmed","\"<дословная просьба пользователя сохранить образец>\"")});
    say(`Образец сохранён как шаблон (рендерер не подключён): ${JSON.stringify(result)}`);return 0;
   }
   if(a._[1]!=="save")throw new Error("npm run studio -- template save <projectId> --id <новый-id> --name \"Название\" [--notes \"...\"] · template sample <style-lab-id> --user-confirmed \"...\"");
   const id=a._[2];if(!id)throw new Error("Нужен id проекта.");
   const result=saveTemplate(id,{id:need(a,"id","<новый-id>"),name:need(a,"name","\"Название\""),description:str(a,"description"),notes:str(a,"notes")});
   say(`Шаблон сохранён: ${JSON.stringify(result)}`);return 0;
  }
  case "refs":{
   if(a._[1]!=="add")throw new Error("npm run studio -- refs add <reel-url>... --agent \"...\" --user-confirmed \"<слова пользователя>\" [--step 0.5|1] [--name ...]");
   const links=a._.slice(2);if(!links.length)throw new Error("Нужны ссылки на Reels.");
   need(a,"user-confirmed","\"<дословное согласие на запуск Apify Free (предел $1)>\"");
   const keys=await serverSecrets();if(!keys.APIFY_TOKEN)throw new Error("Apify не подключён: подключите в студии (Разборы видео).");if(!keys.ELEVENLABS_API_KEY)throw new Error("Не настроен ElevenLabs для транскрипций.");
   const {apifyAccount}=await import("../src/lib/author-providers");const acc=await apifyAccount();if(!acc.isFree)throw new Error("Для импорта нужен тариф Apify Free.");
   const step=Number(str(a,"step")??1);if(step!==.5&&step!==1)throw new Error("--step 0.5 или 1");
   const id=createReferenceSet({links,name:str(a,"name"),frameStep:step as .5|1,agentMode:{declaredAgent:need(a,"agent","\"<среда/модель>\"")}});
   authorEvent(id,`Запуск Apify подтверждён пользователем: «${str(a,"user-confirmed")!.slice(0,200)}».`);
   say(`Подборка ${id} создана (агентный режим).`,`MOTION_STUDIO_RUN=${id}`,`Дальше: npm run studio -- run ${id} --timeout 540`);return 0;
  }
  case "style":{
   if(a._[1]!=="analyze")throw new Error("npm run studio -- style analyze --agent \"...\"");
   enqueue(null,"style",{declaredAgent:need(a,"agent","\"<среда/модель>\"")});say("Анализ стиля в очереди. Дальше: npm run studio -- run style");return 0;
  }
  case "media":{
   // Real logos / people photos (user decision 2026-10-21): Wikidata → Wikimedia Commons with licence and SHA-256 into the
   // project; the illustrated director places them as logo-tile / person-tile. Only names the narration actually says.
   const [,id,action="list",subject]=a._;const p=id?project(id):null;
   if(!p)throw new Error("npm run studio -- media <id> [list | add \"<имя как в тексте>\" --kind logo|person|flag [--wikidata Q123]]");
   const dir=path.join(DATA,"projects",id),{acquireMedia,readMediaManifest}=await import("../src/lib/media-assets");
   if(action==="add"){
    const kind=need(a,"kind","logo|person|flag");if(kind!=="logo"&&kind!=="person"&&kind!=="flag")throw new Error("--kind logo, person или flag.");
    if(!subject?.trim())throw new Error("Укажите имя, как оно звучит в тексте: media <id> add \"Google\" --kind logo");
    const said=(x:string)=>` ${x.toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu," ").trim()} `;
    if(p.plan&&!said(p.plan.scenes.map(sc=>sc.narration).join(" ")).includes(said(subject)))throw new Error(`«${subject}» не звучит в тексте ролика: плитка с логотипом или фото — только для названного.`);
    if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id))throw new Error("Дождитесь завершения задачи проекта.");
    const asset=await acquireMedia(dir,id,subject.trim(),kind,{lang:p.profile.production?.language==="en"?"en":"ru",qid:str(a,"wikidata")});
    const {assets}=await readMediaManifest(dir);if(p.plan)updateProject(id,{plan:{...p.plan,media:assets}});
    event(id,`Добавлен ${kind==="logo"?"логотип":"портрет"} «${asset.subject}»: ${asset.source.label} (${asset.source.wikidata}), Commons «${asset.source.commonsFile}», ${asset.source.license}${asset.source.restrictions?`, ${asset.source.restrictions}`:""}.`);
    say(`${kind==="logo"?"Логотип":"Портрет"} «${asset.subject}» сохранён: ${asset.file}`,`Wikidata ${asset.source.wikidata}: ${asset.source.label} — ${asset.source.description||"без описания"}. Проверь, что это нужная компания/человек (иначе --wikidata Q…).`,`Commons: ${asset.source.commonsFile} · ${asset.source.license}${asset.source.restrictions?` · ${asset.source.restrictions}`:""}`,`Поставить плитку в кадр: npm run studio -- repair ${id} --notes "logo-tile/person-tile «${asset.subject}» на слове …"`);
    return 0;
   }
   const m=await readMediaManifest(dir);
   say(...(m.assets.length?m.assets.map(x=>`${x.kind==="logo"?"логотип":"портрет"} «${x.subject}» · ${x.source.wikidata} ${x.source.label} · ${x.source.commonsFile} · ${x.source.license}${x.source.restrictions?` · ${x.source.restrictions}`:""}`):["Снимков логотипов и фото нет."]),...m.failed.map(f=>`не найдено: «${f.subject}» (${f.kind}) — ${f.reason}`));
   return 0;
  }
  default:
   say("Motion Studio · скилл для чат-агента","Движок и UI: start [--foreground] · stop [--force] · status [id] · ui [--open] | ui stop · config get|set|unset","Ролики: templates · create · run <id> · task <id> · submit <id> <task> · confirm <id> tts · repair <id> · media <id> [add «имя» --kind logo|person|flag] · narrative <id> <file> · retry <id> · approve <id> · cancel <id> · pause/resume <id> · release <id> · template save <id> · template sample <style> · refs add <urls> · style analyze","Подробно: .agents/skills/motion-studio/SKILL.md");
   return cmd?1:0;
 }
}
main().then(code=>process.exit(code??0),e=>{console.error(`Ошибка: ${e instanceof Error?e.message:e}`);process.exit(1);});
