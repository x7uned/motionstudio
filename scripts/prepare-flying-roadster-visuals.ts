import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,DATA,project} from '../src/lib/store';
import {prepareVisualConcept,prepareDetailedAssets} from '../src/lib/visual-concept';
import {readJSON,writeJSON} from '../src/lib/quality';
async function main(){
 process.loadEnvFile(path.join(ROOT,'.env.local'));
 const id='175081da-be5c-4ff1-b75b-2a14510c5d55',dir=path.join(DATA,'projects',id),p=project(id)!;
 if(await fs.access(path.join(dir,'narration.wav')).then(()=>true).catch(()=>false))throw new Error('This preparation must precede the first TTS');
 const plan=await readJSON(path.join(dir,'qualified-attribution/storyboard.json'));
 if(!p||!plan)throw new Error('No staged story');
 const input={...p,plan},signal=new AbortController().signal;
 console.log('Visual idea agent: GPT-6.1 Sol / xhigh');const visual=await prepareVisualConcept(input,dir,signal);if(!visual)throw new Error('Visual stage disabled');
 console.log('Detailed scene builder: Claude Opus 5.5 / xhigh');const prepared=await prepareDetailedAssets(input,visual,dir,signal);
 await writeJSON(path.join(dir,'qualified-attribution/prepared-visual-storyboard.json'),prepared);
 console.log(JSON.stringify({id,visualReady:true,assets:prepared.assemblies?.assets.map(a=>({id:a.id,kind:a.kind,parts:a.requiredParts.length}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
