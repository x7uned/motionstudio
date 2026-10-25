import {test} from "node:test";
import assert from "node:assert/strict";
import {validateIllustrated,type IllustratedPlan} from "../src/lib/illustrated";
import {findMedia,mediaAssetSchema,type MediaAsset} from "../src/lib/media-contract";
import {faceCrop} from "../src/lib/media-assets";
import {validateVisualConcept} from "../src/lib/visual-contract";
import {prepareIllustrated} from "../src/lib/illustrated-director";
import {z} from "zod";
import {illustratedSchema} from "../src/lib/illustrated";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Real logo / photo tiles (user decision 2026-10-21): only from the project's media snapshot, only for names the narration says.
const PID="5f18607c-896c-415e-99d2-5f433a54dc70";
const asset=(subject:string,kind:"logo"|"person"):MediaAsset=>mediaAssetSchema.parse({id:`${kind}-${subject.toLowerCase().replace(/\W+/g,"-")}-0000aaaa`,kind,subject,file:`${PID}/media/${kind}-x-0000aaaa.${kind==="logo"?"png":"jpg"}`,sha256:"a".repeat(64),width:512,height:512,
 source:{wikidata:"Q95",label:subject,description:"",property:kind==="logo"?"P8972":"P18",commonsFile:"x.svg",page:"https://commons.wikimedia.org/wiki/File:x.svg",license:"Public domain",licenseUrl:"",artist:"",credit:"",restrictions:"trademarked",attributionRequired:false,date:"",retrievedAt:new Date().toISOString()}});
const scenes=[
 {seconds:5,title:"Price",subtitle:"",items:[],narration:"By the end of the first day, Facebook and Google alone would have lost money."},
 {seconds:5,title:"Clock",subtitle:"",items:[],narration:"The answer came from a self-taught clockmaker, John Harrison."},
];
const alignment=[{words:[{text:"By",start:.1,end:.3},{text:"Facebook",start:1.2,end:1.6},{text:"Google",start:1.9,end:2.3},{text:"lost",start:3,end:3.3}]},{words:[{text:"John",start:6.2,end:6.5},{text:"Harrison.",start:6.5,end:7}]}];
const A=(scene:number,cue="",progress=0)=>({scene,progress,cue});
const o=(id:string,kind:any,x:number,y:number,label="",enter=A(1))=>({id,kind,x,y,scale:1,label,aim:"",rows:1,cols:2,enter,exit:null,active:[],moves:[]});
const plan=():IllustratedPlan=>({version:1,concept:"Logos over the price",floorY:1400,
 objects:[o("dial","day-dial",800,1200),o("fb","logo-tile",700,800,"Facebook",A(1,"Facebook")),o("gg","logo-tile",960,800,"Google",A(1,"Google")),o("jh","person-tile",900,800,"John Harrison",A(2,"John"))],
 flows:[],callouts:[],camera:[{at:A(1),x:830,y:1000,zoom:.9}],mode:[],bigWords:[],notes:[]});

test("logo/person tiles need a media snapshot with the same name and kind",()=>{
 const story={title:"T",summary:"",scenes};
 assert.throws(()=>validateIllustrated(plan(),story,alignment),/нет снимка в media/);
 const media=[asset("Facebook","logo"),asset("Google","logo"),asset("John Harrison","person")];
 assert.equal(validateIllustrated(plan(),{...story,media},alignment).objects.length,4);
 assert.throws(()=>validateIllustrated(plan(),{...story,media:[asset("Facebook","logo"),asset("Google","person"),asset("John Harrison","person")]},alignment),/logo-tile «Google»/);
 const unnamed=plan();unnamed.objects[1].label="";
 assert.throws(()=>validateIllustrated(unnamed,{...story,media},alignment),/требует label/);
});
test("the director schema offers tiles only when the prompt catalog does (no media → no tile kinds)",async()=>{
 // Cost experiment 2026-10-25: the concept recommended a Cloudflare logo, the snapshot had none, and every first attempt failed on logo-tile.
 const firstCall=async(story:any)=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"motion-studio-director-"));let seen:any;
  const ask=(async(prompt:string,schema:unknown)=>{seen={prompt,schema};throw new Error("captured");}) as any;
  try{await assert.rejects(prepareIllustrated(story,dir,alignment,new AbortController().signal,ask),/captured/);}finally{await fs.rm(dir,{recursive:true,force:true});}
  const context=JSON.parse(seen.prompt.slice(seen.prompt.indexOf("<CONTEXT>")+9,seen.prompt.indexOf("</CONTEXT>")));
  return {schema:seen.schema,enum:seen.schema.properties.objects.items.properties.kind.enum as string[],catalog:context.catalog.map((c:any)=>c.kind) as string[]};
 };
 const full=z.toJSONSchema(illustratedSchema) as any,concept={media:[{subject:"Facebook",kind:"logo",scene:1,reason:"recognise the company"}]};
 const bare=await firstCall({title:"T",summary:"",scenes,visualConcept:concept});
 assert.ok(!bare.enum.includes("logo-tile")&&!bare.enum.includes("person-tile"));
 assert.deepEqual(bare.enum,bare.catalog,"schema enum = prompt catalog");
 bare.schema.properties.objects.items.properties.kind.enum=full.properties.objects.items.properties.kind.enum;
 assert.equal(JSON.stringify(bare.schema),JSON.stringify(full),"only the kind enum differs");
 const media=[asset("Facebook","logo")],withMedia=await firstCall({title:"T",summary:"",scenes,visualConcept:concept,media});
 assert.equal(JSON.stringify(withMedia.schema),JSON.stringify(full),"projects with media keep the old schema byte for byte");
 assert.ok(withMedia.catalog.includes("logo-tile")&&withMedia.enum.includes("person-tile"));
});
test("media lookup ignores case and punctuation but not kind",()=>{
 const media=[asset("John Harrison","person")];
 assert.ok(findMedia(media,"john harrison","person"));assert.ok(findMedia(media,"John-Harrison","person"));
 assert.equal(findMedia(media,"John Harrison","logo"),undefined);
});
test("portraits are cropped to a square around the largest face, inside the image",()=>{
 const c=faceCrop(355,443,[{x:.46,y:.21,width:.18,height:.14},{x:.1,y:.7,width:.05,height:.04}]);
 assert.equal(c.face,true);assert.ok(c.size<=355&&c.left>=0&&c.top>=0&&c.left+c.size<=355&&c.top+c.size<=443);
 const cx=c.left+c.size/2,fx=(.46+.09)*355;assert.ok(Math.abs(cx-fx)<c.size*.25,"face stays near the middle");
 assert.deepEqual(faceCrop(400,600,[]),{left:0,top:0,size:400,face:false});
 assert.deepEqual(faceCrop(600,400,[]),{left:100,top:0,size:400,face:false});
});
test("the visual concept may recommend media only for names the narration says",()=>{
 const concept={version:1,idea:"One room with the day dial and the price of a dark day for the companies named.",renderer:"2d",hero:"dial",visualLanguage:"Prepared illustrated objects in the studio palette.",
  objects:[{id:"dial",name:"Day dial",purpose:"time",representation:"diagram",requiredDetails:["dial"],factIds:[]}],
  scenes:[0,1,2,3].map(i=>({scene:i+1,understanding:"The price of one day.",show:"The dial and the two company tiles.",change:"Tiles appear.",objectIds:["dial"],cutaway:false,labels:[]})),
  limitations:[],media:[{subject:"Facebook",kind:"logo",scene:1,reason:"recognise the company"},{subject:"John Harrison",kind:"person",scene:2,reason:"who"}]};
 const narrations=[...scenes.map(s=>s.narration),"Then the day ends.","Follow the channel."];
 assert.equal(validateVisualConcept(concept,4,[],narrations).media?.length,2);
 assert.throws(()=>validateVisualConcept({...concept,media:[{subject:"Apple",kind:"logo",scene:1,reason:"x"}]},4,[],narrations),/не названо в тексте/);
 const {media,...old}=concept;assert.equal(validateVisualConcept(old,4,[],narrations).media,undefined,"old concepts stay valid without media");
});
