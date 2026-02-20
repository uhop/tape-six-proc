# Contributing to tape-six-proc

Thank you for your interest in contributing!

## Getting started

This project uses a git submodule. Clone and install:

```bash
git clone --recursive git@github.com:uhop/tape-six-proc.git
cd tape-six-proc
npm install
```

See [Working on this project](https://github.com/uhop/tape-six-proc/wiki/Working-on-this-project) for details on the architecture.

## Development workflow

1. Make your changes.
2. Format: `npm run lint:fix`
3. Test: `npm test`

## Code style

- ES modules (`import`/`export`), no CommonJS in source.
- TypeScript test files (`.ts`) are supported natively — no transpilation needed.
- Formatted with Prettier — run `npm run lint:fix` before committing.
- No unnecessary dependencies.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
