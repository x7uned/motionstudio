import type {Storyboard} from "./model";
import {anchorTime} from "./scene3d";
import type {SoundCue} from "./sound-effects";

/** Uses the renderer's interpolation intervals, not the destination key's timestamp. */
export function assemblySoundCues(plan:Storyboard,alignment:any[]):SoundCue[]{
 const out:SoundCue[]=[],end=plan.scenes.reduce((n,s)=>n+s.seconds,0),frame=(t:number)=>Math.round(t*30)/30;
 for(const o of plan.world3d?.objects||[]){
  const enter=anchorTime(o.enter,plan.scenes,alignment),exit=o.exit?anchorTime(o.exit,plan.scenes,alignment):end;
  for(const [channel,keys] of Object.entries(o.articulation||{})){
   if(!keys?.length||channel==="wheels")continue;
   const timed=keys.map(k=>({at:anchorTime(k.at,plan.scenes,alignment),value:k.value}));
   if(channel==="fan"){
    // One voice for the whole positive-speed interval: ramp up, steady spin and ramp down.
    let start:number|null=timed[0].value>0?enter:null;
    const emit=(stop:number)=>{if(start===null)return;const at=frame(Math.max(enter,start)),until=frame(Math.min(exit,stop));if(until>at)out.push({at,gain:.008,kind:"assembly-fan",effect:"fan-start",durationSeconds:until-at,durationMode:"loop",automation:timed,sync:{objectId:o.id,channel,start:at,end:until}});start=null;};
    for(let i=1;i<timed.length;i++){
     if(start===null&&timed[i].value>0)start=timed[i-1].at;
     if(start!==null&&timed[i].value<=0)emit(timed[i].at);
    }
    if(start!==null)emit(exit);
    continue;
   }
   for(let i=1;i<timed.length;i++)if(Math.abs(timed[i].value-timed[i-1].value)>.1){
    const at=frame(Math.max(enter,timed[i-1].at)),until=frame(Math.min(exit,timed[i].at));if(until<=at)continue;
    out.push({at,gain:.008,kind:`assembly-${channel}`,...(channel==="cutaway"?{effect:"soft-whoosh" as const,durationSeconds:until-at,durationMode:"stretch" as const}:{effect:"ui-reveal" as const}),sync:{objectId:o.id,channel,start:at,end:until}});
   }
  }
 }
 return out;
}
