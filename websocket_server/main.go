package main

import (
	"flag"
	"log"
	"net/http"
	"time"
)

var debugPrint bool

func main() {
	var addr string
	flag.StringVar(&addr, "addr", ":3333", "http service address")
	flag.BoolVar(&debugPrint, "debug", false, "enable debug printing")

	flag.Parse()
	hub := newHub()
	go hub.run()
	http.HandleFunc("/proxchat", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	server := &http.Server{
		Addr: addr,
		ReadHeaderTimeout: 3 * time.Second,
	}
	log.Printf("Listening at %s...\n", addr)
	err := server.ListenAndServe()
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
