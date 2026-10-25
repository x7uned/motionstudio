import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {safeZones,zonesHit,inMain,inCaptionRow,ocrZoneViolations,zoneFindings,zoneReviewNote,SAFE_ZONES_VERSION,type OcrLine} from "../src/lib/safe-zones";
import {illustratedZoneWarnings,isometricZoneWarnings,planZoneReport,planZoneSummary,calloutBox,bigWordBox} from "../src/lib/safe-zones-plan";
import {productionSettingsSchema,qualityFindingSchema} from "../src/lib/quality-contract";
import {validateIsometric} from "../src/lib/isometric";
import {illustratedLayout} from "../src/lib/illustrated-layout";
import type {IllustratedPlan} from "../src/lib/illustrated";
import {samplePlan,sampleAlignment,sampleStory,sampleScenes} from "./isometric-sample";

// store is loaded only after chdir, so ROOT/DATA point at the temp folder (never the real studio database).
const previous=process.cwd(),Z=safeZones();
let store:typeof import("../src/lib/store"),temp:string;
before(async()=>{
 temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),"motion-studio-zones-")));
 fs.cpSync(path.join(previous,"data/branding/xtuned-outro/v1"),path.join(temp,"data/branding/xtuned-outro/v1"),{recursive:true});
 fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
 process.chdir(temp);
 store=await import("../src/lib/store");
 assert.equal(store.DATA,path.join(temp,"data"),"tests must never touch the real studio database");
});
after(()=>{if(store?.DATA===path.join(temp,"data"))store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});

// OCR returns normalised boxes with y from the top; these helpers write them in 1080×1920 pixels.
const line=(text:string,x0:number,y0:number,x1:number,y1:number,at=1,confidence=.95):OcrLine=>({at,text,confidence,x:x0/1080,y:y0/1920,width:(x1-x0)/1080,height:(y1-y0)/1920});

test("safe zones v1 come from video-design/safe-zones.json and a newer file never silently replaces them",()=>{
 assert.equal(SAFE_ZONES_VERSION,1);assert.equal(Z.version,1);assert.deepEqual(Z.frame,{width:1080,height:1920,aspect:"9:16",fps:30});
 assert.deepEqual(Z.zones.filter(z=>z.level==="ui").map(z=>z.id).sort(),["bottom-ui","right-buttons","top-ui"]);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"zones-v2-"));fs.mkdirSync(path.join(root,"video-design"));
 fs.writeFileSync(path.join(root,"video-design/safe-zones.json"),JSON.stringify({...Z,version:2}));
 assert.throws(()=>safeZones(1,root),/версия 2.*v1/);fs.rmSync(root,{recursive:true,force:true});
 assert.equal(productionSettingsSchema.parse({version:2,policyVersion:"p",safeZonesVersion:1}).safeZonesVersion,1);
 assert.throws(()=>productionSettingsSchema.parse({version:2,policyVersion:"p",safeZonesVersion:2}));
 assert.equal(productionSettingsSchema.parse({version:2,policyVersion:"p"}).safeZonesVersion,undefined,"older projects keep no field");
});
test("zones, the main area and the caption row follow the documented map",()=>{
 const pt=(x:number,y:number)=>({x0:x,y0:y,x1:x,y1:y});
 assert.equal(zonesHit(pt(540,120),Z)[0].id,"top-ui");assert.equal(zonesHit(pt(540,1700),Z)[0].id,"bottom-ui");
 assert.equal(zonesHit(pt(1000,1000),Z)[0].id,"right-buttons");assert.equal(zonesHit(pt(1040,600),Z)[0].id,"edge-right","above y 800 the right side is only the cropped edge");assert.equal(zonesHit(pt(1000,600),Z).length,0);
 assert.equal(zonesHit(pt(500,1300),Z)[0].level,"caution");assert.equal(zonesHit(pt(500,700),Z).length,0);
 assert.ok(inMain(pt(950,600),Z),"main reaches x 1010 above y 800");assert.ok(!inMain(pt(950,900),Z),"but only x 880 below it");
 assert.ok(inMain({x0:100,y0:700,x1:860,y1:900},Z),"a box spanning both parts fits the narrower one");
 assert.ok(!inMain({x0:100,y0:700,x1:960,y1:900},Z));assert.ok(!inMain({x0:100,y0:280,x1:500,y1:400},Z));
 assert.ok(inCaptionRow({x0:240,y0:1402,x1:840,y1:1488},Z));assert.ok(!inCaptionRow({x0:240,y0:1330,x1:840,y1:1420},Z));
});
test("OCR text outside the caption row may not enter interface, caption, edge or caution zones",()=>{
 const v=ocrZoneViolations([
  line("subtitle words",240,1402,840,1488),                 // the captions themselves: exempt
  line("main zone title",200,500,880,580),                  // fine
  line("FOR YOU",380,150,700,200),                          // under TikTok's tabs
  line("LIKE 12K",950,1000,1060,1050),                      // under the button column
  line("CARD TOP",120,262,600,296),                         // caution strip under the tabs
  line("SIDE",20,600,200,640),                              // within 70 px of the side
  line("label in the subtitle row",300,1340,700,1395),      // crosses into the caption row from above
  line("faint",380,150,700,200,1,.4),                       // below the OCR confidence floor
  line("very long subtitle line over the buttons",60,1402,1030,1488),
 ],Z);
 assert.deepEqual(v.map(x=>[x.text,x.zone,x.level]),[
  ["FOR YOU","top-ui","ui"],["CARD TOP","top-caution","caution"],["SIDE","edge-left","edge"],["LIKE 12K","right-buttons","ui"],["label in the subtitle row","captions","captions"],["very long subtitle line over the buttons","right-buttons","ui"],
 ]);
 assert.deepEqual(v[0].box,{x0:380,y0:150,x1:700,y1:200});assert.equal(v[0].frame,30);
});
test("a violation becomes one review finding per text and zone, with the second, frame and box",()=>{
 const v=ocrZoneViolations([line("FOR YOU",380,150,700,200,1.5),line("FOR YOU",380,150,700,200,4),line("CARD TOP",120,262,600,296,2)],Z);
 const f=zoneFindings(v,30);
 assert.equal(f.length,2);for(const x of f)qualityFindingSchema.parse(x);
 const top=f.find(x=>/FOR YOU/.test(x.detail))!;
 assert.equal(top.kind,"safe-zone");assert.equal(top.severity,"error");assert.equal(top.start,1.5);assert.ok(Math.abs(top.end-4.1)<1e-9);
 assert.match(top.detail,/top-ui.*1\.50 с, кадр 45: рамка x 380–700, y 150–200/);assert.match(top.detail,/ещё 1/);
 assert.equal(f.find(x=>/CARD TOP/.test(x.detail))!.severity,"warning","caution is a warning, the interface an error");
 assert.match(zoneReviewNote(Z),/x 70–880 \(выше y 800 — до x 1010\), y 300–1250/);
});
test("new 9:16 projects record safe zones v1 at create; 16:9 projects do not",()=>{
 const id=store.createProject({topic:"Why cats land on their feet",duration:60,format:"9:16",voice:false});
 assert.equal(store.project(id)!.profile.production?.safeZonesVersion,1);
 assert.ok(store.events(id).some((e:any)=>/Безопасные зоны v1/.test(e.message??JSON.stringify(e))));
 const wide=store.createProject({topic:"Why cats land on their feet",duration:60,format:"16:9",voice:false});
 assert.equal(store.project(wide)!.profile.production?.safeZonesVersion,undefined,"16:9 keeps the usual 5 %/10 % margins");
 store.db().prepare("UPDATE jobs SET status='completed'").run();
});

const A=(scene:number,cue="",progress=0)=>({scene,progress,cue});
const ilScenes=[{seconds:5,narration:"Компьютеры слишком предсказуемы поэтому снимают лавовые лампы."},{seconds:5,narration:"На лампы смотрит камера и кадр не повторить."}];
const ilAlignment=[{words:[{text:"Компьютеры",start:.1,end:.6},{text:"лавовые",start:3,end:3.4},{text:"лампы.",start:3.4,end:3.9}]},{words:[{text:"камера",start:6.2,end:6.7},{text:"кадр",start:7.4,end:7.8}]}];
const ilPlan=():IllustratedPlan=>({version:1,concept:"Лампы перед камерой",floorY:1400,
 objects:[
  {id:"lamp",kind:"lava-lamp",x:1000,y:1180,scale:1,label:"",aim:"",rows:1,cols:2,enter:A(1,"лавовые"),exit:null,active:[],moves:[]},
  {id:"sign",kind:"plaque",x:800,y:1794,scale:1,label:"Кадр",aim:"",rows:1,cols:2,enter:A(1),exit:null,active:[],moves:[]},
 ],
 flows:[],
 callouts:[{target:"lamp",text:"Лавовая лампа",tone:"info",side:"right",enter:A(1,"лампы"),exit:A(2,"камера")}],
 camera:[{at:A(1),x:800,y:1100,zoom:1},{at:A(2,"камера"),x:1200,y:1100,zoom:.9}],
 mode:[],bigWords:[{text:"Хаос",enter:A(1),exit:A(1,"лавовые")}],notes:[]});
test("illustrated plan warnings: a callout at the button column and a sign under the platform's bottom bar",()=>{
 const L=illustratedLayout("tiktok-safe",3);assert.equal(L.viewTop,416);
 const w=illustratedZoneWarnings(ilPlan(),ilScenes,ilAlignment,Z,"tiktok-safe",3);
 const callout=w.find(x=>x.kind==="callout")!;
 assert.equal(callout.zone,"right-caution");assert.equal(callout.at,4.6);assert.deepEqual(callout.box,{x0:600,y0:917,x1:938,y1:975});
 assert.deepEqual(calloutBox("Лавовая лампа","right",{x:815,y:530}),{x0:938-338.5,y0:501,x1:938,y1:559},"mirrors the renderer's clamped callout plate");
 const sign=w.find(x=>x.kind==="label")!;assert.equal(sign.zone,"bottom-ui");assert.equal(sign.level,"ui");
 assert.ok(w.some(x=>x.kind==="landing"&&/sign/.test(x.what)&&x.zone==="bottom-ui"),"the sign also comes to rest under the bottom bar");
 assert.ok(!w.some(x=>x.kind==="big-word"),"the big word sits in the main zone");assert.equal(bigWordBox("Хаос").y0,70);
 assert.match(planZoneSummary({version:1,renderer:"illustrated",checked:true,warnings:w}),/предупрежд.*bottom-ui|right-caution/);
});
test("isometric plan warnings: the fixed v3 card row y256–380 enters the caution strip; the old header layout does not",()=>{
 const v3=validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",3);
 const cards=isometricZoneWarnings(v3,sampleScenes,sampleAlignment,Z,"tiktok-safe",3).filter(w=>w.kind==="card");
 assert.equal(cards.length,v3.cards.length);assert.ok(cards.every(c=>c.zone==="top-caution"&&c.box.y0===256&&c.box.y1===380));
 const v1=validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe");
 assert.equal(isometricZoneWarnings(v1,sampleScenes,sampleAlignment,Z,"tiktok-safe").filter(w=>w.kind==="card").length,0,"under the old header the card starts at y 426");
});
test("plan warnings exist only for v1 projects; everything else gets nothing",()=>{
 const plan={title:sampleStory.title,summary:"",factNotes:"",filmKind:"isometric" as const,isometric:validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",3),scenes:sampleScenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}))} as any;
 const profile=(production:any)=>({production} as any);
 assert.equal(planZoneReport(plan,sampleAlignment,profile({version:2,policyVersion:"p",portraitLayout:"tiktok-safe",overlayVersion:3}),"9:16",previous),null);
 assert.equal(planZoneReport(plan,sampleAlignment,profile({version:2,policyVersion:"p",safeZonesVersion:1}),"16:9",previous),null);
 const r=planZoneReport(plan,sampleAlignment,profile({version:2,policyVersion:"p",portraitLayout:"tiktok-safe",overlayVersion:3,safeZonesVersion:1}),"9:16",previous)!;
 assert.equal(r.renderer,"isometric");assert.ok(r.checked);assert.ok(r.warnings.some(w=>w.kind==="card"));
 const flat=planZoneReport({...plan,filmKind:undefined,isometric:undefined},sampleAlignment,profile({version:2,policyVersion:"p",safeZonesVersion:1}),"9:16",previous)!;
 assert.equal(flat.checked,false);assert.match(flat.note!,/по кадрам/);
});
test("the overlay outlines a review finding on the frame",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zones-overlay-")),report=path.join(dir,"safe-zones.json"),out=path.join(dir,"out.png");
 fs.writeFileSync(report,JSON.stringify({violations:ocrZoneViolations([line("FOR YOU",380,150,700,200,1.5)],Z),plan:{warnings:[]}}));
 const log=execFileSync(process.execPath,[path.join(previous,"scripts/safe-zones-overlay.mjs"),"--blank",out,"--violations",report,"--at","1.5"],{cwd:previous,encoding:"utf8"});
 assert.match(log,/1 marks at 1\.5 s/);assert.ok(fs.statSync(out).size>1000);fs.rmSync(dir,{recursive:true,force:true});
});
