// Still frames of the falling-cat objects on a host project's clock (picture only, no TTS, no model calls).
// Usage: node --import tsx scripts/preview-cat-gallery.ts <hostProjectId> <outDir> [times]
import fs from "node:fs/promises";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {renderStill,selectComposition} from "@remotion/renderer";
import {CHROME} from "../src/lib/provider";
import {ROOT,DATA,project} from "../src/lib/store";
import type {IllustratedPlan} from "../src/lib/illustrated";

const A=(scene:number,progress=0)=>({scene,progress,cue:""});
const obj=(id:string,kind:any,x:number,y:number,scale:number,value:number)=>({id,kind,x,y,scale,label:"",aim:"",rows:1,cols:2,enter:A(1),exit:null,active:value?[{at:A(1),value}]:[],moves:[]});
function gallery():IllustratedPlan{
 const phases=[0,.1,.3,.45,.7,1];
 return {version:1,concept:"Cat gallery",floorY:1500,
  objects:[...phases.map((v,i)=>obj(`cat${i}`,"cat",500+(i%3)*620,520+Math.floor(i/3)*560,1,v)),
   obj("strip","chrono-strip",1100,1660,1,1),obj("ear","inner-ear",2350,700,1,1),obj("stool","spin-stool",2350,1250,1,1)],
  flows:[],callouts:[],camera:[{at:A(1),x:1400,y:1050,zoom:.4},{at:A(1,.4),x:1120,y:800,zoom:.62},{at:A(1,.7),x:2350,y:980,zoom:1.1},{at:A(2,.5),x:1120,y:800,zoom:.62}],
  mode:[{at:A(2),value:"xray"}],bigWords:[],notes:[]};
}
async function main(){
 const id=process.argv[2],out=process.argv[3];
 const p=project(id);if(!p?.plan)throw new Error("Нет проекта.");
 const dir=path.join(DATA,"projects",id),alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
 const plan={...p.plan,filmKind:"illustrated" as const,illustrated:gallery()};
 await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer","index.tsx"),publicDir:path.join(DATA,"projects"),symlinkPublicDir:true});
 const inputProps={plan,profile:p.profile,format:p.format,alignment};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME});
 for(const t of (process.argv[4]??"1").split(",").map(Number)){const file=path.join(out,`t${t.toFixed(2)}.png`);await renderStill({composition,serveUrl,inputProps,frame:Math.round(t*30),output:file,browserExecutable:CHROME});console.log(file);}
}
main().catch(e=>{console.error(e instanceof Error?e.stack:e);process.exit(1);});
