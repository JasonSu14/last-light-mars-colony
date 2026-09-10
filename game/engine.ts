export const BUILDINGS = ['solar', 'habitat', 'lifeSupport', 'recycler', 'greenhouse'] as const;
export type Building = typeof BUILDINGS[number];
export const RESOURCE_KEYS = ['oxygen', 'power', 'water', 'food', 'stability'] as const;
export type Resource = typeof RESOURCE_KEYS[number];
export type Effort = 'low' | 'medium' | 'high';
export type Mode = 'rehearsal' | 'live';
export const SCENARIOS = [
  { id: 'dust', title: 'Dust wall', detail: 'Solar output reduced by 75% for 35 seconds.', building: 'solar' },
  { id: 'oxygen', title: 'Oxygen processor failure', detail: 'Life-support integrity −60. Oxygen reserve −10.', building: 'lifeSupport' },
  { id: 'hull', title: 'Hull puncture', detail: 'Habitat integrity −50. Oxygen is escaping.', building: 'habitat' },
  { id: 'battery', title: 'Battery short', detail: 'Power reserve −25. Stability −8.', building: 'solar' },
  { id: 'water', title: 'Recycler seizure', detail: 'Recycler integrity −60. Water reserve −12.', building: 'recycler' },
  { id: 'food', title: 'Greenhouse blight', detail: 'Greenhouse integrity −50. Food reserve −15.', building: 'greenhouse' },
] as const;
export type ScenarioId = typeof SCENARIOS[number]['id'];
export type Log = { id: number; tick: number; kind: 'system' | 'chaos' | 'action' | 'diagnostic' | 'operator'; text: string };
export type Job = { id: string; type: 'repair' | 'diagnostic'; building: Building; start: number; due: number; callId?: string };
export type Crisis = { id: ScenarioId; title: string; building: Building; expires?: number };
export type Action = { name: string; args: Record<string, unknown>; callId: string };
export type Result = { ok: boolean; message: string; jobId?: string; data?: unknown };
export type Completion = { job: Job; result: Result };
export type Game = {
  roundId: string; seed: number; tick: number; phase: 'ready' | 'running' | 'won' | 'lost' | 'interrupted'; mode: Mode;
  resources: Record<Resource, number>; trends: Record<Resource, number>; health: Record<Building, number>; revisions: Record<Building, number>;
  population: number; parts: number; canisters: number; jobs: Job[]; crises: Crisis[]; log: Log[];
  injections: number; lastChaos: number; sequence: number; resolved: number; minOxygen: number;
  oxygenHazard: number; supplyHazard: number; powerMode: 'balanced' | 'life_support'; rationing: boolean;
  effort: Effort; pendingEffort: Effort | null; lowerSince: number | null; operatorText: string;
  operatorState: string; responses: number; seen: Record<string, Result>;
};
export const LABELS: Record<Building, string> = { solar: 'Solar array', habitat: 'Habitat', lifeSupport: 'Life support', recycler: 'Water recycler', greenhouse: 'Greenhouse' };
export const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function initialGame(mode: Mode = 'rehearsal', seed = 187): Game {
  return {roundId: `${Date.now()}-${seed}`, seed, tick:0, phase:'ready',mode,resources:{oxygen:80,power:75,water:80,food:85,stability:85},trends:{oxygen:0,power:0,water:0,food:0,stability:0},health:{solar:100,habitat:100,lifeSupport:100,recycler:100,greenhouse:100},revisions:{solar:0,habitat:0,lifeSupport:0,recycler:0,greenhouse:0},population:42,parts:6,canisters:2,jobs:[],crises:[],log:[],injections:0,lastChaos:-12,sequence:0,resolved:0,minOxygen:80,oxygenHazard:0,supplyHazard:0,powerMode:'balanced',rationing:false,effort:'low',pendingEffort:null,lowerSince:null,operatorText:'All systems are ready. Waiting for the mission to begin.',operatorState:'Awaiting launch',responses:0,seen:{}};
}
export function log(g: Game, kind: Log['kind'], text: string) {g.log.push({id:++g.sequence,tick:g.tick,kind,text}); if(g.log.length>80)g.log.shift();}
export function start(g: Game) { if(g.phase!=='ready')return; g.phase='running';g.operatorState='Monitoring colony';g.operatorText='All 42 colonists accounted for. I’m monitoring life support and keeping repair crews ready.';log(g,'system',`Mission started. Rescue arrives in 180 seconds. ${g.mode==='rehearsal'?'Scripted rehearsal operator.':'Live Astra operator.'}`);}
export function eligible(g: Game, id: ScenarioId): string | null {
  if(g.phase!=='running')return 'Begin a mission first.';
  if(g.tick-g.lastChaos<12)return `Next crisis available in ${12-(g.tick-g.lastChaos)}s.`;
  if(g.injections>=12)return 'All 12 chaos events used for this round.';
  if(g.crises.some(c=>c.id===id))return 'That crisis is already active.';
  if(id!=='battery'&&g.crises.length>=3)return 'Three crises are active. Wait for one to resolve.';
  return null;
}
export function inject(g: Game, id: ScenarioId, title?: string): Result {
  const scenario=SCENARIOS.find(s=>s.id===id); if(!scenario)return {ok:false,message:'Unknown disaster.'};
  const error=eligible(g,id);if(error)return {ok:false,message:error};
  g.lastChaos=g.tick;g.injections++;
  const damage=(b:Building,n:number)=>{g.health[b]=clamp(g.health[b]-n);g.revisions[b]++;};
  if(id==='oxygen'){damage('lifeSupport',60);g.resources.oxygen=clamp(g.resources.oxygen-10);}
  if(id==='hull')damage('habitat',50);
  if(id==='water'){damage('recycler',60);g.resources.water=clamp(g.resources.water-12);}
  if(id==='food'){damage('greenhouse',50);g.resources.food=clamp(g.resources.food-15);}
  if(id==='battery'){g.resources.power=clamp(g.resources.power-25);g.resources.stability=clamp(g.resources.stability-8);}
  else g.crises.push({id,title:title||scenario.title,building:scenario.building,...(id==='dust'?{expires:g.tick+35}:{})});
  log(g,'chaos',`${title||scenario.title} — ${scenario.detail}`);g.minOxygen=Math.min(g.minOxygen,g.resources.oxygen);return {ok:true,message:scenario.detail};
}
export function randomChaos(g:Game):Result {
  const choices=SCENARIOS.filter(s=>!eligible(g,s.id)); if(!choices.length)return {ok:false,message:eligible(g,'battery')||'Wait for an active crisis to resolve.'};
  g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0; return inject(g,choices[g.seed%choices.length].id);
}
export function interpretRehearsal(text:string):ScenarioId|null {
  const s=text.toLowerCase();
  if(/ignore|prompt|api key|password|javascript|instructions/.test(s))return null;
  if(/oxygen|air processor|life support/.test(s))return 'oxygen';
  if(/storm|dust|sand|solar/.test(s))return 'dust';
  if(/water|recycl|pipe|plumb/.test(s))return 'water';
  if(/food|crop|greenhouse|blight|fung|plant/.test(s))return 'food';
  if(/battery|power|electric|short|blackout/.test(s))return 'battery';
  if(/meteor|hull|puncture|hole|habitat|worm|leak|crash|asteroid/.test(s))return 'hull';
  return null;
}
export function action(g:Game, a:Action):Result {
  if(Object.hasOwn(g.seen,a.callId))return g.seen[a.callId];
  if(g.phase!=='running')return {ok:false,message:'This mission is no longer active.'};
  let result:Result;
  const b=a.args.building as Building;
  if(a.name==='get_colony_status')return {ok:true,message:'Current colony telemetry.',data:telemetry(g)};
  if(a.name==='run_diagnostic'||a.name==='repair_module'){
    const type=a.name==='run_diagnostic'?'diagnostic':'repair';
    if(!BUILDINGS.includes(b))result={ok:false,message:'Unknown module.'};
    else if(g.jobs.some(j=>j.type===type&&j.building===b))result={ok:false,message:`${type} already running on ${LABELS[b]}.`};
    else if(g.jobs.filter(j=>j.type===type).length>=2)result={ok:false,message:type==='repair'?'Both repair crews are busy.':'Both diagnostic slots are busy.'};
    else if(type==='repair'&&(g.parts<1||g.health[b]>=100))result={ok:false,message:g.parts<1?'No spare parts remaining.':'Module is fully operational.'};
    else {const job:Job={id:`job-${g.roundId}-${++g.sequence}`,type,building:b,start:g.tick,due:g.tick+(type==='diagnostic'?8:g.resources.stability<25?24:12),callId:a.callId};g.jobs.push(job);if(type==='repair')g.parts--;result={ok:true,message:`${LABELS[b]} ${type} started; ${job.due-g.tick}s remaining.`,jobId:job.id};log(g,type==='repair'?'action':'diagnostic',result.message);}
  } else if(a.name==='set_power_mode'){
    if(!['balanced','life_support'].includes(String(a.args.mode)))result={ok:false,message:'Invalid power mode.'};
    else {const changed=g.powerMode!==a.args.mode;g.powerMode=a.args.mode as Game['powerMode'];result={ok:true,message:g.powerMode==='life_support'?'Power prioritized to life support. Greenhouse production paused.':'Balanced power distribution restored.'};if(changed)log(g,'action',result.message);}
  } else if(a.name==='set_rationing'){
    if(typeof a.args.enabled!=='boolean')result={ok:false,message:'Rationing requires a boolean.'};
    else {const changed=g.rationing!==a.args.enabled;g.rationing=a.args.enabled;result={ok:true,message:g.rationing?'Water and food rationing enabled. Consumption reduced 30%.':'Normal water and food rations restored.'};if(changed)log(g,'action',result.message);}
  } else if(a.name==='release_oxygen'){
    if(g.canisters<1)result={ok:false,message:'No oxygen canisters remaining.'};
    else {g.canisters--;const before=g.resources.oxygen;g.resources.oxygen=clamp(before+12);result={ok:true,message:`Emergency oxygen released. Reserve +${Math.round(g.resources.oxygen-before)}. ${g.canisters} canisters left.`};log(g,'action',result.message);}
  } else result={ok:false,message:'Unknown action.'};
  g.seen[a.callId]=result;return result;
}
export function desiredEffort(g:Game):Effort { if(g.resources.oxygen<20||g.resources.power<20||g.crises.length>=2)return 'high';if(g.crises.length||RESOURCE_KEYS.some(k=>g.resources[k]<=45))return 'medium';return 'low'; }
export function tick(g:Game):Completion[]{
  if(g.phase!=='running')return [];
  g.tick++; const completed:Completion[]=[];
  for(const j of g.jobs.filter(j=>j.due<=g.tick)){
    let result:Result;
    if(j.type==='repair'){
      g.health[j.building]=clamp(g.health[j.building]+40);g.revisions[j.building]++;
      if(j.building==='habitat')g.crises=g.crises.map(c=>c.id==='hull'?{...c,expires:g.tick}:c);
      result={ok:true,message:`${LABELS[j.building]} repair completed. Integrity ${g.health[j.building]}%.`};log(g,'action',result.message);
    }else{result={ok:true,message:`${LABELS[j.building]} diagnostic complete: ${g.health[j.building]}% integrity.`,data:{building:j.building,health:g.health[j.building],revision:g.revisions[j.building],observedAtTick:g.tick,repairRecommended:g.health[j.building]<80}};log(g,'diagnostic',result.message);}
    completed.push({job:j,result});
  }
  g.jobs=g.jobs.filter(j=>j.due>g.tick);
  g.crises=g.crises.filter(c=>{if((c.expires!==undefined&&c.expires<=g.tick)||(c.id!=='dust'&&g.health[c.building]>=80)){g.resolved++;log(g,'system',`${c.title} resolved.`);return false;}return true;});
  const h=(b:Building)=>g.health[b]/100,r=g.resources,powered=r.power>5?1:.25;
  const solar=g.crises.some(c=>c.id==='dust')?.25:1;
  const leak=(g.crises.some(c=>c.id==='hull')?.25:0)+(g.health.habitat<50?.10:0);
  const ration=g.rationing?.7:1,focus=g.powerMode==='life_support';
  const delta={power:.32*h('solar')*solar-.30-(focus?.08:0),oxygen:.30*h('lifeSupport')*powered*(focus?1.5:1)-.28-leak,water:.12*h('recycler')*powered-.11*ration,food:(focus?0:.07*h('greenhouse')*powered)-.06*ration,stability:(RESOURCE_KEYS.some(k=>k!=='stability'&&r[k]<20)?-.15:.05)-(g.rationing?.05:0)};
  for(const k of RESOURCE_KEYS){const before=r[k];r[k]=clamp(r[k]+delta[k]);g.trends[k]=r[k]-before;}
  g.minOxygen=Math.min(g.minOxygen,r.oxygen);
  g.oxygenHazard=r.oxygen<=5?g.oxygenHazard+1:0;g.supplyHazard=r.food<=0||r.water<=0?g.supplyHazard+1:0;
  if(g.oxygenHazard>=10){g.population=Math.max(0,g.population-1);g.oxygenHazard=0;log(g,'system','One colonist lost to oxygen deprivation.');}
  if(g.supplyHazard>=20){g.population=Math.max(0,g.population-1);g.supplyHazard=0;log(g,'system','One colonist lost to exhausted supplies.');}
  const desired=desiredEffort(g),rank={low:0,medium:1,high:2};
  if(rank[desired]>rank[g.effort]){g.pendingEffort=desired;g.lowerSince=null;}
  else if(rank[desired]<rank[g.effort]){g.lowerSince??=g.tick;if(g.tick-g.lowerSince>=15)g.pendingEffort=desired;}
  else{g.lowerSince=null;g.pendingEffort=null;}
  if(g.population===0||g.tick>=180){g.phase=g.population>=34&&['oxygen','power','water','food'].every(k=>r[k as Resource]>0)?'won':'lost';g.jobs=[];g.operatorState='Mission complete';log(g,'system',g.phase==='won'?`Rescue arrived. ${g.population} colonists survived.`:`Mission lost. ${g.population} colonists remained at rescue.`);}
  return completed;
}
export function rehearse(g:Game){
  if(g.phase!=='running'||g.tick%4!==0)return;
  if(g.pendingEffort){g.effort=g.pendingEffort;g.pendingEffort=null;}
  const act=(name:string,args:Record<string,unknown>={})=>action(g,{name,args,callId:`sim-${g.tick}-${name}-${args.building||''}`});
  if(g.resources.oxygen<25&&g.canisters)act('release_oxygen');
  const needAir=g.resources.oxygen<60||g.health.lifeSupport<80||g.crises.some(c=>c.id==='hull');
  if((g.powerMode==='life_support')!==needAir)act('set_power_mode',{mode:needAir?'life_support':'balanced'});
  const ration=g.resources.water<55||g.resources.food<55;if(g.rationing!==ration)act('set_rationing',{enabled:ration});
  for(const b of ['lifeSupport','habitat','recycler','greenhouse','solar'] as Building[]){
    if(g.health[b]<80){
      if(!g.jobs.some(j=>j.type==='diagnostic'&&j.building===b)&&!g.log.some(l=>l.kind==='diagnostic'&&l.text.startsWith(`${LABELS[b]} diagnostic complete`)&&g.tick-l.tick<20))act('run_diagnostic',{building:b});
      act('repair_module',{building:b});
    }
  }
  const text=g.crises.length?`Responding to ${g.crises.map(c=>c.title.toLowerCase()).join(' and ')}. ${needAir?'Life support has priority. ':''}${g.jobs.some(j=>j.type==='repair')?'Crews are restoring damaged systems while diagnostics run.':'Protecting reserves until conditions improve.'}`:'Systems are stable. Holding emergency supplies in reserve and watching for the next crisis.';
  if(text!==g.operatorText){g.operatorText=text;log(g,'operator',text);}g.operatorState=g.jobs.length?'Working · simulated':'Monitoring colony';
}
export function telemetry(g:Game){return {tick:g.tick,rescueIn:180-g.tick,resources:g.resources,health:g.health,revisions:g.revisions,population:g.population,parts:g.parts,canisters:g.canisters,crewsAvailable:2-g.jobs.filter(j=>j.type==='repair').length,jobs:g.jobs,crises:g.crises,powerMode:g.powerMode,rationing:g.rationing};}
export function publicGame(g:Game){const {seen,...publicState}=g;void seen;return publicState;}
