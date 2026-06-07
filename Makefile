.PHONY: dev dash build install addword addwords

DEV_PORT ?= 3000
API_PORT ?= 2704
STATIC_DIR ?= $(CURDIR)/client/public
DB_PATH ?= $(CURDIR)/data/app.db
WM_EPOCH ?= 2026-04-27

install:
	cd client && pnpm install
	cd backend && go mod download

dev:
	trap 'kill 0' EXIT; cd client && API_PORT=$(API_PORT) VITE_WM_EPOCH="$(WM_EPOCH)" pnpm dev --port $(DEV_PORT) --host & cd backend && STATIC_DIR=$(STATIC_DIR) DB_PATH=$(DB_PATH) PORT=$(API_PORT) WM_EPOCH="$(WM_EPOCH)" go run .

dash:
	cd backend && STATIC_DIR=$(STATIC_DIR) DB_PATH=$(DB_PATH) WM_EPOCH="$(WM_EPOCH)" go run ./cmd/dash

build:
	cd client && VITE_WM_EPOCH="$(WM_EPOCH)" pnpm build
	cd backend && go build -o ../bin/server .
	cd backend && go build -o ../bin/dash ./cmd/dash

addword:
	echo "$(w)" | tr '[:lower:]' '[:upper:]' | sort -mu - $(STATIC_DIR)/words.txt -o $(STATIC_DIR)/words.txt

addwords:
	sort "$(f)" | tr '[:lower:]' '[:upper:]' | sort -mu - $(STATIC_DIR)/words.txt -o $(STATIC_DIR)/words.txt
