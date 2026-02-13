# fast-ts Research Findings

> Last updated: February 2026

## 1. WinterCG → WinterTC (Ecma TC55)

**Key change**: WinterCG has been renamed to **WinterTC** and moved from W3C to Ecma International as Technical Committee 55 (TC55), effective January 2025.

The "Minimum Common API" is now published as **ECMA-429** (2025 snapshot, adopted December 2025). This gives it real standards weight — it's no longer just a community group proposal.

### Minimum Common API — Required Interfaces

From the 2025 snapshot, all conforming runtimes must implement:

**From DOM Standard**: `AbortController`, `AbortSignal`, `Event`, `EventTarget`

**From Fetch Standard**: `fetch()`, `Headers`, `Request`, `Response`

**From Streams Standard**: `ReadableStream`, `ReadableByteStreamController`, `ReadableStreamBYOBReader`, `ReadableStreamDefaultController`, `ReadableStreamDefaultReader`, `WritableStream`, `WritableStreamDefaultController`, `WritableStreamDefaultWriter`, `TransformStream`, `TransformStreamDefaultController`, `ByteLengthQueuingStrategy`, `CountQueuingStrategy`

**From Web Crypto**: `Crypto`, `CryptoKey`, `SubtleCrypto`

**From Encoding Standard**: `TextDecoder`, `TextDecoderStream`, `TextEncoder`, `TextEncoderStream`

**From URL Standard**: `URL`, `URLSearchParams`

**From URL Pattern Standard**: `URLPattern`

**From Compression Standard**: `CompressionStream`, `DecompressionStream`

**From File API**: `Blob`, `File`, `FormData`

**From HTML Standard**: `DOMException`, `structuredClone()`, `atob()`, `btoa()`, `setTimeout()`, `clearTimeout()`, `setInterval()`, `clearInterval()`, `queueMicrotask()`

**From High Resolution Time**: `performance.now()`, `performance.timeOrigin`

**From Console Standard**: `console.*`

**From WebAssembly**: `WebAssembly.*`

### WinterTC Entry Point Pattern

The standard server entry point adopted by Hono, Elysia, Cloudflare Workers, Deno Deploy:

```typescript
export default {
  fetch(request: Request): Response | Promise<Response> {
    return new Response("Hello");
  }
};
```

This is THE interface fast-ts targets. Other patterns (Express-style `app.listen()`, Koa-style, etc.) are explicitly out of scope for Phase 1.

---

## 2. TypeScript Compiler API

### Project Corsa (TypeScript in Go)
Microsoft is porting the TypeScript compiler itself to Go (announced March 2025, targeting TypeScript 7.0). Key facts:
- Validates Go as an excellent target for compiler work
- 10x speedup in type checking via Go's multi-threading
- Parser/scanner took 1-1.5 months to write from scratch
- Full tsc expected end of 2025 / early 2026
- Repo: `github.com/microsoft/typescript-go`

**Implication for fast-ts**: Our compiler (written in TypeScript) uses the TS Compiler API to parse. When tsgo stabilizes, we could potentially use it for faster parsing. But for Phase 1, the standard TS Compiler API is sufficient and well-documented.

### Using the TS Compiler API

Two approaches:
1. **Direct API** (`import * as ts from "typescript"`): Lower-level, full control, well-documented on TypeScript wiki
2. **ts-morph** (`import { Project } from "ts-morph"`): Higher-level wrapper, easier navigation, but adds a dependency

**Decision**: For the repo, support both. Use raw TS Compiler API as the default (zero external deps beyond `typescript` itself). Document ts-morph as an optional enhancement.

Key API patterns:
```typescript
// Create a program with type checking
const program = ts.createProgram([filename], options);
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(filename);

// Walk the AST
ts.forEachChild(sourceFile, function visit(node) {
  if (ts.isInterfaceDeclaration(node)) { /* ... */ }
  if (ts.isFunctionDeclaration(node)) { /* ... */ }
  ts.forEachChild(node, visit);
});

// Get type information
const type = checker.getTypeAtLocation(node);
const typeString = checker.typeToString(type);
```

### Existing TS→Go Transpilers

- **leona/ts2go**: Experimental, very limited subset. Proves concept viable but not production-ready. Written in TypeScript.
- **aperturerobotics/goscript**: Goes the OTHER direction (Go→TypeScript). Interesting for understanding goroutine↔microtask mapping.
- **armsnyder/ts2go**: TypeScript type definitions → Go structs only. Good reference for type mapping.

**Key learning**: No production TS→Go compiler exists yet. The main challenge is mapping TypeScript's dynamic features to Go's static type system. Our approach of restricting to a strict subset (no `any`, no `eval`, no prototype manipulation) is validated by these prior attempts.

---

## 3. Go Language Status

### Go 1.24 (February 2025)
- **Generic type aliases**: `type GenericNode[T any] = Node[T]` — now works
- **Swiss table maps**: Built-in map reimplemented for better performance
- **Tool directives in go.mod**: Track executable dependencies
- **crypto/mlkem**: Post-quantum cryptography
- **FIPS 140-3 compliance**: Built-in FIPS mode
- **os.Root**: Filesystem isolation
- **runtime.AddCleanup**: Better resource cleanup
- **2-3% CPU overhead reduction** across benchmarks

### Go 1.25 (August 2025)
- **Core types removed from spec**: Simpler generics rules
- **Container-aware GOMAXPROCS**: Better Docker/K8s defaults
- **testing/synctest**: Stable concurrent testing
- **encoding/json/v2 (experimental)**: Major JSON overhaul
- **DWARF5 debug info**: Smaller binaries, faster linking
- **Stack-allocated slices**: Better performance for consecutive slice allocations

**Decision**: Target **Go 1.24+** as minimum. This gives us generic type aliases (useful for runtime library) and Swiss table maps (better performance). Generated code must compile with `go 1.24` in go.mod.

---

## 4. Hono & the WinterTC Ecosystem

Hono is the most popular WinterTC-compatible framework, confirming the viability of the `export default { fetch }` pattern:

- Built entirely on Web Standards (Request/Response)
- Runs on: Cloudflare Workers, Fastly Compute, Deno, Bun, AWS Lambda, Node.js
- Zero dependencies, uses only Web Standard API
- Currently the fastest JS router (RegExpRouter)

**Elysia** (Bun-specific) and **HatTip** also use the same pattern. A universal middleware proposal (#443 on Hono) shows the ecosystem converging on `(Request) → Response` as the standard middleware signature.

**Implication for fast-ts**: The `fetch(request: Request): Response` pattern is well-established. Our entry point detection is aligned with the ecosystem. Phase 2 can add Hono-specific route pattern support.

---

## 5. Key Technical Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| TypeScript too dynamic for Go | High | Strict validator rejects unsupported features with clear errors |
| Union types (`string \| number`) | High | Phase 1: only `T \| null` → `*T`. Complex unions → compile error |
| Async/await semantics | Medium | Phase 1: flatten to sequential. Phase 2: goroutines |
| Generated code quality | Medium | Snapshot tests + gofmt post-processing |
| WinterTC spec evolving | Low | Track ECMA-429, implement core subset first |
| Binary size bloat | Low | Tree-shake unused runtime packages |

---

## 6. References

- [ECMA-429 Minimum Common API (2025)](https://min-common-api.proposal.wintertc.org/)
- [WinterTC organization](https://wintertc.org/)
- [WinterTC GitHub](https://github.com/WinterTC55)
- [TypeScript Compiler API wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [TypeScript transformer handbook](https://github.com/itsdouges/typescript-transformer-handbook)
- [ts-morph documentation](https://ts-morph.com/)
- [Project Corsa (TypeScript in Go)](https://devblogs.microsoft.com/typescript/typescript-native-port/)
- [Go 1.24 release notes](https://go.dev/doc/go1.24)
- [Go 1.25 release notes](https://go.dev/blog/go1.25)
- [Hono framework](https://hono.dev/)
- [leona/ts2go](https://github.com/leona/ts2go)
- [aperturerobotics/goscript](https://github.com/aperturerobotics/goscript)
