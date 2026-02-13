import { describe, it, expect } from "vitest";
import { validate } from "../src/compiler/validator";

describe("validator", () => {
  it("accepts valid code", () => {
    const source = `
      const x: number = 42;
      function greet(name: string): string {
        return "Hello, " + name;
      }
    `;
    const errors = validate("valid.ts", source);
    expect(errors).toHaveLength(0);
  });

  it("FTS001: detects 'any' type", () => {
    const source = `const x: any = 42;`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS001");
    expect(errors[0]!.message).toContain("any");
  });

  it("FTS001: detects 'any' in function params", () => {
    const source = `function foo(x: any): void {}`;
    const errors = validate("test.ts", source);
    expect(errors.some((e) => e.code === "FTS001")).toBe(true);
  });

  it("FTS002: detects eval()", () => {
    const source = `eval("console.log('hi')");`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS002");
  });

  it("FTS002: detects new Function()", () => {
    const source = `const fn = new Function("return 1");`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS002");
  });

  it("FTS003: detects new Proxy()", () => {
    const source = `const p = new Proxy({}, {});`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS003");
  });

  it("FTS003: detects Reflect usage", () => {
    const source = `Reflect.get({}, "key");`;
    const errors = validate("test.ts", source);
    expect(errors.some((e) => e.code === "FTS003")).toBe(true);
  });

  it("FTS004: detects Symbol()", () => {
    const source = `const s = Symbol("test");`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS004");
  });

  it("FTS005: detects WeakRef", () => {
    const source = `const wr = new WeakRef({});`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS005");
  });

  it("FTS005: detects FinalizationRegistry", () => {
    const source = `const fr = new FinalizationRegistry(() => {});`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS005");
  });

  it("FTS006: detects class extends", () => {
    const source = `
      class Animal {}
      class Dog extends Animal {}
    `;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS006");
  });

  it("FTS008: detects generator functions", () => {
    const source = `function* gen() { yield 1; }`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS008");
  });

  it("FTS010: detects delete operator", () => {
    const source = `const obj: Record<string, number> = {}; delete obj.x;`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS010");
  });

  it("FTS011: detects require()", () => {
    const source = `const fs = require("fs");`;
    const errors = validate("test.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("FTS011");
  });

  it("reports correct file, line, and column", () => {
    const source = `const x = 1;\nconst y: any = 2;`;
    const errors = validate("myfile.ts", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("myfile.ts");
    expect(errors[0]!.line).toBe(2);
    expect(errors[0]!.column).toBeGreaterThan(0);
  });

  it("detects multiple errors in one file", () => {
    const source = `
      const x: any = 1;
      eval("code");
      const p = new Proxy({}, {});
    `;
    const errors = validate("test.ts", source);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const codes = errors.map((e) => e.code);
    expect(codes).toContain("FTS001");
    expect(codes).toContain("FTS002");
    expect(codes).toContain("FTS003");
  });
});
