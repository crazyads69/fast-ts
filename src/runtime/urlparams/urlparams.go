// Package urlparams provides a WinterTC-compatible URLSearchParams implementation.
//
// Maps JavaScript URLSearchParams to Go's url.Values:
//   - new URLSearchParams("foo=bar") → urlparams.New("foo=bar")
//   - params.get("key")             → params.Get("key")
//   - params.set("key", "val")      → params.Set("key", "val")
//   - params.has("key")             → params.Has("key")
//   - params.delete("key")          → params.Delete("key")
//   - params.toString()             → params.String()
//   - params.entries()              → params.Entries()
package urlparams

import (
	"net/url"
)

// URLSearchParams wraps url.Values to provide a WinterTC-compatible API.
type URLSearchParams struct {
	values url.Values
}

// New creates a new URLSearchParams from a query string.
// The query string may optionally start with "?".
func New(query ...string) *URLSearchParams {
	q := ""
	if len(query) > 0 {
		q = query[0]
	}
	// Strip leading "?" if present
	if len(q) > 0 && q[0] == '?' {
		q = q[1:]
	}
	v, _ := url.ParseQuery(q)
	return &URLSearchParams{values: v}
}

// FromValues creates a URLSearchParams from existing url.Values.
func FromValues(v url.Values) *URLSearchParams {
	return &URLSearchParams{values: v}
}

// Get returns the first value for the given key, or empty string if not found.
func (p *URLSearchParams) Get(key string) string {
	return p.values.Get(key)
}

// GetAll returns all values for the given key.
func (p *URLSearchParams) GetAll(key string) []string {
	return p.values[key]
}

// Set sets the value for the given key, replacing any existing values.
func (p *URLSearchParams) Set(key, value string) {
	p.values.Set(key, value)
}

// Append adds a value for the given key without removing existing values.
func (p *URLSearchParams) Append(key, value string) {
	p.values.Add(key, value)
}

// Has returns whether the given key exists.
func (p *URLSearchParams) Has(key string) bool {
	_, ok := p.values[key]
	return ok
}

// Delete removes all values for the given key.
func (p *URLSearchParams) Delete(key string) {
	delete(p.values, key)
}

// String returns the URL-encoded query string (without leading "?").
func (p *URLSearchParams) String() string {
	return p.values.Encode()
}

// Entries returns all key-value pairs.
func (p *URLSearchParams) Entries() [][2]string {
	var entries [][2]string
	for key, vals := range p.values {
		for _, val := range vals {
			entries = append(entries, [2]string{key, val})
		}
	}
	return entries
}

// Keys returns all unique keys.
func (p *URLSearchParams) Keys() []string {
	keys := make([]string, 0, len(p.values))
	for key := range p.values {
		keys = append(keys, key)
	}
	return keys
}

// Values returns all values (flattened).
func (p *URLSearchParams) Values() []string {
	var vals []string
	for _, v := range p.values {
		vals = append(vals, v...)
	}
	return vals
}

// ForEach calls the callback for each key-value pair.
func (p *URLSearchParams) ForEach(fn func(value, key string)) {
	for key, vals := range p.values {
		for _, val := range vals {
			fn(val, key)
		}
	}
}

// Sort sorts the entries by key (for deterministic output).
func (p *URLSearchParams) Sort() {
	// url.Values.Encode() already sorts by key
}

// Size returns the total number of entries.
func (p *URLSearchParams) Size() int {
	count := 0
	for _, vals := range p.values {
		count += len(vals)
	}
	return count
}
