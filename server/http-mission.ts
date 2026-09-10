import { attachMission, liveEnabled, missionMessage } from './mission.ts';
import type { Env, MissionChannel } from './mission.ts';

type Session={id:string;token_hash:string;mode:'live'|'rehearsal';status:string;expires_at:number};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function body(req:Request){const raw=await req.text();if(raw.length>2000)throw Error('Command too large.');return JSON.parse(raw);}

/** HTTP streaming avoids inbound WebSocket upgrades rejected by the hosting gateway.
 * D1 coordinates commands across Worker instances; each stream owns one simulation.
 * Tokens stay in browser memory, never URLs. No game state or API secrets enter D1.
 */
export async function httpMission(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
 const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Origin not allowed.'},403);
 const db=env.DB;if(!db)return json({error:'Mission transport is not configured.'},503);
 const path=new URL(req.url).pathname;const now=Date.now();
 try{
  if(path==='/api/missions'&&req.method==='POST'){
   const input=await body(req);
   if(!input||Object.keys(input).length!==1||!['live','rehearsal'].includes(input.mode))return json({error:'Choose a mission mode.'},400);
   if(input.mode==='live'&&!liveEnabled(env))return json({error:'Live Astra is disabled. Rehearsal is available.'},403);
   await db.prepare('DELETE FROM mission_sessions WHERE expires_at < ?').bind(now).run();
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
   const result=await db.prepare("INSERT INTO mission_sessions (id,token_hash,mode,status,created_at,expires_at) SELECT ?,?,?,'created',?,? WHERE (SELECT COUNT(*) FROM mission_sessions WHERE expires_at > ? AND status != 'closed' AND mode = ?) < ?").bind(id,await hash(token),input.mode,now,now+900000,now,input.mode,input.mode==='live'?2:20).run();
   if(!result.meta.changes)return json({error:'Mission slots are busy. Try again shortly.'},429);
   return json({id,token},201);
  }
  const match=/^\/api\/missions\/([a-f0-9-]+)(?:\/(stream|commands))?$/.exec(path);
  if(!match)return json({error:'Unknown mission route.'},404);
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token||token.length>200)return json({error:'Mission access required.'},401);
  const session=await db.prepare('SELECT * FROM mission_sessions WHERE id = ? AND token_hash = ? AND expires_at > ?').bind(match[1],await hash(token),now).first<Session>();
  if(!session)return json({error:'Mission expired. Start a fresh mission.'},404);
  if(!match[2]&&req.method==='DELETE'){
   await db.prepare("UPDATE mission_sessions SET status = 'closed' WHERE id = ?").bind(session.id).run();return json({ok:true});
  }
  if(match[2]==='commands'&&req.method==='POST'){
   if(session.status!=='streaming')return json({error:'Mission is not connected.'},409);
   const command=missionMessage.parse(await body(req));
   if(command.type==='start'||command.type==='heartbeat')return json({error:'Invalid mission command.'},400);
   const result=await db.prepare('INSERT OR IGNORE INTO mission_commands (session_id,request_id,payload) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM mission_commands WHERE session_id = ?) < 100').bind(session.id,command.requestId,JSON.stringify(command),session.id).run();
   if(!result.meta.changes){const exists=await db.prepare('SELECT id FROM mission_commands WHERE session_id = ? AND request_id = ?').bind(session.id,command.requestId).first();if(!exists)return json({error:'Round command allowance reached.'},429);}
   return json({accepted:true,requestId:command.requestId},202);
  }
  if(match[2]!=='stream'||req.method!=='GET')return json({error:'Method not allowed.'},405);
  const claimed=await db.prepare("UPDATE mission_sessions SET status = 'streaming' WHERE id = ? AND status = 'created'").bind(session.id).run();
  if(!claimed.meta.changes)return json({error:'This mission already has a connection.'},409);
  const encoder=new TextEncoder();let controller:ReadableStreamDefaultController<Uint8Array>,closed=false,timer:ReturnType<typeof setTimeout>|undefined;
  const listeners=new Map<string,Array<(event:{data?:unknown})=>void>>();
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);for(const listener of listeners.get('close')||[])listener({});try{controller.close();}catch{}ctx.waitUntil(db.prepare("UPDATE mission_sessions SET status = 'closed' WHERE id = ?").bind(session.id).run().catch(()=>{}));};
  const channel:MissionChannel={send(data){if(!closed)controller.enqueue(encoder.encode(`data: ${data}\n\n`));},close,addEventListener(type,listener){listeners.set(type,[...(listeners.get(type)||[]),listener]);}};
  const receive=async(data:unknown)=>{for(const listener of listeners.get('message')||[])await listener({data:JSON.stringify(data)});};
  let cursor=0;
  const poll=async()=>{
   if(closed)return;
   try{
    const state=await db.prepare('SELECT status FROM mission_sessions WHERE id = ?').bind(session.id).first<{status:string}>();
    if(state?.status!=='streaming'){close();return;}
    const rows=await db.prepare('SELECT id,payload FROM mission_commands WHERE session_id = ? AND id > ? ORDER BY id LIMIT 100').bind(session.id,cursor).all<{id:number;payload:string}>();
    for(const row of rows.results){if(closed)return;cursor=row.id;await receive(JSON.parse(row.payload));}
    await receive({type:'heartbeat'});
    if(!closed)timer=setTimeout(()=>{void poll();},750);
   }catch{try{channel.send(JSON.stringify({type:'error',message:'The mission connection ended. Start a fresh mission.'}));}finally{close();}}
  };
  const stream=new ReadableStream<Uint8Array>({start(c){controller=c;attachMission(channel,env,req);void receive({type:'start',mode:session.mode,requestId:crypto.randomUUID()}).then(poll).catch(close);},cancel:close});
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'Could not process this mission request.'},400);}
}
