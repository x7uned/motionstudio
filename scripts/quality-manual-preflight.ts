/** Preflight a queued QA's unchanged manual text; no speech/render and no text mutation. */
import path from 'node:path';
import {DATA,project} from '../src/lib/store';
import {auditManualPlan} from '../src/lib/editorial';
import {supplementSources} from '../src/lib/preproduction';
async function main(){const id='537765b6-0738-46e0-bbdb-89d736041545',p=project(id)!;const r=await auditManualPlan(p,path.join(DATA,'projects',id),new AbortController().signal,supplementSources);console.log(JSON.stringify({id,passed:r.passed,claims:r.claims.length,ttsRequests:0}));}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
