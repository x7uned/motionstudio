import path from "node:path";
import {randomInt} from "node:crypto";
import {z} from "zod";
import type {Project} from "./store";
import {digest,readJSON,writeJSON,spokenText,plain} from "./quality";
import {projectLanguage} from "./quality-contract";

export const scriptRubric=["Ясность основной мысли","Причинные связи","Естественность русского на слух","Завершённость объяснения","Точность и сохранение оговорок"];
export function publicComparison(saved:any,currentText:string,language:string="ru"){
 if(!saved||saved.currentHash!==digest(currentText))return null;
 return {id:saved.id,status:saved.status,rubric:language==="en"?scriptRubric.map(r=>r==="Естественность русского на слух"?"Естественность английского на слух":r):scriptRubric,candidates:saved.order.map((index:number,choice:number)=>({choice,label:`Текст ${String.fromCharCode(65+choice)}`,text:saved.versions[index].text})),...(saved.status==="selected"?{selection:saved.selection,origins:saved.order.map((index:number)=>saved.versions[index].origin)}:{})};
}
export async function prepareScriptComparison(p:Project,dir:string){
 if(!p.plan)throw new Error("Сначала нужен сохранённый рассказ.");
 const current=spokenText(p.plan),writer=await readJSON(path.join(dir,"narrative-writer/answer.json"));
 if(!writer?.fullText||plain(writer.fullText)===current)throw new Error("Для слепого сравнения нужны две различающиеся версии одной истории: исходный рассказ и текущая редакция.");
 const versions=[{origin:"Первый цельный рассказ до редактора",text:plain(writer.fullText),source:"narrative-writer/answer.json"},{origin:"Текущая авторская редакция",text:current,source:"storyboard.json"}];
 const id=digest(versions),prior=await readJSON(path.join(dir,"script-comparison.json"));
 if(prior?.id===id)return publicComparison(prior,current,projectLanguage(p.profile));
 const saved={version:2,id,status:"ready",currentHash:digest(current),versions,order:randomInt(2)?[0,1]:[1,0],createdAt:new Date().toISOString()};
 await writeJSON(path.join(dir,"script-comparisons",`${id}.json`),saved);await writeJSON(path.join(dir,"script-comparison.json"),saved);return publicComparison(saved,current,projectLanguage(p.profile));
}
const selectionSchema=z.object({id:z.string().length(64),winner:z.union([z.literal(0),z.literal(1),z.literal("tie")]),scores:z.array(z.array(z.number().int().min(1).max(5).nullable()).length(5)).length(2),comment:z.string().trim().max(2000)});
export async function selectScriptComparison(p:Project,dir:string,input:unknown){
 const selection=selectionSchema.parse(input),saved=await readJSON(path.join(dir,"script-comparison.json"));
 if(!p.plan||!saved||saved.id!==selection.id||saved.status!=="ready"||saved.currentHash!==digest(spokenText(p.plan)))throw new Error("Сравнение устарело или уже завершено. Подготовьте его заново для текущего текста.");
 const next={...saved,status:"selected",selection,selectedAt:new Date().toISOString(),selectedBy:"explicit editor action"};
 await writeJSON(path.join(dir,"script-comparisons",`${saved.id}.json`),next);await writeJSON(path.join(dir,"script-comparison.json"),next);return publicComparison(next,spokenText(p.plan),projectLanguage(p.profile));
}
