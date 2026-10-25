// Renders still frames (and optionally a silent MP4) of an isometric/v1 plan for visual inspection. No TTS, no models.
// Usage: node --import tsx scripts/preview-isometric.ts <outDir> [--project <id>] [--plan plan.json] [--times 0.5,2,6] [--video]
// Without --project the built-in sample (scripts/isometric-sample.ts) is rendered; a project is only read.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {bundle} from "@remotion/bundler";
import {renderMedia,renderStill,selectComposition} from "@remotion/renderer";
import {CHROME} from "../src/lib/provider";
import {ROOT,DATA,project} from "../src/lib/store";
import {validateIsometric} from "../src/lib/isometric";
import {COVERAGE} from "../src/lib/coverage";
import {samplePlan,sampleScenes,sampleAlignment} from "./isometric-sample";

const arg=(name:string)=>{const i=process.argv.indexOf(`--${name}`);return i>0?process.argv[i+1]:undefined;};
// --relaxed: look at stills of a plan that does not yet pass the coverage rule (sentence/still checks off; zoom and tiles stay checked).
if(process.argv.includes("--relaxed"))Object.assign(COVERAGE,{maxStill:1e9,minSentence:1e9});
// An agent task answer (answer.json) writes absent optionals as null; the studio drops them on submit, so does the preview.
const readPlan=async(file:string)=>JSON.parse(await fs.readFile(file,"utf8"),(k,v)=>["cueOccurrence","rings","tiles"].includes(k)&&v===null?undefined:v);
async function main(){
 const out=process.argv[2];if(!out||out.startsWith("--"))throw new Error("preview-isometric <outDir> [--project id] [--plan file] [--times …] [--video]");
 await fs.mkdir(out,{recursive:true});
 const id=arg("project"),planFile=arg("plan");
 let plan:any,profile:any,alignment:any[],format="9:16";
 if(id){
  const p=project(id);if(!p)throw new Error("Нет проекта.");
  // A project whose narrative was just revised has no plan yet: preview the last measured storyboard on disk.
  const base=p.plan??JSON.parse(await fs.readFile(path.join(DATA,"projects",id,"storyboard.json"),"utf8"));
  alignment=JSON.parse(await fs.readFile(path.join(DATA,"projects",id,"alignment.json"),"utf8"));
  const iso=planFile?await readPlan(planFile):base.isometric;if(!iso)throw new Error("У проекта нет изометрического плана; передайте --plan.");
  plan={...base,filmKind:"isometric",isometric:validateIsometric(iso,base,alignment,p.profile.production?.portraitLayout,p.profile.production?.overlayVersion,{coverage:p.profile.production?.coverageVersion})};profile=p.profile;format=p.format;
 }else{
  const iso=planFile?await readPlan(planFile):samplePlan();
  const scenes=sampleScenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}));
  alignment=sampleAlignment;
  plan={title:"How maps predict traffic",summary:"",factNotes:"",filmKind:"isometric",scenes,isometric:validateIsometric(iso,{title:"How maps predict traffic",scenes},alignment,"tiktok-safe",2)};
  profile={name:"Изометрия",description:"",background:"#000000",foreground:"#FFFFFF",accent:"#8D59DA",font:"Manrope",hookRules:[],writingRules:[],visualRules:[],avoid:[],examples:[],username:"@kagenami_ai",production:{version:2,policyVersion:"preview",language:"en",portraitLayout:"tiktok-safe",overlayVersion:2}};
 }
 await fs.writeFile(path.join(out,"plan.json"),JSON.stringify(plan.isometric,null,2));
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer","index.tsx"),publicDir:path.join(DATA,"projects"),symlinkPublicDir:true});
 const inputProps={plan,profile,format,alignment},chromiumOptions={gl:"angle" as const};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME,chromiumOptions});
 const total=composition.durationInFrames/30;
 const times=(arg("times")??[.1,.25,.45,.65,.8,.97].map(f=>+(f*total).toFixed(1)).join(",")).split(",").map(Number);
 const tiles:Buffer[]=[];
 for(const t of times){
  const frame=Math.min(composition.durationInFrames-1,Math.round(t*30)),file=path.join(out,`t${t.toFixed(2)}.png`);
  await renderStill({composition,serveUrl,inputProps,frame,output:file,browserExecutable:CHROME,chromiumOptions});
  const label=Buffer.from(`<svg width="360" height="44"><rect width="360" height="44" fill="#0f172a"/><text x="14" y="30" font-size="24" font-family="Helvetica" fill="white">${t.toFixed(2)} с · кадр ${frame}</text></svg>`);
  tiles.push(await sharp(file).resize(360,640).extend({bottom:44,background:"#0f172a"}).composite([{input:label,top:640,left:0}]).png().toBuffer());
  console.log(file);
 }
 const rows=Math.ceil(tiles.length/3);
 await sharp({create:{width:1080,height:rows*684,channels:3,background:"#0f172a"}}).composite(tiles.map((input,i)=>({input,left:(i%3)*360,top:Math.floor(i/3)*684}))).jpeg({quality:88}).toFile(path.join(out,"sheet.jpg"));
 console.log(path.join(out,"sheet.jpg"));
 if(process.argv.includes("--video")){
  const video=path.join(out,"preview.mp4");
  await renderMedia({composition,serveUrl,inputProps,codec:"h264",outputLocation:video,browserExecutable:CHROME,chromiumOptions,concurrency:2,crf:20,muted:true});
  console.log(video);
 }
}
main().catch(e=>{console.error(e instanceof Error?e.stack:e);process.exit(1);});
