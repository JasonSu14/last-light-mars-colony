import assert from 'node:assert/strict';
const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/$/,'');
const create=await fetch(`${base}/api/missions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'rehearsal'})});
assert.equal(create.status,201,`Session creation: ${create.status} ${await create.clone().text()}`);
const session=await create.json(),url=`${base}/api/missions/${session.id}`,headers={Authorization:`Bearer ${session.token}`},abort=new AbortController();
let snapshot,events=[],failure;const subscribers=new Set();
const waitFor=(predicate,timeout=12000)=>new Promise((resolve,reject)=>{if(predicate())return resolve();const timer=setTimeout(()=>{subscribers.delete(check);reject(Error('Timed out waiting for mission event.'));},timeout);function check(){if(failure){clearTimeout(timer);subscribers.delete(check);reject(failure);}else if(predicate()){clearTimeout(timer);subscribers.delete(check);resolve();}}subscribers.add(check);});
try{
 assert.equal((await fetch(`${url}/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 const response=await fetch(`${url}/stream`,{headers,signal:abort.signal});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);
 const anchor=response.body.pipeTo(new WritableStream(),{signal:abort.signal}).catch(()=>{});
 const read=(async()=>{let cursor=0;try{while(!abort.signal.aborted){const r=await fetch(`${url}/events?after=${cursor}`,{headers,signal:abort.signal});assert.equal(r.status,200);const batch=await r.json();for(const row of batch.events){cursor=row.id;const e=row.event;events.push(e);if(e.type==='snapshot')snapshot=e;if(e.type==='error')failure=Error(e.message);}for(const subscriber of subscribers)subscriber();if(batch.closed)break;await new Promise(resolve=>setTimeout(resolve,500));}}catch(error){if(!abort.signal.aborted){failure=error;for(const subscriber of subscribers)subscriber();}}})();
 await waitFor(()=>snapshot?.game.phase==='running');
 assert.equal(snapshot.game.mode,'rehearsal');
 assert.equal((await fetch(`${url}/stream`,{headers})).status,409,'duplicate stream must not start another operator');
 async function command(data){const requestId=crypto.randomUUID();const r=await fetch(`${url}/commands`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({...data,requestId})});assert.equal(r.status,202);await waitFor(()=>events.some(e=>e.type==='ack'&&e.requestId===requestId));return requestId;}
 await command({type:'pause',paused:true});await waitFor(()=>snapshot.paused);
 await command({type:'inject',scenario:'oxygen'});await waitFor(()=>snapshot.game.injections===1);
 const frozen=structuredClone(snapshot.game);
 await new Promise(resolve=>setTimeout(resolve,3500));
 assert.deepEqual(snapshot.game,frozen,'paused stream must freeze every simulation value');
 await command({type:'pause',paused:false});await waitFor(()=>!snapshot.paused&&snapshot.game.jobs.length===2);
 assert.ok(snapshot.game.tick-frozen.tick<7,'paused wall time must not catch up');
 await waitFor(()=>snapshot.game.health.lifeSupport===80,25000);
 assert.ok(snapshot.game.log.some(l=>l.kind==='diagnostic'&&l.text.includes('complete')));
 console.log('PASS: Hosted-compatible HTTP event polling, authenticated commands, duplicate-stream guard, pause, injected disaster, resume, asynchronous diagnostics and repair. No OpenAI API calls.');
 abort.abort();await Promise.all([read,anchor]);
}finally{abort.abort();await fetch(url,{method:'DELETE',headers}).catch(()=>{});}
