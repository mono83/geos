FROM golang:1.8.3-alpine3.6

WORKDIR /go/src/github.com/mono83/geos
COPY . .

RUN apk add --virtual .build-deps --no-cache make git && \
    make release && chmod a+x ./release/* && \    
    mkdir /app && \
    cp ./release/geos-linux64 /app && \
    apk del .build-deps && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    rm -rf /go && \
    rm -rf /usr/local/go

ENTRYPOINT ["/app/geos-linux64"]