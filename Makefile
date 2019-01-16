# Makefile configuration
.DEFAULT_GOAL := help
.PHONY: assets clean test deps release cross

assets: ## Compiles assets
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling assets\033[0m"
	@go-bindata -pkg geos -o assets.go assets/...

clean: ## Clears environment
	@echo $(shell date +'%H:%M:%S') "\033[0;33mRemoving old release\033[0m"
	@mkdir -p release
	@rm -rf ./assets.go
	@rm -rf release/*

dev: deps ## Prepares dev-environment
	@echo $(shell date +'%H:%M:%S') "\033[0;32mPreparing assets for development mode\033[0m"
	@go-bindata -debug -pkg geos -o assets.go assets/...
	@echo $(shell date +'%H:%M:%S') "\033[0;32mStarting application on dev settings\033[0m"
	@go run main/geos.go :5001 :8085

test: ## Runs unit tests
	@echo $(shell date +'%H:%M:%S') "\033[0;32mRunning unit tests\033[0m"
	@CGO_ENABLED=0 go test ./...

deps: ## Download required dependencies
	@echo $(shell date +'%H:%M:%S') "\033[0;32mDownloading dependencies\033[0m"
	@go get github.com/jteeuwen/go-bindata/...
	@go get github.com/gorilla/websocket/...
	@go get github.com/spf13/cobra
	@go get github.com/mono83/romeo	

release: clean deps assets test ## Builds binary and run tests
	go build -o release/geos main/geos.go

cross: clean deps assets test ## Builds cross-OS binaries and run tests
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling Linux version\033[0m"
	@GOOS="linux" GOARCH="amd64" go build -a -o release/geos-linux64 main/geos.go
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling MacOS version\033[0m"
	@GOOS="darwin" GOARCH="amd64" go build -o release/geos-darwin64 main/geos.go
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling Windows version\033[0m"
	@GOOS="windows" GOARCH="386" go build -o release/geos.exe main/geos.go

help:
	@grep --extended-regexp '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
