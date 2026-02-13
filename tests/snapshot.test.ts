/**
 * Snapshot tests — for each fixture directory, reads input.ts,
 * compiles it through the pipeline, and compares to expected.go.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "../src/compiler/parser.js";
import { emit } from "../src/compiler/emitter.js";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

function getFixtures(): string[] {
  return fs.readdirSync(FIXTURES_DIR).filter((name) => {
    const dir = path.join(FIXTURES_DIR, name);
    return fs.statSync(dir).isDirectory()
      && fs.existsSync(path.join(dir, "input.ts"))
      && fs.existsSync(path.join(dir, "expected.go"));
  });
}

describe("snapshot tests", () => {
  const fixtures = getFixtures();

  for (const fixture of fixtures) {
    it(`compiles ${fixture}`, () => {
      const inputPath = path.join(FIXTURES_DIR, fixture, "input.ts");
      const expectedPath = path.join(FIXTURES_DIR, fixture, "expected.go");

      const inputSource = fs.readFileSync(inputPath, "utf-8");
      const expectedGo = fs.readFileSync(expectedPath, "utf-8");

      const result = parse(inputPath, inputSource);
      expect(result.errors).toEqual([]);

      const goSource = emit(result.package);
      expect(goSource.trim()).toBe(expectedGo.trim());
    });
  }
});
