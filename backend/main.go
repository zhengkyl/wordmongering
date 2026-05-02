package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
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

	db, err := setupDB("./data/app.db")
	if err != nil {
		return err
	}
	defer db.Close()

	mux := http.NewServeMux()

	var handler http.Handler = mux
	handler = logMiddleware(handler)
	handler = rateLimitMiddleware(handler)

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

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func logMiddleware(h http.Handler) http.Handler {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		start := time.Now()

		wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		h.ServeHTTP(wrapped, r)

		slog.Debug("request",
			"start", start,
			"duration", time.Since(start),
			"ip", r.Header.Get("X-Real-Ip"),
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.status,
		)
	})
}

type rateLimiter struct {
	mu        sync.Mutex
	counts    map[string]int
	prevReset time.Time
	limit     int
	window    time.Duration
}

func (rl *rateLimiter) allow(ip string) bool {
	if time.Since(rl.prevReset) >= rl.window {
		rl.mu.Lock()
		clear(rl.counts)
		rl.mu.Unlock()
		return true
	}

	reqs, ok := rl.counts[ip]
	if ok && reqs >= rl.limit {
		return false
	}

	rl.counts[ip]++
	return true
}

func rateLimitMiddleware(h http.Handler) http.Handler {
	rl := &rateLimiter{counts: make(map[string]int), prevReset: time.Now()}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("X-Real-Ip")
		if !rl.allow(ip) {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		h.ServeHTTP(w, r)
	})
}
