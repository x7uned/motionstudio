import {createHash} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {Storyboard} from "./model";
import {factResultSchema,type FactResult,type Narrative} from "./quality-contract";
import type {Source} from "./research-model";
import {illustratedTexts} from "./illustrated";
import {isometricTexts} from "./isometric";
import {renameRetryAsync} from "./platform";

export const digest=(value:unknown)=>createHash("sha256").update(typeof value==="string"?value:JSON.stringify(value)).digest("hex");
export const plain=(s:string)=>s.replace(/\s+/g," ").trim();
export function spokenText(plan:Storyboard){return plan.scenes.map(s=>plain(s.narration)).join(" ");}
export function writtenText(plan:Storyboard){
 const base=[plan.title,plan.summary,...plan.scenes.flatMap(s=>[s.title,s.subtitle,...s.items,...(s.diagram?.nodes.flatMap(n=>[n.label,...(n.list?.columns??[])])||[])])];
 const visual=plan.visualConcept?.scenes.flatMap(s=>s.labels)||[];
 const pins=plan.world3d?.objects.filter(o=>o.labelStyle==="pin").map(o=>o.label)||[];
 const illustrated=illustratedTexts(plan.illustrated),isometric=isometricTexts(plan.isometric);
 // New detailed films reuse pre-TTS labels. Duplicating one as a spatial pin adds no new claim.
 const extraPins=plan.visualConcept?pins.filter(label=>!base.includes(label)&&!visual.includes(label)):pins;
 return [...base,...extraPins,...(plan.netcode?Object.values(plan.netcode.labels):[]),...(plan.netcode?.ruler.flatMap(r=>[r.label,r.value])||[]),...illustrated,...isometric,...visual,...(plan.creatorBranding?[plan.creatorBranding.username,plan.creatorBranding.outro.question,plan.creatorBranding.outro.callToAction]:[])].join("\n");
}
// The fixed @xtuned outro line is brand copy, not a claim: editor and fact-check see only the film's own text.
export const withoutOutro=(plan:Storyboard):Storyboard=>plan.creatorOutro?{...plan,scenes:plan.scenes.filter(s=>s.id!==plan.creatorOutro!.sceneId)}:plan;
export function editorialInput(plan:Storyboard){const content=withoutOutro(plan);return {fullText:spokenText(content),screenText:writtenText(content)};}
export async function readJSON<T=any>(file:string):Promise<T|null>{try{return JSON.parse(await fs.readFile(file,"utf8"));}catch(e:any){if(e.code==="ENOENT"||e instanceof SyntaxError)return null;throw e;}}
export async function writeJSON(file:string,value:unknown){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=`${file}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(value,null,2));await renameRetryAsync(tmp,file);}
export async function fileHash(file:string){return createHash("sha256").update(await fs.readFile(file)).digest("hex");}
export async function instructionHash(root:string){const files=["story-editor","fact-checker","voice-director","export-reviewer"].map(n=>`.agents/skills/${n}/SKILL.md`);return digest(await Promise.all(files.map(f=>fs.readFile(/*turbopackIgnore: true*/path.join(/*turbopackIgnore: true*/root,f),"utf8"))));}
export function validateFactResult(value:unknown,claims:{id:string;span:string;claim:string;kind:string}[],sources:Source[]):FactResult{
  const result=factResultSchema.parse(value);
  if(result.claims.length!==claims.length||new Set(result.claims.map(c=>c.id)).size!==claims.length)throw new Error("Фактчекер должен проверить каждое утверждение ровно один раз.");
  for(const claim of claims){const c=result.claims.find(c=>c.id===claim.id);if(!c||c.span!==claim.span||c.claim!==claim.claim||c.kind!==claim.kind)throw new Error("Фактчекер изменил проверяемое утверждение.");
    if(c.status==="illustration"&&c.kind!=="illustration")throw new Error("Факт нельзя объявить условным примером без изменения текста.");
    if(c.status==="supported"&&!c.evidence.length)throw new Error("Подтверждённому утверждению нужно доказательство.");
    for(const e of c.evidence){const s=sources.find(s=>s.id===e.sourceId),quote=plain(e.quote),readable=(v:string)=>plain(v.replace(/`([^`\n]+)`/g,"$1"));if(!quote||!readable(e.quote))throw new Error("Цитата должна содержать текст.");const field=s?(plain(s.content).includes(quote)||readable(s.content).includes(readable(e.quote))?"content":plain(s.title)===quote?"title":plain(s.url)===quote?"url":null):null;if(!field)throw new Error("Подтверждение отсутствует в прочитанном источнике.");Object.assign(e,{sourceField:field});}
  }return result;
}
export const factsPassed=(r:FactResult,lenient=false)=>lenient?r.claims.every(c=>c.status!=="contradicted"):r.claims.every(c=>c.status==="supported"||c.status==="illustration");
export function checkNarrative(n:Narrative,plan:Storyboard){if(plain(n.fullText)!==spokenText(plan))throw new Error("Разметка сцен изменила утверждённый цельный рассказ.");}
export function auditCurrent(audit:any,plan:Storyboard,sources?:Source[]){return audit?.inputHash===digest(editorialInput(plan))&&audit?.passed===true&&(sources===undefined||audit.sourceHash===digest(sources));}
export async function acceptedExamples(root:string){const dir=path.join(root,"data/accepted-examples");const files=await fs.readdir(dir).catch(()=>[]);const entries=await Promise.all(files.filter(f=>f.endsWith(".json")).sort().reverse().slice(0,3).map(f=>readJSON(path.join(dir,f))));return entries.filter(Boolean);}
export async function saveAcceptedExample(root:string,p:{id:string;plan:Storyboard|null;feedback:string|null}){if(!p.plan)return;const input=editorialInput(p.plan),comparison=await readJSON(path.join(root,"data/projects",p.id,"script-comparison.json"));await writeJSON(path.join(root,"data/accepted-examples",`${p.id}-${digest(input).slice(0,16)}.json`),{version:2,projectId:p.id,acceptedAt:new Date().toISOString(),inputHash:digest(input),text:input.fullText,feedback:p.feedback,comparison:comparison?.status==="selected"&&comparison.currentHash===digest(input.fullText)?{id:comparison.id,selection:comparison.selection,selectedAt:comparison.selectedAt}:null,provenance:"explicit editor approval; contextual example, not model training"});}
