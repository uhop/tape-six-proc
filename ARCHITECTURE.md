# Architecture

`tape-six-proc` is the subprocess worker provider for [tape-six](https://github.com/uhop/tape-six): it runs each test file in its own child process for full process isolation, on Node, Deno, and Bun, with native TypeScript support (no transpilation). The only runtime dependency is `tape-six` (the core test library); processes are spawned through `node:child_process`, which Node, Deno, and Bun all implement.

## Project layout

```
tape-six-proc/
├── package.json          # Package config; "tape6" section configures test discovery
├── tsconfig.check.json   # js-check config (TypeScript as linter for .js sources)
├── bin/
│   ├── tape6-proc.js     # CLI entry point (--self flag or delegates to tape6-proc-node.js)
│   └── tape6-proc-node.js # Main CLI: delegates to tape-six config utilities, runs TestWorker
├── src/                  # each module is a .js + .d.ts sidecar pair (types + JSDoc live in the .d.ts)
│   ├── TestWorker.js     # TestWorker class: spawns children, pipes stdout/stderr, drives the control channel
│   └── streams/
│       ├── lines.js                # TransformStream: splits text into lines
│       ├── parse-prefixed-jsonl.js # TransformStream: parses prefixed JSONL from stdout
│       └── wrap-lines.js           # TransformStream: wraps plain lines as {type, name} objects
├── tests/                # Automated tests (test-*.js); tests/fixtures/ holds the files test-crash.js runs, tests/manual/ hand-runnable demos
└── wiki/                 # GitHub wiki documentation (submodule)
```

## Control flow

- `bin/tape6-proc.js` is the CLI entry point. With `--self` it prints its own path (for cross-runtime usage); otherwise it delegates to `bin/tape6-proc-node.js`.
- `bin/tape6-proc-node.js` delegates argument parsing, reporter setup, and file resolution to `tape-six/utils/config.js` (`getOptions`, `initReporter`, `initFiles`, `showInfo`). It adds `--runFileArgs` (`-r`), `--info`, `--help` (`-h`), and `--version` (`-v`) options, then runs tests via `TestWorker`.
- `TestWorker` (`src/TestWorker.js`) extends `EventServer` from `tape-six`. It spawns each test file as a child process through `node:child_process`: `process.execPath`, with `run` before the file on Bun and Deno, and the pipes wrapped as Web streams by `Readable.toWeb` and `Writable.toWeb`.

## Data plane

Per child process: `stdout → TextDecoderStream → lines → parse-prefixed-jsonl → report` (JSONL lines carry a per-run UUID prefix); `stderr → TextDecoderStream → lines → wrap-lines → report`. The child receives `TAPE6_FLAGS`, `TAPE6_TEST`, `TAPE6_TEST_FILE_NAME`, `TAPE6_JSONL=Y`, `TAPE6_JSONL_PREFIX`, `TAPE6_CONTROL=Y`, and `TAPE6_GRACE_TIMEOUT` in its environment.

## Control plane (worker control channel)

The child is spawned with `stdin: 'pipe'` — stdin is the control channel. To stop a worker the parent writes a line-delimited `terminate` command and EOFs stdin; the child-side listener (part of tape-six: `src/utils/control-channel.js`, enabled by `TAPE6_CONTROL`) drains a running test through `reporter.terminate()` — its `t.signal` fires and cleanup hooks run — then exits. Completion is keyed off **reading the child's top-level `end`**, not racing the child's own exit: the child exits parent-driven after `end` has been consumed, which also closes the Bun stdout-flush race. A child that won't drain within `TAPE6_GRACE_TIMEOUT` (default 5000 ms) is force-killed (`SIGTERM`); a premature exit with no `end` is reported as an error when the child exited with a non-zero code, by a signal, after its deadline (`timed out`), or with code 0 after it had started a test (`exited mid-test`; a file with no tests sends no events and passes), unless `failOnce` or a bail-out stopped the run. Either way it gets a `terminated` event that closes the tests the child left open: without it a later file's events nest inside them, and the run ends with no summary and exit status 0. This is what lets `failOnce` (flag `O`) stop in-flight workers and enables the per-worker wall-clock deadline `TAPE6_WORKER_TIMEOUT`.

## Types

Every `src/` module ships a `.d.ts` sidecar carrying its types and JSDoc (the sole source of truth — `.js` files stay JSDoc-free); each `.js` opens with a `// @ts-self-types="./<name>.d.ts"` directive (honored by Deno; TypeScript resolves sidecars by adjacency). `TestWorker.d.ts` builds on tape-six's `EventServer.d.ts` and augments its deliberately open options bag with the keys the worker reads (`flags`, `runFileArgs`), which keeps `TestWorker.js` cast-free under `js-check`. `package.json#types` points at `src/TestWorker.d.ts`.

## Cross-runtime notes

There are no `Bun.` / `Deno.` globals in this repo — the one runtime difference left is the `run` argument Bun and Deno need before a file, read from `process.versions`. Sources use Node-API-shaped imports (`node:process`, `node:path`, `node:url`, `node:crypto`, `node:child_process`, `node:stream`) that all three runtimes implement, which is why `tsconfig.check.json` keeps its types array at `["node"]` only.
