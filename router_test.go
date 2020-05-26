package geos

import (
	"encoding/hex"
	"testing"
)

func TestDetectAndDecrypt(t *testing.T) {
	plain := "Hello, world"
	gzipped, _ := hex.DecodeString("1f8b0800000000000000f348cdc9c9d75128cf2fca490100c2a99ae70c000000")

	if string(detectAndDecrypt([]byte(plain))) != plain {
		t.Error("Plain text fail")
		t.Fail()
	}

	if string(detectAndDecrypt(gzipped)) != plain {
		t.Error("Gzip fail")
		t.Fail()
	}
}
