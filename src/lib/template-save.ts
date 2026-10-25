import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {z} from "zod";
import {project,DATA,ROOT} from "./store";
import {BUILTIN_TEMPLATES,TEMPLATE_FILES,loadVideoTemplate,templateVersions} from "./video-templates";

const sha=(file:string)=>createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const RULE_FILES=["README.md","DESIGN.md","CONTENT.md","MOTION.md","VOICE.md","WORKFLOW.md","CHECKLIST.md"] as const;
const REFERENCE_FILES=["video.mp4","storyboard.json","script.md","sources.json","contact-sheet.jpg","poster.jpg","quality-report.json","illustrated-plan.json","isometric-plan.json"];
const list=(items:string[]|undefined)=>(items??[]).map(s=>`- ${s}`).join("\n")||"- (нет записей)";

/**
 * Save an approved project as a NEW template version: settings + rules + reference film (user decision 2026-10-19).
 * Never overwrites: a new id gets v1, an existing saved id gets v(N+1); built-in templates (tech-story/v1 ...) are never touched.
 */
export function saveTemplate(projectId:string,opts:{id:string;name:string;description?:string;notes?:string},root=ROOT){
 if(!/^[a-z][a-z0-9-]{0,39}$/.test(opts.id))throw new Error("id шаблона: латиница в нижнем регистре, цифры и дефис, до 40 символов.");
 if(opts.id in BUILTIN_TEMPLATES)throw new Error(`«${opts.id}» — встроенный шаблон, его версии не меняются. Выберите новый id.`);
 const p=project(projectId);if(!p)throw new Error("Проект не найден.");
 if(p.status!=="approved")throw new Error("Шаблон сохраняется только из одобренного пользователем ролика.");
 if(!p.video||!p.plan)throw new Error("У проекта нет готового видео.");
 if(!p.profile.production)throw new Error("Шаблон сохраняется из проектов режима качества.");
 if(p.plan.filmKind==="telephone-history")throw new Error("Ролики «Истории технологий» используют собственный рендерер; новый шаблон из них не сохраняется.");
 const src=path.join(DATA,"projects",projectId);
 const base=fs.existsSync(path.join(src,"template","template.json"))?path.join(src,"template"):null;
 const versions=templateVersions(opts.id,root),version=(versions.at(-1)??0)+1;
 const relative=`data/templates/${opts.id}/v${version}`,dir=path.join(root,relative);
 const requested=(()=>{try{return JSON.parse(fs.readFileSync(path.join(src,"duration-budget.json"),"utf8")).seconds;}catch{return p.duration;}})();
 const duration=[30,45,60,150].includes(requested)?requested:requested<=30?30:requested<=45?45:requested<=60?60:150;
 const prod=p.profile.production;
 const avatarFile=p.profile.headerAvatar?path.join(DATA,"projects",p.profile.headerAvatar.file):null;
 if(avatarFile&&sha(avatarFile)!==p.profile.headerAvatar!.sha256)throw new Error("Снимок аватара проекта изменён.");
 const manifest={
  id:opts.id,version,name:opts.name.slice(0,80),description:(opts.description??`Сохранено из ролика «${p.title}».`).slice(0,500),
  defaults:{duration,format:p.format,voice:p.voice,...(prod.language==="en"?{language:"en"}:{}),factCheck:prod.factCheck??"strict"},
  runtime:{renderMode:p.profile.renderMode==="three"?"three":"2d",...(p.plan.filmKind==="illustrated"||p.plan.filmKind==="isometric"?{filmKind:p.plan.filmKind}:{}),visualDesignVersion:1,backgroundSelection:"approved-random",
   ...(prod.voiceProfile?{voiceProfile:prod.voiceProfile}:{}),...(p.profile.creatorOutro?{creatorOutro:"xtuned-outro/v1"}:{}),
   ...(avatarFile?{headerAvatar:{file:"assets/avatar.png",sha256:p.profile.headerAvatar!.sha256}}:{})},
  reference:{projectId,title:p.title,duration:p.duration,videoSha256:sha(path.join(ROOT,p.video))},
  profile:{template:p.profile.template,font:p.profile.font,hookRules:p.profile.hookRules,writingRules:p.profile.writingRules,visualRules:p.profile.visualRules,avoid:p.profile.avoid,examples:p.profile.examples},
 };
 const baseText=(name:string)=>base&&fs.existsSync(path.join(base,name))?fs.readFileSync(path.join(base,name),"utf8"):null;
 const generated:Record<(typeof RULE_FILES)[number],string>={
  "README.md":`# ${manifest.name} · v${version}\n\n${manifest.description}\n\nЭталон: проект ${projectId} «${p.title}» (${p.duration} с, ${p.format}). Правила ниже — наблюдения одного одобренного ролика, не обучение модели. Факты каждой новой темы исследуются заново.\n`,
  "DESIGN.md":`# Дизайн\n\n${list(p.profile.visualRules)}\n\nПалитра: фон ${p.profile.background}, текст ${p.profile.foreground}, акцент ${p.profile.accent}; шрифт ${p.profile.font}.\n`,
  "CONTENT.md":`# Сценарий\n\n## Начало\n${list(p.profile.hookRules)}\n\n## Рассказ\n${list(p.profile.writingRules)}\n\n## Избегать\n${list(p.profile.avoid)}\n`,
  "MOTION.md":`# Движение\n\nРендер: ${manifest.runtime.renderMode}${p.plan.filmKind?`, тип ${p.plan.filmKind}`:""}. Правила плавности: video-design/MOTION-RULES.md — никакой объект, подпись или состояние не появляется и не исчезает за один кадр; одна постоянная система на весь ролик.\n`,
  "VOICE.md":`# Голос\n\n${prod.voiceProfile?`${prod.voiceProfile.name} · ${prod.voiceProfile.model}\n\n${prod.voiceProfile.delivery}`:"Текущий выбранный голос студии."}\n\nОдин непрерывный дубль, естественная скорость, длительность — потолок.\n`,
  "WORKFLOW.md":`# Порядок работы\n\n1. Исследование темы (Tavily) и проверенный цельный рассказ.\n2. Визуальная концепция и постановка по измеренной речи.\n3. Рендер, ревью кадров итогового MP4, правка изображения без новой озвучки.\n4. Просмотр и одобрение пользователем.\n`,
  "CHECKLIST.md":`# Проверка\n\n- Длительность в бюджете ${duration} с, кадры по часам 30 fps.\n- Плавные появления и исчезновения.\n- Текст в safe-zone.\n- Озвучка одним дублем.\n- Ревью итогового MP4 и просмотр пользователем.\n`,
 };
 const notes=opts.notes?.trim()?`\n\n## Заметки пользователя (${new Date().toISOString().slice(0,10)})\n\n${opts.notes.trim().slice(0,4000)}\n`:"";
 const files:Record<string,string>={
  "template.json":JSON.stringify(manifest,null,2)+"\n",
  "brand.json":baseText("brand.json")??JSON.stringify({colors:{background:p.profile.background,text:p.profile.foreground,purple:p.profile.accent},font:p.profile.font},null,2)+"\n",
  "settings.json":baseText("settings.json")??JSON.stringify({format:p.format,canvas:p.format==="9:16"?{width:1080,height:1920}:{width:1920,height:1080},fps:30},null,2)+"\n",
 };
 for(const name of RULE_FILES)files[name]=(baseText(name)??generated[name])+(name==="README.md"||name==="CONTENT.md"?notes:"");
 // Exclusive creation: the version folder must not exist, every file is written with the "wx" flag.
 fs.mkdirSync(path.dirname(dir),{recursive:true});
 fs.mkdirSync(dir);
 try{
  for(const name of TEMPLATE_FILES)fs.writeFileSync(path.join(dir,name),files[name],{flag:"wx"});
  if(avatarFile){fs.mkdirSync(path.join(dir,"assets"));fs.copyFileSync(avatarFile,path.join(dir,"assets","avatar.png"),fs.constants.COPYFILE_EXCL);}
  fs.mkdirSync(path.join(dir,"reference"));
  const copied:{name:string;sha256:string}[]=[];
  for(const name of REFERENCE_FILES){const from=name==="video.mp4"?path.join(ROOT,p.video):path.join(src,name);if(fs.existsSync(from)){fs.copyFileSync(from,path.join(dir,"reference",name),fs.constants.COPYFILE_EXCL);copied.push({name,sha256:sha(from)});}}
  fs.writeFileSync(path.join(dir,"provenance.json"),JSON.stringify({savedAt:new Date().toISOString(),projectId,projectTitle:p.title,baseTemplate:p.profile.productionTemplate??null,approved:true,reference:copied,notes:opts.notes?.trim()||null},null,2),{flag:"wx"});
  const loaded=loadVideoTemplate(`${opts.id}@v${version}`,root);
  return {id:opts.id,version,path:relative,sha256:loaded.sha256};
 }catch(e){fs.rmSync(dir,{recursive:true,force:true});throw e;}
}

const sampleMetaSchema=z.object({
 id:z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),name:z.string().min(1).max(80),description:z.string().min(1).max(500),
 colors:z.object({background:z.string(),text:z.string(),purple:z.string()}).catchall(z.string().regex(/^#[a-fA-F0-9]{6}$/)),
 fonts:z.array(z.string().max(200)).max(6),libraries:z.array(z.string().max(240)).max(8),
 visualRules:z.array(z.string().max(240)).max(12),avoid:z.array(z.string().max(240)).max(12),issues:z.array(z.string().max(300)).max(12),
 poster:z.string().regex(/^frame-[\d.]+s\.png$/).optional(),
});
const storySchema=z.object({title:z.string(),fps:z.number().positive(),durationInFrames:z.number().int().positive(),beats:z.array(z.object({from:z.number(),to:z.number(),caption:z.string(),action:z.string()}))});
const sampleHash=(file:string)=>({sha256:sha(file)});

/**
 * Save a style-lab sample as a NEW template version (user decision 2026-10-20: «сохрани каждый как шаблон»).
 * It is not an approved project: the manifest marks it styleSample.connected=false, so the studio lists it with its
 * reference film, rules and a snapshot of the sample's source, but refuses to create projects from it until the
 * style is implemented as a prepared renderer. Never overwrites; the user's words are kept in provenance.json.
 */
export async function saveStyleSample(sample:string,opts:{userWords:string},root=ROOT){
 if(!/^[a-z0-9-]{1,40}$/.test(sample))throw new Error("Образец: латиница, цифры и дефис.");
 if(!opts.userWords.trim())throw new Error("Нужны дословные слова пользователя с просьбой сохранить образец.");
 const src=path.join(root,"work/style-lab",sample),code=path.join(root,"renderer/style-lab",sample);
 const meta=sampleMetaSchema.parse(JSON.parse(fs.readFileSync(path.join(src,"template-meta.json"),"utf8")));
 if(meta.id in BUILTIN_TEMPLATES)throw new Error(`«${meta.id}» — встроенный шаблон, его версии не меняются. Выберите новый id.`);
 const poster=meta.poster??"frame-9.0s.png";
 for(const f of ["video.mp4","contact-sheet.jpg","STYLE.md","BRIEF.md",poster])if(!fs.existsSync(path.join(src,f)))throw new Error(`В образце нет ${f}.`);
 if(!fs.existsSync(code))throw new Error(`Нет исходников ${path.relative(root,code)}.`);
 const ownStory=path.join(src,"story.json"),storyFile=fs.existsSync(ownStory)?ownStory:path.join(root,"work/style-lab/story.json"),story=storySchema.parse(JSON.parse(fs.readFileSync(storyFile,"utf8")));
 const duration=Math.round(story.durationInFrames/story.fps*100)/100;
 const versions=templateVersions(meta.id,root),version=(versions.at(-1)??0)+1;
 const relative=`data/templates/${meta.id}/v${version}`,dir=path.join(root,relative),date=new Date().toISOString().slice(0,10);
 const manifest={
  id:meta.id,version,name:meta.name,description:meta.description,
  defaults:{duration:30,format:"9:16",voice:true,factCheck:"off"},
  reference:{styleLab:sample,title:story.title,duration,videoSha256:sha(path.join(src,"video.mp4"))},
  styleSample:{renderer:`renderer/style-lab/${sample}`,connected:false},
  profile:{template:"explainer",font:"Manrope",
   hookRules:["Начать с действия, которое зритель узнаёт, и сразу показать предмет, о котором речь."],
   writingRules:["Один цельный рассказ: действие → механизм → следствие, связки «но / поэтому».","Каждый такт называет предмет или действие, которое можно нарисовать в этом стиле.","Длительность — потолок, без ускорения речи."],
   visualRules:meta.visualRules,avoid:meta.avoid,examples:[]},
 };
 const beats=story.beats.map(b=>`- ${b.from}–${b.to} с «${b.caption}»: ${b.action}`).join("\n");
 const files:Record<string,string>={
  "template.json":JSON.stringify(manifest,null,2)+"\n",
  "brand.json":JSON.stringify({handle:"@xtuned",colors:meta.colors,fonts:meta.fonts,libraries:meta.libraries},null,2)+"\n",
  "settings.json":JSON.stringify({kind:"style-sample",renderer:`renderer/style-lab/${sample}`,composition:"StyleLab",canvas:{width:1080,height:1920},fps:story.fps,durationInFrames:story.durationInFrames,
   rerenderReference:`node --import tsx scripts/style-lab-render.ts ${sample}`,chromiumOptions:{gl:"angle"},connected:false},null,2)+"\n",
  "README.md":`# ${meta.name} · v${version}\n\n**Образец стиля. Рендерер ещё не подключён к конвейеру: проект по этому шаблону создать нельзя, пока стиль не реализован.**\n\n${meta.description}\n\nСохранён ${date} по просьбе пользователя: «${opts.userWords.trim().slice(0,600)}»\n\nЭталон: ${duration}-секундный немой ролик style-lab «${story.title}» (\`reference/video.mp4\`, кадры и контактный лист рядом). Исходники образца на момент сохранения — \`reference/source/\`. Правила — наблюдения одного образца, не обучение модели.\n\n## Известные недостатки образца\n\n${list(meta.issues)}\n`,
  "DESIGN.md":fs.readFileSync(path.join(src,"STYLE.md"),"utf8"),
  "CONTENT.md":`# Сценарий\n\n## Начало\n${list(manifest.profile.hookRules)}\n\n## Рассказ\n${list(manifest.profile.writingRules)}\n\n## Эталонный сюжет образца\n\n${beats}\n\n## Избегать\n${list(meta.avoid)}\n`,
  "MOTION.md":`# Движение\n\n${list(meta.visualRules)}\n\n## Библиотеки и детерминизм\n\n${list(meta.libraries)}\n\nКаждый кадр — чистая функция номера кадра: без Math.random, Date, таймеров и CSS-анимаций. Правила плавности video-design/MOTION-RULES.md: ничто не появляется и не исчезает за один кадр; одна постоянная система на весь ролик.\n`,
  "VOICE.md":`# Голос и звук\n\nОбразец немой. При подключении стиля — голос и звук по правилам студии: один непрерывный дубль, естественная скорость, звуки по docs/sound-preferences.md.\n`,
  "WORKFLOW.md":`# Как подключить стиль\n\n1. Пользователь говорит, что этот стиль нужно реализовать.\n2. Подготовленный рендерер на основе \`reference/source/\`, управляемый проверенным JSON (сборки, маршруты, тайминги по меткам слов) — без генерируемого кода.\n3. Новая версия шаблона с connected:true и эталоном из одобренного ролика.\n4. Дальше — обычный конвейер: исследование, рассказ, озвучка, постановка, рендер, ревью итогового MP4, одобрение пользователем.\n`,
  "CHECKLIST.md":`# Проверка\n\n- Ничто не появляется и не исчезает за один кадр; переходы проверены по итоговому MP4.\n- Текст в безопасной зоне (≥220 px сверху, ≥320 px снизу).\n- Одна постоянная схема на весь ролик.\n\n## Исправить при подключении\n\n${list(meta.issues)}\n`,
 };
 fs.mkdirSync(path.dirname(dir),{recursive:true});
 fs.mkdirSync(dir);
 try{
  for(const name of TEMPLATE_FILES)fs.writeFileSync(path.join(dir,name),files[name],{flag:"wx"});
  const ref=path.join(dir,"reference");fs.mkdirSync(path.join(ref,"frames"),{recursive:true});fs.mkdirSync(path.join(ref,"source"));
  const copied:{name:string;sha256:string}[]=[];
  const copy=(from:string,to:string)=>{fs.copyFileSync(from,path.join(ref,to),fs.constants.COPYFILE_EXCL);copied.push({name:to,...sampleHash(from)});};
  for(const f of ["video.mp4","contact-sheet.jpg","STYLE.md","BRIEF.md"])copy(path.join(src,f),f);
  for(const f of fs.readdirSync(src).filter(f=>/^frame-[\d.]+s\.png$/.test(f)).sort())copy(path.join(src,f),`frames/${f}`);
  copy(storyFile,"story.json");
  for(const f of fs.readdirSync(code).filter(f=>/\.(tsx?|json)$/.test(f)).sort())copy(path.join(code,f),`source/${f}`);
  await sharp(path.join(src,poster)).resize(720).jpeg({quality:82}).toFile(path.join(ref,"poster.jpg"));
  copied.push({name:"poster.jpg",...sampleHash(path.join(ref,"poster.jpg"))});
  fs.writeFileSync(path.join(ref,"SHA256SUMS"),copied.map(c=>`${c.sha256}  ${c.name}`).join("\n")+"\n",{flag:"wx"});
  fs.writeFileSync(path.join(dir,"provenance.json"),JSON.stringify({savedAt:new Date().toISOString(),source:"style-lab",sample,approved:false,connected:false,userRequest:opts.userWords.trim(),reference:copied},null,2)+"\n",{flag:"wx"});
  const loaded=loadVideoTemplate(`${meta.id}@v${version}`,root);
  return {id:meta.id,version,path:relative,sha256:loaded.sha256};
 }catch(e){fs.rmSync(dir,{recursive:true,force:true});throw e;}
}
