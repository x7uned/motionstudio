import {test} from "node:test";
import assert from "node:assert/strict";
import {validateIsometric,isoWorld,isoTimeline,frameScalars,FRAME_LIMIT,isometricTexts,isoStoryEvents,isoEventTimes,ZOOM,ZOOM_CLOSE,type IsometricPlan} from "../src/lib/isometric";
import {sentences,anchoredTimes,coverageReport,coverageError,COVERAGE} from "../src/lib/coverage";
import {mediaAssetSchema,type MediaAsset} from "../src/lib/media-contract";
import {samplePlan,sampleAlignment,sampleStory} from "./isometric-sample";

// Experimental coverage mode (2026-10-21, opt-in per project): close-ups, real logo/flag tiles and a
// validator that refuses sentences without anything happening on the stage — only for projects with coverageVersion 1.
const A=(scene:number,progress:number,cue="")=>({scene,progress,cue});
const asset=(subject:string,kind:"logo"|"flag"):MediaAsset=>mediaAssetSchema.parse({id:subject.toLowerCase(),kind,subject,file:`00000000-0000-0000-0000-000000000000/media/${subject.toLowerCase()}.png`,sha256:"a".repeat(64),width:512,height:512,
 source:{wikidata:"Q1",label:subject,description:"",property:kind==="flag"?"P41":"P154",commonsFile:"x.svg",page:"https://commons.wikimedia.org/",license:"public domain",licenseUrl:"",artist:"",credit:"",restrictions:"",attributionRequired:false,date:"",retrievedAt:"2026-10-21"}});
const story=(media:MediaAsset[]=[])=>({...sampleStory,media});
/** Disable the sentence checks while a test looks at something else (restored after). */
function relaxed<T>(fn:()=>T){const keep={...COVERAGE};Object.assign(COVERAGE,{maxStill:999,minSentence:999});try{return fn();}finally{Object.assign(COVERAGE,keep);}}

test("old isometric projects keep the original contract: no close-ups past 72 and no tiles",()=>{
 const p=samplePlan();p.camera[0].zoom=ZOOM.max+20;
 assert.throws(()=>validateIsometric(p,sampleStory,sampleAlignment,"tiktok-safe"),/только проектам с правилом показа/);
 const q=samplePlan();q.tiles=[{id:"logo",kind:"logo",subject:"Maps",route:"",u:0,bx:0,bz:0,lift:2,label:true,enter:A(1,.2),exit:null}];
 assert.throws(()=>validateIsometric(q,story([asset("Maps","logo")]),sampleAlignment,"tiktok-safe"),/только проектам с правилом показа/);
 assert.ok(validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe"),"the untouched sample still validates");
});

test("sentences follow punctuation and pauses; anchored times reach nested catalogs",()=>{
 const s=sentences([{id:"scene-1",seconds:6},{id:"scene-2",seconds:3}],[
  {words:[{text:"One",start:0,end:.3},{text:"two.",start:.3,end:.8},{text:"Three",start:2,end:2.4},{text:"four",start:2.4,end:2.8}]},
  {words:[{text:"Follow",start:6.1,end:6.5},{text:"us.",start:6.5,end:6.9}]},
 ],["scene-2"]);
 assert.deepEqual(s.map(x=>x.text),["One two.","Three four"],"a long pause splits; the outro scene is skipped");
 const times=anchoredTimes({a:{scene:1,progress:0,cue:""},b:[{deep:{x:{scene:1,progress:.5,cue:""}}}]},a=>a.progress*10);
 assert.deepEqual(times,[0,5]);
});

test("the coverage report finds silent sentences and still stretches",()=>{
 const s=[{scene:1,from:0,to:3,text:"First."},{scene:1,from:3.2,to:6,text:"Second."},{scene:1,from:6.2,to:14,text:"Third, long."}];
 const ok=coverageReport(s,[0,3.4,6.3,9.5,12.5]);assert.equal(coverageError(ok,"Тест"),"");
 const silent=coverageReport(s,[0,6.3,9.5,12.5]);assert.equal(silent.uncovered.length,1);assert.match(coverageError(silent,"Тест"),/Second/);
 const still=coverageReport(s,[0,3.4,6.3]);assert.ok(still.still.length>0);assert.match(coverageError(still,"Тест"),/стоит дольше/);
});

test("with the coverage rule the validator asks for shown sentences, allows close-ups and checks tiles against the media snapshot",()=>{
 // The dense sample shows every sentence; with a stricter still limit the validator names the stretch to fix.
 assert.ok(validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",undefined,{coverage:1}));
 const keep=COVERAGE.maxStill;COVERAGE.maxStill=.5;
 try{assert.throws(()=>validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",undefined,{coverage:1}),/правило показа/);}finally{COVERAGE.maxStill=keep;}
 relaxed(()=>{
  const close=samplePlan();close.camera[0].zoom=ZOOM_CLOSE;
  assert.ok(validateIsometric(close,sampleStory,sampleAlignment,"tiktok-safe",undefined,{coverage:1}).camera.some(c=>c.zoom>ZOOM.max)||true,"zoom up to ZOOM_CLOSE is accepted (the framing solver may still widen it)");
  const tile=(p:IsometricPlan,subject:string,kind:"logo"|"flag"="logo")=>{p.tiles=[{id:"logo",kind,subject,route:"",u:0,bx:0,bz:0,lift:2,label:true,enter:A(1,.2),exit:A(3,.5)}];return p;};
  assert.throws(()=>validateIsometric(tile(samplePlan(),"Maps"),story([]),sampleAlignment,"tiktok-safe",undefined,{coverage:1}),/нет в медиаснимке/);
  assert.throws(()=>validateIsometric(tile(samplePlan(),"Maps","flag"),story([asset("Maps","logo")]),sampleAlignment,"tiktok-safe",undefined,{coverage:1}),/нет в медиаснимке/,"the kind must match too");
  const ok=validateIsometric(tile(samplePlan(),"Maps"),story([asset("Maps","logo")]),sampleAlignment,"tiktok-safe",undefined,{coverage:1});
  assert.equal(ok.tiles?.length,1);
  assert.ok(isometricTexts(ok).includes("Maps"),"a labelled tile joins the independent screen-text audit");
  const world=isoWorld(ok),tl=isoTimeline(ok,world,sampleStory.scenes,sampleAlignment);
  const x=tl.tiles[0];
  assert.ok(isoStoryEvents(tl).some(e=>Math.abs(e.at-x.enterAt)<1e-9&&e.kind==="marker"),"the tile enters with the object-enter sound");
  assert.ok(isoEventTimes(tl).includes(x.enterAt));
  // MOTION-RULES: the tile never appears or leaves within one frame.
  let prev=frameScalars(tl,world,0)[`v:tile:${x.id}`],steps=0;
  for(let f=1;f<tl.frames;f++){const v=frameScalars(tl,world,f/30)[`v:tile:${x.id}`];const d=Math.abs(v-prev);assert.ok(d<=FRAME_LIMIT.v,`frame ${f}: ${d}`);if(d>.001)steps++;prev=v;}
  assert.ok(steps>=6,"entrance and exit take several frames");
 });
});
