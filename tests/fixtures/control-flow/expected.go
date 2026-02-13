package main

import (
	"log"
	"net/http"
)

func Classify(status float64) string {
	switch status {
	case 200:
		return "ok"
	case 404:
		return "not found"
	case 500:
		return "server error"
	default:
		return "unknown"
	}
}

func SumArray(nums []float64) float64 {
	total := 0
	for i := 0; i < len(nums); i++ {
		total = total + nums[i]
	}
	return total
}

func PrintItems(items []string) {
	for _, item := range items {
		log.Println(item)
	}
}

func handler(w http.ResponseWriter, r *http.Request) {
	status := 200
	label := classify(status)
	if label == "ok" {
		w.Write([]byte("All good"))
	} else {
		w.Write([]byte("Something went wrong"))
	}
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("fast-ts server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
