export type ValueUpdate<T> = T | ((current: T) => T);

export interface RuntimePhase {
  gameState: string;
  isPaused: boolean;
  keys?: Set<string>;
  isMouseDown?: boolean;
}

interface Task {
  id: number;
  runId: number;
  at: number;
  callback: () => void;
}

/** Single writer for the world. Updates are synchronous, never React updaters. */
export class GameRuntime<S extends RuntimePhase> {
  readonly state: S;
  readonly stepMs = 1000 / 60;
  private time = 1_000_000;
  private runId = 0;
  private nextTaskId = 0;
  private nextEntityId = 0;
  private tasks = new Map<number, Task>();
  private updating = new Set<keyof S>();
  private queues = new Map<keyof S, Array<() => void>>();
  private listeners = new Set<() => void>();
  private revision = 0;
  private dirty = false;
  private criticalDirty = false;
  private lastPublished = 0;
  private depth = 0;
  private deaths = new Set<string>();
  private randomSource: () => number;
  private snapshot: unknown;
  private makeSnapshot: (state: S) => unknown;
  readonly metrics = { loopStarts: 0, steps: 0, renders: 0, publishes: 0 };
  recordLoopStart() {
    this.metrics.loopStarts++;
  }
  recordRender() {
    this.metrics.renders++;
  }

  constructor(
    initial: S,
    random: () => number = Math.random,
    makeSnapshot: (state: S) => unknown = (state) => ({ ...state })
  ) {
    this.state = initial;
    this.randomSource = random;
    this.makeSnapshot = makeSnapshot;
    this.snapshot = makeSnapshot(initial);
  }

  now = () => this.time;
  random = () => this.randomSource();
  nextId = (prefix: string) => `${prefix}-${this.runId}-${++this.nextEntityId}`;
  getRevision = () => this.revision;
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setter<K extends keyof S>(key: K) {
    return (update: ValueUpdate<S[K]>) => this.set(key, update);
  }

  set<K extends keyof S>(key: K, update: ValueUpdate<S[K]>) {
    if (this.updating.has(key)) {
      const queue = this.queues.get(key) ?? [];
      queue.push(() => this.set(key, update));
      this.queues.set(key, queue);
      return;
    }
    this.updating.add(key);
    try {
      const previous = this.state[key];
      const next =
        typeof update === 'function' ? (update as (current: S[K]) => S[K])(previous) : update;
      this.state[key] = next;
      this.dirty = true;
      if ((key === 'gameState' || key === 'isPaused') && previous !== next)
        this.criticalDirty = true;
      if (key === 'gameState' && previous !== next) {
        this.state.isPaused = false;
        if (next !== 'playing') this.tasks.clear();
      }
      if ((key === 'isPaused' && next) || (key === 'gameState' && next !== 'playing')) {
        this.state.keys?.clear();
        if ('isMouseDown' in this.state) this.state.isMouseDown = false;
      }
    } finally {
      this.updating.delete(key);
    }
    const queue = this.queues.get(key);
    this.queues.delete(key);
    queue?.forEach((command) => command());
    if (this.depth === 0)
      this.publish(key === 'gameState' || key === 'isPaused' || this.state.gameState !== 'playing');
  }

  transaction(action: () => void) {
    this.depth++;
    try {
      action();
    } finally {
      this.depth--;
    }
    if (this.depth === 0) this.publish(this.state.gameState !== 'playing');
  }

  schedule = (callback: () => void, delayMs: number) => {
    const id = ++this.nextTaskId;
    this.tasks.set(id, { id, runId: this.runId, at: this.time + Math.max(0, delayMs), callback });
    return id;
  };

  cancel = (id: number | undefined) => {
    if (id !== undefined) this.tasks.delete(id);
  };
  get pendingTaskCount() {
    return this.tasks.size;
  }

  resetRun() {
    this.runId++;
    this.tasks.clear();
    this.deaths.clear();
    this.queues.clear();
    this.time = 1_000_000;
    this.lastPublished = 0;
    this.state.isPaused = false;
  }

  /** Rewards may only be claimed once per enemy in a run. */
  claimDeath(id: string) {
    if (this.deaths.has(id)) return false;
    this.deaths.add(id);
    return true;
  }

  step(update: () => void) {
    if (this.state.gameState !== 'playing' || this.state.isPaused) return;
    this.transaction(() => {
      this.time += this.stepMs;
      const due = [...this.tasks.values()]
        .filter((task) => task.at <= this.time + 1e-7)
        .sort((a, b) => a.at - b.at || a.id - b.id);
      for (const task of due) {
        if (this.state.gameState !== 'playing' || this.state.isPaused) break;
        if (!this.tasks.delete(task.id) || task.runId !== this.runId) continue;
        task.callback();
      }
      if (this.state.gameState === 'playing' && !this.state.isPaused) {
        update();
        this.metrics.steps++;
      }
    });
  }

  publish(force = false) {
    if (!this.dirty || (!force && !this.criticalDirty && this.time - this.lastPublished < 100))
      return;
    this.dirty = false;
    this.criticalDirty = false;
    this.lastPublished = this.time;
    this.revision++;
    this.snapshot = this.makeSnapshot(this.state);
    this.metrics.publishes++;
    this.listeners.forEach((listener) => listener());
  }

  clearTasks() {
    this.tasks.clear();
  }
}
