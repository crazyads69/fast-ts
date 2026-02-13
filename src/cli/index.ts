#!/usr/bin/env node

/**
 * fast-ts CLI
 *
 * Commands:
 *   fast-ts build <file.ts> [--outdir .fast-ts]  — Compile TS to Go binary
 *   fast-ts emit <file.ts>                       — Print generated Go to stdout
 *   fast-ts init <name>                           — Scaffold a new project
 *   fast-ts check <file.ts>                       — Validate without compiling
 *   fast-ts version                               — Print version
 *
 * Implement: Task T012
 * See: TASKS.md § T012 for spec
 */

// TODO(T012): Implement CLI with commander.js
// For now, minimal arg parsing:

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "version":
    console.log("fast-ts 0.0.1-alpha");
    break;
  case "build":
  case "emit":
  case "init":
  case "check":
    console.error(`Command '${command}' not yet implemented — see TASKS.md T012`);
    process.exit(1);
    break;
  default:
    console.log(`
⚡ fast-ts — TypeScript → Go compiler for WinterTC APIs

Usage:
  fast-ts build <file.ts>   Compile to Go binary
  fast-ts emit <file.ts>    Print Go source to stdout
  fast-ts init <name>       Scaffold new project
  fast-ts check <file.ts>   Validate TS source
  fast-ts version           Print version
    `);
}
