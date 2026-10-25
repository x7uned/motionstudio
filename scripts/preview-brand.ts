import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import sharp from 'sharp';
import {project,DATA,ROOT} from '../src/lib/store';
import {sceneClock} from '../src/lib/model';
import {CHROME} from '../src/lib/provider';
async function main(){
const id=process.argv[2],p=project(id)!;
const dir=path.join(DATA,'projects',id);
const out=path.join(ROOT,'video-design/qa',id);await fs.mkdir(out,{recursive:true});
const props={plan:p.plan!,profile:p.profile,format:p.format,alignment:JSON.parse(await fs.readFile(path.join(dir,'alignment.json'),'utf8'))};
const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/index.tsx'),publicDir:path.join(DATA,'projects')});
const composition=await selectComposition({serveUrl,id:'StudioFilm',inputProps:props,browserExecutable:CHROME});
const frames=[0,...sceneClock(p.plan!).map(s=>s.startFrame+Math.round(s.frames*.76)),1799];
for(let i=0;i<frames.length;i++)await renderStill({serveUrl,composition,inputProps:props,frame:frames[i],scale:.5,browserExecutable:CHROME,output:path.join(out,`${i}.png`)});
const inputs=await Promise.all(frames.map((_,i)=>sharp(path.join(out,`${i}.png`)).resize(270,480).toBuffer()));
await sharp({create:{width:1350,height:960,channels:3,background:'#000000'}}).composite(inputs.map((input,i)=>({input,left:(i%5)*270,top:Math.floor(i/5)*480}))).jpeg({quality:93}).toFile(path.join(out,'preview.jpg'));
console.log(path.join(out,'preview.jpg'));

}
main().catch(e=>{console.error(e);process.exitCode=1;});
