# Contributing to fast-ts

This project is **designed for LLM-assisted development**. Whether you're a human developer or an AI coding agent (Claude Code, Cursor, Copilot Workspace, Devin, Windsurf, etc.), these guidelines will help you contribute effectively.

## For AI Coding Agents

### Quick Context

fast-ts is a **TypeScript-to-Go compiler** targeting WinterTC (ECMA-429) server APIs. It takes TypeScript source that uses the standard `Request`/`Response` pattern and compiles it to a native Go binary.

The compiler pipeline is:
```
Parse (TS Compiler API) → Validate → Transform (TS AST → IR) → Emit (IR → Go) → Build (go build)
```

### How to Pick Up a Task

1. **Read `TASKS.md`** — find a task marked `[ ]` whose dependencies are all `[x]`
2. **Read the task's spec** — each task has Input, Output, Test criteria, and file locations
3. **Read the relevant docs** — `docs/ARCHITECTURE.md`, `docs/TYPE-MAPPING.md`, `docs/WINTERTC-API-MAP.md`
4. **Implement in the specified files** — don't create new files unless the task says to
5. **Write/run the specified tests**
6. **Mark the task `[x]`** in `TASKS.md`

### Code Conventions

```typescript
// ✅ DO: Use the TS Compiler API directly
import * as ts from "typescript";
const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022);

// ✅ DO: Use discriminated unions for IR nodes
interface IRReturnStmt { kind: "return"; values: IRExpression[]; }
interface IRIfStmt { kind: "if"; condition: IRExpression; body: IRStatement[]; }

// ✅ DO: Generate idiomatic Go
func handler(w http.ResponseWriter, r *http.Request) {

// ❌ DON'T: Use `any` type — this is a compiler, types matter
// ❌ DON'T: Add external dependencies without discussion
// ❌ DON'T: Generate Go that uses reflection or interface{}
```

### Testing Conventions

Every compiler feature needs a **snapshot test fixture**:

```
tests/fixtures/{feature-name}/
├── input.ts        # TypeScript source
└── expected.go     # Expected Go output
```

The test runner reads `input.ts`, compiles it, and compares output to `expected.go`.

### Key Design Decisions (Don't Change These)

| Decision | Rationale |
|----------|-----------|
| Use TS Compiler API (not Babel/SWC) | We need full type information, not just syntax |
| Target Go 1.24+ | Need generic type aliases, Swiss table maps |
| No runtime reflection in generated Go | Performance — all type info resolved at compile time |
| All Go struct fields are exported (capitalized) | Go convention, needed for JSON marshaling |
| `export default { fetch }` is THE entry point | WinterTC standard pattern |
| Strict TypeScript only | No `any`, no `unknown` without explicit handling |
| `console.*` → `log.*` | Go stdlib only, no external deps in runtime |

### PR Title Convention

```
T{number}: {short description}

Examples:
T010: Implement WinterTC entry point parser
T011: Add Go emitter for hello world
T020: Parse interface declarations to Go structs
```

---

## For Human Contributors

All of the above applies, plus:

- **Discuss before major changes** — open an issue first
- **Code review**: Focus on correctness of TS→Go mapping. Does the generated Go compile? Does it behave identically?
- **Adding new mappings**: Add to `docs/WINTERTC-API-MAP.md` first, then implement
- **Adding test cases**: More fixtures = better. Even edge cases that currently fail are valuable (mark them with `// TODO:` in input.ts)

## Architecture Orientation

### File Responsibility

| File | Responsibility | Key Types |
|------|---------------|-----------|
| `src/compiler/types.ts` | IR type definitions | `IRPackage`, `IRType`, `IRStatement`, `IRExpression` |
| `src/compiler/parser.ts` | TS source → IR | `parse(filename, source) → IRPackage` |
| `src/compiler/validator.ts` | Detect unsupported features | `validate(sourceFile) → CompileError[]` |
| `src/compiler/emitter.ts` | IR → Go source string | `emit(pkg: IRPackage) → string` |
| `src/compiler/type-map.ts` | TS type → Go type | `mapType(tsType) → goType` |
| `src/cli/index.ts` | CLI commands | `build`, `emit`, `init` |
| `src/runtime/*.go` | Go runtime library | WinterTC API helpers |

### The IR is the Contract

The **IR (Intermediate Representation)** defined in `types.ts` is the contract between parser and emitter. Both sides must agree on these types. If you change an IR type, you must update both parser and emitter.

### WinterTC API Mapping Strategy

Each WinterTC API maps to Go stdlib:

```
WinterTC                    Go stdlib
───────                     ─────────
Request                  →  *http.Request
Response                 →  http.ResponseWriter
Headers                  →  http.Header
URL                      →  *url.URL
URLSearchParams          →  url.Values
fetch()                  →  http.Client.Do()
ReadableStream           →  io.Reader
WritableStream           →  io.Writer
TextEncoder              →  []byte(s)
TextDecoder              →  string(b)
crypto.subtle            →  crypto/*
console.log              →  log.Println
setTimeout               →  time.AfterFunc
JSON.stringify           →  json.Marshal
JSON.parse               →  json.Unmarshal
```

Full mapping table: `docs/WINTERTC-API-MAP.md`

## Development Setup

```bash
npm install
npm run build    # Compile TypeScript
npm test         # Run all tests
npm run fast-ts -- emit examples/hello-world/src/index.ts  # Test compiler
```

## Questions?

Open an issue with the `question` label. Both humans and bots are welcome to ask.
