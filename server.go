//go:generate protoc --go_out=webrealms/ webrealms.proto

package main

import (
	"log"
	"net/http"
)

func main() {
	http.Handle("/", http.FileServer(http.Dir("./www")))

	hub := newHub()
	go hub.run()
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	if err := http.ListenAndServe(":80", nil); err != nil {
		log.Fatal(err)
	}
}
