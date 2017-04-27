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
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			return
		}
		fmt.Println("read done")
		fmt.Println("write %s", data)
		if err = conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
			fmt.Println("err %s", err)
			return
		}
		fmt.Println("write done")
	}
}

func main() {

	msg := &webrealms.ProtocolMessage{
		Type: webrealms.ProtocolMessage_HELLO,
		Hello: &webrealms.ProtocolMessage_HelloMessage{
			Id:   []byte{0, 1},
			Name: "hello",
		},
	}

	data, _ = proto.Marshal(msg)

	fmt.Println("%s", data)

	http.HandleFunc("/ws", handler)
	http.Handle("/", http.FileServer(http.Dir("./www")))
	if err := http.ListenAndServe(":8182", nil); err != nil {
		log.Fatal(err)
	}
}
