# Makefile configuration
.DEFAULT_GOAL := help
.PHONY: assets clean test deps release

assets: ## Compiles assets
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling assets\033[0m"
	@go-bindata -pkg geos -o assets.go assets/...

clean: ## Clears environment
	@echo $(shell date +'%H:%M:%S') "\033[0;33mRemoving old release\033[0m"
	@mkdir -p release
	@rm -rf ./assets.go
	@rm -rf release/*

test: ## Runs unit tests
	@echo $(shell date +'%H:%M:%S') "\033[0;32mRunning unit tests\033[0m"
	@go test ./...

deps: ## Download required dependencies
	@echo $(shell date +'%H:%M:%S') "\033[0;32mDownloading dependencies\033[0m"
	@go get github.com/jteeuwen/go-bindata/...
	@go get github.com/gorilla/websocket/...

release: clean deps assets test ## Runs all release tasks
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling Linux version\033[0m"
	@GOOS="linux" GOARCH="amd64" go build -o release/geos-linux64 main/geos.go
	@echo $(shell date +'%H:%M:%S') "\033[0;32mCompiling MacOS version\033[0m"
	@GOOS="darwin" GOARCH="amd64" go build -o release/geos-darwin64 main/geos.go

help:
	@grep --extended-regexp '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
