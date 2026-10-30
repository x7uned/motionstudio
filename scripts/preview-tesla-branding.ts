import path from "node:path";
import fs from "node:fs/promises";
import {bundle} from "@remotion/bundler";
import {bundleLive} from "../src/lib/remotion-bundle";
import {selectComposition,renderStill} from "@remotion/renderer";
import {ROOT,DATA,project} from "../src/lib/store";
import {CHROME} from "../src/lib/provider";
import {sceneClock} from "../src/lib/model";
async function main(){
 const manifest=JSON.parse(await fs.readFile(path.join(DATA,"productions/2026-10-18-tesla-branding/manifest.json"),"utf8")),p=project(manifest.id)!;
 const dir=path.join(DATA,"projects",p.id),output=path.join(DATA,"productions/2026-10-18-tesla-branding/previews");await fs.mkdir(output,{recursive:true});
 const alignment=JSON.parse(await fs.readFile(path.join(DATA,"projects",manifest.sourceId,"alignment.json"),"utf8"));
 const props={plan:p.plan!,profile:p.profile,format:p.format,models:[],alignment,modelBase:`${p.id}/models`};
 const serveUrl=await bundleLive({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:path.join(DATA,"projects")});
 const comp=await selectComposition({serveUrl,id:"StudioFilm",inputProps:props,browserExecutable:CHROME,chromiumOptions:{gl:"angle"}});
 const start=sceneClock(p.plan!).at(-1)!.start;
 for(const [name,at] of [["outro",start+2],["main",17]] as const){await renderStill({serveUrl,composition:comp,inputProps:props,frame:Math.round(at*30),output:path.join(output,`${name}.png`),scale:.5,browserExecutable:CHROME,chromiumOptions:{gl:"angle"}});console.log(name,at);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
