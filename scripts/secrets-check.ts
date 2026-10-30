/**
 * Before publishing the skill: no provider key from .env.local / the environment may appear in any file git would
 * commit (tracked + new, not ignored), and no personal folders may be staged. Prints file names only, never values.
 *   npm run secrets:check
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {parseEnv} from "node:util";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let env:Record<string,string|undefined>={...process.env};
try{env={...env,...parseEnv(fs.readFileSync(path.join(ROOT,".env.local"),"utf8"))};}catch{}
const secrets=Object.entries(env).filter(([k,v])=>/^(?:ELEVENLABS|APIFY|TAVILY|OPENAI|ANTHROPIC)_.*(?:KEY|TOKEN|SECRET)$/.test(k)&&v&&v.length>12).map(([,v])=>v!);
const files=execFileSync("git",["ls-files","-z","--cached","--others","--exclude-standard"],{cwd:ROOT,maxBuffer:64*1024*1024}).toString("utf8").split("\0").filter(Boolean);
const PERSONAL=/^(?:\.env(?:\.local)?$|data\/(?:projects|authors|characters|voice-datasets|voice-auditions|deliveries|productions|studio\.sqlite)|archive\/|exports\/)/;
const PATTERNS=[/sk_[a-f0-9]{32,}/,/tvly-[A-Za-z0-9-]{20,}/,/apify_api_[A-Za-z0-9]{20,}/,/ghp_[A-Za-z0-9]{30,}/,/sk-ant-[A-Za-z0-9_-]{20,}/];
const leaks:string[]=[],personal:string[]=[];
for(const f of files){
 if(PERSONAL.test(f))personal.push(f);
 const abs=path.join(ROOT,f);let st;try{st=fs.statSync(abs);}catch{continue;}
 if(!st.isFile()||st.size>8*1024*1024)continue;
 const data=fs.readFileSync(abs,"latin1");
 // Test fixtures use obvious fake tokens (…test…, 1234567890…); those are not keys.
 const fake=(m:string)=>/test|fake|example|1234567890|0123456789/i.test(m);
 if(secrets.some(v=>data.includes(v))||PATTERNS.some(p=>[...data.matchAll(new RegExp(p.source,"g"))].some(m=>!fake(m[0]))))leaks.push(f);
}
console.log(`Проверено файлов: ${files.length} · с ключами: ${leaks.length} · личных путей: ${personal.length}`);
for(const f of leaks)console.log(`  КЛЮЧ: ${f}`);
for(const f of personal.slice(0,20))console.log(`  ЛИЧНОЕ: ${f}`);
process.exitCode=leaks.length||personal.length?1:0;
