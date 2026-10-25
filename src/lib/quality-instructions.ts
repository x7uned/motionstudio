import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
const names=["story-editor","fact-checker","voice-director","export-reviewer"];
// Added 2026-10-19; snapshotted when installed, older workspaces and snapshots stay valid without them.
const optionalNames=["reel-script-craft","claim-evidence-rules"];
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function dependencyHashes(root:string){
 const files=["package.json","package-lock.json",...["preproduction","editorial","narrative-edit","quality-instructions","quality","author-providers","model","backgrounds","research-model","scene3d","netcode","illustrated","illustrated-director","isometric","isometric-director","quality-contract","voice","motion-director","three-director","netcode-director","provider","claude-provider","content-agent","export-review","word-cues","creator-branding","xtuned-outro","creator-outro","sound-effects","sound-provider","sound-preferences","scene-sound","music-beds","music-bed-schema"].map(f=>`src/lib/${f}.ts`),...["speech","elevenlabs_speech","remix"].map(f=>`scripts/${f}.py`)];
 const renderer=path.join(root,"renderer");if(fs.existsSync(renderer))files.push(...fs.readdirSync(renderer).filter(f=>/\.tsx?$/.test(f)).map(f=>`renderer/${f}`));
 return Object.fromEntries(files.filter(f=>fs.existsSync(path.join(root,f))).map(f=>[f,createHash("sha256").update(fs.readFileSync(/*turbopackIgnore: true*/path.join(/*turbopackIgnore: true*/root,f))).digest("hex")]));
}
export function qualityInstructions(root:string,dir:string,allowMissing=false):any{
 const file=path.join(dir,"quality-instructions.json");
 if(fs.existsSync(file)){const saved=JSON.parse(fs.readFileSync(file,"utf8"));const {sha256,...body}=saved;if(sha256!==hash(body))throw new Error("Снимок инструкций качества изменён.");return saved;}
 try{
  const skillFile=(name:string)=>path.join(/*turbopackIgnore: true*/root,".agents/skills",name,"SKILL.md");
  const roles=Object.fromEntries([...names,...optionalNames.filter(name=>fs.existsSync(skillFile(name)))].map(name=>[name,fs.readFileSync(/*turbopackIgnore: true*/skillFile(name),"utf8")]));
  const researchFile=path.join(root,".agents/skills/content-research-writer/SKILL.md");
  const body={version:2,roles,researchRules:fs.existsSync(researchFile)?fs.readFileSync(/*turbopackIgnore: true*/researchFile,"utf8"):"",dependencies:dependencyHashes(root),motionRules:fs.readFileSync(/*turbopackIgnore: true*/path.join(/*turbopackIgnore: true*/root,"video-design/MOTION-RULES.md"),"utf8"),referenceRules:fs.readFileSync(/*turbopackIgnore: true*/path.join(/*turbopackIgnore: true*/root,"video-design/REFERENCE-RULES.md"),"utf8")};
  const snapshot={...body,sha256:hash(body)};fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,JSON.stringify(snapshot,null,2),{flag:"wx"});return snapshot;
 }catch(e:any){if(allowMissing&&e.code==="ENOENT")return null;throw e;}
}
