import {z} from "zod";
import {mediaRecommendationSchema} from "./media-contract";

export const visualConceptSchema=z.object({
 version:z.literal(1),idea:z.string().min(30).max(1400),
 renderer:z.enum(["2d","three"]),hero:z.string().min(3).max(120),
 visualLanguage:z.string().min(20).max(800),
 objects:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),name:z.string().max(80),purpose:z.string().max(400),
  representation:z.enum(["detailed-assembly","uploaded-model","diagram","supporting-primitive"]),
  assemblyKind:z.enum(["sports-car","pressure-system","electric-drive"]).optional(),assetId:z.string().max(80).optional(),
  requiredDetails:z.array(z.string().max(120)).min(1).max(12),factIds:z.array(z.string().max(24)).max(10)})).min(1).max(12),
 scenes:z.array(z.object({scene:z.number().int().min(1).max(24),understanding:z.string().min(10).max(400),
  show:z.string().min(20).max(700),change:z.string().min(10).max(500),objectIds:z.array(z.string().max(40)).min(1).max(12),
  cutaway:z.boolean(),labels:z.array(z.string().max(36)).max(4)})).min(4).max(24),
 limitations:z.array(z.string().max(400)).max(12),
 /** Real logos / people photos worth a small tile (user decision 2026-10-21); every subject is named in the narration. */
 media:z.array(mediaRecommendationSchema).max(8).optional(),
});
export type VisualConcept=z.infer<typeof visualConceptSchema>;

export const ASSEMBLY_CATALOG={
 "sports-car":{name:"Детальный спортивный автомобиль",size:[5.5,3.1,2.4],floor:0,parts:["кузовные панели","стеклянная кабина","колёса с шинами и спицами","тормозные диски и суппорты","шасси","подвеска","силовой блок","баллоны COPV","магистрали и клапаны","сопла","вентиляторы","активное антикрыло"],channels:["cutaway","thrust","lift","fan","wheels"]},
 "pressure-system":{name:"Баллоны, клапаны и сопла",size:[3.2,1.6,2.2],floor:0,parts:["композитные баллоны","вентили","коллектор","трубки","сопла","манометр"],channels:["cutaway","thrust"]},
 "electric-drive":{name:"Электрический привод в разрезе",size:[3.8,1.6,2.1],floor:0,parts:["батарейные модули","инвертор","статор","ротор","вал","редуктор","силовые кабели","корпус"],channels:["cutaway","wheels"]},
} as const;
export const assemblySpecSchema=z.object({
 id:z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),kind:z.enum(["sports-car","pressure-system","electric-drive"]),
 name:z.string().min(3).max(80),purpose:z.string().max(500),
 color:z.string().regex(/^#[\da-fA-F]{6}$/),
 system:z.enum(["compressed-air","electric-drive","both"]),
 tankCount:z.number().int().min(1).max(4),nozzleCount:z.number().int().min(2).max(10),
 requiredParts:z.array(z.string().max(80)).min(4).max(20),
 approximation:z.string().min(20).max(1000),
});
export const assemblyPlanSchema=z.object({version:z.literal(1),concept:z.string().min(20).max(1000),
 assets:z.array(assemblySpecSchema).min(1).max(6),
 limitations:z.array(z.string().max(500)).min(1).max(12),
});
export type AssemblySpec=z.infer<typeof assemblySpecSchema>;
export type AssemblyPlan=z.infer<typeof assemblyPlanSchema>;

export function validateVisualConcept(raw:unknown,sceneCount:number,factIds:string[],narrations?:readonly string[]){
 const v=visualConceptSchema.parse(raw),ids=new Set(v.objects.map(o=>o.id));
 if(ids.size!==v.objects.length||v.scenes.length!==sceneCount||v.scenes.some((s,i)=>s.scene!==i+1||s.objectIds.some(id=>!ids.has(id))))throw new Error("Визуальная концепция не совпадает со сценарием.");
 if(v.objects.some(o=>o.factIds.some(id=>!factIds.includes(id))))throw new Error("Неизвестный факт в визуальной концепции.");
 if(v.renderer==="three"&&!v.objects.some(o=>["detailed-assembly","uploaded-model"].includes(o.representation)))throw new Error("Главный 3D-предмет требует детальной сборки или модели; примитив не подходит.");
 const hero=v.objects.find(o=>o.id===v.hero);
 if(!hero||(v.renderer==="three"&&!["detailed-assembly","uploaded-model"].includes(hero.representation)))throw new Error("hero должен ссылаться на подготовленный главный предмет, а не вспомогательный примитив.");
 for(const o of v.objects){
  if(o.representation==="detailed-assembly"&&!o.assemblyKind)throw new Error("Не выбран поддержанный тип детальной сборки.");
  if(o.representation==="uploaded-model"&&!o.assetId)throw new Error("Загруженная модель должна иметь реальный assetId.");
  if(o.assemblyKind&&o.requiredDetails.some(part=>!ASSEMBLY_CATALOG[o.assemblyKind!].parts.includes(part as never)))throw new Error("Обязательная деталь не поддержана выбранной сборкой.");
 }
 if(v.media?.length&&narrations){
  const norm=(x:string)=>` ${x.toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu," ").trim()} `;
  for(const m of v.media){
   const scene=narrations[m.scene-1];if(scene===undefined)throw new Error(`Медиа «${m.subject}» ссылается на несуществующую главу ${m.scene}.`);
   if(!norm(narrations.join(" ")).includes(norm(m.subject)))throw new Error(`Медиа «${m.subject}» не названо в тексте ролика: логотип или фото — только для того, что звучит.`);
  }
 }
 return v;
}
export function validateAssemblyPlan(raw:unknown,visual:VisualConcept){
 const p=assemblyPlanSchema.parse(raw);
 if(new Set(p.assets.map(a=>a.id)).size!==p.assets.length)throw new Error("Повтор id сборки.");
 const needed=visual.objects.filter(o=>o.representation==="detailed-assembly");
 if(needed.some(o=>!p.assets.some(a=>a.id===o.id&&o.requiredDetails.every(part=>a.requiredParts.includes(part)))))throw new Error("Не подготовлен детальный главный предмет. Подмена кубом/кольцом запрещена.");
 for(const a of p.assets){if(!needed.some(o=>o.id===a.id&&o.assemblyKind===a.kind))throw new Error("Сборка не соответствует выбранному предмету концепции.");const catalog=ASSEMBLY_CATALOG[a.kind];if(a.requiredParts.some(part=>!catalog.parts.includes(part as never)))throw new Error(`Сборка ${a.id} требует неподдерживаемую деталь; нужен подготовленный renderer.`);}
 return p;
}
