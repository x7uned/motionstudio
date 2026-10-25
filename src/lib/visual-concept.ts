import fs from "node:fs/promises";
import path from "node:path";
import {verifyModelSnapshot} from "./model-assets";
import {z} from "zod";
import {structured} from "./editorial";
import {contentAgentFor,languageDirective} from "./quality-contract";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {motionAgentFor} from "./content-agent";
import {digest,readJSON,writeJSON,spokenText,fileHash} from "./quality";
import {ROOT,type Project} from "./store";
import type {Storyboard} from "./model";
import {ASSEMBLY_CATALOG,visualConceptSchema,assemblyPlanSchema,validateVisualConcept,validateAssemblyPlan,type VisualConcept} from "./visual-contract";

async function instructionSnapshot(dir:string,name:string){
 const file=path.join(dir,`${name}-instructions.md`);
 try{return await fs.readFile(file,"utf8");}catch(e:any){if(e.code!=="ENOENT")throw e;}
 const text=await fs.readFile(path.join(ROOT,"video-design",`${name}.md`),"utf8");
 try{await fs.writeFile(file,text,{flag:"wx"});}catch(e:any){if(e.code!=="EEXIST")throw e;return fs.readFile(file,"utf8");}
 return text;
}

export async function prepareVisualConcept(p:Project,dir:string,signal:AbortSignal):Promise<VisualConcept|null>{
 if(!p.plan||p.profile.production?.visualDesignVersion!==1)return null;
 const role=contentAgentFor(p.profile);
 const rules=await instructionSnapshot(dir,"visual-concept");
 const research=await readJSON(path.join(dir,"research.json")),sources=await readJSON(path.join(dir,"sources.json"));
 const models=verifyModelSnapshot(dir);
 const input={brand:await readJSON(path.join(ROOT,"video-design/brand.json")),style:{background:p.profile.background,foreground:p.profile.foreground,accent:p.profile.accent,username:p.profile.username},referenceObservations:await readJSON(path.join(dir,"visual-reference-observations.json")),models:models.map(({id,name,rights})=>({id,name,rights})),text:spokenText(p.plan),scenes:p.plan.scenes.map(({id,title,subtitle,narration,sourceFactIds})=>({id,title,subtitle,narration,sourceFactIds})),
  renderer:p.profile.renderMode,objectsAvailable:ASSEMBLY_CATALOG,research,sourceHash:digest(sources),sources:sources?.map(({id,title,url}:any)=>({id,title,url})),rules,model:role,...(languageDirective(p.profile)?{language:"en"}:{})};
 const inputHash=digest(input),cached=await readJSON(path.join(dir,"visual-concept.json"));
 const validate=(raw:unknown)=>{const value=validateVisualConcept(raw,p.plan!.scenes.length,research.facts.map((f:any)=>f.id),p.plan!.scenes.map(s=>s.narration));
  for(const o of value.objects)if(o.representation==="uploaded-model"&&!models.some(m=>m.id===o.assetId))throw new Error("Для концепции не подготовлена выбранная 3D-модель.");
  return value;};
 if(cached?.inputHash===inputHash)return validate(cached.plan);
 let plan:VisualConcept|undefined,feedback="";
 for(let attempt=0;attempt<2;attempt++){
  const raw=await structured(`${rules}${languageDirective(p.profile)}\nINPUT=${JSON.stringify(input)}${feedback}`,visualConceptSchema,path.join(dir,attempt?"visual-concept-repair":"visual-concept-agent"),signal,undefined,role);
  try{plan=validate(raw);break;}catch(e){if(attempt)throw e;feedback=`\nИсправь контракт без новых фактов: ${e instanceof Error?e.message:"ошибка"}. Previous=${JSON.stringify(raw)}`;}
 }
 if(!plan)throw new Error("Визуальная концепция не подготовлена.");
 if(p.profile.renderMode&&plan.renderer!==p.profile.renderMode)throw new Error("Концепция не может менять явно выбранный рендерер.");
 await writeJSON(path.join(dir,"visual-concept.json"),{version:1,inputHash,textHash:digest(spokenText(p.plan)),sourceHash:digest(sources),model:role,createdAt:new Date().toISOString(),plan});
 return plan;
}

export async function prepareDetailedAssets(p:Project,visual:VisualConcept,dir:string,signal:AbortSignal):Promise<Storyboard>{
 if(!p.plan)throw new Error("Нет сценария.");
 if(visual.renderer!=="three"||!visual.objects.some(o=>o.representation==="detailed-assembly"))return {...p.plan,visualConcept:visual};
 const rules=await instructionSnapshot(dir,"scene-builder"),motion=motionAgentFor(p.profile);
 const rendererSemantics={
  "sports-car":{nozzleCount:"2–4: only rear nozzles, exhaust -X. 5–8: adds 1–4 downward nozzles, exhaust -Y. 9–10: also adds side control nozzles. A concept explaining upward reaction to downward gas needs at least 8, never only 4 rear nozzles.",
   channels:{cutaway:"Raises and fades the whole body/canopy; also fades the chassis floor to expose fans. Local floor-only cutaway is not supported; use the same continuous whole-body reveal.",thrust:"Power of rear exhaust only",lift:"Power of downward exhaust only, NOT physical height. Motion director changes object position.y for an illustrative lift.",fan:"Power of the separate downforce fans; wheels is a wheel angle in radians."},
   geometry:"The catalog car already includes rear LED strip, cabin seats, wheel brakes, suspension and two underfloor fans. Keep one assembly; do not create separate replacement cars."},
  evidenceBoundary:"The scene builder receives visual requirements, not the complete source corpus. Missing evidence here is not proof that the independently verified narration is unsupported. Describe missing geometry honestly and preserve source attribution.",
 };
 const input={visual,catalog:ASSEMBLY_CATALOG,rendererSemantics,rules,model:motion,...(languageDirective(p.profile)?{language:"en"}:{})},inputHash=digest(input),cached=await readJSON(path.join(dir,"assembly-plan.json"));
 let plan;
 if(cached?.inputHash===inputHash)plan=validateAssemblyPlan(cached.plan,visual);
 else{
  let feedback="";
  for(let attempt=0;attempt<2;attempt++){
   const raw=await askClaudeJSON(`${rules}${languageDirective(p.profile,"motion")}\nINPUT=${JSON.stringify(input)}${feedback}`,z.toJSONSchema(assemblyPlanSchema),path.join(dir,attempt?"scene-builder-repair":"scene-builder-claude"),[],signal,MOTION_AGENT);
   try{plan=validateAssemblyPlan(raw,visual);break;}catch(e){if(attempt)throw e;feedback=`\nИсправь поддержанные детали и id: ${e instanceof Error?e.message:"ошибка"}. Previous=${JSON.stringify(raw)}`;}
  }
  if(!plan)throw new Error("Детальная сборка не подготовлена.");
  await writeJSON(path.join(dir,"assembly-plan.json"),{version:1,inputHash,plan,model:motion,createdAt:new Date().toISOString()});
 }
 const rendererFiles=Object.fromEntries(await Promise.all(["renderer/DetailedMachines.tsx","renderer/ThreeFilm.tsx","renderer/Explainer.tsx","src/lib/assembly-geometry.ts","src/lib/scene3d.ts","src/lib/word-cues.ts","video-design/brand.json","package-lock.json"].map(async name=>[name,await fileHash(path.join(ROOT,name))])));
 const snapshot={version:1,sha256:digest(plan),catalogVersion:"detailed-machines/1",catalogHash:digest(ASSEMBLY_CATALOG),rendererFiles,rendererHash:digest(rendererFiles),model:motion};
 await writeJSON(path.join(dir,"assembly-snapshots",`${digest(snapshot)}.json`),snapshot);
 await writeJSON(path.join(dir,"assembly-snapshot.json"),snapshot);
 const result={...p.plan,visualConcept:visual,assemblies:plan};
 if(digest(p.plan.visualConcept??null)!==digest(visual)||digest(p.plan.assemblies??null)!==digest(plan))delete result.world3d;
 return result;
}
