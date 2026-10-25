/** Real isolated GPT calls on explicitly synthetic adversarial evidence. No search or TTS. */
import path from 'node:path';
import {ROOT,DATA} from '../src/lib/store';
import {auditText} from '../src/lib/editorial';
import {qualityInstructions} from '../src/lib/quality-instructions';
import {writeJSON,readJSON,digest} from '../src/lib/quality';
async function main(){
 const dir=path.join(DATA,'quality-validation/fact-gates');qualityInstructions(ROOT,dir);
 const sources=[{id:'s1',title:'Synthetic test specification, not a real product',url:'https://example.org/test-spec',retrievedAt:new Date().toISOString(),content:'This is a synthetic fixture for verifier testing, not a real-world document. The example protocol was introduced in 2019. The specification was revised in 2021. A fresh cache entry can be reused without a network request. Stale entries require validation. The protocol does not eliminate every network request. This document describes cache reuse only; it makes no measurement of video playback performance.'}];
 const input={fullText:'В этом тестовом описании протокол впервые появился в 2020 году. В документе про повторное использование кэша доказано, что видео всегда проигрывается без задержек.',screenText:'Этот протокол полностью устраняет все сетевые запросы.'};
 const prior=await readJSON(path.join(dir,'result.json'));const result=prior?.inputHash===digest(input)?prior:await auditText(input,sources,dir,new AbortController().signal,undefined,dir);
 await writeJSON(path.join(dir,'result.json'),{fixture:'synthetic adversarial evidence; real GPT calls; no TTS',...result});
 const critical=['2020 году','доказано','устраняет все сетевые запросы'];if(result.passed||critical.some(span=>!result.claims.some((c:any)=>c.span.includes(span)&&['contradicted','uncertain'].includes(c.status))))throw new Error('Adversarial factual gates did not block every unsupported conclusion.');await writeJSON(path.join(dir,'result.json'),{...result,passedGateTest:true});
 console.log(JSON.stringify({passedGateTest:true,claims:result.claims.map((c:any)=>({claim:c.claim,status:c.status})),ttsRequests:0}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
