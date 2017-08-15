package www

import (
	"github.com/gorilla/websocket"
	"github.com/mono83/geos"
	"log"
	"net/http"
	"time"
)

// Handler is HTTP handler, used to handle all incoming HTTP requests and websockets
type Handler struct {
	*geos.Router
}

var upgrader = websocket.Upgrader{} // use default options

// ServeHTTP serves incoming HTTP requests
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	addr := r.RequestURI
	if addr == "/index.htm" || addr == "/" {
		addr = "/index.html"
	}

	if addr == "/ws" {
		// Upgrading websocket
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}

		// Building transport
		wtr := &WebsocketTransport{c: c, ch: make(chan *geos.Packet)}

		// Reading
		go wtr.Deliver()

		// Registering in router
		h.Router.Register(wtr)

		// Waiting
		for wtr.IsAlive() {
			time.Sleep(time.Second)
		}

	} else if bts, err := geos.Asset("assets/" + addr[1:]); err == nil {
		w.WriteHeader(200)
		w.Write(bts)
		return
	}

	w.WriteHeader(404)
}

// WebsocketTransport is wrapper over HTTP connection and is used to forward messages to frontend
type WebsocketTransport struct {
	c  *websocket.Conn
	ch chan *geos.Packet
}

// IsAlive returns true if socket connection still alive
func (w *WebsocketTransport) IsAlive() bool {
	return w.c != nil
}

// Send sends GEOS packet to wait queue
func (w *WebsocketTransport) Send(packet *geos.Packet) {
	w.ch <- packet
}

// Deliver sends packets from wait queue to frontend
func (w *WebsocketTransport) Deliver() {
	for packet := range w.ch {
		if w.c != nil {
			if err := w.c.WriteMessage(websocket.TextMessage, packet.Bytes()); err != nil {
				log.Println(err)
				w.c.Close()
				w.c = nil
			}
		}
	}
}
