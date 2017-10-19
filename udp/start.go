package udp

import (
	"errors"
	"net"
)

// Start starts plain UDP listener service
func Start(bind string, size int, byteCh chan<- []byte) error {
	if size == 0 {
		size = 1024 * 8
	}

	if bind == "" {
		return errors.New("empty UDP address")
	}
	address, err := net.ResolveUDPAddr("udp", bind)
	if err != nil {
		return err
	}

	socket, err := net.ListenUDP("udp", address)
	if err != nil {
		return err
	}

	running := true
	// Listener
	go func() {
		for running {
			buf := make([]byte, size)
			rlen, _, err := socket.ReadFromUDP(buf)
			if err != nil {
				// Connection error
			} else {
				// Sending data to listening channel
				byteCh <- buf[0:rlen]
			}
		}
	}()

	return nil
}
