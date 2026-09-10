"use client";

import { useState } from "react";
import { useMission } from "./use-mission";
import { eligible, LABELS } from "@/game/engine";
import type { Building, Resource, ScenarioId } from "@/game/engine";
import { ArrowUpRight, Activity, BatteryCharging, ChevronRight, CircleHelp, Cpu, Droplets, HeartPulse, Leaf, Radio, RotateCcw, ShieldCheck, Shuffle, Sparkles, TriangleAlert, Users, Wind, Zap, Play, Satellite, Wrench, House, Sun, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const buildings = [
  { id: "solar", label: "Solar array", code: "PWR–01", icon: Sun, x: 25, y: 24 },
  { id: "habitat", label: "Habitat", code: "HAB–01", icon: House, x: 69, y: 23 },
  { id: "lifeSupport", label: "Life support", code: "OXY–01", icon: Wind, x: 49, y: 51 },
  { id: "recycler", label: "Water recycler", code: "H₂O–01", icon: Droplets, x: 23, y: 78 },
  { id: "greenhouse", label: "Greenhouse", code: "AGR–01", icon: Leaf, x: 76, y: 76 },
];
const resources = [
  { id: "oxygen", label: "Oxygen", value: 80, icon: Wind, unit: "AIR RESERVE" },
  { id: "power", label: "Power", value: 75, icon: Zap, unit: "BATTERY RESERVE" },
  { id: "water", label: "Water", value: 80, icon: Droplets, unit: "WATER RESERVE" },
  { id: "food", label: "Food", value: 85, icon: Leaf, unit: "FOOD RESERVE" },
  { id: "stability", label: "Stability", value: 85, icon: HeartPulse, unit: "COLONY RESILIENCE" },
];
const scenarios = [
  { id: "dust", title: "Dust wall", detail: "Solar output ↓ 75%", icon: Wind },
  { id: "oxygen", title: "Oxygen failure", detail: "Life support damaged", icon: FlaskConical },
  { id: "hull", title: "Hull puncture", detail: "Atmosphere escaping", icon: TriangleAlert },
  { id: "battery", title: "Battery short", detail: "Power reserve ↓ 25", icon: Zap },
  { id: "water", title: "Recycler seizure", detail: "Water system damaged", icon: Droplets },
  { id: "food", title: "Greenhouse blight", detail: "Food supply damaged", icon: Leaf },
];

export default function Home() {
  const { game:g,liveAvailable,connecting,parsing,notice,setNotice,begin,inject,random,text,reset,report }=useMission();
  const started=g.phase==='running';
  const finished=['won','lost','interrupted'].includes(g.phase);
  const cooldown=Math.max(0,12-(g.tick-g.lastChaos));
  const remaining=Math.max(0,180-g.tick);
  const disabled=!started||cooldown>0||parsing||g.injections>=12;
  const startMode=(mode:'live'|'rehearsal')=>{void begin(mode).catch(report)};
  const submitText=()=>{if(!chaosText.trim())return;void text(chaosText).then(()=>setChaosText('')).catch(report)};
  const [chaosText, setChaosText] = useState("");

  return <main className="mission">
    <header className="masthead">
      <a className="brand" href="/" aria-label="Last Light home"><span className="brand-mark"><Satellite size={23} strokeWidth={1.5}/></span><span>LAST LIGHT<small>MARS COLONY / MISSION CONTROL</small></span></a>
      <div className="mission-coordinates"><span>38.4° N / 141.6° E</span><b>UTOPIA PLANITIA</b></div>
      <div className="header-right"><span className="mode-badge"><span className="status-dot"/> {g.mode==='live'?'LIVE ASTRA':'REHEARSAL'}</span><span className="sol">SOL <b>187</b></span></div>
    </header>
    <section className="mission-heading">
      <div><div className="eyebrow"><span className="small-line"/> HUMANITY’S LAST OUTPOST</div><h1>How much chaos can<br className="mobile-break"/> Astra handle<span>?</span></h1><p>You create the crisis. Astra keeps the colony alive.</p></div>
      <div className="mission-clock"><span>UNTIL RESCUE</span><strong>{String(Math.floor(remaining/60)).padStart(2,'0')}<span>:</span>{String(remaining%60).padStart(2,'0')}</strong><small><Users size={13}/> <b>{g.population}</b> colonists counting on Astra</small></div>
    </section>
    <div className="workspace">
      <aside className="telemetry panel">
        <div className="panel-heading"><h2><Activity size={14}/> COLONY VITALS</h2><span className="quiet-dot"/></div>
        <div className="resource-list">{resources.map(r=><div className="resource" key={r.id}><div className="resource-top"><span><r.icon size={16}/>{r.label}</span><strong>{Math.round(g.resources[r.id as Resource])}<small>%</small></strong></div><Progress value={g.resources[r.id as Resource]} className={`resource-progress ${g.resources[r.id as Resource]<20?'critical':g.resources[r.id as Resource]<45?'warning':''}`} aria-label={`${r.label} reserve`}/><div className="resource-caption"><span>{r.unit}</span><span className={g.resources[r.id as Resource]<20?'critical-text':'nominal'}>{g.resources[r.id as Resource]<20?'CRITICAL':g.trends[r.id as Resource]<-.04?'↓ FALLING':'NOMINAL'}</span></div></div>)}</div>
        <div className="reserves"><span>EMERGENCY SUPPLIES</span><div><Wrench size={14}/><b>{g.parts}</b> spare parts</div><div><BatteryCharging size={14}/><b>{g.canisters}</b> oxygen canisters</div><div><Users size={14}/><b>{2-g.jobs.filter(j=>j.type==='repair').length}</b> repair crews available</div></div>
      </aside>
      <section className="colony panel">
        <div className="panel-heading"><h2><Radio size={14}/> COLONY OVERVIEW</h2><span className="map-status"><span className="status-dot"/> {g.crises.length?`${g.crises.length} ACTIVE CRISES`:'ALL SYSTEMS NOMINAL'}</span></div>
        <div className={`colony-map ${g.crises.some(c=>c.id==='dust')?'dust-active':''}`}>
          <div className="map-coordinate top">SECTOR 07 — UT0P / NETWORK TOPOLOGY</div>
          <svg className="network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M25 24 H49 V51 M69 23 H49 M23 78 H49 V51 M76 76 H49"/></svg>
          <div className="map-ring ring-one"/><div className="map-ring ring-two"/>
          {buildings.map(b=><button className={`module module-${b.id} ${g.health[b.id as Building]<80?'damaged':''} ${g.jobs.some(j=>j.type==='repair'&&j.building===b.id)?'repairing':''}`} key={b.id} style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={()=>setNotice(`${b.label}: ${g.health[b.id as Building]}% integrity. ${g.jobs.some(j=>j.building===b.id)?'Operations in progress.':'No active operations.'}`)}><span className="module-code">{b.code}</span><span className="module-icon"><b.icon size={28} strokeWidth={1.3}/></span><strong>{b.label}</strong><span className="module-condition"><i/> {g.health[b.id as Building]}% INTEGRITY</span></button>)}
          <span className="map-cross cross-one">+</span><span className="map-cross cross-two">+</span>
          <div className="map-scale"><i/><span>CONNECTED SYSTEMS</span></div>
          {!started && <div className="start-overlay"><div className="start-card"><span className="start-kicker"><ShieldCheck size={15}/> {finished?'MISSION REPORT':'MISSION BRIEF'}</span><h2>{finished?(g.phase==='won'?'Humanity gets another sunrise.':g.phase==='lost'?'The colony went dark.':'Mission interrupted.'):<>{'42 lives. 3 minutes.'}<br/>You control the chaos.</>}</h2><p>{finished?(g.phase==='interrupted'?g.operatorText:`${g.population} colonists survived. ${g.resolved} crises resolved. Lowest oxygen: ${Math.round(g.minOxygen)}%.`):'Keep at least 34 colonists alive until rescue. Create a crisis, then watch the operator respond.'}</p>{finished?<Button className="start-button" onClick={reset}><RotateCcw size={15}/> New mission</Button>:<>{liveAvailable&&<Button className="start-button" disabled={connecting} onClick={()=>startMode('live')}><Sparkles size={15}/> {connecting?'Connecting…':'Launch with Astra'}<ArrowUpRight size={17}/></Button>}<Button className={liveAvailable?'rehearsal-button':'start-button'} disabled={connecting} onClick={()=>startMode('rehearsal')}><Play size={15} fill="currentColor"/>{connecting?'Connecting…':'Begin rehearsal'}<ArrowUpRight size={17}/></Button></>}<small>{g.mode==='live'?'GPT-6 ASTRA · LIVE OPERATOR':'REHEARSAL · SCRIPTED OPERATOR'}</small>{!liveAvailable&&!finished&&<small className="live-pending">Live Astra connection pending</small>}</div></div>}
        </div>
        <div className="map-footer"><span><Users size={14}/><strong>{g.population} / 42</strong> ALIVE</span><span><ShieldCheck size={14}/> {g.powerMode==='life_support'?'LIFE SUPPORT PRIORITIZED':'RESCUE WINDOW OPEN'}</span></div>
      </section>
      <aside className="operator panel">
        <div className="panel-heading"><h2><Sparkles size={14}/> COLONY OPERATOR</h2><span className="operator-led"/></div>
        <div className="operator-identity"><div className="astra-symbol"><Sparkles size={28} strokeWidth={1.3}/></div><div><h2>ASTRA<span> / {g.mode==='live'?'LIVE':'SIM'}</span></h2><p>{g.mode==='live'?'GPT-6 · Colony operator':'Scripted rehearsal operator'}</p></div></div>
        <div className="effort"><span>REASONING EFFORT</span><div className={`effort-${g.effort}`}><i/><i/><i/><b>{g.mode==='rehearsal'?'SIM · ':''}{g.pendingEffort?`${g.pendingEffort.toUpperCase()} QUEUED`:g.effort.toUpperCase()}</b></div></div>
        <div className="operator-message"><span className="eyebrow">CURRENT OBJECTIVE</span><h3>{g.crises.length?'Stabilize the colony.':g.phase==='won'?'Everyone who made it. A future.':'Keep the lights on.'}<br/>{g.crises.length?'Protect every life.':'Keep everyone breathing.'}</h3><p>{g.operatorText}</p><div className="message-signature"><span className="status-dot"/>{g.operatorState.toUpperCase()}</div></div>
        <div className="jobs"><h3>ACTIVE OPERATIONS <span>{g.jobs.length}</span></h3>{g.jobs.length?g.jobs.map(j=><div className="job" key={j.id}><div>{j.type==='repair'?<Wrench size={12}/>:<Cpu size={12}/>}<span>{LABELS[j.building]}</span><b>{j.due-g.tick}s</b></div><small>{j.type==='repair'?'REPAIR CREW DEPLOYED':'ASYNC DIAGNOSTIC'}</small><Progress value={100*(g.tick-j.start)/(j.due-j.start)} aria-label={`${j.type} progress`} className="job-progress"/></div>):<div className="jobs-empty"><Cpu size={22} strokeWidth={1}/><p>No operations running</p><small>Diagnostics and repairs appear here.</small></div>}</div>
        <div className="operator-note"><CircleHelp size={14}/><span>Disasters can arrive while Astra is working. Its next move has to adapt.</span></div>
      </aside>
    </div>
    <section className="chaos-console panel"><div className="chaos-heading"><div><span className="chaos-index">02 /</span><h2>Be the unpredictable part.</h2></div><span>{parsing?'INTERPRETING…':cooldown&&started?`NEXT CRISIS IN ${cooldown}s`:`CHAOS CONTROL · ${g.injections}/12`}</span></div><div className="chaos-input-row"><div className="chaos-field"><TriangleAlert size={17}/><input aria-label="Describe a disaster" maxLength={240} value={chaosText} onChange={e=>setChaosText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!disabled)submitText()}} placeholder="A meteor tears through the oxygen processor…"/><Button className="inject-button" disabled={disabled||!chaosText.trim()} onClick={submitText}>Inject chaos <ChevronRight size={16}/></Button></div><Button className="random-button" disabled={disabled} onClick={()=>{void random().catch(report)}}><Shuffle size={17}/> Create chaos</Button></div><div className="scenario-row">{scenarios.map(s=><button disabled={disabled||!!eligible(g,s.id as ScenarioId)} title={eligible(g,s.id as ScenarioId)||s.detail} key={s.id} onClick={()=>{void inject(s.id as ScenarioId).catch(report)}}><s.icon size={15}/><span>{s.title}</span><ChevronRight size={12}/></button>)}</div></section>
    {notice&&<div className="notice" role="status"><Activity size={14}/><span>{notice}</span><button aria-label="Dismiss notice" onClick={()=>setNotice('')}>×</button></div>}
    <section className="event-feed"><div><span className="status-dot"/><h2>MISSION LOG</h2><span className="log-count">{String(g.log.length||1).padStart(2,'0')}</span>{g.mode==='live'&&<span className="response-count">{g.responses}/24 responses</span>}</div><div className="log-entries">{g.log.length?g.log.slice(-6).reverse().map(entry=><p className={`log-${entry.kind}`} key={entry.id}><time>T+{String(entry.tick).padStart(3,'0')}</time><span>{entry.text}</span><small>{entry.kind.toUpperCase()}</small></p>):<p><time>T+000</time><span>Mission control ready. All 42 colonists accounted for.</span><small>SYSTEM</small></p>}</div></section>
    <footer className="page-footer"><span>LAST LIGHT <i>/</i> A MARS SURVIVAL EXPERIMENT</span><span>YOU BRING THE CHAOS. WE’LL SEE WHAT SURVIVES.</span><button onClick={reset}><RotateCcw size={12}/> Reset mission</button></footer>
  </main>;
}
