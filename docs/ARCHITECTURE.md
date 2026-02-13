# fast-ts Architecture

## Overview

fast-ts is a **ahead-of-time compiler** that transforms TypeScript source code into Go source code, which is then compiled into a native binary using the Go toolchain. It targets the WinterTC (ECMA-429) Minimum Common API.

```
Developer writes TS → fast-ts compiles to Go → go build → native binary
```

The developer never needs to know Go exists. They write TypeScript, they get a binary.

## Compiler Pipeline

### Stage 1: Parse

**Input**: TypeScript source file  
**Output**: TypeScript AST + Type Map  
**Implementation**: `src/compiler/parser.ts`  
**Library**: TypeScript Compiler API (`ts.createProgram`)

The parser creates a TypeScript `Program` with full type checking enabled. This gives us:
- Complete AST with all syntax nodes
- Type checker that resolves all types to their concrete forms
- Diagnostic errors for invalid TypeScript

Key requirement: **Every expression must have a known concrete type.** Go is statically typed, so we cannot have unresolved types.

### Stage 2: Validate

**Input**: TypeScript AST  
**Output**: List of `CompileError` or clean pass  
**Implementation**: `src/compiler/validator.ts`

The validator walks the AST and rejects unsupported TypeScript features:

| Code | Feature | Error Message |
|------|---------|---------------|
| FTS001 | `any` / unhandled `unknown` | "Type 'any' is not supported. Add explicit type annotations." |
| FTS002 | `eval()` / `new Function()` | "Dynamic code evaluation cannot be compiled to Go." |
| FTS003 | `Proxy` / `Reflect` | "Proxy and Reflect are not supported in Go." |
| FTS004 | Dynamic property access `obj[expr]` | "Dynamic property access requires a Map<K,V> type." |
| FTS005 | Prototype manipulation | "Prototype manipulation is not supported." |
| FTS006 | Class inheritance (`extends`) | "Class inheritance is not supported. Use interface composition." |
| FTS007 | Decorators | "Decorators are not supported." |
| FTS008 | `Symbol` | "Symbol is not supported in Go." |
| FTS009 | `WeakRef` / `FinalizationRegistry` | "Weak references are not supported." |
| FTS010 | `globalThis` mutation | "Mutating globalThis is not supported." |
| FTS011 | `require()` | "CommonJS require() is not supported. Use ES module imports." |

### Stage 3: Transform

**Input**: Validated TypeScript AST  
**Output**: IR (Intermediate Representation)  
**Implementation**: `src/compiler/transformer.ts`

The transformer converts TypeScript AST nodes into IR nodes that model Go semantics. This is where the critical semantic transformations happen:

**Type mapping**: `string` → `string`, `number` → `float64`, `boolean` → `bool`, etc.

**Interface → Struct**:
```typescript
interface User { name: string; age: number; }
```
→
```
IRStruct { name: "User", fields: [{ name: "Name", type: string }, { name: "Age", type: float64 }] }
```

**WinterTC Entry Point**:
```typescript
export default { fetch(request: Request): Response { ... } }
```
→
```
IRFunction handler(w http.ResponseWriter, r *http.Request) { ... }
+ main() body with http.HandleFunc + ListenAndServe
```

**Response Construction**:
```typescript
return new Response("Hello");
```
→
```
IRExpressionStmt: w.Write([]byte("Hello"))
IRReturnStmt: return
```

### Stage 4: Emit

**Input**: IR (IRPackage)  
**Output**: Go source code string  
**Implementation**: `src/compiler/emitter.ts`

The emitter produces idiomatic, gofmt-compatible Go code from the IR. It handles:
- Package declaration and import management
- Struct definitions with json tags
- Function definitions with correct Go parameter syntax
- Control flow statements
- Expression formatting
- String escaping

### Stage 5: Build

**Input**: Go source files (main.go + go.mod)  
**Output**: Native binary  
**Implementation**: `src/cli/index.ts` (wraps `go build`)

Options:
- `--target linux/amd64` → cross-compilation via GOOS/GOARCH
- `--static` → CGO_ENABLED=0 for fully static binary
- `--release` → `go build -ldflags="-s -w"` to strip debug info

---

## IR Design

The IR (Intermediate Representation) is the **contract** between the parser/transformer and the emitter. It's defined in `src/compiler/types.ts`.

### Design Principles

1. **1:1 with Go semantics**: Every IR node maps directly to a Go construct
2. **Discriminated unions**: Every node has a `kind` field for easy switching
3. **No TypeScript-specific concepts**: The IR knows nothing about TS
4. **Tree structure**: IRPackage → IRDeclaration[] → IRStatement[] → IRExpression[]

### Key Types

```typescript
// Top level
interface IRPackage {
  name: string;           // "main"
  imports: IRImport[];    // Go import paths
  declarations: IRDeclaration[];
  mainBody?: IRStatement[];
}

// Types
interface IRType {
  kind: "string" | "int64" | "float64" | "bool" | "slice" | "map" | 
        "struct" | "pointer" | "chan" | "interface" | "named" | "error" | "void";
  elementType?: IRType;   // for slice, pointer, chan
  keyType?: IRType;       // for map
  valueType?: IRType;     // for map
  name?: string;          // for named types
  fields?: IRField[];     // for struct
}

// Declarations
type IRDeclaration = IRFunctionDecl | IRStructDecl | IRVarDecl | IRConstDecl | IRTypeAliasDecl;

// Statements
type IRStatement = IRExpressionStmt | IRReturnStmt | IRVarDeclStmt | IRAssignStmt |
                   IRIfStmt | IRForStmt | IRForRangeStmt | IRSwitchStmt | IRBlockStmt;

// Expressions
type IRExpression = IRIdentifier | IRLiteral | IRCallExpr | IRMemberExpr |
                    IRBinaryExpr | IRUnaryExpr | IRIndexExpr | IRCompositeLit | IRFuncLitExpr;
```

---

## WinterTC API → Go Stdlib Mapping

| WinterTC | Go Equivalent | Import |
|----------|--------------|--------|
| `Request` | `*http.Request` | `net/http` |
| `Response` | `http.ResponseWriter` | `net/http` |
| `Headers` | `http.Header` | `net/http` |
| `URL` | `*url.URL` | `net/url` |
| `URLSearchParams` | `url.Values` | `net/url` |
| `fetch()` | `http.Client.Do()` | `net/http` |
| `ReadableStream` | `io.Reader` | `io` |
| `WritableStream` | `io.Writer` | `io` |
| `TextEncoder` | `[]byte(s)` | (builtin) |
| `TextDecoder` | `string(b)` | (builtin) |
| `crypto.subtle` | `crypto/*` | `crypto/*` |
| `console.log` | `log.Println` | `log` |
| `console.error` | `log.Println` | `log` |
| `setTimeout` | `time.AfterFunc` | `time` |
| `JSON.stringify` | `json.Marshal` | `encoding/json` |
| `JSON.parse` | `json.Unmarshal` | `encoding/json` |
| `atob()` | `base64.StdEncoding.DecodeString` | `encoding/base64` |
| `btoa()` | `base64.StdEncoding.EncodeToString` | `encoding/base64` |
| `structuredClone` | deep copy (generate) | — |
| `performance.now()` | `time.Now().UnixMilli()` | `time` |

---

## Generated Code Patterns

### WinterTC Handler (Hello World)

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

### JSON API Response

```go
func handler(w http.ResponseWriter, r *http.Request) {
    data := User{Name: "Alice", Age: 30}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(data)
}
```

### URL Parsing

```go
func handler(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    w.Write([]byte(fmt.Sprintf("Hello, %v!", name)))
}
```

### Error Handling (try/catch → error return)

TypeScript:
```typescript
try {
  const data = JSON.parse(body);
} catch (e) {
  return new Response("Invalid JSON", { status: 400 });
}
```

Go:
```go
var data interface{}
err := json.Unmarshal([]byte(body), &data)
if err != nil {
    w.WriteHeader(400)
    w.Write([]byte("Invalid JSON"))
    return
}
```
