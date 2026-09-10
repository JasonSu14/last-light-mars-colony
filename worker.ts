import { httpMission } from './server/http-mission.ts';
import handler from 'vinext/server/fetch-handler';
import { missionSocket,liveEnabled } from './server/mission.ts';
import type { Env } from './server/mission.ts';
export default {
 async fetch(request:Request, env:Env, ctx:ExecutionContext){
  const url=new URL(request.url);
  if(url.pathname==='/api/missions'||url.pathname.startsWith('/api/missions/'))return httpMission(request,env,ctx);
  if(url.pathname==='/api/mission')return missionSocket(request,env);
  if(url.pathname==='/api/config')return Response.json({liveAvailable:liveEnabled(env),model:'gpt-6-astra'},{headers:{'Cache-Control':'no-store'}});
  if(url.pathname==='/api/health')return Response.json({status:'ok'});
  return handler.fetch(request,env,ctx);
 }
};
