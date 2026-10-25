import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type {Project} from "./store";
import {ROOT} from "./store";
import {sceneClock,type Storyboard} from "./model";
import {resolveBeatAt} from "./research-model";
import {anchorTime} from "./scene3d";
import {run,FFMPEG} from "./provider";
import {timeline as illustratedTimeline} from "./illustrated";
import {isoWorld,isoTimeline,isoEventTimes,isoStoryEvents,cameraAt as isoCameraAt} from "./isometric";
import type {MusicBedCue} from "./music-beds";
import {contentAsk} from "./content-agent";
import {AgentParkedError} from "./agent-provider";
import {contentAgentFor,languageDirective,frameReviewSchema,qualityReportSchema,QUALITY_VERSION,type qualityFindingSchema} from "./quality-contract";
import {digest,fileHash,readJSON,writeJSON,editorialInput,withoutOutro} from "./quality";
import {roleInstructions} from "./editorial";
import {z} from "zod";
import {effectForCue,type SoundCue} from "./sound-effects";
import {SOUND_PREFERENCES,preferredSound,spaceSoundEffects} from "./sound-preferences";
import {assemblySoundCues} from "./scene-sound";
import {outroAnchors,outroSoundTimes,outroBrandHeard} from "./xtuned-outro";
import {illustratedLayout} from "./illustrated-layout";
import {safeZones,ocrZoneViolations,zoneFindings,zoneReviewNote,type SafeZones,type ZoneViolation} from "./safe-zones";
import {planZoneReport} from "./safe-zones-plan";
type Finding=z.infer<typeof qualityFindingSchema>;

export function reviewFrames(plan:Storyboard,alignment:any[]){
 const clock=sceneClock(plan),end=clock.at(-1)!.startFrame+clock.at(-1)!.frames,frames=new Set<number>([0,end-1]);
 const eventTimes:number[]=[];
 for(let f=0;f<end;f+=30)frames.add(f);
 const event=(time:number)=>{eventTimes.push(time);const f=Math.round(time*30);for(const d of [-2,-1,0,1,2,15])if(f+d>=0&&f+d<end)frames.add(f+d);};
 for(const s of clock){event(s.start);frames.add(Math.min(end-1,s.startFrame+Math.round(s.frames*.9)));for(const b of s.beats||[])event(s.start+resolveBeatAt(b,s.start,alignment[clock.indexOf(s)]?.words));}
 if(plan.world3d){for(const o of plan.world3d.objects){event(anchorTime(o.enter,clock,alignment));if(o.exit)event(anchorTime(o.exit,clock,alignment));for(const k of o.keys)event(anchorTime(k.at,clock,alignment));for(const keys of Object.values(o.articulation||{}))if(keys)for(const [i,k] of keys.entries()){event(anchorTime(k.at,clock,alignment));if(i)event((anchorTime(keys[i-1].at,clock,alignment)+anchorTime(k.at,clock,alignment))/2);}}for(const k of plan.world3d.camera)event(anchorTime(k.at,clock,alignment));}
 if(plan.netcode){for(const e of plan.netcode.events)event(anchorTime(e.at,clock,alignment));for(const c of plan.netcode.camera)event(anchorTime(c.at,clock,alignment));}
 if(plan.isometric){const tl=isoTimeline(plan.isometric,isoWorld(plan.isometric),plan.scenes,alignment);for(const t of isoEventTimes(tl))event(t);}
 return {frames:[...frames].sort((a,b)=>a-b),eventTimes,end};
}
/** Detect a one-frame excursion that returns to the same image; normal continuous motion differs. */
export function temporalFindings(raw:Uint8Array,pixels:number,eventTimes:number[],fps=30):Finding[]{
 const count=Math.floor(raw.length/pixels),findings:Finding[]=[];
 const mad=(a:number,b:number)=>{let sum=0;for(let p=0;p<pixels;p++)sum+=Math.abs(raw[a*pixels+p]-raw[b*pixels+p]);return sum/pixels;};
 for(let i=1;i<count-1;i++){
  const before=mad(i-1,i),after=mad(i,i+1),returning=mad(i-1,i+1);
  if(Math.min(before,after)>5&&returning<Math.min(before,after)*.22)findings.push({kind:"continuity",start:(i-1)/fps,end:(i+1)/fps,severity:"warning",detail:"Однокадровый выброс изображения с возвратом. Проверьте мигание или пропавший слой."});
  if(i%fps===0&&eventTimes.some(t=>Math.abs(t-i/fps)<.1)&&i+Math.floor(fps/2)<count&&mad(i,i+Math.floor(fps/2))<.02)findings.push({kind:"continuity",start:i/fps,end:(i+Math.floor(fps/2))/fps,severity:"warning",detail:"Изображение неподвижно около запланированного события. Это может быть намеренная выдержка; сопоставьте с планом."});
  if(findings.length>=30)break;
 }return findings;
}
/** The reviewer sees the film's own plan; the brand outro is described separately so it is judged as designed. */
function outroReviewNote(plan:Storyboard){
 const o=plan.creatorOutro,s=o?sceneClock(plan).find(x=>x.id===o.sceneId):undefined;if(!o||!s)return "";
 return ` С ${s.start.toFixed(2)} с до конца — фирменная заставка ${o.username} поверх ролика (утверждена автором): фон, вопрос «${o.question}», плашка ${o.username}, пиксельный персонаж, кнопка «${o.button}» → «${o.done} ✓», курсор. Схема ролика под ней намеренно замирает и скрывается за фоном заставки; это не ошибка непрерывности и не пропажа объекта. Проверяй в заставке только читаемость, safe-zone текста и плавность.`;
}
/** A project with a chosen music bed (docs/background-music.md) gets cue sheet v9, an arranged (v3) bed v10;
 *  without one the sheet stays v8 byte for byte. Where the arranged music plays its own story accent, the generic
 *  highlight blip at that moment is dropped so the two never double (the user's approved demo). */
export function soundCues(plan:Storyboard,alignment:any[],outroSounds?:{click:boolean;success:boolean},musicBed?:MusicBedCue){
 const clock=sceneClock(plan),all:SoundCue[]=[];
 for(const [i,s] of clock.entries())for(const b of s.beats||[])all.push({at:s.start+resolveBeatAt(b,s.start,alignment[i]?.words),gain:b.action==="highlight"?.007:.012,kind:b.action});
 if(plan.world3d)for(const o of plan.world3d.objects){all.push({at:anchorTime(o.enter,clock,alignment),gain:.01,kind:"object-enter"});if(o.exit)all.push({at:anchorTime(o.exit,clock,alignment),gain:.01,kind:"object-exit"});}
 all.push(...assemblySoundCues(plan,alignment));
 if(plan.illustrated){const tl=illustratedTimeline(plan.illustrated,clock,alignment);
  for(const o of tl.objects)if(o.enterAt>.1)all.push({at:o.enterAt,gain:.01,kind:"object-enter"});
  for(const c of tl.callouts)all.push({at:c.enterAt,gain:.007,kind:"highlight"});
  for(const f of tl.flows)all.push({at:f.enterAt,gain:.008,kind:"connect"});
  for(let i=1;i<tl.camera.length;i++){const a=tl.camera[i-1].pose,b=tl.camera[i].pose;if(Math.hypot(a.x-b.x,a.y-b.y)>500||Math.abs(a.zoom-b.zoom)>.45)all.push({at:tl.camera[i].at,gain:.006,kind:"camera-move",effect:"soft-whoosh"});}}
 if(plan.netcode)for(const e of plan.netcode.events)if(!["move","hookRun","outro"].includes(e.kind))all.push({at:anchorTime(e.at,clock,alignment),gain:.012,kind:e.kind});
 // isometric/v1: a route draws with the connect sound, markers enter with the reveal, tags/state changes highlight;
 // a long camera travel gets the quiet whoosh. The shared spacing rules below drop redundant cues.
 if(plan.isometric){const tl=isoTimeline(plan.isometric,isoWorld(plan.isometric),plan.scenes,alignment);
  for(const e of isoStoryEvents(tl))if(e.at>.1)all.push(e.kind==="route"||e.kind==="link"?{at:e.at,gain:.008,kind:"connect"}:e.kind==="marker"?{at:e.at,gain:.01,kind:"object-enter"}:{at:e.at,gain:.007,kind:"highlight"});
  for(let i=1;i<tl.camera.length;i++){const a=isoCameraAt(tl.camera[i].at-.01,tl.camera),b=tl.camera[i].pose;if(Math.hypot(a.x-b.x,a.z-b.z)>8||Math.abs(a.zoom-b.zoom)>10)all.push({at:tl.camera[i].at,gain:.006,kind:"camera-move",effect:"soft-whoosh"});}}
 if(plan.creatorBranding){const outro=clock.find(s=>s.id===plan.creatorBranding!.outro.sceneId);if(outro)all.push({at:outro.start,gain:.008,kind:"outro-transition",effect:"soft-whoosh",durationSeconds:Math.min(plan.creatorBranding.outro.motion.fadeSeconds,outro.seconds),durationMode:"stretch"},{at:outro.start+.7,gain:.007,kind:"highlight"});}
 if(plan.creatorOutro){const i=clock.findIndex(s=>s.id===plan.creatorOutro!.sceneId);if(i>=0){const s=clock[i],a=outroAnchors(plan.creatorOutro,s.start,s.end,alignment[i]?.words),at=outroSoundTimes(a);
  // The film's own cues end where the outro takes over the frame; only outro accents play under it.
  all.splice(0,all.length,...all.filter(c=>c.at<s.start-.05));
  all.push({at:at.whoosh,gain:.008,kind:"outro-transition",effect:"soft-whoosh",durationSeconds:Math.min(.8,s.seconds),durationMode:"stretch"});
  if(outroSounds?.click)all.push({at:at.click,gain:.008,kind:"outro-click",effect:"pixel-click"});
  if(outroSounds?.success)all.push({at:at.success,gain:.008,kind:"outro-success",effect:"chiptune-arpeggio"});}}
 // Keep signature/outro and fan cues when several visual changes share an anchor.
 const priority=(c:typeof all[number])=>c.kind.startsWith("outro-")?5:c.kind==="assembly-fan"?4:c.kind.startsWith("assembly-")||["shot","hit","peekShot","rollback"].includes(c.kind)?3:c.kind==="highlight"?2:1;
 const cues:typeof all=[];for(const cue of all.sort((a,b)=>a.at-b.at))if(cue.at>.1||cue.durationSeconds){const rounded={...cue,at:Math.round(cue.at*30)/30};if(!cues.length||(cue.kind.startsWith("outro-")&&cues.at(-1)!.kind.startsWith("outro-")&&cue.kind!==cues.at(-1)!.kind)||((cue.durationSeconds||cues.at(-1)?.durationSeconds)&&((cue.durationSeconds&&cues.at(-1)?.durationSeconds)||rounded.at-cues.at(-1)!.at>=1/30-1e-8)&&preferredSound(cue.kind,cue.effect)!==preferredSound(cues.at(-1)!.kind,cues.at(-1)!.effect))||rounded.at-cues.at(-1)!.at>=SOUND_PREFERENCES.minimumGapSeconds-1e-8)cues.push(rounded);else if(priority(cue)>priority(cues.at(-1)!))cues[cues.length-1]=rounded;}
 const accents=musicBed?.arrangement?.accents??[],sounding=accents.length?cues.filter(c=>!(c.kind==="highlight"&&accents.some(m=>Math.abs(m.at-c.at)<=.35))):cues;
 return {version:musicBed?(musicBed.arrangement?10:9):8,clock:"measured speech; 30 fps",backgroundGain:musicBed?0:SOUND_PREFERENCES.backgroundGain,soundPreferences:SOUND_PREFERENCES,...(musicBed?{musicBed}:{}),cues:spaceSoundEffects(sounding.map(c=>{const effect=preferredSound(c.kind,c.effect||effectForCue(c.kind)),[targetRmsDbFS,peakDbFS]=effect==="soft-whoosh"?[-22,-9]:effect==="fan-start"?[-27,-12]:effect==="ui-highlight"?[-25,-11]:effect==="chiptune-arpeggio"?[-26,-12]:[-30,-15];return {...c,effect,targetRmsDbFS,peakDbFS,fadeInSeconds:c.durationSeconds?Math.min(.15,c.durationSeconds*.15):SOUND_PREFERENCES.fadeInSeconds,fadeOutSeconds:c.durationSeconds?Math.min(effect==="fan-start"?.9:.4,c.durationSeconds*.3):SOUND_PREFERENCES.fadeOutSeconds[effect],levelScale:SOUND_PREFERENCES.effectLevelScale*(effect==="fan-start"?SOUND_PREFERENCES.fanLevelScale:effect==="soft-whoosh"?SOUND_PREFERENCES.whooshLevelScale:1)};}))};
}
const ocrBuilds=new Map<string,Promise<unknown>>();
async function ocrFrames(dir:string,images:{file:string;at:number}[]){
 try{
  const source=path.join(ROOT,"scripts/ocr-frames.swift"),hash=(await fileHash(source)).slice(0,16),binary=path.join(ROOT,".runtime",`vision-ocr-${hash}`);
  await fs.mkdir(path.join(ROOT,".runtime/swift-module-cache"),{recursive:true});
  // Parallel reviews share one compile of the OCR helper (written once, never by two swiftc at the same time).
  if(!await fs.access(binary).then(()=>true).catch(()=>false))await (ocrBuilds.get(binary)??ocrBuilds.set(binary,run("/usr/bin/xcrun",["swiftc",source,"-O","-module-cache-path",path.join(ROOT,".runtime/swift-module-cache"),"-o",binary],{timeout:180000}).finally(()=>ocrBuilds.delete(binary))).get(binary));
  await writeJSON(path.join(dir,"ocr-input.json"),images);await run(binary,[path.join(dir,"ocr-input.json"),path.join(dir,"ocr-results.json")],{timeout:300000});
  return {available:true,results:await readJSON(path.join(dir,"ocr-results.json"))||[],sampledFrames:images.length};
 }catch(e){return {available:false,results:[],sampledFrames:0,error:e instanceof Error?e.message.slice(0,500):"OCR недоступен"};}
}
/**
 * Runs frame-review parts. parallel=false keeps the old order (one part after another: one CLI process at a time).
 * parallel=true starts every part at once; the first park/abort error stops the siblings and is rethrown after all settle.
 */
export async function reviewParts<T>(parts:number[],parallel:boolean,signal:AbortSignal,part:(start:number,signal:AbortSignal)=>Promise<T>):Promise<T[]>{
 if(!parallel){const out:T[]=[];for(const start of parts)out.push(await part(start,signal));return out;}
 const local=new AbortController(),relay=()=>local.abort();
 if(signal.aborted)local.abort();else signal.addEventListener("abort",relay,{once:true});
 let failed=false,first:unknown;
 try{
  const settled=await Promise.allSettled(parts.map(start=>part(start,local.signal).catch(e=>{if(!failed){failed=true;first=e;}local.abort();throw e;})));
  if(failed)throw first;
  return settled.map(r=>(r as PromiseFulfilledResult<T>).value);
 }finally{signal.removeEventListener("abort",relay);}
}
/** Loop seam on the exported file: mean absolute luma difference last→first frame against neighbouring frames, and the
 *  audio jump last→first sample against the typical step. Not a playback test: the user checks the loop themselves. */
export async function loopSeamCheck(video:string,frames:number,dir:string,signal:AbortSignal){
 const raw=path.join(dir,"loop-seam.gray"),pcm=path.join(dir,"loop-seam.s16");
 const picks=[0,1,frames-2,frames-1];
 await run(FFMPEG,["-y","-v","error","-i",video,"-vf",`select='${picks.map(f=>`eq(n\\,${f})`).join("+")}',scale=270:480,format=gray`,"-vsync","0","-f","rawvideo",raw],{signal,timeout:120000});
 await run(FFMPEG,["-y","-v","error","-i",video,"-map","0:a:0","-ac","1","-ar","48000","-f","s16le",pcm],{signal,timeout:120000});
 const img=await fs.readFile(raw),size=270*480,frame=(i:number)=>img.subarray(i*size,(i+1)*size);
 const mad=(a:Buffer,b:Buffer)=>{let n=0;for(let i=0;i<size;i++)n+=Math.abs(a[i]-b[i]);return n/size;};
 const seam=mad(frame(3),frame(0)),near=Math.max(mad(frame(1),frame(0)),mad(frame(3),frame(2)));
 const audio=await fs.readFile(pcm),count=audio.length>>1,at=(i:number)=>audio.readInt16LE(2*i)/32768;
 let step=0;for(let i=1;i<count;i++)step+=Math.abs(at(i)-at(i-1));step/=Math.max(1,count-1);
 const jump=Math.abs(at(count-1)-at(0));
 await Promise.all([fs.rm(raw,{force:true}),fs.rm(pcm,{force:true})]);
 const ok=img.length>=4*size&&seam<=Math.max(2*near,1.5)&&jump<=Math.max(6*step,.02);
 return {label:"Петля: стык",ok,detail:`Кадр: последний → первый ${seam.toFixed(2)} (соседние кадры ${near.toFixed(2)}). Звук: скачок ${jump.toFixed(4)} (обычный шаг ${step.toFixed(4)}). Петлю целиком проверяет пользователь.`};
}
export async function reviewExport(p:Project,dir:string,signal:AbortSignal,options:{reuseVisual?:{video:string;artifactHash:string;qualityDir:string;inputHash:string}}={}){
 if(!p.plan)throw new Error("Нет плана готового ролика.");
 const video=path.join(dir,"video.mp4"),artifactHash=await fileHash(video),inputHash=digest({plan:p.plan,profile:p.profile,format:p.format});
 const alignment=await readJSON(path.join(dir,"alignment.json"))||[];
 const requested=(await readJSON(path.join(dir,"duration-budget.json")))?.seconds??p.duration;
 const clock=sceneClock(p.plan),sampling=reviewFrames(p.plan,alignment),portrait=p.format==="9:16",width=portrait?1080:1920,height=portrait?1920:1080;
 const reviewDir=path.join(dir,"quality",artifactHash.slice(0,16));await fs.mkdir(reviewDir,{recursive:true});
 const decoded=await run(FFMPEG,["-hide_banner","-nostats","-xerror","-i",video,"-af","loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json","-progress","pipe:1","-f","null","-"],{signal,timeout:240000,combined:true,maxOutput:2_000_000});
 const initial=decoded.split("Stream mapping:")[0],durationMatch=/Duration: (\d+):(\d+):([\d.]+)/.exec(initial),size=/Video: h264[^\n]*? (\d+)x(\d+)[, ]/.exec(initial);
 const loud=JSON.parse(decoded.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]||"{}");
 const metadata={width:Number(size?.[1]),height:Number(size?.[2]),duration:durationMatch?Number(durationMatch[1])*3600+Number(durationMatch[2])*60+Number(durationMatch[3]):0,frames:Number([...decoded.matchAll(/frame=(\d+)/g)].at(-1)?.[1]||0),lufs:Number(loud.input_i),truePeak:Number(loud.input_tp)};
 const checks=[{label:"Полное декодирование MP4",ok:true,detail:"Аудио и видео прочитаны до последнего кадра."},{label:"Формат и длительность",ok:metadata.width===width&&metadata.height===height&&metadata.frames===sampling.end&&Math.abs(metadata.duration-clock.at(-1)!.end)<.15&&metadata.duration<=requested+.001,detail:`${metadata.width}×${metadata.height}, ${metadata.duration}с, ${metadata.frames}кадров /30fps.`},{label:"Экспорт для соцсетей",ok:/Video: h264[^\n]*yuv420p\(tv, bt709/.test(initial)&&/Audio: aac[^\n]*48000 Hz, stereo/.test(initial),detail:"H.264 · yuv420p · BT.709 limited · AAC48kHz."},{label:"Громкость звука",ok:metadata.lufs>=-18&&metadata.lufs<=-14&&metadata.truePeak<=-1,detail:`${metadata.lufs}LUFS · ${metadata.truePeak}dBTP.`},{label:"Озвучка внутри сцен",ok:!p.voice||(alignment.length===clock.length&&alignment.every((a:any)=>a.end<=a.sceneEnd+1/30&&a.speed<=1.20001)),detail:"Границы по измеренной речи; главы не являются точками монтажа аудио."}];
 // Loop ending (2026-10-22): the seam is measured on the final MP4 — last frame against the first, last sample against the first.
 if(p.plan.loopEnding&&metadata.frames>3)checks.push(await loopSeamCheck(video,metadata.frames,reviewDir,signal));
 const selection=sampling.frames.filter(f=>f<metadata.frames);
 const frameManifest=selection.map((frame,i)=>({frame,at:frame/30,file:path.join(reviewDir,`frame-${String(i+1).padStart(6,"0")}.jpg`)}));
 await run(FFMPEG,["-y","-v","error","-i",video,"-vf",`select='${selection.map(f=>`eq(n\\,${f})`).join("+")}',scale=${portrait?540:960}:${portrait?960:540}`,"-vsync","0","-q:v","2",path.join(reviewDir,"frame-%06d.jpg")],{signal,timeout:240000});
 await writeJSON(path.join(reviewDir,"frames.json"),{artifactHash,frames:frameManifest});
 let visualReuse:{sourceArtifactHash:string;videoStreamHash:string;identicalFrames:number}|undefined;
 if(options.reuseVisual){
  const previous=options.reuseVisual;
  if(previous.inputHash!==inputHash||await fileHash(previous.video)!==previous.artifactHash)throw new Error("Исходный отчёт/файл визуального ревью изменён.");
  const packetHash=async(file:string)=>(await run(FFMPEG,["-v","error","-i",file,"-map","0:v:0","-c:v","copy","-f","hash","-hash","sha256","-"],{signal,timeout:90000})).trim();
  const [oldStream,newStream]=await Promise.all([packetHash(previous.video),packetHash(video)]);
  if(oldStream!==newStream||!newStream.startsWith("SHA256="))throw new Error("Звуковая правка изменила видеопоток.");
  const before=await readJSON(path.join(previous.qualityDir,"frames.json"));
  if(before?.artifactHash!==previous.artifactHash||before.frames.length!==frameManifest.length)throw new Error("Изменилась выборка кадров.");
  for(let i=0;i<frameManifest.length;i++)if(before.frames[i].frame!==frameManifest[i].frame||await fileHash(before.frames[i].file)!==await fileHash(frameManifest[i].file))throw new Error("Кадр нового MP4 отличается от проверенного оригинала.");
  visualReuse={sourceArtifactHash:previous.artifactHash,videoStreamHash:newStream.slice(7),identicalFrames:frameManifest.length};
  checks.push({label:"Видеоряд сохранён побитно",ok:true,detail:`Идентичный H.264 поток и ${frameManifest.length} кадров, извлечённых из нового MP4. Повторно используются только замечания к тем же изображениям; звук и файл проверены заново.`});
 }
 await sharp(frameManifest[0].file).jpeg({quality:90}).toFile(path.join(dir,"poster.jpg"));
 const sheets:string[]=[];
 for(let start=0;start<frameManifest.length;start+=12){const items=frameManifest.slice(start,start+12),tw=portrait?270:400,th=portrait?480:225,cols=4;
  const composites=await Promise.all(items.map(async(f,i)=>({input:await sharp(f.file).resize(tw,th).extend({bottom:26,background:"#e7edf6"}).composite([{input:Buffer.from(`<svg width="${tw}" height="26"><text x="8" y="19" font-size="16" fill="#172033">${f.at.toFixed(3)} s · f${f.frame}</text></svg>`),top:th,left:0}]).png().toBuffer(),left:(i%cols)*tw,top:Math.floor(i/cols)*(th+26)})));
  const sheet=path.join(reviewDir,`sheet-${sheets.length+1}.jpg`);await sharp({create:{width:cols*tw,height:Math.ceil(items.length/cols)*(th+26),channels:3,background:"#e7edf6"}}).composite(composites).jpeg({quality:92}).toFile(sheet);sheets.push(sheet);
 }
 await fs.copyFile(sheets[0],path.join(dir,"contact-sheet.jpg"));
 const rawFile=path.join(reviewDir,"scan.gray"),scanWidth=64,scanHeight=portrait?114:36;
 await run(FFMPEG,["-y","-v","error","-i",video,"-an","-vf",`scale=${scanWidth}:${scanHeight},format=gray`,"-f","rawvideo",rawFile],{signal,timeout:180000});
 const temporal=temporalFindings(await fs.readFile(rawFile),scanWidth*scanHeight,sampling.eventTimes);await fs.rm(rawFile,{force:true});
 // Safe zones v1 (2026-10-25): new 9:16 projects check OCR text against video-design/safe-zones.json and also read the first
 // and last frames (hook, loop seam, final scene). Without the field the selection and the rule below stay as they were.
 const zonesVersion=portrait?p.profile.production?.safeZonesVersion:undefined;let zones:SafeZones|undefined,zonesError="";
 if(zonesVersion)try{zones=safeZones(zonesVersion,ROOT);}catch(e){zonesError=e instanceof Error?e.message:"Безопасные зоны недоступны.";}
 const ocrPicked=frameManifest.filter(f=>clock.some(s=>Math.abs(f.frame-(s.startFrame+Math.round(s.frames*.9)))<=1)||sampling.eventTimes.some(t=>Math.abs(f.at-(t+.5))<1/60)).slice(0,96);
 const ocrInput=zones?[...ocrPicked,...[frameManifest[0],frameManifest.at(-1)!].filter((f,i,a)=>!ocrPicked.includes(f)&&a.indexOf(f)===i)].sort((a,b)=>a.frame-b.frame):ocrPicked;
 const ocr=await ocrFrames(reviewDir,ocrInput),zone=illustratedLayout(p.profile.production?.portraitLayout).ocr;
 const zoneViolations:ZoneViolation[]=zones&&ocr.available?ocrZoneViolations(ocr.results,zones):[];
 const planZones=zones?(()=>{try{return planZoneReport(p.plan!,alignment,p.profile,p.format,ROOT);}catch(e){return {version:zones!.version,renderer:p.plan!.filmKind??"2d",checked:false,warnings:[],note:e instanceof Error?e.message.slice(0,300):"ошибка"};}})():null;
 if(zones)await writeJSON(path.join(reviewDir,"safe-zones.json"),{version:zones.version,date:zones.date,source:"video-design/safe-zones.json",frame:zones.frame,ocr:{available:ocr.available,checkedFrames:ocrInput.length,frames:ocrInput.map(f=>f.frame)},captionRow:"OCR lines wholly inside the captions zone are subtitles and exempt",violations:zoneViolations,plan:planZones});
 const ocrFindings:Finding[]=zones?zoneFindings(zoneViolations,p.duration):ocr.results.filter((r:any)=>r.confidence>=.7&&(portrait?(r.x*width<75.5||(r.x+r.width)*width>940.5||r.y*height<zone.top||(r.y+r.height)*height>zone.bottom):(r.x<.03||r.x+r.width>.97||r.y<.03||r.y+r.height>.97))).slice(0,30).map((r:any)=>({kind:"safe-zone",start:r.at,end:Math.min(p.duration,r.at+.1),severity:"warning",detail:`OCR: «${r.text}» выходит из проектной safe-zone. Проверьте кадр.`}));
 const rules=await roleInstructions("export-reviewer",dir)+languageDirective(p.profile,"review"),role=contentAgentFor(p.profile),modelFindings:Finding[]=[];let unavailable=false,modelChanges=false;
 const ask=contentAsk(role),plan=p.plan,parts:number[]=[];for(let start=0;start<sheets.length;start+=8)parts.push(start);
 // One part of the frame review: its own cache key and prompt (unchanged). null = this part is unavailable; park/abort propagate.
 const reviewPart=async(start:number,partSignal:AbortSignal)=>{const batch=sheets.slice(start,start+8),key=digest({artifactHash,start,rules,model:role,plan,version:QUALITY_VERSION}),cache=path.join(reviewDir,`model-${start}.json`);let review=(await readJSON(cache));
  if(review?.hash!==key&&visualReuse&&options.reuseVisual){
   const previous=await readJSON(path.join(options.reuseVisual.qualityDir,`model-${start}.json`)),expected=digest({artifactHash:options.reuseVisual.artifactHash,start,rules,model:role,plan,version:QUALITY_VERSION});
   if(previous?.hash===expected){review={hash:key,result:frameReviewSchema.parse(previous.result),provenance:{kind:"identical-video-evidence",...visualReuse}};await writeJSON(cache,review);}
  }
  try{if(review?.hash!==key){const raw=await ask(`${rules}\nФормат=${p.format}, длительность=${p.duration}. Кадры идут по времени; подпись содержит реальную секунду и номер кадра. Это часть ${Math.floor(start/8)+1} из${Math.ceil(sheets.length/8)}. У тебя только статические кадры, не звук. План видимости и словесных anchors=${JSON.stringify(withoutOutro(plan))}.${outroReviewNote(plan)} Не предлагай менять факты и речь. Дай диапазоны конкретных наблюдаемых проблем в пределах0..${p.duration}; длительность диапазона неотрицательна.${zones?zoneReviewNote(zones):""}`,zodSchema(),path.join(reviewDir,`frame-review-${start}`),batch,partSignal);review={hash:key,result:frameReviewSchema.parse(raw)};await writeJSON(cache,review);}const parsed=frameReviewSchema.parse(review.result);if(parsed.findings.some(f=>f.end<f.start||f.end>p.duration+.1))throw new Error("Некорректный таймкод ревью.");return parsed;}catch(e){if(partSignal.aborted||e instanceof AgentParkedError)throw e;return null;}
 };
 // Agent mode (2026-10-21): every part goes to the driving agent at once. Legacy Codex/Claude CLI roles keep one part at a time.
 for(const parsed of await reviewParts(parts,"provider" in role&&role.provider==="agent",signal,reviewPart)){if(!parsed){unavailable=true;continue;}modelFindings.push(...parsed.findings);modelChanges ||= parsed.verdict==="changes";}
 const findings=[...temporal,...ocrFindings,...modelFindings];
 const audioText=await readJSON(path.join(dir,"audio-text-review.json")),factAudit=await readJSON(path.join(dir,"fact-audit.json")),factSources=await readJSON(path.join(dir,"sources.json"));
 if(p.plan.creatorOutro&&p.voice){const words=Array.isArray(audioText?.words)?audioText.words.map((w:any)=>String(w.text)):[],brand=outroBrandHeard(words,p.plan.creatorOutro.brandHeard);
  checks.push({label:"Бренд в заставке",ok:words.length>0&&brand.ok,detail:words.length?`ASR в конце фразы: «${brand.heard}». ${brand.ok?"Бренд распознан.":"«${p.plan.creatorOutro.brandWord}» не распознан — прослушайте и перезапишите озвучку."}`:"Нет пословной ASR-сверки: бренд не проверен."});}
 const status=unavailable?"unavailable":modelChanges||findings.length?"changes":"pass";
 const quality={...qualityReportSchema.parse({version:2,artifactHash,inputHash,checkedAt:new Date().toISOString(),coverage:{decoded:true,sampledFrames:frameManifest.length,frameModel:!unavailable,audioText:["pass","changes"].includes(audioText?.status),humanPlayback:false,humanListening:false},findings,status}),...(visualReuse?{visualEvidenceReuse:visualReuse}:{})};
 const review={checkedAt:quality.checkedAt,checks,metadata,technicalPassed:checks.every(c=>c.ok),ai:{verdict:status,summary:unavailable?"Часть проверки кадров недоступна; нужен просмотр редактора.":modelChanges?"Есть замечания к изображению.":"Выборка итогового MP4 проверена. Нужны проигрывание и прослушивание редактором.",findings:findings.map(f=>`${f.start.toFixed(2)}–${f.end.toFixed(2)}с: ${f.detail}`)},quality:{...quality,ocr:{available:ocr.available,sampledFrames:ocr.sampledFrames},...(zonesVersion?{safeZones:zones?{version:zones.version,available:ocr.available,checkedFrames:ocrInput.length,violations:zoneViolations.length,findings:ocrFindings.length,planWarnings:planZones?.warnings.length??0,report:path.relative(ROOT,path.join(reviewDir,"safe-zones.json"))}:{version:zonesVersion,available:false,error:zonesError.slice(0,300)}}:{}),sheets:sheets.map(f=>path.relative(ROOT,f)),framesManifest:path.relative(ROOT,path.join(reviewDir,"frames.json"))},audioText,facts:factAudit?{passed:factAudit.passed,current:factAudit.inputHash===digest(editorialInput(p.plan))&&factAudit.sourceHash===digest(factSources||[])}:null,alignment,coverage:`Полное декодирование, метрики и ${frameManifest.length} кадров из готовогоMP4. OCR: ${ocr.available?ocr.sampledFrames+" кадров":"недоступен"}.${zonesVersion?` Безопасные зоны v${zonesVersion}: ${zones&&ocr.available?`${zoneViolations.length} строк текста вне главной зоны (субтитры исключены); лица, места остановки и акценты — только моделью по кадрам`:`не проверены (${zonesError||"OCR недоступен"})`}.`:""} Непрерывное движение и выразительность голоса моделью не просматривались/не прослушивались.`};
 await writeJSON(path.join(dir,"quality-report.json"),quality);await writeJSON(path.join(dir,"review.json"),review);
 return {review,repairFindings:modelFindings.filter(f=>f.severity==="error"),artifactHash};
}
function zodSchema(){return z.toJSONSchema(frameReviewSchema);}
