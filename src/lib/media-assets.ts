import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import os from "node:os";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";
import sharp from "sharp";
import {mediaAssetSchema,mediaKey,type MediaAsset,type MediaKind} from "./media-contract";

/**
 * Snapshots a real logo or a person's photo into a project (user decision 2026-10-21).
 * Source chain: Wikidata item found by name → its small logo (P8972) or logo (P154), or for a human (P31=Q5) its image
 * (P18) → the Wikimedia Commons file with licence metadata → a raster rendition re-encoded locally (SVG is never
 * rendered from the web). Everything is recorded in media.json and credits.txt; nothing is guessed or redrawn.
 */
const UA="MotionStudio/0.1 (local explainer-video tool; Wikidata/Commons API, low volume)";
const MAX_BYTES=8*1024*1024;
type Json=Record<string,any>;
export type MediaManifest={version:1;assets:MediaAsset[];failed:{subject:string;kind:MediaKind;reason:string;at:string}[]};

/** Wikimedia rate limits (429/503) are retried with backoff, honouring Retry-After; other errors fail at once. */
async function polite(url:URL,headers:Record<string,string>,signal?:AbortSignal){
 for(let attempt=0;;attempt++){
  const r=await fetch(url,{headers:{"User-Agent":UA,...headers},signal});
  if(r.ok)return r;
  if((r.status!==429&&r.status!==503)||attempt>=4)throw new Error(`${url.hostname}: HTTP ${r.status}`);
  const wait=Math.min(30,Number(r.headers.get("retry-after"))||2*2**attempt);
  await new Promise((done,fail)=>{const id=setTimeout(done,wait*1000);signal?.addEventListener("abort",()=>{clearTimeout(id);fail(new Error("Остановлено."));},{once:true});});
 }
}
async function getJSON(url:URL,signal?:AbortSignal):Promise<Json>{
 return (await polite(url,{Accept:"application/json"},signal)).json() as Promise<Json>;
}
const api=(host:string,params:Record<string,string>)=>{const u=new URL(`https://${host}/w/api.php`);for(const [k,v] of Object.entries({...params,format:"json",formatversion:"2"}))u.searchParams.set(k,v);return u;};
const text=(html:unknown)=>String(html??"").replace(/<[^>]*>/g," ").replace(/\bQS:\S+/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,"\"").replace(/&#0?39;/g,"'").replace(/\s+/g," ").trim();
const value=(v:any)=>typeof v==="string"?v:v?.id??"";
/** Current statement values: preferred rank first, never deprecated or ended (P582 end time). */
function claims(entity:Json,prop:string):string[]{
 const list=(entity.claims?.[prop]??[]).filter((c:any)=>c.rank!=="deprecated"&&c.mainsnak?.datavalue&&!c.qualifiers?.P582);
 const preferred=list.filter((c:any)=>c.rank==="preferred");
 return (preferred.length?preferred:list).map((c:any)=>value(c.mainsnak.datavalue.value)).filter(Boolean);
}
export async function resolveMedia(subject:string,kind:MediaKind,opts:{lang?:string;qid?:string;signal?:AbortSignal}={}){
 const lang=opts.lang==="ru"?"ru":"en";
 let ids:string[]=opts.qid?[opts.qid]:[];
 if(!ids.length){
  const found=await getJSON(api("www.wikidata.org",{action:"wbsearchentities",search:subject,language:lang,uselang:lang,type:"item",limit:"8"}),opts.signal);
  ids=(found.search??[]).map((s:any)=>s.id).filter((id:string)=>/^Q\d+$/.test(id));
 }
 if(!ids.length)throw new Error(`Wikidata не знает «${subject}».`);
 const data=await getJSON(api("www.wikidata.org",{action:"wbgetentities",ids:ids.join("|"),props:"claims|labels|descriptions",languages:`${lang}|en`}),opts.signal);
 for(const id of ids){
  const e=data.entities?.[id];if(!e||e.missing!==undefined)continue;
  const label=e.labels?.[lang]?.value??e.labels?.en?.value??subject,description=e.descriptions?.[lang]?.value??e.descriptions?.en?.value??"";
  if(kind==="person"){
   if(!claims(e,"P31").includes("Q5"))continue;
   const file=claims(e,"P18")[0];if(file)return {qid:id,label,description,property:"P18" as const,file};
  }else if(kind==="flag"){
   const file=claims(e,"P41")[0];if(file)return {qid:id,label,description,property:"P41" as const,file};
  }else{
   const small=claims(e,"P8972")[0],logo=claims(e,"P154")[0];
   if(small||logo)return {qid:id,label,description,property:small?"P8972" as const:"P154" as const,file:(small||logo)!};
  }
 }
 throw new Error(kind==="person"?`Для «${subject}» нет человека с портретом в Wikidata.`:kind==="flag"?`Для «${subject}» в Wikidata нет флага (P41).`:`Для «${subject}» в Wikidata нет логотипа.`);
}

async function fetchImage(url:string,signal?:AbortSignal){
 const u=new URL(url);if(u.protocol!=="https:"||!/(^|\.)wikimedia\.org$/.test(u.hostname))throw new Error(`Неожиданный адрес файла: ${u.hostname}`);
 const r=await polite(u,{},signal);
 const bytes=Buffer.from(await r.arrayBuffer());
 if(bytes.length>MAX_BYTES)throw new Error("Файл больше 8 МБ.");
 return bytes;
}
const run=promisify(execFile);
let faceBuild:Promise<string>|null=null;
/** On-device face rectangles (macOS Vision via scripts/face-box.swift, compiled once like the OCR helper); [] if unavailable. */
async function faces(image:Buffer):Promise<{x:number;y:number;width:number;height:number}[]>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
 if(process.platform!=="darwin")return []; // Apple Vision only; elsewhere portraits use the top-centre crop.
 try{
  faceBuild??=(async()=>{const source=path.join(root,"scripts/face-box.swift"),hash=createHash("sha256").update(await fs.readFile(source)).digest("hex").slice(0,16),binary=path.join(root,".runtime",`face-box-${hash}`);
   if(!await fs.access(binary).then(()=>true).catch(()=>false)){await fs.mkdir(path.join(root,".runtime/swift-module-cache"),{recursive:true});await run("/usr/bin/xcrun",["swiftc",source,"-O","-module-cache-path",path.join(root,".runtime/swift-module-cache"),"-o",binary],{timeout:180000});}
   return binary;})();
  const binary=await faceBuild,tmp=path.join(os.tmpdir(),`face-${process.pid}-${Date.now()}.jpg`);
  await fs.writeFile(tmp,image);
  try{const {stdout}=await run(binary,[tmp],{timeout:60000});return JSON.parse(stdout);}finally{await fs.rm(tmp,{force:true});}
 }catch{faceBuild=null;return [];}
}
/** Square crop around the largest face (face ≈ 38% of the side, a little headroom, shoulders below); top-centre square otherwise. */
export function faceCrop(width:number,height:number,list:{x:number;y:number;width:number;height:number}[]){
 const side0=Math.min(width,height),f=[...list].sort((a,b)=>b.width*b.height-a.width*a.height)[0];
 if(!f)return {left:Math.round((width-side0)/2),top:0,size:side0,face:false};
 const fw=f.width*width,fh=f.height*height,size=Math.round(Math.min(side0,Math.max(fw,fh)*2.6));
 const cx=(f.x+f.width/2)*width,cy=(f.y+f.height/2)*height+fh*.22;
 return {left:Math.round(Math.max(0,Math.min(width-size,cx-size/2))),top:Math.round(Math.max(0,Math.min(height-size,cy-size/2))),size,face:true};
}
const slug=(s:string)=>s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,28)||"item";

export async function readMediaManifest(projectDir:string):Promise<MediaManifest>{
 try{const m=JSON.parse(await fs.readFile(path.join(projectDir,"media.json"),"utf8"));return {version:1,assets:(m.assets??[]).map((a:unknown)=>mediaAssetSchema.parse(a)),failed:m.failed??[]};}
 catch(e:any){if(e.code==="ENOENT")return {version:1,assets:[],failed:[]};throw e;}
}
async function writeManifest(projectDir:string,m:MediaManifest){
 const file=path.join(projectDir,"media.json"),tmp=`${file}.${process.pid}.tmp`;
 await fs.writeFile(tmp,JSON.stringify(m,null,2));await fs.rename(tmp,file);
}
function appendCredit(projectDir:string,line:string){
 const file=path.join(projectDir,"credits.txt");
 return fs.readFile(file,"utf8").catch(()=>"").then(old=>old.includes(line)?undefined:fs.appendFile(file,(old&&!old.endsWith("\n")?"\n":"")+line+"\n","utf8"));
}

/** Adds (or returns the existing) snapshot for subject. projectId is the folder name used by the renderer's staticFile. */
export async function acquireMedia(projectDir:string,projectId:string,subject:string,kind:MediaKind,opts:{lang?:string;qid?:string;signal?:AbortSignal}={}):Promise<MediaAsset>{
 const manifest=await readMediaManifest(projectDir),key=mediaKey(subject);
 const existing=manifest.assets.find(a=>a.kind===kind&&mediaKey(a.subject)===key&&(!opts.qid||a.source.wikidata===opts.qid));
 if(existing)return existing;
 try{
  const hit=await resolveMedia(subject,kind,opts);
  const info=await getJSON(api("commons.wikimedia.org",{action:"query",titles:`File:${hit.file}`,prop:"imageinfo",iiprop:"url|size|mime|extmetadata",iiurlwidth:kind==="logo"?"512":"640"}),opts.signal);
  const page=info.query?.pages?.[0],ii=page?.imageinfo?.[0];
  if(!ii)throw new Error(`На Commons нет файла «${hit.file}».`);
  const meta=ii.extmetadata??{},license=text(meta.LicenseShortName?.value)||text(meta.License?.value);
  if(!license)throw new Error(`У файла «${hit.file}» не указана лицензия.`);
  const raw=await fetchImage(ii.thumburl||ii.url,opts.signal);
  const img=sharp(raw,{limitInputPixels:40_000_000});const m=await img.metadata();
  if(!["png","jpeg","webp","gif"].includes(m.format??""))throw new Error(`Неожиданный формат ${m.format}.`);
  let crop:ReturnType<typeof faceCrop>|undefined;
  if(kind==="person"){const full=await img.clone().flatten({background:"#ffffff"}).jpeg({quality:92}).toBuffer();crop=faceCrop(m.width!,m.height!,await faces(full));}
  // Logos and flags keep their shape (PNG, fit inside); only portraits are face-cropped squares.
  const out=kind!=="person"?await img.resize(kind==="flag"?640:512,512,{fit:"inside",withoutEnlargement:true}).png().toBuffer({resolveWithObject:true})
   :await img.extract({left:crop!.left,top:crop!.top,width:crop!.size,height:crop!.size}).resize(512,512,{fit:"cover",withoutEnlargement:true}).flatten({background:"#ffffff"}).jpeg({quality:88}).toBuffer({resolveWithObject:true});
  const sha256=createHash("sha256").update(out.data).digest("hex"),id=`${kind}-${slug(subject)}-${sha256.slice(0,8)}`,ext=kind!=="person"?"png":"jpg";
  await fs.mkdir(path.join(projectDir,"media"),{recursive:true});
  await fs.writeFile(path.join(projectDir,"media",`${id}.${ext}`),out.data);
  const asset=mediaAssetSchema.parse({id,kind,subject:subject.trim(),file:`${projectId}/media/${id}.${ext}`,sha256,width:out.info.width,height:out.info.height,...(crop?{crop}:{}),
   source:{wikidata:hit.qid,label:hit.label.slice(0,160),description:hit.description.slice(0,300),property:hit.property,commonsFile:hit.file.slice(0,300),
    page:String(ii.descriptionurl??`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(hit.file)}`).slice(0,600),
    license:license.slice(0,160),licenseUrl:text(meta.LicenseUrl?.value).slice(0,400),artist:text(meta.Artist?.value).slice(0,400),credit:text(meta.Credit?.value).slice(0,600),
    restrictions:text(meta.Restrictions?.value).slice(0,200),attributionRequired:String(meta.AttributionRequired?.value)==="true",
    date:text(meta.DateTimeOriginal?.value||meta.DateTime?.value).slice(0,160),retrievedAt:new Date().toISOString()}});
  const fresh=await readMediaManifest(projectDir);
  await writeManifest(projectDir,{version:1,assets:[...fresh.assets.filter(a=>a.id!==asset.id),asset],failed:fresh.failed.filter(f=>!(f.kind===kind&&mediaKey(f.subject)===key))});
  const who=kind==="logo"?"Логотип":kind==="flag"?"Флаг":"Фото";
  await appendCredit(projectDir,`${who} «${asset.subject}»: Wikimedia Commons, ${asset.source.commonsFile}; ${asset.source.license}${asset.source.artist?`; автор: ${asset.source.artist}`:""}${asset.source.restrictions?`; ограничения: ${asset.source.restrictions}`:""}${asset.crop?`; ${asset.crop.face?"обрезано по лицу":"обрезано до квадрата"}`:""}; ${asset.source.page}`);
  return asset;
 }catch(e){
  if(opts.signal?.aborted)throw e;
  const reason=(e instanceof Error?e.message:String(e)).slice(0,300),fresh=await readMediaManifest(projectDir);
  await writeManifest(projectDir,{...fresh,failed:[...fresh.failed.filter(f=>!(f.kind===kind&&mediaKey(f.subject)===key)),{subject,kind,reason,at:new Date().toISOString()}]});
  throw e;
 }
}

/**
 * Creation step (after the visual concept, before the voice): snapshot every logo/photo the concept recommends.
 * A miss never blocks the film — it is logged and the director simply gets no tile for it. Projects whose concept
 * recommends nothing and that have no media.json keep their plan byte for byte.
 */
export async function prepareMedia<P extends {media?:MediaAsset[]}>(plan:P,recommended:readonly {subject:string;kind:MediaKind}[]|undefined,projectDir:string,projectId:string,lang:string|undefined,signal:AbortSignal|undefined,log:(message:string)=>void):Promise<P>{
 for(const r of (recommended??[]).slice(0,8)){
  try{const a=await acquireMedia(projectDir,projectId,r.subject,r.kind,{lang,signal});log(`${r.kind==="logo"?"Логотип":r.kind==="flag"?"Флаг":"Фото"} «${r.subject}»: ${a.source.label} (${a.source.wikidata}, ${a.source.description||"без описания"}), Commons «${a.source.commonsFile}», ${a.source.license}${a.source.restrictions?`, ${a.source.restrictions}`:""}.`);}
  catch(e){if(signal?.aborted)throw e;log(`${r.kind==="logo"?"Логотип":r.kind==="flag"?"Флаг":"Фото"} «${r.subject}» не найден (${e instanceof Error?e.message:e}): плитки не будет.`);}
 }
 const {assets}=await readMediaManifest(projectDir);
 return assets.length?{...plan,media:assets}:plan;
}
