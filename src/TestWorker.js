import process from 'node:process';
import {sep} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

import {spawn, currentExecPath, runFileArgs} from 'dollar-shell';

import {isStopTest} from 'tape-six/State.js';
import EventServer from 'tape-six/utils/EventServer.js';
import makeDeferred from 'tape-six/utils/makeDeferred.js';

import lines from './streams/lines.js';
import parse from './streams/parse-prefixed-jsonl.js';
import wrap from './streams/wrap-lines.js';

const baseName = pathToFileURL(process.cwd() + sep);

const encoder = new TextEncoder();

export class TestWorker extends EventServer {
  constructor(reporter, numberOfTasks, options) {
    super(reporter, numberOfTasks, options);
    this.counter = 0;
    this.idToWorker = {};
    this.prefix = crypto.randomUUID();
  }
  makeTask(fileName) {
    const self = /** @type {*} */ (this);
    const testName = new URL(fileName, baseName),
      id = String(++self.counter),
      worker = spawn(
        [currentExecPath(), ...runFileArgs, ...self.options.runFileArgs, fileURLToPath(testName)],
        {
          // stdin is the control channel — see dev-docs/worker-control-channel.md (tape-six)
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            TAPE6_FLAGS: self.options.flags,
            TAPE6_TEST: id,
            TAPE6_TEST_FILE_NAME: fileName,
            TAPE6_JSONL: 'Y',
            TAPE6_JSONL_PREFIX: self.prefix,
            TAPE6_CONTROL: 'Y',
            TAPE6_GRACE_TIMEOUT: String(self.graceTimeout),
            TAPE6_MIN: '',
            TAPE6_TAP: '',
            TAPE6_TTY: ''
          }
        }
      );
    const task = {worker, endSeen: false, terminating: false, graceTimer: null};
    self.idToWorker[id] = task;
    const stdoutDeferred = makeDeferred();
    worker.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(lines())
      .pipeThrough(parse(self.prefix))
      .pipeTo(
        new WritableStream({
          write(msg) {
            try {
              self.report(id, msg);
            } catch (error) {
              if (!isStopTest(error)) {
                stdoutDeferred.reject(error);
                throw error;
              }
            }
            // parent-driven exit: the child exits only after its `end` was read —
            // closes the Bun stdout-flush race
            if (msg && msg.type === 'end' && msg.test === 0) {
              task.endSeen = true;
              self.destroyTask(id, 'done');
            }
          },
          close() {
            stdoutDeferred.resolve();
          }
        })
      );
    const stderrDeferred = makeDeferred();
    worker.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(lines())
      .pipeThrough(wrap('stderr'))
      .pipeTo(
        new WritableStream({
          write(msg) {
            self.report(id, msg);
          },
          close() {
            stderrDeferred.resolve();
          }
        })
      );
    Promise.allSettled([worker.exited, stdoutDeferred.promise, stderrDeferred.promise]).then(() => {
      if (task.graceTimer) {
        clearTimeout(task.graceTimer);
        task.graceTimer = null;
      }
      // no `end` read — the child crashed or was force-killed while hung
      if (!task.endSeen && (!self.reporter.state || !self.reporter.state.failed)) {
        const reason = [];
        if (worker.exitCode) {
          reason.push(`exit code: ${worker.exitCode}`);
        }
        if (worker.signalCode) {
          reason.push(`signal: ${worker.signalCode}`);
        }
        if (reason.length) {
          self.report(id, {
            name: 'process has failed, ' + reason.join(', '),
            test: 0,
            marker: new Error(),
            operator: 'error',
            fail: true
          });
          self.report(id, {type: 'terminated', test: 0, name: 'FILE: /' + fileName});
        }
      }
      delete self.idToWorker[id];
      self.close(id);
    });
    return id;
  }
  // the child drains a running test (cleanup hooks run) and exits on its own;
  // the graceTimeout backstop force-kills one that won't drain
  destroyTask(id, reason = 'done') {
    const task = this.idToWorker[id];
    if (!task || task.terminating) return;
    task.terminating = true;
    this.#sendTerminate(task.worker, reason);
    task.graceTimer = setTimeout(() => this.#kill(id), /** @type {*} */ (this).graceTimeout);
  }
  async #sendTerminate(worker, reason) {
    const stdin = worker.stdin;
    if (!stdin) return;
    try {
      const writer = stdin.getWriter();
      await writer.write(encoder.encode(JSON.stringify({cmd: 'terminate', reason}) + '\n'));
      await writer.close();
    } catch (e) {
      void e; // child already gone / pipe closed
    }
  }
  #kill(id) {
    const task = this.idToWorker[id];
    if (!task) return;
    task.graceTimer = null;
    try {
      task.worker.kill();
    } catch (e) {
      void e;
    }
  }
}

export default TestWorker;
