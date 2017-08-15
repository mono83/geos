package geos

import "encoding/json"

// Packet represents data packet
type Packet map[string]interface{}

// ParseLogstash parses incoming bytes as Logstash JSON
func (p *Packet) ParseLogstash(bts []byte) error {
	var pkt Packet
	if err := json.Unmarshal(bts, &pkt); err != nil {
		return err
	}

	*p = pkt
	return nil
}

// Bytes converts packet into JSON byte representation
func (p Packet) Bytes() []byte {
	bts, _ := json.Marshal(p)
	return bts
}
