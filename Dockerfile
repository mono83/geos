FROM golang:1.11.4-alpine3.8 as builder
WORKDIR /go/src/github.com/mono83/geos
COPY . .
RUN apk add --no-cache make git && make release

FROM alpine:3.8
COPY --from=builder /go/src/github.com/mono83/geos/release/geos /geos
RUN chmod a+x /geos
EXPOSE 5001 80
CMD ["/geos", ":5001", ":80"]
