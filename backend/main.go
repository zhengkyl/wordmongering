package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/base64"
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

	staticDir := os.Getenv("STATIC_DIR")
	dbPath := os.Getenv("DB_PATH")

	db, err := setupDB(dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	pepperBytes := make([]byte, 24)
	_, err = rand.Read(pepperBytes)
	if err != nil {
		return err
	}

	api, err := newApiHandler(db, staticDir, base64.StdEncoding.EncodeToString(pepperBytes))
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/solves/{day}", rateLimitMiddleware(api.handleGetSolves, 100))
	mux.Handle("POST /api/solves/{day}", rateLimitMiddleware(api.handlePostSolves, 10))
	mux.Handle("POST /api/reports", rateLimitMiddleware(api.handlePostMissingWord, 10))
	mux.Handle("/", newSpaHandler(staticDir))

	var handler http.Handler = mux
	handler = logMiddleware(handler)

	port := os.Getenv("PORT")

	server := &http.Server{
		Addr:         ":" + port,
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
