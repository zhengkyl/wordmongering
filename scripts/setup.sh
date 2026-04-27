#!/bin/bash
# First-time VPS setup. Run once from the project root.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${1:?Usage: setup.sh <domain>}"

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Install Caddy (if not already installed)
if ! command -v caddy &>/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# Add site to Caddyfile
HOST_CADDYFILE=/etc/caddy/Caddyfile
if ! grep -q "$DOMAIN" "$HOST_CADDYFILE" 2>/dev/null; then
  cat >> "$HOST_CADDYFILE" <<EOF

$DOMAIN {
    reverse_proxy localhost:3000
}
EOF
fi

# Start app and reload Caddy
cd "$APP_DIR"
docker compose up --build -d
caddy reload --config "$HOST_CADDYFILE"

echo "Done."
