/** Real Scribe check of the selected cached v4 PCM; never synthesizes speech. */
import path from 'node:path';
import {DATA} from '../src/lib/store';
import {readJSON} from '../src/lib/quality';
import {verifyAudioText} from '../src/lib/voice';
async function main(){const dir=path.join(DATA,'quality-validation/v4-continuous'),plan=await readJSON(path.join(dir,'storyboard.json'));const result=await verifyAudioText({voice:true,plan} as any,dir,new AbortController().signal);console.log(JSON.stringify({status:result.status,expectedWords:result.expectedWords,heardWords:result.heardWords,edits:result.edits?.length,error:result.error,expressivenessChecked:result.expressivenessChecked,ttsRequests:0}));if(result.status==='unavailable')process.exitCode=1;}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
