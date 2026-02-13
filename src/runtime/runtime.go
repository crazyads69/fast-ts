// Package runtime provides WinterTC-compatible helpers for fast-ts generated code.
//
// This package is included in generated Go projects automatically.
// The runtime is organized into sub-packages:
//
//	runtime/handler   — HTTP handler adapter for the WinterTC fetch() pattern
//	runtime/console   — Console logging helpers (console.log, console.error, console.warn)
//	runtime/encoding  — TextEncoder/TextDecoder helpers
//	runtime/urlparams — URLSearchParams helper
//
// Generated code imports these packages as needed.
package runtime

// Version is the runtime version. It is updated with each release.
const Version = "0.1.0"
