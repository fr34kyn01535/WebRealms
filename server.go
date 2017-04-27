//go:generate protoc --go_out=proto/ webrealms.proto

package main

import (
	"fmt"
	"log"
	"net/http"

	"./webrealms"

	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
)

var data []byte

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true }, // FIXME : Remove
	}
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Error Upgrading to websockets", 400)
		return
	}

	for {
		_, p, err := ws.ReadMessage()
		if err != nil {
			fmt.Println("err ", err)
			return
		}

		message := &webrealms.ProtocolMessage{}
		err = proto.Unmarshal(p, message)
		if err != nil {
			fmt.Println("err ", err)
			return
		}

		err = ws.WriteMessage(websocket.BinaryMessage, createHelloMessage())
		if err != nil {
			fmt.Println("err ", err)
			return
		}
	}
}

func createHelloMessage() []byte {
	msg := &webrealms.ProtocolMessage{
		Type: webrealms.ProtocolMessage_HELLO,
		Hello: &webrealms.ProtocolMessage_HelloMessage{
			Id:   []byte{0, 1},
			Name: "hello",
		},
	}

	data, err := proto.Marshal(msg)
	if err != nil {
		fmt.Println("err ", err)
	}
	return data
}

func main() {
	http.HandleFunc("/ws", handler)
	http.Handle("/", http.FileServer(http.Dir("./www")))
	if err := http.ListenAndServe(":8182", nil); err != nil {
		log.Fatal(err)
	}
}
