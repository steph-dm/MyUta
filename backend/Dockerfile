# syntax=docker/dockerfile:1

# --- build ----------------------------------------------------------------------------
# Keep the Go version in line with go.mod; bump the patch release regularly
# (Dependabot opens PRs for this image).
FROM golang:1.26.11-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# --- runtime --------------------------------------------------------------------------
# Distroless: no shell, no package manager; runs as an unprivileged user and
# includes CA certificates for the YouTube / Anthropic / SMTP connections.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /out/server /out/migrate /app/
USER nonroot:nonroot
EXPOSE 4000

# The server checks itself (there is no wget/curl in the image).
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD ["/app/server", "-healthcheck"]

# Migrations run on start unless RUN_MIGRATIONS=false; to run them as a
# separate deploy step use:  /app/migrate up
ENTRYPOINT ["/app/server"]
