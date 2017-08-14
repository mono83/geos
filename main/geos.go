package main

import (
	"fmt"
	"github.com/mono83/geos/cmd"
	"os"
)

func main() {
	if err := cmd.GeosCmd.Execute(); err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
}
