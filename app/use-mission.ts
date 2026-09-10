"use client";
import { useCallback,useEffect,useRef,useState } from 'react';
import { initialGame } from '@/game/engine';
import { Rehearsal } from '@/game/rehearsal';
import type { Game,Mode,ScenarioId } from '@/game/engine';

type Pending={resolve:(value:unknown)=>void;reject:(reason:Error)=>void;timer:ReturnType<typeof setTimeout>};
export function useMission(){
 const [game,setGame]=useState<Game>(()=>initialGame());const current=useRef(game);
 const [liveAvailable,setLive]=useState(false),[connecting,setConnecting]=useState(false),[parsing,setParsing]=useState(false),[notice,setNotice]=useState('');
 const socket=useRef<WebSocket|null>(null);const pending=useRef(new Map<string,Pending>());const launch=useRef<Pending|null>(null);
 const rehearsal=useRef<Rehearsal|null>(null);
 const showRehearsal=useCallback(()=>{if(rehearsal.current){const next=structuredClone(rehearsal.current.game);current.current=next;setGame(next);}},[]);
 const clearPending=useCallback(()=>{for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error('Mission connection closed.'));}pending.current.clear();if(launch.current){clearTimeout(launch.current.timer);launch.current.reject(Error('Mission could not start.'));launch.current=null;}},[]);
 useEffect(()=>{fetch('/api/config').then(r=>r.json()).then(v=>setLive(!!v&&typeof v==='object'&&'liveAvailable' in v&&v.liveAvailable===true)).catch(()=>{});return()=>{const ws=socket.current;socket.current=null;ws?.close();clearPending();};},[clearPending]);
 const begin=useCallback(async(mode:Mode)=>{
  if(socket.current||launch.current||rehearsal.current)throw Error('Reset the mission before starting another.');
  setNotice('');setConnecting(true);
  if(mode==='rehearsal'){rehearsal.current=new Rehearsal(Date.now(),Math.floor(Math.random()*1000000));showRehearsal();setConnecting(false);return {phase:'running',mode};}
  return new Promise<unknown>((resolve,reject)=>{
   const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/mission`);socket.current=ws;
   launch.current={resolve,reject,timer:setTimeout(()=>{if(socket.current===ws){setNotice('Mission connection timed out. Try again.');setConnecting(false);socket.current=null;ws.close();clearPending();}},20000)};
   ws.onopen=()=>ws.send(JSON.stringify({type:'start',mode,requestId:crypto.randomUUID()}));
   ws.onmessage=e=>{
    if(socket.current!==ws)return;
    try{const event=JSON.parse(e.data);
     if(event.type==='snapshot'){
      const next={...event.game,seen:{}} as Game;current.current=next;setGame(next);setConnecting(false);
      if(launch.current){clearTimeout(launch.current.timer);launch.current.resolve({phase:next.phase,mode:next.mode});launch.current=null;}
     }else if(event.type==='error'){setNotice(event.message);setConnecting(false);for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error(event.message));}pending.current.clear();}
     else if(event.type==='parsing')setParsing(event.active);
     else if(event.type==='ack'){setNotice(event.message);const p=pending.current.get(event.requestId);if(p){clearTimeout(p.timer);pending.current.delete(event.requestId);setTimeout(()=>p.resolve({ok:true,message:event.message}),0);}}
    }catch{setNotice('An unreadable update arrived. Reset the mission to reconnect.');}
   };
   ws.onclose=()=>{if(socket.current!==ws)return;socket.current=null;setConnecting(false);setParsing(false);clearPending();if(current.current.phase==='running'){const next={...current.current,phase:'interrupted' as const,operatorState:'Connection interrupted',operatorText:'The connection ended. Start a fresh mission to reconnect.',jobs:[]};current.current=next;setGame(next);}};
   ws.onerror=()=>{if(socket.current===ws){setNotice('Could not connect to mission control. Try again.');setConnecting(false);}};
  });
 },[clearPending,showRehearsal]);
 useEffect(()=>{const timer=setInterval(()=>{if(rehearsal.current?.game.phase==='running'){rehearsal.current.advance(Date.now());showRehearsal();}if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify({type:'heartbeat'}));},1000);return()=>clearInterval(timer);},[showRehearsal]);
 const command=useCallback((data:Record<string,unknown>)=>new Promise<unknown>((resolve,reject)=>{
  if(rehearsal.current){try{const result=rehearsal.current.command(data,Date.now());showRehearsal();setNotice(result.message);if(!result.ok)throw Error(result.message);resolve(result);}catch(error){reject(error instanceof Error?error:Error('Could not apply crisis.'));}return;}
  if(socket.current?.readyState!==WebSocket.OPEN||current.current.phase!=='running'){reject(Error('Begin a mission first.'));return;}
  const requestId=crypto.randomUUID();pending.current.set(requestId,{resolve,reject,timer:setTimeout(()=>{pending.current.delete(requestId);reject(Error('The crisis could not be applied in time.'));},20000)});socket.current.send(JSON.stringify({...data,requestId}));
 }),[showRehearsal]);
 const reset=useCallback(()=>{rehearsal.current=null;const ws=socket.current;socket.current=null;ws?.close();clearPending();const next=initialGame();current.current=next;setGame(next);setNotice('');setConnecting(false);setParsing(false);},[clearPending]);
 const inject=useCallback((scenario:ScenarioId)=>command({type:'inject',scenario}),[command]);
 const random=useCallback(()=>command({type:'random'}),[command]);
 const text=useCallback((value:string)=>command({type:'text',text:value.trim()}),[command]);
 const report=useCallback((error:unknown)=>setNotice(error instanceof Error?error.message:'Could not complete this action.'),[]);
 useEffect(()=>{
  type ModelContext={registerTool:(tool:{name:string;title:string;description:string;inputSchema:object;annotations?:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
  const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools=[
   {name:'read_mars_colony',title:'Read colony status',description:'Read the current Mars mission, reserves and active crises.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({phase:current.current.phase,mode:current.current.mode,tick:current.current.tick,resources:current.current.resources,population:current.current.population,crises:current.current.crises})},
   {name:'start_mars_rehearsal',title:'Start rehearsal',description:'Start a new scripted Mars-colony rehearsal from the ready screen. Does not start a paid live game.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>begin('rehearsal')},
   {name:'inject_mars_chaos',title:'Inject a crisis',description:'Apply one preset disaster to the active mission. Respects cooldown and event limits.',inputSchema:{type:'object',properties:{scenario:{type:'string',enum:['dust','oxygen','hull','battery','water','food']}},required:['scenario'],additionalProperties:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length!==1||!('scenario'in input)||!['dust','oxygen','hull','battery','water','food'].includes(String(input.scenario)))throw Error('Invalid scenario.');return inject(input.scenario as ScenarioId);}},
  ];
  for(const tool of tools)try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[begin,inject]);
 return {game,liveAvailable,connecting,parsing,notice,setNotice,begin,inject,random,text,reset,report};
}
