Steps:
1. Copy `.env_sample` to `.env`
2. Update the file using credentials for the `application` user (ask Matt)

# Authentication

The API supports three coexisting auth methods: username/password, CAS, and
OIDC (Microsoft Entra ID). Each is independent; enabling one does not affect
the others.

## OIDC (Entra ID)

Server-side Authorization Code flow via Authlib. Configure with these env
vars (see `.env_sample`):

- `OIDC_ENABLED` — toggle (`true`/`false`)
- `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` — app registration credentials
- `OIDC_DISCOVERY_URL` — Entra `.../v2.0/.well-known/openid-configuration`
- `OIDC_REDIRECT_URI` — must exactly match a registered redirect URI
- `OIDC_SCOPES` — requested scopes (default `openid profile email`)
- `OIDC_POST_LOGIN_REDIRECT` / `OIDC_POST_ERROR_REDIRECT` — SPA paths
- `OIDC_BUTTON_LABEL` — login button label for the SPA

Endpoints: `GET /api/v1/oauth2/login`, `GET /api/v1/oauth2/callback`,
`GET /api/v1/oauth2/config/public`. Logout reuses `POST /api/v1/auth/logout`.

Users are matched by email (`mail` claim) and auto-provisioned with the
`general_user` role on first login. Disable OIDC by setting
`OIDC_ENABLED=false`; no schema changes are involved, so rollback is
config-only.

## Tests

```bash
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests
```


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