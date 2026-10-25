import fs from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {ROOT,DATA,project,createProject,updateProject,db,event,enqueue} from "../src/lib/store";
import {qualityInstructions} from "../src/lib/quality-instructions";
import {writeJSON,readJSON,fileHash,spokenText,digest,auditCurrent} from "../src/lib/quality";
import {auditManualPlan} from "../src/lib/editorial";
import {prepareVoicePlan} from "../src/lib/voice";
import {supplementSources} from "../src/lib/preproduction";
import {askClaudeJSON,MOTION_AGENT} from "../src/lib/claude-provider";
import {outroMotionSchema} from "../src/lib/creator-branding";
import {storyboardSchema} from "../src/lib/model";
import {run,PYTHON,FFMPEG} from "../src/lib/provider";
const sourceId="175081da-be5c-4ff1-b75b-2a14510c5d55",production=path.join(DATA,"productions/2026-10-18-tesla-branding"),manifestFile=path.join(production,"manifest.json");
async function main(){
 const action=process.argv[2]||"prepare",source=project(sourceId);if(!source?.plan)throw new Error("Source missing");
 let manifest=await readJSON(manifestFile);
 if(!manifest){
  if(action!=="prepare")throw new Error("Prepare first");
  db().exec("BEGIN IMMEDIATE");let id:string;
  try{id=createProject({topic:source.topic+" · Dennis / @xtuned / финальная заставка",duration:60,format:source.format,voice:true,renderMode:"three",initialPlan:source.plan});db().prepare("UPDATE jobs SET status='branding-hold' WHERE project_id=? AND status='queued'").run(id);db().exec("COMMIT");}catch(e){db().exec("ROLLBACK");throw e;}
  manifest={version:1,id,sourceId,sourceVideoHash:await fileHash(path.join(DATA,"projects",sourceId,"video.mp4")),createdAt:new Date().toISOString(),userScope:"Preserve seven Tesla scenes and all narration; replace voice with latest professional Dennis/v4, avatar, hide bottom technical labels; append spoken creator outro and Openverse accents",voiceId:"Uk2wBdgJpwqwirqxDggc",model:"eleven_v4",pet:{id:"pet_6abe1561305c8191b8b1cb9051053cad",name:"Denis",usage:"Inspected inventory; portrait supplied by owner is the avatar identity reference"},image:{tool:"image_gen",source:"dennis-avatar-v1.png",prompt:"Identity-preserve pixel-art portrait: keep face, brown hair, wink and sunglasses; circular black/deep-purple #120C1D backdrop, purple #8D59DA and lavender #E0CDF8 sticker edge, transparent exterior; no text."}};
  await writeJSON(manifestFile,manifest);
 }
 const id=manifest.id,dir=path.join(DATA,"projects",id),sourceDir=path.join(DATA,"projects",sourceId),signal=new AbortController().signal;
 if(action==="prepare"){
  await fs.mkdir(path.join(dir,"branding"),{recursive:true});
  const avatar=path.join(dir,"branding/dennis-avatar.png");await fs.copyFile(path.join(production,"dennis-avatar-v1.png"),avatar);
  let motion=await readJSON(path.join(production,"outro-motion/answer.json"));
  if(!motion){console.log("Claude Opus 5.5 / xhigh: creator outro motion");motion=await askClaudeJSON("Поставь короткую финальную заставку после неизменённого 3D объяснения Tesla. Это не новая сцена машины: общий мир мягко гаснет, верхняя шапка с маленьким аватаром и @xtuned остаётся. Чёрно-фиолетовая палитра #000000/#120C1D/#8D59DA/#E0CDF8. Вертикальное видео1080x1920. Внутри safe-zone x78..938 y108..1420: вопрос на y365, CTA ниже, большая плашка @XTUNED, пиксельный портрет внизу на y840. Фраза озвучки ~4сек: «Хочешь узнать больше? Подписывайся на xtuned». Нужен спокойный выразительный вход, без резких появлений и свайпов; минимум2сек установившегося кадра. Выбери только разрешённые численные параметры тайминга и размера, без кода. fadeSeconds затухание старого изображения; avatarDelaySeconds задержка аватара, risePixels сдвиг вверх при проявлении, avatarSize его размер. Сохрани 3D сценографию до заставки без изменений.",z.toJSONSchema(outroMotionSchema),path.join(production,"outro-motion"),[],signal,MOTION_AGENT);}
  motion=outroMotionSchema.parse(motion);
  const plan=structuredClone(source.plan);plan.scenes.push({id:"scene-8",title:"Хочешь узнать больше?",subtitle:"Подписывайся на @xtuned",narration:"Хочешь узнать больше? Подписывайся на xtuned.",visual:"spotlight",items:["@xtuned"],seconds:6});
  plan.creatorBranding={version:1,username:"@xtuned",avatarFile:`${id}/branding/dennis-avatar.png`,avatarSha256:await fileHash(avatar),hideSchematicNote:true,outro:{sceneId:"scene-8",question:"Хочешь узнать больше?",callToAction:"Подписывайся",motion}};
  storyboardSchema.parse(plan);
  for(const name of ["sources.json","research.json"]){await fs.copyFile(path.join(sourceDir,name),path.join(dir,name));}
  await fs.cp(path.join(sourceDir,"models"),path.join(dir,"models"),{recursive:true});
  const instructions=qualityInstructions(ROOT,dir),profile=structuredClone(source.profile);
  profile.production={...profile.production!,instructionsHash:instructions.sha256,voiceProfile:{id:"owner-dennis-professional-v4",voiceId:manifest.voiceId,model:"eleven_v4",name:"Dennis",delivery:"Живой русский рассказ знакомому: заинтересованность в механизме, спокойная уверенность, смысловые ударения и естественные паузы. Финальное приглашение подписаться — тепло и дружелюбно, без рекламного нажима и театральности."}};
  profile.username="@xtuned";
  // Profiles are immutable to ordinary updateProject calls; this explicit revision owns its snapshot.
  db().prepare("UPDATE projects SET profile=? WHERE id=?").run(JSON.stringify(profile),id);
  updateProject(id,{plan,title:source.title,duration:60,status:"draft",stage:"Готовим авторскую заставку",progress:12,error:null});
  if(project(id)?.profile.production?.voiceProfile?.voiceId!==manifest.voiceId)throw new Error("Dennis profile was not persisted");
  await writeJSON(path.join(dir,"storyboard.json"),plan);await writeJSON(path.join(dir,"duration-budget.json"),{seconds:60});
  await writeJSON(path.join(dir,"revision-provenance.json"),{sourceId,sourceHash:manifest.sourceVideoHash,baseNarrationPreserved:spokenText(plan).startsWith(spokenText(source.plan)),baseScenesHash:digest(source.plan.scenes),worldPreserved:digest(plan.world3d)===digest(source.plan.world3d),newScene:"scene-8",voiceProfile:profile.production.voiceProfile,avatarHash:plan.creatorBranding.avatarSha256,modelRoles:{content:"gpt-6.1-sol/xhigh",outroMotion:MOTION_AGENT},humanApproved:false});
  console.log("Sol / xhigh: independent editorial and fact gates");await auditManualPlan(project(id)!,dir,signal,supplementSources);
  console.log("Sol / xhigh: continuous Dennis performance directions");const voice=await prepareVoicePlan(project(id)!,dir,signal);if(!voice||voice.profile?.voiceId!==manifest.voiceId)throw new Error("Dennis performance plan missing");
  manifest.prepared=true;await writeJSON(manifestFile,manifest);console.log(JSON.stringify({id,prepared:true}));
 }else if(action==="voice"){
  if(!manifest.prepared)throw new Error("No prepared revision");
  const p=project(id)!,facts=await readJSON(path.join(dir,"fact-audit.json")),sources=await readJSON(path.join(dir,"sources.json"));if(!p.plan||!auditCurrent(facts,p.plan,sources))throw new Error("Fact gate stale");
  const voice=await readJSON(path.join(dir,"voice-plan.json"));if(voice?.profile.voiceId!==manifest.voiceId||voice.profile.model!=="eleven_v4"||voice.plainText!==spokenText(p.plan))throw new Error("Voice plan stale");
  console.log(JSON.stringify({voice:"Dennis professional",model:"eleven_v4",characters:voice.ttsInput.length,estimatedCredits:voice.ttsInput.length,successfulTtsRequestCeiling:1}));
  await writeJSON(path.join(dir,"render.json"),{plan:p.plan,voice:true,maxDuration:60,ttsProvider:"elevenlabs"});
  await run(PYTHON,[path.join(ROOT,"scripts/speech.py"),dir,FFMPEG],{signal,timeout:240000});
  const measured=storyboardSchema.parse(await readJSON(path.join(dir,"storyboard.json")));updateProject(id,{plan:measured,duration:Math.round(measured.scenes.reduce((n,s)=>n+s.seconds,0)),stage:"Голос Dennis записан; ожидает финального рендера",progress:30});
  manifest.narrationHash=await fileHash(path.join(dir,"narration.wav"));manifest.voiceReady=true;await writeJSON(manifestFile,manifest);console.log(JSON.stringify({id,voiceReady:true,narrationHash:manifest.narrationHash}));
 }else if(action==="render"){
  if(!manifest.voiceReady)throw new Error("No saved Dennis master");if(await fileHash(path.join(dir,"narration.wav"))!==manifest.narrationHash)throw new Error("Voice master changed");
  db().prepare("UPDATE jobs SET status='superseded' WHERE project_id=? AND status='branding-hold'").run(id);enqueue(id,"picture-only");updateProject(id,{status:"queued",stage:"Рендерим авторскую версию Tesla",progress:30,error:null});event(id,"Сохранены исходные семь сцен и непрерывный Dennis-мастер. Рендер с новым аватаром, заставкой и Openverse SFX; повторной озвучки нет.");console.log(JSON.stringify({id,queued:true}));
 }else throw new Error("Unknown action");
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Revision failed");process.exitCode=1;});
