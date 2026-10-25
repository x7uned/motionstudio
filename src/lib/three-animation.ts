import {LoopOnce,type AnimationMixer,type AnimationClip} from "three";
/** Seek from a clean action state: capture order and prior clamping cannot change a frame. */
export function seekModelAnimation(mixer:AnimationMixer,clip:AnimationClip,seconds:number){
 const action=mixer.clipAction(clip);action.reset();action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
 mixer.setTime(Math.max(0,Math.min(seconds,Math.max(0,clip.duration-1e-7))));
}
