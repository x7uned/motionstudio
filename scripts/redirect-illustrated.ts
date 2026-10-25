// Re-stages an illustrated/v1 project from its own final-MP4 review. Speech, master and word timings stay as they are.
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {DATA,project,updateProject,event,enqueue} from "../src/lib/store";
import {prepareIllustrated} from "../src/lib/illustrated-director";
import {spokenText,writeJSON,fileHash} from "../src/lib/quality";

async function main(){
 const id=process.argv[2],p=project(id);
 if(!p?.plan||p.plan.filmKind!=="illustrated")throw new Error("Нужен проект с иллюстрированным стилем.");
 if(["queued","running"].includes(p.status))throw new Error("Проект ещё в очереди.");
 const dir=path.join(DATA,"projects",id),review=JSON.parse(await fs.readFile(path.join(dir,"review.json"),"utf8"));
 const findings=(review.quality?.findings??[]).filter((f:any)=>!String(f.detail).startsWith("OCR:"));
 // Optional editor notes from a manual look at the final MP4 frames: [{start,end,detail}], merged with the automatic review.
 const notesFile=process.argv[3],notes=notesFile?JSON.parse(await fs.readFile(notesFile,"utf8")) as {start:number;end:number;detail:string}[]:[];
 for(const n of notes)findings.push({kind:"editor-frame-review",severity:"major",start:n.start,end:n.end,detail:n.detail});
 if(!findings.length)throw new Error("В ревью нет замечаний к постановке.");
 const audio=await fileHash(path.join(dir,"audio.wav")),speech=spokenText(p.plan);
 if(!p.plan.illustrated)throw new Error("Нет прежнего плана для правки.");
 const stamp=new Date().toISOString().replace(/[:.]/g,"-"),archive=path.join(dir,"versions",`${stamp}-illustrated`);await fs.mkdir(archive,{recursive:true});const files:Record<string,string>={};
 for(const name of ["video.mp4","storyboard.json","illustrated-plan.json","review.json","quality-report.json","sound-cues.json"]){const from=path.join(dir,name);try{await fs.copyFile(from,path.join(archive,name));files[name]=createHash("sha256").update(await fs.readFile(from)).digest("hex");}catch(e:any){if(e.code!=="ENOENT")throw e;}}
 await writeJSON(path.join(archive,"manifest.json"),{archivedAt:new Date().toISOString(),reason:"Re-staging from the final-MP4 frame review; speech master reused.",files});
 const feedback=JSON.stringify(findings.map((f:any)=>({kind:f.kind,severity:f.severity,at:`${f.start.toFixed(1)}–${f.end.toFixed(1)} с`,detail:String(f.detail).slice(0,420)}))).slice(0,14000);
 event(id,`Повторная постановка illustrated/v1 по ${findings.length} замечаниям ревью итогового MP4. Прежняя версия: versions/${path.basename(archive)}.`);
 const alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
 const plan=await prepareIllustrated({...p.plan,illustrated:undefined},dir,alignment,new AbortController().signal,undefined,feedback,p.plan.illustrated);
 if(spokenText(plan)!==speech||audio!==await fileHash(path.join(dir,"audio.wav")))throw new Error("Постановка изменила речь или аудио.");
 updateProject(id,{plan,status:"queued",stage:"В очереди"});await writeJSON(path.join(dir,"storyboard.json"),plan);
 enqueue(id,"picture-only");
 console.log(JSON.stringify({archive,findings:findings.length,objects:plan.illustrated!.objects.length}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exit(1);});
