#!/bin/bash
set -e

# Enable PGroonga extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pgroonga;
    SELECT extname, extversion FROM pg_extension WHERE extname = 'pgroonga';
EOSQL

echo "PGroonga extension installed successfully!"

# Optional: Performance monitoring
sed -Ei "s/^#shared_preload_libraries = ''/shared_preload_libraries = 'pg_stat_statements'/" $PGDATA/postgresql.conf
sed -Ei 's/^#log_min_duration_statement = -1/log_min_duration_statement = 1000/' $PGDATA/postgresql.conf