import {run,PYTHON} from '../src/lib/provider';
import path from 'node:path';
import {ROOT} from '../src/lib/store';
async function main(){try {console.log(await run(PYTHON,[path.join(ROOT,'scripts','elevenlabs_speech.py'),'--voices'],{timeout:30000}));}
catch(e){console.error(e instanceof Error?e.message:'Список голосов недоступен');process.exitCode=1;}}
void main();
