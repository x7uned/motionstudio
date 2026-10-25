import path from 'node:path';
import fs from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {ROOT,DATA,project} from '../src/lib/store';
import {CHROME} from '../src/lib/provider';
async function main(){
 const p=project('db2bdd14-2b48-4d45-a89d-5d2c630f6837')!,plan=structuredClone(p.plan!),out=path.join(DATA,'productions/2026-10-18-three-explainers/detailed-preview');
 plan.title='Roadster · воздушная тяга';plan.scenes=plan.scenes.map((s,i)=>({...s,title:i<2?'Автомобиль с воздушной системой':'Раскрываем корпус',subtitle:'Баллоны, магистрали и сопла остаются в одном шасси.'}));const at=(scene:number,progress:number)=>({scene,progress,cue:''});
 plan.assemblies={version:1,concept:'Узнаваемый автомобиль с раскрываемой оболочкой и воздушной системой',assets:[{id:'car',kind:'sports-car',name:'Автомобиль',purpose:'Объяснить воздушную тягу',color:'#8D59DA',system:'compressed-air',tankCount:2,nozzleCount:10,requiredParts:['шасси','баллоны COPV','сопла','магистрали и клапаны'],approximation:'Условное размещение внутренних узлов, не заводская CAD'}],limitations:['Процедурная иллюстрация']};
 plan.world3d={version:1,concept:'Предварительная проверка детализации',cameraMode:'dolly',camera:[{at:at(1,0),position:[5,2.8,6.5],target:[0,-.9,0],fov:42},{at:at(plan.scenes.length,1),position:[5,2.8,6.5],target:[0,-.9,0],fov:42}],objects:[{id:'car',model:'assembly',assetId:'car',animationClip:'',label:'',labelStyle:'none',color:'#8D59DA',metalness:.5,roughness:.3,enter:at(1,0),exit:null,keys:[{at:at(1,0),position:[0,-1.6,0],rotation:[0,0,0],scale:1}],articulation:{fan:[{at:at(1,0),value:0},{at:at(2,0.4),value:1}],cutaway:[{at:at(1,0),value:0},{at:at(1,1),value:0},{at:at(2,0.4),value:1}]}}],lighting:{keyPosition:[3,7,5],keyColor:'#FFFFFF',keyIntensity:4,fillIntensity:1.1,rimColor:'#A763F5'},ground:true,shadows:true,notes:[],referenceShotIds:[]};
 const props={plan,profile:p.profile,format:'9:16',models:[]};await fs.mkdir(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(ROOT,'renderer/index.tsx'),publicDir:path.join(DATA,'projects'),symlinkPublicDir:true});
 const comp=await selectComposition({serveUrl,id:'StudioFilm',inputProps:props,browserExecutable:CHROME,chromiumOptions:{gl:'angle'}});
 for(const second of [3,18]){await renderStill({serveUrl,composition:comp,inputProps:props,frame:second*30,scale:.65,output:path.join(out,`${second}.png`),browserExecutable:CHROME,chromiumOptions:{gl:'angle'}});console.log(`Preview ${second}s`);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
