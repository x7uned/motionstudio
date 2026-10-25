import {test} from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {validateIsometric,isoWorld,isoTimeline,frameScalars,FRAME_LIMIT,isometricSchema,isometricTexts,isoStoryEvents,isoEventTimes,type IsometricPlan} from "../src/lib/isometric";
import {hexCenter,hexCorners,hexAt,hexDist,gridCells,cellMix,cellShown,driverState,riverCut,parkedSpot,dispatchTexts,RIVER_HALF,dispatchSchema} from "../src/lib/isometric-hex";
import {samplePlan,sampleStory,sampleAlignment} from "./isometric-sample";
import {hexPlan,hexStory,hexAlignment,hexScenes} from "./isometric-hex-sample";
import {reviewFrames,soundCues} from "../src/lib/export-review";

const A=(scene:number,progress:number,cue="")=>({scene,progress,cue});
const valid=()=>validateIsometric(hexPlan(),hexStory,hexAlignment,"tiktok-safe",2);
const storyboard=(iso:IsometricPlan)=>({title:hexStory.title,summary:"",factNotes:"",filmKind:"isometric" as const,isometric:iso,scenes:hexScenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}))});

test("the dispatch layer is optional: old plans validate unchanged, the schema carries no code",()=>{
 const old=validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",2);
 assert.equal(old.dispatch,undefined,"a plan without dispatch stays without it");
 assert.ok(isometricSchema.safeParse({...samplePlan(),dispatch:null}).success,"null means none");
 const plan=valid();assert.ok(plan.dispatch);assert.equal(plan.dispatch!.drivers.length,3);
 const schema=JSON.stringify(z.toJSONSchema(dispatchSchema));
 assert.ok(!/function|script|code|eval/i.test(schema));
 // The world of an old plan is byte-identical (no river cut, same buildings).
 const w0=isoWorld(old),w1=isoWorld(validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",2));
 assert.deepEqual(w0.buildings,w1.buildings);
});
test("hexagon math: centres, corners, neighbours equidistant, point → cell round trip",()=>{
 const g={x:-2,z:-2,size:2};
 const cells=gridCells(3);assert.equal(cells.length,37,"3 rings = 1+6+12+18 cells");
 const [cx,cz]=hexCenter(g,0,0);
 const ns=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([q,r])=>{const [x,z]=hexCenter(g,q,r);return Math.hypot(x-cx,z-cz);});
 for(const d of ns)assert.ok(Math.abs(d-g.size*Math.sqrt(3))<1e-9,"all six neighbours sit at the same distance");
 for(const c of cells){const [x,z]=hexCenter(g,c.q,c.r);assert.deepEqual(hexAt(g,x,z),{q:c.q,r:c.r});assert.equal(hexDist(c.q,c.r),c.d);
  for(const [px,pz] of hexCorners(g,c.q,c.r,.8))assert.deepEqual(hexAt(g,px,pz),{q:c.q,r:c.r},"points inside a cell map back to it");}
});
test("the validator rejects dispatch plans the renderer cannot honour",()=>{
 const cases:[string,(p:IsometricPlan)=>void,RegExp][]=[
  ["route over water",p=>{p.dispatch!.river!.bridges=[3];},/не по мосту/],
  ["against one-way",p=>{p.dispatch!.oneWay[0].from=-1;p.dispatch!.oneWay[0].to=1;},/против одностороннего/],
  ["driver in the river",p=>{const d=p.dispatch!.drivers[0];d.axis="z";d.c=-2;d.r=-2;d.off=1.2;},/в реке/],
  ["drivers on top of each other",p=>{const a=p.dispatch!.drivers[0],b=p.dispatch!.drivers[2];Object.assign(b,{c:a.c,r:a.r,axis:a.axis,off:a.off,dir:a.dir});},/друг на друге/],
  ["line to nowhere",p=>{p.dispatch!.lines[0].to="ghost";},/неизвестный объект/],
  ["ungrounded tag",p=>{p.dispatch!.drivers[0].tags[0].text="teleport";},/не опирается/],
  ["cells before the grid",p=>{p.dispatch!.grid!.marks[0].at=A(1,0,"tap");},/раньше, чем сетка/],
  ["cell outside the grid",p=>{p.dispatch!.grid!.marks[0].q=5;},/вне нарисованной сетки/],
  ["parked driver with drive keys",p=>{p.dispatch!.drivers[0].drive=[{at:A(2,0,"map"),u:.2}];},/drive должен быть пустым/],
  ["too fast",p=>{const d=p.dispatch!.drivers[1];d.drive=[{at:A(4,0,"pairs"),u:0},{at:A(4,0,"total"),u:1}];},/быстрее/],
  ["backwards",p=>{const d=p.dispatch!.drivers[1];d.drive=[{at:A(4,0,"pairs"),u:.8},{at:A(4,0,"everyone"),u:.2}];},/назад/],
  ["state before entry",p=>{p.dispatch!.drivers[2].states[0].at=A(1,0,"tap");},/раньше, чем появился/],
  ["one-frame line",p=>{const l=p.dispatch!.lines[1];l.exit=l.enter;},/не в одном кадре/],
  ["id clash with a route",p=>{p.dispatch!.drivers[1].id="pick";},/повторяется/],
  ["ping from nowhere",p=>{p.dispatch!.pings![0].target="ghost";},/неизвестный объект/],
  ["line outlives its driver",p=>{p.dispatch!.drivers[0].exit=A(4,0,"swaps");},/ещё\/уже нет/],
 ];
 for(const [name,mutate,error] of cases){const p=hexPlan();mutate(p);assert.throws(()=>validateIsometric(p,hexStory,hexAlignment,"tiktok-safe",2),error,name);}
});
test("the river cuts one block row: no buildings, plates or markings on the water, lanes cross only on bridges",()=>{
 const plan=valid(),world=isoWorld(plan),cut=riverCut(plan.dispatch)!;
 assert.equal(cut.centre,-4);
 for(const b of world.buildings)assert.ok(Math.abs(b.z-cut.centre)>RIVER_HALF+.2,`building at ${b.x},${b.z} stands in the river`);
 for(const p of world.plates)assert.ok(Math.abs(p.z-cut.centre)>RIVER_HALF,`plate at ${p.x},${p.z} lies on the water`);
 for(const d of world.dashes)assert.ok(!cut.inBand(d.x,d.z),"no street marking on the water");
 for(const c of world.cars)if(c.axis==="z")assert.ok(cut.bridges.some(b=>Math.abs(b-c.c)<1e-6),`a background lane crosses the river at x=${c.c} without a bridge`);
 assert.ok(world.cars.length>0,"the rest of the city keeps its traffic");
 // Parked drivers stay in their lane on the embankment street, clear of the water.
 for(const d of plan.dispatch!.drivers.filter(d=>!d.route)){const s=parkedSpot(d).p;assert.ok(!cut.wet(s[0],s[2]),d.id);}
});
test("MOTION-RULES: grid waves, driver states, tags and lines never switch within one frame",()=>{
 const plan=valid(),world=isoWorld(plan),tl=isoTimeline(plan,world,hexScenes,hexAlignment);
 assert.ok(tl.dispatch);
 let prev=frameScalars(tl,world,0),seen=new Set<string>(),spans=new Map<string,{from:number;to:number}>();
 for(let f=1;f<tl.frames;f++){
  const cur=frameScalars(tl,world,f/30);
  for(const k of Object.keys(cur)){
   const d=Math.abs(cur[k]-(prev[k]??cur[k])),c=k[0] as "v"|"p";
   assert.ok(d<=FRAME_LIMIT[c]+1e-9,`${k} jumps ${d.toFixed(3)} at frame ${f}`);
   if(k.includes(":dx:")&&d>1e-6)seen.add(k.split(":").slice(0,3).join(":"));
   if(c==="v"&&k.includes(":dx:")){const s=spans.get(k);if((prev[k]??0)<.02&&cur[k]>=.02)spans.set(k,{from:f-1,to:Infinity});else if(s&&s.to===Infinity&&cur[k]>=.98)s.to=f;}
  }
  prev=cur;
 }
 for(const [k,s] of spans)if(s.to!==Infinity)assert.ok(s.to-s.from>=3,`${k} enters in ${s.to-s.from} frames`);
 for(const kind of ["v:dx:cell","v:dx:driver","v:dx:line","v:dx:oneway","v:dx:ping","p:dx:driver"])assert.ok(seen.has(kind),`${kind} actually changes`);
 // The rider cell lights after its word and the neighbour ring follows in a wave (0.12 s per ring).
 const g=tl.dispatch!.grid!,focus=g.marks.find(m=>m.state==="focus")!;
 assert.equal(cellMix(g,0,0,focus.at-.01)[2],0);assert.ok(cellMix(g,0,0,focus.at+.6)[2]>.95);
 assert.ok(cellShown(g,3,g.enterAt+.1)<cellShown(g,0,g.enterAt+.1),"the grid grows from its centre");
 // The chosen car drives smoothly and stops where its keys say.
 const car=tl.dispatch!.drivers.find(d=>d.id==="driver")!;
 assert.ok(Math.abs(driverState(car,car.keys.at(-1)!.t+1).s-.82*car.path!.L)<1e-6);
});
test("occlusion guard and framing include the drivers",()=>{
 const plan=valid(),world=isoWorld(plan);
 for(const d of plan.dispatch!.drivers.filter(d=>!d.route)){const p=parkedSpot(d).p;assert.ok(world.guard.points.some(q=>Math.hypot(q[0]-p[0],q[2]-p[2])<1e-6&&q[1]>.5),`${d.id} is guarded`);}
 const far=hexPlan();Object.assign(far.dispatch!.drivers[0],{c:-7,r:6});Object.assign(far.dispatch!.drivers[2],{c:6,r:-7});far.camera=[far.camera[0]];far.dispatch!.lines=[];
 assert.throws(()=>validateIsometric(far,hexStory,hexAlignment,"tiktok-safe",2),/вне безопасной зоны|водитель far/);
});
test("screen texts, sound, music and review frames follow the dispatch events",()=>{
 const iso=valid(),plan=storyboard(iso) as any;
 assert.deepEqual(dispatchTexts(iso.dispatch),["closer","straight line"]);
 assert.ok(isometricTexts(iso).includes("straight line"));
 const tl=isoTimeline(iso,isoWorld(iso),hexScenes,hexAlignment);
 const story=isoStoryEvents(tl);
 assert.ok(story.some(e=>e.kind==="district"&&e.tone==="ok"),"a supply ring is an ok accent");
 assert.ok(story.some(e=>e.kind==="pin"&&e.tone==="ok"),"a chosen driver is an ok accent");
 const sheet=soundCues(plan,hexAlignment);
 for(const [i,c] of sheet.cues.entries())for(const d of sheet.cues.slice(i+1))if(d.effect===c.effect)assert.ok(Math.abs(d.at-c.at)>=3-1e-6,"same sound at most every 3 s");
 const frames=reviewFrames(plan,hexAlignment);
 for(const t of isoEventTimes(tl))assert.ok(frames.eventTimes.some(e=>Math.abs(e-t)<1e-9),`review samples the event at ${t}`);
});
