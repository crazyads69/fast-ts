// Package handler provides the WinterTC-compatible HTTP handler adapter.
//
// In the WinterTC (WinterCG) spec, the standard entry point is:
//
//	export default {
//	  async fetch(request: Request): Promise<Response> { ... }
//	}
//
// fast-ts compiles this pattern into a standard Go net/http handler function.
// This package provides helpers to start the server and handle routing.
package handler

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// HandlerFunc is the signature for compiled WinterTC fetch handlers.
// It matches the standard net/http.HandlerFunc signature.
type HandlerFunc = http.HandlerFunc

// Serve starts an HTTP server on the given address with the provided handler.
// It supports graceful shutdown via SIGINT/SIGTERM signals.
func Serve(addr string, handler http.HandlerFunc) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", handler)

	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("fast-ts server listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-stop
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return server.Shutdown(ctx)
}

// ServePort is a convenience function that calls Serve with ":port".
func ServePort(port int, handler http.HandlerFunc) error {
	return Serve(fmt.Sprintf(":%d", port), handler)
}

// JSON writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, data []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(data)
}

// Text writes a plain text response with the given status code.
func Text(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	w.Write([]byte(body))
}

// Status writes a response with just a status code and no body.
func Status(w http.ResponseWriter, code int) {
	w.WriteHeader(code)
}

// Redirect sends an HTTP redirect.
func Redirect(w http.ResponseWriter, r *http.Request, url string, code int) {
	http.Redirect(w, r, url, code)
}
