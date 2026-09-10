"use client";
import { useCallback,useEffect,useRef,useState } from 'react';
import { initialGame } from '@/game/engine';
import { Rehearsal } from '@/game/rehearsal';
import type { Game,Mode,ScenarioId } from '@/game/engine';

type Pending={resolve:(value:unknown)=>void;reject:(reason:Error)=>void;timer:ReturnType<typeof setTimeout>};
type Connection={id:string;token:string;abort:AbortController};
export function useMission(){
 const [game,setGame]=useState<Game>(()=>initialGame());const current=useRef(game);
 const [paused,setPaused]=useState(false);const pauseState=useRef(false);
 const [liveAvailable,setLive]=useState(false),[connecting,setConnecting]=useState(false),[parsing,setParsing]=useState(false),[notice,setNotice]=useState('');
 const connection=useRef<Connection|null>(null),pending=useRef(new Map<string,Pending>()),launch=useRef<Pending|null>(null),starting=useRef(false);
 const rehearsal=useRef<Rehearsal|null>(null);
 const showRehearsal=useCallback(()=>{if(rehearsal.current){const next=structuredClone(rehearsal.current.game);current.current=next;setGame(next);pauseState.current=rehearsal.current.paused;setPaused(pauseState.current);}},[]);
 const clearPending=useCallback(()=>{for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error('Mission connection closed.'));}pending.current.clear();if(launch.current){clearTimeout(launch.current.timer);launch.current.reject(Error('Mission could not start.'));launch.current=null;}},[]);
 const disconnect=useCallback(()=>{starting.current=false;const c=connection.current;connection.current=null;if(c){c.abort.abort();void fetch(`/api/missions/${c.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${c.token}`},keepalive:true}).catch(()=>{});}clearPending();},[clearPending]);
 useEffect(()=>{fetch('/api/config').then(r=>r.json()).then(v=>setLive(!!v&&typeof v==='object'&&'liveAvailable' in v&&v.liveAvailable===true)).catch(()=>{});return disconnect;},[disconnect]);
 const begin=useCallback(async(mode:Mode)=>{
  if(starting.current||connection.current||rehearsal.current)throw Error('Reset the mission before starting another.');
  setNotice('');setConnecting(true);starting.current=true;
  if(mode==='rehearsal'){rehearsal.current=new Rehearsal(Date.now(),Math.floor(Math.random()*1000000));showRehearsal();setConnecting(false);starting.current=false;return {phase:'running',mode};}
  try{
   const res=await fetch('/api/missions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode}),signal:AbortSignal.timeout(15000)});
   const data=await res.json() as {id:string;token:string;error?:string};if(!res.ok)throw Error(data.error||'Could not start mission.');
   const c:Connection={id:data.id,token:data.token,abort:new AbortController()};
   if(!starting.current){void fetch(`/api/missions/${c.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${c.token}`}});return;}
   connection.current=c;
   return await new Promise<unknown>((resolve,reject)=>{
    launch.current={resolve,reject,timer:setTimeout(()=>{setNotice('Mission connection timed out.');disconnect();setConnecting(false);},20000)};
    void (async()=>{
     try{
      const stream=await fetch(`/api/missions/${c.id}/stream`,{headers:{Authorization:`Bearer ${c.token}`},signal:c.abort.signal});
      if(!stream.ok||!stream.body)throw Error('Could not connect to mission control.');
      const reader=stream.body.getReader(),decoder=new TextDecoder();let buffer='';
      while(connection.current===c){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});let boundary;
       while((boundary=buffer.indexOf('\n\n'))!==-1){const line=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);if(!line.startsWith('data: '))continue;
        const event=JSON.parse(line.slice(6));
        if(event.type==='snapshot'){
         const next={...event.game,seen:{}} as Game;current.current=next;setGame(next);pauseState.current=!!event.paused;setPaused(pauseState.current);setConnecting(false);starting.current=false;
         if(launch.current){clearTimeout(launch.current.timer);launch.current.resolve({phase:next.phase,mode:next.mode});launch.current=null;}
        }else if(event.type==='error'){setNotice(event.message);for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error(event.message));}pending.current.clear();}
        else if(event.type==='parsing')setParsing(event.active);
        else if(event.type==='ack'){setNotice(event.message);const p=pending.current.get(event.requestId);if(p){clearTimeout(p.timer);pending.current.delete(event.requestId);p.resolve({ok:true,message:event.message});}}
       }
      }
     }catch(error){if(connection.current===c)setNotice(error instanceof Error?error.message:'Mission connection interrupted.');}
     finally{if(connection.current===c){disconnect();setConnecting(false);setParsing(false);if(current.current.phase==='running'){const next={...current.current,phase:'interrupted' as const,operatorState:'Connection interrupted',operatorText:'The connection ended. Start a fresh mission to reconnect.',jobs:[]};current.current=next;setGame(next);}}}
    })();
   });
  }catch(error){setConnecting(false);starting.current=false;throw error;}
 },[disconnect,showRehearsal]);
 useEffect(()=>{const timer=setInterval(()=>{if(rehearsal.current?.game.phase==='running'){rehearsal.current.advance(Date.now());showRehearsal();}},1000);return()=>clearInterval(timer);},[showRehearsal]);
 const command=useCallback((data:Record<string,unknown>)=>new Promise<unknown>((resolve,reject)=>{
  if(rehearsal.current){try{let result;if(data.type==='pause'){rehearsal.current.pause(data.paused===true,Date.now());result={ok:true,message:data.paused?'Time paused.':'Time resumed.'};}else result=rehearsal.current.command(data,Date.now());showRehearsal();setNotice(result.message);if(!result.ok)throw Error(result.message);resolve(result);}catch(error){reject(error instanceof Error?error:Error('Could not apply crisis.'));}return;}
  const c=connection.current;if(!c||current.current.phase!=='running'){reject(Error('Begin a mission first.'));return;}
  const requestId=crypto.randomUUID();pending.current.set(requestId,{resolve,reject,timer:setTimeout(()=>{pending.current.delete(requestId);reject(Error('The command could not be applied in time.'));},25000)});
  void fetch(`/api/missions/${c.id}/commands`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify({...data,requestId}),signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok){const v=await r.json() as {error:string};throw Error(v.error);}}).catch(error=>{const p=pending.current.get(requestId);if(p){clearTimeout(p.timer);pending.current.delete(requestId);p.reject(error);}});
 }),[showRehearsal]);
 const reset=useCallback(()=>{rehearsal.current=null;disconnect();const next=initialGame();current.current=next;setGame(next);setNotice('');setConnecting(false);setParsing(false);pauseState.current=false;setPaused(false);},[disconnect]);
 const pause=useCallback((value:boolean)=>command({type:'pause',paused:value}),[command]);
 const inject=useCallback((scenario:ScenarioId)=>command({type:'inject',scenario}),[command]);
 const random=useCallback(()=>command({type:'random'}),[command]);
 const text=useCallback((value:string)=>command({type:'text',text:value.trim()}),[command]);
 const report=useCallback((error:unknown)=>setNotice(error instanceof Error?error.message:'Could not complete this action.'),[]);
 useEffect(()=>{
  type ModelContext={registerTool:(tool:{name:string;title:string;description:string;inputSchema:object;annotations?:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
  const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools=[
   {name:'read_mars_colony',title:'Read colony status',description:'Read the current Mars mission, reserves and active crises.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({phase:current.current.phase,mode:current.current.mode,tick:current.current.tick,resources:current.current.resources,population:current.current.population,crises:current.current.crises,paused:pauseState.current,jobs:current.current.jobs})},
   {name:'start_mars_rehearsal',title:'Start rehearsal',description:'Start a new scripted Mars-colony rehearsal from the ready screen. Does not start a paid live game.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>begin('rehearsal')},
   {name:'inject_mars_chaos',title:'Inject a crisis',description:'Apply one preset disaster to the active mission. Respects cooldown and event limits.',inputSchema:{type:'object',properties:{scenario:{type:'string',enum:['dust','oxygen','hull','battery','water','food']}},required:['scenario'],additionalProperties:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length!==1||!('scenario'in input)||!['dust','oxygen','hull','battery','water','food'].includes(String(input.scenario)))throw Error('Invalid scenario.');return inject(input.scenario as ScenarioId);}},
   {name:'pause_mars_colony',title:'Pause or resume time',description:'Pause simulation while composing chaos, or resume it.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||!('paused' in input)||typeof input.paused!=='boolean')throw Error('Provide paused as a boolean.');return pause(input.paused);}},
  ];
  for(const tool of tools)try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[begin,inject,pause]);
 return {game,paused,pause,liveAvailable,connecting,parsing,notice,setNotice,begin,inject,random,text,reset,report};
}
