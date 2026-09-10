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
