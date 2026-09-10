import test from 'node:test';
import assert from 'node:assert/strict';
import {connectAstra} from '../server/connect-astra.ts';

test('a successful upgrade outlives the handshake timeout; a stalled upgrade is aborted',async t=>{
  let signal:AbortSignal|undefined;
  const successful=t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{
    signal=init.signal!;return new Response(null);
  });
  await connectAstra('test-placeholder',10);
  await new Promise(r=>setTimeout(r,30));
  assert.equal(signal?.aborted,false,'successful sockets must not retain a ticking abort deadline');
  successful.mock.restore();
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>{
    init.signal!.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')));
  }));
  await assert.rejects(connectAstra('test-placeholder',10),{name:'AbortError'});
});
