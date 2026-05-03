FROM node:24-slim AS client-builder
WORKDIR /app
RUN corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client .
RUN pnpm build

FROM golang:1.24-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend .
RUN go build -ldflags='-extldflags "-static"' -o /bin/server . && \
    go build -ldflags='-extldflags "-static"' -o /bin/dashboard ./cmd/dashboard

FROM alpine:3.20
WORKDIR /app
COPY --from=go-builder /bin/server /bin/server
COPY --from=go-builder /bin/dashboard /bin/dashboard
COPY --from=client-builder /app/dist ./client/dist
EXPOSE 3000
ENV ROOT=/app
CMD ["/bin/server"]
