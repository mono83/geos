package udp

import (
	"errors"
	"github.com/mono83/xray"
	"github.com/mono83/xray/args"
	"net"
)

// Service is service, used to receive Logstash-formatted UDP packets
type Service struct {
	Bind   string
	Size   int
	ByteCh chan<- []byte
	socket *net.UDPConn
}

// GetName returns service name
func (Service) GetName() string { return "UDP server" }

// Start starts plain UDP listener service
func (u *Service) Start(ray xray.Ray) error {
	if u.Size == 0 {
		u.Size = 1024 * 8
	}

	if u.Bind == "" {
		return errors.New("empty UDP address")
	}
	address, err := net.ResolveUDPAddr("udp", u.Bind)
	if err != nil {
		return err
	}

	u.socket, err = net.ListenUDP("udp", address)
	if err != nil {
		return err
	}

	// Listener
	go func() {
		goRay := ray.Fork().WithLogger("udp-listener")
		var skt = u.socket
		for skt != nil {
			buf := make([]byte, u.Size)
			rlen, _, err := skt.ReadFromUDP(buf)
			if err != nil {
				// Connection error
				goRay.Error("UDP error :err", args.Error{Err: err})
			} else {
				// Sending data to listening channel
				u.ByteCh <- buf[0:rlen]
			}
			skt = u.socket
		}
		goRay.Info("UDP listener done")
	}()

	return nil
}

// Stop stops UDP service
func (u *Service) Stop(ray xray.Ray) error {
	err := u.socket.Close()
	u.socket = nil
	return err
}
