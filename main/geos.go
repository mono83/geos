package main

import (
	"fmt"
	"github.com/mono83/geos"
	"github.com/mono83/geos/udp"
	"github.com/mono83/geos/www"
	"net/http"
	"os"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Println("Usage:   ./geos <udp bind> <http bind>")
		fmt.Println("Example: ./geos :5001 :8085")
		os.Exit(1)
	}

	// Configure
	udpBind := os.Args[1]
	httpBind := os.Args[2]

	// Building router
	r := &geos.Router{}
	r.Init()

	// Starting UDP server
	err := udp.Start(udpBind, 0, r.HandleBytes)
	if err != nil {
		panic(err)
	}

	fmt.Println("gEOS service started")
	fmt.Printf(" + UDP binding: %s\n", udpBind)

	// Starting HTTP server
	fmt.Printf(" + HTTP server: %s\n", httpBind)
	panic(http.ListenAndServe(httpBind, www.Handler{Router: r}))
}
