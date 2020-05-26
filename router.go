package geos

import (
	"bytes"
	"compress/gzip"
	"errors"
	"io/ioutil"
	"sync"
	"time"

	"github.com/mono83/romeo"
	"github.com/mono83/xray"
	"github.com/mono83/xray/args"
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

// NewRouter builds and returns router with delivery channel created
func NewRouter() *Router {
	r := &Router{
		receivers: []Receiver{},
		Delivery:  make(chan []byte),
	}

	return r
}

// GetName returns service name
func (*Router) GetName() string { return "Router" }

// GetRunLevel returns startup priority
func (*Router) GetRunLevel() romeo.RunLevel { return romeo.RunLevelBeforeMain }

// Start initializes router
func (r *Router) Start(ray xray.Ray) error {
	r.receivers = []Receiver{}
	if r.Delivery == nil {
		return errors.New("delivery channel not initialized, you should invoke NewRouter")
	}

	// Starting receivers invalidation goroutine
	go func() {
		goRay := ray.Fork().WithLogger("router")
		for {
			time.Sleep(time.Second)
			r.m.Lock()
			var nl []Receiver
			disconnected := 0
			for _, receiver := range r.receivers {
				if receiver.IsAlive() {
					nl = append(nl, receiver)
				} else {
					disconnected++
				}
			}
			r.receivers = nl
			r.m.Unlock()

			if disconnected > 0 {
				goRay.Info("Disconnected :count receivers", args.Count(disconnected))
			}
		}
	}()

	// Starting delivery goroutine
	go func() {
		goRay := ray.Fork().WithLogger("router")
		for bts := range r.Delivery {
			if len(bts) > 0 {
				// Decrypting
				bts = detectAndDecrypt(bts)

				// Parsing packet
				pkt := &Packet{}
				err := pkt.ParseLogstash(bts)
				if err != nil {
					goRay.Error("Invalid packet received - :err", args.Error{Err: err})
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
		log := xray.ROOT.Fork().WithLogger("router")
		log.Info("New receiver attached")
		r.m.Lock()
		defer r.m.Unlock()

		r.receivers = append(r.receivers, receiver)
	}
}

var gzipSig = []byte("\x1F\x8B\x08")

func detectAndDecrypt(b []byte) []byte {
	if len(b) < 3 {
		return b
	}

	if b[0] == gzipSig[0] && b[1] == gzipSig[1] && b[2] == gzipSig[2] {
		reader := bytes.NewReader(b)
		z, err := gzip.NewReader(reader)
		if err != nil {
			return b
		}
		defer z.Close()
		p, err := ioutil.ReadAll(z)
		if err == nil {
			return p
		}
	}

	return b
}
