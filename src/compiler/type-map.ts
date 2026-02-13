/**
 * fast-ts Type Mapper
 *
 * Maps TypeScript types to Go types.
 * See: docs/TYPE-MAPPING.md for the complete reference table.
 *
 * Implement: Task T003
 */

import type { IRType } from "./types.js";

/**
 * Map a TypeScript type string to an IR type.
 *
 * @param tsType - TypeScript type as string (e.g. "string", "number", "Array<string>")
 * @returns IRType representing the Go equivalent
 *
 * TODO(T003): Implement full type mapping
 */
export function mapTSTypeToGo(tsType: string): IRType {
  const primitives: Record<string, IRType> = {
    string: { kind: "string" },
    number: { kind: "float64" },
    boolean: { kind: "bool" },
    void: { kind: "void" },
    null: { kind: "interface" },
    undefined: { kind: "interface" },
  };

  if (tsType in primitives) {
    return primitives[tsType]!;
  }

  // TODO(T003): Handle Array<T>, Map<K,V>, Set<T>, Record<K,V>, T | null, etc.
  throw new Error(`Unknown type: ${tsType} — see docs/TYPE-MAPPING.md`);
}
