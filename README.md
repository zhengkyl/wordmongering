# Wordmongering

Try it out at [wordmongering.com](https://wordmongering.com)

![game preview](./docs/preview.png)

## TODO

- improve tui
- improve everything else

## Ideas

- snake
- spiral
- cerberus
- hydra

## Dictionary

`dictionary.txt` is based on the [Letterpress word list](https://github.com/lorenbrichter/Words). Changes after 7a08f2f are my own.

I am working on adding recent words like "looksmaxxing" and common proper nouns and proper adjectives like "Wednesday".

Also trying to reduce bad entries. It's ~60% garbage, but filtering out false positives is tedious. Goal is for `dictionary.txt` to be 1.4MB (~500kB gzipped), currently 2.8MB (~900kB gzipped).

`super25k.txt` is a semi-hand curated list of words that have a letter superset of popular words from https://www.wordfrequency.info and https://github.com/dolph/dictionary. These are words a native speaker can reasonably be expected to know and represent near-optimal plays (i.e, almost all top 25k popular words are a letter subset of some word in this list).

## Develop

Make sure to access development site via vite's port (probably localhost:5173). Api requests are proxied by vite to a different port.

```sh
make install

# This starts client (vite) and backend server.
make dev
```

## Deploy

The server listens at `localhost:2704`. It expects the `X-Real-IP` header for rate-limiting.

### Docker Compose

```sh
# Download compose.yaml
curl -O https://raw.githubusercontent.com/zhengkyl/wordmongering/refs/heads/authoritative/compose.yaml

# Start server
docker compose up -d

# Open admin tui
docker exec -it <container_id_or_name> dash
```

### From source

```sh
git clone https://github.com/zhengkyl/wordmongering

cd wordmongering

make install

make build

# Start server
make start

# Open admin tui
make start-dash
```
