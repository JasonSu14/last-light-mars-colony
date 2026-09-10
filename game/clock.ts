/** Simulation time excludes every paused interval, including delayed tab updates. */
export class MissionClock {
  private last: number;
  private elapsed = 0;
  paused = false;
  constructor(now: number) { this.last = now; }
  advance(now: number) {
    const delta = Math.max(0, now - this.last);
    this.last = Math.max(this.last, now);
    if (!this.paused) this.elapsed += delta;
    return Math.min(180, Math.floor(this.elapsed / 1000));
  }
  pause(value: boolean, now: number) { this.advance(now); this.paused = value; }
}
