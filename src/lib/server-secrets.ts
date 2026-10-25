import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { ROOT } from "./store";
const allowed=["APIFY_TOKEN","ELEVENLABS_API_KEY"] as const;
export async function serverSecrets(){
 const file=await fs.readFile(path.join(ROOT,".env.local"),"utf8").then(parseEnv).catch(()=>({}) as Record<string,string>);
 return Object.fromEntries(allowed.map(k=>[k,file[k]||process.env[k]||""])) as Record<typeof allowed[number],string>;
}
export async function saveApifyToken(value:string){
 if(!/^[A-Za-z0-9_-]{20,256}$/.test(value))throw new Error("Проверьте формат API-токена Apify.");
 const file=path.join(ROOT,".env.local");
 const previous=await fs.readFile(file,"utf8").catch(()=>"");
 const lines=previous.split(/\r?\n/).filter(l=>!/^\s*(?:export\s+)?APIFY_TOKEN\s*=/.test(l));
 const temp=`${file}.${process.pid}.tmp`;
 await fs.writeFile(temp,`${lines.join("\n").trimEnd()}\nAPIFY_TOKEN=${value}\n`,{mode:0o600});
 await fs.rename(temp,file);
}
export function safeProviderError(provider:string,status:number){
 if(status===401)return new Error(`${provider}: ключ отклонён. Проверьте подключение.`);
 if(status===403)return new Error(`${provider}: у ключа недостаточно разрешений.`);
 if(status===402)return new Error(`${provider}: недостаточно доступных кредитов.`);
 if(status===429)return new Error(`${provider}: лимит запросов. Повторите позже.`);
 return new Error(`${provider}: запрос не выполнен (HTTP ${status}).`);
}
