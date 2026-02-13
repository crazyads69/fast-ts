# fast-ts Task Board

> Every task is designed as an **atomic unit** that an LLM coding agent can complete in a single session.
> Each task has: clear scope, input/output spec, test criteria, and file locations.

## How to Pick a Task

1. Find a task marked `[ ]` (uncompleted)
2. Check its dependencies — all `[x]` tasks it depends on must be done
3. Read the **Files**, **Input/Output**, and **Tests** sections
4. Implement it
5. Run the specified tests
6. Mark it `[x]` and submit PR

---

## Phase 0: Foundation

### T001: Project scaffold & build system
- **Status**: `[x]`
- **Depends on**: nothing
- **Files**: `package.json`, `tsconfig.json`, `vitest.config.ts`
- **Spec**: Initialize npm project with TypeScript strict mode, Vitest for testing. Use `ts-morph` (if available) or raw `typescript` Compiler API. CLI via `commander`.
- **Test**: `npm run build` succeeds, `npm test` runs with 0 tests passing
- **Estimated complexity**: Small

### T002: IR type definitions
- **Status**: `[x]`
- **Depends on**: T001
- **Files**: `src/compiler/types.ts`
- **Spec**: Define all IR node types as TypeScript interfaces. See [docs/ARCHITECTURE.md § IR Design]. Must include: `IRPackage`, `IRFunction`, `IRStruct`, `IRVariable`, `IRType`, `IRStatement` (all variants), `IRExpression` (all variants). Every node must have a `kind` discriminant field.
- **Test**: File compiles with `tsc --noEmit`. Types are used in parser/emitter.
- **Estimated complexity**: Medium

### T003: Type mapping reference table
- **Status**: `[x]`  
- **Depends on**: T002
- **Files**: `src/compiler/type-map.ts`, `docs/TYPE-MAPPING.md`
- **Spec**: Create a function `mapTSTypeToGo(tsType: string): string` and a corresponding doc table. Mappings:
  ```
  string       → string
  number       → float64 (default) | int64 (when integer context detected)
  boolean      → bool
  null         → nil
  undefined    → nil (zero value)
  void         → (no return)
  Array<T>     → []T
  Map<K,V>     → map[K]V
  Set<T>       → map[T]struct{}
  Record<K,V>  → map[K]V
  Promise<T>   → (T, error)
  T | null     → *T
  interface    → struct
  ```
- **Test**: Unit test with all mappings verified
- **Estimated complexity**: Small

---

## Phase 1: Hello World Pipeline (M1)

### T010: Parser — parse WinterTC entry point
- **Status**: `[x]`
- **Depends on**: T002
- **Files**: `src/compiler/parser.ts`
- **Spec**: Using the TypeScript Compiler API (`ts.createSourceFile`, `ts.createProgram`), parse a source file and detect the `export default { fetch(request: Request): Response { ... } }` pattern. Extract the fetch handler's parameters and body AST.
- **Input**: 
  ```typescript
  export default {
    fetch(request: Request): Response {
      return new Response("Hello from fast-ts!");
    }
  };
  ```
- **Output**: Parsed structure identifying: entry point type = "wintercg-fetch", handler params = [{name: "request", type: "Request"}], body statements
- **Test**: `tests/parser.test.ts` — parse hello-world fixture, assert entry point detected
- **Estimated complexity**: Large

### T011: Emitter — generate Go from hello world
- **Status**: `[x]`
- **Depends on**: T002, T010
- **Files**: `src/compiler/emitter.ts`
- **Spec**: Take the parsed IR from T010 and emit Go source code. For M1, only handle:
  - `export default { fetch }` → `func handler(w http.ResponseWriter, r *http.Request)` + `func main()`
  - `return new Response("body")` → `w.Write([]byte("body"))`
  - String literals
  - `net/http` import generation
- **Input**: IR from parser
- **Output**:
  ```go
  package main

  import (
      "log"
      "net/http"
  )

  func handler(w http.ResponseWriter, r *http.Request) {
      w.Write([]byte("Hello from fast-ts!"))
  }

  func main() {
      http.HandleFunc("/", handler)
      log.Println("fast-ts server listening on :8080")
      log.Fatal(http.ListenAndServe(":8080", nil))
  }
  ```
- **Test**: Snapshot test — compare emitted Go with `tests/fixtures/hello-world/expected.go`
- **Estimated complexity**: Large

### T012: CLI — `fast-ts build` and `fast-ts emit` commands
- **Status**: `[x]`
- **Depends on**: T010, T011
- **Files**: `src/cli/index.ts`
- **Spec**: CLI with two commands:
  - `fast-ts emit <file.ts>` — print generated Go to stdout
  - `fast-ts build <file.ts> [--outdir .fast-ts]` — write Go files to disk, optionally run `go build`
  - `fast-ts init <name>` — scaffold a new project
  - Colored output, timing, file sizes
- **Test**: CLI smoke test — run `fast-ts emit examples/hello-world/src/index.ts` and verify Go output
- **Estimated complexity**: Medium

### T013: Snapshot test infrastructure
- **Status**: `[x]`
- **Depends on**: T010, T011
- **Files**: `tests/snapshot.test.ts`, `tests/fixtures/hello-world/{input.ts,expected.go}`
- **Spec**: Create test runner that for each fixture directory: reads `input.ts`, compiles it, compares output to `expected.go`. Use Vitest's `toMatchSnapshot()` or string comparison.
- **Test**: `npm test` passes with hello-world fixture
- **Estimated complexity**: Small

---

## Phase 2: Type System

### T020: Parse interface declarations → Go structs
- **Status**: `[x]`
- **Depends on**: T010
- **Files**: `src/compiler/parser.ts`, `src/compiler/emitter.ts`
- **Input**:
  ```typescript
  interface User {
    name: string;
    age: number;
    active: boolean;
  }
  ```
- **Output**:
  ```go
  type User struct {
      Name   string  `json:"name"`
      Age    float64 `json:"age"`
      Active bool    `json:"active"`
  }
  ```
- **Test**: Fixture `tests/fixtures/interface-basic/`
- **Estimated complexity**: Medium

### T021: Parse type aliases → Go types
- **Status**: `[x]`
- **Depends on**: T010
- **Files**: `src/compiler/parser.ts`, `src/compiler/emitter.ts`
- **Input**:
  ```typescript
  type UserID = string;
  type UserMap = Map<string, User>;
  type Tags = string[];
  ```
- **Output**:
  ```go
  type UserID = string
  type UserMap = map[string]User
  type Tags = []string
  ```
- **Test**: Fixture `tests/fixtures/type-alias/`
- **Estimated complexity**: Medium

### T022: Variable declarations
- **Status**: `[x]`
- **Depends on**: T010
- **Input**:
  ```typescript
  const port: number = 8080;
  const host = "localhost";
  let count = 0;
  ```
- **Output**:
  ```go
  const port float64 = 8080
  const host = "localhost"
  var count = 0
  ```
- **Test**: Fixture `tests/fixtures/variables/`
- **Estimated complexity**: Small

### T023: Function declarations
- **Status**: `[x]`
- **Depends on**: T010
- **Input**:
  ```typescript
  function greet(name: string): string {
    return `Hello, ${name}!`;
  }
  ```
- **Output**:
  ```go
  func Greet(name string) string {
      return fmt.Sprintf("Hello, %v!", name)
  }
  ```
- **Test**: Fixture `tests/fixtures/function-basic/`
- **Estimated complexity**: Medium

---

## Phase 3: Control Flow & Expressions

### T030: If/else → Go if/else
- **Status**: `[x]`
- **Test**: `tests/fixtures/control-flow/`

### T031: Switch/case → Go switch
- **Status**: `[x]`
- **Test**: `tests/fixtures/control-flow/`

### T032: For loops → Go for
- **Status**: `[x]`
- **Test**: `tests/fixtures/control-flow/`

### T033: For...of → Go for range
- **Status**: `[x]`
- **Test**: `tests/fixtures/control-flow/`

### T034: Template literals → fmt.Sprintf
- **Status**: `[x]`
- **Test**: `tests/fixtures/function-basic/`

### T035: Binary expressions (===, !==, +, -, etc.)
- **Status**: `[x]`

### T036: Property access chains
- **Status**: `[x]`
- **Note**: `.length` → `len()` mapping included

### T037: Array/object literals → Go slices/structs
- **Status**: `[x]`
- **Test**: `tests/fixtures/interface-basic/`

---

## Phase 4: WinterTC API Mappings

### T040: Request property mapping
- **Status**: `[x]`
- **Mappings**: `request.url` → `r.URL.String()`, `request.method` → `r.Method`, `request.headers` → `r.Header`, `request.body` → `r.Body`
- **Test**: `tests/fixtures/request-props/`

### T041: Response construction mapping
- **Status**: `[x]`
- **Mappings**: `new Response("body")` → `w.Write([]byte("body"))`, with status → `w.WriteHeader(n)`
- **Test**: `tests/fixtures/hello-world/`, `tests/fixtures/request-props/`

### T042: URL parsing
- **Status**: `[x]`
- **Mappings**: `new URL(str)` → `url.Parse(str)`, `url.searchParams.get("key")` → `url.Query().Get("key")`

### T043: Console mapping
- **Status**: `[x]`
- **Mappings**: `console.log(...)` → `log.Println(...)`, `console.error(...)` → `log.Println(...)`

### T044: JSON mapping
- **Status**: `[x]`
- **Mappings**: `JSON.stringify(obj)` → `json.Marshal(obj)`, `JSON.parse(str)` → `json.Unmarshal([]byte(str), &target)`

---

## Phase 5: Error Handling & Async

### T050: try/catch → Go error returns
- **Status**: `[x]`
- **Files**: `src/compiler/parser.ts`, `src/compiler/types.ts`, `src/compiler/emitter.ts`
- **Note**: `IRErrorCheckStmt` added. try body inlined, catch → `if err != nil { ... }`

### T051: async/await → sequential (Phase 1 simple)
- **Status**: `[x]`
- **Note**: `await` expressions unwrapped (Go is synchronous). `async` keyword stripped from function declarations.

### T052: Promise<T> return type → (T, error)
- **Status**: `[x]`
- **Note**: `Promise<T>` unwrapped via type-map. Async functions automatically get `error` as second return value.
- **Test**: `tests/fixtures/async-await/`

---

## Phase 6: Validator

### T060: Detect unsupported `any` usage → FTS001
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T061: Detect `eval()` / `new Function()` → FTS002
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T062: Detect `Proxy` / `Reflect` → FTS003
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T063: Detect class inheritance → FTS006
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T064: Detect decorators → FTS007
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T065: Detect `require()` → FTS011
- **Status**: `[x]`
- **Test**: `tests/validator.test.ts`

### T066: Additional validators (Symbol, WeakRef, generators, delete, with)
- **Status**: `[x]`
- **Note**: FTS004 (Symbol), FTS005 (WeakRef/FinalizationRegistry), FTS008 (generators), FTS009 (with), FTS010 (delete)
- **Test**: `tests/validator.test.ts`

---

## Phase 7: Go Runtime Library

### T070: `runtime/handler` package — WinterTC handler adapter
- **Status**: `[x]`
- **Files**: `src/runtime/handler/handler.go`
- **Note**: Serve with graceful shutdown, JSON/Text/Status/Redirect helpers

### T071: `runtime/console` package
- **Status**: `[x]`
- **Files**: `src/runtime/console/console.go`
- **Note**: Log, Error, Warn, Info, Debug, Assert, Table, Dir, Group/GroupEnd

### T072: `runtime/encoding` package — TextEncoder/TextDecoder
- **Status**: `[x]`
- **Files**: `src/runtime/encoding/encoding.go`
- **Note**: TextEncode (string→[]byte), TextDecode ([]byte→string), stateful TextEncoder/TextDecoder types

### T073: `runtime/urlparams` package — URLSearchParams helper
- **Status**: `[x]`
- **Files**: `src/runtime/urlparams/urlparams.go`
- **Note**: Full URLSearchParams API: Get, GetAll, Set, Append, Has, Delete, String, Entries, Keys, Values, ForEach, Sort, Size

---

## Phase 8: Polish & Release

### T080: Integration test — full .ts → binary → HTTP test
- **Status**: `[x]`
- **Files**: `tests/integration.test.ts`
- **Note**: Compiles hello-world + variables fixtures → Go → binary → HTTP server → verifies response. Skips if Go not installed.

### T081: Benchmark suite — fast-ts vs Node.js+Hono
- **Status**: `[ ]` (deferred — needs real-world app samples)

### T082: Error message quality audit
- **Status**: `[x]`
- **Note**: All FTS001-FTS011 codes have clear message + actionable suggestion + file/line/column

### T083: README + docs
- **Status**: `[x]`
- **Note**: README updated with feature tables, quick start, project structure, validator error codes

### T084: npm publish setup
- **Status**: `[x]`
- **Note**: package.json: files, types, prepublishOnly, test:integration

### T085: GitHub Actions CI
- **Status**: `[x]`
- **Files**: `.github/workflows/ci.yml`
- **Note**: Node 20/22 matrix for unit tests + Go 1.22 for integration tests
