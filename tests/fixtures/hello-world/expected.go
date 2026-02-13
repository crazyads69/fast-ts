package main

import (
	"log"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello from fast-ts!"))
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("fast-ts server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
