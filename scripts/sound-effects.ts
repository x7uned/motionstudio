import {soundLibrary} from "../src/lib/sound-provider";
import {EFFECTS,type EffectType} from "../src/lib/sound-effects";
async function main(){
const [action="status",type]=process.argv.slice(2),library=soundLibrary();
if(action==="status")console.log(JSON.stringify(library.status(),null,2));
else if(action==="prepare"&&Object.hasOwn(EFFECTS,type||"")){
  const result=await library.resolve(type as EffectType);console.log(JSON.stringify(result,null,2));
  if(!result.asset&&result.reason!=="existing-procedural")process.exitCode=1;
}else{console.error("Usage: npm run sfx -- status | prepare <effect-type>");process.exitCode=1;}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Ошибка SFX");process.exitCode=1;});
