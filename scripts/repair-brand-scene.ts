import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {project,DATA,ROOT} from '../src/lib/store';
import {sceneClock} from '../src/lib/model';
import {CHROME,FFMPEG,run} from '../src/lib/provider';
async function main(){
 const id=process.argv[2],p=project(id)!;
 const dir=path.join(DATA,'projects',id),s=sceneClock(p.plan!)[Number(process.argv[3])];
 const props={plan:p.plan!,profile:p.profile,format:p.format,alignment:JSON.parse(await fs.readFile(path.join(dir,'alignment.json'),'utf8'))};
 const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/index.tsx'),publicDir:path.join(DATA,'projects')});
 const composition=await selectComposition({serveUrl,id:'StudioFilm',inputProps:props,browserExecutable:CHROME});
 const patch=path.join(dir,'scene-label-repair.mp4');
 await renderMedia({serveUrl,composition,inputProps:props,frameRange:[s.startFrame,s.startFrame+s.frames-1],codec:'h264',muted:true,outputLocation:patch,browserExecutable:CHROME,concurrency:3,crf:18});
 const original=path.join(dir,'video.mp4'),fixed=path.join(dir,'video-fixed.mp4');
 const filter=`[0:v]trim=end_frame=${s.startFrame},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[0:v]trim=start_frame=${s.startFrame+s.frames},setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,format=yuv420p[v]`;
 await run(FFMPEG,['-y','-v','error','-i',original,'-i',patch,'-filter_complex',filter,'-map','[v]','-map','0:a','-c:v','libx264','-profile:v','high','-preset','fast','-crf','18','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-t','60','-movflags','+faststart',fixed]);
 await fs.copyFile(original,path.join(dir,'video-before-label-spacing.mp4'));
 await fs.rename(fixed,original);
 console.log('Updated frames',s.startFrame,s.startFrame+s.frames-1);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
