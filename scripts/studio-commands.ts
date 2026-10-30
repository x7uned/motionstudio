// CLI commands that replace the removed Next.js web UI (2026-10-30, user decision: the studio is one skill with settings
// and styles, no web app). Every action of the former routes is here with the same guards; nothing runs generated code.
import fs from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import sharp from "sharp";
import {db,project,projects,updateProject,enqueue,event,events,DATA,ROOT,profile,saveProfile,createProject} from "../src/lib/store";
import {profileSchema,normalizePlan,sceneClock} from "../src/lib/model";
import {projectLanguage} from "../src/lib/quality-contract";
import {digest,readJSON,spokenText,editorialInput} from "../src/lib/quality";
import {health} from "../src/lib/provider";
import {serverSecrets,saveApifyToken} from "../src/lib/server-secrets";
import {authors,author,publicAuthor,authorVideos,updateAuthor,updateAuthorVideo,authorEvent} from "../src/lib/author-store";

type Args={_:string[];[k:string]:string|boolean|string[]};
const str=(a:Args,k:string)=>typeof a[k]==="string"?a[k] as string:undefined;
const say=(...lines:string[])=>console.log(lines.join("\n"));
const rel=(p:string)=>path.relative(ROOT,p).split(path.sep).join("/");
const activeJob=(id:string)=>db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id);
const needProject=(id:string|undefined,usage:string)=>{const p=id?project(id):null;if(!p)throw new Error(usage);return p;};
const json=(v:unknown)=>JSON.stringify(v,null,1);

/** Storyboard edit (former «Редактор»: titles, narration, visuals, diagram labels). Same guards as the UI save. */
async function saveScenes(id:string,file:string){
 const p=needProject(id,"npm run studio -- scenes <id> save <storyboard.json>");
 if(activeJob(id))throw new Error("Дождитесь завершения задачи перед правкой.");
 const input=JSON.parse(await fs.readFile(file,"utf8"));
 const narrationBudget=await fs.readFile(path.join(DATA,"projects",id,"duration-budget.json"),"utf8").then(raw=>z.number().int().min(p.duration).max(180).parse(JSON.parse(raw).seconds)).catch(e=>{if(e.code==="ENOENT")return p.duration;throw e;});
 const plan=normalizePlan(input,p.duration,p.voice,narrationBudget,projectLanguage(p.profile));
 const changed=JSON.stringify(plan.scenes)!==JSON.stringify(p.plan?.scenes);
 if(p.profile.renderMode==="three"&&changed){delete plan.world3d;plan.filmKind="three";}
 if(p.plan?.filmKind==="netcode"&&changed){delete plan.netcode;plan.filmKind="netcode";}
 if(p.plan?.filmKind==="isometric"&&changed){delete plan.isometric;plan.filmKind="isometric";}
 updateProject(id,{plan,title:plan.title,status:p.video?"revision":"draft",stage:"Сценарий изменён",review:null});
 await fs.mkdir(path.join(DATA,"projects",id),{recursive:true});
 await fs.writeFile(path.join(DATA,"projects",id,"storyboard.json"),JSON.stringify(plan,null,2));
 event(id,"Сценарий сохранён. Для обновления видео запустите рендер.");
 say(`Сценарий сохранён${changed?" (сцены изменены)":""}. Рендер: npm run studio -- retry ${id}`);
}

/** Former preproduction panel: which reports exist and whether they match the current text. */
async function report(id:string){
 const p=needProject(id,"npm run studio -- report <id>"),dir=path.join(DATA,"projects",id);
 const read=(n:string)=>readJSON(path.join(dir,n));
 const [sources,narrative,editorial,facts,voice,visual,assemblies,comparison]=await Promise.all(["sources.json","narrative.json","editorial-audit.json","fact-audit.json","voice-plan.json","visual-concept.json","assembly-plan.json","script-comparison.json"].map(read));
 const text=p.plan?spokenText(p.plan):narrative?.fullText??"";
 const files=["brief.md","research.json","sources.json","narrative.json","editorial-audit.json","fact-audit.json","voice-plan.json","visual-concept.json","assembly-plan.json","script-package.json","storyboard.json","quality-report.json","script-comparison.json","approval.json"].filter(n=>existsSync(path.join(dir,n)));
 say(`Проект ${id} · «${p.title}» · ${p.status}`,`Папка: ${rel(dir)}`,`Файлы: ${files.join(", ")||"—"}`,
  `Источников: ${Array.isArray(sources)?sources.length:0}${Array.isArray(sources)?"\n"+sources.slice(0,20).map((s:any)=>`  · ${s.title} — ${s.url}`).join("\n"):""}`,
  `Редактор: ${editorial?(editorial.inputHash===digest(text)?"актуален":"устарел"):"—"} · Фактчек: ${facts?(facts.skipped?"выключен":facts.sourceHash===digest(sources||[])&&(p.plan?facts.inputHash===digest(editorialInput(p.plan)):!!narrative)?"актуален":"устарел"):"—"} · Голосовой план: ${voice?(voice.plainText===text?"актуален":"устарел"):"—"}`,
  `Визуальная концепция: ${visual?(visual.textHash===digest(p.plan?spokenText(p.plan):"")&&visual.sourceHash===digest(sources)&&digest(visual.plan)===digest(p.plan?.visualConcept??null)?"актуальна":"устарела"):"—"} · Сборки: ${assemblies?(digest(assemblies.plan)===digest(p.plan?.assemblies??null)?"актуальны":"устарели"):"—"}`,
  `Слепое сравнение текстов: ${comparison?(comparison.currentHash===digest(text)?comparison.status:"устарело"):"—"} · Правка цельного рассказа: ${p.profile.production?.version===2&&narrative?"доступна (narrative)":"—"}`);
}

/** Blind comparison of the first narrative and the current edit (editor choice only). */
async function compare(a:Args){
 const [,id,action="show"]=a._;const p=needProject(id,"npm run studio -- compare <id> prepare|show|select --winner A|B|tie [--scores \"5,4,4,5,5;3,4,4,4,5\"] [--comment …] --user-confirmed \"…\"");
 const {prepareScriptComparison,selectScriptComparison,publicComparison}=await import("../src/lib/script-comparison");
 const dir=path.join(DATA,"projects",p.id);
 let c:any;
 if(action==="prepare")c=await prepareScriptComparison(p,dir);
 else if(action==="select"){
  const quote=str(a,"user-confirmed");if(!quote)throw new Error("Выбор делает только редактор: --user-confirmed \"<его слова>\".");
  const saved=await readJSON(path.join(dir,"script-comparison.json"));if(!saved)throw new Error("Сначала: compare <id> prepare");
  const w=String(str(a,"winner")??"").toUpperCase(),winner=w==="A"?0:w==="B"?1:w==="TIE"?"tie":null;if(winner===null)throw new Error("--winner A, B или tie");
  const scores=(str(a,"scores")??";").split(";").map(row=>{const v=row.split(",").map(x=>x.trim()).filter(Boolean).map(Number);return Array.from({length:5},(_,i)=>Number.isInteger(v[i])?v[i]:null);});
  c=await selectScriptComparison(p,dir,{id:saved.id,winner,scores:[scores[0]??Array(5).fill(null),scores[1]??Array(5).fill(null)],comment:str(a,"comment")??""});
  event(p.id,`Слепое сравнение текстов: выбор редактора «${quote.slice(0,200)}».`);
 }else c=publicComparison(await readJSON(path.join(dir,"script-comparison.json")),p.plan?spokenText(p.plan):"",projectLanguage(p.profile));
 if(!c){say("Сравнения нет или оно устарело. Подготовить: npm run studio -- compare <id> prepare");return;}
 say(`Сравнение ${c.status} · критерии: ${c.rubric.join(" · ")}`,...c.candidates.map((x:any)=>`\n${x.label}:\n${x.text}`),...(c.selection?[`\nВыбор: ${c.selection.winner==="tie"?"равны":c.candidates[c.selection.winner].label} · происхождение: ${c.origins.join(" / ")}`]:[]));
}

/** Style reference materials for «Стиль автора» (former upload panel). */
async function styleRefs(a:Args){
 const action=a._[2]??"list";
 if(action==="list"){
  const rows=db().prepare(`SELECT id,name,kind,file,created,archived FROM refs ${a.archived?"":"WHERE archived=0"} ORDER BY created DESC`).all() as any[];
  say(...(rows.length?rows.map(r=>`${r.id} · ${r.kind==="image"?"кадр":"транскрипт"} · ${r.name}${r.archived?" · в архиве":""}${r.file?` · ${r.file}`:""}`):["Материалов стиля нет. Добавить: npm run studio -- style refs add <файл.jpg|png|webp|txt|srt|vtt>… или --text-file <файл> --name «…»"]));return;
 }
 if(action==="archive"||action==="restore"){
  const id=a._[3];if(!id||!db().prepare("SELECT id FROM refs WHERE id=?").get(id))throw new Error("Материал не найден.");
  db().prepare("UPDATE refs SET archived=? WHERE id=?").run(action==="archive"?1:0,id);say(action==="archive"?"Убрано из активных (файл сохранён).":"Возвращено в активные.");return;
 }
 if(action!=="add")throw new Error("npm run studio -- style refs list [--archived] | add <файлы…> | add --text-file <файл> [--name …] | archive|restore <id>");
 const files=a._.slice(3),textFile=str(a,"text-file");
 const items:{name:string;buffer?:Buffer;text?:string}[]=[];
 if(textFile)items.push({name:str(a,"name")??path.basename(textFile),text:await fs.readFile(textFile,"utf8")});
 for(const f of files)items.push({name:path.basename(f).slice(0,160),buffer:await fs.readFile(f)});
 if(!items.length)throw new Error("Укажите файлы или --text-file.");
 for(const it of items){
  const id=randomUUID();let kind="transcript",file:string|null=null,text=(it.text??"").trim();
  if(it.buffer){
   if(it.buffer.length>15*1024*1024)throw new Error(`${it.name}: файл больше 15 МБ.`);
   if(/\.(txt|srt|vtt)$/i.test(it.name)){text=it.buffer.toString("utf8").trim();if(text.includes("\u0000"))throw new Error(`${it.name}: транскрипт должен быть текстом UTF-8.`);}
   else{
    const meta=await sharp(it.buffer,{limitInputPixels:35_000_000}).metadata();
    if(!["jpeg","png","webp"].includes(meta.format||""))throw new Error(`${it.name}: поддерживаются JPG, PNG, WebP, TXT, SRT и VTT.`);
    kind="image";await fs.mkdir(path.join(DATA,"references"),{recursive:true});file=`data/references/${id}.jpg`;
    await sharp(it.buffer).rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).jpeg({quality:92}).toFile(path.join(DATA,"references",`${id}.jpg`));
   }
  }
  if(kind==="transcript"&&(text.length<10||text.length>100_000))throw new Error(`${it.name}: транскрипт должен содержать от 10 до 100 000 символов.`);
  db().prepare("INSERT INTO refs(id,name,kind,file,text,created) VALUES(?,?,?,?,?,?)").run(id,it.name,kind,file,kind==="transcript"?text:null,new Date().toISOString());
  say(`Добавлено: ${id} · ${kind==="image"?"кадр":"транскрипт"} · ${it.name}`);
 }
 say("Извлечь правила: npm run studio -- style analyze --agent \"<среда/модель>\"");
}

/** Hidden-echo prompt so a token typed by the user never shows on screen, in the chat or in shell history. */
async function readSecret(prompt:string){
 if(!process.stdin.isTTY)throw new Error("Токен вводит пользователь сам, в своём терминале: npm run studio -- apify connect. Агент токены не принимает и не передаёт.");
 process.stdout.write(prompt);
 const stdin=process.stdin;stdin.setRawMode(true);stdin.resume();stdin.setEncoding("utf8");
 return new Promise<string>((resolve,reject)=>{let value="";const onData=(ch:string)=>{for(const c of ch){
  if(c==="\r"||c==="\n"){stdin.setRawMode(false);stdin.pause();stdin.off("data",onData);process.stdout.write("\n");resolve(value.trim());return;}
  if(c==="\u0003"){stdin.setRawMode(false);stdin.pause();stdin.off("data",onData);process.stdout.write("\n");reject(new Error("Отменено."));return;}
  if(c==="\u007f"||c==="\b")value=value.slice(0,-1);else value+=c;}};stdin.on("data",onData);});
}

export async function extraCommand(cmd:string,a:Args):Promise<number|undefined>{
 switch(cmd){
  case "style":if(a._[1]!=="refs")return undefined;await styleRefs(a);return 0;
  case "list":{
   const all=projects(),limit=Number(str(a,"limit")??(a.all?all.length:25));
   if(!all.length){say("Проектов нет. Создать: npm run studio -- create --topic \"…\"");return 0;}
   for(const p of all.slice(0,limit))say(`${p.id} · ${p.created.slice(0,10)} · ${p.status}${p.imported?" (архив)":""} · ${p.format} ${p.duration} с · «${p.title}»${p.video?` · ${p.video}`:""}`);
   if(all.length>limit)say(`… ещё ${all.length-limit} (--all)`);return 0;
  }
  case "events":{
   const id=a._[1];needProject(id,"npm run studio -- events <id>");
   say(...(events(id!) as any[]).reverse().map(e=>`${e.created.replace("T"," ").slice(0,19)} ${e.message}`));return 0;
  }
  case "scenes":{
   const [,id,action="show",file]=a._;const p=needProject(id,"npm run studio -- scenes <id> [show | export <файл.json> | save <файл.json>]");
   if(action==="save"){if(!file)throw new Error("npm run studio -- scenes <id> save <файл.json>");await saveScenes(p.id,file);return 0;}
   if(!p.plan)throw new Error("У проекта ещё нет сценария.");
   if(action==="export"){if(!file)throw new Error("npm run studio -- scenes <id> export <файл.json>");await fs.writeFile(file,JSON.stringify(p.plan,null,2));say(`Сценарий выгружен: ${file}. Правь заголовки, текст, визуал и подписи; затем scenes ${p.id} save ${file}`);return 0;}
   const clock=sceneClock(p.plan);
   say(`«${p.plan.title}» · сцен ${p.plan.scenes.length}`,...p.plan.scenes.map((s:any,i:number)=>`${i+1}. ${s.title??""} [${s.visual??""}] ${clock[i]?`${clock[i].start.toFixed(1)}–${clock[i].end.toFixed(1)} с`:`${s.seconds??"?"} с`}\n   ${s.narration??""}`));return 0;
  }
  case "review":{
   const id=a._[1];const p=needProject(id,"npm run studio -- review <id>   (повторная проверка готового MP4 без озвучки и рендера)");
   if(activeJob(p.id)||!p.plan||!p.video||p.imported||p.status==="revision")throw new Error("Нужен завершённый актуальный рендер. Изменённый сценарий сначала перерендерите.");
   const saved=await readJSON(path.join(DATA,"projects",p.id,"render-input.json"));
   if(saved&&saved.inputHash!==digest({plan:p.plan,profile:p.profile,format:p.format}))throw new Error("Видео относится к другой версии сценария.");
   enqueue(p.id,"review-only");event(p.id,"Запрошена повторная проверка готового MP4 без озвучки и рендера.");say(`Проверка MP4 в очереди. Дальше: npm run studio -- run ${p.id}`);return 0;
  }
  case "revise":{
   const id=a._[1];const p=needProject(id,"npm run studio -- revise <id> --feedback \"<замечание редактора>\"");
   if(activeJob(p.id))throw new Error("Дождитесь завершения задачи.");
   const feedback=z.string().trim().min(3).max(2000).parse(str(a,"feedback"));
   updateProject(p.id,{status:"revision",stage:"На доработке",feedback});event(p.id,`На доработке: ${feedback}`);
   say(`Возвращено на доработку. Правка текста: narrative/scenes, затем retry ${p.id}.`);return 0;
  }
  case "report":await report(a._[1]??"");return 0;
  case "compare":await compare(a);return 0;
  case "profile":{
   const action=a._[1]??"get";
   if(action==="get"){const out=str(a,"out");const v=json(profile());if(out){await fs.writeFile(out,v);say(`Профиль стиля выгружен: ${out}`);}else say(v);return 0;}
   if(action==="set"){const file=a._[2];if(!file)throw new Error("npm run studio -- profile set <profile.json>");saveProfile(profileSchema.parse(JSON.parse(await fs.readFile(file,"utf8"))));say("Профиль стиля сохранён. Он применяется к новым проектам; старые проекты хранят свой снимок.");return 0;}
   throw new Error("npm run studio -- profile get [--out файл] | set <файл>");
  }
  case "health":{
   const h=await health();
   const yes=(v:boolean)=>v?"да":"нет";
   say(`Исследование: Tavily CLI ${yes(h.research.tavily)} · модель по умолчанию ${h.research.model}/${h.research.effort}`,
    `Codex CLI (легаси-роли): установлен ${yes(h.codex)} · вход ${yes(h.authenticated)}`,
    `Claude CLI (легаси motion-роль): ${json(h.motion).replace(/\s+/g," ")}`,
    `Речь: провайдер ${h.ttsProvider} · ElevenLabs ключ ${yes(h.elevenlabs.keyConfigured)} · голос ${yes(h.elevenlabs.voiceConfigured)} · Python ${yes(h.speech)}`,
    `FFmpeg ${yes(h.ffmpeg)} · Chrome для рендера ${yes(h.chrome)}`,
    `Тяжёлые файлы стилей: npm run assets -- status`);
   return 0;
  }
  case "sfx":{const {soundLibrary}=await import("../src/lib/sound-provider");say(json(soundLibrary().status()));return 0;}
  case "models":{
   const action=a._[1]??"list";const {modelLibrary,saveModel,MAX_MODEL_BYTES}=await import("../src/lib/model-assets");
   if(action==="list"){const m=modelLibrary(ROOT);say(...(m.length?m.map(x=>`${x.id} · ${x.name} · ${x.vertices} вершин · ${(x.bytes/1024).toFixed(0)} КБ · ${x.rights}`):["Своих 3D-моделей нет."]),"Встроенные в three/v1: смартфон, сервер, чип, спутник, Земля, Луна, примитивы.");return 0;}
   if(action==="add"){
    const file=a._[2];if(!file)throw new Error("npm run studio -- models add <model.glb|.gltf> --name \"…\" --rights \"чья модель и на каких правах\"");
    const buf=await fs.readFile(file);if(buf.length>MAX_MODEL_BYTES)throw new Error("Модель должна быть меньше 25 МБ.");
    const m=saveModel(ROOT,buf,path.basename(file),str(a,"name")??"",str(a,"rights")??"");say(`Модель сохранена: ${json(m)}`);return 0;
   }
   if(action==="demo"){const {threeDemoPlan}=await import("../src/lib/three-demo");const id=createProject({topic:"Техническая демонстрация 3D-рендера: смартфон, чип, сервер; плавный облёт и проезд камеры.",duration:30,format:"9:16",voice:false,renderMode:"three",initialPlan:threeDemoPlan()});say(`Демо-проект 3D создан: ${id}`,`MOTION_STUDIO_RUN=${id}`,`Дальше: npm run studio -- run ${id}`);return 0;}
   throw new Error("npm run studio -- models list | add <файл> --name … --rights … | demo");
  }
  case "apify":{
   const action=a._[1]??"check";const {apifyAccount}=await import("../src/lib/author-providers");
   if(action==="connect"){
    const token=z.string().trim().min(20).max(256).parse(await readSecret("Вставьте API-токен Apify (символы не показываются) и нажмите Enter: "));
    const account=await apifyAccount(token);if(!account.isFree)throw new Error("Выберите Apify Free. Студия не подключает платные тарифы.");
    await saveApifyToken(token);say("Apify подключён (тариф Free). Токен записан только в .env.local.");return 0;
   }
   if(action==="check"){const keys=await serverSecrets();if(!keys.APIFY_TOKEN){say("Apify не подключён. Пользователь подключает сам, в своём терминале: npm run studio -- apify connect");return 0;}const acc=await apifyAccount();say(`Apify: ${acc.isFree?"тариф Free":"НЕ Free — импорт запрещён"} · ElevenLabs для транскрипций: ${keys.ELEVENLABS_API_KEY?"настроен":"нет"}`);return 0;}
   throw new Error("npm run studio -- apify check | connect (только пользователь, в своём терминале)");
  }
  case "voices":{
   const action=a._[1]??"list";const v=await import("../src/lib/voice-auditions");
   if(action==="list"){const c:any=await v.voiceCatalog();const sel=db().prepare("SELECT value FROM settings WHERE key=?").get("selectedVoiceProfile") as any;
    say(`Текущий голос: ${c.configuredVoice||"—"} · выбранный профиль: ${sel?JSON.parse(sel.value).name??JSON.parse(sel.value).id:"—"}`,`Модели: ${c.models.map((m:any)=>`${m.id}${m.available?"":" (недоступна)"}${m.creditRate!=null?` ×${m.creditRate}`:""}`).join(", ")||"—"}`,`Кредиты: ${c.credits?`${c.credits.remaining} осталось`:"не проверены"}`,...c.voices.slice(0,60).map((x:any)=>`  ${x.id} · ${x.name} · ${x.language} · ${x.category}${x.library?"":" (не библиотечный)"}`));return 0;}
   if(action==="quote"){
    const file=str(a,"text-file");if(!file)throw new Error("npm run studio -- voices quote --text-file <текст.txt> --alt-voice <voiceId> --rates a,b,c --rate-source \"откуда ставки\"");
    const q:any=await v.quoteAudition({text:await fs.readFile(file,"utf8"),alternativeVoiceId:str(a,"alt-voice"),rates:String(str(a,"rates")??"").split(",").map(Number),rateSource:str(a,"rate-source")});
    const st:any=await v.auditionState(q.id);
    say(`Оценка сравнения ${q.id}: ${q.totalCredits} кредитов из ${q.remainingCredits}; действует до ${q.expiresAt}.`,...q.variants.map((x:any,i:number)=>`  вариант ${i+1}: ${x.model} · ${x.voiceId} · ${x.credits} кр.`),"Это ПЛАТНЫЙ шаг: три генерации ElevenLabs. Запуск только после явного «да» пользователя:",`npm run studio -- voices start ${q.id} --quote-hash ${st.quoteHash} --user-confirmed "<его слова>"`);return 0;
   }
   const id=a._[2];if(!id)throw new Error(`npm run studio -- voices ${action} <id>`);
   if(action==="start"){const quote=str(a,"user-confirmed");if(!quote)throw new Error("Платный шаг: нужен --user-confirmed \"<дословное согласие пользователя>\".");await v.startAudition(id,z.string().length(64).parse(str(a,"quote-hash")));say(`Сравнение голосов в очереди (подтверждено: «${quote.slice(0,200)}»). Состояние: npm run studio -- voices state ${id}`);return 0;}
   if(action==="state"){const st:any=await v.auditionState(id);if(!st)throw new Error("Сравнение не найдено.");const {samples,...rest}=st;say(json(rest),...(samples??[]).map((s:any)=>`  ${s.label}: npm run studio -- voices sample ${id} ${s.choice} --out <файл.wav>`));return 0;}
   if(action==="sample"){const n=Number(a._[3]),out=str(a,"out")??path.join(DATA,"voice-auditions",id,`blind-${n}.wav`);await fs.writeFile(out,await v.auditionSample(id,n));say(`Образец ${String.fromCharCode(65+n)}: ${out}`);return 0;}
   if(action==="select"){const quote=str(a,"user-confirmed");if(!quote)throw new Error("Победителя выбирает только пользователь: --user-confirmed \"<его слова>\".");const prof=await v.selectAudition(id,Number(a._[3]));say(`Выбран голос ${prof.name??prof.voiceId} (${prof.model}) по словам пользователя: «${quote.slice(0,200)}».`);return 0;}
   throw new Error("npm run studio -- voices list | quote … | start <id> … | state <id> | sample <id> <0-2> | select <id> <0-2> --user-confirmed …");
  }
  case "refs":{
   const action=a._[1];
   if(action==="list"||!action){const k=await serverSecrets();say(`Apify ${k.APIFY_TOKEN?"подключён":"не подключён"} · Scribe ${k.ELEVENLABS_API_KEY?"настроен":"нет"}`,...authors().map(x=>{const p=publicAuthor(x);return `${p.id} · ${p.status} · ${p.title} · роликов ${p.complete}/${p.requested} · шаг ${p.frameStep} с`;}));return 0;}
   if(action==="show"){const id=a._[2];const x=id&&author(id);if(!x)throw new Error("Подборка не найдена.");const p:any=publicAuthor(x,true);say(`${p.title} · ${p.status} · ${p.stage}`,p.profileUrl?`Каталог: ${p.profileUrl}`:"",...p.videos.map((v:any)=>`  ${v.status} · ${v.url}${v.briefUrl?` · ${v.briefUrl}`:""}${v.sheetUrl?` · ${v.sheetUrl}`:""}${v.error?` · ${v.error}`:""}`),"Журнал:",...p.events.slice(0,15).reverse().map((e:any)=>`  ${e.created.slice(0,19)} ${e.message}`));return 0;}
   if(action==="retry"){
    const id=a._[2];const x=id&&author(id);if(!x)throw new Error("Подборка не найдена.");
    if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND kind='author-import' AND status IN ('queued','running')").get(id))throw new Error("Обработка ещё выполняется.");
    for(const v of authorVideos(id))if(v.status!=="complete"&&v.state.scribePending)updateAuthorVideo(v.id,{state:{...v.state,scribePending:false}});
    enqueue(id,"author-import");updateAuthor(id,{status:"queued",stage:"Продолжаем незавершённое",error:null});authorEvent(id,"Редактор запросил продолжение. Готовые этапы переиспользуются; незавершённый запрос Scribe может снова расходовать минуты.");
    say(`Продолжаем незавершённое. Дальше: npm run studio -- run ${id}`);return 0;
   }
   return undefined;
  }
 }
 return undefined;
}

/** Cancelling a reference set also aborts its Apify discovery run (as the UI did). */
export async function abortApifyRun(id:string){
 const x=author(id);if(!x?.state?.runId||x.state.discoveryDone)return;
 const {apify}=await import("../src/lib/author-providers");
 await apify(`actor-runs/${encodeURIComponent(x.state.runId)}/abort`,{method:"POST"}).catch(()=>{});
}
