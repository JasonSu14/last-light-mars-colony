import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,start,tick,rehearse,inject,unattendedReplay} from '../game/engine.ts';
test('a control replay applies the same accepted disasters even when its crisis slots are full',()=>{
 const g=initialGame();start(g);
 for(let i=0;i<100;i++){
  if(i===0)inject(g,'oxygen');if(i===12)inject(g,'water');if(i===42)inject(g,'hull');if(i===66)inject(g,'food');
  tick(g);rehearse(g);
 }
 assert.equal(g.disasters.length,4);
 const copy=structuredClone(g);const control=unattendedReplay(g);
 assert.deepEqual(g,copy,'comparison must not change the actual round');
 assert.ok(control.population<g.population);assert.ok(control.oxygen<g.resources.oxygen);
});
