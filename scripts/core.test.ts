import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {BACKGROUND_IDS,backgroundAt,backgroundDesignSchema} from "../src/lib/backgrounds";
import {
  normalizePlan,
  sceneClock,
  defaultProfile,
  profileSchema,
} from "../src/lib/model";
import {TEMPLATE_FILES,loadVideoTemplate,templateInstructions,listVideoTemplates} from "../src/lib/video-templates";
let store: typeof import("../src/lib/store");
let temp: string;
const previous = process.cwd();
before(async () => {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "motion-studio-test-"));
  // New projects snapshot the @xtuned outro pack, like templates above.
  fs.cpSync(path.join(previous,"data/branding/xtuned-outro"),path.join(temp,"data/branding/xtuned-outro"),{recursive:true});
  fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
  for(const templateId of ["tech-story","model-breakdown"]){
   const templateDir=path.join(temp,`data/templates/${templateId}/v1`);fs.mkdirSync(templateDir,{recursive:true});
   for(const name of TEMPLATE_FILES)fs.copyFileSync(path.join(previous,`data/templates/${templateId}/v1`,name),path.join(templateDir,name));
  }
  process.chdir(temp);
  store = await import("../src/lib/store");
});
after(() => {
  store.db().close();
  process.chdir(previous);
  fs.rmSync(temp, { recursive: true, force: true });
});
const sample = () => ({
  title: "Как работает API",
  summary: "Пример с официантом",
  factNotes: "",
  scenes: Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    title: `Шаг ${i + 1}`,
    subtitle: "Понятный пример",
    narration: "Запрос передаёт данные и возвращает ответ.",
    visual: "flow",
    items: ["Запрос", "Ответ"],
    seconds: 7 + i,
  })),
});
test("timing normalization ends on the exact requested frame without gaps", () => {
  for (const duration of [30, 45, 60]) {
    const plan = normalizePlan(sample(), duration, true);
    const clock = sceneClock(plan);
    assert.equal(
      clock.reduce((n, s) => n + s.frames, 0),
      duration * 30,
    );
    for (let i = 1; i < clock.length; i++)
      assert.equal(
        clock[i].startFrame,
        clock[i - 1].startFrame + clock[i - 1].frames,
      );
  }
});
test("oversized narration is rejected before expensive synthesis and render", () => {
  const p = sample();
  p.scenes.forEach((s) => (s.narration = Array(35).fill("слово").join(" ")));
  assert.throws(() => normalizePlan(p, 30, true), /слишком длинный/);
});
test("unsafe profile colors never reach the render CSS", () => {
  assert.equal(
    profileSchema.safeParse({
      ...defaultProfile,
      accent: "url(https://external)",
    }).success,
    false,
  );
});

test("approved background catalog excludes 07 and new projects freeze their own random choice",()=>{
 assert.deepEqual(BACKGROUND_IDS,["01","02","03","04","05","06","08","09","10"]);
 assert.deepEqual(BACKGROUND_IDS.map((_,i)=>backgroundAt(i).id),BACKGROUND_IDS);
 assert.equal(backgroundDesignSchema.safeParse({version:1,id:"07"}).success,false);
 assert.equal(backgroundDesignSchema.safeParse({version:2,id:"01"}).success,false);
 assert.throws(()=>backgroundAt(9));
 assert.equal(backgroundAt(0).opacity,.5);
 for(const opacity of [-.01,1.01])assert.equal(backgroundDesignSchema.safeParse({version:1,id:"01",opacity}).success,false);
 for(const opacity of [0,.5,1])assert.equal(backgroundDesignSchema.parse({version:1,id:"01",opacity}).opacity,opacity);
 const before=store.profile(),id=store.createProject({topic:"Фон проверки",duration:30,format:"9:16",voice:false,initialPlan:normalizePlan(sample(),30,false)});
 const selected=store.project(id)!.profile.backgroundDesign!;assert.ok(BACKGROUND_IDS.includes(selected.id));assert.equal(selected.opacity,.5);
 assert.deepEqual(store.project(id)!.profile.backgroundDesign,selected);assert.deepEqual(store.profile(),before,"global profile stays unchanged");
 const historical=store.createProject({topic:"История",duration:150,format:"9:16",voice:false,productionTemplateId:"tech-story"});
 assert.equal(store.project(historical)!.profile.backgroundDesign,undefined,"saved tech-story/v1 stays immutable");
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id IN (?,?)").run(id,historical);
});
test("queued jobs are durable, unique per project, and claimed once in FIFO order", () => {
  const a = store.createProject({
    topic: "Первая история",
    duration: 30,
    format: "9:16",
    voice: false,
  });
  const b = store.createProject({
    topic: "Вторая история",
    duration: 45,
    format: "16:9",
    voice: true,
  });
  assert.throws(() => store.enqueue(a), /уже в очереди/);
  const one = store.claimJob();
  const two = store.claimJob();
  assert.equal(one.project_id, a);
  assert.equal(two.project_id, b);
  assert.equal(store.claimJob(), undefined);
  store.completeJob(one.id, "completed");
  assert.equal(
    (store.jobs().find((j: any) => j.id === one.id) as any).status,
    "completed",
  );
});
test("a project snapshots its style; editing the author profile affects only future projects", () => {
  const a = store.createProject({
    topic: "Сохранённая история",
    duration: 30,
    format: "9:16",
    voice: false,
  });
  store.saveProfile({
    ...defaultProfile,
    name: "Новый автор",
    accent: "#FF1122",
  });
  const b = store.createProject({
    topic: "Новая история",
    duration: 30,
    format: "9:16",
    voice: false,
  });
  assert.equal(store.project(a)?.profile.name, "Студийный");
  assert.equal(store.project(b)?.profile.name, "Новый автор");
  assert.equal(store.project(a)?.profile.accent, defaultProfile.accent);
});

test("persistent generation removes parent chat metadata while preserving the normal user environment", async () => {
  const binary = path.join(temp, "fake-codex.cjs");
  fs.writeFileSync(
    binary,
    `#!/usr/bin/env node\nconst fs=require('node:fs');const args=process.argv.slice(2);const out=args[args.indexOf('-o')+1];fs.writeFileSync(out,JSON.stringify({threadCleared:!('CODEX_THREAD_ID' in process.env),pipeCleared:!('CODEX_APP_TOOLS_PIPE_PATH' in process.env),homePresent:!!process.env.HOME,voiceKeyCleared:!('ELEVENLABS_API_KEY' in process.env)}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}));\n`,
    { mode: 0o755 },
  );
  const keys = [
    "STUDIO_CODEX",
    "CODEX_THREAD_ID",
    "CODEX_APP_TOOLS_PIPE_PATH",
    "ELEVENLABS_API_KEY",
  ] as const;
  const previousEnv = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.ELEVENLABS_API_KEY = "test-key-not-a-secret";
    process.env.STUDIO_CODEX = binary;
    process.env.CODEX_THREAD_ID = "fixture-thread";
    process.env.CODEX_APP_TOOLS_PIPE_PATH = "fixture-pipe";
    const provider = await import("../src/lib/provider");
    const result = await provider.askJSON(
      "Fixture request",
      { type: "object" },
      path.join(temp, "provider-check"),
    );
    assert.deepEqual(result, {
      threadCleared: true,
      pipeCleared: true,
      homePresent: true,
      voiceKeyCleared: true,
    });
  } finally {
    for (const k of keys) {
      if (previousEnv[k] === undefined) delete process.env[k];
      else process.env[k] = previousEnv[k];
    }
  }
});

import { smooth, sceneMotion, windowAt } from "../renderer/motion";
test("chapter labels and caption envelopes are continuous at every boundary", () => {
  for (const at of [5.5, 11.8, 19.3, 26, 34.2, 42, 49]) {
    const before = sceneMotion(at - 1e-6, at, at + 7, false, false),
      after = sceneMotion(at + 1e-6, at, at + 7, false, false);
    assert.equal(before.x, 0);
    assert.equal(after.x, 0);
    assert.ok(Math.abs(before.opacity - after.opacity) < 0.0001);
    assert.equal(sceneMotion(at - 0.3, at, at + 7, false, false).opacity, 0);
    assert.equal(sceneMotion(at + 7.3, at, at + 7, false, false).opacity, 0);
    assert.ok(
      Math.abs(
        windowAt(at - 1e-6, at, at + 1) - windowAt(at + 1e-6, at, at + 1),
      ) < 0.0001,
    );
  }
  assert.equal(smooth(0, 0, 1), 0);
  assert.equal(smooth(1, 0, 1), 1);
});

test("scenario agent receives exact model and xhigh, Unicode stdin, without research credentials", async () => {
  const binary = path.join(temp, "fake-codex.cjs");
  fs.writeFileSync(
    binary,
    `#!/usr/bin/env node
 const fs=require('node:fs');let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>input+=s);process.stdin.on('end',()=>{const args=process.argv.slice(2);fs.writeFileSync(args[args.indexOf('-o')+1],JSON.stringify({model:args[args.indexOf('--model')+1],xhigh:args.includes('model_reasoning_effort="xhigh"'),unicode:input.includes('Русский\\nтекст'),keyCleared:!('TAVILY_API_KEY' in process.env)}));console.log(JSON.stringify({type:'turn.completed'}));});
`,
    { mode: 0o755 },
  );
  const before = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = "fixture-not-real";
  try {
    const provider = await import("../src/lib/provider");
    const out = await provider.askJSON(
      "Русский\nтекст",
      { type: "object" },
      path.join(temp, "writer-test"),
      [],
      undefined,
      { model: "gpt-6.1-sol", effort: "xhigh" },
    );
    assert.deepEqual(out, {
      model: "gpt-6.1-sol",
      xhigh: true,
      unicode: true,
      keyCleared: true,
    });
  } finally {
    if (before === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = before;
  }
});

import { systemCues, growthState } from "../renderer/system-growth";
test("growing system keeps its core across chapters and uses actual speech cues", () => {
  const plan = {scenes:Array.from({length:8},(_,i)=>({id:`s${i}`,seconds:6}))} as any;
  const alignment = Array.from({length:8},()=>({words:[]})) as any;
  alignment[2].words = [{text:"добавляем",start:14.25,end:14.7}];
  const c = systemCues(plan,alignment);
  assert.equal(c.servers,14.25);
  for (let frame=60;frame<1440;frame++) {
    const s=growthState(frame/30,c), next=growthState((frame+1)/30,c);
    assert.equal(s.app,1); assert.equal(s.database,1);
    assert.ok(s.dbX-s.dbWidth/2>=60);
    for (const key of Object.keys(s) as (keyof typeof s)[]) {
      assert.ok(Number.isFinite(s[key]));
      const bound=key==="dbX"?10:key==="dbWidth"?8:key==="dbY"?2:.12;
      assert.ok(Math.abs(next[key]-s[key])<bound,`discontinuity: ${key} at frame ${frame}`);
    }
  }
});

test("150-second documentary preserves history metadata and exact frame boundaries", () => {
 const p:any=sample();p.filmKind="telephone-history";
 p.scenes=Array.from({length:12},(_,i)=>({...sample().scenes[0],id:`s${i}`,seconds:12.5,history:{era:"1876",mode:"patent",imageId:"bell-drawing",imageCaption:"Чертёж1876"}}));
 const normalized=normalizePlan(p,150,true),clock=sceneClock(normalized);
 assert.equal(clock.length,12);assert.equal(normalized.filmKind,"telephone-history");
 assert.equal(clock.at(-1)!.startFrame+clock.at(-1)!.frames,4500);
 for(let i=1;i<clock.length;i++)assert.equal(clock[i].startFrame,clock[i-1].startFrame+clock[i-1].frames);
 assert.equal(normalized.scenes[3].history!.imageId,"bell-drawing");
 const bad=structuredClone(p);bad.scenes[0].history.imageId="../../private-file";
 assert.throws(()=>normalizePlan(bad,150,true));
});


test("saved video template snapshots instructions and settings without changing the global author",()=>{
 const author=store.profile();
 const id=store.createProject({topic:"История радио",duration:150,format:"9:16",voice:false,productionTemplateId:"tech-story"});
 const p=store.project(id)!;const dir=path.join(temp,"data/projects",id);
 assert.equal(p.profile.name,"История технологий");assert.equal(p.profile.background,"#000000");assert.equal(p.profile.username,author.username??"@xtuned");
 assert.deepEqual(store.profile(),author);
 const meta=p.profile.productionTemplate!;assert.equal(meta.id,"tech-story");assert.equal(meta.version,1);
 const snapshot=JSON.parse(fs.readFileSync(path.join(dir,"template-snapshot.json"),"utf8"));assert.equal(snapshot.files.length,TEMPLATE_FILES.length);assert.equal(snapshot.sha256,meta.sha256);
 assert.ok(templateInstructions(dir,meta).includes("Ничто видимое не появляется"));
 assert.ok(listVideoTemplates(temp).some(t=>t.id==="tech-story"));
});
test("template snapshots remain independent and detect damaged project instructions",()=>{
 const id=store.createProject({topic:"История вычислений",duration:150,format:"9:16",voice:false,productionTemplateId:"tech-story"});
 const p=store.project(id)!;const dir=path.join(temp,"data/projects",id);const selection=p.profile.productionTemplate;
 const initial=templateInstructions(dir,selection),catalogFile=path.join(temp,"data/templates/tech-story/v1/CONTENT.md"),projectFile=path.join(dir,"template/CONTENT.md");
 const catalog=fs.readFileSync(catalogFile,"utf8"),projectCopy=fs.readFileSync(projectFile,"utf8");
 try{
  fs.appendFileSync(catalogFile,"\nFuture template revision");
  assert.equal(templateInstructions(dir,selection),initial);
  assert.notEqual(loadVideoTemplate("tech-story",temp).sha256,selection!.sha256);
  fs.appendFileSync(projectFile,"\nUnexpected edit");
  assert.throws(()=>templateInstructions(dir,selection),/повреждён/);
 }finally{fs.writeFileSync(catalogFile,catalog);fs.writeFileSync(projectFile,projectCopy);}
});
test("unsupported template IDs and incompatible format fail before a project is created",()=>{
 const count=store.projects().length;
 assert.throws(()=>store.createProject({topic:"Test",duration:150,format:"9:16",voice:false,productionTemplateId:"../../.env.local"}));
 assert.throws(()=>store.createProject({topic:"Test",duration:150,format:"16:9",voice:false,productionTemplateId:"tech-story"}),/9:16/);
 assert.equal(store.projects().length,count);
});


test("Measured natural speech keeps its requested narration budget instead of imposing a new words-per-second ceiling",()=>{
 const p={title:"Natural performance",summary:"Measured timing",factNotes:"Example",scenes:Array.from({length:4},(_,i)=>({id:`s${i}`,title:"Scene",subtitle:"",narration:Array.from({length:25},()=>"слово").join(" "),visual:"flow",items:["Item"],seconds:11.5}))};
 assert.throws(()=>normalizePlan(p,46,true),/слишком длинный/);
 const measured=normalizePlan(p,46,true,60);assert.equal(measured.scenes.reduce((n,s)=>n+s.seconds,0),46);assert.equal(measured.scenes[0].narration,p.scenes[0].narration);
 assert.throws(()=>normalizePlan(p,46,true,40),/бюджет/);
});

test("3D model breakdown saves its own runtime and instructions without migrating legacy projects",()=>{
 const before=store.profile(),legacy=loadVideoTemplate("tech-story",temp).sha256;
 const id=store.createProject({topic:"Как работает электродвигатель",duration:60,format:"9:16",voice:false,productionTemplateId:"model-breakdown",renderMode:"auto"});
 const p=store.project(id)!,dir=path.join(temp,"data/projects",id);
 assert.equal(p.profile.productionTemplate?.id,"model-breakdown");assert.equal(p.profile.renderMode,"three");assert.equal(p.profile.production?.visualDesignVersion,1);assert.equal(p.profile.production?.voiceProfile?.name,"Dennis");assert.equal(p.profile.production?.voiceProfile?.model,"eleven_v4");assert.equal(p.profile.backgroundDesign?.opacity,.5);assert.ok(BACKGROUND_IDS.includes(p.profile.backgroundDesign!.id));
 assert.ok(templateInstructions(dir,p.profile.productionTemplate).includes("Одинаковый эффект не чаще3с"));
 assert.equal(loadVideoTemplate("tech-story",temp).sha256,legacy);assert.deepEqual(store.profile(),before);
 assert.ok(listVideoTemplates(temp).some(t=>t.id==="model-breakdown"&&t.runtime?.renderMode==="three"&&t.defaults.duration===60));
 assert.throws(()=>store.createProject({topic:"Wrong renderer",duration:60,format:"9:16",voice:false,productionTemplateId:"model-breakdown",renderMode:"2d"}),/3D/);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id=?").run(id);
});
test("child output keeps a Cyrillic letter split across stdout chunks",async()=>{
 const {run}=await import("../src/lib/provider");
 // "за" = d0 b7 d0 b0: the first chunk ends in the middle of "з".
 const out=await run(process.execPath,["-e","process.stdout.write(Buffer.from([0xd0]));setTimeout(()=>process.stdout.write(Buffer.from([0xb7,0xd0,0xb0])),80)"]);
 assert.equal(out,"за");
});
test("Russian TTS says the brand as «экс-тюнд» while captions keep xtuned",async()=>{
 const {pronounce}=await import("../src/lib/voice");
 const r=pronounce("Хочешь больше таких разборов? Подписывайся на xtuned.","ru");
 assert.equal(r.text,"Хочешь больше таких разборов? Подписывайся на экс-тюнд.");
 assert.deepEqual(r.used,[{written:"xtuned",spoken:"экс-тюнд"}]);
 assert.deepEqual(pronounce("Без бренда.","ru").used,[]);
 assert.equal(pronounce("Follow xtuned.","en").text,"Follow xtuned.");
});

test("templates are discovered from disk: built-ins keep pinned versions/fingerprints, saved ones are versioned and never overwritten",async()=>{
 const {saveTemplate}=await import("../src/lib/template-save");
 const {resolveTemplateRef,videoTemplateIdSchema}=await import("../src/lib/video-templates");
 // Built-in fingerprints recorded before discovery replaced the hardcoded enum (2026-10-19).
 const repo=process.env.INIT_CWD||path.resolve(__dirname,"..");
 assert.equal(loadVideoTemplate("tech-story",repo).sha256,"67ca96b88c8a22e794fd6dcbfdebede3bd035dbb773d12d9e7987a086a197467");
 assert.equal(loadVideoTemplate("model-breakdown",repo).sha256,"1eecf26060c72688c298ef4cd4ede4e79e8df99598bca70b53300b3c9522b549");
 assert.equal(loadVideoTemplate("illustrated-scene",repo).sha256,"f3d814f025d0d769df0e2ac9eee2584cd6f7ec58b9308c17801b25979a6e862c");
 assert.deepEqual(listVideoTemplates(repo).slice(0,3).map(t=>`${t.id}@v${t.version}`),["tech-story@v1","model-breakdown@v1","illustrated-scene@v2"]);
 assert.equal(resolveTemplateRef("illustrated-scene",repo).version,2);assert.equal(resolveTemplateRef("illustrated-scene@v1",repo).version,1);
 assert.equal(videoTemplateIdSchema.safeParse("../../.env.local").success,false);
 // A malformed saved template is skipped instead of breaking the template list.
 const broken=path.join(temp,"data/templates/broken-one/v1");fs.mkdirSync(broken,{recursive:true});fs.writeFileSync(path.join(broken,"template.json"),"{");
 assert.ok(!listVideoTemplates(temp).some(t=>t.id==="broken-one"));assert.ok(listVideoTemplates(temp).some(t=>t.id==="tech-story"));
 fs.rmSync(path.join(temp,"data/templates/broken-one"),{recursive:true});
 // Saving needs an approved project with a film.
 const id=store.createProject({topic:"Как работает лифт",duration:45,format:"9:16",voice:false});
 const dir=path.join(temp,"data/projects",id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"video.mp4"),"mp4");fs.writeFileSync(path.join(dir,"storyboard.json"),"{}");
 store.updateProject(id,{plan:{title:"Лифт",summary:"",factNotes:"",scenes:[]} as any,video:`data/projects/${id}/video.mp4`,status:"review"});
 assert.throws(()=>saveTemplate(id,{id:"lift-story",name:"Лифт"},temp),/одобренного/);
 store.updateProject(id,{status:"approved"});
 assert.throws(()=>saveTemplate(id,{id:"tech-story",name:"X"},temp),/встроенный/);
 const first=saveTemplate(id,{id:"lift-story",name:"Лифт",notes:"Крупнее подписи."},temp);
 assert.equal(first.version,1);assert.equal(first.path,"data/templates/lift-story/v1");
 const saved=loadVideoTemplate("lift-story",temp);
 assert.equal(saved.manifest.defaults.duration,45);assert.equal(saved.manifest.runtime?.renderMode,"2d");assert.match(saved.files["README.md"],/Крупнее подписи/);
 assert.equal(fs.readFileSync(path.join(temp,first.path,"reference/video.mp4"),"utf8"),"mp4");
 const before=fs.readFileSync(path.join(temp,first.path,"template.json"),"utf8");
 const second=saveTemplate(id,{id:"lift-story",name:"Лифт 2"},temp);
 assert.equal(second.version,2);assert.equal(fs.readFileSync(path.join(temp,first.path,"template.json"),"utf8"),before,"v1 is untouched");
 assert.equal(loadVideoTemplate("lift-story",temp).manifest.version,2);assert.equal(loadVideoTemplate("lift-story@v1",temp).manifest.name,"Лифт");
 const fromTemplate=store.createProject({topic:"Как работает эскалатор",duration:45,format:"9:16",voice:false,productionTemplateId:"lift-story"});
 assert.equal(store.project(fromTemplate)!.profile.productionTemplate?.id,"lift-story");assert.equal(store.project(fromTemplate)!.profile.productionTemplate?.version,2);
});

test("agent mode is an explicit per-project choice and excludes a separate content model",()=>{
 const id=store.createProject({topic:"Как работает кэш процессора",duration:30,format:"9:16",voice:false,agentMode:{declaredAgent:"claude-code/claude-opus-5-5"}});
 assert.deepEqual(store.project(id)!.profile.production?.agentMode,{version:1,declaredAgent:"claude-code/claude-opus-5-5"});
 assert.throws(()=>store.createProject({topic:"Как работает кэш",duration:30,format:"9:16",voice:false,agentMode:{declaredAgent:"x"},contentModel:"claude-opus-5-5"}),/ведущий агент/);
 const legacy=store.createProject({topic:"Как работает DNS",duration:30,format:"9:16",voice:false});
 assert.equal(store.project(legacy)!.profile.production?.agentMode,undefined);
});

test("style-lab samples are saved as listed templates that cannot start projects until implemented",async()=>{
 const {saveStyleSample}=await import("../src/lib/template-save");
 const sharp=(await import("sharp")).default;
 const src=path.join(temp,"work/style-lab/doodle"),code=path.join(temp,"renderer/style-lab/doodle");
 fs.mkdirSync(src,{recursive:true});fs.mkdirSync(code,{recursive:true});
 fs.writeFileSync(path.join(temp,"work/style-lab/story.json"),JSON.stringify({title:"Как сообщение доходит до друга",fps:30,durationInFrames:450,beats:[{from:0,to:4,caption:"Ты нажал",action:"Нажатие"}]}));
 for(const f of ["video.mp4","contact-sheet.jpg"])fs.writeFileSync(path.join(src,f),f);
 fs.writeFileSync(path.join(src,"STYLE.md"),"# Дудл\n\nПравила стиля.\n");fs.writeFileSync(path.join(src,"BRIEF.md"),"бриф");
 await sharp({create:{width:9,height:16,channels:3,background:"#ffffff"}}).png().toFile(path.join(src,"frame-9.0s.png"));
 fs.writeFileSync(path.join(code,"index.tsx"),"export {};\n");
 const meta={id:"doodle-style",name:"Дудл",description:"Образец.",colors:{background:"#FFFFFF",text:"#000000",purple:"#8D59DA"},fonts:["Caveat"],libraries:["roughjs"],visualRules:["Одна страница."],avoid:["Мерцание."],issues:["Зазор в слове."]};
 fs.writeFileSync(path.join(src,"template-meta.json"),JSON.stringify(meta));
 await assert.rejects(saveStyleSample("doodle",{userWords:" "},temp),/слова пользователя/);
 const first=await saveStyleSample("doodle",{userWords:"Сохрани каждый как шаблон"},temp);
 assert.equal(first.path,"data/templates/doodle-style/v1");
 const t=loadVideoTemplate("doodle-style",temp);
 assert.deepEqual(t.manifest.styleSample,{renderer:"renderer/style-lab/doodle",connected:false});
 assert.equal(t.manifest.reference.duration,15);assert.match(t.files["DESIGN.md"],/Правила стиля/);assert.match(t.files["README.md"],/Сохрани каждый как шаблон/);
 for(const f of ["reference/video.mp4","reference/poster.jpg","reference/frames/frame-9.0s.png","reference/source/index.tsx","reference/story.json","reference/SHA256SUMS"])assert.ok(fs.existsSync(path.join(temp,first.path,f)),f);
 const provenance=JSON.parse(fs.readFileSync(path.join(temp,first.path,"provenance.json"),"utf8"));
 assert.equal(provenance.approved,false);assert.equal(provenance.userRequest,"Сохрани каждый как шаблон");
 assert.ok(listVideoTemplates(temp).some((x:any)=>x.id==="doodle-style"&&x.styleSample?.connected===false));
 assert.throws(()=>store.createProject({topic:"Как работает почта",duration:30,format:"9:16",voice:false,productionTemplateId:"doodle-style"}),/образец стиля/);
 const before=fs.readFileSync(path.join(temp,first.path,"template.json"),"utf8");
 assert.equal((await saveStyleSample("doodle",{userWords:"ещё раз"},temp)).version,2);
 assert.equal(fs.readFileSync(path.join(temp,first.path,"template.json"),"utf8"),before,"v1 is untouched");
 // A sample with its own story and poster frame (e.g. a 5-second scene) does not borrow the shared 15-second story.
 const iso=path.join(temp,"work/style-lab/iso"),isoCode=path.join(temp,"renderer/style-lab/iso");
 fs.mkdirSync(iso,{recursive:true});fs.mkdirSync(isoCode,{recursive:true});
 for(const f of ["video.mp4","contact-sheet.jpg","BRIEF.md"])fs.writeFileSync(path.join(iso,f),f);
 fs.writeFileSync(path.join(iso,"STYLE.md"),"# Изометрия\n");
 fs.writeFileSync(path.join(iso,"story.json"),JSON.stringify({title:"How maps predict traffic",fps:30,durationInFrames:150,beats:[{from:0,to:5,caption:"Maps plans your route",action:"Город вырастает"}]}));
 await sharp({create:{width:9,height:16,channels:3,background:"#000000"}}).png().toFile(path.join(iso,"frame-3.6s.png"));
 fs.writeFileSync(path.join(isoCode,"index.tsx"),"export {};\n");
 fs.writeFileSync(path.join(iso,"template-meta.json"),JSON.stringify({...meta,id:"iso-style",name:"Изометрия",poster:"frame-3.6s.png"}));
 const isoSaved=await saveStyleSample("iso",{userWords:"сохрани как шаблон"},temp),isoT=loadVideoTemplate("iso-style",temp);
 assert.equal(isoT.manifest.reference.duration,5);assert.equal(isoT.manifest.reference.title,"How maps predict traffic");
 assert.match(isoT.files["README.md"],/5-секундный/);assert.match(isoT.files["CONTENT.md"],/Maps plans your route/);
 for(const f of ["reference/poster.jpg","reference/frames/frame-3.6s.png"])assert.ok(fs.existsSync(path.join(temp,isoSaved.path,f)),f);
});
