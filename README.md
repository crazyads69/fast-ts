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
git clone https://github.com/crazyads69/fast-ts.git
cd fast-ts
npm install
npm test

# Emit Go source from a TypeScript file
npx tsx src/cli/index.ts emit examples/hello-world/src/index.ts

# Check for unsupported patterns
npx tsx src/cli/index.ts check examples/hello-world/src/index.ts

# Build a Go binary (requires Go installed)
npx tsx src/cli/index.ts build examples/hello-world/src/index.ts
```

## Supported TypeScript Features

| Feature | Status | Go Output |
|---------|--------|-----------|
| `export default { fetch() }` | ✅ | `net/http` handler + `main()` |
| Interfaces | ✅ | Structs with JSON tags |
| Type aliases | ✅ | Go type aliases |
| `const` / `let` / `var` | ✅ | `const` / `var` / `:=` |
| Functions | ✅ | Go functions (exported = capitalized) |
| Template literals | ✅ | `fmt.Sprintf` |
| `if` / `else` | ✅ | `if` / `else` |
| `switch` / `case` | ✅ | Go `switch` (auto-strips `break`) |
| `for` loops | ✅ | `for` loops with `len()` |
| `for...of` | ✅ | `for _, item := range` |
| `async` / `await` | ✅ | Stripped (Go is synchronous) |
| `Promise<T>` return | ✅ | `(T, error)` tuple |
| `try` / `catch` | ✅ | `if err != nil` pattern |
| `request.url` | ✅ | `r.URL.String()` |
| `request.method` | ✅ | `r.Method` |
| `request.headers.get()` | ✅ | `r.Header.Get()` |
| `new Response()` | ✅ | `w.Write()` + `w.WriteHeader()` |
| `console.log()` | ✅ | `log.Println()` |
| `JSON.stringify()` | ✅ | `json.Marshal()` |
| `JSON.parse()` | ✅ | `json.Unmarshal()` |
| `new URL()` | ✅ | `url.Parse()` |
| Array / object literals | ✅ | Slices / struct composites |

## Unsupported Patterns (Validator)

The validator detects unsupported patterns with clear error codes:

| Code | Pattern | Suggestion |
|------|---------|------------|
| FTS001 | `any` type | Use a concrete type or `unknown` |
| FTS002 | `eval()` / `new Function()` | Refactor to avoid dynamic evaluation |
| FTS003 | `Proxy` / `Reflect` | Use plain objects with getters/setters |
| FTS004 | `Symbol` | Use string constants |
| FTS005 | `WeakRef` / `FinalizationRegistry` | Use standard GC patterns |
| FTS006 | Class inheritance (`extends`) | Use composition or interfaces |
| FTS007 | Decorators | Apply logic manually |
| FTS008 | Generator functions | Use arrays or channels |
| FTS009 | `with` statement | Use explicit property access |
| FTS010 | `delete` operator | Use `Map.delete()` or set undefined |
| FTS011 | `require()` | Use ES module `import` |

## Project Structure

```
fast-ts/
├── src/
│   ├── compiler/
│   │   ├── parser.ts        # TS source → IR (WinterTC-aware)
│   │   ├── validator.ts     # Validates supported TS subset (FTS001-FTS011)
│   │   ├── transformer.ts   # IR → IR optimizations (const folding, import dedup)
│   │   ├── emitter.ts       # IR → idiomatic Go source
│   │   ├── types.ts         # IR type definitions
│   │   └── type-map.ts      # TS type → Go type mapping
│   ├── runtime/             # Go runtime library packages
│   │   ├── runtime.go       # Package root
│   │   ├── handler/         # HTTP handler adapter (WinterTC fetch → net/http)
│   │   ├── console/         # console.log/error/warn → log.Println
│   │   ├── encoding/        # TextEncoder/TextDecoder → []byte/string
│   │   └── urlparams/       # URLSearchParams → url.Values
│   └── cli/
│       └── index.ts         # CLI: emit, build, check, init
├── tests/
│   ├── fixtures/            # TS input → expected Go output (7 fixtures)
│   ├── snapshot.test.ts     # Fixture-based snapshot tests
│   ├── parser.test.ts       # Parser unit tests
│   ├── type-map.test.ts     # Type mapping unit tests
│   ├── validator.test.ts    # Validator unit tests (16 tests)
│   ├── transformer.test.ts  # Transformer unit tests
│   └── integration.test.ts  # Full pipeline: TS → Go → binary → HTTP
├── .github/workflows/
│   └── ci.yml               # GitHub Actions CI
├── docs/
├── examples/
├── TASKS.md                 # Task board
├── CONTRIBUTING.md
└── README.md
```

## License

MIT
