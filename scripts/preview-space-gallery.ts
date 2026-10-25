// Still frames of the space objects on a host project's clock (picture only, no TTS, no model calls).
// The host project is only read; the gallery profile can switch on the tiktok-safe header and a brand handle.
// Usage: node --import tsx scripts/preview-space-gallery.ts <hostProjectId> <outDir> <gallery> [times]
import fs from "node:fs/promises";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {renderStill,selectComposition} from "@remotion/renderer";
import {CHROME} from "../src/lib/provider";
import {ROOT,DATA,project} from "../src/lib/store";

const A=(scene:number,progress=0)=>({scene,progress,cue:""});
const obj=(id:string,kind:string,x:number,y:number,scale:number,keys:[number,number][],rows=1)=>({id,kind,x,y,scale,label:"",aim:"",rows,cols:2,enter:A(1),exit:null,active:keys.map(([at,value])=>({at:A(1,at),value})),moves:[]});
const still=(id:string,kind:string,x:number,y:number,scale:number,value:number,rows=1)=>obj(id,kind,x,y,scale,value?[[0,value]]:[],rows);
// "states": every object in its key states, side by side. "story": one moving world (sun collapse → light front → dark Earth).
const galleries:Record<string,any>={
 states:{objects:[
  still("s0","sun",400,500,.8,0),still("s1","sun",1000,500,.8,.45),still("s2","sun",1600,500,.8,1),
  still("e0","earth",400,1150,1,0),still("e1","earth",1000,1150,1,.5),still("e2","earth",1600,1150,1,1),
  still("m0","moon",2150,420,1,0),still("m1","moon",2450,420,1,1),
  still("o0","orbit",2900,900,.55,.2),still("o1","orbit",2900,1500,.55,.6),still("o2","orbit",2200,1950,.55,1),
  still("f0","light-front",3500,500,.35,.6),still("f1","light-front",3500,1100,.35,.5,2),
  still("p0","planet-row",1000,1800,1,0),still("p1","planet-row",1000,2100,1,.55),
  still("n0","night-sky",3500,1700,.8,0),still("n1","night-sky",3500,2150,.8,1),
  still("t0","thermometer",2150,1050,.8,0),still("t1","thermometer",2400,1050,.8,1),
  still("l0","leaf",2200,1500,.7,0),still("l1","leaf",2600,1500,.7,1)],
  camera:[{at:A(1),x:2000,y:1250,zoom:.5}],mode:[{at:A(2),value:"xray"}]},
 sun:{objects:[obj("sun","sun",1100,900,1.3,[[.05,.5],[.25,1]])],camera:[{at:A(1),x:1100,y:900,zoom:1}],mode:[]},
 story:{objects:[
  obj("front","light-front",1000,1000,1,[[.15,.75],[.6,1]]),
  obj("sun","sun",1000,1000,.6,[[.02,1]]),
  obj("orbit","orbit",1000,1000,1,[[0,.3],[.4,.4],[.6,.75],[.75,.85],[.85,1]]),
  obj("earth","earth",2600,900,1.3,[[.4,.5],[.7,1]]),obj("moon","moon",3100,620,.9,[[.42,1]])],
  camera:[{at:A(1),x:1000,y:1000,zoom:.6},{at:A(1,.45),x:2750,y:860,zoom:1}],mode:[{at:A(1,.8),value:"xray"}]},
 hero:{objects:[still("sun","sun",700,700,1,0),still("earth","earth",1500,700,1.2,0),still("moon","moon",1900,500,1,0),still("sky","night-sky",2600,700,1,0),still("sky2","night-sky",3500,700,1,1),still("orbit","orbit",1500,1700,.8,.2),still("orbit2","orbit",2900,1700,.8,1),still("row","planet-row",1500,2250,.9,.5)],
  camera:[{at:A(1),x:700,y:700,zoom:1.2},{at:A(1,.3),x:1600,y:650,zoom:1.3},{at:A(1,.6),x:2600,y:700,zoom:1.1},{at:A(2),x:3500,y:700,zoom:1.1},{at:A(2,.3),x:1500,y:1700,zoom:.75},{at:A(2,.6),x:2900,y:1700,zoom:.75},{at:A(3),x:1500,y:2250,zoom:1.05}],mode:[]},
 city:{objects:[still("n1","night-sky",1500,1000,1,0),obj("n2","night-sky",2500,1000,1,[[0,1]]),obj("th","thermometer",3150,1000,1,[[0,1]]),obj("leaf","leaf",900,1000,1,[[0,1]])],
  camera:[{at:A(1),x:1500,y:1000,zoom:.9},{at:A(1,.5),x:2500,y:1000,zoom:.9}],mode:[]},
};
async function main(){
 const [id,out,which,times="1"]=process.argv.slice(2);
 const p=project(id);if(!p?.plan)throw new Error("Нет проекта.");
 const g=galleries[which];if(!g)throw new Error(`Галерея: ${Object.keys(galleries).join(", ")}`);
 const dir=path.join(DATA,"projects",id),alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
 const plan={...p.plan,title:"What If the Sun Vanished for a Day?",filmKind:"illustrated" as const,illustrated:{version:1,concept:"space gallery",floorY:2300,backdrop:"space",flows:[],callouts:[],bigWords:[],notes:[],...g}};
 const profile={...p.profile,username:"@worldifthen_ai",production:{...p.profile.production!,portraitLayout:"tiktok-safe" as const}};
 await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer","index.tsx"),publicDir:path.join(DATA,"projects"),symlinkPublicDir:true});
 const inputProps={plan,profile,format:p.format,alignment};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME});
 for(const t of times.split(",").map(Number)){const file=path.join(out,`${which}-t${t.toFixed(2)}.png`);await renderStill({composition,serveUrl,inputProps,frame:Math.round(t*30),output:file,browserExecutable:CHROME});console.log(file);}
}
main().catch(e=>{console.error(e instanceof Error?e.stack:e);process.exit(1);});
