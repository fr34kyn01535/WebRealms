// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Position struct {
	x float32
	y float32
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	position Position
	id       string
	username string

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
				c.hub.broadcast <- buildUnspawnMessage(c.id)
				log.Printf("error: %v", err)
			}
			break
		}
		packet := &ProtocolPacket{}
		err = proto.Unmarshal(p, packet)
		if err != nil {
			fmt.Println("err ", err)
		}

		for _, message := range packet.Message {

			fmt.Println("Received message of type: ", ProtocolMessage_MessageType_name[int32(message.Type)])
			switch message.Type {
			case ProtocolMessage_CONNECT:
				uuid, _ := uuid.NewV4()
				c.id = uuid.String()
				c.username = message.Connect.Username
				c.position = Position{x: 90, y: 70}
				c.send <- buildHelloMessage(c.id, c.position.x, c.position.y)
				for client := range c.hub.clients {
					c.send <- buildSpawnMessage(client.username, client.id, client.position.x, client.position.y)
				}
				c.hub.broadcast <- buildSpawnMessage(c.username, c.id, c.position.x, c.position.y)
			case ProtocolMessage_POSITION:
				c.position.x = message.Position.X
				c.position.y = message.Position.Y
				c.hub.broadcast <- p
			}
		}

	}
}

func buildHelloMessage(sender string, x float32, y float32) []byte {
	msg := &ProtocolMessage{
		Type:   ProtocolMessage_HELLO,
		Sender: sender,
		Position: &ProtocolMessage_PositionMessage{
			X: x,
			Y: y,
		},
	}
	return buildMessage(msg)
}

func buildUnspawnMessage(sender string) []byte {
	msg := &ProtocolMessage{
		Type:   ProtocolMessage_UNSPAWN,
		Sender: sender,
	}
	return buildMessage(msg)
}

func buildSpawnMessage(name string, sender string, x float32, y float32) []byte {
	msg := &ProtocolMessage{
		Type:   ProtocolMessage_SPAWN,
		Sender: sender,
		Spawn: &ProtocolMessage_SpawnMessage{
			Name: name,
		},
		Position: &ProtocolMessage_PositionMessage{
			X: x,
			Y: y,
		},
	}
	return buildMessage(msg)
}

func buildMessage(msg *ProtocolMessage) []byte {
	return buildPacket([]*ProtocolMessage{msg})
}

func buildPacket(msg []*ProtocolMessage) []byte {
	packet := &ProtocolPacket{Message: msg}
	data, err := proto.Marshal(packet)
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
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), position: Position{x: 0, y: 0}}
	client.hub.register <- client
	go client.writePump()
	client.readPump()
}
