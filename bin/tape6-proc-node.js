#!/usr/bin/env node

import {readFileSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  getOptions,
  initFiles,
  initReporter,
  showInfo,
  printFlagOptions
} from 'tape-six/utils/config.js';

import {getReporter, setReporter} from 'tape-six/test.js';
import {selectTimer} from 'tape-six/utils/timer.js';

import TestWorker from '../src/TestWorker.js';

const rootFolder = process.cwd();

const getVersion = () => {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
};

const showSelf = () => {
  const self = new URL(import.meta.url);
  if (self.protocol === 'file:') {
    console.log(fileURLToPath(self));
  } else {
    console.log(self);
  }
  process.exit(0);
};

const showVersion = () => {
  console.log('tape6-proc ' + getVersion());
  process.exit(0);
};

const showHelp = () => {
  console.log('tape6-proc ' + getVersion() + ' \u2014 Process-isolated test runner for tape-six\n');
  console.log('Usage: tape6-proc [options] [files...]\n');
  const options = [
    ['--flags, -f <flags>', 'Set reporter flags (env: TAPE6_FLAGS)'],
    ['--par, -p <n>', 'Set parallelism level (env: TAPE6_PAR)'],
    ['--runFileArgs, -r <args>', 'Extra arguments for spawned interpreter (repeatable)'],
    ['--info', 'Show configuration info and exit'],
    ['--self', 'Print the path to this script and exit'],
    ['--help, -h', 'Show this help message and exit'],
    ['--version, -v', 'Show version and exit']
  ];
  console.log('Options:');
  const width = options.reduce((max, [flag]) => Math.max(max, flag.length), 0) + 2;
  for (const [flag, desc] of options) {
    console.log('  ' + flag.padEnd(width) + desc);
  }
  printFlagOptions();
  process.exit(0);
};

const main = async () => {
  const runFileArgs = [];
  const options = getOptions({
    '--self': {fn: showSelf, isValueRequired: false},
    '--info': {isValueRequired: false},
    '--runFileArgs': {
      aliases: ['-r'],
      isValueRequired: true,
      fn: (_, _name, value) => runFileArgs.push(value)
    },
    '--help': {aliases: ['-h'], fn: showHelp, isValueRequired: false},
    '--version': {aliases: ['-v'], fn: showVersion, isValueRequired: false}
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
    await new Promise(r => process.stdout.write('', r));
    process.exitCode = 0;
    return;
  }

  if (!files.length) {
    console.log('No files found.');
    await new Promise(r => process.stdout.write('', r));
    process.exitCode = 1;
    return;
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

  await new Promise(r => process.stdout.write('', r));
  process.exitCode = hasFailed ? 1 : 0;
};

main().catch(error => console.error('ERROR:', error));
