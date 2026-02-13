/**
 * fast-ts Validator
 *
 * Validates TypeScript source for supported feature subset.
 * Rejects unsupported patterns with clear error codes (FTS001-FTS011).
 */

import ts from "typescript";

export interface CompileError {
  code: string;
  message: string;
  suggestion: string;
  file: string;
  line: number;
  column: number;
}

export function validate(filename: string, source: string): CompileError[] {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const errors: CompileError[] = [];

  function pos(node: ts.Node) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return { line: line + 1, column: character + 1 };
  }

  function addError(node: ts.Node, code: string, message: string, suggestion: string) {
    const p = pos(node);
    errors.push({ code, message, suggestion, file: filename, line: p.line, column: p.column });
  }

  function visit(node: ts.Node) {
    // FTS001: `any` type
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      addError(node, "FTS001", "Type 'any' is not supported", "Use a concrete type or 'unknown'");
    }

    // FTS002: eval() / new Function()
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && expr.text === "eval") {
        addError(node, "FTS002", "'eval()' is not supported", "Refactor to avoid dynamic code evaluation");
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Function") {
      addError(node, "FTS002", "'new Function()' is not supported", "Use a regular function declaration");
    }

    // FTS003: Proxy / Reflect
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Proxy") {
      addError(node, "FTS003", "'Proxy' is not supported", "Use plain objects with explicit getters/setters");
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Reflect") {
      addError(node, "FTS003", "'Reflect' is not supported", "Use direct property access instead");
    }

    // FTS006: Class extends (inheritance)
    if (ts.isClassDeclaration(node) && node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          addError(clause, "FTS006", "Class inheritance is not supported", "Use composition or interfaces instead");
        }
      }
    }

    // FTS007: Decorators
    if (ts.isClassDeclaration(node) || ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) {
      const modifiers = ts.getDecorators(node);
      if (modifiers && modifiers.length > 0) {
        for (const dec of modifiers) {
          addError(dec, "FTS007", "Decorators are not supported", "Apply the decorator logic manually");
        }
      }
    }

    // FTS011: require()
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      addError(node, "FTS011", "'require()' is not supported", "Use ES module 'import' syntax instead");
    }

    // FTS004: Symbol
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Symbol") {
      addError(node, "FTS004", "'Symbol' is not supported", "Use string constants for unique keys");
    }

    // FTS005: WeakRef / FinalizationRegistry
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === "WeakRef" || name === "FinalizationRegistry") {
        addError(node, "FTS005", `'${name}' is not supported`, "Go has garbage collection; use standard patterns");
      }
    }

    // FTS008: Generator functions
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.asteriskToken) {
      addError(node, "FTS008", "Generator functions are not supported", "Use arrays or channels pattern instead");
    }

    // FTS009: with statement
    if (node.kind === ts.SyntaxKind.WithStatement) {
      addError(node, "FTS009", "'with' statement is not supported", "Use explicit property access");
    }

    // FTS010: delete operator
    if (ts.isDeleteExpression(node)) {
      addError(node, "FTS010", "'delete' operator is not supported", "Use Map and map.delete() or set to undefined");
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return errors;
}
