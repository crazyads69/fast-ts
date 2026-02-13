package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type User struct {
	Name   string   `json:"name"`
	Age    float64  `json:"age"`
	Active bool     `json:"active"`
	Tags   []string `json:"tags,omitempty"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	user := User{
		Name:   "Alice",
		Age:    30,
		Active: true,
		Tags:   []string{"admin", "user"},
	}
	data, _ := json.Marshal(user)
	w.Write(data)
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("fast-ts server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
