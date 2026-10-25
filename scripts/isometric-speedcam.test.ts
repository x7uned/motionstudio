import {test} from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {validateIsometric,isoWorld,isoTimeline,frameScalars,FRAME_LIMIT,isometricSchema,isometricTexts,isoStoryEvents,isoEventTimes,occlusionCap,type IsometricPlan} from "../src/lib/isometric";
import {driveCurve,speedcamCarState,cameraState,flowCars,traceState,speedcamSchema,speedcamGuardPoints,frameOn,GANTRY,TRACE_H,type SpeedcamPlan} from "../src/lib/isometric-speedcam";
import {samplePlan,sampleStory,sampleAlignment} from "./isometric-sample";
import {tagZoomFade,tagExitFade} from "../renderer/IsometricSpeedcam";

// A small four-chapter story that exercises every speedcam object (no TTS, no model calls).
const A=(scene:number,progress:number,cue="",cueOccurrence?:number)=>({scene,progress,cue,...(cueOccurrence?{cueOccurrence}:{})});
const scenes=[
 {seconds:5,title:"The trick",subtitle:"",items:["speed camera"],narration:"Everyone brakes for the speed camera then floors it again."},
 {seconds:6,title:"Two cameras",subtitle:"",items:["10 km"],narration:"The first camera reads your plate and the second camera reads it again."},
 {seconds:6,title:"Average",subtitle:"",items:["120","100"],narration:"Distance divided by time is your average speed of 120 above the limit of 100."},
 {seconds:5,title:"Exactly",subtitle:"",items:["120"],narration:"At some moment your speed was exactly 120 and the system knew."},
];
const words=(i:number,start:number)=>{const list=scenes[i].narration.split(" ").map((w,k)=>({text:w,start:start+.3+k*.32,end:start+.58+k*.32}));
 return {scene:i+1,start:list[0].start,end:list.at(-1)!.end,sceneEnd:start+scenes[i].seconds,speed:1,text:scenes[i].narration,words:list};};
const alignment=[words(0,0),words(1,5),words(2,11),words(3,17)];
const story={title:"This camera does not measure your speed",summary:"10 km section",scenes};
function speedcam():SpeedcamPlan{
 return {
  cars:[{id:"hero",route:"highway",tone:"hero",enter:A(1,.02),exit:null,drive:[{at:A(1,.1),u:.03},{at:A(2,0,"first"),u:.35},{at:A(2,0,"second"),u:.8},{at:A(3,0,"Distance"),u:.94}]}],
  flows:[{route:"highway",lane:"against",density:.6,enter:A(1,0),exit:A(3,0,"limit")}],
  cameras:[
   {id:"spot",kind:"pole",route:"highway",u:.15,text:"speed camera",tone:"warn",enter:A(1,0,"speed"),exit:null,textExit:A(2,0,"camera"),reads:"hero",scan:[{at:A(1,0,"brakes"),value:1}]},
   {id:"cam-a",kind:"gantry",route:"highway",u:.35,text:"first",tone:"info",enter:A(1,0,"floors"),exit:null,reads:"hero",scan:[]},
   {id:"cam-b",kind:"gantry",route:"highway",u:.8,text:"second",tone:"warn",enter:A(1,0,"again"),exit:null,reads:"hero",scan:[{at:A(4,0,"moment"),value:.3}]},
  ],
  sections:[{id:"zone",from:"cam-a",to:"cam-b",text:"10 km",tone:"number",enter:A(2,0,"camera"),exit:null}],
  uplinks:[{from:"cam-b",to:"system",tone:"number",enter:A(3,0,"time"),exit:null}],
  traces:[{id:"speed",car:"hero",from:"cam-a",to:"cam-b",enter:A(3,0,"average"),exit:null,
   average:{text:"120",enter:A(3,0,"speed"),exit:null},limit:{ratio:100/120,text:"limit 100",enter:A(3,0,"limit"),exit:null},
   match:{text:"exactly 120",enter:A(4,0,"exactly"),exit:null}}],
 };
}
function plan():IsometricPlan{
 return {version:1,concept:"One highway: a spot camera, two section cameras, the recorded speed and its average.",
  city:{seed:11,skyline:"mixed",parks:.08,traffic:.5},
  routes:[{id:"highway",waypoints:[{c:0,r:-4},{c:0,r:4}],deckLeg:0,style:"main",draw:A(1,0),exit:null,traffic:[]}],
  vehicles:[],
  markers:[{id:"system",kind:"hub",route:"",u:0,bx:-1,bz:1,text:"system",tone:"info",enter:A(3,0,"time"),exit:null,active:[{at:A(3,0,"average"),value:1}]}],
  districts:[],links:[],
  cards:[{id:"avg",label:"average speed",unit:"km/h",icon:"car",route:"",enter:A(3,0,"average"),exit:null,keys:[{at:A(3,0,"average"),value:100,tone:"info",note:""},{at:A(3,0,"of"),value:120,tone:"warn",note:""}]}],
  camera:[{at:A(1,0),x:2,z:-6,zoom:40,azimuth:44},{at:A(2,0,"first"),x:2,z:2,zoom:40,azimuth:45},{at:A(3,0,"Distance"),x:1,z:5,zoom:36,azimuth:46},{at:A(4,0,"moment"),x:1.5,z:4,zoom:38,azimuth:45}],
  notes:["Условная иллюстрация: город и трасса не в масштабе."],
  speedcam:speedcam()};
}
const valid=()=>validateIsometric(plan(),story,alignment,"tiktok-safe",2);

test("speedcam plans validate, stay optional and keep old plans untouched",()=>{
 const p=valid();
 assert.ok(p.speedcam&&p.speedcam.cameras.length===3);
 assert.ok(isometricSchema.safeParse(p).success);
 // Old plans without the field validate exactly as before.
 const old=validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe");
 assert.equal(old.speedcam,undefined);
 // The director's JSON Schema carries the catalog as declarative data only.
 const schema=JSON.stringify(z.toJSONSchema(isometricSchema));
 assert.ok(schema.includes("gantry")&&!/function|script/i.test(schema));
 assert.ok(speedcamSchema.safeParse(speedcam()).success);
 assert.deepEqual(isometricTexts(p).filter(x=>["first","second","10 km","exactly 120"].includes(x)).sort(),["10 km","exactly 120","first","second"]);
});
test("the validator rejects speedcam plans the renderer cannot honour",()=>{
 const cases:[string,(s:SpeedcamPlan)=>void,RegExp][]=[
  ["unknown route",s=>{s.cameras[0].route="nope";},/неизвестном маршруте/],
  ["car drives backwards",s=>{s.cars[0].drive[2].u=.2;},/едет назад/],
  ["camera never passed",s=>{s.cameras[2].u=.97;s.cars[0].drive[3].u=.9;},/не проезжает|конца маршрута/],
  ["read before the camera appears",s=>{s.cameras[1].enter=A(2,0,"plate");},/ещё\/уже не видна/],
  ["too fast",s=>{s.cars[0].drive[2].at=A(2,0,"reads");},/быстрее|ближе 0,4/],
  ["ungrounded tag",s=>{s.cameras[1].text="radar";},/не опирается/],
  ["trace before the second read",s=>{s.traces[0].enter=A(2,0,"camera");},/раньше, чем машина доехала/],
  ["with-flow through the hero",s=>{s.flows[0].lane="with";},/lane "against"/],
  ["section on one camera",s=>{s.sections[0].to="cam-a";},/две разные камеры/],
  ["uplink to nothing",s=>{s.uplinks[0].to="ghost";},/неизвестной метке/],
  ["duplicate id",s=>{s.cameras[1].id="spot";},/повторяется/],
  ["tag gone in a blink",s=>{s.cameras[0].textExit=s.cameras[0].enter;},/не меньше 0,6 с/],
 ];
 for(const [name,mutate,error] of cases){const p=plan();mutate(p.speedcam!);assert.throws(()=>validateIsometric(p,story,alignment,"tiktok-safe",2),error,name);}
});
test("the driven car passes each camera exactly at its read word and brakes with continuous brake lights",()=>{
 const p=valid(),tl=isoTimeline(p,isoWorld(p),scenes,alignment),sc=tl.speedcam!;
 const first=alignment[1].words.find(w=>w.text==="first")!.start,second=alignment[1].words.find(w=>w.text==="second")!.start;
 const a=sc.cameras.find(c=>c.id==="cam-a")!,b=sc.cameras.find(c=>c.id==="cam-b")!;
 assert.ok(Math.abs(a.readAt-first)<1e-3&&Math.abs(b.readAt-second)<1e-3,`${a.readAt} ${b.readAt}`);
 // The flash is at full strength 0.2 s after the read and gone 1.2 s later.
 assert.ok(cameraState(a,a.readAt+.2,sc).flash>.95&&cameraState(a,a.readAt+1.2,sc).flash<.02);
 const curve=driveCurve([{t:0,s:0},{t:2,s:6},{t:4,s:7}]);
 for(let t=0;t<4;t+=1/30)assert.ok(curve.at(t+1/30)>=curve.at(t)-1e-9,"never backwards");
 assert.equal(curve.speed(0),0);assert.equal(curve.speed(4),0);
 const car=sc.cars[0];
 let lit=0;for(let t=first;t<second+1.5;t+=1/30)lit=Math.max(lit,speedcamCarState(car,t).brake);
 assert.ok(lit>.3,`slowing down before the second camera lights the brakes (${lit.toFixed(2)})`);
 // Mean value theorem: at the matched moment the recorded speed equals the average between the two reads.
 const tr=sc.traces[0];assert.ok(tr.match.t>tr.tA&&tr.match.t<tr.tB);
 assert.ok(Math.abs(car.curve.speed(tr.match.t)-tr.average)<1e-3,`${car.curve.speed(tr.match.t)} vs ${tr.average}`);
 assert.ok(tr.limitH<tr.avgH&&tr.avgH<=TRACE_H+1e-9);
 assert.equal(traceState(tr,tr.enterAt-.01).k,0);
});
test("MOTION-RULES: no speedcam object, flash, light or tag switches within one frame",()=>{
 const p=valid(),world=isoWorld(p),tl=isoTimeline(p,world,scenes,alignment);
 let prev=frameScalars(tl,world,0);const seen=new Set<string>();
 for(let f=1;f<tl.frames;f++){
  const cur=frameScalars(tl,world,f/30);
  for(const k of Object.keys(cur)){if(!k.includes(":sc:"))continue;seen.add(k);const d=Math.abs(cur[k]-(prev[k]??cur[k])),c=k[0] as "v"|"p";assert.ok(d<=FRAME_LIMIT[c]+1e-9,`${k} jumps ${d.toFixed(3)} at frame ${f}`);}
  prev=cur;
 }
 for(const k of ["v:sc:cam:cam-a:flash","v:sc:car:hero:brake","v:sc:trace:speed:match","v:sc:section:zone:draw"])assert.ok(seen.has(k),k);
 // Flow cars that leave after the flow's exit do not come back; before the exit they slow down at the pole camera.
 const flow=tl.speedcam!.flows[0],late=flowCars(flow,flow.exitAt+20);assert.ok(late.every(c=>c.k===0));
 let braking=0;for(let t=0;t<8;t+=.1)braking=Math.max(braking,...flowCars(flow,t).map(c=>c.brake*c.k));
 assert.ok(braking>.3,`someone brakes for the spot camera (${braking.toFixed(2)})`);
});
test("catalog tags fade with the camera zoom and on their own exit word, never in one frame",()=>{
 assert.equal(tagZoomFade(30),0);assert.equal(tagZoomFade(44),1);
 for(let z=28;z<72;z+=.1)assert.ok(Math.abs(tagZoomFade(z+.1)-tagZoomFade(z))<.05,"a 0.1 zoom step changes the fade by < 0.05 (camera moves ≤1.5 zoom per frame → ≤0.3)");
 for(let t=0;t<3;t+=1/30)assert.ok(Math.abs(tagExitFade(t+1/30,1)-tagExitFade(t,1))<=.34);
 const p=valid(),tl=isoTimeline(p,isoWorld(p),scenes,alignment),spot=tl.speedcam!.cameras.find(c=>c.id==="spot")!;
 assert.ok(Number.isFinite(spot.textExitAt)&&spot.textExitAt>spot.enterAt);
});
test("occlusion guard keeps gantries visible; sound, music and review follow the new events",()=>{
 const p=valid(),world=isoWorld(p);
 const guard=speedcamGuardPoints(p.speedcam,world.routes);assert.ok(guard.length>20);
 const f=frameOn(world.routes.get("highway")!,.35*world.routes.get("highway")!.L);
 assert.ok(guard.some(q=>Math.abs(q[1]-(f.p[1]+GANTRY.top))<.3));
 for(const b of world.buildings)assert.ok(occlusionCap(b.x-b.w/2,b.x+b.w/2,b.z-b.d/2,b.z+b.d/2,guard,world.guard.rays)>=b.h-1e-9,"no building hides a gantry");
 const tl=isoTimeline(p,world,scenes,alignment),story=isoStoryEvents(tl);
 const a=tl.speedcam!.cameras.find(c=>c.id==="cam-a")!;
 assert.ok(story.some(e=>Math.abs(e.at-a.readAt)<1e-9),"the read flash is a story event");
 assert.ok(isoEventTimes(tl).some(t=>Math.abs(t-tl.speedcam!.traces[0].enterAt)<1e-9),"review frames sample the trace");
});
