import {initialGame,start,tick,rehearse,inject,randomChaos,unattendedReplay} from '../game/engine.ts';
const results=[];
for(const strategy of ['quiet','story','random','power']){
 const rounds=[];
 for(let seed=1;seed<=50;seed++){
  const g=initialGame('rehearsal',seed);start(g);
  for(let i=0;i<180;i++){
   if(strategy==='story'&&i===8)inject(g,'oxygen');if(strategy==='story'&&i===20)inject(g,'dust');if(strategy==='story'&&i===44)inject(g,'hull');
   if(strategy==='random'&&i%12===0)randomChaos(g);if(strategy==='power'&&i%12===0)inject(g,'battery');
   tick(g);rehearse(g);
  }
  rounds.push({survivors:g.population,won:g.phase==='won',unattended:unattendedReplay(g).population});
 }
 results.push({strategy,rounds:rounds.length,minSurvivors:Math.min(...rounds.map(r=>r.survivors)),maxSurvivors:Math.max(...rounds.map(r=>r.survivors)),meanSurvivors:rounds.reduce((a,r)=>a+r.survivors,0)/rounds.length,colonyWins:rounds.filter(r=>r.won).length,meanUnattendedSurvivors:rounds.reduce((a,r)=>a+r.unattended,0)/rounds.length});
}
console.log(JSON.stringify({operator:'Scripted rehearsal; no OpenAI calls',note:'No-operator replays use the same accepted disasters. This is game balance, not a model benchmark.',results},null,2));
