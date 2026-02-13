/**
 * fast-ts Parser
 *
 * Parses TypeScript source files using the TypeScript Compiler API
 * and produces IR (Intermediate Representation) nodes.
 *
 * Implement: Task T010 (WinterTC entry point detection)
 * See: docs/ARCHITECTURE.md § Stage 1: Parse
 * See: TASKS.md § T010 for exact input/output spec
 */

import type { IRPackage } from "./types.js";

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
 *
 * @param filename - Path to the .ts file
 * @param source - TypeScript source code string
 * @returns ParseResult with IR package and any errors
 *
 * TODO(T010): Implement WinterTC entry point detection
 * TODO(T020): Add interface declaration parsing
 * TODO(T021): Add type alias parsing
 * TODO(T022): Add variable declaration parsing
 * TODO(T023): Add function declaration parsing
 */
export function parse(filename: string, source: string): ParseResult {
  // TODO: Implement in T010
  throw new Error("Not implemented — see TASKS.md T010");
}
