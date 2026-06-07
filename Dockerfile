FROM node:24-slim AS client-builder
WORKDIR /app
RUN corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client .
ARG VITE_WM_EPOCH=""
RUN VITE_WM_EPOCH="$VITE_WM_EPOCH" pnpm build

FROM golang:1.26-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend .
RUN go build -ldflags='-extldflags "-static"' -o /bin/server . && \
    go build -ldflags='-extldflags "-static"' -o /bin/dash ./cmd/dash

FROM alpine:3.20
RUN apk add --no-cache sqlite
WORKDIR /app
COPY --from=go-builder /bin/server /bin/server
COPY --from=go-builder /bin/dash /bin/dash
COPY --from=client-builder /app/dist /app/dist
ENV STATIC_DIR=/app/dist
ENV DB_PATH=/app/data/app.db
ARG PORT=2704
ENV PORT=$PORT
EXPOSE $PORT
CMD ["/bin/server"]
