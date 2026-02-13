/**
 * Parser unit tests (T010)
 */

import { describe, it, expect } from "vitest";
import { parse } from "../src/compiler/parser.js";

describe("parser", () => {
  it("detects WinterTC fetch entry point", () => {
    const source = `
export default {
  fetch(request: Request): Response {
    return new Response("Hello");
  }
};
`;
    const result = parse("test.ts", source);
    expect(result.errors).toEqual([]);
    expect(result.package.name).toBe("main");

    // Should have a handler function
    const handler = result.package.declarations.find(
      (d) => d.kind === "function" && d.name === "handler",
    );
    expect(handler).toBeDefined();

    // Should have main body
    expect(result.package.mainBody).toBeDefined();
    expect(result.package.mainBody!.length).toBe(3);

    // Should import net/http and log
    const importPaths = result.package.imports.map((i) => i.path);
    expect(importPaths).toContain("net/http");
    expect(importPaths).toContain("log");
  });

  it("parses interface declarations", () => {
    const source = `
interface User {
  name: string;
  age: number;
  active: boolean;
  tags?: string[];
}
export default {
  fetch(request: Request): Response {
    return new Response("Hello");
  }
};
`;
    const result = parse("test.ts", source);
    const structDecl = result.package.declarations.find(
      (d) => d.kind === "struct" && d.name === "User",
    );
    expect(structDecl).toBeDefined();
    if (structDecl && structDecl.kind === "struct") {
      expect(structDecl.fields).toHaveLength(4);
      expect(structDecl.fields[0]!.name).toBe("Name");
      expect(structDecl.fields[0]!.jsonTag).toBe("name");
      expect(structDecl.fields[3]!.omitEmpty).toBe(true);
    }
  });

  it("parses variable declarations", () => {
    const source = `
const port: number = 8080;
const host = "localhost";
export default {
  fetch(request: Request): Response {
    return new Response("Hello");
  }
};
`;
    const result = parse("test.ts", source);
    const portDecl = result.package.declarations.find(
      (d) => d.kind === "const" && d.name === "port",
    );
    expect(portDecl).toBeDefined();
    const hostDecl = result.package.declarations.find(
      (d) => d.kind === "const" && d.name === "host",
    );
    expect(hostDecl).toBeDefined();
  });

  it("parses function declarations", () => {
    const source = `
function greet(name: string): string {
  return name;
}
export default {
  fetch(request: Request): Response {
    return new Response("Hello");
  }
};
`;
    const result = parse("test.ts", source);
    const fn = result.package.declarations.find(
      (d) => d.kind === "function" && d.name === "Greet",
    );
    expect(fn).toBeDefined();
    if (fn && fn.kind === "function") {
      expect(fn.params).toHaveLength(1);
      expect(fn.params[0]!.name).toBe("name");
    }
  });
});
