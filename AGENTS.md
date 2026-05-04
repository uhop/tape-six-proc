# AGENTS.md — tape-six-proc

> `tape-six-proc` is a helper for [tape-six](https://github.com/uhop/tape-six) that runs test files in separate processes (subprocesses) instead of worker threads. It works with Node, Deno, and Bun, and supports TypeScript natively without transpilation. The npm package name is `tape-six-proc` and the CLI command is `tape6-proc`.

## Setup

This project uses a git submodule (wiki):

```bash
git clone --recursive git@github.com:uhop/tape-six-proc.git
cd tape-six-proc
npm install
```

There is no build step.

## Commands

- **Install:** `npm install`
- **Test (Node):** `npm test` (runs `tape6-proc --flags FO`)
- **Test (Bun):** `npm run test:bun`
- **Test (Deno):** `npm run test:deno`
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)
- **JS-check:** `npm run js-check` (TypeScript-as-linter via `tsconfig.check.json` — checks `.js` sources for unused vars / undeclared refs)

## Project structure

```
tape-six-proc/
├── package.json          # Package config; "tape6" section configures test discovery
├── tsconfig.check.json   # js-check config (TypeScript as linter for .js sources)
├── bin/
│   ├── tape6-proc.js     # CLI entry point (--self flag or delegates to tape6-proc-node.js)
│   └── tape6-proc-node.js # Main CLI: delegates to tape-six config utilities, runs TestWorker
├── src/
│   ├── TestWorker.js     # TestWorker class: spawns child processes, pipes stdout/stderr
│   └── streams/
│       ├── lines.js              # TransformStream: splits text into lines
│       ├── parse-prefixed-jsonl.js # TransformStream: parses prefixed JSONL from stdout
│       └── wrap-lines.js         # TransformStream: wraps plain lines as {type, name} objects
├── tests/                # Test files (test-*.js)
│   └── manual/           # Manual test files (hand-runnable demos; `tests/manual/test-chai.js` requires user-installed chai)
├── wiki/                 # GitHub wiki documentation (submodule)
├── .github/
│   ├── workflows/        # CI: separate jobs for Node × {ubuntu, windows, macOS} × {20, 22, 24, 25}, Bun × OS, Deno × OS
│   └── dependabot.yml    # Tuned: grouped updates + `versioning-strategy: increase-if-necessary` (PRs only on out-of-range bumps)
├── README.md
└── LICENSE
```

## Code style

- **ES modules** throughout (`"type": "module"` in package.json).
- **No transpilation** — code runs directly in all target runtimes. TypeScript test files (`.ts`) are also supported natively by modern Node, Deno, and Bun.
- **Prettier** for formatting (see `.prettierrc`).
- Semicolons — default Prettier behavior (see `.prettierrc`).
- Imports at the top of files, using `import` syntax.
- The package name is `tape-six-proc` but the CLI command is `tape6-proc`.

## Architecture

- `bin/tape6-proc.js` is the CLI entry point. With `--self` it prints its own path (for cross-runtime usage). Otherwise it delegates to `bin/tape6-proc-node.js`.
- `bin/tape6-proc-node.js` delegates argument parsing, reporter setup, and file resolution to `tape-six/utils/config.js` (`getOptions`, `initReporter`, `initFiles`, `showInfo`). It adds `--runFileArgs` (`-r`), `--info`, `--help` (`-h`), and `--version` (`-v`) options, then runs tests via `TestWorker`.
- `TestWorker` (in `src/TestWorker.js`) extends `EventServer` from `tape-six`. It spawns each test file as a child process using [dollar-shell](https://www.npmjs.com/package/dollar-shell), pipes stdout through a JSONL parser, and pipes stderr as wrapped lines.
- Each spawned process gets environment variables: `TAPE6_FLAGS`, `TAPE6_TEST`, `TAPE6_TEST_FILE_NAME`, `TAPE6_JSONL=Y`, and `TAPE6_JSONL_PREFIX` (a UUID prefix for JSONL lines).
- Stream pipeline per process: `stdout → TextDecoder → lines → parse-prefixed-jsonl → report`. stderr: `stderr → TextDecoder → lines → wrap-lines → report`.
- Process exit codes and signals are checked after completion; non-zero exits are reported as errors.

## Dependencies

- **`tape-six`** — the core test library. `tape-six-proc` imports: `utils/config.js` (`getOptions`, `initFiles`, `initReporter`, `showInfo`, `printFlagOptions`), `test.js`, `utils/timer.js`, `State.js`, `utils/EventServer.js`, `utils/makeDeferred.js`.
- **`dollar-shell`** — cross-runtime process spawning (`spawn`, `currentExecPath`, `runFileArgs`).

## Writing tests

Tests are standard `tape-six` tests. They are run in isolated processes by `tape6-proc`:

```js
import test from 'tape-six';

test('example', t => {
  t.ok(true, 'truthy');
  t.equal(1 + 1, 2, 'math works');
});
```

- Test files should be directly executable: `node tests/test-foo.js` or `node tests/test-foo.ts`
- Test file naming convention: `test-*.js`, `test-*.mjs`, `test-*.cjs`, `test-*.ts`
- Tests are configured in `package.json` under the `"tape6"` section (same as `tape-six`).

## Key conventions

- Do not add dependencies unless absolutely necessary.
- Do not modify or delete test expectations without understanding why they changed.
- Do not add comments or remove comments unless explicitly asked.
- The `--self` flag prints the path to `tape6-proc.js` for use in cross-runtime scripts (Bun, Deno).
- The `--runFileArgs` (`-r`) flag passes extra arguments to the spawned interpreter (mainly for Deno permissions).
- Wiki documentation lives in the `wiki/` submodule.
- Environment variables use the `TAPE6_` prefix (shared with `tape-six`).
- Configuration is read from `tape6.json` or the `"tape6"` section of `package.json` (same as `tape-six`). Per-runtime subsections (`tape6.node` / `tape6.bun` / `tape6.deno` / `tape6.cli` / `tape6.browser`) are auto-resolved via tape-six's `runtime.name` detection — pin a test file to a specific runtime by globbing it under that key.
- **BYO assertion / mock libraries.** No third-party assertion lib ships as a devDep. CI smoke-tests for the `AssertionError` rendering path use `node:assert` (`tests/test-assert.js`). `tests/manual/test-chai.js` is retained as a hand-runnable visual demo for users who want to see chai integration; users `npm install chai` ad-hoc when exercising it.
- **`js-check` tooling**: `tsconfig.check.json` runs TypeScript-as-linter (`checkJs` + `noUnusedLocals` + `noUnusedParameters`) over `.js` sources in `bin/` and `src/`. Pure-Node-API only on the source side (`@types/node` is the only types entry); cross-runtime concerns are absorbed by the `dollar-shell` dependency and don't require `@types/bun` / `@types/deno` here.
- **Dependabot** is tuned to skip PRs when a new version satisfies the declared caret range (only major bumps fire) and to bundle all matching updates per ecosystem into one PR per cycle. Security advisories are a separate, always-on channel and continue to fire regardless.
