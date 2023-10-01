package main

import (
	"errors"
	"fmt"
	"net/http"
	"golang.org/x/net/websocket"
)

type MessageKind int
const (
	 MessageNone MessageKind = iota
	 MessageAddUser
	 MessageUpdatePosition
	 MessageRemoveUser
	 MessageAcknowledge
)

type Message struct {
	Kind MessageKind `json:"kind"`
	Username string `json:"username"`
	X int `json:"x"`
	Y int `json:"y"`
}

type User struct {
	Username string `json:"username"`
	X int `json:"x"`
	Y int `json:"y"`

	// unexported
	connection *websocket.Conn
}

var users = make(map[string]User)

func addUser(message Message, conn *websocket.Conn) {
	// NOTE(shaw): this system is kinda shitty, a unique id would be
	// better than username, but on the client side right now we don't
	// have any way to identify users besides username
	newUser := User{Username: message.Username, X: message.X, Y: message.Y, connection: conn}
	users[newUser.Username] = newUser

	ack := Message{Kind: MessageAcknowledge, Username: newUser.Username, X: newUser.X, Y: newUser.Y}
	fmt.Printf("Sending acknowledgement to client: %v+\n", ack)
	if err := websocket.JSON.Send(conn, ack); err != nil {
		fmt.Printf("Failed to send message to client: %+v", ack)
	}
}

func broadcastUserPosition(message Message) {
	updatedUser, ok := users[message.Username]
	if !ok {
		fmt.Printf("No user found with username '%s'\n", message.Username)
		return
	}

	updatedUser.X = message.X
	updatedUser.Y = message.Y
	users[updatedUser.Username] = updatedUser

	posUpdate := Message{
		Kind: MessageUpdatePosition,
		Username: updatedUser.Username,
		X: updatedUser.X,
		Y: updatedUser.Y,
	}

	for _, user := range users {
		//if username == message.Username {
			//continue
		//}
		fmt.Printf("Sending to client %s: %+v\n", user.Username, posUpdate)
		if err := websocket.JSON.Send(user.connection, posUpdate); err != nil {
			fmt.Printf("Failed to send message to client: %+v", posUpdate)
			continue
		}
	}
}

func HandleWebsocket(conn *websocket.Conn) {
	defer conn.Close();

	fmt.Printf("got /proxchat request\n")

	var err error
	for {
		var message Message

		if err = websocket.JSON.Receive(conn, &message); err != nil {
			fmt.Printf("Can't receive: %s\n", err)
			var text string
			if err = websocket.Message.Receive(conn, &text); err != nil {
				fmt.Printf("Message: %s\n", text)
			}
			break
		}

		fmt.Printf("Received from client: %+v\n", message)

		switch message.Kind {
			case MessageAddUser: {
				addUser(message, conn)
			}
			case MessageUpdatePosition: {
				broadcastUserPosition(message)
			}
			default: {
				fmt.Printf("Unknown message kind: %d\n", message.Kind)
			}
		}
	}
}

func main() {
	mux := http.NewServeMux()
	mux.Handle("/proxchat", websocket.Handler(HandleWebsocket))

	fmt.Println("Listening on port 3333.")

	err := http.ListenAndServe(":3333", mux)

	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		panic(fmt.Errorf("error starting server: %s\n", err))
	}
}


