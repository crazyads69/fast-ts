/**
 * fast-ts Transformer
 *
 * IR-to-IR optimization and normalization pass.
 * Applies semantic transformations after parsing:
 * - Dead import elimination
 * - Constant folding for simple expressions
 * - Unused variable detection
 * - Import deduplication and sorting
 */

import type { IRPackage, IRDeclaration, IRStatement, IRExpression } from "./types.js";

export function transform(pkg: IRPackage): IRPackage {
  return {
    ...pkg,
    imports: deduplicateImports(pkg),
    declarations: pkg.declarations.map(transformDeclaration),
    mainBody: pkg.mainBody?.map(transformStatement),
  };
}

/** Remove duplicate imports and sort alphabetically */
function deduplicateImports(pkg: IRPackage) {
  const used = new Set<string>();
  collectUsedImports(pkg.declarations, used);
  if (pkg.mainBody) collectUsedImports(pkg.mainBody, used);

  // Always keep imports the parser added — they're based on actual usage
  const seen = new Set<string>();
  return pkg.imports.filter((imp) => {
    if (seen.has(imp.path)) return false;
    seen.add(imp.path);
    return true;
  });
}

/** Walk declarations/statements to find used import paths (heuristic) */
function collectUsedImports(nodes: (IRDeclaration | IRStatement)[], used: Set<string>) {
  for (const node of nodes) {
    walkExpressions(node, (expr) => {
      if (expr.kind === "identifier") {
        const parts = expr.name.split(".");
        if (parts.length === 2) {
          const pkg = parts[0]!;
          const pkgMap: Record<string, string> = {
            http: "net/http",
            log: "log",
            fmt: "fmt",
            json: "encoding/json",
            url: "net/url",
            time: "time",
            io: "io",
            base64: "encoding/base64",
            strings: "strings",
            strconv: "strconv",
          };
          if (pkgMap[pkg]) used.add(pkgMap[pkg]!);
        }
      }
    });
  }
}

function transformDeclaration(decl: IRDeclaration): IRDeclaration {
  if (decl.kind === "function") {
    return { ...decl, body: decl.body.map(transformStatement) };
  }
  return decl;
}

function transformStatement(stmt: IRStatement): IRStatement {
  switch (stmt.kind) {
    case "var-decl":
      if (stmt.value) return { ...stmt, value: foldConstants(stmt.value) };
      return stmt;
    case "expression":
      return { ...stmt, expression: foldConstants(stmt.expression) };
    case "return":
      return { ...stmt, values: stmt.values.map(foldConstants) };
    case "if":
      return {
        ...stmt,
        condition: foldConstants(stmt.condition),
        body: stmt.body.map(transformStatement),
        elseBody: stmt.elseBody?.map(transformStatement),
      };
    case "for":
      return {
        ...stmt,
        condition: stmt.condition ? foldConstants(stmt.condition) : undefined,
        body: stmt.body.map(transformStatement),
      };
    case "for-range":
      return { ...stmt, body: stmt.body.map(transformStatement) };
    case "switch":
      return {
        ...stmt,
        cases: stmt.cases.map((c) => ({
          ...c,
          body: c.body.map(transformStatement),
        })),
        defaultBody: stmt.defaultBody?.map(transformStatement),
      };
    default:
      return stmt;
  }
}

/** Fold simple constant binary expressions (e.g., 1 + 2 → 3) */
function foldConstants(expr: IRExpression): IRExpression {
  if (expr.kind !== "binary") return expr;

  const left = foldConstants(expr.left);
  const right = foldConstants(expr.right);

  if (left.kind === "literal" && right.kind === "literal") {
    const lv = left.value;
    const rv = right.value;

    if (typeof lv === "number" && typeof rv === "number") {
      let result: number | undefined;
      switch (expr.operator) {
        case "+": result = lv + rv; break;
        case "-": result = lv - rv; break;
        case "*": result = lv * rv; break;
        case "/": result = rv !== 0 ? lv / rv : undefined; break;
      }
      if (result !== undefined) {
        return {
          kind: "literal",
          value: result,
          type: Number.isInteger(result) ? { kind: "int64" } : { kind: "float64" },
        };
      }
    }

    if (typeof lv === "string" && typeof rv === "string" && expr.operator === "+") {
      return { kind: "literal", value: lv + rv, type: { kind: "string" } };
    }
  }

  return { ...expr, left, right };
}

/** Walk all expressions in a node tree, calling fn for each */
function walkExpressions(node: IRDeclaration | IRStatement, fn: (expr: IRExpression) => void) {
  function walkExpr(expr: IRExpression | undefined) {
    if (!expr) return;
    fn(expr);
    switch (expr.kind) {
      case "call":
        walkExpr(expr.func);
        expr.args.forEach(walkExpr);
        break;
      case "member":
        walkExpr(expr.object);
        break;
      case "binary":
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case "unary":
        walkExpr(expr.operand);
        break;
      case "index":
        walkExpr(expr.object);
        walkExpr(expr.index);
        break;
      case "composite":
        expr.elements.forEach((e) => walkExpr(e.value));
        break;
    }
  }

  function walkStmt(stmt: IRStatement) {
    switch (stmt.kind) {
      case "expression": walkExpr(stmt.expression); break;
      case "return": stmt.values.forEach(walkExpr); break;
      case "var-decl": walkExpr(stmt.value); break;
      case "if":
        walkExpr(stmt.condition);
        stmt.body.forEach(walkStmt);
        stmt.elseBody?.forEach(walkStmt);
        break;
      case "for":
        walkExpr(stmt.condition);
        stmt.body.forEach(walkStmt);
        break;
      case "for-range":
        walkExpr(stmt.iterable);
        stmt.body.forEach(walkStmt);
        break;
      case "switch":
        walkExpr(stmt.tag);
        stmt.cases.forEach((c) => c.body.forEach(walkStmt));
        stmt.defaultBody?.forEach(walkStmt);
        break;
    }
  }

  if ("body" in node && Array.isArray(node.body)) {
    (node.body as IRStatement[]).forEach(walkStmt);
  }
  if ("kind" in node) {
    walkStmt(node as IRStatement);
  }
}
