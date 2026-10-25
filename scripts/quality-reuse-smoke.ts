/** Real cached ASR and image-only remix checks. Any fetch attempt is a failure. */
import path from 'node:path';
import {DATA,ROOT} from '../src/lib/store';
import {readJSON,writeJSON,fileHash} from '../src/lib/quality';
import {verifyAudioText} from '../src/lib/voice';
import {soundCues} from '../src/lib/export-review';
import {run,PYTHON,FFMPEG} from '../src/lib/provider';
async function main(){
 const dir=path.join(DATA,'quality-validation/v4-continuous'),plan=await readJSON(path.join(dir,'storyboard.json')),alignment=await readJSON(path.join(dir,'alignment.json')),master=await fileHash(path.join(dir,'narration.wav'));
 globalThis.fetch=async()=>{throw new Error('Unexpected provider request: reuse check forbids network');};
 const result=await verifyAudioText({voice:true,plan} as any,dir,new AbortController().signal);if(result.status!=='pass')throw new Error('Cached ASR did not pass');
 await writeJSON(path.join(dir,'sound-cues.json'),soundCues(plan,alignment));await run(PYTHON,[path.join(ROOT,'scripts/remix.py'),dir,FFMPEG]);const first=await fileHash(path.join(dir,'audio.wav'));
 await run(PYTHON,[path.join(ROOT,'scripts/remix.py'),dir,FFMPEG]);if(first!==await fileHash(path.join(dir,'audio.wav'))||master!==await fileHash(path.join(dir,'narration.wav')))throw new Error('Remix altered the master or became non-deterministic');
 const report={asrCacheReused:true,masterUnchanged:true,repeatRemixIdentical:true,ttsRequests:0,newASRRequests:0};await writeJSON(path.join(dir,'reuse-result.json'),report);console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
