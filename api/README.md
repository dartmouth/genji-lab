Steps:
1. Copy `.env_sample` to `.env`
2. Update the file using credentials for the `application` user (ask Matt)

# Alembic Migration Instructions

## Using Docker Compose

### Generate Migration
```bash
docker compose run --remove-orphans migrations revision --autogenerate -m "MIGRATION TITLE HERE"
```

### Other Common Migration Commands

#### Apply migrations (upgrade to latest)
```bash
docker compose run --remove-orphans migrations upgrade head
```

#### Rollback one migration
```bash
docker compose run --remove-orphans migrations downgrade -1
```

#### Check current migration status
```bash
docker compose run --remove-orphans migrations current
```

#### View migration history
```bash
docker compose run --remove-orphans migrations history
```

## Notes

- The `migrations` service uses `Dockerfile.migrations` from the `./api` context
- Your `./api` directory is mounted to `/app` in the container
- Generated migration files will appear in your local `./api/alembic/versions/` directory
- The container uses `alembic` as the entrypoint, so you only need to specify the command arguments