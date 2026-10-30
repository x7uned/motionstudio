// Renders still frames of an illustrated/v1 plan for visual inspection. No TTS, no model calls.
import fs from "node:fs/promises";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {bundleLive} from "../src/lib/remotion-bundle";
import {renderStill,selectComposition} from "@remotion/renderer";
import {CHROME} from "../src/lib/provider";
import {ROOT,DATA,project} from "../src/lib/store";
import {validateIllustrated,type IllustratedPlan} from "../src/lib/illustrated";

const A=(scene:number,progress=0,cue="")=>({scene,progress,cue});
function gallery():IllustratedPlan{
 const kinds:[string,any,number,number,number][]=[["lamp-wall","lamp-wall",700,640,.8],["lava","lava-lamp",1400,700,1],["cam","camera",1800,710,1],["mon","monitor",2300,750,1],["srv","server",2800,730,1],
  ["grid","pixel-grid",700,1500,1],["press","hash-press",1250,1480,1],["mix","mixer",1750,1530,1],["seed","seed",2150,1550,1],["gen","generator",2600,1490,1],
  ["stream","number-stream",900,2120,1],["key","key",1500,2120,1],["web","browser",2050,2080,1],["lock","padlock",2550,2090,1],["sign","cloud-sign",3050,2090,1],["guy","person",3300,1500,1]];
 return {version:1,concept:"Галерея каталога",floorY:2300,
  objects:kinds.map(([id,kind,x,y,scale])=>({id,kind,x,y,scale,label:kind==="cloud-sign"?"Cloudflare":"",aim:kind==="camera"?"lava":"",rows:2,cols:5,enter:A(1),exit:null,active:[{at:A(1,.05),value:1}],moves:[]})),
  flows:[{from:"press",to:"mix",tone:"number",style:"solid",enter:A(1),exit:null},{from:"mix",to:"seed",tone:"info",style:"dotted",enter:A(1),exit:null}],
  callouts:[{target:"lava",text:"Лава течёт",tone:"info",side:"top",enter:A(1),exit:null},{target:"web",text:"Ваше соединение",tone:"ok",side:"bottom",enter:A(1),exit:null}],
  camera:[{at:A(1),x:1900,y:1400,zoom:.36},{at:A(2),x:1400,y:760,zoom:1.35},{at:A(3),x:1900,y:1500,zoom:.75}],
  mode:[{at:A(3),value:"xray"}],bigWords:[{text:"Хаос",enter:A(4),exit:A(5)}],notes:[]};
}
async function main(){
 const id=process.argv[2],out=process.argv[3]??path.join(DATA,"previews","illustrated");
 const p=project(id);if(!p?.plan)throw new Error("Нет проекта.");
 const dir=path.join(DATA,"projects",id),alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
 const planFile=process.argv[4];
 const illustrated=planFile?JSON.parse(await fs.readFile(planFile,"utf8")):gallery();
 const plan={...p.plan,filmKind:"illustrated" as const,illustrated};
 if(planFile)validateIllustrated(illustrated,plan,alignment);
 await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundleLive({entryPoint:path.join(ROOT,"renderer","index.tsx"),publicDir:path.join(DATA,"projects")});
 const inputProps={plan,profile:p.profile,format:p.format,alignment};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME});
 const times=(process.argv[5]??"0.6,2,6.2,11,20").split(",").map(Number);
 for(const t of times){const file=path.join(out,`t${t.toFixed(1)}.png`);await renderStill({composition,serveUrl,inputProps,frame:Math.min(composition.durationInFrames-1,Math.round(t*30)),output:file,browserExecutable:CHROME});console.log(file);}
}
main().catch(e=>{console.error(e instanceof Error?e.stack:e);process.exit(1);});
