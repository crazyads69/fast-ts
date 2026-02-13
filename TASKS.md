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
- **Status**: `[ ]`
- **Depends on**: nothing
- **Files**: `package.json`, `tsconfig.json`, `vitest.config.ts`
- **Spec**: Initialize npm project with TypeScript strict mode, Vitest for testing. Use `ts-morph` (if available) or raw `typescript` Compiler API. CLI via `commander`.
- **Test**: `npm run build` succeeds, `npm test` runs with 0 tests passing
- **Estimated complexity**: Small

### T002: IR type definitions
- **Status**: `[ ]`
- **Depends on**: T001
- **Files**: `src/compiler/types.ts`
- **Spec**: Define all IR node types as TypeScript interfaces. See [docs/ARCHITECTURE.md § IR Design]. Must include: `IRPackage`, `IRFunction`, `IRStruct`, `IRVariable`, `IRType`, `IRStatement` (all variants), `IRExpression` (all variants). Every node must have a `kind` discriminant field.
- **Test**: File compiles with `tsc --noEmit`. Types are used in parser/emitter.
- **Estimated complexity**: Medium

### T003: Type mapping reference table
- **Status**: `[ ]`  
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
- **Status**: `[ ]`
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
- **Status**: `[ ]`
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
- **Status**: `[ ]`
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
- **Status**: `[ ]`
- **Depends on**: T010, T011
- **Files**: `tests/snapshot.test.ts`, `tests/fixtures/hello-world/{input.ts,expected.go}`
- **Spec**: Create test runner that for each fixture directory: reads `input.ts`, compiles it, compares output to `expected.go`. Use Vitest's `toMatchSnapshot()` or string comparison.
- **Test**: `npm test` passes with hello-world fixture
- **Estimated complexity**: Small

---

## Phase 2: Type System

### T020: Parse interface declarations → Go structs
- **Status**: `[ ]`
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
- **Status**: `[ ]`
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
- **Status**: `[ ]`
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
- **Status**: `[ ]`
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
### T031: Switch/case → Go switch
### T032: For loops → Go for
### T033: For...of → Go for range
### T034: Template literals → fmt.Sprintf
### T035: Binary expressions (===, !==, +, -, etc.)
### T036: Property access chains
### T037: Array/object literals → Go slices/structs

*Details for each: see [docs/ARCHITECTURE.md § Compiler Stages]*

---

## Phase 4: WinterTC API Mappings

### T040: Request property mapping
- `request.url` → `r.URL.String()`
- `request.method` → `r.Method`
- `request.headers` → `r.Header`
- `request.headers.get("key")` → `r.Header.Get("key")`

### T041: Response construction mapping
- `new Response("body")` → `w.Write([]byte("body"))`
- `new Response("body", { status: 404 })` → `w.WriteHeader(404); w.Write(...)`
- `new Response(JSON.stringify(data))` → `json.NewEncoder(w).Encode(data)`

### T042: URL parsing
- `new URL(str)` → `url.Parse(str)`
- `url.pathname` → `u.Path`
- `url.searchParams.get("key")` → `u.Query().Get("key")`

### T043: Console mapping
- `console.log(...)` → `log.Println(...)`
- `console.error(...)` → `log.Println(...)`

### T044: JSON mapping
- `JSON.stringify(obj)` → `json.Marshal(obj)`
- `JSON.parse(str)` → `json.Unmarshal([]byte(str), &target)`

---

## Phase 5: Error Handling & Async

### T050: try/catch → Go error returns
### T051: async/await → sequential (Phase 1 simple)
### T052: Promise<T> return type → (T, error)

---

## Phase 6: Validator

### T060: Detect unsupported `any` usage → FTS001
### T061: Detect `eval()` / `new Function()` → FTS002
### T062: Detect `Proxy` / `Reflect` → FTS003
### T063: Detect class inheritance → FTS006
### T064: Detect decorators → FTS007
### T065: Detect `require()` → FTS011

---

## Phase 7: Go Runtime Library

### T070: `runtime/http` package — WinterTC handler adapter
### T071: `runtime/console` package
### T072: `runtime/encoding` package — TextEncoder/TextDecoder
### T073: `runtime/url` package — URLSearchParams helper

---

## Phase 8: Polish & Release

### T080: Integration test — full .ts → binary → HTTP test
### T081: Benchmark suite — fast-ts vs Node.js+Hono
### T082: Error message quality audit
### T083: README + docs site
### T084: npm publish setup
### T085: GitHub Actions CI
