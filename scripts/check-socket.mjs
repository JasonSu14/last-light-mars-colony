import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://localhost:5173';
const ws=new WebSocket(origin.replace(/^http/,'ws')+'/api/mission');
let launched=false,done=false,damaged=false,diagnosed=false,repaired=false,cooldownRejected=false;
const timer=setTimeout(()=>{console.error('Mission socket check timed out.');ws.close();process.exitCode=1;},23000);
ws.onopen=()=>ws.send(JSON.stringify({type:'start',mode:'rehearsal',requestId:'test-start'}));
const heartbeat=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'heartbeat'}));},1000);
ws.onmessage=e=>{try{const event=JSON.parse(e.data);if(event.type==='error'){assert.match(event.message,/available in/);cooldownRejected=true;}
 if(event.type!=='snapshot')return;const g=event.game;
 if(!launched){launched=true;assert.equal(g.population,42);ws.send(JSON.stringify({type:'inject',scenario:'oxygen',requestId:'test-crisis'}));ws.send(JSON.stringify({type:'inject',scenario:'battery',requestId:'test-rejected'}));}
 if(g.health.lifeSupport===40)damaged=true;
 if(g.jobs.some(j=>j.type==='diagnostic'))diagnosed=true;
 if(g.health.lifeSupport===80)repaired=true;
 if(g.tick>=17&&!done){done=true;assert.equal(damaged,true);assert.equal(diagnosed,true);assert.equal(repaired,true);assert.equal(cooldownRejected,true);console.log('PASS: server mission, damage, cooldown rejection, async diagnostic, and repair completion.');clearTimeout(timer);clearInterval(heartbeat);ws.close();}
 }catch(e){console.error(e.message);clearTimeout(timer);clearInterval(heartbeat);ws.close();process.exitCode=1;}};
ws.onerror=()=>{console.error('WebSocket connection failed.');clearTimeout(timer);clearInterval(heartbeat);process.exitCode=1;};
ws.onclose=()=>{clearInterval(heartbeat);if(!done){clearTimeout(timer);console.error('WebSocket closed before checks completed.');process.exitCode=1;}};
