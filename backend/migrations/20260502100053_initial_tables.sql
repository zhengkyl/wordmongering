-- +goose Up
CREATE TABLE puzzles (
    day INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle TEXT NOT NULL
);

CREATE TABLE results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_hint TEXT NOT NULL,
    day INTEGER NOT NULL REFERENCES puzzles(day),
    words TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX results_day ON results(day);

CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_hint TEXT NOT NULL,
    word TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- +goose Down
DROP TABLE reports;
DROP INDEX results_day;
DROP TABLE results;
DROP TABLE puzzles;
