# Stage 1: Build
FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY apps/api/go.mod apps/api/go.sum* ./
RUN test -f go.sum && go mod download || true

COPY apps/api/ .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api ./cmd/api

# Stage 2: Production
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
RUN adduser -D -g '' appuser

WORKDIR /app
COPY --from=builder /app/api .

USER appuser
EXPOSE 3000
CMD ["./api"]
