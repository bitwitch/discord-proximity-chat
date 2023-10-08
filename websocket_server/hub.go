package main

import (
	"log"
	"encoding/json"
)

type User struct {
	Username string 
	X int 
	Y int
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients. User is information about the connected discord user
	clients map[*Client]User

	// Inbound messages from the clients.
	broadcast chan Message

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]User),
	}
}

func (h *Hub) sendAllUsersPositions(client *Client) {
	for c, user := range h.clients {
		if c == client {
			continue
		}

		message := Message{
			Kind: MessageUpdatePosition,
			Username: user.Username,
			X: user.X,
			Y: user.Y,
		}

		rawMessage, err := json.Marshal(message)
		if err != nil {
			log.Printf("Failed to serialize message as json\n")
			continue
		}

		select {
		case client.send <- rawMessage:
		default:
			close(client.send)
			delete(h.clients, client)
			break
		}
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
			h.clients[client] = User{}
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:

			if message.Kind == MessageAddUser {
				if debugPrint {
					log.Printf("MessageAddUser\n")
				}
				h.clients[message.client] = User{
					Username: message.Username,
					X: message.X,
					Y: message.Y,
				}

				h.sendAllUsersPositions(message.client)

				// broadcast an update position message to all clients
				updatePositionMessage := message
				updatePositionMessage.Kind = MessageUpdatePosition
				rawMessage, err := json.Marshal(updatePositionMessage)
				if err != nil {
					log.Printf("Failed to serialize message from client as json\n")
					continue
				}
				h.broadcastMessage(rawMessage)

			} else if message.Kind == MessageUpdatePosition {
				if debugPrint {
					log.Printf("MessageUpdatePosition\n")
				}
				h.clients[message.client] = User{
					Username: message.Username,
					X: message.X,
					Y: message.Y,
				}

				rawMessage, err := json.Marshal(message)
				if err != nil {
					log.Printf("Failed to serialize message from client as json\n")
					continue
				}
				h.broadcastMessage(rawMessage)

			} else {
				log.Printf("Unknown message kind: %d\n", message.Kind)
			}
		}
	}
}
