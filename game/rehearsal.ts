import { initialGame, start, tick, rehearse, inject, randomChaos, interpretRehearsal } from './engine.ts';
import type { ScenarioId } from './engine.ts';
import { MissionClock } from './clock.ts';

/** Browser rehearsal has no network or credentials. Live games use the server. */
export class Rehearsal {
  readonly game;
  private readonly clock: MissionClock;
  constructor(began: number, seed: number) {
    this.clock = new MissionClock(began);
    this.game = initialGame('rehearsal', seed);
    start(this.game);
  }
  advance(now: number) {
    const target = this.clock.advance(now);
    while (this.game.phase === 'running' && this.game.tick < target) {
      tick(this.game);
      rehearse(this.game);
    }
  }
  pause(value: boolean, now: number) { this.advance(now); this.clock.pause(value, now); }
  get paused() { return this.clock.paused; }
  command(data: Record<string, unknown>, now: number) {
    this.advance(now);
    if (this.game.phase !== 'running') throw Error('Begin a mission first.');
    if (data.type === 'random') return randomChaos(this.game);
    let scenario = data.scenario;
    if (data.type === 'text') {
      if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 240)
        throw Error('Describe a disaster in 240 characters or fewer.');
      scenario = interpretRehearsal(data.text);
    }
    if (!['dust', 'oxygen', 'hull', 'battery', 'water', 'food'].includes(String(scenario)))
      throw Error('Try a disaster involving air, power, water, food, the habitat, or a dust storm.');
    return inject(this.game, scenario as ScenarioId);
  }
}
