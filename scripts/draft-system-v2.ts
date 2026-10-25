import fs from 'node:fs/promises';import path from 'node:path';
import {bundle} from '@remotion/bundler';import {selectComposition,renderMedia} from '@remotion/renderer';
import {project,DATA,ROOT} from '../src/lib/store';import {CHROME} from '../src/lib/provider';
async function main(){
 const id=process.argv[2],p=project(id)!,dir=path.join(DATA,'projects',id);
 const props={plan:p.plan!,profile:p.profile,format:p.format,audio:`${id}/audio.wav`,alignment:JSON.parse(await fs.readFile(path.join(dir,'alignment.json'),'utf8'))};
 const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/index.tsx'),publicDir:path.join(DATA,'projects')});
 const composition=await selectComposition({serveUrl,id:'StudioFilm',inputProps:props,browserExecutable:CHROME});
 let progress=0;
 await renderMedia({serveUrl,composition,inputProps:props,codec:'h264',scale:.5,crf:23,concurrency:3,browserExecutable:CHROME,outputLocation:path.join(dir,'draft.mp4'),onProgress:p=>{const n=Math.floor(p.progress*10);if(n>progress){progress=n;console.log(`Draft ${n*10}%`);}}});
 console.log(path.join(dir,'draft.mp4'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
