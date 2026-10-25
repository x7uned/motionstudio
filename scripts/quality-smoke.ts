/** Real queue fixtures. Copies only named media/source artifacts; never changes reference projects. */
import fs from "node:fs/promises";
import path from "node:path";
import {ROOT,DATA,db,createProject,project,projects} from "../src/lib/store";
import {readJSON,writeJSON} from "../src/lib/quality";
async function main(){
const manifest=path.join(DATA,"quality-validation/run.json");
if(await readJSON(manifest)){console.log(JSON.stringify(await readJSON(manifest),null,2));process.exit(0);}
if(db().prepare("SELECT id FROM jobs WHERE status IN ('queued','running')").get())throw new Error("Дождитесь пустой очереди.");
const cases:any[]=[];
async function clone(sourceId:string,name:string,voice:boolean){
 const source=project(sourceId);if(!source?.plan)throw new Error(`Missing source ${sourceId}`);
 const id=createProject({topic:`[QA качества] ${name}. Технический повтор сохранённого сценария, не новое исследование.`,duration:source.duration,format:source.format,voice,initialPlan:source.plan,renderMode:source.profile.renderMode||"2d"});
 // Snapshot the reference profile verbatim. This exercises the renderer/MP4-review path, not new research.
 db().prepare("UPDATE projects SET profile=?,title=? WHERE id=?").run(JSON.stringify(source.profile),`[QA] ${name}`,id);
 const from=path.join(DATA,"projects",sourceId),to=path.join(DATA,"projects",id);await fs.mkdir(to,{recursive:true});
 for(const file of await fs.readdir(from))if(["models","models.json","model-layout.json","assets"].includes(file)||/^(eleven-[a-f0-9]+\.(json|mp3)|alignment\.json|sources\.json|research\.json|duration-budget\.json)$/.test(file))await fs.cp(path.join(from,file),path.join(to,file),{recursive:true});
 await writeJSON(path.join(to,"storyboard.json"),source.plan);
 cases.push({id,kind:name,sourceId,coverage:"real create→render→MP4 review; saved storyboard",voice});return id;
}
await clone("0c86d07b-6c8f-4b05-82d8-d3dd011fa452","3D — 30с",false);
await clone("4488485f-92f9-4aa0-acef-5087edb67632","Netcode — сохранённый голос",true);
const history=projects().find(p=>p.plan?.filmKind==="telephone-history"&&p.duration>=140);
if(history)await clone(history.id,"История — 150с",false);
const fresh=createProject({topic:"Как браузерный HTTP-кэш избегает повторной передачи неизменившейся картинки. Русское объяснение на одном примере: открываем страницу с логотипом повторно. Объясни разницу свежего сохранённого ответа и проверки актуальности через ETag/304, не обещай полного отсутствия сетевых запросов. Без выдуманных чисел. Нужны первоисточники и цельный причинный рассказ, без рекламного финала.",duration:30,format:"9:16",voice:false,renderMode:"2d"});
cases.push({id:fresh,kind:"2D quality v2 — новая тема",coverage:"real search→narrative→editor→fact checker→Claude→render→MP4 review",voice:false});
await writeJSON(manifest,{version:2,createdAt:new Date().toISOString(),cases,voiceAudition:"not started; requires cost-confirmed editor action",humanApproval:false});
console.log(JSON.stringify({cases},null,2));

}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
