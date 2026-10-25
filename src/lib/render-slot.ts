import {AsyncLocalStorage} from "node:async_hooks";

/**
 * The one sequential resource of the studio (user decision 2026-10-21): local heavy work on this Mac — Remotion
 * renderMedia/renderStill (keyframe sheet included), the Remotion bundle and FFmpeg encode/mix. Everything else
 * (waiting for the agent, Tavily, ElevenLabs TTS, Scribe, frame extraction, OCR) runs in parallel and never takes a slot.
 * FIFO: the job that asked first renders first. A nested acquire inside a held slot passes through (no self-deadlock).
 */
export type SlotHolder={label:string;scope?:string;since:number};
type Waiter={holder:SlotHolder;resolve:()=>void;reject:(e:unknown)=>void};
const inside=new AsyncLocalStorage<boolean>();
export class RenderSlot{
 private active:SlotHolder[]=[];
 private queue:Waiter[]=[];
 constructor(private size:()=>number=()=>1){}
 state(){return {size:this.size(),active:this.active.map(h=>({...h})),waiting:this.queue.map(w=>({...w.holder}))};}
 private pump(){
  while(this.queue.length&&this.active.length<Math.max(1,this.size())){
   const next=this.queue.shift()!;next.holder.since=Date.now();this.active.push(next.holder);next.resolve();
  }
 }
 /** Runs fn inside the slot. onWait fires once when the job has to queue, with the current holders. */
 async run<T>(label:string,fn:()=>Promise<T>,opts:{signal?:AbortSignal;scope?:string;onWait?:(holders:SlotHolder[])=>void;onAcquire?:(waitedMs:number)=>void;onRelease?:(heldMs:number)=>void}={}):Promise<T>{
  if(inside.getStore())return fn();
  if(opts.signal?.aborted)throw new Error("Остановлено.");
  const holder:SlotHolder={label,scope:opts.scope,since:Date.now()},asked=Date.now();
  await new Promise<void>((resolve,reject)=>{
   const waiter:Waiter={holder,resolve,reject};
   this.queue.push(waiter);
   const abort=()=>{const i=this.queue.indexOf(waiter);if(i>=0){this.queue.splice(i,1);reject(new Error("Остановлено."));}};
   opts.signal?.addEventListener("abort",abort,{once:true});
   const done=waiter.resolve;waiter.resolve=()=>{opts.signal?.removeEventListener("abort",abort);done();};
   this.pump();
   if(this.queue.includes(waiter))opts.onWait?.(this.active.map(h=>({...h})));
  });
  opts.onAcquire?.(Date.now()-asked);
  const started=Date.now();
  try{
   if(opts.signal?.aborted)throw new Error("Остановлено.");
   return await inside.run(true,fn);
  }finally{
   this.active.splice(this.active.indexOf(holder),1);
   opts.onRelease?.(Date.now()-started);
   this.pump();
  }
 }
}
