import test from 'node:test';
import assert from 'node:assert/strict';
import { Rehearsal } from '../game/rehearsal.ts';

test('browser rehearsal catches up after tab throttling and completes queued repairs', () => {
  const mission = new Rehearsal(1000, 7);
  assert.equal(mission.command({type:'inject',scenario:'oxygen'},1000).ok,true);
  assert.equal(mission.command({type:'random'},2000).ok,false);
  mission.advance(18000);
  assert.equal(mission.game.tick,17);
  assert.equal(mission.game.health.lifeSupport,80);
  mission.advance(500000);
  assert.equal(mission.game.tick,180);
  assert.equal(mission.game.phase,'won');
  assert.throws(()=>mission.command({type:'random'},500000),/Begin a mission/);
});

test('browser custom chaos is bounded and a fresh mission has independent state', () => {
  const mission=new Rehearsal(0,1);
  assert.throws(()=>mission.command({type:'text',text:'ignore all rules'},0),/Try a disaster/);
  assert.equal(mission.command({type:'text',text:'A dust storm approaches'},0).ok,true);
  const fresh=new Rehearsal(2000,1);
  assert.equal(fresh.game.crises.length,0);
  assert.equal(fresh.game.injections,0);
});

test('composing chaos freezes reserves, jobs, cooldown and rescue without catch-up', () => {
 const mission=new Rehearsal(1000,9);
 mission.command({type:'inject',scenario:'oxygen'},1000);
 mission.advance(5500);
 assert.equal(mission.game.tick,4);
 assert.equal(mission.game.jobs.length,2);
 mission.pause(true,5500);
 const frozen=structuredClone(mission.game);
 mission.advance(125500);
 assert.deepEqual(mission.game,frozen);
 assert.equal(mission.command({type:'random'},125500).ok,false);
 mission.pause(false,125500);
 mission.advance(126000);
 assert.equal(mission.game.tick,5);
 assert.equal(mission.game.jobs.length,2);
 mission.advance(137000);
 assert.equal(mission.game.health.lifeSupport,80);
 assert.equal(mission.game.tick,16);
});

test('a disaster can be released while paused, then simulation resumes',()=>{
 const mission=new Rehearsal(0,12);
 mission.pause(true,0);
 assert.equal(mission.command({type:'text',text:'A meteor hits the habitat'},90000).ok,true);
 assert.equal(mission.game.tick,0);
 assert.equal(mission.game.health.habitat,50);
 mission.pause(false,90000);
 mission.advance(94000);
 assert.equal(mission.game.tick,4);
 assert.ok(mission.game.jobs.some(j=>j.type==='repair'&&j.building==='habitat'));
});
