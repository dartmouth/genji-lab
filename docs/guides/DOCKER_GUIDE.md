# Docker Guide

**Project:** Genji Document Annotation Platform

---

## Table of Contents

1. [Docker Overview](#docker-overview)
2. [Docker Compose Configuration](#docker-compose-configuration)
3. [Container Details](#container-details)
4. [Docker Commands](#docker-commands)
5. [Volume Management](#volume-management)
6. [Networking](#networking)
7. [Production Docker Setup](#production-docker-setup)
8. [Troubleshooting](#troubleshooting)

---

## Docker Overview

Genji uses **Docker Compose** to orchestrate three services:
- **ui** - React frontend development server (Vite)
- **api** - FastAPI backend server (Uvicorn)
- **migrations** - Database migration runner (Alembic)

### Benefits of Docker

✅ **Consistent Environments** - Same setup across dev, staging, production  
✅ **Easy Setup** - Single command to start entire stack  
✅ **Isolated Dependencies** - No conflicts with system packages  
✅ **Reproducible Builds** - Docker images ensure consistency  
✅ **Easy Cleanup** - Remove containers without affecting host

---

## Docker Compose Configuration

### File Structure

```
rc-genji/
├── docker-compose.yml          # Service orchestration
├── api/
│   ├── Dockerfile              # Production API image
│   ├── Dockerfile.migrations   # Migration runner image
│   └── requirements.txt
└── core-ui/
    ├── Dockerfile              # Production UI image
    ├── Dockerfile.dev          # Development UI image
    ├── package.json
    └── nginx.conf
```

### docker-compose.yml

**File:** `docker-compose.yml`

```yaml
services:
  ui:
    build:
      context: ./core-ui
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"           # Vite dev server
    volumes:
      - ./core-ui/src:/app/src                    # Hot reload
      - ./core-ui/vite.config.ts:/app/vite.config.ts
    environment:
      - NODE_ENV=development
    depends_on:
      - api

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"           # FastAPI server
    volumes:
      - ./api:/app            # Hot reload
    environment:
      - ENVIRONMENT=development
      - SQLALCHEMY_DATABASE_URL=${DATABASE_URL}
      - DB_SCHEMA=app
    depends_on:
      - db

  migrations:
    build:
      context: ./api
      dockerfile: Dockerfile.migrations
    volumes:
      - ./api:/app
    environment:
      - SQLALCHEMY_DATABASE_URL=${DATABASE_URL}
      - DB_SCHEMA=app
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: genji
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Container Details

### UI Container (Frontend)

**Dockerfile:** `core-ui/Dockerfile.dev`

```dockerfile
FROM node:lts-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
RUN npm install react-router-dom

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Key Features:**
- **Node.js LTS Alpine** - Lightweight base image (~40MB)
- **Hot Module Replacement** - Source code mounted as volume
- **Host Binding** - `--host 0.0.0.0` allows external access
- **Port 5173** - Vite default dev server port

**Build Command:**
```bash
docker build -t genji-ui-dev -f Dockerfile.dev .
```

**Run Command:**
```bash
docker run -p 5173:5173 -v $(pwd)/src:/app/src genji-ui-dev
```

### API Container (Backend)

**Dockerfile:** `api/Dockerfile`

```dockerfile
FROM python:3.10-slim

# System updates
RUN apt update -qq && apt upgrade -y

WORKDIR /app

# Install Python dependencies
COPY requirements.txt requirements.txt
RUN /usr/local/bin/python -m pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose API port
EXPOSE 8000

# Copy application code
COPY . .

# Start Uvicorn with auto-reload
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
```

**Key Features:**
- **Python 3.10 Slim** - Minimal Python image (~120MB)
- **Auto-reload** - `--reload` flag enables hot reload
- **All Interfaces** - `--host 0.0.0.0` binds to all IPs
- **Port 8000** - FastAPI default port

**Build Command:**
```bash
docker build -t genji-api .
```

**Run Command:**
```bash
docker run -p 8000:8000 -v $(pwd):/app -e SQLALCHEMY_DATABASE_URL="..." genji-api
```

### Migrations Container

**Dockerfile:** `api/Dockerfile.migrations`

```dockerfile
FROM python:3.10-slim

RUN apt update -qq && apt upgrade -y

WORKDIR /app

# Install dependencies (includes Alembic)
COPY requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy migration scripts
COPY . .

# Run migrations on container start
CMD ["alembic", "upgrade", "head"]
```

**Key Features:**
- **One-time Run** - Executes migrations and exits
- **Alembic CLI** - Uses `alembic upgrade head`
- **Idempotent** - Safe to run multiple times

**Manual Migration:**
```bash
docker-compose run migrations alembic upgrade head
```

---

## Docker Commands

### Basic Commands

```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild containers
docker-compose up --build

# Rebuild specific service
docker-compose build ui
docker-compose up ui

# View logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Logs for specific service
docker-compose logs -f api

# Restart specific service
docker-compose restart api

# Execute command in running container
docker-compose exec api bash
docker-compose exec ui sh

# Run one-off command
docker-compose run api python -c "print('Hello')"
```

### Service Management

```bash
# Start specific service
docker-compose up ui

# Stop specific service
docker-compose stop api

# Remove stopped containers
docker-compose rm

# List running containers
docker-compose ps

# Show container resource usage
docker stats
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi genji-api

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

### Debugging

```bash
# View container logs
docker logs <container_id>

# Inspect container
docker inspect <container_id>

# Container shell access
docker exec -it <container_id> bash

# View container processes
docker top <container_id>

# View container resource usage
docker stats <container_id>
```

---

## Volume Management

### Volume Types

#### 1. Named Volumes (Persistent Data)

```yaml
volumes:
  postgres_data:     # Declared at bottom of docker-compose.yml
  
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Location:**
- **Linux:** `/var/lib/docker/volumes/`
- **Windows:** `\\wsl$\docker-desktop-data\data\docker\volumes\`
- **macOS:** `~/Library/Containers/com.docker.docker/Data/vms/0/`

**Commands:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect rc-genji_postgres_data

# Remove volume
docker volume rm rc-genji_postgres_data

# Remove unused volumes
docker volume prune
```

#### 2. Bind Mounts (Development)

```yaml
services:
  api:
    volumes:
      - ./api:/app                        # Full directory
      - ./api/main.py:/app/main.py        # Single file
```

**Purpose:** Hot reload during development

**Caveats:**
- Files on host synced to container
- Permissions may differ between host and container
- Performance impact on macOS/Windows

### Backup and Restore

#### Backup PostgreSQL Volume

```bash
# Create backup
docker-compose exec db pg_dump -U postgres genji > backup.sql

# Or backup entire volume
docker run --rm \
  -v rc-genji_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data
```

#### Restore PostgreSQL

```bash
# Restore from SQL dump
docker-compose exec -T db psql -U postgres genji < backup.sql

# Or restore volume
docker run --rm \
  -v rc-genji_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

---

## Networking

### Docker Network

Docker Compose creates a default network for all services:

```
Network: rc-genji_default (bridge driver)
```

**Service DNS Resolution:**
- Services can reach each other by service name
- `api` can connect to `db` via `postgres://postgres@db:5432/genji`
- `ui` proxies to `api` via `http://api:8000`

### Port Mapping

| Service | Internal Port | Host Port | Protocol |
|---------|---------------|-----------|----------|
| ui | 5173 | 5173 | HTTP |
| api | 8000 | 8000 | HTTP |
| db | 5432 | 5432 | TCP |

### Network Commands

```bash
# List networks
docker network ls

# Inspect network
docker network inspect rc-genji_default

# View connected containers
docker network inspect rc-genji_default | grep Name
```

### Custom Network Configuration

```yaml
services:
  api:
    networks:
      - backend
      - frontend
  
  db:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

---

## Production Docker Setup

### Production UI Dockerfile

**File:** `core-ui/Dockerfile` (Production)

```dockerfile
# Build stage
FROM node:lts-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install @types/node
COPY . .
RUN npm run build              # Creates /app/dist

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Multi-stage Build:**
- **Stage 1:** Build React app with Vite
- **Stage 2:** Serve with Nginx (final image ~25MB)

### Production API Dockerfile

**File:** `api/Dockerfile` (Production)

```dockerfile
FROM python:3.10-slim

RUN apt update -qq && apt upgrade -y

WORKDIR /app

# Install dependencies
COPY requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy application
COPY . .

EXPOSE 8000

# Production server with multiple workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**Changes:**
- Remove `--reload` flag
- Add `--workers 4` for production
- Consider using Gunicorn instead of Uvicorn directly

### Production docker-compose.yml

```yaml
services:
  ui:
    build:
      context: ./core-ui
      dockerfile: Dockerfile    # Production build
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - SQLALCHEMY_DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

**Production Features:**
- No source code mounts
- `restart: unless-stopped` policy
- Environment variables from `.env`
- Production-optimized builds

### Health Checks

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Resource Limits

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Inspect container
docker inspect <container_id>

# Try running interactively
docker-compose run api bash
```

### Port Conflicts

```bash
# Find what's using port 8000
# Windows:
netstat -ano | findstr :8000

# macOS/Linux:
lsof -i :8000

# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Map host 8001 to container 8000
```

### Volume Permission Issues

```bash
# Linux: Match container user to host user
USER_ID=$(id -u)
GROUP_ID=$(id -g)
docker-compose run -u $USER_ID:$GROUP_ID api bash

# Or fix permissions on host
sudo chown -R $USER:$USER ./api
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove specific volumes
docker volume rm rc-genji_postgres_data
```

### Network Issues

```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up

# Check connectivity
docker-compose exec api ping db
docker-compose exec api curl http://db:5432
```

### Build Failures

```bash
# Clear build cache
docker-compose build --no-cache api

# Pull fresh base images
docker-compose pull

# Remove old images
docker rmi $(docker images -f "dangling=true" -q)
```

---

## Best Practices

### 1. Use .dockerignore

**File:** `api/.dockerignore`
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.env
*.log
.git
.gitignore
```

**File:** `core-ui/.dockerignore`
```
node_modules
npm-debug.log
.env
.git
.gitignore
dist
build
```

### 2. Multi-stage Builds

Use multi-stage builds to minimize final image size:
```dockerfile
FROM node:18 as build
# Build steps...

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### 3. Layer Caching

Order Dockerfile commands for optimal caching:
```dockerfile
# Install dependencies first (changes less often)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy source code last (changes most often)
COPY . .
```

### 4. Health Checks

Always add health checks to production containers.

### 5. Logging

Use Docker logging drivers:
```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Related Documentation

- [Development Setup](DEVELOPMENT_SETUP.md) - Local setup guide ✅
- [Production Deployment](DEPLOYMENT.md) - Production deployment *(Coming Soon)*
- [System Architecture](../architecture/SYSTEM_OVERVIEW.md) - Architecture overview ✅

---

**Maintainers:** Dartmouth ITC Genji Team
