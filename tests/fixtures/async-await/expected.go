package main

import (
	"log"
	"net/http"
)

func FetchData(url string) (string, error) {
	response := fetch(url)
	text := response.text()
	return text
}

func handler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.String()
	data := fetchData(url)
	w.Write([]byte(data))
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("fast-ts server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

