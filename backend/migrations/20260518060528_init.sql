-- +goose Up
CREATE TABLE solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_hint TEXT NOT NULL,
    puzzle_id INTEGER NOT NULL,
    words TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX solves_puzzle_id ON solves(puzzle_id);

CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_hint TEXT NOT NULL,
    word TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- +goose Down
DROP INDEX solves_puzzle_id;
DROP TABLE solves;
DROP TABLE reports;
