import {NextRequest,NextResponse} from "next/server";
import {sameOrigin} from "@/lib/http";
import {modelLibrary,saveModel,MAX_MODEL_BYTES} from "@/lib/model-assets";
import {ROOT,createProject} from "@/lib/store";
import {threeDemoPlan} from "@/lib/three-demo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({models:modelLibrary(ROOT),renderer:{id:"three/v1",models:["Смартфон","Сервер","Чип","Спутник","Земля","Луна","Примитивы"],maxBytes:MAX_MODEL_BYTES}});}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"Разрешены только запросы из локальной студии."},{status:403});
 try{
  if(req.headers.get("content-type")?.startsWith("application/json")){
   if(Number(req.headers.get("content-length")||0)>1000)throw new Error("Запрос слишком большой.");
   const b=await req.json();if(b.action!=="demo")throw new Error("Неизвестное действие.");
   const id=createProject({topic:"Техническая демонстрация 3D-рендера: смартфон, чип, сервер; плавный облёт и проезд камеры.",duration:30,format:"9:16",voice:false,renderMode:"three",initialPlan:threeDemoPlan()});return NextResponse.json({id});
  }
  if(Number(req.headers.get("content-length")||0)>MAX_MODEL_BYTES+1024*1024)throw new Error("Модель должна быть меньше 25 МБ.");
  const form=await req.formData(),file=form.get("file");if(!(file instanceof File))throw new Error("Выберите GLB или embedded GLTF.");
  if(file.size>MAX_MODEL_BYTES)throw new Error("Модель должна быть меньше 25 МБ.");
  const model=saveModel(ROOT,Buffer.from(await file.arrayBuffer()),file.name,String(form.get("name")||""),String(form.get("rights")||""));return NextResponse.json({model});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Не удалось загрузить модель."},{status:400});}
}
