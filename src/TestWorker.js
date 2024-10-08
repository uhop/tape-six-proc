import process from 'node:process';
import {sep} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

import {spawn, currentExecPath, runFileArgs} from 'dollar-shell';

import {StopTest} from 'tape-six/State.js';
import EventServer from 'tape-six/utils/EventServer.js';

import lines from './chain/lines.js';
import parse from './chain/jsonl-parse.js';

const baseName = pathToFileURL(process.cwd() + sep);

export default class TestWorker extends EventServer {
  constructor(reporter, numberOfTasks = navigator.hardwareConcurrency, options) {
    super(reporter, numberOfTasks, options);
    this.counter = 0;
    this.idToWorker = {};
  }
  makeTask(fileName) {
    const testName = new URL(fileName, baseName),
      id = String(++this.counter),
      worker = spawn(
        [
          currentExecPath(),
          ...runFileArgs.concat((this.options.runFileArgs || []).filter(x => x)),
          fileURLToPath(testName)
        ],
        {
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'inherit',
          env: {...process.env, TAPE6_TEST: id, TAPE6_JSONL: 'Y'}
        }
      );
    this.idToWorker[id] = worker;
    const self = this;
    worker.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(lines())
      .pipeThrough(parse())
      .pipeTo(
        new WritableStream({
          write(msg) {
            try {
              self.report(id, msg);
            } catch (error) {
              if (!(error instanceof StopTest)) throw error;
            }
            if (msg.type === 'end' && msg.test === 0) {
              self.close(id);
              return;
            }
          }
        })
      );
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
