---
description: Write or update tape-six tests to be run with tape-six-proc
---

# Write Tests

Write or update tests using the tape-six testing library, run via tape-six-proc in isolated processes.

## Notes

- `tape-six` supports ES modules (`.js`, `.mjs`, `.ts`, `.mts`) and CommonJS (`.cjs`, `.cts`).
- TypeScript is supported natively — no transpilation needed (Node 22+, Deno, Bun run `.ts` files directly).
- `tape6-proc` runs each test file in its own subprocess for full process isolation. There is no sequential runner — use `tape6-proc --par 1` to run one file at a time if needed.

## Steps

1. Read the testing guide at `node_modules/tape-six/TESTING.md` for API reference and patterns.
2. Identify the module or feature to test. Read its source code to understand the public API.
3. Create or update the test file in `tests/test-<name>.js` (or `.ts` for TypeScript projects):
   - Import `test` from `tape-six` (ESM: `import test from 'tape-six'`; CJS: `const {test} = require('tape-six')`).
   - Import the module under test using the project's package name.
   - Write one top-level `test()` per logical group.
   - Use embedded `await t.test()` for sub-cases.
   - Use `t.beforeEach`/`t.afterEach` for shared setup/teardown.
   - Cover: normal operation, edge cases, error conditions.
   - Use `t.equal` for primitives, `t.deepEqual` for objects/arrays, `t.throws` for errors, `await t.rejects` for async errors.
   - All `msg` arguments are optional but recommended for clarity.
     // turbo
4. Run the new test file directly to verify: `node tests/test-<name>.js`
   // turbo
5. Run the full test suite to check for regressions: `npm test`
6. Report results and any failures.
