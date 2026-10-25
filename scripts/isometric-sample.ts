// A fixed isometric/v1 plan that exercises every prepared object (tests and local previews; no TTS, no model calls).
import type {IsometricPlan} from "../src/lib/isometric";

const A=(scene:number,progress:number,cue="",cueOccurrence?:number)=>({scene,progress,cue,...(cueOccurrence?{cueOccurrence}:{})});
export const sampleScenes=[
 {seconds:5,title:"The route",subtitle:"",items:["18 min"],narration:"Maps plans your route through the city so you arrive in 18 minutes."},
 {seconds:6,title:"The jam",subtitle:"",items:["+7","25 min"],narration:"Then phones on the bridge slow down, the map sees a jam ahead and adds 7 minutes: 25 in total."},
 {seconds:6,title:"The signal",subtitle:"",items:["towers"],narration:"Every phone pings the towers, and the towers send the speeds to the data center."},
 {seconds:5,title:"The fix",subtitle:"",items:["clear"],narration:"When the jam clears, the bridge turns lavender again and the lights come back."},
];
const words=(i:number,start:number)=>{const list=sampleScenes[i].narration.split(" ").map((w,k)=>({text:w,start:start+.3+k*.32,end:start+.58+k*.32}));
 return {scene:i+1,start:list[0].start,end:list.at(-1)!.end,sceneEnd:start+sampleScenes[i].seconds,speed:1,text:sampleScenes[i].narration,words:list};};
export const sampleAlignment=[words(0,0),words(1,5),words(2,11),words(3,17)];
export const sampleStory={title:"How maps predict traffic",summary:"",scenes:sampleScenes};
export function samplePlan():IsometricPlan{
 return {version:1,concept:"One city: a route over the bridge, a jam the phones reveal, towers report speeds to a data centre, the jam clears.",
  city:{seed:7,skyline:"mixed",parks:.08,traffic:.6},
  routes:[
   {id:"route",waypoints:[{c:1,r:2},{c:1,r:1},{c:0,r:1},{c:0,r:-2},{c:-1,r:-2},{c:-1,r:-3}],deckLeg:2,style:"main",draw:A(1,0,"plans"),exit:null,
    traffic:[{at:A(2,0,"slow"),from:.35,to:.75,state:"slow"},{at:A(2,0,"jam"),from:.45,to:.62,state:"jam"},{at:A(4,0,"clears"),from:.3,to:.8,state:"free"}]},
   {id:"detour",waypoints:[{c:1,r:1},{c:2,r:1},{c:2,r:-2},{c:-1,r:-2}],deckLeg:-1,style:"alt",draw:A(2,0,"adds"),exit:A(3,0,"data"),traffic:[]},
  ],
  vehicles:[{id:"hero",route:"route",tone:"hero",enter:A(1,.04),go:A(1,0,"route"),exit:null}],
  markers:[
   {id:"now",kind:"pin",route:"route",u:0,bx:0,bz:0,text:"NOW",tone:"info",enter:A(1,0,"Maps"),exit:A(2,0,"Then"),active:[]},
   {id:"dest",kind:"beacon",route:"route",u:1,bx:0,bz:0,text:"arrive",tone:"number",enter:A(1,0,"city"),exit:null,active:[]},
   {id:"jampin",kind:"alert",route:"route",u:.53,bx:0,bz:0,text:"jam",tone:"warn",enter:A(2,0,"jam"),exit:A(4,0,"clears"),active:[{at:A(2,0,"jam"),value:1}]},
   {id:"tower",kind:"tower",route:"",u:0,bx:-1,bz:0,text:"towers",tone:"info",enter:A(3,0,"towers"),exit:null,active:[{at:A(3,0,"pings"),value:1},{at:A(4,0,"clears"),value:.3}]},
   {id:"dc",kind:"hub",route:"",u:0,bx:1,bz:-1,text:"data center",tone:"info",enter:A(3,0,"data"),exit:null,active:[{at:A(3,0,"center"),value:1}]},
  ],
  districts:[{id:"block",bx:0,bz:-2,radius:2,keys:[{at:A(2,0,"jam"),state:"dark"},{at:A(4,0,"lights"),state:"normal"}]}],
  links:[{from:"tower",to:"dc",tone:"number",enter:A(3,0,"send"),exit:A(4,0,"lights")}],
  cards:[
   {id:"eta",label:"arrive in",unit:"min",icon:"clock",route:"route",enter:A(1,0,"Maps"),exit:A(3,0,"Every"),keys:[{at:A(1,0,"Maps"),value:18,tone:"info",note:""},{at:A(2,0,"adds"),value:25,tone:"number",note:"+7"}]},
   {id:"speeds",label:"speeds",unit:"",icon:"signal",route:"",enter:A(3,.25,"towers"),exit:null,keys:[{at:A(3,.25,"towers"),value:7,tone:"warn",note:""},{at:A(4,0,"clears"),value:18,tone:"ok",note:""}]},
  ],
  camera:[
   {at:A(1,0),x:4,z:3,zoom:44,azimuth:39},
   {at:A(2,0,"bridge"),x:1.4,z:-1,zoom:52,azimuth:44},
   {at:A(3,0,"towers"),x:0,z:-2,zoom:46,azimuth:47},
   {at:A(4,0,"clears"),x:1,z:0,zoom:40,azimuth:45},
  ],
  notes:["Условная иллюстрация: город процедурный и не в масштабе."]};
}
