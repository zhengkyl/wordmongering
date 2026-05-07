# Database backups

Configure `rclone` with your remote.

```sh
sudo apt install rclone
rclone config
```

Make `backup.sh`

```sh
#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_FILE="/tmp/wm-backup-$(date +%Y-%m-%dT%H:%M:%S).db"
BACKUP_DEST="<remote>:<bucket>"

CONTAINER=$(docker compose -f "$APP_DIR/compose.yaml" ps -q app)
docker exec "$CONTAINER" sqlite3 data/data.db ".backup /tmp/backup.db"
docker cp "$CONTAINER:/tmp/backup.db" "$BACKUP_FILE"
docker exec "$CONTAINER" rm /tmp/backup.db

rclone copy "$BACKUP_FILE" "$BACKUP_DEST"
rm "$BACKUP_FILE"
```

Setup a cron job

```sh
crontab -e

# Example runs daily at 3am server time
0 3 * * * path-to-wordmongering/backup.sh >> path-to-logs/wm-backup.log 2>&1
```
