#!/usr/bin/env node

import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {getOptions, initFiles, initReporter, showInfo} from 'tape-six/utils/config.js';

import {getReporter, setReporter} from 'tape-six/test.js';
import {selectTimer} from 'tape-six/utils/timer.js';

import TestWorker from '../src/TestWorker.js';

const rootFolder = process.cwd();

const showSelf = () => {
  const self = new URL(import.meta.url);
  if (self.protocol === 'file:') {
    console.log(fileURLToPath(self));
  } else {
    console.log(self);
  }
  process.exit(0);
};

const main = async () => {
  const runFileArgs = [];
  const options = getOptions({
    '--self': showSelf,
    '--info': {isValueRequired: false},
    '--runFileArgs': {
      aliases: ['-r'],
      isValueRequired: true,
      fn: (_, _name, value) => runFileArgs.push(value)
    }
  });
  options.flags.runFileArgs = runFileArgs;

  const [files] = await Promise.all([
    initFiles(options.files, rootFolder),
    initReporter(getReporter, setReporter, options.flags),
    selectTimer()
  ]);

  process.on('uncaughtException', (error, origin) => {
    console.error('UNHANDLED ERROR:', origin, error);
    process.exit(1);
  });

  if (options.optionFlags['--info'] === '') {
    showInfo(options, files);
    process.exit(0);
  }

  if (!files.length) {
    console.log('No files found.');
    process.exit(1);
  }

  const reporter = getReporter(),
    worker = new TestWorker(reporter, options.parallel, options.flags);

  reporter.report({type: 'test', test: 0});

  await new Promise(resolve => {
    worker.done = () => resolve();
    worker.execute(files);
  });

  const hasFailed = reporter.state && reporter.state.failed > 0;

  reporter.report({
    type: 'end',
    test: 0,
    fail: hasFailed
  });

  process.exit(hasFailed ? 1 : 0);
};

main().catch(error => console.error('ERROR:', error));
