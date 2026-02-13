import { describe, it, expect } from "vitest";
import { transform } from "../src/compiler/transformer";
import type { IRPackage } from "../src/compiler/types";

describe("transformer", () => {
  it("deduplicates imports", () => {
    const pkg: IRPackage = {
      name: "main",
      imports: [
        { path: "fmt" },
        { path: "fmt" },
        { path: "log" },
      ],
      declarations: [],
      mainBody: [],
    };
    const result = transform(pkg);
    expect(result.imports).toHaveLength(2);
    expect(result.imports.map((i) => i.path)).toEqual(["fmt", "log"]);
  });

  it("folds constant number addition", () => {
    const pkg: IRPackage = {
      name: "main",
      imports: [],
      declarations: [],
      mainBody: [
        {
          kind: "var-decl",
          name: "x",
          shortDecl: true,
          value: {
            kind: "binary",
            operator: "+",
            left: { kind: "literal", value: 1, type: { kind: "int64" } },
            right: { kind: "literal", value: 2, type: { kind: "int64" } },
          },
        },
      ],
    };
    const result = transform(pkg);
    const stmt = result.mainBody![0]!;
    if (stmt.kind === "var-decl" && stmt.value) {
      expect(stmt.value.kind).toBe("literal");
      if (stmt.value.kind === "literal") {
        expect(stmt.value.value).toBe(3);
      }
    }
  });

  it("folds constant string concatenation", () => {
    const pkg: IRPackage = {
      name: "main",
      imports: [],
      declarations: [],
      mainBody: [
        {
          kind: "var-decl",
          name: "s",
          shortDecl: true,
          value: {
            kind: "binary",
            operator: "+",
            left: { kind: "literal", value: "hello ", type: { kind: "string" } },
            right: { kind: "literal", value: "world", type: { kind: "string" } },
          },
        },
      ],
    };
    const result = transform(pkg);
    const stmt = result.mainBody![0]!;
    if (stmt.kind === "var-decl" && stmt.value) {
      expect(stmt.value.kind).toBe("literal");
      if (stmt.value.kind === "literal") {
        expect(stmt.value.value).toBe("hello world");
      }
    }
  });

  it("preserves non-foldable expressions", () => {
    const pkg: IRPackage = {
      name: "main",
      imports: [],
      declarations: [],
      mainBody: [
        {
          kind: "var-decl",
          name: "x",
          shortDecl: true,
          value: {
            kind: "binary",
            operator: "+",
            left: { kind: "identifier", name: "a" },
            right: { kind: "literal", value: 2, type: { kind: "int64" } },
          },
        },
      ],
    };
    const result = transform(pkg);
    const stmt = result.mainBody![0]!;
    if (stmt.kind === "var-decl" && stmt.value) {
      expect(stmt.value.kind).toBe("binary");
    }
  });

  it("transforms statements inside function bodies", () => {
    const pkg: IRPackage = {
      name: "main",
      imports: [],
      declarations: [
        {
          kind: "function",
          name: "add",
          params: [],
          returns: [{ kind: "int64" }],
          body: [
            {
              kind: "return",
              values: [
                {
                  kind: "binary",
                  operator: "+",
                  left: { kind: "literal", value: 10, type: { kind: "int64" } },
                  right: { kind: "literal", value: 20, type: { kind: "int64" } },
                },
              ],
            },
          ],
        },
      ],
      mainBody: [],
    };
    const result = transform(pkg);
    const fn = result.declarations[0]!;
    if (fn.kind === "function") {
      const ret = fn.body[0]!;
      if (ret.kind === "return") {
        expect(ret.values[0]!.kind).toBe("literal");
        if (ret.values[0]!.kind === "literal") {
          expect(ret.values[0]!.value).toBe(30);
        }
      }
    }
  });
});
