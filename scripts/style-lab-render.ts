// Style lab: render one prepared style composition to MP4 + 6 keyframes + a labelled 3×2 contact sheet.
// Usage: node --import tsx scripts/style-lab-render.ts <style> [--stills-only] [--frames 0.8,3,6,9,11.8,14.2]
// Entry: renderer/style-lab/<style>/index.tsx must registerRoot() a Composition with id "StyleLab".
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {bundle} from "@remotion/bundler";
import {renderMedia,renderStill,selectComposition} from "@remotion/renderer";
import {CHROME,FFMPEG,run} from "../src/lib/provider";

const ROOT=process.cwd();
async function main(){
 const style=process.argv[2];
 if(!style||!/^[a-z0-9-]+$/.test(style))throw new Error("style-lab-render <style>");
 const stillsOnly=process.argv.includes("--stills-only");
 const fi=process.argv.indexOf("--frames");
 const times=(fi>0?process.argv[fi+1]:"0.8,3,6,9,11.8,14.2").split(",").map(Number);
 const entryPoint=path.join(ROOT,"renderer","style-lab",style,"index.tsx");
 const out=path.join(ROOT,"work","style-lab",style);await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundle({entryPoint,outDir:path.join(ROOT,".runtime","style-lab-bundles",style)});
 const chromiumOptions={gl:"angle" as const};
 const composition=await selectComposition({serveUrl,id:"StyleLab",inputProps:{},browserExecutable:CHROME,chromiumOptions});
 const tiles:Buffer[]=[];
 for(const t of times){
  const frame=Math.min(composition.durationInFrames-1,Math.round(t*composition.fps));
  const file=path.join(out,`frame-${t.toFixed(1)}s.png`);
  await renderStill({composition,serveUrl,inputProps:{},frame,output:file,browserExecutable:CHROME,chromiumOptions});
  const label=Buffer.from(`<svg width="360" height="44"><rect width="360" height="44" fill="#0f172a"/><text x="14" y="30" font-size="24" font-family="Helvetica" fill="white">${t.toFixed(1)} с · кадр ${frame}</text></svg>`);
  tiles.push(await sharp(file).resize(360,640).extend({bottom:44,background:"#0f172a"}).composite([{input:label,top:640,left:0}]).png().toBuffer());
  console.log(file);
 }
 await sharp({create:{width:1080,height:2*684,channels:3,background:"#0f172a"}}).composite(tiles.slice(0,6).map((input,i)=>({input,left:(i%3)*360,top:Math.floor(i/3)*684}))).jpeg({quality:88}).toFile(path.join(out,"contact-sheet.jpg"));
 console.log(path.join(out,"contact-sheet.jpg"));
 if(stillsOnly)return;
 const video=path.join(out,"video.mp4");
 await renderMedia({composition,serveUrl,inputProps:{},codec:"h264",outputLocation:video,browserExecutable:CHROME,chromiumOptions,concurrency:2,pixelFormat:"yuv420p",crf:18,muted:true});
 const probe=await run(FFMPEG,["-hide_banner","-i",video],{timeout:30000,combined:true}).catch((e:any)=>String(e.message));
 console.log(video,/Duration: [^,]+/.exec(probe)?.[0]??"");
}
main().catch(e=>{console.error(e instanceof Error?e.stack:e);process.exit(1);});
