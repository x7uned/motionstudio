import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,DATA,project,updateProject,event,db} from '../src/lib/store';
import {run,TAVILY} from '../src/lib/provider';
import {validateResearch,researchSchema} from '../src/lib/research-model';
import {preproduce} from '../src/lib/preproduction';
import {writeJSON} from '../src/lib/quality';
async function main(){
 process.loadEnvFile(path.join(ROOT,'.env.local'));
 const id='175081da-be5c-4ff1-b75b-2a14510c5d55',dir=path.join(DATA,'projects',id),signal=new AbortController().signal;
 if(!project(id)||project(id)!.plan)throw new Error('Only the held new Roadster preparation is permitted');
 const attempts=[];
 const prior=await fs.access(path.join(dir,'source-retrieval-provenance.json')).then(()=>true).catch(()=>false);
 if(!prior){
 for(const [name,args] of [
  ['search',['search','Tesla Roadster October 15 2026 compressed air thrusters flight','--max-results','4','--include-domains','tesla.com,youtube.com']],
  ['extract',['extract','https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/','https://www.grc.nasa.gov/WWW/k-12/TRC/Rockets/rocket_principles.html']],
 ] as const){try{await run(TAVILY,[...args,'--json','-o',path.join(dir,`tavily-${name}-raw.json`)],{signal,timeout:100000});attempts.push({name,ok:true});}catch(e){attempts.push({name,ok:false,error:e instanceof Error?e.message:'unavailable'});}}
 await writeJSON(path.join(dir,'source-retrieval-provenance.json'),{retrievedAt:new Date().toISOString(),attempts,primaryEvent:'Official Tesla YouTube visible transcript read in the in-app browser; not independently verified performance',physics:'NASA official HTML read directly; generic physics, not Tesla layout evidence'});
 }
 const nasa=await fs.readFile(path.join(dir,'nasa-source-1.txt'),'utf8'),at=nasa.indexOf('There is no combustion');
 const sources=[
  {id:'s1',title:'Tesla — Roadster Event, 15 October 2026, official video transcript',url:'https://www.youtube.com/watch?v=qt5p-_tE8d0',content:'Official verified Tesla channel. Published 15 October 2026. Source is the visible YouTube transcript, timestamps retained. Manufacturer presentation and demonstration; not independent verification.\n'+await fs.readFile(path.join(dir,'tesla-event-primary-transcript.txt'),'utf8')},
  {id:'s2',title:'NASA — State of the Art, In-Space Propulsion, Cold Gas (7 May 2026)',url:'https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/',content:nasa.slice(at-110,at+2900)},
  {id:'s3',title:'NASA Glenn — Rocket Principles',url:'https://www.grc.nasa.gov/WWW/k-12/TRC/Rockets/rocket_principles.html',content:await fs.readFile(path.join(dir,'nasa-source-2.txt'),'utf8')},
 ].map(s=>({...s,retrievedAt:new Date().toISOString()}));
 const existing=JSON.parse(await fs.readFile(path.join(dir,'sources.json'),'utf8').catch(()=> '[]'));
 sources.push(...existing.filter((s:any)=>!sources.some(v=>v.id===s.id)));
 await writeJSON(path.join(dir,'sources.json'),sources);
 try{const raw=JSON.parse(await fs.readFile(path.join(dir,'research-agent-repair/answer.json'),'utf8'));const checked=validateResearch(researchSchema.parse(raw),sources);await writeJSON(path.join(dir,'research.json'),checked);}catch(e){console.log('Research cache validation:',e instanceof Error?e.message:'missing');}
 const plan=await preproduce(project(id)!,dir,(stage,progress)=>{updateProject(id,{stage,progress});event(id,stage);console.log(stage);},signal);
 updateProject(id,{plan,title:plan.title,stage:'Рассказ подготовлен; ожидает новой 3D-системы',progress:18});
 db().prepare("UPDATE jobs SET status='prepared-hold' WHERE project_id=? AND status='preproduction'").run(id);
 console.log(JSON.stringify({id,prepared:true,title:plan.title}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
