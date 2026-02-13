# ⚡ fast-ts

**TypeScript → Go compiler for WinterTC server APIs**

Write WinterTC-compatible TypeScript, compile to a single static Go binary. No V8, no node_modules at deploy time.

```typescript
// src/index.ts — Write this
export default {
  fetch(request: Request): Response {
    return new Response("Hello from fast-ts!");
  }
};
```

```bash
# Get this
$ fast-ts build src/index.ts
[fast-ts] ✓ Binary: .fast-ts/bin/index (4.2 MB, 127ms)

$ .fast-ts/bin/index
fast-ts server listening on :8080
```

## Why?

| Metric | Node.js + Hono | fast-ts binary |
|--------|---------------|----------------|
| Cold start | 50–300ms | < 5ms |
| Memory | 30–80 MB | 5–15 MB |
| Docker image | 100–900 MB | 5–20 MB |
| Dependencies at deploy | node_modules | Single binary |

## Status: Pre-alpha — We need your help!

This project is designed for **LLM-assisted development**. Every task is documented as an atomic unit with clear inputs, outputs, and test criteria so that AI coding agents (Claude Code, Cursor, Copilot Workspace, Devin, etc.) can contribute effectively.

**→ See [TASKS.md](./TASKS.md) for the task board.**
**→ See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute (human or bot).**
**→ See [docs/MOLTBOOK_INTEGRATION.md](./docs/MOLTBOOK_INTEGRATION.md) for posting to Moltbook.**

## Architecture

```
TypeScript Source
       │
       ▼
  ┌─────────┐     TypeScript Compiler API
  │  Parse   │──── ts.createSourceFile + ts.createProgram
  └────┬─────┘
       │ TS AST + Type Map
       ▼
  ┌──────────┐    Custom validation rules
  │ Validate  │─── FTS001-FTS011 error codes
  └────┬──────┘
       │ Validated TS AST
       ▼
  ┌───────────┐   TS AST → Go-compatible IR
  │ Transform  │── async→goroutine, try/catch→error, etc.
  └────┬───────┘
       │ IR (Intermediate Representation)
       ▼
  ┌────────┐      IR → idiomatic Go source
  │  Emit   │──── gofmt-compatible output
  └────┬────┘
       │ main.go + go.mod
       ▼
  ┌────────┐      go build
  │ Compile │──── CGO_ENABLED=0, ldflags
  └────┬────┘
       │
       ▼
  Static Binary (linux/amd64, darwin/arm64, etc.)
```

**→ See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full details.**

## Tech Stack

- **Compiler**: TypeScript (Node.js) — uses TS Compiler API directly
- **Target**: Go 1.24+ (generic type aliases, Swiss table maps)
- **Spec**: ECMA-429 WinterTC Minimum Common API (2025 snapshot)
- **Testing**: Vitest (snapshot + integration)
- **CLI**: Commander.js

## Quick Start (Development)

```bash
git clone https://github.com/user/fast-ts.git
cd fast-ts
npm install
npm run build
npm test

# Try the compiler
npm run fast-ts -- emit examples/hello-world/src/index.ts
```

## Invite AI Agents to Contribute

Post about fast-ts on Moltbook (social network for AI agents):

```bash
# 1. Register your agent
npm run moltbook:setup

# 2. Post to Moltbook
npm run moltbook:post

# 3. Check for responses
npm run moltbook:feed
```

See [docs/MOLTBOOK_INTEGRATION.md](./docs/MOLTBOOK_INTEGRATION.md) for details.

## Project Structure

```
fast-ts/
├── src/
│   ├── compiler/
│   │   ├── parser.ts        # TS source → AST with type info
│   │   ├── validator.ts     # Validates supported TS subset
│   │   ├── transformer.ts   # TS AST → IR
│   │   ├── emitter.ts       # IR → Go source
│   │   └── types.ts         # IR type definitions
│   ├── runtime/             # Go runtime library source
│   │   ├── http.go
│   │   ├── console.go
│   │   └── encoding.go
│   └── cli/
│       └── index.ts         # CLI entry point
├── tests/
│   ├── fixtures/            # TS input → expected Go output
│   └── *.test.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── RESEARCH.md
│   ├── WINTERCTC-API-MAP.md
│   └── TYPE-MAPPING.md
├── examples/
│   └── hello-world/
├── .cursor/rules            # Cursor AI instructions
├── .claude/instructions.md  # Claude Code instructions
├── TASKS.md                 # Bot-friendly task board
├── CONTRIBUTING.md
└── README.md
```

## License

MIT
