package main

import (
	"log"
	"net/http"
	"github.com/googollee/go-socket.io"
	"fmt"
//	"github.com/go-redis/redis"
)

func testHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "<div>%s</div>", "test")
    server.BroadcastTo("chat", "ping", "test")
}

var server *socketio.Server

func main() {
	var err error
	server, err = socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}
	server.On("connection", func(so socketio.Socket) {
		log.Println("on connection")
		so.Join("chat")
		
		so.On("disconnection", func() {
			log.Println("on disconnect")
		})
		so.On("pong", func(msg string) {
			log.Println("client ponged back")
			so.Emit("ping", "hi")
		})
		so.Emit("ping", "hi")
	}) 
	server.On("error", func(so socketio.Socket, err error) {
		log.Println("error:", err)
	})
	http.Handle("/socket.io/", server)
	http.Handle("/", http.FileServer(http.Dir("./www")))
	
	http.HandleFunc("/test/", testHandler)
	
	log.Println("Serving at localhost:8182...")
	log.Fatal(http.ListenAndServe(":8182", nil))
}