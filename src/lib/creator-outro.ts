import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import type {Storyboard,StyleProfile} from "./model";
import {OUTRO_PACK,OUTRO_BRANDS,outroPackSchema,creatorOutroSchema,type OutroBrand,type OutroLanguage,type OutroPack,type CreatorOutro} from "./xtuned-outro";

const sha=(buffer:Buffer|string)=>createHash("sha256").update(buffer).digest("hex");
export const OUTRO_SNAPSHOT_DIR="branding/xtuned-outro-v1";
const files=(pack:OutroPack)=>[pack.character.file,...[pack.sounds.click,pack.sounds.success].flatMap(s=>s?[s.file]:[])];

/** Read a pack directory and verify every referenced file against its recorded SHA-256. */
export function readOutroPack(dir:string){
 const raw=fs.readFileSync(path.join(dir,"outro.json"),"utf8"),pack=outroPackSchema.parse(JSON.parse(raw));
 if(sha(fs.readFileSync(path.join(dir,pack.character.file)))!==pack.character.sha256)throw new Error("Спрайт заставки @xtuned не совпадает с SHA-256.");
 for(const s of [pack.sounds.click,pack.sounds.success])if(s&&sha(fs.readFileSync(path.join(dir,s.file)))!==s.sha256)throw new Error(`Звук заставки ${s.file} не совпадает с SHA-256.`);
 return {pack,sha256:sha(raw)};
}
/** Freeze the current pack into a new project. Later pack versions never rewrite this copy. */
export function snapshotOutro(root:string,projectDir:string,language:OutroLanguage){
 const source=path.join(root,"data/branding/xtuned-outro/v1"),{pack,sha256}=readOutroPack(source),target=path.join(projectDir,OUTRO_SNAPSHOT_DIR);
 fs.mkdirSync(path.join(target,"sounds"),{recursive:true});
 for(const file of ["outro.json",...files(pack)])fs.copyFileSync(path.join(source,file),path.join(target,file));
 return {pack:OUTRO_PACK,sha256,language};
}
export function projectOutroPack(projectDir:string,profile:Pick<StyleProfile,"creatorOutro">){
 if(!profile.creatorOutro)return null;
 const {pack,sha256}=readOutroPack(path.join(projectDir,OUTRO_SNAPSHOT_DIR));
 if(sha256!==profile.creatorOutro.sha256)throw new Error("Снимок заставки @xtuned изменён после создания проекта.");
 return pack;
}
/** Content is written for the budget minus the outro reserve; the fixed line fills the rest. */
export const contentSeconds=(duration:number,pack:OutroPack|null)=>pack?duration-pack.reserveSeconds:duration;
export function appendOutro(plan:Storyboard,projectId:string,pack:OutroPack,sha256:string,language:OutroLanguage,brand?:OutroBrand):Storyboard{
 if(plan.creatorOutro)return plan;
 if(plan.creatorBranding)throw new Error("У проекта уже есть заставка автора v1.");
 const override=brand?OUTRO_BRANDS[brand].languages[language]:undefined;
 if(brand&&!override)throw new Error(`Произношение бренда ${brand} для языка ${language} ещё не выбрано.`);
 const line={...pack.languages[language],...override},username=brand?OUTRO_BRANDS[brand].username:pack.username,n=plan.scenes.length+1;
 const outro:CreatorOutro=creatorOutroSchema.parse({version:1,pack:OUTRO_PACK,sha256,language,sceneId:`scene-${n}`,username,
  spoken:line.spoken,question:line.question,cueWord:line.cueWord,brandWord:line.brandWord,button:line.button,done:line.done,brandHeard:line.brandHeard,
  sheet:`${projectId}/${OUTRO_SNAPSHOT_DIR}/spritesheet.png`,tailSeconds:pack.tailSeconds});
 return {...plan,creatorOutro:outro,scenes:[...plan.scenes,{id:`scene-${n}`,title:line.question,subtitle:"",narration:line.spoken,visual:"spotlight",items:[username],seconds:pack.reserveSeconds}]};
}
/**
 * Offer the editor-chosen outro effects to the sound library as project snapshots (sfx/<sha>.wav), so they
 * are never searched or substituted. Until the editor has chosen them, the outro uses only the approved whoosh.
 */
export function seedOutroSounds(projectDir:string,pack:OutroPack){
 const chosen={click:pack.sounds.click,success:pack.sounds.success},types={click:"pixel-click",success:"chiptune-arpeggio"} as const;
 const ledger=path.join(projectDir,"sound-assets.json"),current=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger,"utf8")):{version:1,assets:[]};
 let assets=(current.assets||[]).filter((a:{type:string})=>a.type!==types.click&&a.type!==types.success);
 for(const key of ["click","success"] as const){const s=chosen[key];if(!s)continue;
  const file=`sfx/${s.sha256}.wav`;fs.mkdirSync(path.join(projectDir,"sfx"),{recursive:true});
  fs.copyFileSync(path.join(projectDir,OUTRO_SNAPSHOT_DIR,s.file),path.join(projectDir,file));
  assets=[...assets,{type:types[key],origin:"local",file,sha256:s.sha256,attribution:s.attribution}];}
 fs.writeFileSync(ledger,JSON.stringify({...current,assets},null,2));
 return {click:!!chosen.click,success:!!chosen.success};
}
