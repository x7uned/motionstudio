import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {DatabaseSync} from "node:sqlite";

const ID="11111111-2222-4333-8444-555555555555";
const now=Date.parse("2026-10-20T10:00:00Z"),alive=new Date(now-2000).toISOString(),dead=new Date(now-120_000).toISOString();

test("stop decision keeps the session working while its video is busy, and lets go when the user must act",async()=>{
 const {stopDecision}=await import("./agent-stop-hook.mjs");
 const busy=[{id:ID,status:"running",stage:"Рендер",progress:40,kind:"project"}];
 const first=stopDecision({projects:busy,workerSeenAt:alive,now});
 assert.equal(first.block,true);assert.match(first.reason,new RegExp(`npm run studio -- run ${ID}`));
 const waiting=stopDecision({projects:[{...busy[0],status:"awaiting-agent",stage:"Ждёт агента: writer"}],workerSeenAt:alive,now});
 assert.equal(waiting.block,true);assert.match(waiting.reason,/task/);
 for(const status of ["awaiting-user","review","approved","failed","cancelled","revision"])assert.equal(stopDecision({projects:[{...busy[0],status}],workerSeenAt:alive,now}).block,false,status);
 assert.equal(stopDecision({projects:[],workerSeenAt:alive,now}).block,false);
 // No progress after three reminders: let the agent stop and talk to the user.
 let state:any={};
 for(let i=0;i<3;i++){const d=stopDecision({projects:busy,workerSeenAt:alive,now,stopHookActive:i>0,state});assert.equal(d.block,true);state=d.state;}
 assert.equal(stopDecision({projects:busy,workerSeenAt:alive,now,stopHookActive:true,state}).block,false);
 const moved=stopDecision({projects:[{...busy[0],progress:41}],workerSeenAt:alive,now,stopHookActive:true,state});
 assert.equal(moved.block,true,"progress resets the counter");
 // Studio down: one reminder, then allow.
 const down=stopDecision({projects:busy,workerSeenAt:dead,now});
 assert.equal(down.block,true);assert.match(down.reason,/npm run studio -- start/);
 assert.equal(stopDecision({projects:busy,workerSeenAt:dead,now,stopHookActive:true,state:down.state}).block,false);
});

test("run hook records only this session's runs; stop hook reads them end to end and fails open",async()=>{
 const {runIds,recordRuns}=await import("./agent-run-hook.mjs");
 assert.deepEqual(runIds(`Создан проект\nMOTION_STUDIO_RUN=${ID}\nДальше`),[ID]);
 assert.deepEqual(runIds("MOTION_STUDIO_RUN=../../etc"),[]);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"studio-hooks-"));
 try{
  fs.mkdirSync(path.join(root,"data"));
  const db=new DatabaseSync(path.join(root,"data","studio.sqlite"));
  db.exec("CREATE TABLE projects(id TEXT PRIMARY KEY,status TEXT,stage TEXT,progress INTEGER);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);");
  db.prepare("INSERT INTO projects VALUES(?,?,?,?)").run(ID,"running","Рендер",50);
  db.prepare("INSERT INTO settings VALUES('workerSeen',?)").run(new Date().toISOString());db.close();
  const hook=(script:string,input:unknown)=>spawnSync(process.execPath,[path.join(__dirname,script)],{input:JSON.stringify(input),env:{...process.env,CLAUDE_PROJECT_DIR:root},encoding:"utf8"});
  assert.equal(hook("agent-stop-hook.mjs",{session_id:"s1",stop_hook_active:false}).stdout,"","a session without runs is never blocked");
  const posted=hook("agent-run-hook.mjs",{session_id:"s1",tool_name:"Bash",tool_response:{stdout:`MOTION_STUDIO_RUN=${ID}`}});
  assert.equal(posted.status,0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,"data/agent-runs/s1.json"),"utf8")).projects[0].id,ID);
  const blocked=hook("agent-stop-hook.mjs",{session_id:"s1",stop_hook_active:false});
  assert.equal(JSON.parse(blocked.stdout).decision,"block");
  assert.equal(hook("agent-stop-hook.mjs",{session_id:"other",stop_hook_active:false}).stdout,"","another session (e.g. Codex) is not blocked");
  const db2=new DatabaseSync(path.join(root,"data","studio.sqlite"));db2.prepare("UPDATE projects SET status='review' WHERE id=?").run(ID);db2.close();
  assert.equal(hook("agent-stop-hook.mjs",{session_id:"s1",stop_hook_active:true}).stdout,"");
  const broken=hook("agent-stop-hook.mjs","not json");assert.equal(broken.status,0);assert.equal(broken.stdout,"");
  assert.equal(recordRuns(root,"../evil",[ID]),null);
  // A run handed to another session is released from this one.
  const db3=new DatabaseSync(path.join(root,"data","studio.sqlite"));db3.prepare("UPDATE projects SET status='running' WHERE id=?").run(ID);db3.close();
  assert.equal(JSON.parse(hook("agent-stop-hook.mjs",{session_id:"s1",stop_hook_active:false}).stdout).decision,"block");
  hook("agent-run-hook.mjs",{session_id:"s1",tool_name:"Bash",tool_response:{stdout:`MOTION_STUDIO_RELEASE=${ID}`}});
  assert.equal(hook("agent-stop-hook.mjs",{session_id:"s1",stop_hook_active:false}).stdout,"");
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test("parallel videos: one session lists all its busy videos (waiting ones first); each session is held only by its own",async()=>{
 const {stopDecision}=await import("./agent-stop-hook.mjs");
 const A="aaaaaaaa-2222-4333-8444-555555555555",B="bbbbbbbb-2222-4333-8444-555555555555";
 const both=stopDecision({projects:[{id:A,status:"running",stage:"Рендер",progress:40,kind:"project"},{id:B,status:"awaiting-agent",stage:"Ждёт агента: writer",progress:12,kind:"project"}],workerSeenAt:alive,now});
 assert.equal(both.block,true);assert.match(both.reason,/\(2\)/);
 assert.ok(both.reason.indexOf(B)<both.reason.indexOf(A),"the video that waits for the agent comes first");
 assert.match(both.reason,new RegExp(`task ${B}`));
 // A paused video does not hold the session.
 assert.equal(stopDecision({projects:[{id:A,status:"paused",stage:"На паузе",progress:40,kind:"project"}],workerSeenAt:alive,now}).block,false);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"studio-hooks-par-"));
 try{
  fs.mkdirSync(path.join(root,"data"));
  const db=new DatabaseSync(path.join(root,"data","studio.sqlite"));
  db.exec("CREATE TABLE projects(id TEXT PRIMARY KEY,status TEXT,stage TEXT,progress INTEGER);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);");
  db.prepare("INSERT INTO projects VALUES(?,?,?,?)").run(A,"awaiting-agent","Ждёт агента",30);db.prepare("INSERT INTO projects VALUES(?,?,?,?)").run(B,"running","Рендер",60);
  db.prepare("INSERT INTO settings VALUES('workerSeen',?)").run(new Date().toISOString());db.close();
  const hook=(script:string,input:unknown)=>spawnSync(process.execPath,[path.join(__dirname,script)],{input:JSON.stringify(input),env:{...process.env,CLAUDE_PROJECT_DIR:root},encoding:"utf8"});
  hook("agent-run-hook.mjs",{session_id:"chat-a",tool_response:{stdout:`MOTION_STUDIO_RUN=${A}`}});
  hook("agent-run-hook.mjs",{session_id:"chat-b",tool_response:{stdout:`MOTION_STUDIO_RUN=${B}`}});
  const a=JSON.parse(hook("agent-stop-hook.mjs",{session_id:"chat-a",stop_hook_active:false}).stdout),b=JSON.parse(hook("agent-stop-hook.mjs",{session_id:"chat-b",stop_hook_active:false}).stdout);
  assert.match(a.reason,new RegExp(A));assert.doesNotMatch(a.reason,new RegExp(B));
  assert.match(b.reason,new RegExp(B));assert.doesNotMatch(b.reason,new RegExp(A));
  const db2=new DatabaseSync(path.join(root,"data","studio.sqlite"));db2.prepare("UPDATE projects SET status='review' WHERE id=?").run(A);db2.close();
  assert.equal(hook("agent-stop-hook.mjs",{session_id:"chat-a",stop_hook_active:false}).stdout,"","A is ready: its session may stop while B still renders");
  assert.equal(JSON.parse(hook("agent-stop-hook.mjs",{session_id:"chat-b",stop_hook_active:false}).stdout).decision,"block");
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
