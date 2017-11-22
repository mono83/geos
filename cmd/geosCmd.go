package cmd

import (
	"errors"
	"github.com/mono83/geos"
	"github.com/mono83/geos/udp"
	"github.com/mono83/geos/www"
	"github.com/mono83/romeo/server"
	"github.com/mono83/romeo/services/xhttp"
	"github.com/mono83/xray"
	aa "github.com/mono83/xray/args"
	"github.com/spf13/cobra"
)

// GeosCmd is main GEOS command-line command
var GeosCmd = &cobra.Command{
	Use:   "geos [udpHost]:udpPort [httpHost]:httpPort",
	Short: "Starts UDP listener, that forwards data to websocket frontend",
	RunE: func(cmd *cobra.Command, args []string) error {
		if len(args) != 2 {
			return errors.New("both bindings must be supplied, example: ./geos :5001 :8085")
		}

		// Configure
		udpBind := args[0]
		httpBind := args[1]
		xray.BOOT.Info("Incoming Logstash UDP listening port is :port", aa.String{N: "port", V: udpBind})
		xray.BOOT.Info("HTTP websocket server listening port is :port", aa.String{N: "port", V: httpBind})

		// Building application server
		srv := &server.Server{}

		// Building router
		r := &geos.Router{}
		srv.Register(r)

		// Building UDP server
		srv.Register(&udp.Service{Bind: udpBind, Size: 0, ByteCh: r.Delivery})

		// Building HTTP server
		srv.Register(&xhttp.Service{
			Bind:    httpBind,
			Name:    "HTTP service",
			Handler: &www.Handler{Router: r},
		})

		if err := srv.Start(nil); err != nil {
			return err
		}

		srv.Join()
		return nil
	},
}
