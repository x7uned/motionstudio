// Side-by-side keyframes of the three effort films (rows) at the same narration beats (columns).
import sharp from "sharp";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
const HERE=decodeURIComponent(new URL(".",import.meta.url).pathname),FF="/Users/rv/Desktop/Motion Studio/bin/ffmpeg";
const beats=[[0.4,"0,4 с · хук"],[1.5,"1,5 «line»"],[3.4,"3,4 «face»"],[4.4,"4,4 «sixth»"],[6.7,"6,7 «lights up»"],[7.7,"7,7 «pumpkin»"],[9.5,"9,5 развязка"]];
const rows=["medium","high","xhigh"],tw=216,th=384,lab=30,head=34,comps=[];
for(const [i,[,name]] of beats.entries())comps.push({input:Buffer.from(`<svg width="${tw}" height="${head}"><text x="6" y="24" font-size="17" font-family="Helvetica" fill="#172033">${name}</text></svg>`),left:i*tw,top:0});
fs.mkdirSync(HERE+"sheet-tmp",{recursive:true});
for(const [r,e] of rows.entries()){const top=head+r*(th+lab);
 comps.push({input:Buffer.from(`<svg width="${tw*beats.length}" height="${lab}"><text x="6" y="22" font-size="19" font-weight="bold" font-family="Helvetica" fill="#172033">effort ${e}</text></svg>`),left:0,top});
 for(const [i,[t]] of beats.entries()){const f=`${HERE}sheet-tmp/${e}-${i}.jpg`;execFileSync(FF,["-y","-v","error","-ss",String(t),"-i",`${HERE}${e}/film/pumpkin-face-${e}.mp4`,"-frames:v","1","-vf",`scale=${tw}:${th}`,"-q:v","3",f]);comps.push({input:f,left:i*tw,top:top+lab});}}
await sharp({create:{width:tw*beats.length,height:head+rows.length*(th+lab),channels:3,background:"#e7edf6"}}).composite(comps).jpeg({quality:88}).toFile(HERE+"effort-keyframes.jpg");
fs.rmSync(HERE+"sheet-tmp",{recursive:true,force:true});console.log(HERE+"effort-keyframes.jpg");
