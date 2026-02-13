package main

import (
	"log"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.String()
	method := r.Method
	if method == "GET" {
		w.Write([]byte("Hello from " + url))
	}
	if method == "POST" {
		w.WriteHeader(201)
		w.Write([]byte("Posted"))
	}
	w.WriteHeader(405)
	w.Write([]byte("Method not allowed"))
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("fast-ts server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
