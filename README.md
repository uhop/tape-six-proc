# tape-six-proc [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/tape-six-proc.svg
[npm-url]: https://npmjs.org/package/tape-six-proc

`tape-six-proc` is a helper for [tape-six](https://www.npmjs.com/package/tape-six)
to run tests in separate processes. It works with Node, Deno, and Bun,
and supports TypeScript natively without transpilation.

## Why?

The standard `tape6` runner uses worker threads. `tape6-proc` spawns each test file
in its own subprocess instead, providing full process isolation. This prevents shared
state leaks and is useful when tests need a clean environment. TypeScript test files
(`.ts`) are run natively by modern Node, Deno, and Bun &mdash; no transpilation needed.

## Install

```bash
npm i -D tape-six-proc
```

## Quick start

1. Write tests using [tape-six](https://www.npmjs.com/package/tape-six):

```js
import test from 'tape-six';

test('example', t => {
  t.ok(true, 'truthy');
  t.equal(1 + 1, 2, 'math works');
});
```

2. Configure tests in `package.json`:

```json
{
  "scripts": {
    "test": "tape6-proc --flags FO"
  },
  "tape6": {
    "tests": ["/tests/test-*.*js"]
  }
}
```

3. Run:

```bash
npm test
```

## Cross-runtime usage

```json
{
  "scripts": {
    "test": "tape6-proc --flags FO",
    "test:bun": "bun run `tape6-proc --self` --flags FO",
    "test:deno": "deno run -A `tape6-proc --self` --flags FO -r -A"
  }
}
```

## Docs

The documentation can be found in the [wiki](https://github.com/uhop/tape-six-proc/wiki).
`tape-six` has its own [wiki](https://github.com/uhop/tape-six/wiki).

`tape-six-proc` uses the same test configuration as `tape-six`. The utility `tape6-proc`
has the same usage as `tape6`.

### Command-line utilities

- [tape6-proc](https://github.com/uhop/tape-six-proc/wiki/Utility-%E2%80%90-tape6-proc) &mdash; the main utility of this package to run tests in different environments.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for project conventions, commands, and architecture.

LLM-friendly documentation is available:

- [llms.txt](./llms.txt) &mdash; concise reference.
- [llms-full.txt](./llms-full.txt) &mdash; full reference with architecture details.

## Release notes

The most recent releases:

- 1.2.2 _Synchronized the implementation with `tape-six` 1.7.0._
- 1.2.1 _Synchronized the implementation with `tape-six` 1.5.1._
- 1.2.0 _Updated dependencies and synchronized the implementation with `tape-six` 1.5.0._
- 1.1.6 _Updated dependencies._
- 1.1.5 _Updated dependencies._
- 1.1.4 _Updated dependencies._
- 1.1.3 _Updated dependencies._
- 1.1.2 _Fixed bug with Deno (spawned process can end before processing streams (stdout/stderr))._
- 1.1.1 _Updated dependencies._
- 1.1.0 _Added support for stdout/stderr and `tape-six` 1.3.4._
- 1.0.2 _Fixed concurrency detection. Updated dependencies._
- 1.0.1 _Updated dependencies._
- 1.0.0 _The first official release._

For more info consult full [release notes](https://github.com/uhop/tape-six-proc/wiki/Release-notes).
