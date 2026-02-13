// Package encoding provides WinterTC-compatible TextEncoder/TextDecoder.
//
// In JavaScript:
//   - new TextEncoder().encode("hello") → Uint8Array
//   - new TextDecoder().decode(bytes) → string
//
// In Go, these are trivially []byte(s) and string(b), but this package
// provides named functions for clarity in generated code.
package encoding

// TextEncode converts a string to a byte slice (UTF-8).
// Equivalent to: new TextEncoder().encode(s)
func TextEncode(s string) []byte {
	return []byte(s)
}

// TextDecode converts a byte slice to a string (UTF-8).
// Equivalent to: new TextDecoder().decode(b)
func TextDecode(b []byte) string {
	return string(b)
}

// TextEncoder provides a stateful encoder (mirrors the Web API).
type TextEncoder struct{}

// NewTextEncoder creates a new TextEncoder.
func NewTextEncoder() *TextEncoder {
	return &TextEncoder{}
}

// Encode converts a string to bytes.
func (e *TextEncoder) Encode(s string) []byte {
	return TextEncode(s)
}

// TextDecoder provides a stateful decoder (mirrors the Web API).
type TextDecoder struct {
	Encoding string
}

// NewTextDecoder creates a new TextDecoder with the given encoding.
// Only "utf-8" is supported.
func NewTextDecoder(encoding ...string) *TextDecoder {
	enc := "utf-8"
	if len(encoding) > 0 {
		enc = encoding[0]
	}
	return &TextDecoder{Encoding: enc}
}

// Decode converts bytes to a string.
func (d *TextDecoder) Decode(b []byte) string {
	return TextDecode(b)
}
