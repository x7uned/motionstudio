/** Deterministic renderer smoke: 16:9, shared nodes, long labels, repeated cue; no model or TTS calls. */
import path from 'node:path';
import fs from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {ROOT,DATA,profile} from '../src/lib/store';
import {CHROME,FFMPEG,run} from '../src/lib/provider';
import {writeJSON} from '../src/lib/quality';
import {storyboardSchema,type Storyboard} from '../src/lib/model';
async function main(){
 const out=path.join(DATA,'quality-validation/landscape'),assets=path.join(out,'assets');await fs.mkdir(assets,{recursive:true});
 await run(FFMPEG,['-y','-v','error','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','12',path.join(assets,'silence.wav')]);
 const plan:Storyboard={title:'Сквозная схема · проверка 16:9',summary:'Условный технический пример, не научное утверждение',factNotes:'Renderer fixture',scenes:Array.from({length:4},(_,i)=>({id:`s${i+1}`,title:['Отправляем запрос','Добавляем сохранённый ответ','Повторяем запрос','Объяснение завершено'][i],subtitle:'Одна система сохраняется между смысловыми главами',narration:'Это условный пример. Ответ, затем второй ответ.',seconds:3,visual:'flow',items:['Пример'],diagram:{nodes:[{id:'client',label:'Клиентское приложение',kind:'user',row:0,col:0},{id:'server',label:'Сервер приложения',kind:'server',row:0,col:2},...(i?[{id:'cache',label:'Сохранённый ответ',kind:'cache' as const,row:1,col:1}]:[])],edges:[{id:'request',from:'client',to:'server'},...(i?[{id:'saved',from:'server',to:'cache'}]:[])]},beats:[{at:0,cue:'',action:'reveal',target:'client',description:'Клиент остаётся на месте'},{at:.2,cue:'',action:'reveal',target:'server',description:'Сервер сохраняет идентичность'},{at:.5,cue:'',action:'connect',target:'request',description:'Путь запроса'},...(i?[{at:.8,cue:'',action:'reveal' as const,target:'cache',description:'Ответ добавляется в ту же систему'},{at:1,cue:'',action:'connect' as const,target:'saved',description:'Связь остаётся'}]:[]),{at:1.9,cue:'ответ',cueOccurrence:2,action:'highlight',target:i?'cache':'server',description:'Акцент на втором упоминании ответа'}]}))};
 const alignment=plan.scenes.map((s,i)=>({scene:i+1,start:i*3+.1,end:i*3+2.6,sceneEnd:(i+1)*3,speed:1,text:s.narration,words:[{text:'Ответ,',start:i*3+.5,end:i*3+.9},{text:'ответ.',start:i*3+1.9,end:i*3+2.4}]}));
 const props={plan:storyboardSchema.parse(plan),profile:{...profile(),production:{version:2 as const,policyVersion:'quality/2.0.0'}},format:'16:9',alignment,audio:'silence.wav'};
 await writeJSON(path.join(out,'input.json'),props);const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/index.tsx'),publicDir:assets});const comp=await selectComposition({serveUrl,id:'StudioFilm',inputProps:props,browserExecutable:CHROME});
 await renderMedia({serveUrl,composition:comp,codec:'h264',inputProps:props,outputLocation:path.join(out,'render.mp4'),browserExecutable:CHROME,concurrency:2,crf:20});
 await run(FFMPEG,['-y','-v','error','-i',path.join(out,'render.mp4'),'-vf','scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-crf','20','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-ar','48000','-af','atrim=duration=12,asetpts=PTS-STARTPTS','-t','12','-shortest','-movflags','+faststart',path.join(out,'video.mp4')]);
 await run(FFMPEG,['-y','-v','error','-ss','4.5','-i',path.join(out,'video.mp4'),'-frames:v','1',path.join(out,'frame.jpg')]);
 console.log(JSON.stringify({file:path.relative(ROOT,path.join(out,'video.mp4')),frames:comp.durationInFrames,width:comp.width,height:comp.height,scope:'real deterministic render; no research, TTS or human approval'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
