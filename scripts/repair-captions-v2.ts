import fs from 'node:fs/promises';import path from 'node:path';import {bundle} from '@remotion/bundler';import {selectComposition,renderMedia} from '@remotion/renderer';import {project,DATA,ROOT,updateProject} from '../src/lib/store';import {CHROME,FFMPEG,run} from '../src/lib/provider';
async function main(){
 const id=process.argv[2],p=project(id)!,dir=path.join(DATA,'projects',id);
 const props={alignment:JSON.parse(await fs.readFile(path.join(dir,'alignment.json'),'utf8'))};
 const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/captions-index.tsx')});
 const comp=await selectComposition({serveUrl,id:'CaptionBand',inputProps:props,browserExecutable:CHROME});
 await renderMedia({serveUrl,composition:comp,inputProps:props,codec:'h264',crf:14,concurrency:4,browserExecutable:CHROME,outputLocation:path.join(dir,'captions-v2.mp4')});
 await fs.copyFile(path.join(dir,'video.mp4'),path.join(dir,'video-before-caption-contrast.mp4'));
 await run(FFMPEG,['-y','-v','error','-i',path.join(dir,'video-before-caption-contrast.mp4'),'-i',path.join(dir,'captions-v2.mp4'),'-filter_complex','[0:v][1:v]overlay=78:1284:shortest=1,format=yuv420p[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','fast','-crf','18','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-t','60','-movflags','+faststart',path.join(dir,'video.mp4')]);
 const decoded=await run(FFMPEG,['-hide_banner','-nostats','-xerror','-i',path.join(dir,'video.mp4'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-progress','pipe:1','-f','null','-'],{combined:true});
 const count=Number([...decoded.matchAll(/frame=(\d+)/g)].at(-1)?.[1]);if(count!==1800)throw new Error('Неверное число кадров');
 const stats=JSON.parse(decoded.match(/\{\s*"input_i"[\s\S]*?\}/)![0]);
 if(Number(stats.input_i)<-18||Number(stats.input_i)>-14||Number(stats.input_tp)>-1)throw new Error('Громкость вне диапазона');
 const report={...p.review,captionContrastFix:{checkedAt:new Date().toISOString(),frames:count,description:'Constant white text, continuous purple highlight. Caption-band correction uses the same renderer; original ElevenLabs audio copied bit-for-bit.',lufs:Number(stats.input_i),truePeak:Number(stats.input_tp)}};
 await fs.writeFile(path.join(dir,'review.json'),JSON.stringify(report,null,2));updateProject(id,{review:report});
 console.log(JSON.stringify({frames:count,lufs:stats.input_i,truePeak:stats.input_tp,passed:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
