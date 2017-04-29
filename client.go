// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"./webrealms"
	"github.com/golang/protobuf/proto"
	"github.com/gorilla/websocket"
	"github.com/nu7hatch/gouuid"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, p, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway) {
				log.Printf("error: %v", err)
			}
			break
		}
		message := &webrealms.ProtocolMessage{}
		err = proto.Unmarshal(p, message)
		if err != nil {
			fmt.Println("err ", err)
		}
		//	if(err.sender != )

		//fmt.Println("Received message of type: ", webrealms.ProtocolMessage_MessageType_name[int32(message.Type)])

		switch message.Type {
		case webrealms.ProtocolMessage_CONNECT:
			fmt.Println(message.Connect.Username)
			uuid, _ := uuid.NewV4()
			id := uuid.String()
			c.send <- buildHelloMessage(id)
			c.hub.broadcast <- buildSpawnMessage(message.Connect.Username, id)
		case webrealms.ProtocolMessage_POSITION:
			c.hub.broadcast <- p
		}

	}
}

func buildHelloMessage(sender string) []byte {
	msg := &webrealms.ProtocolMessage{
		Type:   webrealms.ProtocolMessage_HELLO,
		Sender: sender,
	}
	return build(msg)
}

func buildSpawnMessage(name string, sender string) []byte {
	msg := &webrealms.ProtocolMessage{
		Type:   webrealms.ProtocolMessage_SPAWN,
		Sender: sender,
		Spawn: []*webrealms.ProtocolMessage_SpawnMessage{
			&webrealms.ProtocolMessage_SpawnMessage{
				Name: name,
			},
		},
	}
	return build(msg)
}

func build(msg *webrealms.ProtocolMessage) []byte {
	data, err := proto.Marshal(msg)
	if err != nil {
		fmt.Println("Failed to marshall: ", err)
		return nil
	}
	return data
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.BinaryMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
				return
			}
		}
	}
}

// serveWs handles websocket requests from the peer.
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	client.hub.register <- client
	go client.writePump()
	client.readPump()
}
