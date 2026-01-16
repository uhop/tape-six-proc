#!/usr/bin/env node

'use strict';

import process from 'node:process';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

import {resolveTests, resolvePatterns} from 'tape-six/utils/config.js';

import {getReporter, setReporter} from 'tape-six/test.js';
import State, {StopTest} from 'tape-six/State.js';
import TapReporter from 'tape-six/TapReporter.js';
import {selectTimer} from 'tape-six/utils/timer.js';

import TestWorker from '../src/TestWorker.js';

const options = {},
  rootFolder = process.cwd();

let flags = '',
  parallel = '',
  runFileArgs = [],
  files = [];

const showSelf = () => {
  const self = new URL(import.meta.url);
  if (self.protocol === 'file:') {
    console.log(fileURLToPath(self));
  } else {
    console.log(self);
  }
  process.exit(0);
};

const config = () => {
  if (process.argv.includes('--self')) showSelf();

  const optionNames = {
    f: 'failureOnly',
    t: 'showTime',
    b: 'showBanner',
    d: 'showData',
    o: 'failOnce',
    n: 'showAssertNumber',
    m: 'monochrome',
    c: 'dontCaptureConsole',
    h: 'hideStreams'
  };

  let parIsSet = false;

  for (let i = 2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if (arg == '-f' || arg == '--flags') {
      if (++i < process.argv.length) {
        flags = process.argv[i];
      }
      continue;
    }
    if (arg == '-p' || arg == '--par') {
      if (++i < process.argv.length) {
        parallel = process.argv[i];
        parIsSet = true;
        if (!parallel || isNaN(parallel)) {
          parallel = '';
          parIsSet = false;
        }
      }
      continue;
    }
    if (arg == '-r' || arg == '--runFileArgs') {
      if (++i < process.argv.length) {
        runFileArgs.push(process.argv[i]);
      }
      continue;
    }
    files.push(arg);
  }

  flags = (process.env.TAPE6_FLAGS || '') + flags;
  for (let i = 0; i < flags.length; ++i) {
    const option = flags[i].toLowerCase(),
      name = optionNames[option];
    if (typeof name == 'string') options[name] = option !== flags[i];
  }

  if (!parIsSet) {
    parallel = process.env.TAPE6_PAR || parallel;
  }
  if (parallel) {
    parallel = Math.max(0, +parallel);
    if (parallel === Infinity) parallel = 0;
  } else {
    parallel = 0;
  }
  if (!parallel) {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      parallel = navigator.hardwareConcurrency;
    } else {
      try {
        parallel = os.availableParallelism();
      } catch (e) {
        void e;
        parallel = 1;
      }
    }
  }

  options.runFileArgs = runFileArgs;
};

const init = async () => {
  let reporter = getReporter();
  if (!reporter) {
    if (process.env.TAPE6_JSONL) {
      const {JSONLReporter} = await import('tape-six/JSONLReporter.js'),
        jsonlReporter = new JSONLReporter(options);
      reporter = jsonlReporter.report.bind(jsonlReporter);
    } else if (!process.env.TAPE6_TAP) {
      const {TTYReporter} = await import('tape-six/TTYReporter.js'),
        ttyReporter = new TTYReporter(options);
      ttyReporter.testCounter = -2;
      ttyReporter.technicalDepth = 1;
      reporter = ttyReporter.report.bind(ttyReporter);
    }
    if (!reporter) {
      const tapReporter = new TapReporter({useJson: true});
      reporter = tapReporter.report.bind(tapReporter);
    }
    setReporter(reporter);
  }

  if (files.length) {
    files = await resolvePatterns(rootFolder, files);
  } else {
    let type = 'node';
    if (typeof Deno == 'object') {
      type = 'deno';
    } else if (typeof Bun == 'object') {
      type = 'bun';
    }
    files = await resolveTests(rootFolder, type);
  }
};

const safeEmit = rootState => event => {
  try {
    rootState.emit(event);
  } catch (error) {
    if (!(error instanceof StopTest)) throw error;
  }
};

const main = async () => {
  config();
  await init();
  await selectTimer();

  process.on('uncaughtException', (error, origin) =>
    console.error('UNHANDLED ERROR:', origin, error)
  );

  const rootState = new State(null, {callback: getReporter(), failOnce: options.failOnce}),
    worker = new TestWorker(safeEmit(rootState), parallel, options);

  rootState.emit({type: 'test', test: 0, time: rootState.timer.now()});

  await new Promise(resolve => {
    worker.done = () => resolve();
    worker.execute(files);
  });

  rootState.emit({
    type: 'end',
    test: 0,
    time: rootState.timer.now(),
    fail: rootState.failed > 0,
    data: rootState
  });

  process.exit(rootState.failed > 0 ? 1 : 0);
};

main().catch(error => console.error('ERROR:', error));
