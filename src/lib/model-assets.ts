import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
export const MAX_MODEL_BYTES=25*1024*1024;
export type ModelAsset={id:string;name:string;file:string;sha256:string;bytes:number;vertices:number;animations:string[];rights:string};
export function validateModelFile(bytes:Buffer,ext:string){
 if(!bytes.length||bytes.length>MAX_MODEL_BYTES)throw new Error("Модель должна быть меньше 25 МБ.");
 let document:any,binLength=0;
 try{
  if(ext===".glb"){
   if(bytes.length<24||bytes.toString("ascii",0,4)!=="glTF"||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error();
   const n=bytes.readUInt32LE(12);if(bytes.readUInt32LE(16)!==0x4e4f534a||n>2*1024*1024||20+n>bytes.length)throw new Error();
   document=JSON.parse(bytes.toString("utf8",20,20+n).trim());
   if(20+n<bytes.length){if(bytes.length<28+n||bytes.readUInt32LE(24+n)!==0x004e4942)throw new Error();binLength=bytes.readUInt32LE(20+n);if(28+n+binLength!==bytes.length)throw new Error();}
  }else if(ext===".gltf")document=JSON.parse(bytes.toString("utf8"));else throw new Error();
 }catch{throw new Error("Нужен корректный GLB 2.0 или самостоятельный GLTF 2.0.");}
 if(document.asset?.version!=="2.0")throw new Error("Поддерживается glTF 2.0.");
 if((document.extensionsRequired??[]).some((s:string)=>!["KHR_materials_unlit","KHR_texture_transform"].includes(s)))throw new Error("Модель требует неподдерживаемого расширения. Экспортируйте без Draco, KTX2 и meshopt.");
 if((document.meshes?.length??0)>128||(document.nodes?.length??0)>512||(document.images?.length??0)>16||(document.animations?.length??0)>16)throw new Error("Слишком сложная модель: до128 meshes, 512 nodes, 16 текстур и анимаций.");
 if((document.accessors?.length??0)>1024||(document.materials?.length??0)>128||(document.bufferViews?.length??0)>1024||(document.buffers?.length??0)>8)throw new Error("Слишком сложная структура GLTF.");
 const dataURI=(uri:string,mimes:string[])=>{
  const m=/^data:([^;,]+);base64,([A-Za-z\d+/=\r\n]+)$/.exec(uri);
  if(!m||!mimes.includes(m[1])||m[2].length>MAX_MODEL_BYTES*1.4)throw new Error("Только встроенные данные. Внешние URL, .bin и текстуры рядом с GLTF не загружаются; используйте GLB или embedded GLTF.");
  return Buffer.from(m[2],"base64").length;
 };
 for(const b of document.buffers??[]){const size=b.uri?dataURI(b.uri,["application/octet-stream","application/gltf-buffer"]):binLength;if(!Number.isInteger(b.byteLength)||b.byteLength<0||b.byteLength>size)throw new Error("Некорректный буфер модели.");}
 for(const image of document.images??[])if(image.uri)dataURI(image.uri,["image/png","image/jpeg"]);else if(!["image/png","image/jpeg"].includes(image.mimeType))throw new Error("Текстуры должны быть PNG/JPEG.");
 let vertices=0;
 let accessorTotal=0;
 for(const a of document.accessors??[]){if(!Number.isInteger(a.count)||a.count<0||a.count>1_000_000)throw new Error("Слишком большой accessor.");accessorTotal+=a.count;}
 if(accessorTotal>3_000_000)throw new Error("Слишком много данных в accessors.");
 for(const mesh of document.meshes??[])for(const p of mesh.primitives??[]){const a=document.accessors?.[p.attributes?.POSITION];if(!a)throw new Error("У модели нет POSITION.");vertices+=a.count;}
 if(vertices<3||vertices>250_000)throw new Error("Поддерживаются модели от3 до250000 вершин.");
 // Reject cycles / dangling references before GLTFLoader traverses untrusted nodes.
 const nodes=document.nodes??[];const parents=new Map<number,number>();for(const n of nodes)for(const c of n.children??[]){parents.set(c,(parents.get(c)||0)+1);if(parents.get(c)!>1)throw new Error("У node не может быть нескольких родителей.");}
 const visited=new Set<number>(),visiting=new Set<number>();
 const visit=(i:number)=>{if(!Number.isInteger(i)||!nodes[i]||visiting.has(i))throw new Error("Некорректное дерево модели.");if(visited.has(i))return;visiting.add(i);for(const c of nodes[i].children??[])visit(c);visiting.delete(i);visited.add(i);};
 nodes.forEach((_:any,i:number)=>visit(i));
 return {vertices,animations:(document.animations??[]).map((a:any,i:number)=>String(a.name||`animation_${i}`).slice(0,80))};
}
export function modelLibrary(root:string):ModelAsset[]{
 const dir=path.join(root,"data/models");if(!fs.existsSync(dir))return[];
 return fs.readdirSync(dir).filter(f=>/^[a-f0-9]{24}\.json$/.test(f)).flatMap(f=>{try{return[JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")) as ModelAsset];}catch{return[];}});
}
export function saveModel(root:string,bytes:Buffer,filename:string,name:string,rights:string){
 const ext=path.extname(filename).toLowerCase(),details=validateModelFile(bytes,ext),sha256=createHash("sha256").update(bytes).digest("hex"),id=sha256.slice(0,24);
 const asset:ModelAsset={id,name:(name.trim()||path.basename(filename,ext)).slice(0,80),file:`${id}${ext}`,sha256,bytes:bytes.length,...details,rights:rights.trim().slice(0,300)};
 const dir=path.join(root,"data/models");fs.mkdirSync(dir,{recursive:true});
 const prior=modelLibrary(root).find(a=>a.id===id);if(prior)return prior;
 fs.writeFileSync(path.join(dir,asset.file),bytes);fs.writeFileSync(path.join(dir,`${id}.json`),JSON.stringify(asset,null,2));return asset;
}
export function snapshotModels(root:string,projectDir:string,ids:string[]){
 const library=modelLibrary(root),out:ModelAsset[]=[];const dir=path.join(projectDir,"models");fs.mkdirSync(dir,{recursive:true});
 for(const id of [...new Set(ids)]){if(!/^[a-f0-9]{24}$/.test(id))throw new Error("Некорректный id модели.");const asset=library.find(a=>a.id===id);if(!asset)throw new Error("Модель не найдена.");const bytes=fs.readFileSync(path.join(root,"data/models",asset.file));if(createHash("sha256").update(bytes).digest("hex")!==asset.sha256)throw new Error("Исходная модель изменена.");validateModelFile(bytes,path.extname(asset.file));fs.writeFileSync(path.join(dir,asset.file),bytes);out.push(asset);}
 fs.writeFileSync(path.join(dir,"index.json"),JSON.stringify(out,null,2));return out;
}
export function verifyModelSnapshot(projectDir:string){
 const index=path.join(projectDir,"models/index.json");const assets:ModelAsset[]=fs.existsSync(index)?JSON.parse(fs.readFileSync(index,"utf8")):[];
 for(const a of assets){if(!/^[a-f0-9]{24}\.(glb|gltf)$/.test(a.file)||a.id!==a.file.split(".")[0])throw new Error("Некорректный снимок модели.");const bytes=fs.readFileSync(path.join(projectDir,"models",a.file));if(createHash("sha256").update(bytes).digest("hex")!==a.sha256)throw new Error("Модель проекта изменена. Восстановите снимок.");validateModelFile(bytes,path.extname(a.file));}return assets;
}
