/**
 * fast-ts Intermediate Representation (IR) Types
 *
 * This is the CONTRACT between the parser and emitter.
 * Both sides must agree on these types.
 *
 * Task T002 implements the full type system.
 * See docs/ARCHITECTURE.md § IR Design for the spec.
 */

// === Top Level ===

export interface IRPackage {
  name: string; // "main"
  imports: IRImport[];
  declarations: IRDeclaration[];
  mainBody?: IRStatement[];
}

export interface IRImport {
  path: string; // e.g. "net/http", "encoding/json"
  alias?: string;
}

// === Types ===

export type IRType =
  | { kind: "string" }
  | { kind: "int64" }
  | { kind: "float64" }
  | { kind: "bool" }
  | { kind: "void" }
  | { kind: "error" }
  | { kind: "interface" } // interface{} / any
  | { kind: "slice"; elementType: IRType }
  | { kind: "map"; keyType: IRType; valueType: IRType }
  | { kind: "pointer"; elementType: IRType }
  | { kind: "named"; name: string }
  | { kind: "struct"; fields: IRField[] }
  | { kind: "func"; params: IRParam[]; returns: IRType[] };

export interface IRField {
  name: string; // PascalCase (exported)
  type: IRType;
  jsonTag?: string; // original camelCase name
  omitEmpty?: boolean;
}

export interface IRParam {
  name: string;
  type: IRType;
}

// === Declarations ===

export type IRDeclaration =
  | IRFunctionDecl
  | IRStructDecl
  | IRVarDecl
  | IRConstDecl
  | IRTypeAliasDecl;

export interface IRFunctionDecl {
  kind: "function";
  name: string;
  params: IRParam[];
  returns: IRType[];
  body: IRStatement[];
  receiver?: { name: string; type: IRType }; // method receiver
}

export interface IRStructDecl {
  kind: "struct";
  name: string;
  fields: IRField[];
}

export interface IRVarDecl {
  kind: "var";
  name: string;
  type?: IRType;
  value?: IRExpression;
}

export interface IRConstDecl {
  kind: "const";
  name: string;
  type?: IRType;
  value: IRExpression;
}

export interface IRTypeAliasDecl {
  kind: "type-alias";
  name: string;
  type: IRType;
}

// === Statements ===

export type IRStatement =
  | IRExpressionStmt
  | IRReturnStmt
  | IRVarDeclStmt
  | IRAssignStmt
  | IRIfStmt
  | IRForStmt
  | IRForRangeStmt
  | IRSwitchStmt
  | IRBlockStmt;

export interface IRExpressionStmt {
  kind: "expression";
  expression: IRExpression;
}

export interface IRReturnStmt {
  kind: "return";
  values: IRExpression[];
}

export interface IRVarDeclStmt {
  kind: "var-decl";
  name: string;
  type?: IRType;
  value?: IRExpression;
  shortDecl: boolean; // := vs var
}

export interface IRAssignStmt {
  kind: "assign";
  target: IRExpression;
  value: IRExpression;
}

export interface IRIfStmt {
  kind: "if";
  condition: IRExpression;
  body: IRStatement[];
  elseBody?: IRStatement[];
}

export interface IRForStmt {
  kind: "for";
  init?: IRStatement;
  condition?: IRExpression;
  post?: IRStatement;
  body: IRStatement[];
}

export interface IRForRangeStmt {
  kind: "for-range";
  key: string;
  value: string;
  iterable: IRExpression;
  body: IRStatement[];
}

export interface IRSwitchStmt {
  kind: "switch";
  tag?: IRExpression;
  cases: { values: IRExpression[]; body: IRStatement[] }[];
  defaultBody?: IRStatement[];
}

export interface IRBlockStmt {
  kind: "block";
  body: IRStatement[];
}

// === Expressions ===

export type IRExpression =
  | IRIdentifier
  | IRLiteral
  | IRCallExpr
  | IRMemberExpr
  | IRBinaryExpr
  | IRUnaryExpr
  | IRIndexExpr
  | IRCompositeLit
  | IRFuncLitExpr
  | IRTypeAssertExpr;

export interface IRIdentifier {
  kind: "identifier";
  name: string;
}

export interface IRLiteral {
  kind: "literal";
  value: string | number | boolean | null;
  type: IRType;
}

export interface IRCallExpr {
  kind: "call";
  func: IRExpression;
  args: IRExpression[];
}

export interface IRMemberExpr {
  kind: "member";
  object: IRExpression;
  property: string;
}

export interface IRBinaryExpr {
  kind: "binary";
  operator: string; // "==", "!=", "+", "-", "&&", "||", etc.
  left: IRExpression;
  right: IRExpression;
}

export interface IRUnaryExpr {
  kind: "unary";
  operator: string; // "!", "-", "&", "*"
  operand: IRExpression;
}

export interface IRIndexExpr {
  kind: "index";
  object: IRExpression;
  index: IRExpression;
}

export interface IRCompositeLit {
  kind: "composite";
  type: IRType;
  elements: { key?: string; value: IRExpression }[];
}

export interface IRFuncLitExpr {
  kind: "func-lit";
  params: IRParam[];
  returns: IRType[];
  body: IRStatement[];
}

export interface IRTypeAssertExpr {
  kind: "type-assert";
  expression: IRExpression;
  assertType: IRType;
}
