import {test} from "node:test";
import assert from "node:assert/strict";

test("storyteller reactions blend across state changes and retain their measured anchors",async()=>{
 const {narratorLayers,narratorPose}=await import("../src/lib/story-narrator");
 const keys=[{start:0,emotion:"talk"},{start:2,emotion:"surprised"}];
 assert.equal(narratorLayers(1.999,keys)[0].state,"talk");
 const start=narratorLayers(2,keys);assert.equal(start[0].opacity,1);assert.equal(start[1].opacity,0);
 const mid=narratorLayers(2.15,keys);assert.ok(Math.abs(mid[0].opacity-.5)<1e-10);assert.ok(Math.abs(mid[1].opacity-.5)<1e-10);
 assert.equal(narratorLayers(2.31,keys).length,1);
 assert.equal(narratorPose("jump",0).state,"surprised");assert.equal(narratorPose("shrug",0).state,"skeptical");
 for(let f=1;f<300;f++){const a=narratorPose("talk",(f-1)/30),b=narratorPose("talk",f/30);assert.ok(Math.abs(a.frame-b.frame)<=1);}
});
