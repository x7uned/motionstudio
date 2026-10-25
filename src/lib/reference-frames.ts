import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {run,FFMPEG} from "./provider";
export type FramePart={id:number;start:number;end:number;frames:{file:string;at:number}[];sheet:string;detail:string[]};
export type FrameIndex={version:2;duration:number;step:number;frameCount:number;parts:FramePart[];coverage:string};
const present=(f:string)=>fs.access(f).then(()=>true,()=>false);
export async function extractReferenceFrames(dir:string,duration:number,step:.5|1,signal:AbortSignal):Promise<FrameIndex>{
 const indexFile=path.join(dir,"frames.json");
 const cached=await fs.readFile(indexFile,"utf8").then(JSON.parse).catch(()=>null);
 if(cached?.version===2&&cached.step===step&&cached.duration===duration){
  const files=cached.parts.flatMap((p:FramePart)=>[p.sheet,...p.detail,...p.frames.map(f=>f.file)]);
  if((await Promise.all(files.map((f:string)=>present(path.join(dir,f))))).every(Boolean))return cached;
 }
 const framesDir=path.join(dir,`frames-${step===.5?"500ms":"1s"}`);await fs.mkdir(framesDir,{recursive:true});
 await run(FFMPEG,["-hide_banner","-loglevel","error","-i",path.join(dir,"video.mp4"),"-vf",`fps=${1/step}:start_time=0,scale=480:-2`,"-frames:v",String(Math.ceil(duration/step)+1),"-q:v","3","-y",path.join(framesDir,"%05d.jpg")],{signal,timeout:300000});
 const files=(await fs.readdir(framesDir)).filter(f=>/^\d{5}\.jpg$/.test(f)).sort();
 if(!files.length){await run(FFMPEG,["-hide_banner","-loglevel","error","-i",path.join(dir,"video.mp4"),"-frames:v","1","-vf","scale=480:-2","-y",path.join(framesDir,"00001.jpg")],{signal,timeout:30000});files.push("00001.jpg");}
 const frames=files.map((f,i)=>({file:path.relative(dir,path.join(framesDir,f)),at:Number(Math.min(duration-.001,i*step).toFixed(3))})).filter(f=>f.at>=0);
 if(frames.length<Math.max(1,Math.floor(duration/step)-1))throw new Error("FFmpeg извлёк не все ожидаемые кадры. Разбор остановлен.");
 const parts:FramePart[]=[];
 for(let offset=0;offset<frames.length;offset+=30){
  const group=frames.slice(offset,offset+30),start=group[0].at,end=Math.min(duration,frames[offset+30]?.at??duration),id=parts.length+1;
  const sheet=`frames-part-${String(id).padStart(3,"0")}.jpg`,detail:string[]=[];
  const tiles=await Promise.all(group.map(async f=>{
   const base=await sharp(path.join(dir,f.file)).resize(270,480,{fit:"contain",background:"#0f172a"}).extend({bottom:24,top:0,left:0,right:0,background:"#0f172a"}).toBuffer();
   const svg=Buffer.from(`<svg width="270" height="24"><rect width="270" height="24" fill="#0f172a"/><text x="8" y="17" font-size="14" fill="white">${f.at.toFixed(3)} s</text></svg>`);
   return sharp(base).composite([{input:svg,left:0,top:480}]).jpeg({quality:90}).toBuffer();
  }));
  await sharp({create:{width:1350,height:Math.ceil(group.length/5)*504,channels:3,background:"#0f172a"}}).composite(tiles.map((input,i)=>({input,left:(i%5)*270,top:Math.floor(i/5)*504}))).jpeg({quality:90}).toFile(path.join(dir,sheet));
  for(const [i,frame]of [group[0],group[Math.floor(group.length/2)],group.at(-1)!].entries()){
   const file=`detail-part-${String(id).padStart(3,"0")}-${i+1}.jpg`;
   await run(FFMPEG,["-hide_banner","-loglevel","error","-ss",String(frame.at),"-i",path.join(dir,"video.mp4"),"-frames:v","1","-vf","scale=720:-2","-y",path.join(dir,file)],{signal,timeout:30000});detail.push(file);
  }
  parts.push({id,start,end,frames:group,sheet,detail});
 }
 await fs.copyFile(path.join(dir,parts[0].sheet),path.join(dir,"contact-sheet.jpg"));
 const index:FrameIndex={version:2,duration,step,frameCount:frames.length,parts,coverage:`Все ${frames.length} извлечённых кадров с шагом ${step} с разделены на ${parts.length} последовательных фрагментов. Это дискретный визуальный разбор, без восстановления исходного 3D-проекта и без прослушивания моделью.`};
 await fs.writeFile(`${indexFile}.tmp`,JSON.stringify(index,null,2));await fs.rename(`${indexFile}.tmp`,indexFile);return index;
}
