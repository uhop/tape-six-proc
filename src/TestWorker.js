import process from 'node:process';
import os from 'node:os';
import {sep} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

import {spawn, currentExecPath, runFileArgs} from 'dollar-shell';

import {StopTest} from 'tape-six/State.js';
import EventServer from 'tape-six/utils/EventServer.js';

import lines from './streams/lines.js';
import parse from './streams/parse-prefixed-jsonl.js';
import wrap from './streams/wrap-lines.js';

const baseName = pathToFileURL(process.cwd() + sep);

export default class TestWorker extends EventServer {
  constructor(reporter, numberOfTasks = TestWorker.getConcurrency(), options) {
    super(reporter, numberOfTasks, options);
    this.counter = 0;
    this.idToWorker = {};
    this.prefix = crypto.randomUUID();
  }
  makeTask(fileName) {
    const testName = new URL(fileName, baseName),
      id = String(++this.counter),
      worker = spawn(
        [currentExecPath(), ...runFileArgs, ...this.options.runFileArgs, fileURLToPath(testName)],
        {
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            TAPE6_TEST: id,
            TAPE6_TEST_FILE_NAME: fileName,
            TAPE6_JSONL: 'Y',
            TAPE6_JSONL_PREFIX: this.prefix
          }
        }
      );
    this.idToWorker[id] = worker;
    const self = this;
    worker.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(lines())
      .pipeThrough(parse(this.prefix))
      .pipeTo(
        new WritableStream({
          write(msg) {
            try {
              self.report(id, msg);
            } catch (error) {
              if (!(error instanceof StopTest)) {
                throw error;
              }
            }
          }
        })
      );
    worker.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(lines())
      .pipeThrough(wrap('stderr'))
      .pipeTo(
        new WritableStream({
          write(msg) {
            self.report(id, msg);
          }
        })
      );
    worker.exited.finally(() => self.close(id));
    return id;
  }
  destroyTask(id) {
    const worker = this.idToWorker[id];
    if (worker) {
      // worker.kill();
      delete this.idToWorker[id];
    }
  }
  static getConcurrency() {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency;
    }
    try {
      return os.availableParallelism();
    } catch (e) {
      void e;
      // squelch
    }
    return 1;
  }
}
