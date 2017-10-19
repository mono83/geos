package cmd

import (
	"errors"
	"github.com/mono83/geos"
	"github.com/mono83/geos/udp"
	"github.com/mono83/geos/www"
	"github.com/spf13/cobra"
	"log"
	"net/http"
)

// GeosCmd is main GEOS command-line command
var GeosCmd = &cobra.Command{
	Use:   "geos [udpHost]:udpPort [httpHost]:httpPort",
	Short: "Starts UDP listener, that forwards data to websocket frontend",
	RunE: func(cmd *cobra.Command, args []string) error {
		if len(args) != 2 {
			return errors.New("Both bindings must be supplied, example: ./geos :5001 :8085")
		}

		// Configure
		udpBind := args[0]
		httpBind := args[1]

		// Building router
		r := &geos.Router{}
		r.Init()

		// Starting UDP server
		err := udp.Start(udpBind, 0, r.Delivery)
		if err != nil {
			return err
		}

		log.Println("gEOS service started")
		log.Printf(" + UDP binding: %s\n", udpBind)

		// Starting HTTP server
		log.Printf(" + HTTP server: %s\n", httpBind)
		return http.ListenAndServe(httpBind, www.Handler{Router: r})
	},
}
