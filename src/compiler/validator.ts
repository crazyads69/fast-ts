/**
 * fast-ts Validator
 *
 * Validates TypeScript source for supported feature subset.
 * Rejects unsupported patterns with clear error codes (FTS001-FTS011).
 *
 * Implement: Tasks T060-T065
 * See: docs/ARCHITECTURE.md § Stage 2: Validate
 */

export interface CompileError {
  code: string; // FTS001, FTS002, etc.
  message: string;
  suggestion: string;
  file: string;
  line: number;
  column: number;
}

/**
 * Validate a TypeScript source file for fast-ts compatibility.
 *
 * @param filename - Path to the .ts file
 * @param source - TypeScript source code
 * @returns Array of compile errors (empty = valid)
 *
 * TODO(T060): Detect `any` usage → FTS001
 * TODO(T061): Detect `eval()` / `new Function()` → FTS002
 * TODO(T062): Detect `Proxy` / `Reflect` → FTS003
 * TODO(T063): Detect class inheritance → FTS006
 * TODO(T064): Detect decorators → FTS007
 * TODO(T065): Detect `require()` → FTS011
 */
export function validate(filename: string, source: string): CompileError[] {
  // TODO: Implement in T060-T065
  return [];
}
