#!/usr/bin/env bash
# Restore schema/data from backup.sql into the self-hosted Supabase Postgres.
# Usage: ./scripts/restore-schema.sh /path/to/backup.sql
set -euo pipefail

BACKUP_FILE="${1:-backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file not found: $BACKUP_FILE"
  exit 1
fi

CONTAINER="supabase-db"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: container '$CONTAINER' is not running. Run install.sh first."
  exit 1
fi

echo "Restoring $BACKUP_FILE into $CONTAINER..."
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U postgres -d postgres
echo "Done."
