package www

import (
	"github.com/gorilla/websocket"
	"github.com/mono83/geos"
	"log"
	"net/http"
	"time"
)

type Handler struct {
	*geos.Router
}

var upgrader = websocket.Upgrader{} // use default options

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

type WebsocketTransport struct {
	c  *websocket.Conn
	ch chan *geos.Packet
}

func (w *WebsocketTransport) IsAlive() bool {
	return w.c != nil
}

func (w *WebsocketTransport) Send(packet *geos.Packet) {
	w.ch <- packet
}

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
