// Moves a finished quality-v2 project to the illustrated/v1 renderer on its existing speech master.
// The previous MP4, storyboard and reports are archived with SHA-256; no TTS request is made.
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {DATA,project,updateProject,event,enqueue} from "../src/lib/store";
import {spokenText,writeJSON} from "../src/lib/quality";

async function main(){
 const id=process.argv[2],p=project(id);
 if(!p?.plan)throw new Error("Нет проекта со сценарием.");
 if(["queued","running"].includes(p.status))throw new Error("Проект ещё в очереди. Дождитесь окончания задачи.");
 if(p.profile.production?.version!==2||p.format!=="9:16")throw new Error("Иллюстрированный стиль подключён для вертикальных quality-v2 проектов.");
 const dir=path.join(DATA,"projects",id),voice=JSON.parse(await fs.readFile(path.join(dir,"voice-plan.json"),"utf8"));
 if(p.voice&&voice.plainText!==spokenText(p.plan))throw new Error("Текст изменился после озвучки: перерисовка невозможна без новой речи.");
 const stamp=new Date().toISOString().replace(/[:.]/g,"-"),archive=path.join(dir,"versions",`${stamp}-${p.plan.filmKind??"explainer"}`);
 await fs.mkdir(archive,{recursive:true});const files:Record<string,string>={};
 for(const name of ["video.mp4","storyboard.json","review.json","quality-report.json","sound-cues.json","contact-sheet.jpg"]){
  const from=path.join(dir,name);try{await fs.copyFile(from,path.join(archive,name));files[name]=createHash("sha256").update(await fs.readFile(from)).digest("hex");}catch(e:any){if(e.code!=="ENOENT")throw e;}
 }
 await writeJSON(path.join(archive,"manifest.json"),{archivedAt:new Date().toISOString(),reason:"Editor requested the illustrated/v1 style; speech master reused.",filmKind:p.plan.filmKind??"explainer",files});
 const plan={...p.plan,filmKind:"illustrated" as const};delete (plan as any).illustrated;
 updateProject(id,{plan,status:"queued",stage:"В очереди"});await writeJSON(path.join(dir,"storyboard.json"),plan);
 event(id,`Новый стиль illustrated/v1 по просьбе редактора. Прежний ролик сохранён в versions/${path.basename(archive)}. Речь и мастер не меняются.`);
 enqueue(id,"picture-only");
 console.log(JSON.stringify({archive,files:Object.keys(files)}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exit(1);});
