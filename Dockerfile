FROM golang:1.8.3-alpine3.6

WORKDIR /go/src/github.com/mono83/geos
COPY . .

RUN apk add --no-cache make git

RUN make release && chmod a+x ./release/*

ENTRYPOINT ["./release/geos-linux64"]