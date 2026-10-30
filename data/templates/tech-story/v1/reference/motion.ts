/** Timeline functions: continuous at mount, scene boundaries and state changes. */
export const clamp01=(n:number)=>Math.min(1,Math.max(0,n));
export function smooth(t:number,a:number,b:number){const p=clamp01((t-a)/(b-a));return p*p*(3-2*p);}
export function windowAt(t:number,start:number,end:number,fade=.18){return smooth(t,start-fade/2,start+fade/2)*(1-smooth(t,end-fade/2,end+fade/2));}
export function sceneMotion(t:number,start:number,end:number,first:boolean,last:boolean){
 const enter=first?smooth(t,0,.5):smooth(t,start-.3,start+.3);
 const leave=last?0:smooth(t,end-.3,end+.3);
 return {opacity:enter*(1-leave),x:0,y:first?(1-enter)*18:(1-enter)*8-leave*8,scale:1};
}
