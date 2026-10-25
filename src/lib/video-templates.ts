import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {z} from "zod";
import {profileSchema,type StyleProfile} from "./model";
import {voiceProfileSchema} from "./quality-contract";

// Built-in templates keep their pinned versions and order. Other templates are discovered in data/templates/<id>/v<N>
// (saved from approved projects); "id@vN" selects a version explicitly, a bare id the highest one.
export const BUILTIN_TEMPLATES={"tech-story":1,"model-breakdown":1,"illustrated-scene":2} as const;
const TEMPLATE_ID=/^[a-z][a-z0-9-]{0,39}$/;
export const videoTemplateIdSchema=z.string().regex(/^[a-z][a-z0-9-]{0,39}(@v[1-9]\d{0,3})?$/,"Шаблон: id или id@vN.");
export function resolveTemplateRef(ref:string,root=process.cwd()){
 const m=/^([a-z][a-z0-9-]{0,39})(?:@v([1-9]\d{0,3}))?$/.exec(ref);if(!m)throw Error(`Некорректный шаблон «${ref}».`);
 const id=m[1];
 if(m[2])return {id,version:Number(m[2])};
 if(id in BUILTIN_TEMPLATES)return {id,version:BUILTIN_TEMPLATES[id as keyof typeof BUILTIN_TEMPLATES] as number};
 const found=templateVersions(id,root);if(!found.length)throw Error(`Шаблон «${id}» не найден.`);
 return {id,version:found.at(-1)!};
}
export function templateVersions(id:string,root=process.cwd()){
 const dir=path.join(root,"data/templates",id);
 try{return fs.readdirSync(dir).map(v=>/^v([1-9]\d{0,3})$/.exec(v)).filter(Boolean).map(m=>Number(m![1])).filter(v=>fs.existsSync(path.join(dir,`v${v}`,"template.json"))).sort((a,b)=>a-b);}catch{return [];}
}
export const TEMPLATE_FILES=["template.json","brand.json","settings.json","README.md","DESIGN.md","CONTENT.md","MOTION.md","VOICE.md","WORKFLOW.md","CHECKLIST.md"] as const;
const manifestSchema=z.object({
 id:z.string().regex(TEMPLATE_ID),version:z.number().int().positive(),name:z.string().min(1).max(80),description:z.string().max(500),
 defaults:z.object({duration:z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(150)]),format:z.enum(["9:16","16:9"]),voice:z.boolean(),language:z.enum(["ru","en"]).optional(),factCheck:z.enum(["strict","lenient","off"]).optional()}),
 runtime:z.union([
  z.object({renderMode:z.literal("three"),visualDesignVersion:z.literal(1),backgroundSelection:z.literal("approved-random"),voiceProfile:voiceProfileSchema}),
  // illustrated/v1: prepared low-poly 2D world; the film kind is applied after the measured speech exists.
  // v2 adds the @xtuned subscribe outro and the header avatar (asset inside the template version, checked by SHA-256).
  z.object({renderMode:z.literal("2d"),filmKind:z.literal("illustrated"),visualDesignVersion:z.literal(1),backgroundSelection:z.literal("approved-random"),voiceProfile:voiceProfileSchema.optional(),
   creatorOutro:z.literal("xtuned-outro/v1").optional(),headerAvatar:z.object({file:z.string().regex(/^assets\/[a-z0-9-]+\.png$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).optional()}),
  // Templates saved from approved projects (agent mode, 2026-10-19): the project's render settings, last in the union.
  // isometric (2026-10-21): the «Изометрия» city renderer; a version saved from an approved isometric project.
  z.object({renderMode:z.enum(["2d","three"]),filmKind:z.enum(["illustrated","isometric"]).optional(),visualDesignVersion:z.literal(1),backgroundSelection:z.literal("approved-random"),voiceProfile:voiceProfileSchema.optional(),
   creatorOutro:z.literal("xtuned-outro/v1").optional(),headerAvatar:z.object({file:z.string().regex(/^assets\/[a-z0-9-]+\.png$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).optional()}),
 ]).optional(),
 reference:z.union([
  z.object({projectId:z.string().uuid(),title:z.string(),duration:z.number().positive(),videoSha256:z.string().regex(/^[a-f0-9]{64}$/)}),
  // Style samples (user decision 2026-10-20): the reference film is a style-lab render, not a studio project.
  z.object({styleLab:z.string().regex(/^[a-z0-9-]{1,40}$/),title:z.string(),duration:z.number().positive(),videoSha256:z.string().regex(/^[a-f0-9]{64}$/)}),
 ]),
 // A saved style sample: rules, reference film and a source snapshot. Its renderer is not connected to the
 // pipeline yet, so projects cannot be created from it until the user asks to implement it.
 styleSample:z.object({renderer:z.string().regex(/^renderer\/style-lab\/[a-z0-9-]{1,40}$/),connected:z.literal(false)}).optional(),
 profile:profileSchema.pick({template:true,font:true,hookRules:true,writingRules:true,visualRules:true,avoid:true,examples:true}),
});
/** Style samples whose look is now implemented as a prepared production renderer (film kind). The saved sample
 *  versions stay byte-identical and still refuse projects; the film kind is chosen explicitly instead. */
export const IMPLEMENTED_STYLE_SAMPLES:Record<string,"isometric">={"renderer/style-lab/iso-city":"isometric"};
/** The channel's header avatar (illustrated-scene/v2 asset, shared by every brand) for film kinds without a template. */
export const CHANNEL_AVATAR_TEMPLATE="illustrated-scene@v2";
const color=z.string().regex(/^#[a-fA-F0-9]{6}$/);
const brandSchema=z.object({colors:z.object({background:color,text:color,purple:color}).catchall(color)});
export type TemplateSelection=NonNullable<StyleProfile["productionTemplate"]>;
const hash=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex");
function fingerprint(files:Record<string,string>){return hash(TEMPLATE_FILES.map(f=>`${f}\0${files[f]}\0`).join(""));}
export function loadVideoTemplate(input:unknown,root=process.cwd()){
 const {id,version}=resolveTemplateRef(videoTemplateIdSchema.parse(input),root);
 const relative=`data/templates/${id}/v${version}`,dir=path.join(root,relative);
 const files=Object.fromEntries(TEMPLATE_FILES.map(f=>[f,fs.readFileSync(path.join(dir,f),"utf8")]));
 const manifest=manifestSchema.parse(JSON.parse(files["template.json"]));
 if(manifest.id!==id||manifest.version!==version)throw Error("Версия шаблона не совпадает с каталогом.");
 const brand=brandSchema.parse(JSON.parse(files["brand.json"]));JSON.parse(files["settings.json"]);
 return {manifest,brand,files,dir,relative,sha256:fingerprint(files)};
}
export function listVideoTemplates(root=process.cwd()){
 let others:string[]=[];
 try{others=fs.readdirSync(path.join(root,"data/templates")).filter(id=>TEMPLATE_ID.test(id)&&!(id in BUILTIN_TEMPLATES)).sort();}catch{}
 const ids=[...Object.keys(BUILTIN_TEMPLATES).filter(id=>fs.existsSync(path.join(root,`data/templates/${id}/v${BUILTIN_TEMPLATES[id as keyof typeof BUILTIN_TEMPLATES]}/template.json`))),...others.filter(id=>templateVersions(id,root).length)];
 return ids.flatMap(id=>{
  // One malformed saved template must not hide the others or break the studio UI.
  try{const t=loadVideoTemplate(id,root);
   return [{id,name:t.manifest.name,version:t.manifest.version,description:t.manifest.description,defaults:t.manifest.defaults,...(t.manifest.runtime?{runtime:t.manifest.runtime}:{}),...(t.manifest.styleSample?{styleSample:t.manifest.styleSample}:{}),sha256:t.sha256,basePath:t.relative,reference:t.manifest.reference}];}
  catch(e){console.error(`Шаблон ${id} пропущен: ${e instanceof Error?e.message:e}`);return [];}
 });
}
export function templateProfile(base:StyleProfile,t:ReturnType<typeof loadVideoTemplate>):StyleProfile{
 return profileSchema.parse({...base,...t.manifest.profile,name:t.manifest.name,description:t.manifest.description,username:base.username??"@xtuned",background:t.brand.colors.background,foreground:t.brand.colors.text,accent:t.brand.colors.purple,productionTemplate:{id:t.manifest.id,version:t.manifest.version,sha256:t.sha256}});
}
/** Copy the template's header avatar into the project (branding/avatar.png) after verifying its SHA-256. */
export function snapshotTemplateAvatar(t:ReturnType<typeof loadVideoTemplate>,projectDir:string,projectId:string){
 const runtime=t.manifest.runtime;if(!runtime||!("headerAvatar" in runtime)||!runtime.headerAvatar)return undefined;
 const data=fs.readFileSync(path.join(t.dir,runtime.headerAvatar.file));
 if(hash(data)!==runtime.headerAvatar.sha256)throw Error("Аватар шаблона не совпадает с SHA-256.");
 fs.mkdirSync(path.join(projectDir,"branding"),{recursive:true});fs.writeFileSync(path.join(projectDir,"branding","avatar.png"),data);
 return {file:`${projectId}/branding/avatar.png`,sha256:runtime.headerAvatar.sha256};
}
export function snapshotVideoTemplate(t:ReturnType<typeof loadVideoTemplate>,projectDir:string){
 const dest=path.join(projectDir,"template");fs.mkdirSync(dest,{recursive:true});
 for(const name of TEMPLATE_FILES)fs.writeFileSync(path.join(dest,name),t.files[name]);
 const metadata={id:t.manifest.id,name:t.manifest.name,version:t.manifest.version,sha256:t.sha256,files:TEMPLATE_FILES.map(name=>({name,sha256:hash(t.files[name])}))};
 fs.writeFileSync(path.join(projectDir,"template-snapshot.json"),JSON.stringify(metadata,null,2));
 return metadata;
}
export function templateInstructions(projectDir:string,selection:StyleProfile["productionTemplate"]){
 if(!selection)return "";
 const files=Object.fromEntries(TEMPLATE_FILES.map(f=>[f,fs.readFileSync(path.join(projectDir,"template",f),"utf8")]));
 const manifest=manifestSchema.parse(JSON.parse(files["template.json"]));
 if(manifest.id!==selection.id||manifest.version!==selection.version||fingerprint(files)!==selection.sha256)throw Error("Снимок шаблона повреждён или изменён. Восстановите инструкции проекта перед производством.");
 return `СОХРАНЁННЫЙ ШАБЛОН ${manifest.name}, v${manifest.version}. Это требования к сценарию и постановке, не факты по новой теме. Ассеты и специальные сцены эталона нельзя считать уже подготовленными для новой темы. Не придумывай наличие файлов.\n`+TEMPLATE_FILES.map(name=>`<TEMPLATE_FILE name="${name}">\n${files[name]}\n</TEMPLATE_FILE>`).join("\n");
}
