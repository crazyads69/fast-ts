# WinterTC API → Go Stdlib Mapping

> This is the complete mapping reference. When implementing a task from TASKS.md, check this table first.

## Core HTTP

| TypeScript (WinterTC) | Go | Import | Notes |
|---|---|---|---|
| `Request` | `*http.Request` | `net/http` | Read-only in handler |
| `Response` | `http.ResponseWriter` | `net/http` | Write-only |
| `new Response(body)` | `w.Write([]byte(body))` | `net/http` | |
| `new Response(body, {status: N})` | `w.WriteHeader(N); w.Write(...)` | `net/http` | WriteHeader before Write |
| `new Response(body, {headers: {...}})` | `w.Header().Set(k, v); w.Write(...)` | `net/http` | Set headers before Write |
| `request.method` | `r.Method` | `net/http` | `string` |
| `request.url` | `r.URL.String()` | `net/http` | Full URL string |
| `request.headers` | `r.Header` | `net/http` | `http.Header` type |
| `request.headers.get(key)` | `r.Header.Get(key)` | `net/http` | Returns `string` |
| `request.headers.set(key, val)` | `r.Header.Set(key, val)` | `net/http` | |
| `request.headers.has(key)` | `r.Header.Get(key) != ""` | `net/http` | No direct equivalent |
| `request.json()` | `json.NewDecoder(r.Body).Decode(&v)` | `encoding/json` | |
| `request.text()` | `io.ReadAll(r.Body)` | `io` | Returns `[]byte` |
| `fetch(url)` | `http.Get(url)` | `net/http` | Simple GET |
| `fetch(url, opts)` | `http.Client{}.Do(req)` | `net/http` | Full control |

## Headers

| TypeScript | Go | Notes |
|---|---|---|
| `new Headers()` | `http.Header{}` | |
| `headers.get(key)` | `h.Get(key)` | |
| `headers.set(key, val)` | `h.Set(key, val)` | |
| `headers.append(key, val)` | `h.Add(key, val)` | Note: `Add` not `Set` |
| `headers.delete(key)` | `h.Del(key)` | |
| `headers.has(key)` | `h.Get(key) != ""` | |
| `headers.forEach(fn)` | `for k, v := range h { ... }` | |

## URL

| TypeScript | Go | Import |
|---|---|---|
| `new URL(str)` | `url.Parse(str)` | `net/url` |
| `url.pathname` | `u.Path` | |
| `url.hostname` | `u.Hostname()` | |
| `url.port` | `u.Port()` | |
| `url.protocol` | `u.Scheme + ":"` | |
| `url.search` | `u.RawQuery` | |
| `url.hash` | `u.Fragment` | |
| `url.origin` | `u.Scheme + "://" + u.Host` | |
| `url.href` | `u.String()` | |
| `url.searchParams` | `u.Query()` | Returns `url.Values` |
| `url.searchParams.get(key)` | `u.Query().Get(key)` | |
| `url.searchParams.has(key)` | `u.Query().Has(key)` | |
| `url.searchParams.set(key, val)` | `q := u.Query(); q.Set(k,v); u.RawQuery = q.Encode()` | |

## Encoding

| TypeScript | Go | Import |
|---|---|---|
| `new TextEncoder().encode(str)` | `[]byte(str)` | (builtin) |
| `new TextDecoder().decode(buf)` | `string(buf)` | (builtin) |
| `atob(str)` | `base64.StdEncoding.DecodeString(str)` | `encoding/base64` |
| `btoa(str)` | `base64.StdEncoding.EncodeToString([]byte(str))` | `encoding/base64` |

## JSON

| TypeScript | Go | Import |
|---|---|---|
| `JSON.stringify(obj)` | `json.Marshal(obj)` | `encoding/json` |
| `JSON.parse(str)` | `json.Unmarshal([]byte(str), &target)` | `encoding/json` |
| Response JSON: `JSON.stringify(obj)` | `json.NewEncoder(w).Encode(obj)` | `encoding/json` |
| Request JSON: `request.json()` | `json.NewDecoder(r.Body).Decode(&v)` | `encoding/json` |

## Console

| TypeScript | Go | Import |
|---|---|---|
| `console.log(...)` | `log.Println(...)` | `log` |
| `console.error(...)` | `log.Println(...)` | `log` |
| `console.warn(...)` | `log.Println(...)` | `log` |

## Timers

| TypeScript | Go | Import |
|---|---|---|
| `setTimeout(fn, ms)` | `time.AfterFunc(time.Duration(ms)*time.Millisecond, fn)` | `time` |
| `setInterval(fn, ms)` | `ticker := time.NewTicker(...)` | `time` |
| `clearTimeout(id)` | `timer.Stop()` | `time` |
| `clearInterval(id)` | `ticker.Stop()` | `time` |

## Streams (Phase 2+)

| TypeScript | Go | Import |
|---|---|---|
| `ReadableStream` | `io.Reader` | `io` |
| `WritableStream` | `io.Writer` | `io` |
| `TransformStream` | `io.Pipe()` | `io` |

## Crypto (Phase 3+)

| TypeScript | Go | Import |
|---|---|---|
| `crypto.randomUUID()` | `uuid.New().String()` | `github.com/google/uuid` |
| `crypto.getRandomValues(buf)` | `rand.Read(buf)` | `crypto/rand` |
| `crypto.subtle.digest("SHA-256", data)` | `sha256.Sum256(data)` | `crypto/sha256` |

## Misc

| TypeScript | Go | Import |
|---|---|---|
| `structuredClone(obj)` | Deep copy (generate per type) | — |
| `performance.now()` | `float64(time.Now().UnixMicro()) / 1000.0` | `time` |
| `queueMicrotask(fn)` | `go fn()` | (builtin) |
