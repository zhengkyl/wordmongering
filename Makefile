.PHONY: dev dev-dash build install start start-dash addword addwords

install:
	cd client && pnpm install
	cd backend && go mod download

dev:
	trap 'kill %1' EXIT; cd client && pnpm dev & cd backend && go run .

dev-dash:
	cd backend && go run cmd/dashboard/dashboard.go

build:
	cd client && pnpm build
	cd backend && go build -o ../bin/server .
	cd backend && go build -o ../bin/dashboard ./cmd/dashboard

start:
	ROOT=$(CURDIR) ./bin/server

start-dash:
	ROOT=$(CURDIR) ./bin/dashboard

addword:
	echo "$(w)" | sort -mu - client/public/dictionary.txt -o client/public/dictionary.txt

addwords:
	sort "$(f)" | sort -mu - client/public/dictionary.txt -o client/public/dictionary.txt
