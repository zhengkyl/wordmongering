package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

func setupDB(dbPath string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return nil, fmt.Errorf("create db dir: %w", err)
	}
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA foreign_keys=ON")

	if err := goose.SetDialect("sqlite3"); err != nil {
		return nil, err
	}
	goose.SetBaseFS(embedMigrations)
	if err := goose.Up(db, "migrations"); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}
	return db, nil
}

func run(ctx context.Context) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer cancel()

	root, ok := os.LookupEnv("ROOT")
	if !ok {
		root = ".."
	}

	db, err := setupDB(filepath.Join(root, "data/app.db"))
	if err != nil {
		return err
	}
	defer db.Close()

	api, err := newApiHandler(db, root, os.Getenv("BLOOM_FILTER_PEPPER"))
	if err != nil {
		return err
	}

	apiMux := http.NewServeMux()
	apiMux.HandleFunc("GET /api/dailies/{day}/puzzle", api.handleGetPuzzle)
	apiMux.HandleFunc("GET /api/dailies/{day}/results", api.handleGetResults)
	apiMux.HandleFunc("POST /api/dailies/{day}/results", api.handlePostResults)

	mux := http.NewServeMux()
	mux.Handle("/api/", rateLimitMiddleware(apiMux))
	mux.Handle("/", newSpaHandler(filepath.Join(root, "client/dist")))

	var handler http.Handler = mux
	handler = logMiddleware(handler)

	server := &http.Server{
		Addr:         ":3000",
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	case err := <-errCh:
		return err
	}
}

func main() {
	ctx := context.Background()
	if err := run(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
