/**
 * fast-ts Type Mapper
 *
 * Maps TypeScript types to Go types.
 * See: docs/TYPE-MAPPING.md for the complete reference table.
 */

import type { IRType } from "./types.js";

const PRIMITIVE_MAP: Record<string, IRType> = {
  string: { kind: "string" },
  number: { kind: "float64" },
  boolean: { kind: "bool" },
  void: { kind: "void" },
  null: { kind: "interface" },
  undefined: { kind: "interface" },
  never: { kind: "void" },
};

const WINTERTC_MAP: Record<string, IRType> = {
  Request: { kind: "pointer", elementType: { kind: "named", name: "http.Request" } },
  Response: { kind: "named", name: "http.ResponseWriter" },
  Headers: { kind: "named", name: "http.Header" },
  URL: { kind: "pointer", elementType: { kind: "named", name: "url.URL" } },
  URLSearchParams: { kind: "named", name: "url.Values" },
  ReadableStream: { kind: "named", name: "io.Reader" },
  WritableStream: { kind: "named", name: "io.Writer" },
  Blob: { kind: "slice", elementType: { kind: "named", name: "byte" } },
};

/**
 * Map a TypeScript type string to an IR type.
 */
export function mapTSTypeToGo(tsType: string): IRType {
  const normalized = tsType.trim();

  // Primitives
  if (normalized in PRIMITIVE_MAP) {
    return PRIMITIVE_MAP[normalized]!;
  }

  // WinterTC types
  if (normalized in WINTERTC_MAP) {
    return WINTERTC_MAP[normalized]!;
  }

  // Array<T> or T[]
  const arrayGenericMatch = normalized.match(/^Array<(.+)>$/);
  if (arrayGenericMatch) {
    return { kind: "slice", elementType: mapTSTypeToGo(arrayGenericMatch[1]!) };
  }
  if (normalized.endsWith("[]")) {
    return { kind: "slice", elementType: mapTSTypeToGo(normalized.slice(0, -2)) };
  }

  // Map<K, V>
  const mapMatch = normalized.match(/^Map<(.+),\s*(.+)>$/);
  if (mapMatch) {
    return { kind: "map", keyType: mapTSTypeToGo(mapMatch[1]!), valueType: mapTSTypeToGo(mapMatch[2]!) };
  }

  // Set<T> → map[T]struct{}
  const setMatch = normalized.match(/^Set<(.+)>$/);
  if (setMatch) {
    return { kind: "map", keyType: mapTSTypeToGo(setMatch[1]!), valueType: { kind: "struct", fields: [] } };
  }

  // Record<K, V> → map[K]V
  const recordMatch = normalized.match(/^Record<(.+),\s*(.+)>$/);
  if (recordMatch) {
    return { kind: "map", keyType: mapTSTypeToGo(recordMatch[1]!), valueType: mapTSTypeToGo(recordMatch[2]!) };
  }

  // Promise<T> → T (unwrap, error handled separately)
  const promiseMatch = normalized.match(/^Promise<(.+)>$/);
  if (promiseMatch) {
    return mapTSTypeToGo(promiseMatch[1]!);
  }

  // T | null or T | undefined → *T (pointer)
  const nullableMatch = normalized.match(/^(.+)\s*\|\s*(?:null|undefined)$/);
  if (nullableMatch) {
    return { kind: "pointer", elementType: mapTSTypeToGo(nullableMatch[1]!) };
  }
  const nullableMatchReverse = normalized.match(/^(?:null|undefined)\s*\|\s*(.+)$/);
  if (nullableMatchReverse) {
    return { kind: "pointer", elementType: mapTSTypeToGo(nullableMatchReverse[1]!) };
  }

  // Named/user-defined type
  if (/^[A-Z][a-zA-Z0-9]*$/.test(normalized)) {
    return { kind: "named", name: normalized };
  }

  // Fallback: try as named type
  return { kind: "named", name: normalized };
}
