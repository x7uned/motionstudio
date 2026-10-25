import {askJSON} from "./provider";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {agentJob,askViaAgent} from "./agent-provider";
import {agentDescriptor,type ContentAgent,type AgentMode} from "./quality-contract";

export type AskJSON=typeof askJSON;
// The project's content role decides the provider. Per-call options cannot swap the model:
// a Sol project always reaches Codex, an explicit Opus project always reaches Claude Code,
// an agent-mode project always reaches the driving chat agent (never a CLI).
export function contentAsk(agent:ContentAgent):AskJSON{
 if("provider" in agent&&agent.provider==="agent")return (prompt,schema,dir,images=[],signal)=>askViaAgent(prompt,schema,dir,images,signal,{model:agent.model,effort:agent.effort});
 return (prompt,schema,dir,images=[],signal)=>"provider" in agent&&agent.provider==="claude"
  ?askClaudeJSON(prompt,schema,dir,images,signal,{model:agent.model,effort:agent.effort,timeout:agent.timeout})
  :askJSON(prompt,schema,dir,images,signal,{model:agent.model,effort:agent.effort,timeout:agent.timeout});
}
export const contentLabel=(agent:ContentAgent)=>"provider" in agent&&agent.provider==="agent"?`Ведущий агент · ${agent.declaredAgent} (самоотчёт)`:"provider" in agent&&agent.provider==="claude"?"Claude Opus 5.5 · xhigh":"GPT‑6.1 Sol · xhigh";
/** Motion roles: Claude Opus 5.5 by default; the driving agent in agent mode. Legacy projects get MOTION_AGENT by reference. */
export function motionAgentFor(profile?:{production?:{version?:number;agentMode?:AgentMode}}){
 const agent=profile?.production?.agentMode;
 return agent?agentDescriptor(agent.declaredAgent):MOTION_AGENT;
}
/** Ask function for motion roles, or undefined to keep each director's own default (askClaudeJSON). */
export function motionAskFor(profile?:{production?:{version?:number;agentMode?:AgentMode}}):AskJSON|undefined{
 const agent=profile?.production?.agentMode;
 return agent?contentAsk(agentDescriptor(agent.declaredAgent)):undefined;
}
/** Director record for context files: MOTION_AGENT's fields for legacy jobs, the self-declared driving agent inside an agent job. */
export function directorRecord(){
 const job=agentJob();
 return job?{provider:"agent" as const,model:"driving-agent",effort:"xhigh" as const,declaredAgent:job.declaredAgent,verified:false}:{provider:MOTION_AGENT.provider,model:MOTION_AGENT.model,effort:MOTION_AGENT.effort};
}
