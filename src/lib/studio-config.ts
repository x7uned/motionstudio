import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {z} from "zod";

/**
 * Skill settings (user decision 2026-10-21): one file in the studio root, `studio.config.json`, read by the engine, the
 * agent CLI (`npm run studio -- config get|set`) and the optional web UI. A plain JSON file and not the SQLite settings
 * table: any chat agent can read it without database tooling, it is not mixed with runtime state (workerSeen, style
 * profile) and it survives a database restore. Missing file or keys mean the defaults below. Secrets never go here:
 * ElevenLabs/Tavily/Apify keys stay only in `.env.local`, and the schema rejects unknown keys and key-like values.
 */
export const CONFIG_FILE="studio.config.json";
const agentLabel=z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9._:@/+ -]+$/,"Только латиница, цифры и . _ : @ / + -");
export const studioConfigSchema=z.object({
 version:z.literal(1).default(1),
 /** Default self-declaration of the driving chat agent for `create`; `--agent` or MOTION_STUDIO_AGENT win. */
 agent:z.object({declared:agentLabel.nullable().default(null)}).strict().default({declared:null}),
 defaults:z.object({
  /** "ask": the agent must ask the user which account the video is for (two channel accounts, 2026-10-20). */
  brand:z.enum(["ask","xtuned","kagenami","worldifthen"]).default("ask"),
  language:z.enum(["ru","en"]).default("ru"),
  template:z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}(?:@v\d{1,4})?$/).nullable().default(null),
  duration:z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(150)]).default(60),
  format:z.enum(["9:16","16:9"]).default("9:16"),
  factCheck:z.enum(["off","lenient","strict"]).default("off"),
  voice:z.boolean().default(true),
 }).strict().default({brand:"ask",language:"ru",template:null,duration:60,format:"9:16",factCheck:"off",voice:true}),
 engine:z.object({
  /** Active jobs at once; 0 = no artificial limit (the default). */
  maxActiveJobs:z.number().int().min(0).max(64).default(0),
  /** Local heavy work (Remotion renders, FFmpeg encode/mix) runs in this many slots. 1 = strictly one at a time; change only on the user's words. */
  renderSlots:z.number().int().min(1).max(4).default(1),
  /** `run` starts the engine itself when it is down. Off by default: Claude Code's sandboxed Bash has no Tavily login. */
  autostart:z.boolean().default(false),
 }).strict().default({maxActiveJobs:0,renderSlots:1,autostart:false}),
 ui:z.object({port:z.number().int().min(1024).max(65535).default(3210)}).strict().default({port:3210}),
 /** Who changed a guarded setting and with which words of the user (renderSlots). */
 confirmations:z.array(z.object({key:z.string(),value:z.unknown(),userQuote:z.string().max(500),at:z.string()}).strict()).max(50).default([]),
}).strict();
export type StudioConfig=z.infer<typeof studioConfigSchema>;
/** Settings that change resource use and therefore need the user's own words (`--user-confirmed`). */
export const GUARDED_KEYS=new Set(["engine.renderSlots"]);
const SECRET=/(sk_|xi-|tvly-|apify_api|api[_-]?key|token|secret|password)/i;

export const configPath=(root=process.cwd())=>path.join(root,CONFIG_FILE);
export function rawConfig(root=process.cwd()):Record<string,any>{
 try{return JSON.parse(fs.readFileSync(configPath(root),"utf8"));}catch(e:any){if(e?.code==="ENOENT")return {};throw new Error(`${CONFIG_FILE} не читается: ${e instanceof Error?e.message:e}`);}
}
let cached:{mtime:number;value:StudioConfig;root:string}|null=null;
/** Parsed settings with defaults. The engine re-reads the file when it changes, so `config set` applies without a restart. */
export function studioConfig(root=process.cwd()):StudioConfig{
 let mtime=0;try{mtime=fs.statSync(configPath(root)).mtimeMs;}catch{}
 if(cached&&cached.root===root&&cached.mtime===mtime)return cached.value;
 const value=studioConfigSchema.parse(rawConfig(root));
 cached={mtime,value,root};return value;
}
/** Dotted keys that can be read and set: defaults.brand, engine.maxActiveJobs, ui.port, agent.declared, ... */
export function configKeys(){
 const out:string[]=[];
 const shape=studioConfigSchema.shape as Record<string,any>;
 for(const [group,schema] of Object.entries(shape)){
  if(["version","confirmations"].includes(group))continue;
  const inner=(schema as any).unwrap?.()??schema;
  for(const key of Object.keys(inner.shape??{}))out.push(`${group}.${key}`);
 }
 return out;
}
export function configValue(config:StudioConfig,key:string){
 const [group,name]=key.split(".");return (config as any)[group]?.[name];
}
/** Whether the key is set in the file (true) or comes from the defaults. */
export function configExplicit(key:string,root=process.cwd()){
 const [group,name]=key.split(".");const raw=rawConfig(root);return raw[group]!==undefined&&raw[group]?.[name]!==undefined;
}
function coerce(raw:string){
 if(raw==="null")return null;if(raw==="true")return true;if(raw==="false")return false;
 if(/^-?\d+$/.test(raw))return Number(raw);
 return raw;
}
function write(root:string,value:Record<string,any>){
 const file=configPath(root),tmp=`${file}.${process.pid}.${randomUUID()}.tmp`;
 fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);cached=null;
}
export function setConfig(key:string,raw:string|null,opts:{userQuote?:string;root?:string}={}){
 const root=opts.root??process.cwd();
 if(!configKeys().includes(key))throw new Error(`Нет такой настройки: ${key}. Список: npm run studio -- config get`);
 if(raw!==null&&SECRET.test(raw))throw new Error("Похоже на ключ или токен. Секреты хранятся только в .env.local и в настройки не записываются.");
 const value=raw===null?undefined:coerce(raw);
 const current=studioConfig(root);
 if(GUARDED_KEYS.has(key)&&value!==configValue(current,key)){
  if(!opts.userQuote?.trim())throw new Error(`${key} меняется только по словам пользователя: добавь --user-confirmed "<его слова>".`);
 }
 const next=rawConfig(root);const [group,name]=key.split(".");
 next[group]={...(next[group]??{})};
 if(value===undefined)delete next[group][name];else next[group][name]=value;
 if(!Object.keys(next[group]).length)delete next[group];
 if(GUARDED_KEYS.has(key)&&opts.userQuote)next.confirmations=[...(next.confirmations??[]),{key,value:value??null,userQuote:opts.userQuote.slice(0,500),at:new Date().toISOString()}].slice(-50);
 next.version=1;
 const parsed=studioConfigSchema.safeParse(next);
 if(!parsed.success)throw new Error(`Недопустимое значение ${key}: ${parsed.error.issues.map(i=>i.message).join("; ")}`);
 write(root,next);
 return configValue(parsed.data,key);
}
/** Active-job limit for the scheduler: Infinity when 0 (no artificial limit). */
export const activeJobLimit=(config=studioConfig())=>config.engine.maxActiveJobs||Infinity;
