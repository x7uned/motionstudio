import type {AssemblySpec} from './visual-contract';
type Vector=[number,number,number];
export type AirNozzle={position:Vector;rotation:Vector;channel:'thrust'|'lift'|'control'};
/** The nozzle exits along its local -Y. Car forward is +X; rear exhaust must be -X. */
export function nozzleLayout(spec:AssemblySpec):AirNozzle[]{
 if(spec.kind==='electric-drive')return [];
 if(spec.kind==='pressure-system'){
  const columns=Math.min(5,spec.nozzleCount);
  return Array.from({length:spec.nozzleCount},(_,i)=>({position:[1.4,.45+Math.floor(i/columns)*.4,(i%columns-(columns-1)/2)*.35] as Vector,rotation:[0,0,Math.PI/2],channel:'thrust'}));
 }
 const rear=Math.min(4,spec.nozzleCount),lower=Math.min(4,Math.max(0,spec.nozzleCount-4));
 return [
  ...Array.from({length:rear},(_,i)=>({position:[-2.68,.63,(i-(rear-1)/2)*.44] as Vector,rotation:[0,0,-Math.PI/2] as Vector,channel:'thrust' as const})),
  ...Array.from({length:lower},(_,i)=>({position:[i<2?-.8:.8,.75,i%2?-1.15:1.15] as Vector,rotation:[0,0,0] as Vector,channel:'lift' as const})),
  ...Array.from({length:Math.max(0,spec.nozzleCount-8)},(_,i)=>({position:[.7,.63,i%2?-1:1] as Vector,rotation:[i%2?Math.PI/2:-Math.PI/2,0,0] as Vector,channel:'control' as const})),
 ];
}

/** Local +Y is the inlet; the exhaust is the opposite end of the nozzle. */
export function nozzleInlet(n:AirNozzle):Vector{
 const [rx,,rz]=n.rotation,r=.14;
 return [n.position[0]-r*Math.sin(rz),n.position[1]+r*Math.cos(rz)*Math.cos(rx),n.position[2]+r*Math.cos(rz)*Math.sin(rx)];
}
/** Continuous, illustrative plumbing from each tank valve to the manifold and every nozzle inlet. */
export function carAirPlumbing(spec:AssemblySpec):Vector[][]{
 if(spec.kind!=='sports-car'||spec.system==='electric-drive')return [];
 const tanks=Array.from({length:spec.tankCount},(_,i)=>{
  const z=(i-(spec.tankCount-1)/2)*.49;
  return [[1.125,.74,z],[1.24,.74,z],[1.24,.48,z],[-1.95,.48,z],[-2.15,.58,z]] as Vector[];
 });
 const branches=nozzleLayout(spec).map(n=>{
  const inlet=nozzleInlet(n),z=n.position[2];
  if(n.channel==='thrust')return [[-2.15,.58,z],[-2.33,.63,z],inlet] as Vector[];
  if(n.channel==='lift'){const inner=z<0?-.7:.7;return [[-2.15,.58,inner],[-1.95,.48,inner],[inlet[0],.48,inner],[inlet[0],inlet[1],inner],inlet] as Vector[];}
  return [[-2.15,.58,z*.7],[.7,.48,z*.7],[.7,.63,z*.7],inlet] as Vector[];
 });
 return [...tanks,...branches];
}

/** A downward air marker fades before hitting the floor instead of disappearing behind it in one frame. */
export function airJetSample(phase:number,clearance?:number){
 const distance=.2+phase*1.25,u=clearance===undefined?1:Math.max(0,Math.min(1,(clearance-distance)/.2));
 return {distance,opacity:Math.sin(phase*Math.PI)**2*u*u*(3-2*u)};
}
