FROM golang:1.26.1-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

FROM alpine:3.21

RUN adduser -D -u 1001 appuser && \
    apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/server .
RUN chown appuser:appuser /app/server

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:4000/healthz || exit 1

CMD ["./server"]
