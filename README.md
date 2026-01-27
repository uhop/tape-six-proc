# tape-six-proc [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/tape-six-proc.svg
[npm-url]: https://npmjs.org/package/tape-six-proc

`tape-six-proc` is a helper for [tape-six](https://www.npmjs.com/package/tape-six)
to run tests in separate processes.

## Docs

The documentation can be found in the [wiki](https://github.com/uhop/tape-six-proc/wiki).
`tape-six` has its own [wiki](https://github.com/uhop/tape-six/wiki).

`tape-six-proc` uses the same test configuration as `tape-six`. The utility `test6-proc`
has the same usage as `tape6`.

### Command-line utilities

- [tape6-proc](https://github.com/uhop/tape-six-proc/wiki/Utility-%E2%80%90-tape6-proc) &mdash; the main utility of this package to run tests in different environments.

## Release notes

The most recent releases:

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
