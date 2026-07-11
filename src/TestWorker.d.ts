import {Subprocess} from 'dollar-shell';

import EventServer, {
  DestroyReason,
  EventServerOptions,
  EventServerReporter
} from 'tape-six/utils/EventServer.js';

/** Per-worker bookkeeping kept in `idToWorker`. */
export interface WorkerTask {
  worker: Subprocess;
  /** The child's final `end` event was read — a clean parent-driven exit. */
  endSeen: boolean;
  /** `terminate` already sent; suppresses duplicate teardown. */
  terminating: boolean;
  /** Force-kill backstop armed by `destroyTask`; `null` once fired or cleared. */
  graceTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Subprocess transport for tape-six's `EventServer`: runs each test file in
 * its own child process (Node, Bun, or Deno — via `dollar-shell`),
 * demultiplexes prefixed-JSONL test events from stdout, wraps stderr lines
 * as events, and drives the stdin control channel — a cooperative
 * `terminate` backstopped by a `graceTimeout` force-kill. See
 * ARCHITECTURE.md and tape-six's dev-docs/worker-control-channel.md.
 */
export class TestWorker extends EventServer {
  constructor(reporter: EventServerReporter, numberOfTasks?: number, options?: EventServerOptions);

  /** Monotonic source of task ids. */
  counter: number;
  idToWorker: Record<string, WorkerTask>;
  /** Per-run UUID marking JSONL event lines on workers' stdout. */
  prefix: string;

  makeTask(fileName: string): string;
  destroyTask(id: string, reason?: DestroyReason): void;
}

export default TestWorker;
