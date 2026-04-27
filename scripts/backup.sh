#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_FILE="/tmp/wm-backup-$(date +%Y%m%d-%H%M%S).db"
B2_DEST="b2:your-bucket-name/wordmongering"

CONTAINER=$(docker compose -f "$APP_DIR/docker-compose.yml" ps -q app)
docker exec "$CONTAINER" sqlite3 data/data.db ".backup /tmp/backup.db"
docker cp "$CONTAINER:/tmp/backup.db" "$BACKUP_FILE"

rclone copy "$BACKUP_FILE" "$B2_DEST"
rm "$BACKUP_FILE"
