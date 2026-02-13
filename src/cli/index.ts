#!/usr/bin/env node

/**
 * fast-ts CLI
 */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { parse } from "../compiler/parser.js";
import { emit } from "../compiler/emitter.js";

const program = new Command();

program
  .name("fast-ts")
  .description("TypeScript → Go compiler for WinterTC APIs")
  .version("0.0.1-alpha");

program
  .command("emit <file>")
  .description("Print generated Go source to stdout")
  .action((file: string) => {
    const startTime = performance.now();
    const absPath = path.resolve(file);

    if (!fs.existsSync(absPath)) {
      console.error(`\x1b[31m[fast-ts] Error: File not found: ${absPath}\x1b[0m`);
      process.exit(1);
    }

    const source = fs.readFileSync(absPath, "utf-8");
    const result = parse(absPath, source);

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.error(`\x1b[31m[${err.code}] ${err.message} (${err.file}:${err.line}:${err.column})\x1b[0m`);
      }
      process.exit(1);
    }

    const goSource = emit(result.package);
    const elapsed = (performance.now() - startTime).toFixed(0);

    process.stdout.write(goSource);
    console.error(`\x1b[32m[fast-ts] ✓ Emitted in ${elapsed}ms\x1b[0m`);
  });

program
  .command("build <file>")
  .description("Compile TypeScript to Go binary")
  .option("--outdir <dir>", "Output directory", ".fast-ts")
  .option("--no-compile", "Only generate Go source, skip go build")
  .action((file: string, opts: { outdir: string; compile: boolean }) => {
    const startTime = performance.now();
    const absPath = path.resolve(file);

    if (!fs.existsSync(absPath)) {
      console.error(`\x1b[31m[fast-ts] Error: File not found: ${absPath}\x1b[0m`);
      process.exit(1);
    }

    const source = fs.readFileSync(absPath, "utf-8");
    const result = parse(absPath, source);

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.error(`\x1b[31m[${err.code}] ${err.message} (${err.file}:${err.line}:${err.column})\x1b[0m`);
      }
      process.exit(1);
    }

    const goSource = emit(result.package);

    // Write Go source
    const outDir = path.resolve(opts.outdir);
    const srcDir = path.join(outDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    const mainGoPath = path.join(srcDir, "main.go");
    fs.writeFileSync(mainGoPath, goSource);

    // Write go.mod
    const goModPath = path.join(srcDir, "go.mod");
    if (!fs.existsSync(goModPath)) {
      const moduleName = path.basename(path.dirname(absPath));
      fs.writeFileSync(goModPath, `module ${moduleName}\n\ngo 1.24\n`);
    }

    const emitElapsed = (performance.now() - startTime).toFixed(0);
    const bytes = Buffer.byteLength(goSource, "utf-8");
    console.log(`\x1b[32m[fast-ts] ✓ Generated ${mainGoPath} (${bytes} bytes, ${emitElapsed}ms)\x1b[0m`);

    // Compile with go build
    if (opts.compile) {
      try {
        const binDir = path.join(outDir, "bin");
        fs.mkdirSync(binDir, { recursive: true });
        const binName = path.basename(file, path.extname(file));
        const binPath = path.join(binDir, binName);

        console.log(`\x1b[36m[fast-ts] Building Go binary...\x1b[0m`);
        execSync(`cd "${srcDir}" && CGO_ENABLED=0 go build -ldflags="-s -w" -o "${binPath}" .`, {
          stdio: "inherit",
        });

        const stat = fs.statSync(binPath);
        const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
        const totalElapsed = (performance.now() - startTime).toFixed(0);
        console.log(`\x1b[32m[fast-ts] ✓ Binary: ${binPath} (${sizeMB} MB, ${totalElapsed}ms)\x1b[0m`);
      } catch {
        console.error(`\x1b[31m[fast-ts] Error: go build failed. Is Go installed?\x1b[0m`);
        process.exit(1);
      }
    }
  });

program
  .command("check <file>")
  .description("Validate TypeScript source without compiling")
  .action((file: string) => {
    const absPath = path.resolve(file);
    if (!fs.existsSync(absPath)) {
      console.error(`\x1b[31m[fast-ts] Error: File not found: ${absPath}\x1b[0m`);
      process.exit(1);
    }

    const source = fs.readFileSync(absPath, "utf-8");
    const result = parse(absPath, source);

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.error(`\x1b[31m[${err.code}] ${err.message} (${err.file}:${err.line}:${err.column})\x1b[0m`);
      }
      process.exit(1);
    }

    console.log(`\x1b[32m[fast-ts] ✓ ${absPath} — no issues found\x1b[0m`);
  });

program
  .command("init <name>")
  .description("Scaffold a new fast-ts project")
  .action((name: string) => {
    const dir = path.resolve(name);
    if (fs.existsSync(dir)) {
      console.error(`\x1b[31m[fast-ts] Error: Directory ${name} already exists\x1b[0m`);
      process.exit(1);
    }

    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src", "index.ts"),
      `export default {\n  fetch(request: Request): Response {\n    return new Response("Hello from fast-ts!");\n  }\n};\n`,
    );
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name, version: "0.0.1", private: true, scripts: { build: "fast-ts build src/index.ts" } }, null, 2) + "\n",
    );

    console.log(`\x1b[32m[fast-ts] ✓ Created project: ${name}/\x1b[0m`);
    console.log(`\n  cd ${name}`);
    console.log(`  fast-ts build src/index.ts`);
    console.log(`  .fast-ts/bin/index\n`);
  });

program.parse();
