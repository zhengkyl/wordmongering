package main

import (
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

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
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if time.Since(rl.prevReset) >= rl.window {
		clear(rl.counts)
		rl.prevReset = time.Now()
	}

	if rl.counts[ip] >= rl.limit {
		return false
	}

	rl.counts[ip]++
	return true
}

func rateLimitMiddleware(h http.HandlerFunc, rpm int) http.Handler {
	rl := &rateLimiter{
		counts:    make(map[string]int),
		prevReset: time.Now(),
		limit:     rpm,
		window:    60 * time.Second,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("X-Real-Ip")
		if !rl.allow(ip) {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		h(w, r)
	})
}
