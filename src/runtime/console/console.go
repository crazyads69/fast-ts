// Package console provides WinterTC-compatible console logging functions.
//
// Maps JavaScript console methods to Go's log package:
//   - console.log(...)   → console.Log(...)   → log.Println(...)
//   - console.error(...) → console.Error(...) → log.Println("ERROR:", ...)
//   - console.warn(...)  → console.Warn(...)  → log.Println("WARN:", ...)
//   - console.info(...)  → console.Info(...)  → log.Println("INFO:", ...)
//   - console.debug(...) → console.Debug(...) → log.Println("DEBUG:", ...)
package console

import (
	"fmt"
	"log"
	"strings"
)

// Log writes arguments to the standard logger, similar to console.log().
func Log(args ...interface{}) {
	log.Println(args...)
}

// Error writes arguments to the standard logger with an ERROR prefix.
func Error(args ...interface{}) {
	log.Println(prepend("ERROR:", args)...)
}

// Warn writes arguments to the standard logger with a WARN prefix.
func Warn(args ...interface{}) {
	log.Println(prepend("WARN:", args)...)
}

// Info writes arguments to the standard logger with an INFO prefix.
func Info(args ...interface{}) {
	log.Println(prepend("INFO:", args)...)
}

// Debug writes arguments to the standard logger with a DEBUG prefix.
func Debug(args ...interface{}) {
	log.Println(prepend("DEBUG:", args)...)
}

// Assert logs an error message if the condition is false.
func Assert(condition bool, args ...interface{}) {
	if !condition {
		msg := "Assertion failed"
		if len(args) > 0 {
			msg = fmt.Sprint(args...)
		}
		log.Printf("ASSERT: %s", msg)
	}
}

// Table formats and logs tabular data (simplified implementation).
func Table(data interface{}) {
	log.Printf("TABLE: %v", data)
}

// Group starts a named log group (simplified — adds prefix to subsequent logs).
func Group(label string) {
	log.Printf("▸ %s", label)
}

// GroupEnd ends the current log group.
func GroupEnd() {
	// No-op in simplified implementation
}

// Dir logs an object representation.
func Dir(obj interface{}) {
	log.Printf("DIR: %+v", obj)
}

// Stringify converts arguments to a space-separated string (utility).
func Stringify(args ...interface{}) string {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = fmt.Sprint(a)
	}
	return strings.Join(parts, " ")
}

func prepend(prefix string, args []interface{}) []interface{} {
	result := make([]interface{}, 0, len(args)+1)
	result = append(result, prefix)
	result = append(result, args...)
	return result
}
