package geos

import "encoding/json"

// Packet represents data packet
type Packet map[string]interface{}

func (p *Packet) ParseLogstash(bts []byte) error {
	var pkt Packet
	if err := json.Unmarshal(bts, &pkt); err != nil {
		return err
	}

	*p = pkt
	return nil
}

func (p Packet) Bytes() []byte {
	bts, _ := json.Marshal(p)
	return bts
}
