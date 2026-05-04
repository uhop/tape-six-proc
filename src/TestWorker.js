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

export default class TestWorker extends EventServer {
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
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            TAPE6_FLAGS: self.options.flags,
            TAPE6_TEST: id,
            TAPE6_TEST_FILE_NAME: fileName,
            TAPE6_JSONL: 'Y',
            TAPE6_JSONL_PREFIX: self.prefix,
            TAPE6_MIN: '',
            TAPE6_TAP: '',
            TAPE6_TTY: ''
          }
        }
      );
    self.idToWorker[id] = worker;
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
      if (!self.reporter.state || !self.reporter.state.failed) {
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
      self.close(id);
    });
    return id;
  }
  destroyTask(id) {
    const worker = this.idToWorker[id];
    if (worker) {
      // worker.kill();
      delete this.idToWorker[id];
    }
  }
}
