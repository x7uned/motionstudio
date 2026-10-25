/** Read-only provider calls + local quote. Never synthesizes or chooses a winner. */
import path from 'node:path';
import {ROOT} from '../src/lib/store';
import {voiceCatalog,quoteAudition,auditionState} from '../src/lib/voice-auditions';
import {writeJSON} from '../src/lib/quality';
async function main(){
 const catalog=await voiceCatalog(),alt=catalog.voices.find((v:any)=>v.library&&v.name.startsWith('Brian'));
 if(!alt)throw new Error('Библиотечный голос Brian недоступен.');
 const text='Представь, что ты открываешь приложение, а оно вдруг замирает. Кажется, будто кнопка не сработала. Но в нашем примере запрос уже отправлен: просто ответ ещё в пути. Здесь важно различать две вещи: что ты видишь на экране и что происходит внутри системы. Когда ответ наконец приходит, картинка меняется. Теперь задержка выглядит не случайной поломкой, а понятной цепочкой событий.';
 const pairs=[['eleven_multilingual_v2',catalog.configuredVoice],['eleven_v4',catalog.configuredVoice],['eleven_v4',alt.id]];
 const rates=pairs.map(([model,id])=>{const m=catalog.models.find((m:any)=>m.id===model),v=catalog.voices.find((v:any)=>v.id===id);if(m?.creditRate==null||!v)throw new Error('Нет подтверждённой ставки API.');return m.creditRate*v.rate;});
 const quote=await quoteAudition({text,alternativeVoiceId:alt.id,rates,rateSource:'Read-only API pricing estimate; human launch approval pending'}),state=await auditionState(quote.id);
 await writeJSON(path.join(ROOT,'data/quality-validation/voice-quote.json'),state);
 console.log(JSON.stringify({id:state.id,variants:quote.variants.map(v=>({name:v.name,model:v.model,characters:v.characters,credits:v.credits})),totalCredits:quote.totalCredits,paidRequestsStarted:0}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
