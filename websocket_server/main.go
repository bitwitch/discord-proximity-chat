package main

import (
	"flag"
	"log"
	"net/http"
	"time"
)

var debugPrint bool

func main() {
	var port string
	flag.StringVar(&port, "port", "3333", "port number for server to listen on")
	flag.BoolVar(&debugPrint, "debug", false, "enable debug printing")

	flag.Parse()
	addr := ":" + port
	hub := newHub()
	go hub.run()
	http.HandleFunc("/proxchat", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	server := &http.Server{
		Addr: addr,
		ReadHeaderTimeout: 3 * time.Second,
	}
	log.Printf("Listening on port %s...\n", port)
	err := server.ListenAndServe()
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
