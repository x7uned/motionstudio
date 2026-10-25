/** Verify production outputs without printing provider values. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {writeJSON} from '../src/lib/quality';
import {ROOT,DATA} from '../src/lib/store';
async function files(dir:string):Promise<string[]>{const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
async function main(){
 process.loadEnvFile(path.join(ROOT,'.env.local'));
 const secrets=Object.entries(process.env).filter(([name,value])=>/^(?:ELEVENLABS|APIFY|TAVILY)_.*(?:KEY|TOKEN|SECRET)$/.test(name)&&value&&value.length>12).map(([,value])=>value!);
 const outputs=(await Promise.all(['.next/server','.next/static'].map(d=>files(path.join(ROOT,d))))).flat().filter(f=>/\.(?:js|json)$/.test(f));
 const containingKeys:string[]=[],unsafeTraces:string[]=[];
 for(const file of outputs){const data=await fs.readFile(file,'utf8');if(secrets.some(value=>data.includes(value)))containingKeys.push(path.relative(ROOT,file));
  if(file.endsWith('.nft.json')){const manifest=JSON.parse(data);if((manifest.files||[]).some((f:string)=>/(?:^|\/)(?:\.env[^/]*|data|archive|\.runtime|\.agents|\.codex|\.aws)(?:\/|$)/.test(f)))unsafeTraces.push(path.relative(ROOT,file));}
 }
 const result={checkedAt:new Date().toISOString(),checkedFiles:outputs.length,filesContainingProviderKeys:containingKeys,unsafeTraceManifests:unsafeTraces};await writeJSON(path.join(DATA,'quality-validation/build-safety.json'),result);console.log(JSON.stringify(result));if(containingKeys.length||unsafeTraces.length)process.exitCode=1;
}
main().catch(()=>{console.error('Build safety check failed without exposing provider data.');process.exitCode=1;});
