// Preview stills of a netcode film: node --import tsx scripts/netcode-preview.ts <project-id> <netcode-plan.json> <out-dir> <seconds...>
import fs from "node:fs/promises";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {selectComposition,renderStill} from "@remotion/renderer";
import sharp from "sharp";
import {DATA,ROOT} from "../src/lib/store";
import {CHROME} from "../src/lib/provider";
import {validateNetcode} from "../src/lib/netcode";
import {verifyModelSnapshot} from "../src/lib/model-assets";

async function main(){
 const [id,planFile,out,...times]=process.argv.slice(2);
 const dir=path.join(DATA,"projects",id);
 const storyboard=JSON.parse(await fs.readFile(path.join(dir,"storyboard.json"),"utf8"));
 const alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
 const netcode=validateNetcode(JSON.parse(await fs.readFile(planFile,"utf8")),storyboard.scenes,alignment);
 const plan={...storyboard,filmKind:"netcode",netcode};delete plan.world3d;
 const profile=JSON.parse(await fs.readFile(path.join(dir,"context.json"),"utf8")).profile;
 const props={plan,profile,format:"9:16",alignment,models:verifyModelSnapshot(dir),modelBase:`${id}/models`};
 await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer","index.tsx"),publicDir:path.join(DATA,"projects"),symlinkPublicDir:true});
 const comp=await selectComposition({serveUrl,id:"StudioFilm",inputProps:props,browserExecutable:CHROME,chromiumOptions:{gl:"angle"}});
 const thumbs:Buffer[]=[];
 for(const s of times){
  const frame=Math.min(comp.durationInFrames-1,Math.round(Number(s)*30)),file=path.join(out,`t${String(s).replace(".","_")}.png`);
  await renderStill({composition:comp,serveUrl,inputProps:props,output:file,frame,browserExecutable:CHROME,chromiumOptions:{gl:"angle"},scale:.5});
  thumbs.push(await sharp(file).extract({left:0,top:0,width:540,height:660}).composite([{input:Buffer.from(`<svg width="540" height="40"><rect width="120" height="40" fill="#000"/><text x="10" y="28" font-size="24" fill="#F4CA50" font-family="Arial">${s}s</text></svg>`),top:620,left:0}]).png().toBuffer());
  console.log(`still ${s}s`);
 }
 const cols=4,rows=Math.ceil(thumbs.length/cols);
 await sharp({create:{width:cols*540,height:rows*660,channels:3,background:"#222"}}).composite(thumbs.map((input,i)=>({input,left:i%cols*540,top:Math.floor(i/cols)*660}))).jpeg({quality:85}).toFile(path.join(out,"sheet.jpg"));
 console.log(path.join(out,"sheet.jpg"));
}
main().catch(e=>{console.error(e);process.exit(1);});
