//go:generate protoc --go_out=webrealms/ webrealms.proto

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
		CheckOrigin: func(r *http.Request) bool { return true },
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

		fmt.Println("Received message of type: ", webrealms.ProtocolMessage_MessageType_name[int32(message.Type)])

		switch message.Type {
		case webrealms.ProtocolMessage_CONNECT:
			fmt.Println(message.Connect.Username)
			err = ws.WriteMessage(websocket.BinaryMessage, createSpawnMessage())
			if err != nil {
				fmt.Println("err ", err)
				return
			}
		}

	}
}

func createSpawnMessage() []byte {
	msg := &webrealms.ProtocolMessage{
		Type: webrealms.ProtocolMessage_SPAWN,
		Spawn: &webrealms.ProtocolMessage_SpawnMessage{
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
