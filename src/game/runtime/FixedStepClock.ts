/** Legacy speed values are pixels per 60Hz simulation tick, independent of render Hz. */
export class FixedStepClock {
  readonly stepMs = 1000 / 60;
  private previous: number | undefined;
  private accumulator = 0;

  reset() {
    this.previous = undefined;
    this.accumulator = 0;
  }

  advance(timestamp: number, active: () => boolean, tick: () => void) {
    const elapsed = this.previous === undefined ? 0 : Math.max(0, timestamp - this.previous);
    this.previous = timestamp;
    if (active()) {
      this.accumulator = Math.min(this.accumulator + elapsed, this.stepMs * 6);
      while (this.accumulator + 1e-7 >= this.stepMs && active()) {
        tick();
        this.accumulator -= this.stepMs;
      }
      if (!active()) this.accumulator = 0;
    } else this.accumulator = 0;
    return Math.min(elapsed, 100);
  }
}
