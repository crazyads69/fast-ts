/**
 * Type mapping unit tests (T003)
 */

import { describe, it, expect } from "vitest";
import { mapTSTypeToGo } from "../src/compiler/type-map.js";
import type { IRType } from "../src/compiler/types.js";

describe("mapTSTypeToGo", () => {
  it("maps primitive types", () => {
    expect(mapTSTypeToGo("string")).toEqual({ kind: "string" });
    expect(mapTSTypeToGo("number")).toEqual({ kind: "float64" });
    expect(mapTSTypeToGo("boolean")).toEqual({ kind: "bool" });
    expect(mapTSTypeToGo("void")).toEqual({ kind: "void" });
  });

  it("maps Array<T>", () => {
    expect(mapTSTypeToGo("Array<string>")).toEqual({
      kind: "slice",
      elementType: { kind: "string" },
    });
  });

  it("maps T[]", () => {
    expect(mapTSTypeToGo("string[]")).toEqual({
      kind: "slice",
      elementType: { kind: "string" },
    });
  });

  it("maps Map<K, V>", () => {
    expect(mapTSTypeToGo("Map<string, number>")).toEqual({
      kind: "map",
      keyType: { kind: "string" },
      valueType: { kind: "float64" },
    });
  });

  it("maps Set<T>", () => {
    expect(mapTSTypeToGo("Set<string>")).toEqual({
      kind: "map",
      keyType: { kind: "string" },
      valueType: { kind: "struct", fields: [] },
    });
  });

  it("maps Record<K, V>", () => {
    expect(mapTSTypeToGo("Record<string, number>")).toEqual({
      kind: "map",
      keyType: { kind: "string" },
      valueType: { kind: "float64" },
    });
  });

  it("maps T | null to pointer", () => {
    expect(mapTSTypeToGo("string | null")).toEqual({
      kind: "pointer",
      elementType: { kind: "string" },
    });
  });

  it("maps null | T to pointer", () => {
    expect(mapTSTypeToGo("null | string")).toEqual({
      kind: "pointer",
      elementType: { kind: "string" },
    });
  });

  it("maps Promise<T> by unwrapping", () => {
    expect(mapTSTypeToGo("Promise<string>")).toEqual({ kind: "string" });
  });

  it("maps WinterTC types", () => {
    expect(mapTSTypeToGo("Request")).toEqual({
      kind: "pointer",
      elementType: { kind: "named", name: "http.Request" },
    });
    expect(mapTSTypeToGo("Headers")).toEqual({ kind: "named", name: "http.Header" });
  });

  it("maps user-defined named types", () => {
    expect(mapTSTypeToGo("User")).toEqual({ kind: "named", name: "User" });
  });
});
