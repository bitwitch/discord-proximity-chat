package main

import (
	"log"
	"encoding/json"
)

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) broadcastMessage(message []byte) {
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case rawMessage := <-h.broadcast:
			var message Message
			if err := json.Unmarshal(rawMessage, &message); err != nil {
				log.Printf("Failed to parse message from client: %s\n", string(rawMessage))
				continue
			}
			if message.Kind == MessageUpdatePosition {
				log.Printf("MessageUpdatePosition\n")
				h.broadcastMessage(rawMessage)
			} else {
				log.Printf("Unknown message kind: %d\n", message.Kind)
			}
		}
	}
}
