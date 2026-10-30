import {TEST_PYTHON,TEST_FFMPEG} from "./test-tools";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import type {Storyboard} from "../src/lib/model";

const ROOT=path.resolve(import.meta.dirname,"..");
const PY=TEST_PYTHON,FF=TEST_FFMPEG;
const film=():Storyboard=>({title:"Кэш",summary:"Как кэш ускоряет ответ",factNotes:"",scenes:Array.from({length:4},(_,i)=>({id:`scene-${i+1}`,title:"Кэш",subtitle:"",narration:"Кэш хранит ответ рядом.",visual:"spotlight" as const,items:["Кэш"],seconds:2}))});
const tmp=(name:string)=>fs.mkdtempSync(path.join(os.tmpdir(),`studio-music-${name}-`));

test("pack v2 keeps v1 files byte for byte and the user's explainer choice",()=>{
 const v1=JSON.parse(fs.readFileSync(path.join(ROOT,"data/sound-packs/background-beds/v1/manifest.json"),"utf8"));
 const v2=JSON.parse(fs.readFileSync(path.join(ROOT,"data/sound-packs/background-beds/v2/manifest.json"),"utf8"));
 const hash=(f:string)=>createHash("sha256").update(fs.readFileSync(f)).digest("hex");
 for(const b of v1.beds)assert.equal(hash(path.join(ROOT,"data/sound-packs/background-beds/v2",b.file)),b.sha256);
 for(const b of v2.beds)assert.equal(hash(path.join(ROOT,"data/sound-packs/background-beds/v2",b.file)),b.sha256);
 assert.deepEqual(v2.beds.filter((b:any)=>b.since==="v2").map((b:any)=>b.id),["pluck-curious","glass-arp","chip-soft"]);
});

test("the bed is chosen by topic, explainers fall back to the user's three",async()=>{
 const {chooseMusicBed,EXPLAINER_BEDS}=await import("../src/lib/music-beds");
 const first=()=>0,last=(n:number)=>n-1;
 assert.equal(chooseMusicBed("Why a torn, stained or logo-covered QR code still scans",first).id,"chip-soft");
 assert.equal(chooseMusicBed("What If the Internet Went Dark for a Day?",first).id,"chip-soft");
 assert.deepEqual(chooseMusicBed("What If You Fell Through the Earth?",first),{id:"space-drone",selection:"topic",matched:"planet-what-if"});
 assert.equal(chooseMusicBed("Что будет, если Солнце исчезнет",first).id,"space-drone");
 assert.equal(chooseMusicBed("Как работает лазер",first).id,"glass-arp");
 assert.equal(chooseMusicBed("История телефона",first).id,"warm-pad");
 // Word starts only: "человек" is not "век", "orbit"/"habit" never read as "bit".
 assert.equal(chooseMusicBed("Почему человек зевает",last).id,"chip-soft");
 assert.equal(chooseMusicBed("Why a habit sticks",first).selection,"explainer-random");
 assert.equal(chooseMusicBed("Why cats always land on their feet",first).id,EXPLAINER_BEDS[0]);
 assert.equal(chooseMusicBed("Why cats always land on their feet",last).id,EXPLAINER_BEDS[2]);
 assert.ok(!["music-box","nature-air"].includes(chooseMusicBed("Почему у кошки девять жизней и что такое ветер в лесу",first).id));
});

test("the snapshot is verified and the cue sheet stays v8 without a bed, v9 with a static v2 bed",async()=>{
 const {snapshotMusicBed,projectMusicBed}=await import("../src/lib/music-beds");
 const {soundCues}=await import("../src/lib/export-review");
 const MUSIC_PACK="background-beds/v2" as const,dir=tmp("snapshot"),bed=snapshotMusicBed(ROOT,dir,{id:"glass-arp",selection:"editor"},MUSIC_PACK);
 assert.equal(bed.pack,MUSIC_PACK);assert.equal(projectMusicBed(dir,bed).gainDb,8.13);assert.equal(projectMusicBed(dir,bed).mix.speechDb,-15);
 const legacy=soundCues(film(),[]);
 assert.equal(legacy.version,8);assert.equal(legacy.backgroundGain,.009);assert.ok(!("musicBed" in legacy));
 assert.deepEqual(Object.keys(legacy),["version","clock","backgroundGain","soundPreferences","cues"]);
 const cue={version:1 as const,pack:MUSIC_PACK as typeof MUSIC_PACK,id:"glass-arp" as const,file:"music-bed.f32",sha256:"0".repeat(64),samples:384000,gainDb:8.13,mix:projectMusicBed(dir,bed).mix,outroStart:null};
 const sheet=soundCues(film(),[],undefined,cue);
 assert.equal(sheet.version,9);assert.equal(sheet.backgroundGain,0);assert.deepEqual(sheet.musicBed,cue);
 fs.appendFileSync(path.join(dir,"music-bed","bed.json")," ");
 assert.throws(()=>projectMusicBed(dir,bed),/изменён/);
});

test("ducking: quieter under speech, silent at the start and from the outro on",async()=>{
 const {duckBed,MUSIC_MIX}=await import("../src/lib/music-beds");
 const SR=48000,N=SR*8,bed=new Float32Array(N*2).fill(.1),voice=new Float32Array(N);
 for(let i=3*SR;i<4*SR;i++)voice[i]=.3*Math.sin(i/10);
 const out=duckBed(bed,voice,0,6),at=(t:number)=>Math.abs(out[2*Math.round(t*SR)]);
 assert.equal(at(0),0);
 const pause=at(2.5),speech=at(3.9);
 assert.ok(Math.abs(20*Math.log10(pause/.1)-MUSIC_MIX.pauseDb)<.1);
 assert.ok(Math.abs(20*Math.log10(speech/.1)-MUSIC_MIX.speechDb)<.3);
 assert.equal(at(6),0);assert.equal(at(7.5),0);
 assert.ok(at(5.5)>0&&at(5.5)<pause);
});

const story=(callouts:{at:number;tone:string}[]=[])=>({input:{chapters:[0,2,4,6].map(start=>({start,end:start+2})),outroStart:null,callouts,bigWords:[{at:.5}]},ffmpeg:FF});
test("remix mixes the rendered arranged stereo bed (cue sheet v10) and refuses a changed one",async()=>{
 const {snapshotMusicBed,renderMusicBed,MUSIC_PACK}=await import("../src/lib/music-beds");
 const {soundCues}=await import("../src/lib/export-review");
 const dir=tmp("remix"),plan=film();
 fs.writeFileSync(path.join(dir,"storyboard.json"),JSON.stringify(plan));
 execFileSync(FF,["-v","error","-f","lavfi","-i","sine=frequency=220:duration=8:sample_rate=48000","-ac","1","-c:a","pcm_s16le",path.join(dir,"narration.wav")]);
 const bed=snapshotMusicBed(ROOT,dir,{id:"chip-soft",selection:"editor"});
 assert.equal(bed.pack,MUSIC_PACK);assert.equal(MUSIC_PACK,"background-beds/v4");
 await assert.rejects(renderMusicBed(dir,bed,384000,null),/план фильма/);
 const cue=await renderMusicBed(dir,bed,384000,null,undefined,story());
 assert.ok(cue.arrangement&&cue.arrangement.accents.some(a=>a.kind==="cadence"));assert.equal(cue.mix.speechDb,-12);
 assert.ok(fs.existsSync(path.join(dir,"music-bed","arrangement.json")));
 assert.equal(soundCues(plan,[],undefined,cue).version,10);
 assert.equal(fs.statSync(path.join(dir,"music-bed.f32")).size,384000*2*4);
 fs.writeFileSync(path.join(dir,"sound-cues.json"),JSON.stringify(soundCues(plan,[],undefined,cue)));
 execFileSync(PY,[path.join(ROOT,"scripts/remix.py"),dir,FF]);
 const report=JSON.parse(fs.readFileSync(path.join(dir,"sound-mix-report.json"),"utf8"));
 assert.equal(report.musicBed.id,"chip-soft");assert.ok(report.musicBed.activeRmsDbFS>-60);
 const premix=fs.readFileSync(path.join(dir,"premix.wav"));assert.equal(premix.readUInt16LE(22),2);
 fs.appendFileSync(path.join(dir,"music-bed.f32"),Buffer.alloc(8));
 assert.throws(()=>execFileSync(PY,[path.join(ROOT,"scripts/remix.py"),dir,FF],{stdio:"pipe"}),/hash changed/);
});

test("new researched projects snapshot a bed; supplied plans and the legacy tone stay unchanged",()=>{
 const store=fs.readFileSync(path.join(ROOT,"src/lib/store.ts"),"utf8");
 assert.match(store,/if\(opts\.musicBed\|\|\(\(!template\|\|templateOutro\)&&!opts\.initialPlan\)\)savedProfile\.musicBed=snapshotMusicBed/);
 const remix=fs.readFileSync(path.join(ROOT,"scripts/remix.py"),"utf8");
 assert.match(remix,/math\.sin\(2\*math\.pi\*130\.813\*t\)\+\.4\*math\.sin\(2\*math\.pi\*196\*t\)\)\*background_gain\*fade/);
});

test("the arrangement follows the story: groove from chapter 2, fall → rise, cadence on a downbeat",async()=>{
 const {buildArrangement,ACCENT_GAP}=await import("../src/lib/music-arrangement");
 const chapters=[0,6,14,22,30,38,44].map((start,i,a)=>({start,end:a[i+1]??48}));
 const a=buildArrangement({bed:"pluck-curious",seconds:52,chapters,outroStart:48,
  callouts:[{at:16,tone:"warn"},{at:18.5,tone:"ok"},{at:25,tone:"ok"},{at:31,tone:"warn"},{at:33,tone:"warn"},{at:47,tone:"ok"}],bigWords:[{at:2},{at:24.5}]});
 assert.equal(a.grooveFrom,6);assert.equal(a.cadence,44);assert.equal(a.fadeEnd,48);
 assert.ok(Math.abs(a.bpm/90-1)<=.06);
 const beats=(a.cadence-a.grooveFrom)/(60/a.bpm);assert.ok(Math.abs(beats-Math.round(beats))<1e-3,"groove entry and cadence on the beat grid");
 assert.deepEqual(a.tension,[{from:16,to:18.5},{from:31,to:38}]);assert.deepEqual(a.lifts,[18.5]);
 assert.deepEqual(a.accents.map(x=>[x.at,x.kind]),[[2,"chime"],[16,"fall"],[18.5,"rise"],[24.5,"chime"],[31,"fall"],[44,"cadence"]]);
 for(const [i,x] of a.accents.entries())if(i&&!(a.accents[i-1].kind==="fall"&&x.kind==="rise"))assert.ok(x.at-a.accents[i-1].at>=ACCENT_GAP);
 assert.ok(a.accents.every(x=>x.at<=a.cadence));
 assert.throws(()=>buildArrangement({bed:"nature-air",seconds:20,chapters,outroStart:null,callouts:[],bigWords:[]}),/аранжировку/);
});

test("every arranged bed renders finite, deterministic audio; highlight blips under music accents are dropped",async()=>{
 const {buildArrangement,ARRANGED_BEDS}=await import("../src/lib/music-arrangement");
 const {soundCues}=await import("../src/lib/export-review");
 const dir=tmp("beds"),gen=path.join(ROOT,"data/sound-packs/background-beds/v3/generator/arranged.mjs");
 for(const bed of ARRANGED_BEDS){
  const arr=path.join(dir,`${bed}.json`),out=path.join(dir,`${bed}.f32`);
  fs.writeFileSync(arr,JSON.stringify(buildArrangement({...story([{at:3,tone:"warn"},{at:4.6,tone:"ok"}]).input,bed,seconds:8})));
  execFileSync(process.execPath,[gen,bed,"8",arr,out]);const first=fs.readFileSync(out);
  execFileSync(process.execPath,[gen,bed,"8",arr,out]);assert.ok(first.equals(fs.readFileSync(out)),`${bed} is deterministic`);
  const f=new Float32Array(first.buffer.slice(first.byteOffset,first.byteOffset+first.byteLength));
  assert.equal(f.length,8*48000*2);assert.ok(f.every(Number.isFinite));assert.ok(f.some(v=>Math.abs(v)>1e-4),`${bed} is audible`);
 }
 const plan=film();plan.scenes[0].beats=[{at:1,cue:"",action:"highlight"}] as any;
 const base=soundCues(plan,[]),hl=base.cues.find(c=>c.kind==="highlight");
 assert.ok(hl,"the scene beat produces a highlight blip");
 {const cue:any={version:1,pack:"background-beds/v3",id:"chip-soft",file:"music-bed.f32",sha256:"0".repeat(64),samples:384000,gainDb:0,mix:{},outroStart:null,arrangement:{sha256:"0".repeat(64),bpm:110,cadence:6,measuredLufs:-20,tension:[],accents:[{at:hl!.at+.2,kind:"chime"}]}};
  const v10=soundCues(plan,[],undefined,cue);assert.equal(v10.version,10);assert.ok(!v10.cues.some(c=>c.kind==="highlight"&&Math.abs(c.at-hl!.at)<.01));}
});

test("v4 (2026-10-21): one sound per accent, rises only where an ok callout resolves a warn; v3 rules unchanged",async()=>{
 const {buildArrangement}=await import("../src/lib/music-arrangement");
 const chapters=[0,6,14,22,30,38,44].map((start,i,a)=>({start,end:a[i+1]??48}));
 const input={bed:"chip-soft",seconds:52,chapters,outroStart:48,callouts:[{at:16,tone:"warn"},{at:18.5,tone:"ok"},{at:28,tone:"ok"}],bigWords:[]};
 const v3=buildArrangement(input),v4=buildArrangement(input,2);
 assert.equal(v3.version,1);assert.equal(v4.version,2);
 assert.deepEqual(v3.accents.filter(a=>a.kind==="rise").map(a=>a.at),[18.5,28],"v3 keeps a rise on every plain ok callout");
 assert.deepEqual(v4.accents.filter(a=>a.kind==="rise").map(a=>a.at),[18.5],"v4: only the ok that ends the warn tension");
 const gen=fs.readFileSync(path.join(ROOT,"data/sound-packs/background-beds/v4/generator/arranged.mjs"),"utf8");
 for(const kind of ["chime","fall","rise"]){const line=gen.split("\n").find(l=>l.includes(`a.kind === '${kind}'`))!;
  assert.ok(line&&!/forEach|\bfor\s*\(/.test(line),`${kind} is a single sound, not a run of notes`);}
 const old=fs.readFileSync(path.join(ROOT,"data/sound-packs/background-beds/v3/generator/arranged.mjs"),"utf8");
 assert.match(old,/a\.kind === 'rise'\) \[24, 28, 31\]\.forEach/,"v3 pack is untouched");
});
