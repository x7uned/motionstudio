// A fixed isometric/v1 plan with the dispatch catalog (hexagon grid, river, one-way street, drivers, lines) for tests and
// local previews; no TTS, no model calls. Synthetic word times, illustrative story.
import type {IsometricPlan} from "../src/lib/isometric";

const A=(scene:number,progress:number,cue="",cueOccurrence?:number)=>({scene,progress,cue,...(cueOccurrence?{cueOccurrence}:{})});
export const hexScenes=[
 {seconds:6,title:"The request",subtitle:"",items:[],narration:"You tap Request and a driver is chosen in a second, often not the closest car on the map."},
 {seconds:6,title:"The hexagons",subtitle:"",items:[],narration:"The map is split into hexagons, so the system checks your cell and the ring around it for cars."},
 {seconds:7,title:"The river",subtitle:"",items:[],narration:"A car across the river looks closer in a straight line, but its road loops to the bridge and a one way street."},
 {seconds:7,title:"The batch",subtitle:"",items:[],narration:"With two riders and two drivers, matching them as a batch swaps the pairs and cuts the total wait for everyone."},
];
const words=(i:number,start:number)=>{const list=hexScenes[i].narration.split(" ").map((w,k)=>({text:w,start:start+.25+k*.3,end:start+.5+k*.3}));
 return {scene:i+1,start:list[0].start,end:list.at(-1)!.end,sceneEnd:start+hexScenes[i].seconds,speed:1,text:hexScenes[i].narration,words:list};};
export const hexAlignment=[words(0,0),words(1,6),words(2,12),words(3,19)];
export const hexStory={title:"How a ride app picks your driver",summary:"",scenes:hexScenes};
export function hexPlan():IsometricPlan{
 return {version:1,concept:"One city by a river: a rider pin, nearby drivers, a hexagon grid, a straight line that lies, and a batch that swaps two pairs.",
  city:{seed:31,skyline:"low",parks:.06,traffic:.35},
  routes:[
   // The car across the river: the real road goes east to the bridge, crosses and comes back west.
   {id:"loop",waypoints:[{c:-1,r:-2},{c:1,r:-2},{c:1,r:-1},{c:-1,r:-1}],deckLeg:-1,style:"alt",draw:A(3,0,"road"),exit:A(4,0,"drivers"),traffic:[]},
   // The chosen car drives down its street to the rider.
   {id:"pick",waypoints:[{c:-1,r:1},{c:-1,r:-1}],deckLeg:-1,style:"main",draw:A(1,0,"chosen"),exit:null,traffic:[]},
  ],
  vehicles:[],
  markers:[
   {id:"you",kind:"pin",route:"pick",u:1,bx:0,bz:0,text:"YOU",tone:"info",enter:A(1,0,"tap"),exit:null,active:[]},
   {id:"rider",kind:"pin",route:"",u:0,bx:2,bz:0,text:"riders",tone:"number",enter:A(4,0,"riders"),exit:null,active:[]},
  ],
  districts:[],links:[],
  cards:[],
  camera:[
   {at:A(1,0),x:-1,z:-1,zoom:42,azimuth:45},
   {at:A(2,0,"hexagons"),x:-2,z:-2,zoom:46,azimuth:44},
   {at:A(3,0,"river"),x:0,z:-3,zoom:44,azimuth:46},
   {at:A(4,0,"two"),x:2,z:-1,zoom:40,azimuth:45},
  ],
  notes:["Условная иллюстрация: город процедурный, не в масштабе, не реальная карта и не интерфейс сервиса."],
  dispatch:{
   grid:{x:-2,z:-2,size:2,rings:3,enter:A(2,0,"hexagons"),exit:A(3,0,"straight"),
    marks:[{at:A(2,0,"cell"),q:0,r:0,from:0,to:0,state:"focus"},{at:A(2,0,"ring"),q:0,r:0,from:1,to:1,state:"ring"},{at:A(2,0,"cars"),q:0,r:0,from:1,to:1,state:"supply"}]},
   river:{axis:"x",line:-1,bridges:[1]},
   oneWay:[{id:"oneway",axis:"x",street:-1,from:1,to:-1,enter:A(3,0,"one"),exit:A(4,0,"batch")}],
   drivers:[
    {id:"near",route:"",c:-1,r:-2,axis:"x",off:.6,dir:"+",enter:A(1,0,"driver"),exit:null,drive:[],
     states:[{at:A(1,0,"closest"),state:"candidate"},{at:A(3,0,"loops"),state:"dim"},{at:A(4,0,"batch"),state:"idle"}],tags:[{at:A(3,0,"closer"),text:"closer",tone:"warn"},{at:A(4,0,"With"),text:"",tone:"info"}]},
    {id:"driver",route:"pick",c:0,r:0,axis:"x",off:0,dir:"+",enter:A(1,0,"driver"),exit:null,drive:[{at:A(4,0,"pairs"),u:.08},{at:A(4,0,"everyone"),u:.82}],
     states:[{at:A(1,0,"chosen"),state:"chosen"}],tags:[]},
    {id:"far",route:"",c:2,r:-1,axis:"x",off:-1,dir:"-",enter:A(4,0,"drivers"),exit:null,drive:[],states:[{at:A(4,0,"batch"),state:"candidate"},{at:A(4,0,"swaps"),state:"chosen"}],tags:[]},
   ],
   lines:[
    {id:"crow",from:"near",to:"you",style:"crow",tone:"warn",text:"straight line",enter:A(3,0,"straight"),exit:A(4,0,"With")},
    {id:"pair-a",from:"far",to:"rider",style:"assign",tone:"info",text:"",enter:A(4,0,"matching"),exit:A(4,0,"swaps")},
    {id:"pair-b",from:"near",to:"rider",style:"assign",tone:"ok",text:"",enter:A(4,0,"pairs"),exit:null},
   ],
   pings:[{at:A(1,0,"Request"),target:"you",tone:"info"},{at:A(4,0,"riders"),target:"rider",tone:"number"}],
  },
 } as IsometricPlan;
}
