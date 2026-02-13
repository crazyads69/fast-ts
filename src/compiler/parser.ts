/**
 * fast-ts Parser
 *
 * Parses TypeScript source files using the TypeScript Compiler API
 * and produces IR (Intermediate Representation) nodes.
 *
 * Covers: T010, T020, T021, T022, T023
 */

import * as ts from "typescript";
import type {
  IRPackage,
  IRImport,
  IRDeclaration,
  IRStatement,
  IRExpression,
  IRType,
  IRField,
  IRParam,
  IRFunctionDecl,
  IRStructDecl,
  IRVarDecl,
  IRConstDecl,
  IRTypeAliasDecl,
  IRSwitchStmt,
} from "./types.js";
import { mapTSTypeToGo } from "./type-map.js";

export interface ParseResult {
  package: IRPackage;
  errors: ParseError[];
}

export interface ParseError {
  code: string;
  message: string;
  file: string;
  line: number;
  column: number;
}

/**
 * Parse a TypeScript source file into an IR package.
 */
export function parse(filename: string, source: string): ParseResult {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

  const errors: ParseError[] = [];
  const imports = new Set<string>();
  const declarations: IRDeclaration[] = [];
  let mainBody: IRStatement[] | undefined;

  // Walk top-level statements
  for (const stmt of sourceFile.statements) {
    // export default { fetch(request: Request): Response { ... } }
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const expr = stmt.expression;
      if (ts.isObjectLiteralExpression(expr)) {
        const result = parseWinterTCEntryPoint(expr, sourceFile, imports, errors);
        if (result) {
          declarations.push(result.handler);
          mainBody = result.mainBody;
        }
      }
      continue;
    }

    // interface Foo { ... }
    if (ts.isInterfaceDeclaration(stmt)) {
      declarations.push(parseInterface(stmt, sourceFile));
      continue;
    }

    // type Foo = ...
    if (ts.isTypeAliasDeclaration(stmt)) {
      declarations.push(parseTypeAlias(stmt, sourceFile));
      continue;
    }

    // const / let / var declarations
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const parsed = parseVariableDecl(decl, stmt.declarationList, sourceFile, imports);
        declarations.push(parsed);
      }
      continue;
    }

    // function foo() { ... }
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      declarations.push(parseFunctionDecl(stmt, sourceFile, imports));
      continue;
    }
  }

  // Build import list
  const irImports: IRImport[] = Array.from(imports).sort().map((path) => ({ path }));

  return {
    package: {
      name: "main",
      imports: irImports,
      declarations,
      mainBody,
    },
    errors,
  };
}

// --- WinterTC Entry Point ---

function parseWinterTCEntryPoint(
  obj: ts.ObjectLiteralExpression,
  sf: ts.SourceFile,
  imports: Set<string>,
  _errors: ParseError[],
): { handler: IRFunctionDecl; mainBody: IRStatement[] } | null {
  for (const prop of obj.properties) {
    if (ts.isMethodDeclaration(prop) && prop.name && ts.isIdentifier(prop.name) && prop.name.text === "fetch") {
      imports.add("net/http");
      imports.add("log");

      const body = prop.body ? parseBlock(prop.body, sf, imports) : [];

      const handler: IRFunctionDecl = {
        kind: "function",
        name: "handler",
        params: [
          { name: "w", type: { kind: "named", name: "http.ResponseWriter" } },
          { name: "r", type: { kind: "pointer", elementType: { kind: "named", name: "http.Request" } } },
        ],
        returns: [],
        body,
      };

      const mainBody: IRStatement[] = [
        {
          kind: "expression",
          expression: {
            kind: "call",
            func: { kind: "identifier", name: "http.HandleFunc" },
            args: [
              { kind: "literal", value: "/", type: { kind: "string" } },
              { kind: "identifier", name: "handler" },
            ],
          },
        },
        {
          kind: "expression",
          expression: {
            kind: "call",
            func: { kind: "identifier", name: "log.Println" },
            args: [
              { kind: "literal", value: "fast-ts server listening on :8080", type: { kind: "string" } },
            ],
          },
        },
        {
          kind: "expression",
          expression: {
            kind: "call",
            func: { kind: "identifier", name: "log.Fatal" },
            args: [
              {
                kind: "call",
                func: { kind: "identifier", name: "http.ListenAndServe" },
                args: [
                  { kind: "literal", value: ":8080", type: { kind: "string" } },
                  { kind: "identifier", name: "nil" },
                ],
              },
            ],
          },
        },
      ];

      return { handler, mainBody };
    }
  }
  return null;
}

// --- Block / Statements ---

function parseBlock(block: ts.Block, sf: ts.SourceFile, imports: Set<string>): IRStatement[] {
  const stmts: IRStatement[] = [];
  for (const s of block.statements) {
    stmts.push(...parseStatement(s, sf, imports));
  }
  return stmts;
}

function parseStatement(node: ts.Statement, sf: ts.SourceFile, imports: Set<string>): IRStatement[] {
  // return ...
  if (ts.isReturnStatement(node)) {
    return parseReturnStatement(node, sf, imports);
  }

  // variable declarations (inside function bodies)
  if (ts.isVariableStatement(node)) {
    const results: IRStatement[] = [];
    for (const decl of node.declarationList.declarations) {
      const name = decl.name.getText(sf);
      let type: IRType | undefined;
      if (decl.type) {
        type = resolveTypeNode(decl.type, sf);
      }
      let init = decl.initializer ? parseExpression(decl.initializer, sf, imports) : undefined;
      // If variable has a named type and initializer is an object literal, attach the type
      if (init && init.kind === "composite" && type && type.kind === "named") {
        init = { ...init, type };
      }
      results.push({
        kind: "var-decl",
        name,
        type,
        value: init,
        shortDecl: true,
      });
    }
    return results;
  }

  // expression statement
  if (ts.isExpressionStatement(node)) {
    return [{
      kind: "expression",
      expression: parseExpression(node.expression, sf, imports),
    }];
  }

  // if statement
  if (ts.isIfStatement(node)) {
    const condition = parseExpression(node.expression, sf, imports);
    const body = ts.isBlock(node.thenStatement)
      ? parseBlock(node.thenStatement, sf, imports)
      : parseStatement(node.thenStatement as ts.Statement, sf, imports);
    let elseBody: IRStatement[] | undefined;
    if (node.elseStatement) {
      elseBody = ts.isBlock(node.elseStatement)
        ? parseBlock(node.elseStatement, sf, imports)
        : parseStatement(node.elseStatement as ts.Statement, sf, imports);
    }
    return [{ kind: "if", condition, body, elseBody }];
  }

  // for statement
  if (ts.isForStatement(node)) {
    const body = ts.isBlock(node.statement)
      ? parseBlock(node.statement, sf, imports)
      : parseStatement(node.statement as ts.Statement, sf, imports);
    return [{
      kind: "for",
      init: node.initializer ? parseForInitializer(node.initializer, sf, imports) : undefined,
      condition: node.condition ? parseExpression(node.condition, sf, imports) : undefined,
      post: node.incrementor ? { kind: "expression" as const, expression: parseExpression(node.incrementor, sf, imports) } : undefined,
      body,
    }];
  }

  // for...of
  if (ts.isForOfStatement(node)) {
    const iterable = parseExpression(node.expression, sf, imports);
    const body = ts.isBlock(node.statement)
      ? parseBlock(node.statement, sf, imports)
      : parseStatement(node.statement as ts.Statement, sf, imports);
    let key = "_";
    let value = "_";
    if (ts.isVariableDeclarationList(node.initializer)) {
      const decl = node.initializer.declarations[0];
      if (decl) {
        value = decl.name.getText(sf);
      }
    }
    return [{ kind: "for-range", key, value, iterable, body }];
  }

  // switch statement
  if (ts.isSwitchStatement(node)) {
    return [parseSwitchStatement(node, sf, imports)];
  }

  // try/catch → Go error check pattern
  if (ts.isTryStatement(node)) {
    return parseTryStatement(node, sf, imports);
  }

  return [];
}

function parseForInitializer(init: ts.ForInitializer, sf: ts.SourceFile, imports: Set<string>): IRStatement | undefined {
  if (ts.isVariableDeclarationList(init)) {
    const decl = init.declarations[0];
    if (decl) {
      const name = decl.name.getText(sf);
      const value = decl.initializer ? parseExpression(decl.initializer, sf, imports) : undefined;
      return { kind: "var-decl", name, value, shortDecl: true };
    }
  }
  return undefined;
}

// --- Switch Statement ---

function parseSwitchStatement(node: ts.SwitchStatement, sf: ts.SourceFile, imports: Set<string>): IRSwitchStmt {
  const tag = parseExpression(node.expression, sf, imports);
  const cases: { values: IRExpression[]; body: IRStatement[] }[] = [];
  let defaultBody: IRStatement[] | undefined;

  for (const clause of node.caseBlock.clauses) {
    if (ts.isCaseClause(clause)) {
      const values = [parseExpression(clause.expression, sf, imports)];
      const body: IRStatement[] = [];
      for (const s of clause.statements) {
        // Skip break statements — Go switch doesn't need them
        if (ts.isBreakStatement(s)) continue;
        body.push(...parseStatement(s, sf, imports));
      }
      cases.push({ values, body });
    } else {
      // DefaultClause
      defaultBody = [];
      for (const s of clause.statements) {
        if (ts.isBreakStatement(s)) continue;
        defaultBody.push(...parseStatement(s, sf, imports));
      }
    }
  }

  return { kind: "switch", tag, cases, defaultBody };
}

// --- Try/Catch → Go error pattern ---

function parseTryStatement(node: ts.TryStatement, sf: ts.SourceFile, imports: Set<string>): IRStatement[] {
  // Strategy: pull statements from try block,
  // and for any call that might error, wrap in if err != nil { catchBody }
  const tryBody = parseBlock(node.tryBlock, sf, imports);
  const catchBody = node.catchClause?.block
    ? parseBlock(node.catchClause.block, sf, imports)
    : [];

  // Simple approach: emit try body statements, then wrap error-prone calls
  // For now, just inline the try body and add the catch as a comment-like fallback
  // More sophisticated: detect json.Unmarshal, http calls, etc.
  const result: IRStatement[] = [];

  for (const stmt of tryBody) {
    result.push(stmt);
  }

  // If catch has a return, emit as error check on the last var-decl that might error
  if (catchBody.length > 0 && tryBody.length > 0) {
    // Find any var-decl with a call that returns errors (json.Marshal, json.Unmarshal, etc.)
    const lastVarDecl = [...tryBody].reverse().find((s: IRStatement) => s.kind === "var-decl" && s.value?.kind === "call");
    if (lastVarDecl && lastVarDecl.kind === "var-decl") {
      // Rewrite: data, err := call(...) + if err != nil { catchBody }
      const idx = result.indexOf(lastVarDecl);
      if (idx >= 0) {
        result[idx] = {
          kind: "var-decl",
          name: `${lastVarDecl.name}, err`,
          shortDecl: true,
          value: lastVarDecl.value,
        };
        result.splice(idx + 1, 0, {
          kind: "if",
          condition: {
            kind: "binary",
            operator: "!=",
            left: { kind: "identifier", name: "err" },
            right: { kind: "identifier", name: "nil" },
          },
          body: catchBody,
        });
      }
    }
  }

  return result;
}

// --- Return Statement (WinterTC Response handling) ---

function parseReturnStatement(node: ts.ReturnStatement, sf: ts.SourceFile, imports: Set<string>): IRStatement[] {
  if (!node.expression) {
    return [{ kind: "return", values: [] }];
  }

  // return new Response("body") → w.Write([]byte("body"))
  if (ts.isNewExpression(node.expression)) {
    const expr = node.expression;
    if (ts.isIdentifier(expr.expression) && expr.expression.text === "Response") {
      return parseResponseConstruction(expr, sf, imports);
    }
  }

  // Generic return
  return [{ kind: "return", values: [parseExpression(node.expression, sf, imports)] }];
}

function parseResponseConstruction(expr: ts.NewExpression, sf: ts.SourceFile, imports: Set<string>): IRStatement[] {
  const stmts: IRStatement[] = [];
  const args = expr.arguments ?? [];

  // Second arg: options { status: N, headers: {...} }
  if (args.length >= 2 && ts.isObjectLiteralExpression(args[1]!)) {
    const opts = args[1] as ts.ObjectLiteralExpression;
    for (const prop of opts.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        if (prop.name.text === "status") {
          stmts.push({
            kind: "expression",
            expression: {
              kind: "call",
              func: { kind: "member", object: { kind: "identifier", name: "w" }, property: "WriteHeader" },
              args: [parseExpression(prop.initializer, sf, imports)],
            },
          });
        }
        if (prop.name.text === "headers") {
          if (ts.isObjectLiteralExpression(prop.initializer)) {
            for (const hdr of prop.initializer.properties) {
              if (ts.isPropertyAssignment(hdr) && ts.isStringLiteral(hdr.name)) {
                stmts.push({
                  kind: "expression",
                  expression: {
                    kind: "call",
                    func: {
                      kind: "member",
                      object: {
                        kind: "call",
                        func: { kind: "member", object: { kind: "identifier", name: "w" }, property: "Header" },
                        args: [],
                      },
                      property: "Set",
                    },
                    args: [
                      { kind: "literal", value: hdr.name.text, type: { kind: "string" } },
                      parseExpression(hdr.initializer, sf, imports),
                    ],
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  // First arg: body
  if (args.length >= 1) {
    const bodyArg = args[0]!;

    // Check for JSON.stringify(x) → json.NewEncoder(w).Encode(x)
    if (ts.isCallExpression(bodyArg)
        && ts.isPropertyAccessExpression(bodyArg.expression)
        && ts.isIdentifier(bodyArg.expression.expression)
        && bodyArg.expression.expression.text === "JSON"
        && bodyArg.expression.name.text === "stringify") {
      imports.add("encoding/json");
      const jsonArg = bodyArg.arguments[0];
      if (jsonArg) {
        // data, _ := json.Marshal(x)
        stmts.push({
          kind: "var-decl",
          name: "data, _",
          shortDecl: true,
          value: {
            kind: "call",
            func: { kind: "identifier", name: "json.Marshal" },
            args: [parseExpression(jsonArg, sf, imports)],
          },
        });
        // Use a blank identifier for the error — emitter handles this via multi-return
        stmts.push({
          kind: "expression",
          expression: {
            kind: "call",
            func: { kind: "member", object: { kind: "identifier", name: "w" }, property: "Write" },
            args: [{ kind: "identifier", name: "data" }],
          },
        });
      }
    } else {
      // w.Write([]byte("body"))
      stmts.push({
        kind: "expression",
        expression: {
          kind: "call",
          func: { kind: "member", object: { kind: "identifier", name: "w" }, property: "Write" },
          args: [
            {
              kind: "call",
              func: { kind: "identifier", name: "[]byte" },
              args: [parseExpression(bodyArg, sf, imports)],
            },
          ],
        },
      });
    }
  }

  return stmts;
}

// --- Expressions ---

function parseExpression(node: ts.Node, sf: ts.SourceFile, imports: Set<string>): IRExpression {
  // String literal
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { kind: "literal", value: (node as ts.StringLiteral).text, type: { kind: "string" } };
  }

  // Numeric literal
  if (ts.isNumericLiteral(node)) {
    const val = Number(node.text);
    return { kind: "literal", value: val, type: Number.isInteger(val) ? { kind: "int64" } : { kind: "float64" } };
  }

  // Boolean
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return { kind: "literal", value: true, type: { kind: "bool" } };
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return { kind: "literal", value: false, type: { kind: "bool" } };
  }

  // null / undefined
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return { kind: "identifier", name: "nil" };
  }
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    return { kind: "identifier", name: "nil" };
  }

  // Identifier
  if (ts.isIdentifier(node)) {
    return { kind: "identifier", name: node.text };
  }

  // Template literal → fmt.Sprintf
  if (ts.isTemplateExpression(node)) {
    imports.add("fmt");
    const parts: string[] = [node.head.text];
    const exprArgs: IRExpression[] = [];
    for (const span of node.templateSpans) {
      parts.push(span.literal.text);
      exprArgs.push(parseExpression(span.expression, sf, imports));
    }
    const formatStr = parts.join("%v");
    return {
      kind: "call",
      func: { kind: "identifier", name: "fmt.Sprintf" },
      args: [
        { kind: "literal", value: formatStr, type: { kind: "string" } },
        ...exprArgs,
      ],
    };
  }

  // Property access: obj.prop
  if (ts.isPropertyAccessExpression(node)) {
    const obj = node.expression;
    const prop = node.name.text;

    // WinterTC Request property mapping: request.xyz → r.XYZ
    if (ts.isIdentifier(obj) && obj.text === "request") {
      switch (prop) {
        case "url":
          // request.url → r.URL.String()
          return {
            kind: "call",
            func: { kind: "member", object: { kind: "member", object: { kind: "identifier", name: "r" }, property: "URL" }, property: "String" },
            args: [],
          };
        case "method":
          return { kind: "member", object: { kind: "identifier", name: "r" }, property: "Method" };
        case "headers":
          return { kind: "member", object: { kind: "identifier", name: "r" }, property: "Header" };
        case "body":
          return { kind: "member", object: { kind: "identifier", name: "r" }, property: "Body" };
      }
    }

    return {
      kind: "member",
      object: parseExpression(obj, sf, imports),
      property: prop,
    };
  }

  // Call expression
  if (ts.isCallExpression(node)) {
    // console.log(...) → log.Println(...)
    if (ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === "console") {
      imports.add("log");
      const args = node.arguments.map((a) => parseExpression(a, sf, imports));
      return {
        kind: "call",
        func: { kind: "identifier", name: "log.Println" },
        args,
      };
    }

    // request.headers.get("key") → r.Header.Get("key")
    if (ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "get"
        && ts.isPropertyAccessExpression(node.expression.expression)
        && ts.isIdentifier(node.expression.expression.expression)
        && node.expression.expression.expression.text === "request"
        && node.expression.expression.name.text === "headers") {
      const args = node.arguments.map((a) => parseExpression(a, sf, imports));
      return {
        kind: "call",
        func: {
          kind: "member",
          object: { kind: "member", object: { kind: "identifier", name: "r" }, property: "Header" },
          property: "Get",
        },
        args,
      };
    }

    // url.searchParams.get("key") → parsed url Query().Get("key")
    if (ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "get"
        && ts.isPropertyAccessExpression(node.expression.expression)
        && node.expression.expression.name.text === "searchParams") {
      const urlObj = parseExpression(node.expression.expression.expression, sf, imports);
      const args = node.arguments.map((a) => parseExpression(a, sf, imports));
      return {
        kind: "call",
        func: {
          kind: "member",
          object: {
            kind: "call",
            func: { kind: "member", object: urlObj, property: "Query" },
            args: [],
          },
          property: "Get",
        },
        args,
      };
    }

    // JSON.parse(str) → json.Unmarshal([]byte(str), &target)
    if (ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === "JSON"
        && node.expression.name.text === "parse") {
      imports.add("encoding/json");
      const args = node.arguments.map((a) => parseExpression(a, sf, imports));
      return {
        kind: "call",
        func: { kind: "identifier", name: "json.Unmarshal" },
        args: [
          { kind: "call", func: { kind: "identifier", name: "[]byte" }, args },
        ],
      };
    }

    // JSON.stringify(x) → json.Marshal(x)  (outside of Response context)
    if (ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === "JSON"
        && node.expression.name.text === "stringify") {
      imports.add("encoding/json");
      const args = node.arguments.map((a) => parseExpression(a, sf, imports));
      return {
        kind: "call",
        func: { kind: "identifier", name: "json.Marshal" },
        args,
      };
    }

    return {
      kind: "call",
      func: parseExpression(node.expression, sf, imports),
      args: node.arguments.map((a) => parseExpression(a, sf, imports)),
    };
  }

  // Binary expression
  if (ts.isBinaryExpression(node)) {
    let op = node.operatorToken.getText(sf);
    // === → ==, !== → !=
    if (op === "===") op = "==";
    if (op === "!==") op = "!=";
    return {
      kind: "binary",
      operator: op,
      left: parseExpression(node.left, sf, imports),
      right: parseExpression(node.right, sf, imports),
    };
  }

  // Prefix unary
  if (ts.isPrefixUnaryExpression(node)) {
    let op = "";
    switch (node.operator) {
      case ts.SyntaxKind.ExclamationToken: op = "!"; break;
      case ts.SyntaxKind.MinusToken: op = "-"; break;
      case ts.SyntaxKind.PlusToken: op = "+"; break;
      case ts.SyntaxKind.PlusPlusToken: op = "++"; break;
      case ts.SyntaxKind.MinusMinusToken: op = "--"; break;
    }
    return { kind: "unary", operator: op, operand: parseExpression(node.operand, sf, imports) };
  }

  // Postfix unary (i++, i--)
  if (ts.isPostfixUnaryExpression(node)) {
    const op = node.operator === ts.SyntaxKind.PlusPlusToken ? "++" : "--";
    return { kind: "unary", operator: op, operand: parseExpression(node.operand, sf, imports) };
  }

  // `as` type assertion → Go type assertion
  if (ts.isAsExpression(node)) {
    return {
      kind: "type-assert",
      expression: parseExpression(node.expression, sf, imports),
      assertType: resolveTypeNode(node.type, sf),
    };
  }

  // Conditional (ternary) expression: a ? b : c
  // Go has no ternary — lower to a helper call pattern
  if (ts.isConditionalExpression(node)) {
    const cond = parseExpression(node.condition, sf, imports);
    const whenTrue = parseExpression(node.whenTrue, sf, imports);
    const whenFalse = parseExpression(node.whenFalse, sf, imports);
    // Emit as an immediately-invoked func literal that contains an if
    return {
      kind: "call",
      func: {
        kind: "func-lit",
        params: [],
        returns: [],
        body: [
          {
            kind: "if",
            condition: cond,
            body: [{ kind: "return", values: [whenTrue] }],
            elseBody: [{ kind: "return", values: [whenFalse] }],
          },
        ],
      },
      args: [],
    };
  }

  // Await expression — strip await (Go is synchronous)
  if (ts.isAwaitExpression(node)) {
    return parseExpression(node.expression, sf, imports);
  }

  // Parenthesized expression — unwrap
  if (ts.isParenthesizedExpression(node)) {
    return parseExpression(node.expression, sf, imports);
  }

  // new Expression (non-Response)
  if (ts.isNewExpression(node)) {
    const name = node.expression.getText(sf);
    // new URL(str) → url.Parse(str)
    if (name === "URL") {
      imports.add("net/url");
      const args = (node.arguments ?? []).map((a) => parseExpression(a, sf, imports));
      return { kind: "call", func: { kind: "identifier", name: "url.Parse" }, args };
    }
    // Fallback: treat as function call
    const args = (node.arguments ?? []).map((a) => parseExpression(a, sf, imports));
    return { kind: "call", func: { kind: "identifier", name }, args };
  }

  // Array literal → slice
  if (ts.isArrayLiteralExpression(node)) {
    const elements = node.elements.map((e) => ({
      value: parseExpression(e, sf, imports),
    }));

    // Infer element type from first element
    let elemType: IRType = { kind: "interface" };
    if (elements.length > 0) {
      const first = node.elements[0]!;
      if (ts.isStringLiteral(first)) elemType = { kind: "string" };
      else if (ts.isNumericLiteral(first)) elemType = { kind: "float64" };
      else if (first.kind === ts.SyntaxKind.TrueKeyword || first.kind === ts.SyntaxKind.FalseKeyword) elemType = { kind: "bool" };
    }

    return {
      kind: "composite",
      type: { kind: "slice", elementType: elemType },
      elements,
    };
  }

  // Object literal → struct composite literal
  if (ts.isObjectLiteralExpression(node)) {
    const elements: { key?: string; value: IRExpression }[] = [];
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        elements.push({
          key: capitalize(prop.name.text),
          value: parseExpression(prop.initializer, sf, imports),
        });
      }
    }
    return {
      kind: "composite",
      type: { kind: "struct", fields: [] },
      elements,
    };
  }

  // Element access: arr[i]
  if (ts.isElementAccessExpression(node)) {
    return {
      kind: "index",
      object: parseExpression(node.expression, sf, imports),
      index: parseExpression(node.argumentExpression, sf, imports),
    };
  }

  // Arrow function / function expression
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const params: IRParam[] = node.parameters.map((p) => ({
      name: p.name.getText(sf),
      type: p.type ? resolveTypeNode(p.type, sf) : { kind: "interface" as const },
    }));
    const returns: IRType[] = node.type ? [resolveTypeNode(node.type, sf)] : [];
    let body: IRStatement[] = [];
    if (node.body) {
      if (ts.isBlock(node.body)) {
        body = parseBlock(node.body, sf, imports);
      } else {
        // Concise arrow: expr => return expr
        body = [{ kind: "return", values: [parseExpression(node.body, sf, imports)] }];
      }
    }
    return { kind: "func-lit", params, returns, body };
  }

  // Fallback: use raw text as identifier
  return { kind: "identifier", name: node.getText(sf) };
}

// --- Interface Declaration ---

function parseInterface(node: ts.InterfaceDeclaration, sf: ts.SourceFile): IRStructDecl {
  const fields: IRField[] = [];
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
      const name = member.name.text;
      const type = member.type ? resolveTypeNode(member.type, sf) : { kind: "interface" as const };
      const optional = member.questionToken !== undefined;
      fields.push({
        name: capitalize(name),
        type,
        jsonTag: name,
        omitEmpty: optional,
      });
    }
  }
  return { kind: "struct", name: node.name.text, fields };
}

// --- Type Alias Declaration ---

function parseTypeAlias(node: ts.TypeAliasDeclaration, sf: ts.SourceFile): IRTypeAliasDecl {
  return {
    kind: "type-alias",
    name: node.name.text,
    type: resolveTypeNode(node.type, sf),
  };
}

// --- Variable Declaration ---

function parseVariableDecl(
  decl: ts.VariableDeclaration,
  list: ts.VariableDeclarationList,
  sf: ts.SourceFile,
  imports: Set<string>,
): IRVarDecl | IRConstDecl {
  const name = decl.name.getText(sf);
  const isConst = (list.flags & ts.NodeFlags.Const) !== 0;
  let type: IRType | undefined;
  if (decl.type) {
    type = resolveTypeNode(decl.type, sf);
  }
  const value = decl.initializer ? parseExpression(decl.initializer, sf, imports) : undefined;

  if (isConst) {
    return { kind: "const", name, type, value: value ?? { kind: "identifier", name: "nil" } };
  }
  return { kind: "var", name, type, value };
}

// --- Function Declaration ---

function parseFunctionDecl(node: ts.FunctionDeclaration, sf: ts.SourceFile, imports: Set<string>): IRFunctionDecl {
  const name = capitalize(node.name!.text);
  const params: IRParam[] = node.parameters.map((p) => ({
    name: p.name.getText(sf),
    type: p.type ? resolveTypeNode(p.type, sf) : { kind: "interface" as const },
  }));
  let returns: IRType[] = node.type ? [resolveTypeNode(node.type, sf)] : [];
  // Filter out void returns
  returns = returns.filter((t) => t.kind !== "void");
  // Async functions: add error as second return value (T052)
  const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  if (isAsync && returns.length > 0 && !returns.some((t) => t.kind === "error")) {
    returns.push({ kind: "error" });
  }
  const body = node.body ? parseBlock(node.body, sf, imports) : [];
  return { kind: "function", name, params, returns, body };
}

// --- Type Resolution ---

function resolveTypeNode(typeNode: ts.TypeNode, sf: ts.SourceFile): IRType {
  const text = typeNode.getText(sf).trim();
  return mapTSTypeToGo(text);
}

// --- Helpers ---

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
