import {test} from "node:test";
import assert from "node:assert/strict";
import {validateIllustrated,type IllustratedPlan} from "../src/lib/illustrated";
import {buildArrangement,BASE_BPM} from "../src/lib/music-arrangement";
import {duckBed,ARRANGED_MIX} from "../src/lib/music-beds";
import {loopDirective} from "../src/lib/quality-contract";

// Loop ending (user request 2026-10-22, «One minute on Earth»): explicit per project; everything else stays unchanged.
const scenes=[
 {seconds:5,title:"Хаос",subtitle:"Лампы",items:["Лавовая лампа"],narration:"Компьютеры слишком предсказуемы поэтому снимают лавовые лампы."},
 {seconds:5,title:"Камера",subtitle:"Кадр",items:["Камера"],narration:"На лампы смотрит камера и кадр не повторить."},
];
const story={title:"Лампы и ключи",summary:"",scenes,loopEnding:{version:1 as const}};
const alignment=[{words:[{text:"Компьютеры",start:.1,end:.6},{text:"лавовые",start:3,end:3.4},{text:"лампы.",start:3.4,end:3.9}]},{words:[{text:"камера",start:6.2,end:6.7},{text:"кадр",start:7.4,end:7.8}]}];
const A=(scene:number,cue="",progress=0)=>({scene,progress,cue});
const loopPlan=():IllustratedPlan=>({version:1,concept:"Лампы перед камерой по кругу",floorY:1400,
 objects:[
  {id:"lamp",kind:"lava-lamp",x:1000,y:1180,scale:1,label:"",aim:"",rows:1,cols:2,enter:A(1),exit:null,active:[{at:A(1,"лампы"),value:1},{at:A(2,"кадр"),value:0}],moves:[]},
  {id:"cam",kind:"camera",x:1400,y:1190,scale:1,label:"",aim:"lamp",rows:1,cols:2,enter:A(2,"камера"),exit:A(2,"кадр"),active:[],moves:[]},
  {id:"mon",kind:"monitor",x:700,y:1230,scale:1,label:"",aim:"",rows:1,cols:2,enter:A(1,"лавовые"),exit:A(2,"камера"),active:[],moves:[]},
 ],
 flows:[],
 callouts:[{target:"lamp",text:"Лавовая лампа",tone:"info",side:"top",enter:A(1,"лампы"),exit:A(2,"камера")}],
 camera:[{at:A(1),x:1000,y:1100,zoom:1},{at:A(2,"камера"),x:1200,y:1100,zoom:.9},{at:A(2,"кадр"),x:1000,y:1100,zoom:1}],
 mode:[],bigWords:[{text:"Хаос",enter:A(1),exit:A(1,"лавовые")}],notes:[]});

test("a loop plan lands on its first frame and passes the seam rules",()=>{
 const plan=validateIllustrated(loopPlan(),story,alignment);
 assert.equal(plan.camera.length,3);
});
test("the loop validator rejects a camera that does not come back",()=>{
 const p=loopPlan();p.camera[2]={...p.camera[2],x:1300};
 assert.throws(()=>validateIllustrated(p,story,alignment),/Петля: к последнему кадру камера/);
});
test("the loop validator rejects an opening object that leaves or keeps another state",()=>{
 const gone=loopPlan();gone.objects[0].exit=A(2,"кадр");
 assert.throws(()=>validateIllustrated(gone,story,alignment),/остаётся до конца/);
 const changed=loopPlan();changed.objects[0].active=[{at:A(1,"лампы"),value:1}];
 assert.throws(()=>validateIllustrated(changed,story,alignment),/начальному active/);
});
test("a late object still on screen at the seam is rejected; plans without the loop are unaffected",()=>{
 const late=loopPlan();late.objects[1].exit=null;late.objects[1].x=1100;
 assert.throws(()=>validateIllustrated(late,story,alignment),/виден в последнем/);
 const {loopEnding:_,...plain}=story;
 assert.doesNotThrow(()=>validateIllustrated(late,plain,alignment));
});
test("the loop arrangement fills whole bars, starts the groove at once and has no cadence",()=>{
 const seconds=61.4,a=buildArrangement({bed:"space-drone",seconds,chapters:[{start:0,end:20},{start:20,end:40},{start:40,end:61.4}],outroStart:null,callouts:[{at:12,tone:"warn"},{at:15,tone:"ok"}],bigWords:[{at:3}]},2,{loop:true});
 const bars=seconds/(4*60/a.bpm);
 assert.equal(a.loop,true);assert.equal(a.grooveFrom,0);assert.equal(a.beatPhase,0);
 assert.ok(Math.abs(bars-Math.round(bars))<1e-3,`bars ${bars}`);
 assert.ok(Math.abs(a.bpm/BASE_BPM["space-drone"]-1)<=.06);
 assert.ok(!a.accents.some(x=>x.kind==="cadence"));
 assert.throws(()=>buildArrangement({bed:"space-drone",seconds,chapters:[],outroStart:50,callouts:[],bigWords:[]},2,{loop:true}),/заставкой/);
 const plain=buildArrangement({bed:"space-drone",seconds,chapters:[{start:0,end:61.4}],outroStart:null,callouts:[],bigWords:[]},2);
 assert.equal(plain.loop,undefined);
});
test("a loop bed has no fades and the ducking envelope starts where it ends",()=>{
 const N=48000*3,bed=new Float32Array(N*2).fill(.5),voice=new Float32Array(N);
 for(let i=48000*2.4;i<48000*2.9;i++)voice[i]=.3; // speech near the end: the envelope is up at the seam
 const loop=duckBed(bed,voice,0,null,ARRANGED_MIX,true),plain=duckBed(bed,voice,0,null,ARRANGED_MIX);
 assert.equal(plain[0],0);
 assert.ok(loop[0]>0);
 assert.ok(Math.abs(loop[0]-loop[2*N-2])<1e-3,`seam ${loop[0]} vs ${loop[2*N-2]}`);
});
test("the loop directive exists only for loop projects",()=>{
 assert.equal(loopDirective(undefined),"");
 assert.equal(loopDirective({production:{}}),"");
 assert.match(loopDirective({production:{ending:"loop"}}),/ПЕТЛЯ/);
 assert.match(loopDirective({production:{ending:"loop"}},"motion"),/последний кадр должен совпасть с первым/);
});
