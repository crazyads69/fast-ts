/**
 * fast-ts Go Emitter
 *
 * Converts IR (Intermediate Representation) to idiomatic Go source code.
 * Covers: T011, T020, T021, T022, T023
 */

import type {
  IRPackage,
  IRDeclaration,
  IRStatement,
  IRExpression,
  IRType,
  IRFunctionDecl,
  IRStructDecl,
  IRVarDecl,
  IRConstDecl,
  IRTypeAliasDecl,
} from "./types.js";

/**
 * Emit Go source code from an IR package.
 */
export function emit(pkg: IRPackage): string {
  const lines: string[] = [];

  // Package declaration
  lines.push(`package ${pkg.name}`);
  lines.push("");

  // Imports
  if (pkg.imports.length > 0) {
    lines.push("import (");
    for (const imp of pkg.imports) {
      if (imp.alias) {
        lines.push(`\t${imp.alias} "${imp.path}"`);
      } else {
        lines.push(`\t"${imp.path}"`);
      }
    }
    lines.push(")");
    lines.push("");
  }

  // Declarations
  for (const decl of pkg.declarations) {
    lines.push(emitDeclaration(decl));
    lines.push("");
  }

  // main function
  if (pkg.mainBody) {
    lines.push("func main() {");
    for (const stmt of pkg.mainBody) {
      lines.push(indent(emitStatement(stmt), 1));
    }
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// --- Declarations ---

function emitDeclaration(decl: IRDeclaration): string {
  switch (decl.kind) {
    case "function":
      return emitFunction(decl);
    case "struct":
      return emitStruct(decl);
    case "var":
      return emitVarDecl(decl);
    case "const":
      return emitConstDecl(decl);
    case "type-alias":
      return emitTypeAlias(decl);
  }
}

function emitFunction(fn: IRFunctionDecl): string {
  const params = fn.params.map((p) => `${p.name} ${emitType(p.type)}`).join(", ");
  const nonVoidReturns = fn.returns.filter((r) => r.kind !== "void");
  const returnType = nonVoidReturns.length > 0
    ? nonVoidReturns.length === 1
      ? ` ${emitType(nonVoidReturns[0]!)}`
      : ` (${nonVoidReturns.map((r) => emitType(r)).join(", ")})`
    : "";

  const receiver = fn.receiver
    ? `(${fn.receiver.name} ${emitType(fn.receiver.type)}) `
    : "";

  const lines: string[] = [];
  lines.push(`func ${receiver}${fn.name}(${params})${returnType} {`);
  for (const stmt of fn.body) {
    lines.push(indent(emitStatement(stmt), 1));
  }
  lines.push("}");
  return lines.join("\n");
}

function emitStruct(s: IRStructDecl): string {
  const lines: string[] = [];
  lines.push(`type ${s.name} struct {`);

  // Calculate field alignment padding
  const maxNameLen = Math.max(...s.fields.map((f) => f.name.length), 0);
  const maxTypeLen = Math.max(...s.fields.map((f) => emitType(f.type).length), 0);

  for (const field of s.fields) {
    const nameStr = field.name.padEnd(maxNameLen);
    const typeStr = emitType(field.type).padEnd(maxTypeLen);
    let tag = "";
    if (field.jsonTag) {
      const omit = field.omitEmpty ? ",omitempty" : "";
      tag = ` \`json:"${field.jsonTag}${omit}"\``;
    }
    lines.push(`\t${nameStr} ${typeStr}${tag}`);
  }
  lines.push("}");
  return lines.join("\n");
}

function emitVarDecl(v: IRVarDecl): string {
  if (v.type && v.value) {
    return `var ${v.name} ${emitType(v.type)} = ${emitExpr(v.value)}`;
  }
  if (v.type) {
    return `var ${v.name} ${emitType(v.type)}`;
  }
  if (v.value) {
    return `var ${v.name} = ${emitExpr(v.value)}`;
  }
  return `var ${v.name}`;
}

function emitConstDecl(c: IRConstDecl): string {
  if (c.type) {
    return `const ${c.name} ${emitType(c.type)} = ${emitExpr(c.value)}`;
  }
  return `const ${c.name} = ${emitExpr(c.value)}`;
}

function emitTypeAlias(ta: IRTypeAliasDecl): string {
  return `type ${ta.name} = ${emitType(ta.type)}`;
}

// --- Statements ---

function emitStatement(stmt: IRStatement): string {
  switch (stmt.kind) {
    case "expression":
      return emitExpr(stmt.expression);
    case "return":
      if (stmt.values.length === 0) return "return";
      return `return ${stmt.values.map((v) => emitExpr(v)).join(", ")}`;
    case "var-decl":
      if (stmt.shortDecl && stmt.value) {
        // Handle multi-return assignment (data, _ := ...)
        return `${stmt.name} := ${emitExpr(stmt.value)}`;
      }
      if (stmt.type && stmt.value) {
        return `var ${stmt.name} ${emitType(stmt.type)} = ${emitExpr(stmt.value)}`;
      }
      if (stmt.type) {
        return `var ${stmt.name} ${emitType(stmt.type)}`;
      }
      if (stmt.value) {
        return `${stmt.name} := ${emitExpr(stmt.value)}`;
      }
      return `var ${stmt.name}`;
    case "assign":
      return `${emitExpr(stmt.target)} = ${emitExpr(stmt.value)}`;
    case "if": {
      const lines: string[] = [];
      lines.push(`if ${emitExpr(stmt.condition)} {`);
      for (const s of stmt.body) {
        lines.push(indent(emitStatement(s), 1));
      }
      if (stmt.elseBody) {
        lines.push("} else {");
        for (const s of stmt.elseBody) {
          lines.push(indent(emitStatement(s), 1));
        }
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "for": {
      const parts: string[] = [];
      parts.push(stmt.init ? emitStatement(stmt.init) : "");
      parts.push(stmt.condition ? emitExpr(stmt.condition) : "");
      parts.push(stmt.post ? emitStatement(stmt.post) : "");
      const lines: string[] = [];
      lines.push(`for ${parts.join("; ")} {`);
      for (const s of stmt.body) {
        lines.push(indent(emitStatement(s), 1));
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "for-range": {
      const lines: string[] = [];
      lines.push(`for ${stmt.key}, ${stmt.value} := range ${emitExpr(stmt.iterable)} {`);
      for (const s of stmt.body) {
        lines.push(indent(emitStatement(s), 1));
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "switch": {
      const lines: string[] = [];
      lines.push(stmt.tag ? `switch ${emitExpr(stmt.tag)} {` : "switch {");
      for (const c of stmt.cases) {
        const vals = c.values.map((v) => emitExpr(v)).join(", ");
        lines.push(`case ${vals}:`);
        for (const s of c.body) {
          lines.push(indent(emitStatement(s), 1));
        }
      }
      if (stmt.defaultBody) {
        lines.push("default:");
        for (const s of stmt.defaultBody) {
          lines.push(indent(emitStatement(s), 1));
        }
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "block": {
      const lines: string[] = [];
      lines.push("{");
      for (const s of stmt.body) {
        lines.push(indent(emitStatement(s), 1));
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "postfix":
      return `${emitExpr(stmt.operand)}${stmt.operator}`;
    case "error-check": {
      const lines: string[] = [];
      const names = stmt.resultNames.join(", ");
      lines.push(`${names} := ${emitExpr(stmt.call)}`);
      lines.push("if err != nil {");
      for (const s of stmt.errorBody) {
        lines.push(indent(emitStatement(s), 1));
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "defer":
      return `defer ${emitExpr(stmt.expression)}`;
  }
}

// --- Expressions ---

function emitExpr(expr: IRExpression): string {
  switch (expr.kind) {
    case "identifier":
      return expr.name;
    case "literal":
      if (expr.value === null) return "nil";
      if (typeof expr.value === "string") return `"${escapeGoString(expr.value)}"`;
      if (typeof expr.value === "boolean") return expr.value ? "true" : "false";
      return String(expr.value);
    case "call": {
      const fn = emitExpr(expr.func);
      const args = expr.args.map((a) => emitExpr(a)).join(", ");
      return `${fn}(${args})`;
    }
    case "member":
      if (expr.property === "length") {
        return `len(${emitExpr(expr.object)})`;
      }
      return `${emitExpr(expr.object)}.${expr.property}`;
    case "binary":
      return `${emitExpr(expr.left)} ${expr.operator} ${emitExpr(expr.right)}`;
    case "unary":
      if (expr.operator === "++" || expr.operator === "--") {
        return `${emitExpr(expr.operand)}${expr.operator}`;
      }
      return `${expr.operator}${emitExpr(expr.operand)}`;
    case "index":
      return `${emitExpr(expr.object)}[${emitExpr(expr.index)}]`;
    case "composite": {
      const typeName = emitType(expr.type);
      if (expr.elements.length === 0) return `${typeName}{}`;
      // Compute max "key: value" key length for Go-style alignment
      const maxKeyLen = Math.max(
        ...expr.elements.map((e) => (e.key ? e.key.length : 0)),
        0,
      );
      const entries = expr.elements.map((e) => {
        if (e.key) {
          // Go convention: `Name:   "Alice"` — pad after colon with spaces
          const padding = " ".repeat(maxKeyLen - e.key.length + 1);
          return `${e.key}:${padding}${emitExpr(e.value)}`;
        }
        return emitExpr(e.value);
      });
      // Inline for short composites, multi-line otherwise
      if (entries.length <= 2 && entries.every((e) => e.length < 30)) {
        return `${typeName}{${entries.join(", ")}}`;
      }
      const lines: string[] = [];
      lines.push(`${typeName}{`);
      for (const entry of entries) {
        lines.push(`\t${entry},`);
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "func-lit": {
      const params = expr.params.map((p) => `${p.name} ${emitType(p.type)}`).join(", ");
      const returnType = expr.returns.length > 0
        ? ` ${expr.returns.map((r) => emitType(r)).join(", ")}`
        : "";
      const lines: string[] = [];
      lines.push(`func(${params})${returnType} {`);
      for (const stmt of expr.body) {
        lines.push(indent(emitStatement(stmt), 1));
      }
      lines.push("}");
      return lines.join("\n");
    }
    case "type-assert":
      return `${emitExpr(expr.expression)}.(${emitType(expr.assertType)})`;
  }
}

// --- Types ---

function emitType(type: IRType): string {
  switch (type.kind) {
    case "string": return "string";
    case "int64": return "int64";
    case "float64": return "float64";
    case "bool": return "bool";
    case "void": return "";
    case "error": return "error";
    case "interface": return "interface{}";
    case "slice": return `[]${emitType(type.elementType)}`;
    case "map": return `map[${emitType(type.keyType)}]${emitType(type.valueType)}`;
    case "pointer": return `*${emitType(type.elementType)}`;
    case "named": return type.name;
    case "struct": {
      if (type.fields.length === 0) return "struct{}";
      const fields = type.fields.map((f) => `${f.name} ${emitType(f.type)}`).join("; ");
      return `struct{ ${fields} }`;
    }
    case "func": {
      const params = type.params.map((p) => `${p.name} ${emitType(p.type)}`).join(", ");
      const rets = type.returns.length === 1
        ? ` ${emitType(type.returns[0]!)}`
        : type.returns.length > 1
          ? ` (${type.returns.map((r) => emitType(r)).join(", ")})`
          : "";
      return `func(${params})${rets}`;
    }
  }
}

// --- Helpers ---

function indent(s: string, level: number): string {
  const tabs = "\t".repeat(level);
  return s.split("\n").map((line) => `${tabs}${line}`).join("\n");
}

function escapeGoString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}
