package geos

import (
	"log"
	"sync"
	"time"
)

// Receiver describes receivers, that able to receive data
type Receiver interface {
	Send(packet *Packet)
	IsAlive() bool
}

// Router is component, used to receive and route logs
type Router struct {
	m         sync.Mutex
	receivers []Receiver
}

// Init initializes router
func (r *Router) Init() {
	r.receivers = []Receiver{}
	go func() {
		for {
			time.Sleep(time.Second)
			r.m.Lock()
			nl := []Receiver{}
			for _, receiver := range r.receivers {
				if receiver.IsAlive() {
					nl = append(nl, receiver)
				}
			}
			r.m.Unlock()
		}
	}()
}

// Register adds new receiver
func (r *Router) Register(receiver Receiver) {
	if receiver != nil {
		r.m.Lock()
		defer r.m.Unlock()

		r.receivers = append(r.receivers, receiver)
	}
}

func (r *Router) HandleBytes(bts []byte) {
	if len(bts) > 0 {
		//fmt.Println(string(bts))

		// Parsing packet
		pkt := &Packet{}
		err := pkt.ParseLogstash(bts)
		if err != nil {
			log.Print("Invalid packet received")
		} else {
			r.m.Lock()
			defer r.m.Unlock()

			for _, receiver := range r.receivers {
				receiver.Send(pkt)
			}
		}
	}
}
