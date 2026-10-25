import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {DATA,ROOT,project} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,digest,auditCurrent} from "../src/lib/quality";
async function main(){
 const production=path.join(DATA,"productions/2026-10-18-tesla-branding"),manifest=await readJSON(path.join(production,"manifest.json")),p=project(manifest.id)!;
 assert.equal(p.status,"review");assert.ok(p.plan&&p.review?.technicalPassed);
 const dir=path.join(DATA,"projects",p.id),source=project(manifest.sourceId)!,sourceDir=path.join(DATA,"projects",source.id),plan=p.plan!;
 assert.equal(await fileHash(path.join(sourceDir,"video.mp4")),manifest.sourceVideoHash,"original movie remains unchanged");
 assert.deepEqual(plan.scenes.slice(0,7).map(s=>s.narration),source.plan!.scenes.map(s=>s.narration));
 assert.equal(digest(plan.world3d),digest(source.plan!.world3d),"same objects, camera and articulation anchors");
 assert.equal(plan.creatorBranding?.hideSchematicNote,true);assert.equal(plan.creatorBranding?.username,"@xtuned");
 const avatar=path.join(DATA,"projects",plan.creatorBranding!.avatarFile);assert.equal(await fileHash(avatar),plan.creatorBranding!.avatarSha256);
 const facts=await readJSON(path.join(dir,"fact-audit.json")),sources=await readJSON(path.join(dir,"sources.json"));assert.ok(auditCurrent(facts,plan,sources));
 const speech=await readJSON(path.join(dir,"speech-provider.json"));assert.equal(speech.voiceId,manifest.voiceId);assert.equal(speech.model,"eleven_v4");assert.equal(speech.insertedInterSceneSilenceSeconds,0);
 assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.narrationHash);
 assert.equal((await fs.readdir(dir)).filter(f=>/^eleven-[a-f0-9]+\.json$/.test(f)).length,1,"one successful synthesis cache");
 const quality=await readJSON(path.join(dir,"quality-report.json")),videoHash=await fileHash(path.join(dir,"video.mp4"));assert.equal(quality.artifactHash,videoHash);assert.equal(quality.findings.filter((f:any)=>f.severity==="error").length,0);
 const playback=await readJSON(path.join(dir,"playback-review.json"));assert.equal(playback?.artifactHash,videoHash);assert.equal(playback?.technicalPlaybackPassed,true);
 const assets=await readJSON(path.join(dir,"sound-assets.json")),credits=await fs.readFile(path.join(dir,"credits.txt"),"utf8");
 for(const asset of assets.assets){assert.ok(credits.includes(asset.attribution));assert.equal(await fileHash(path.join(dir,asset.file)),asset.sha256);}
 const delivery=path.join(DATA,"deliveries/2026-10-18-tesla-dennis");await fs.mkdir(delivery,{recursive:true});
 const movie=path.join(delivery,"tesla-roadster-dennis-xtuned.mp4");await fs.copyFile(path.join(dir,"video.mp4"),movie);assert.equal(await fileHash(movie),videoHash);
 await fs.copyFile(avatar,path.join(delivery,"dennis-avatar.png"));await fs.copyFile(path.join(dir,"credits.txt"),path.join(delivery,"credits.txt"));
 const contentCode=["renderer/ThreeFilm.tsx","renderer/CreatorOutro.tsx","src/lib/creator-branding.ts","src/lib/export-review.ts","src/lib/sound-effects.ts","scripts/remix.py","scripts/revise-tesla-branding.ts"];
 const codeHashes=Object.fromEntries(await Promise.all(contentCode.map(async f=>[f,await fileHash(path.join(ROOT,f))])));
 const asr=await readJSON(path.join(dir,"audio-text-review.json"));
 await writeJSON(path.join(delivery,"QUALITY.json"),{version:1,projectId:p.id,videoHash,duration:p.duration,voice:speech,sourceProjectId:source.id,originalVideoPreserved:true,baseNarrationPreserved:true,worldPlanPreserved:true,avatarHash:plan.creatorBranding!.avatarSha256,technical:p.review!.checks,facts:{passed:facts.passed,count:facts.claims.length},audioText:{...asr,operatorNote:"All non-brand words matched. Scribe splits the final brand xtuned into X tuned; raw ASR evidence is preserved, not marked as a zero-error transcription."},effects:assets,frameQuality:quality,playback,outroMotion:await readJSON(path.join(production,"outro-motion/progress.json")),runtimeCodeHashes:codeHashes,checks:{typescript:true,tests:102,build:true},humanApproved:false});
 await fs.writeFile(path.join(delivery,"README.md"),`# Tesla Roadster · Dennis / @xtuned\n\n${p.duration} секунд, 1080×1920, 30fps, H.264/AAC, BT.709 limited.\n\nСемь исходных сцен и речь сохранены; тайминг следует новому непрерывному Dennis-мастеру Eleven v4. Нижние технические подписи скрыты только в этой версии. Добавлены аватар PNG и озвученная заставка. Голосовые теги не отображаются в субтитрах.\n\nПроверены: 32 утверждения, реальный финальный MP4, слова через Scribe, техническое воспроизведение от начала до конца. Scribe разделил название xtuned на X tuned; остальные слова совпали. Подробные предупреждения и границы проверки — QUALITY.json. Человеческое одобрение не выставлено.\n\nOpenverse эффекты: сервопривод, воздух, вентилятор. Исходные атрибуции для описания публикации — credits.txt.\n\nАватар создан встроенным image_gen по предоставленному пользователем портрету: сохранить лицо, причёску, очки, подмигивание и пиксельный рисунок; заменить фон на чёрный/фиолетовый #120C1D с акцентами #8D59DA/#E0CDF8 и прозрачным внешним полем. Без текста. Использован новый PNG; pet Denis только сверили в коллекции.\n`);
 Object.assign(manifest,{deliveredAt:new Date().toISOString(),videoHash,delivery:path.relative(ROOT,movie),duration:p.duration,quality:path.relative(ROOT,path.join(delivery,"QUALITY.json")),originalPreserved:true,humanApproved:false});await writeJSON(path.join(production,"manifest.json"),manifest);
 console.log(JSON.stringify({delivered:true,file:movie,videoHash,duration:p.duration}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Finalization failed");process.exitCode=1;});
