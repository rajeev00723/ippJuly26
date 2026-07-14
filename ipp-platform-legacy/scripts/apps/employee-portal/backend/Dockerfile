FROM golang:1.23-alpine3.21 AS builder
WORKDIR /app
RUN apk upgrade --no-cache
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o employee-backend .

FROM alpine:3.21
RUN apk --no-cache upgrade && \
    apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S -G appgroup appuser
WORKDIR /app
COPY --from=builder /app/employee-backend .
RUN chmod +x /app/employee-backend && chown appuser:appgroup /app/employee-backend
USER appuser
EXPOSE 8080
CMD ["/app/employee-backend"]
