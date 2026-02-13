/**
 * fast-ts Transformer
 *
 * Transforms TypeScript AST nodes into Go-compatible IR.
 * This is where semantic transformations happen:
 * - WinterTC entry point → Go HTTP handler
 * - async/await → goroutines (Phase 2)
 * - try/catch → error returns (Phase 2)
 *
 * See: docs/ARCHITECTURE.md § Stage 3: Transform
 */

// TODO: Implement transformer as parser complexity grows.
// For M1, transformation logic can live directly in parser.ts.
// Extract to this file when parser gets too large.
