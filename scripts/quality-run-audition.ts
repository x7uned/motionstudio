/** Execute only an already cost-confirmed queued audition while the renderer is occupied. */
import {db,completeJob} from '../src/lib/store';
import {runAudition,failAudition} from '../src/lib/voice-auditions';
const signal=new AbortController();process.on('SIGTERM',()=>signal.abort());process.on('SIGINT',()=>signal.abort());
async function main(){
 const job=db().prepare("UPDATE jobs SET status='running',started=? WHERE id=(SELECT id FROM jobs WHERE kind='voice-audition' AND status='queued' ORDER BY created LIMIT 1) AND status='queued' RETURNING id,project_id").get(new Date().toISOString()) as {id:string;project_id:string}|undefined;
 if(!job)throw new Error('Нет подтверждённого задания. Ничего не синтезировано.');
 try{await runAudition(job.project_id,signal.signal);completeJob(job.id,'completed');console.log(JSON.stringify({id:job.project_id,status:'ready',blindSamples:3,selected:false}));}catch(e){const message=e instanceof Error?e.message:'Ошибка генерации';await failAudition(job.project_id,message);completeJob(job.id,'failed',message);throw e;}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
