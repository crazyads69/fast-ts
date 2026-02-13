/**
 * Integration test: TypeScript → Go → Binary → HTTP
 *
 * This test performs the full pipeline:
 * 1. Parse a TypeScript fixture
 * 2. Emit Go source code
 * 3. Write a Go module (go.mod + main.go)
 * 4. Build with `go build`
 * 5. Start the binary
 * 6. Make an HTTP request
 * 7. Verify the response
 *
 * Requires Go to be installed. Skips gracefully if unavailable.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, ChildProcess } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parse } from "../src/compiler/parser";
import { emit } from "../src/compiler/emitter";

function isGoInstalled(): boolean {
  try {
    execSync("go version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server not ready after ${timeoutMs}ms`));
          } else {
            setTimeout(check, 100);
          }
        });
    };
    check();
  });
}

const HAS_GO = isGoInstalled();

describe.skipIf(!HAS_GO)("Integration: TS → Go binary → HTTP", () => {
  let tmpDir: string;
  let serverProcess: ChildProcess | undefined;
  const PORT = 18932; // unlikely to collide

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fast-ts-integration-"));
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      serverProcess = undefined;
    }
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("compiles hello-world.ts → Go binary → serves HTTP 200", async () => {
    // 1. Parse the hello-world fixture
    const source = readFileSync(
      join(__dirname, "fixtures/hello-world/input.ts"),
      "utf-8",
    );
    const result = parse("input.ts", source);
    expect(result.errors).toHaveLength(0);

    // 2. Emit Go source
    const goCode = emit(result.package);
    expect(goCode).toContain("package main");
    expect(goCode).toContain("func main()");

    // 3. Write Go module
    const goModContent = `module fast-ts-test\n\ngo 1.21\n`;
    writeFileSync(join(tmpDir, "go.mod"), goModContent);
    // Override the port in the generated code
    const goCodeWithPort = goCode.replace(
      `log.Fatal(http.ListenAndServe(":8080", nil))`,
      `log.Fatal(http.ListenAndServe(":${PORT}", nil))`,
    );
    writeFileSync(join(tmpDir, "main.go"), goCodeWithPort);

    // 4. Build with go build
    try {
      execSync("go build -o server .", {
        cwd: tmpDir,
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (e: any) {
      console.error("go build failed:", e.stderr?.toString());
      throw e;
    }

    // 5. Start the server
    serverProcess = spawn(join(tmpDir, "server"), [], {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // 6. Wait for server to be ready
    await waitForServer(`http://localhost:${PORT}/`, 5000);

    // 7. Make HTTP request and verify response
    const response = await fetch(`http://localhost:${PORT}/`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("Hello from fast-ts!");

    // Cleanup
    serverProcess.kill("SIGTERM");
    serverProcess = undefined;
  }, 60000); // 60s timeout for build + server startup

  it("compiles variables.ts → Go binary → serves HTTP 200", async () => {
    const source = readFileSync(
      join(__dirname, "fixtures/variables/input.ts"),
      "utf-8",
    );
    const result = parse("input.ts", source);
    expect(result.errors).toHaveLength(0);

    const goCode = emit(result.package);
    const goCodeWithPort = goCode.replace(
      `log.Fatal(http.ListenAndServe(":8080", nil))`,
      `log.Fatal(http.ListenAndServe(":${PORT}", nil))`,
    );

    writeFileSync(join(tmpDir, "main.go"), goCodeWithPort);

    try {
      execSync("go build -o server .", {
        cwd: tmpDir,
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (e: any) {
      console.error("go build failed:", e.stderr?.toString());
      throw e;
    }

    serverProcess = spawn(join(tmpDir, "server"), [], {
      cwd: tmpDir,
      stdio: "pipe",
    });

    await waitForServer(`http://localhost:${PORT}/`, 5000);

    const response = await fetch(`http://localhost:${PORT}/`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("Hello from fast-ts!");

    serverProcess.kill("SIGTERM");
    serverProcess = undefined;
  }, 60000);
});
