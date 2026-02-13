# Claude Code Instructions for fast-ts

## What This Project Is
A TypeScript-to-Go compiler. Developers write WinterTC-compatible TypeScript (using the standard `Request`/`Response` API pattern), and fast-ts compiles it to a native Go binary.

## Before Starting Any Task
1. Read `TASKS.md` to find an available task (marked `[ ]`)
2. Check the task's dependencies are complete (marked `[x]`)
3. Read the task spec carefully — it has exact input/output examples
4. Read `docs/ARCHITECTURE.md` for the full system design

## Key Files
- `src/compiler/types.ts` — IR type definitions (the contract between parser and emitter)
- `src/compiler/parser.ts` — Parses TypeScript using TS Compiler API
- `src/compiler/emitter.ts` — Emits Go source code from IR
- `src/compiler/validator.ts` — Validates supported TypeScript subset
- `src/cli/index.ts` — CLI entry point
- `tests/fixtures/*/` — Snapshot test cases (input.ts → expected.go)

## Coding Standards
- TypeScript strict mode, no `any`
- IR nodes use discriminated unions: `{ kind: "return", values: [...] }`
- Generated Go must use only stdlib (no external deps)
- All Go struct fields capitalized with json tags
- Test every feature with a fixture in `tests/fixtures/`

## Common Patterns

### Parsing a TS node:
```typescript
if (ts.isReturnStatement(node)) {
  const expr = node.expression;
  if (expr && ts.isNewExpression(expr)) {
    // Handle: return new Response("body")
  }
}
```

### Emitting Go:
```typescript
emit(stmt: IRStatement): string {
  switch (stmt.kind) {
    case "return":
      return `return ${stmt.values.map(v => this.emitExpr(v)).join(", ")}`;
  }
}
```

## After Completing a Task
1. Run `npm test` and ensure all tests pass
2. Mark the task `[x]` in TASKS.md
3. Use PR title: `T{number}: {description}`
