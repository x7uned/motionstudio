/** Seed the new checkpoint from this QA's actual completed editor/repair records. */
import path from 'node:path';
import {DATA,ROOT,project,enqueue,updateProject,db} from '../src/lib/store';
import {narrativeStateKey} from '../src/lib/editorial';
import {qualityInstructions} from '../src/lib/quality-instructions';
import {readJSON,writeJSON,digest} from '../src/lib/quality';
import {narrativeSchema} from '../src/lib/quality-contract';
async function main(){
 const id='bb335a4e-7d22-400c-bc0d-da80ef6932e0',p=project(id)!,dir=path.join(DATA,'projects',id);
 if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id))throw new Error('QA is already active');
 const raw=await readJSON(path.join(dir,'narrative.json')),n=narrativeSchema.parse(raw),editor=await readJSON(path.join(dir,'editorial-audit.json')),repair=await readJSON(path.join(dir,'narrative-repair-1/answer.json')),research=await readJSON(path.join(dir,'research.json')),snapshot=qualityInstructions(ROOT,dir);
 if(!repair||editor.verdict!=='pass'||editor.inputHash!==digest(n.fullText)||raw.instructionsHash!==snapshot.sha256)throw new Error('No authenticated completed editorial checkpoint');
 await writeJSON(path.join(dir,'narrative-progress.json'),{version:2,inputHash:narrativeStateKey(p,research,snapshot.sha256),cycle:1,narrative:n,screenFeedback:'',provenance:'Recovered from actual successful narrative repair 1 and editorial report; no model response altered'});
 enqueue(id);updateProject(id,{status:'queued',stage:'Продолжаем проверенный рассказ',error:null});console.log(id);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
