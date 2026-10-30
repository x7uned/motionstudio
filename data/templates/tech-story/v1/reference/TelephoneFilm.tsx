import React from "react";
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame,interpolateColors} from "remotion";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {Captions,type SpeechAlignment} from "./Explainer";
import {smooth} from "./motion";
import brand from "../video-design/brand.json";

const C=brand.colors;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
type Mode=NonNullable<Storyboard["scenes"][number]["history"]>["mode"];
function Text({x=0,y=0,size=30,color=C.text,children,anchor="middle",opacity=1}: {x?:number;y?:number;size?:number;color?:string;children:React.ReactNode;anchor?:"start"|"middle"|"end";opacity?:number}){
 return <text x={x} y={y} fontSize={size} fill={color} fontWeight={700} textAnchor={anchor} opacity={opacity}>{children}</text>;
}
function Phone({x,y,scale=1,opacity=1}: {x:number;y:number;scale?:number;opacity?:number}){
 return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <rect x={-53} y={-45} width={106} height={90} rx={22} fill={C.card} stroke={C.purpleStroke} strokeWidth={2}/>
  <path d="M-24-14q24-27 48 0l-4 14-13-4-1-9h-12l-1 9-13 4Z" fill={C.lavender}/>
  <circle cx={0} cy={17} r={13} fill="none" stroke={C.lavender} strokeWidth={3}/>
  {[0,1,2,3,4,5].map(n=><circle key={n} cx={Math.cos(n*Math.PI/3)*7} cy={17+Math.sin(n*Math.PI/3)*7} r={1.5} fill={C.yellow}/>)}
 </g>;
}
function Badge({x,y,w=300,h=68,children,accent=false}: {x:number;y:number;w?:number;h?:number;children:React.ReactNode;accent?:boolean}){
 return <g transform={`translate(${x} ${y})`}><rect x={-w/2} y={-h/2} width={w} height={h} rx={22} fill={accent?C.lavender:C.card} stroke={C.purpleStroke} strokeWidth={2}/><Text y={11} color={accent?C.background:C.text}>{children}</Text></g>;
}
function Wave({t,x=0,y=0,w=240,amplitude=30,reveal=1,color=C.yellow}: {t:number;x?:number;y?:number;w?:number;amplitude?:number;reveal?:number;color?:string}){
 const points=Array.from({length:91},(_,i)=>`${i===0?"M":"L"}${x+w*i/90} ${y+Math.sin(i/90*Math.PI*8-t*4)*Math.sin(i/90*Math.PI)*amplitude}`).join(" ");
 return <path d={points} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-reveal}/>;
}

export function TelephoneFilm({plan,profile,audio,alignment=[]}: {plan:Storyboard;profile:StyleProfile;format:string;audio?:string;alignment?:SpeechAlignment[]}){
 const t=useCurrentFrame()/30,clock=sceneClock(plan),base=audio?.split("/").slice(0,-1).join("/")??"";
 const envelope=(i:number)=>{
  const s=clock[i];return (i===0?1:smooth(t,s.start-.45,s.start+.45))*(i===clock.length-1?1:1-smooth(t,s.end-.45,s.end+.45));
 };
 const weight=(...modes:Mode[])=>clamp(clock.reduce((sum,s,i)=>sum+(modes.includes(s.history?.mode??"hook")?envelope(i):0),0));
 const first=(...modes:Mode[])=>clock.find(s=>modes.includes(s.history?.mode??"hook"))?.start??999;
 const local=(...modes:Mode[])=>t-first(...modes);
 const arrive=(modes:Mode[],delay:number,d=.6,cue?:string)=>{
  const i=clock.findIndex(s=>modes.includes(s.history?.mode??"hook"));
  const word=cue&&alignment[i]?.words?.find(w=>w.text.toLocaleLowerCase("ru").includes(cue.toLocaleLowerCase("ru")));
  const at=word?word.start-first(...modes):delay;
  return smooth(local(...modes),at-.08,at+d);
 };
 const textEnvelope=(i:number)=>{
  const s=clock[i];return (i===0?1:smooth(t,s.start,s.start+.35))*(i===clock.length-1?1:1-smooth(t,s.end-.28,s.end));
 };
 const modeArt=(modes:Mode[],children:React.ReactNode)=>{
  const p=clamp(clock.reduce((sum,s,i)=>sum+(modes.includes(s.history?.mode??"hook")?textEnvelope(i):0),0));return <g opacity={p} style={{transformOrigin:"430px 260px",transform:`scale(${.97+.03*p})`}}>{children}</g>;
 };
 const network=weight("network","exchange","distance","mobile","legacy");
 const progress=clamp(t/clock.at(-1)!.end);
 const images=["bell-1876","bell-drawing","operators-1928","operators-1937","bell-longdistance-1892"] as const;
 const portrait=(id:string)=>id==="bell-1876"||id==="bell-drawing"||id==="bell-longdistance-1892";
 return <AbsoluteFill style={{background:C.background,color:C.text,fontFamily:"'Manrope Variable',sans-serif",overflow:"hidden"}}>
  {audio&&<Audio src={staticFile(audio)}/>}
  <div style={{position:"absolute",left:52,right:106,top:74,height:1356,borderRadius:55,background:`linear-gradient(180deg,${C.card}AA,${C.background}00 65%)`}}/>
  <div style={{position:"absolute",left:78,right:140,top:108,display:"flex",alignItems:"center",gap:19}}>
   <div style={{width:66,height:66,borderRadius:40,background:C.background,border:`2px solid ${C.purple}`,flexShrink:0}}/>
   <div><div style={{fontSize:29,fontWeight:750}}>{profile.username??brand.username}</div><div style={{fontSize:23,color:C.muted,marginTop:3}}>История технологий · телефон</div></div>
   <div style={{marginLeft:"auto",fontSize:24,color:C.lavender,fontWeight:700}}>~2:30</div>
  </div>
  <div style={{position:"absolute",left:78,top:210,width:860,height:10,display:"flex",gap:8}}>
   {clock.map((s,i)=><div key={s.id} style={{flex:1,height:10,background:C.surface,borderRadius:7,overflow:"hidden"}}><div style={{height:10,width:`${clamp((t-s.start)/(s.end-s.start))*100}%`,borderRadius:7,background:interpolateColors(smooth(t,s.end-.25,s.end+.25),[0,1],[C.yellow,C.purple])}}/></div>)}
  </div>
  {clock.map((s,i)=>{
   const p=(i===0?1:smooth(t,s.start,s.start+.35))*(i===clock.length-1?1:1-smooth(t,s.end-.35,s.end));
   return <div key={s.id} style={{position:"absolute",left:78,top:276,width:860,opacity:p}}>
    <div style={{fontSize:62,lineHeight:1.08,fontWeight:800,letterSpacing:-2.5,minHeight:138,textWrap:"balance"}}>{s.title}</div>
    <div style={{position:"absolute",top:-39,left:0,color:C.yellow,fontSize:24,fontWeight:750}}>{s.history?.era}</div>
    <div style={{fontSize:28,color:C.muted,lineHeight:1.3,marginTop:10,height:76}}>{s.subtitle}</div>
   </div>;
  })}

  <div style={{position:"absolute",left:78,top:515,width:860,height:555}}>
   {/* One archive stage; image layers retain their identity across adjacent chapters. */}
   {images.map(id=>{
    const scenes=clock.map((s,i)=>({s,i})).filter(({s})=>s.history?.imageId===id);
    const p=clamp(scenes.reduce((sum,{i})=>sum+envelope(i),0));
    const a=scenes[0]?.s.start??0,b=scenes.at(-1)?.s.end??1;
    const q=clamp((t-a)/(b-a));
    const wide=!portrait(id),w=wide?860:350,h=wide?350:465;
    return <div key={id} style={{position:"absolute",left:0,top:0,width:w,height:h,opacity:p,transform:`scale(${.9+.1*p})`,transformOrigin:wide?"center center":"left center",borderRadius:28,overflow:"hidden",border:`2px solid ${C.purpleStroke}77`,background:C.card}}>
     <Img src={staticFile(`${base}/assets/${id}.jpg`)} style={{width:"100%",height:"100%",objectFit:id==="bell-drawing"?"contain":"cover",objectPosition:id==="bell-longdistance-1892"?"50% 62%":"50% 44%",transform:`scale(${1+.045*q})`}}/>
     <div style={{position:"absolute",inset:0,background:`linear-gradient(0deg,${C.background}88,transparent 30%)`}}/>
    </div>;
   })}

   <svg width={860} height={555} style={{position:"absolute",inset:0,overflow:"visible"}}>
    {/* The two ends of the conversation and its wire persist through the story. */}
    <g opacity={.25+.75*(1-weight("bell","inventors","patent","call","distance"))}>
     <path d={`M108 486 C280 ${486-145*network} 580 ${486-145*network} 752 486`} fill="none" stroke={C.purple} strokeWidth={3} strokeOpacity={.55}/>
     <path d={`M108 486 C280 ${486-145*network} 580 ${486-145*network} 752 486`} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="4 28" strokeDashoffset={-t*27} opacity={.7}/>
     <Phone x={75} y={486} scale={.68}/><Phone x={785} y={486} scale={.68}/>
    </g>

    {modeArt(["hook"],<>
     <g opacity={arrive(["hook"],.2)}><Text x={590} y={100} size={56}>Сначала —</Text><Text x={590} y={168} size={56} color={C.lavender}>голос в проводе.</Text></g>
     <g opacity={arrive(["hook"],2)}><Text x={590} y={290} size={34}>Потом — целая сеть.</Text><Wave t={t} x={410} y={365} w={360} amplitude={30}/></g>
    </>)}
    {modeArt(["telegraph"],<>
     <Badge x={190} y={155}>ПРИВЕТ</Badge><Badge x={670} y={155}>ПРИВЕТ</Badge>
     <Text x={190} y={95} size={25} color={C.muted}>Сообщение</Text><Text x={670} y={95} size={25} color={C.muted}>Снова сообщение</Text>
     <path d="M190 189V270H670V189" fill="none" stroke={C.purple} strokeWidth={3}/>
     {[0,1,2,3,4,5,6,7].map(n=><rect key={n} x={245+n*47} y={256} width={n%3===0?30:10} height={12} rx={5} fill={C.yellow} opacity={smooth(local("telegraph"),.5+n*.13,1+n*.13)}/>)}
     <Text x={430} y={325} color={C.lavender}>Дискретные сигналы</Text><Text x={430} y={360} size={23} color={C.muted}>Условная схема телеграфного кода</Text>
     <g opacity={arrive(["telegraph"],5,.6,"живую")}><Wave t={t} x={280} y={405} w={300} amplitude={20}/><Text x={430} y={455} size={27}>Речь — непрерывные изменения</Text></g>
    </>)}
    {modeArt(["inventors"],<>
     <Text x={600} y={75} size={32}>Идея уже витала в воздухе</Text>
     {["Филипп Рейс","Антонио Меуччи","Элиша Грей"].map((name,n)=><g key={name} opacity={arrive(["inventors"],.3+n*.65,.6,["Рейс","Меуччи","Грей"][n])} transform={`translate(0 ${(1-arrive(["inventors"],.3+n*.65,.6,["Рейс","Меуччи","Грей"][n]))*15})`}><Badge x={600} y={160+n*100} w={440}>{name}</Badge></g>)}
    </>)}
    {modeArt(["bell"],<>
     <Text x={595} y={84} size={40}>Александр Грэм Белл</Text><Text x={595} y={133} size={28} color={C.muted}>Исследовал речь и звук</Text>
     <g opacity={arrive(["bell"],.6,.6,"вместе")}><Badge x={595} y={230} w={360}>Белл + Томас Уотсон</Badge></g>
     <g opacity={arrive(["bell"],1.6)}><Wave t={t} x={430} y={345} w={330} amplitude={36}/><Text x={595} y={414} color={C.lavender}>От идеи к работающей машине</Text></g>
    </>)}
    {modeArt(["patent"],<>
     <Text x={595} y={106} size={78} color={C.lavender}>7 марта</Text><Text x={595} y={195} size={94}>1876</Text>
     <g opacity={arrive(["patent"],.6)}><Badge x={595} y={295} w={390}>Патент № 174 465</Badge><Text x={595} y={375} size={28} color={C.muted}>Ещё не дата знаменитого звонка</Text></g>
    </>)}
    {modeArt(["call"],<>
     <Text x={595} y={92} size={68} color={C.lavender}>10 марта</Text><Text x={595} y={167} size={76}>1876</Text>
     <g opacity={arrive(["call"],.4,.6,"попросил")}><rect x={389} y={220} width={412} height={170} rx={30} fill={C.lavender}/><Text x={595} y={281} size={36} color={C.background}>«Мистер Уотсон,</Text><Text x={595} y={330} size={36} color={C.background}>зайдите ко мне»</Text></g>
     <Text x={595} y={438} size={24} color={C.muted}>Текст звонка, а не его аудиозапись</Text>
    </>)}
    {modeArt(["wave"],<>
     <Text x={430} y={55} size={36} color={C.lavender}>Как голос проходит по проводу</Text>
     <g opacity={arrive(["wave"],.2)}><Text x={140} y={125} size={31}>Голос</Text><Wave t={t} x={28} y={218} w={85} amplitude={29}/></g>
     <g opacity={arrive(["wave"],.7,.6,"мембран")}>
      <path d="M145 166V270M134 166H162M134 270H162" fill="none" stroke={C.purple} strokeWidth={3}/>
      <path d={`M151 176Q${151+13*Math.sin(t*8)} 218 151 260`} fill="none" stroke={C.yellow} strokeWidth={5}/>
      <Text x={140} y={326} size={25} color={C.muted}>Мембрана</Text>
     </g>
     <g opacity={arrive(["wave"],2.5,.6,"электрический")}>
      <Text x={430} y={125} size={31}>Электричество</Text>
      <path d="M171 218H314M546 218H698" fill="none" stroke={C.purple} strokeWidth={3}/>
      <rect x={314} y={175} width={232} height={86} rx={20} fill={C.card} stroke={C.purpleStroke} strokeWidth={2}/>
      <Wave t={t} x={329} y={218} w={202} amplitude={19} color={C.lavender}/>
      <Text x={430} y={326} size={25} color={C.muted}>Сигнал в проводе</Text>
     </g>
     <g opacity={arrive(["wave"],5,.6,"другом")}>
      <Text x={720} y={125} size={31}>Снова звук</Text>
      <path d="M710 166V270M699 166H727M699 270H727" fill="none" stroke={C.purple} strokeWidth={3}/>
      <path d={`M716 176Q${716+13*Math.sin(t*8-1)} 218 716 260`} fill="none" stroke={C.yellow} strokeWidth={5}/>
      <Wave t={t} x={745} y={218} w={86} amplitude={29}/><Text x={720} y={326} size={25} color={C.muted}>Мембрана</Text>
     </g>
     <Text x={430} y={410} size={24} color={C.muted}>Упрощённая схема принципа, не точная сборка аппарата</Text>
    </>)}
    {modeArt(["network"],<>
     <rect x={0} y={0} width={860} height={420} rx={28} fill={C.background}/>
     <Text x={430} y={50} size={36}>Два аппарата — ещё не сеть</Text>
     {[{x:120,y:180},{x:430,y:120},{x:740,y:180},{x:220,y:360},{x:640,y:360}].map((p,n)=><g key={n} opacity={arrive(["network"],.2+n*.45)}><path d={`M${p.x} ${p.y}L430 250`} stroke={C.purple} strokeWidth={2.5}/><Phone x={p.x} y={p.y} scale={.7}/></g>)}
     <g opacity={arrive(["network"],1.8,.6,"свести")}><Badge x={430} y={250} w={230} h={95} accent>Станция</Badge></g>
    </>)}
    {modeArt(["exchange"],<>
     <rect x={0} y={360} width={860} height={111} rx={22} fill={C.card}/>
     <Text x={430} y={401} size={31}>Оператор соединяет абонентов</Text><Text x={430} y={447} size={29} color={C.lavender}>1928 · более поздняя иллюстрация</Text>
    </>)}
    {modeArt(["dial"],<>
     <circle cx={260} cy={220} r={145} fill={C.card} stroke={C.purpleStroke} strokeWidth={3}/>
     <circle cx={260} cy={220} r={58} fill={C.background} stroke={C.lavender} strokeWidth={3}/>
     {Array.from({length:10},(_,n)=>{const angle=(n*27-55)*Math.PI/180;return <g key={n} opacity={arrive(["dial"],.05*n)}><circle cx={260+Math.cos(angle)*106} cy={220+Math.sin(angle)*106} r={22} fill={C.surface} stroke={C.lavender} strokeWidth={2}/><Text x={260+Math.cos(angle)*106} y={229+Math.sin(angle)*106} size={23}>{(n+1)%10}</Text></g>;})}
     <Text x={260} y={425} size={25} color={C.muted}>Импульсы набора</Text>
     <g opacity={arrive(["dial"],1,.6,"номер")}>
      <Badge x={650} y={75} w={300}>Набираем номер</Badge><path d="M420 220H505" stroke={C.yellow} strokeWidth={3}/>
      {[0,1,2,3,4].map(n=>{const a=(n-2)*.25,selected=arrive(["dial"],3,.9,"находил");return <g key={n}><circle cx={540+Math.cos(a)*200} cy={240+Math.sin(a)*200} r={13} fill={n===2?interpolateColors(selected,[0,1],[C.surface,C.yellow]):C.surface} stroke={C.lavender} strokeWidth={2}/><Text x={540+Math.cos(a)*200+34} y={249+Math.sin(a)*200} size={23} color={C.muted}>{n+1}</Text></g>;})}
      <path d={`M540 240L${540+Math.cos(-.5+.5*arrive(["dial"],3,.9,"находил"))*180} ${240+Math.sin(-.5+.5*arrive(["dial"],3,.9,"находил"))*180}`} stroke={C.yellow} strokeWidth={5} strokeLinecap="round"/>
      <circle cx={540} cy={240} r={12} fill={C.lavender}/><Text x={650} y={385} size={29} color={C.lavender}>Переключатель</Text><Text x={650} y={430} size={24} color={C.muted}>Образец: 1897–1898</Text>
     </g>
    </>)}
    {modeArt(["distance"],<>
     <Text x={605} y={65} size={64} color={C.lavender}>1892</Text><Text x={605} y={125} size={31}>Нью-Йорк — Чикаго</Text>
     <path d="M420 250Q590 100 780 290" fill="none" stroke={C.purple} strokeWidth={3}/><path d="M420 250Q590 100 780 290" fill="none" stroke={C.yellow} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1-arrive(["distance"],.4,1.3,"линии")}/><circle cx={420} cy={250} r={8} fill={C.yellow}/><circle cx={780} cy={290} r={8} fill={C.yellow}/>
     <Text x={600} y={385} size={25} color={C.lavender}>Разговор выходит за пределы города</Text>
    </>)}
    {modeArt(["legacy","mobile"],<>
     <rect x={0} y={0} width={860} height={420} rx={28} fill={C.background}/>
     <Text x={430} y={65} size={46}>Изобретение стало системой</Text>
     {["Аппарат","Соединение","Сеть"].map((word,n)=><g key={word} opacity={arrive(["legacy","mobile"],.2+n*.6)}><Badge x={145+n*285} y={205} w={250} h={100} accent={n===2}>{word}</Badge>{n<2&&<path d={`M${276+n*285} 205h25`} stroke={C.yellow} strokeWidth={3}/>}</g>)}
     <g opacity={arrive(["legacy","mobile"],1.4)}><Text x={430} y={343} size={36} color={C.lavender}>Слышать друг друга на расстоянии</Text><Text x={430} y={405} size={30} color={C.yellow}>Нью-Йорк → Сан-Франциско</Text></g>
    </>)}
   </svg>
   {clock.map((s,i)=>s.history?.imageId&&<div key={`credit-${s.id}`} style={{position:"absolute",left:0,top:512,width:860,fontSize:20,color:C.muted,opacity:textEnvelope(i),lineHeight:1.3}}>{s.history.imageCaption}{/Library of Congress|\bLOC\b/.test(s.history.imageCaption)?"":" · Library of Congress"}</div>)}
  </div>
  {alignment.map((a,i)=><Captions key={i} a={a} t={t}/>)}
  <div style={{position:"absolute",left:78,top:1375,width:860,height:2,background:C.surface}}><div style={{width:`${progress*100}%`,height:2,background:C.purple}}/></div>
 </AbsoluteFill>;
}
