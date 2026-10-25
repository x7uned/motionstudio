// Draws the 9:16 safe zones (video-design/safe-zones.json, docs/safe-zones.md) over a frame, for review.
// node scripts/safe-zones-overlay.mjs <frame.png|jpg> <out.png>   — zones over a real frame (any 9:16 size, scaled by width)
// node scripts/safe-zones-overlay.mjs --blank <out.png>            — transparent 1080×1920 overlay only
// --violations <safe-zones.json> [--at <seconds>]                  — also outline the review's findings (the report in
//   data/projects/<id>/quality/<hash>/safe-zones.json or safe-zones-plan.json) at that second (all of them without --at)
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import sharp from "sharp";

const Z=JSON.parse(readFileSync(fileURLToPath(new URL("../video-design/safe-zones.json",import.meta.url)),"utf8"));
const COLORS={ui:"#FF3B30",captions:"#2F80FF",caution:"#FFC400",edge:"#B36BFF",main:"#2BD46A"};
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);if(i<0)return undefined;const v=args[i+1];args.splice(i,2);return v;};
const violationsFile=option("--violations"),atArg=option("--at");
const [input,out]=args;
if(!input||!out||violationsFile===""){console.error("usage: safe-zones-overlay.mjs <frame|--blank> <out.png> [--violations <safe-zones.json> [--at <seconds>]]");process.exit(1);}
// Review report (violations from OCR of the final MP4) and/or plan warnings; boxes are 1080×1920 frame pixels.
const report=violationsFile?JSON.parse(readFileSync(violationsFile,"utf8")):null;
const at=atArg===undefined?undefined:Number(atArg);
const marks=report?[...(report.violations??[]).map(v=>({...v,label:`${v.zone} · «${v.text}»`})),...((report.plan?.warnings??report.warnings)??[]).map(w=>({...w,label:`план · ${w.zone??"вне главной"} · ${w.what}`}))]
 .filter(v=>at===undefined||Math.abs(v.at-at)<=.02):[];
if(report)console.log(`${marks.length} marks${at===undefined?"":` at ${at} s`}`);

const blank=input==="--blank";
const meta=blank?{width:Z.frame.width,height:Z.frame.height}:await sharp(input).metadata();
const W=meta.width,H=meta.height,k=W/Z.frame.width;
if(Math.abs(H/W-16/9)>0.01)console.warn(`warning: frame ${W}×${H} is not 9:16`);
const r=(b,fill,stroke,dash="")=>`<rect x="${b.x0*k}" y="${b.y0*k}" width="${(b.x1-b.x0)*k}" height="${(b.y1-b.y0)*k}" fill="${fill}" stroke="${stroke}" stroke-width="${3*k}" ${dash}/>`;
const label=(b,text,color,turn=false)=>`<text ${turn?`transform="translate(${(b.x0+(b.x1-b.x0)/2+9)*k} ${(b.y0+70)*k}) rotate(90)"`:`x="${(b.x0+12)*k}" y="${(b.y0+34)*k}"`} font-family="Helvetica, Arial, sans-serif" font-size="${26*k}" font-weight="700" fill="${color}" stroke="#000" stroke-width="${4*k}" paint-order="stroke">${text}</text>`;
// Wide zones get a horizontal label, narrow tall ones (side columns) a vertical one.
const zoneLabel=z=>z.x1-z.x0>=300?(z.y1-z.y0>=50?label(z,z.id,COLORS[z.level]):""):(z.y1-z.y0>=300?label(z,z.id,COLORS[z.level],true):"");
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
// A finding: white outline around the text box (a ring for a point such as a landing), its zone and text above it.
function markSvg(v){
 const b=v.box,point=b.x0===b.x1&&b.y0===b.y1,ly=Math.max(30,b.y0-14)*k,text=esc(v.label.length>60?v.label.slice(0,59)+"…":v.label);
 const shape=point?`<circle cx="${b.x0*k}" cy="${b.y0*k}" r="${22*k}" fill="none" stroke="#FFFFFF" stroke-width="${6*k}"/><circle cx="${b.x0*k}" cy="${b.y0*k}" r="${22*k}" fill="none" stroke="#FF3B30" stroke-width="${3*k}"/>`
  :`<rect x="${(b.x0-6)*k}" y="${(b.y0-6)*k}" width="${(b.x1-b.x0+12)*k}" height="${(b.y1-b.y0+12)*k}" fill="none" stroke="#FFFFFF" stroke-width="${7*k}"/><rect x="${(b.x0-6)*k}" y="${(b.y0-6)*k}" width="${(b.x1-b.x0+12)*k}" height="${(b.y1-b.y0+12)*k}" fill="none" stroke="#FF3B30" stroke-width="${3*k}"/>`;
 const x=Math.min(Math.max(8,b.x0),700)*k;
 return `${shape}<text x="${x}" y="${point?(b.y0-34)*k:ly}" font-family="Helvetica, Arial, sans-serif" font-size="${24*k}" font-weight="700" fill="#FFFFFF" stroke="#000" stroke-width="${5*k}" paint-order="stroke">${text}</text>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
${Z.zones.map(z=>r(z,COLORS[z.level]+(z.level==="ui"?"59":"38"),COLORS[z.level])).join("\n")}
${Z.main.map(b=>r(b,"none",COLORS.main,`stroke-dasharray="${14*k} ${10*k}"`)).join("\n")}
${r(Z.focus,"none","#FFFFFF",`stroke-dasharray="${4*k} ${8*k}"`)}
${Z.zones.map(zoneLabel).join("\n")}
${label({x0:Z.main[0].x0,y0:Z.main[0].y0},"main",COLORS.main)}
${label({x0:Z.focus.x0,y0:Z.focus.y0},"focus","#FFFFFF")}
${marks.map(markSvg).join("\n")}
</svg>`;
const layer=Buffer.from(svg);
const base=blank?sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}):sharp(input);
await base.composite([{input:layer,top:0,left:0}]).png().toFile(out);
console.log(`${out} (${W}×${H}, zones v${Z.version})`);
