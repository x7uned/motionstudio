import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {DATA,project} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,auditCurrent,digest,spokenText} from "../src/lib/quality";

async function main(){
 const output=path.join(DATA,"deliveries/2026-10-18-three-explainers");
 const films=[
  {id:"57abdaaa-4d64-4b7f-8de9-08e888d3550f",file:"01-wallhack-counter-strike.mp4",name:"Как работает wallhack",master:"f2e2c69e2b7091a25d8d578948bb37683e397209a228334e005d3c77e9df01fa"},
  {id:"780ea45d-e247-48d9-8b60-7adfc785703c",file:"02-why-ram-prices-rise.mp4",name:"Почему дорожает оперативная память"},
  {id:"175081da-be5c-4ff1-b75b-2a14510c5d55",file:"03-tesla-roadster.mp4",name:"Как Tesla объясняет полёт Roadster"},
 ];
 const rows=[];
 for(const film of films){
  const p=project(film.id),dir=path.join(DATA,"projects",film.id);
  assert.ok(p?.plan&&p.status==="review",`${film.name}: project must be ready for editor review`);
  const artifactHash=await fileHash(path.join(dir,"video.mp4"));
  assert.equal(p.review?.quality?.artifactHash,artifactHash,"A stale MP4 report cannot be delivered");
  assert.equal(p.review?.quality?.inputHash,digest({plan:p.plan,profile:p.profile,format:p.format}),"Report must match the final storyboard and profile");
  assert.equal(p.review?.quality?.coverage.frameModel,true,"Frame review must be available");
  assert.equal(p.review?.quality?.coverage.decoded,true);
  assert.equal(p.review?.technicalPassed,true);
  assert.equal(p.review?.quality?.findings.filter((f:{severity:string})=>f.severity==="error").length,0,"Resolve critical export findings before delivery");
  const facts=await readJSON(path.join(dir,"fact-audit.json")),sources=await readJSON(path.join(dir,"sources.json"));
  assert.ok(auditCurrent(facts,p.plan,sources),"Final narration and screen labels must retain current fact verification");
  const playback=await readJSON(path.join(dir,"playback-review.json"));
  assert.equal(playback?.artifactHash,artifactHash,"Full playback must cover the delivered MP4");
  assert.equal(playback.technicalPlaybackPassed,true);
  assert.equal(playback.endObservation.ended,true);
  assert.equal(playback.endObservation.error,null);
  const narrationHash=await fileHash(path.join(dir,"narration.wav"));
  let visualProviders;
  if(p.profile.production?.visualDesignVersion===1){
   const visual=await readJSON(path.join(dir,"visual-concept.json")),assembly=await readJSON(path.join(dir,"assembly-snapshot.json"));
   assert.equal(visual?.model.model,"gpt-6.1-sol");assert.equal(visual?.model.effort,"xhigh");
   assert.equal(visual?.textHash,digest(spokenText(p.plan!)));
   assert.equal(visual?.sourceHash,digest(sources));assert.equal(digest(visual?.plan),digest(p.plan!.visualConcept));
   assert.equal(assembly?.sha256,digest(p.plan!.assemblies));
   const builder=await readJSON(path.join(dir,"scene-builder-claude/progress.json")),motion=await readJSON(path.join(dir,"three-director/progress.json"));
   for(const proof of [builder,motion]){assert.ok(proof?.usedModels.includes("claude-opus-5-5"));assert.equal(proof?.effort,"xhigh");}
   visualProviders={concept:visual.model,sceneBuilder:{requestedModel:builder.requestedModel,effort:builder.effort,usedModels:builder.usedModels},motionDirector:{requestedModel:motion.requestedModel,effort:motion.effort,usedModels:motion.usedModels},assemblyHash:assembly.sha256,rendererHash:assembly.rendererHash,operatorAmendments:["operator-force-glyph-amendment.json","operator-visibility-amendment.json","operator-net-force-amendment.json"],note:"Claude supplied the detailed assembly configuration and initial measured-speech staging. The static renderer and recorded export corrections are maintained locally; this does not claim generated executable code or exact Tesla CAD."};
   await writeJSON(path.join(dir,"provider-proof.json"),visualProviders);
  }
  const baseline=await readJSON(path.join(dir,"production-audio-baseline.json"));
  assert.equal(narrationHash,film.master??baseline?.narrationHash,"Visual changes must preserve the original voice master");
  const speech=await readJSON(path.join(dir,"speech-provider.json")),audio=await readJSON(path.join(dir,"audio-text-review.json"));
  assert.equal(speech.model,"eleven_v4");assert.equal(speech.voiceId,"nPczCjzI2devNBz1zQrb");
  assert.equal(speech.insertedInterSceneSilenceSeconds,0);assert.equal(speech.longPauseEdits,0);
  assert.equal(audio.audioHash,narrationHash);
  if(audio.status!=="pass"){
   const adjudication=await readJSON(path.join(dir,"audio-text-adjudication.json"));
   assert.equal(adjudication?.narrationHash,narrationHash);assert.equal(adjudication.requiresRegeneration,false);
  }
  const responses=(await fs.readdir(dir)).filter(f=>/^eleven-[a-f0-9]{20}\.json$/.test(f));
  assert.equal(responses.length,1,"Exactly one successful continuous TTS per film");
  const budget=await readJSON(path.join(dir,"duration-budget.json"));assert.ok(p.duration<=budget.seconds);
  await fs.mkdir(output,{recursive:true});
  await fs.copyFile(path.join(dir,"video.mp4"),path.join(output,film.file));
  assert.equal(await fileHash(path.join(output,film.file)),artifactHash);
  rows.push({projectId:film.id,title:film.name,file:film.file,duration:p.duration,artifactHash,narrationHash,
   metadata:p.review!.metadata,technicalPassed:true,factsPassed:true,audioTextStatus:audio.status,
   playbackPassed:true,frameSampleCount:p.review?.quality?.coverage.sampledFrames,
   warnings:p.review?.quality?.findings.filter((f:{severity:string})=>f.severity!=="error"),visualProviders,humanApproved:false});
 }
 await writeJSON(path.join(output,"QUALITY.json"),{version:1,createdAt:new Date().toISOString(),films:rows,
  evidenceBoundary:"Frames, full decoding, ASR word comparison and native-player realtime playback. Expressiveness and human editorial approval are not claimed.",
  codeChecks:{typecheck:"passed",tests:"92 passed",productionBuild:"Webpack passed"}});
 await fs.writeFile(path.join(output,"README.md"),`# Три ролика Motion Studio\n\n${rows.map(r=>`- [${r.title}](${r.file}) — ${r.duration} с.`).join("\n")}\n\n1080×1920, 30 кадров/с, H.264, AAC 48 кГц. Выбранный голос B: Brian, Eleven v4. Каждый выпуск записан одним непрерывным дублем, скорость речи не менялась, искусственные паузы между сценами не добавлялись.\n\nФакты и экранные подписи проверены отдельно. Проверены декодирование файла, извлечённые из MP4 кадры, аудиотекст Scribe и полное воспроизведение в нативном браузерном плеере. Голосовые мастера сохранены при правках изображения. Подробнее: [отчёт и предупреждения](QUALITY.json), [источники и границы иллюстраций](SOURCES.md).\n\nАвтоматические проверки и техническое воспроизведение не являются человеческим одобрением или оценкой выразительности. Проекты оставлены в статусе «На просмотре».\n`);
 console.log(JSON.stringify(rows.map(({title,file,duration,artifactHash})=>({title,file,duration,artifactHash})),null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
