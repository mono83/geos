package geos

import (
	"github.com/mono83/romeo"
	"github.com/mono83/xray"
	"log"
	"sync"
	"time"
)

// Receiver describes receivers, that able to receive data
type Receiver interface {
	Channel() chan<- *Packet
	IsAlive() bool
}

// Router is component, used to receive and route logs
type Router struct {
	m         sync.Mutex
	receivers []Receiver
	Delivery  chan []byte
}

// GetName returns service name
func (*Router) GetName() string { return "Router" }

// GetRunLevel returns startup priority
func (*Router) GetRunLevel() romeo.RunLevel { return romeo.RunLevelBeforeMain }

// Start initializes router
func (r *Router) Start(ray xray.Ray) error {
	r.receivers = []Receiver{}
	if r.Delivery == nil {
		r.Delivery = make(chan []byte)
	}

	// Starting receivers invalidation goroutine
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

	// Starting delivery goroutine
	go func() {
		for bts := range r.Delivery {
			if len(bts) > 0 {
				// Parsing packet
				pkt := &Packet{}
				err := pkt.ParseLogstash(bts)
				if err != nil {
					log.Print("Invalid packet received")
				} else {
					r.m.Lock()
					for _, receiver := range r.receivers {
						receiver.Channel() <- pkt
					}
					r.m.Unlock()
				}
			}
		}
	}()
	return nil
}

// Stop closes delivery channel on router
func (r *Router) Stop(ray xray.Ray) error {
	close(r.Delivery)
	return nil
}

// Register adds new receiver
func (r *Router) Register(receiver Receiver) {
	if receiver != nil {
		r.m.Lock()
		defer r.m.Unlock()

		r.receivers = append(r.receivers, receiver)
	}
}
