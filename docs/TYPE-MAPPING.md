# TypeScript → Go Type Mapping

## Primitive Types

| TypeScript | Go | Notes |
|---|---|---|
| `string` | `string` | Direct mapping |
| `number` | `float64` | Default. Use `int64` when integer context detected |
| `boolean` | `bool` | |
| `null` | `nil` | Go zero value concept |
| `undefined` | `nil` | Maps to zero value |
| `void` | (no return type) | Function returns nothing |
| `never` | — | Compile error if reachable |
| `any` | ❌ FTS001 | Not supported |
| `unknown` | `interface{}` | Only with explicit type assertion |

## Collection Types

| TypeScript | Go | Example |
|---|---|---|
| `Array<T>` / `T[]` | `[]T` | `string[]` → `[]string` |
| `Map<K, V>` | `map[K]V` | `Map<string, number>` → `map[string]float64` |
| `Set<T>` | `map[T]struct{}` | `Set<string>` → `map[string]struct{}` |
| `Record<K, V>` | `map[K]V` | `Record<string, any>` → ❌ (any not allowed) |
| Tuple `[A, B]` | struct | `[string, number]` → `struct{ F0 string; F1 float64 }` |

## Nullable Types

| TypeScript | Go | Notes |
|---|---|---|
| `T \| null` | `*T` | Pointer (nilable) |
| `T \| undefined` | `*T` | Same as null case |
| `T \| null \| undefined` | `*T` | Same |
| `string \| number` | ❌ | Complex unions not supported in Phase 1 |

## Function Types

| TypeScript | Go | Notes |
|---|---|---|
| `(a: string) => number` | `func(a string) float64` | |
| `async (a: string) => Promise<number>` | `func(a string) (float64, error)` | Phase 2 |
| `() => void` | `func()` | |

## Interface → Struct

```typescript
interface User {
  name: string;
  age: number;
  active: boolean;
  tags?: string[];
}
```

```go
type User struct {
    Name   string   `json:"name"`
    Age    float64  `json:"age"`
    Active bool     `json:"active"`
    Tags   []string `json:"tags,omitempty"`
}
```

**Rules**:
- Field names are PascalCase (exported) in Go
- JSON tags use original camelCase name
- Optional fields (`?`) get `omitempty` in JSON tag
- Optional fields of non-pointer types stay as-is (Go zero values work)
- Optional fields of complex types become pointers

## WinterTC-Specific Types

| TypeScript | Go | Import |
|---|---|---|
| `Request` | `*http.Request` | `net/http` |
| `Response` | `http.ResponseWriter` | `net/http` |
| `Headers` | `http.Header` | `net/http` |
| `URL` | `*url.URL` | `net/url` |
| `URLSearchParams` | `url.Values` | `net/url` |
| `ReadableStream` | `io.Reader` | `io` |
| `WritableStream` | `io.Writer` | `io` |
| `Blob` | `[]byte` | — |
| `FormData` | `multipart.Form` | `mime/multipart` |
| `AbortController` | `context.Context` + `cancel()` | `context` |
| `AbortSignal` | `context.Context` | `context` |
| `Promise<T>` | `(T, error)` | — |

## Enum Types (Phase 2)

```typescript
enum Status { Active = "active", Inactive = "inactive" }
```

```go
type Status string

const (
    StatusActive   Status = "active"
    StatusInactive Status = "inactive"
)
```

## Generic Types (Phase 3)

```typescript
interface Container<T> { value: T; }
```

```go
type Container[T any] struct {
    Value T `json:"value"`
}
```

Requires Go 1.24+ for generic type aliases.
