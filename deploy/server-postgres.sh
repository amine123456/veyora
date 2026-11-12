#!/bin/sh
# One-time PostgreSQL setup for Veyora on the server (run as root). Safe to re-run.
#   - installs PostgreSQL, listening on localhost only, tuned for a small shared server
#   - creates the "veyora" role and database, and writes DATABASE_URL into /opt/proxora/.env
#   - installs a nightly compressed backup in /var/backups/veyora (14 days kept)
set -eu
ENV_FILE=/opt/proxora/.env
BACKUP_DIR=/var/backups/veyora

command -v psql >/dev/null 2>&1 && pg_lsclusters -h 2>/dev/null | grep -q . || apt-get install -y postgresql
VERSION="$(pg_lsclusters -h | awk 'NR==1 {print $1}')"

cat > "/etc/postgresql/$VERSION/main/conf.d/veyora.conf" <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 64MB
work_mem = 4MB
maintenance_work_mem = 32MB
EOF
systemctl enable postgresql >/dev/null
systemctl restart postgresql

as_postgres() { su postgres -c "psql -v ON_ERROR_STOP=1 -Atqc \"$1\""; }

if ! grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  PASSWORD="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  if [ "$(as_postgres "SELECT 1 FROM pg_roles WHERE rolname = 'veyora'")" = "1" ]; then
    as_postgres "ALTER ROLE veyora PASSWORD '$PASSWORD'"
  else
    as_postgres "CREATE ROLE veyora LOGIN PASSWORD '$PASSWORD'"
  fi
  printf '\nDATABASE_URL=postgres://veyora:%s@127.0.0.1:5432/veyora\n' "$PASSWORD" >> "$ENV_FILE"
  echo "DATABASE_URL written to $ENV_FILE"
fi
[ "$(as_postgres "SELECT 1 FROM pg_database WHERE datname = 'veyora'")" = "1" ] || as_postgres "CREATE DATABASE veyora OWNER veyora"

install -d -m 700 -o postgres -g postgres "$BACKUP_DIR"
cat > /etc/cron.d/veyora-backup <<EOF
# Nightly Veyora database backup, 14 days kept.
17 3 * * * postgres pg_dump veyora | gzip > $BACKUP_DIR/veyora-\$(date +\%F).sql.gz && find $BACKUP_DIR -name 'veyora-*.sql.gz' -mtime +14 -delete
EOF
chmod 644 /etc/cron.d/veyora-backup

echo "PostgreSQL $VERSION ready: database 'veyora' on 127.0.0.1:5432, nightly backups in $BACKUP_DIR"
