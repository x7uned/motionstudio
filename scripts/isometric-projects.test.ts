import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {TEMPLATE_FILES} from "../src/lib/video-templates";
import {validateIsometric,type IsometricPlan} from "../src/lib/isometric";
import {samplePlan,sampleScenes,sampleAlignment,sampleStory} from "./isometric-sample";

// store (and everything that imports it) is loaded only after chdir, so ROOT/DATA point at the temp folder.
const valid=()=>validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe");
const storyboard=(iso:IsometricPlan)=>({title:sampleStory.title,summary:"",factNotes:"",filmKind:"isometric" as const,isometric:iso,scenes:sampleScenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}))});
let store:typeof import("../src/lib/store");
let temp:string;
const previous=process.cwd();
const sha=(f:string)=>createHash("sha256").update(fs.readFileSync(f)).digest("hex");
before(async()=>{
 temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),"motion-studio-iso-")));
 for(const t of ["isometric/v1","illustrated-scene/v2","tech-story/v1"])fs.cpSync(path.join(previous,"data/templates",t),path.join(temp,"data/templates",t),{recursive:true,filter:f=>!/\.(mp4|png)$/.test(f)||/avatar\.png$/.test(f)});
 fs.cpSync(path.join(previous,"data/branding/xtuned-outro/v1"),path.join(temp,"data/branding/xtuned-outro/v1"),{recursive:true});
 fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
 process.chdir(temp);
 store=await import("../src/lib/store");
 assert.equal(store.DATA,path.join(temp,"data"),"tests must never touch the real studio database");
});
after(()=>{if(store?.DATA===path.join(temp,"data"))store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});

test("--film-kind isometric creates a TikTok-safe isometric project with the sample's rules; the sample template itself still refuses",()=>{
 const id=store.createProject({topic:"How maps predict traffic jams",duration:60,format:"9:16",voice:false,language:"en",brand:"kagenami",filmKind:"isometric"});
 const p=store.project(id)!.profile;
 assert.equal(p.filmKind,"isometric");assert.equal(p.renderMode,"2d");assert.equal(p.production?.portraitLayout,"tiktok-safe");
 assert.equal(p.production?.overlayVersion,3,"no overlay (only captions, full 9:16 picture) is the default for new isometric films (2026-10-22)");
 assert.equal(p.username,"@kagenami_ai");assert.ok(p.creatorOutro&&p.musicBed,"outro and music like every new film");
 assert.equal(p.headerAvatar?.file,`${id}/branding/avatar.png`);assert.equal(p.headerAvatar?.sha256,sha(path.join(store.DATA,"projects",p.headerAvatar!.file)));
 assert.equal(p.productionTemplate,undefined,"no connected template is claimed");
 assert.ok(p.visualRules.some(r=>/изометрия/i.test(r)),"rules come from the saved sample «Изометрия» v1");
 assert.ok(p.writingRules.some(r=>/изометрическом городе/.test(r)));
 assert.ok(store.events(id).some((e:any)=>/Изометрия/.test(e.message??JSON.stringify(e))));
 assert.throws(()=>store.createProject({topic:"Maps",duration:30,format:"9:16",voice:false,productionTemplateId:"isometric"}),/--film-kind isometric/);
 assert.throws(()=>store.createProject({topic:"Maps",duration:30,format:"16:9",voice:false,filmKind:"isometric"}),/9:16/);
 assert.throws(()=>store.createProject({topic:"Maps",duration:30,format:"9:16",voice:false,filmKind:"isometric",productionTemplateId:"illustrated-scene"}),/шаблоном/);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id=?").run(id);
});
test("an approved isometric film saves as a NEW connected template version; v1 stays byte-identical",async()=>{
 const before=Object.fromEntries(TEMPLATE_FILES.map(f=>[f,sha(path.join(previous,"data/templates/isometric/v1",f))]));
 const id=store.createProject({topic:"How maps predict traffic jams",duration:60,format:"9:16",voice:false,language:"en",brand:"kagenami",filmKind:"isometric"});
 const dir=path.join(store.DATA,"projects",id);
 fs.writeFileSync(path.join(dir,"video.mp4"),"fake mp4 for the template test");
 fs.writeFileSync(path.join(dir,"isometric-plan.json"),JSON.stringify(valid()));
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id=?").run(id);
 const {saveTemplate}=await import("../src/lib/template-save");
 assert.throws(()=>saveTemplate(id,{id:"isometric",name:"Изометрия"}),/одобренного/,"never from an unapproved film");
 store.updateProject(id,{status:"approved",plan:storyboard(valid()) as any,video:`data/projects/${id}/video.mp4`});
 const saved=saveTemplate(id,{id:"isometric",name:"Изометрия"});
 assert.equal(saved.version,2);
 const {loadVideoTemplate}=await import("../src/lib/video-templates");
 const v2=loadVideoTemplate("isometric");
 assert.equal(v2.manifest.version,2);assert.equal((v2.manifest.runtime as any).filmKind,"isometric");assert.equal(v2.manifest.styleSample,undefined);
 assert.ok(fs.existsSync(path.join(temp,"data/templates/isometric/v2/reference/isometric-plan.json")));
 const next=store.createProject({topic:"How delivery routes are planned",duration:60,format:"9:16",voice:false,language:"en",brand:"worldifthen",productionTemplateId:"isometric"});
 const p=store.project(next)!.profile;
 assert.equal(p.filmKind,"isometric");assert.equal(p.production?.portraitLayout,"tiktok-safe");assert.equal(p.productionTemplate?.version,2);
 for(const f of TEMPLATE_FILES)assert.equal(sha(path.join(temp,"data/templates/isometric/v1",f)),before[f],`v1/${f} unchanged`);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id=?").run(next);
});
