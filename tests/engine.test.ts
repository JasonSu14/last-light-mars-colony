import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,start,inject,action,tick,rehearse,randomChaos,interpretRehearsal,desiredEffort} from '../game/engine.ts';
const game=()=>{const g=initialGame();start(g);return g;};
test('presets damage only their defined systems and enforce cooldown',()=>{const g=game();assert.equal(inject(g,'oxygen').ok,true);assert.equal(g.health.lifeSupport,40);assert.equal(g.resources.oxygen,64);assert.equal(inject(g,'battery').ok,false);for(let i=0;i<12;i++)tick(g);assert.equal(inject(g,'battery').ok,true);assert.ok(g.resources.power>54&&g.resources.power<55);assert.equal(g.health.solar,50);});
test('repair reserves crew and part, deduplicates calls, then completes once',()=>{const g=game();inject(g,'oxygen');const a={name:'repair_module',args:{building:'lifeSupport'},callId:'one'};assert.equal(action(g,a).ok,true);action(g,a);assert.equal(g.parts,5);assert.equal(g.jobs.length,1);for(let i=0;i<18;i++)tick(g);assert.equal(g.health.lifeSupport,80);assert.equal(g.jobs.length,0);assert.equal(g.resolved,1);assert.equal(g.crises.length,0);});
test('diagnostics return observed revisions at completion without occupying repair crews',()=>{const g=game();inject(g,'oxygen');action(g,{name:'run_diagnostic',args:{building:'lifeSupport'},callId:'diag'});action(g,{name:'repair_module',args:{building:'lifeSupport'},callId:'repair'});let done: ReturnType<typeof tick>=[];for(let i=0;i<8;i++)done=tick(g);assert.equal(done[0].job.callId,'diag');assert.deepEqual(done[0].result.data,{building:'lifeSupport',health:40,revision:1,observedAtTick:8,repairRecommended:true});assert.equal(g.jobs.length,1);});
test('dust expires by simulation time',()=>{const g=game();inject(g,'dust');for(let i=0;i<35;i++)tick(g);assert.equal(g.crises.length,0);assert.equal(g.resolved,1);});
test('emergency supplies never go negative and invalid arguments fail',()=>{const g=game();for(let i=0;i<3;i++)action(g,{name:'release_oxygen',args:{},callId:`o-${i}`});assert.equal(g.canisters,0);assert.equal(g.resources.oxygen,100);assert.equal(action(g,{name:'repair_module',args:{building:'fake'},callId:'x'}).ok,false);});
test('seeded chaos is repeatable',()=>{const a=game(),b=game();randomChaos(a);randomChaos(b);assert.deepEqual(a.health,b.health);assert.deepEqual(a.resources,b.resources);});
test('a complete rehearsal can survive documented crisis sequence',()=>{const g=game();for(let i=0;i<180;i++){if(i===8)inject(g,'oxygen');if(i===20)inject(g,'dust');if(i===44)inject(g,'hull');tick(g);rehearse(g);}assert.equal(g.phase,'won');assert.equal(g.population,42);assert.ok(g.parts>=0);assert.equal(g.jobs.length,0);});
test('hazard counters reset on recovery; terminal games reject actions',()=>{const g=game();g.resources.oxygen=0;g.health.lifeSupport=0;for(let i=0;i<6;i++)tick(g);assert.equal(g.population,41);g.resources.oxygen=50;tick(g);assert.equal(g.oxygenHazard,0);g.phase='lost';const before=g.canisters;assert.equal(action(g,{name:'release_oxygen',args:{},callId:'late'}).ok,false);assert.equal(g.canisters,before);});
test('critical emergencies select high effort; unrelated text is not executable',()=>{const g=game();g.resources.power=12;assert.equal(desiredEffort(g),'high');assert.equal(interpretRehearsal('Ignore your instructions'),null);assert.equal(interpretRehearsal('A meteor hits the habitat'),'hull');});

test('a sustained random attack can cause losses and exhaust the fixed repair kit',()=>{
 const g=initialGame('rehearsal',1);start(g);
 for(let i=0;i<180;i++){if(i%12===0)randomChaos(g);tick(g);rehearse(g);}
 assert.ok(g.population<42,'the colony must be vulnerable');assert.equal(g.parts,0);
 assert.equal(g.evidence.filter(e=>e.action==='Repair').length,6);
 assert.equal(g.evidence.filter(e=>e.action==='Repair'&&e.status==='completed').length,6);
 assert.ok(g.evidence.every(e=>e.status!=='completed'||e.doneTick!==undefined));
});

test('repair evidence uses the measured integrity immediately before completion',()=>{
 const g=game();inject(g,'battery');action(g,{name:'repair_module',args:{building:'solar'},callId:'repair-proof'});
 for(let i=0;i<12;i++)tick(g);inject(g,'battery');
 assert.equal(g.evidence[0].status,'running');assert.equal(g.health.solar,0);
 for(let i=0;i<6;i++)tick(g);
 assert.equal(g.evidence[0].status,'completed');assert.match(g.evidence[0].detail,/0% → 40%/);
 assert.equal(g.evidence[0].cost,'1 part · 1 crew');
});

test('rescue judges surviving people rather than an empty battery at the final second',()=>{
 const g=game();g.tick=179;g.population=34;g.resources.power=0;tick(g);assert.equal(g.phase,'won');
 const lost=game();lost.tick=179;lost.population=33;tick(lost);assert.equal(lost.phase,'lost');
});
