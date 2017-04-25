package main

import (
	"log"
	"net/http"
	"github.com/googollee/go-socket.io"
//	"github.com/go-redis/redis"
)

func main() {
    log.Println("test")
	server, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}
	server.On("connection", func(so socketio.Socket) {
		log.Println("on connection")
		so.Join("chat")
		
		so.BroadcastTo("chat", "ping", "hi")
		so.On("chat message", func(msg string) {
			log.Println("emit:", so.Emit("chat message", msg))
			so.BroadcastTo("chat", "chat message", msg)
		})
		so.On("disconnection", func() {
			log.Println("on disconnect")
		})
		so.On("pong", func() {
			log.Println("client ponged back")
		})
	}) 
	server.On("error", func(so socketio.Socket, err error) {
		log.Println("error:", err)
	})

	http.Handle("/socket.io/", server)
	http.Handle("/", http.FileServer(http.Dir("./www")))
	log.Println("Serving at localhost:8182...")
	log.Fatal(http.ListenAndServe(":8182", nil))
}