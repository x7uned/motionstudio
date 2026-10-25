/**
 * Parallel queue of the engine (user decision 2026-10-21): every claimed job runs at once with its own AbortController,
 * so waiting for the chat agent, a cancel, a pause or a paid gate of one job never holds or stops another. The only
 * sequential resource is the render slot (render-slot.ts). Jobs of one project never overlap (claimJob).
 */
export type ScheduledJob={id:string;project_id:string|null;kind:string;[key:string]:unknown};
export type ActiveJob<J extends ScheduledJob>={job:J;controller:AbortController;startedAt:number;done:Promise<void>};
export class JobScheduler<J extends ScheduledJob>{
 readonly active=new Map<string,ActiveJob<J>>();
 constructor(private o:{
  /** Claims the next startable job (marks it running) or returns null. `running` are the jobs this engine runs now. */
  claim:(running:J[])=>J|null|undefined;
  /** Runs one job to its end (or park/cancel); must settle the job row itself. */
  execute:(job:J,controller:AbortController)=>Promise<void>;
  /** Active-job limit; Infinity = no artificial limit. */
  limit:()=>number;
  onCrash?:(job:J,error:unknown)=>void;
 }){}
 get size(){return this.active.size;}
 /** Starts as many queued jobs as the limit allows; returns how many started. */
 fill(){
  let started=0;
  while(this.active.size<this.o.limit()){
   const job=this.o.claim([...this.active.values()].map(a=>a.job));
   if(!job)break;
   const controller=new AbortController();
   const entry:ActiveJob<J>={job,controller,startedAt:Date.now(),done:Promise.resolve()};
   this.active.set(job.id,entry);
   entry.done=Promise.resolve().then(()=>this.o.execute(job,controller)).catch(e=>this.o.onCrash?.(job,e)).finally(()=>{this.active.delete(job.id);});
   started++;
  }
  return started;
 }
 abort(id:string){const a=this.active.get(id);if(!a)return false;a.controller.abort();return true;}
 abortAll(){for(const a of this.active.values())a.controller.abort();}
 /** Resolves when every active job has settled. */
 async drain(){while(this.active.size)await Promise.allSettled([...this.active.values()].map(a=>a.done));}
 /** Resolves when any active job settles or after ms, whichever is first (the engine's idle tick). */
 tick(ms:number){
  const timer=new Promise<void>(r=>setTimeout(r,ms));
  return Promise.race([timer,...[...this.active.values()].map(a=>a.done)]);
 }
}
