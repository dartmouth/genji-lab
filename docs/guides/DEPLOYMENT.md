# Production Deployment Guide

**Project:** Genji Document Annotation Platform  
**Last Updated:** October 22, 2025

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL/TLS Setup](#ssltls-setup)
9. [Docker Production Deployment](#docker-production-deployment)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

---

## Deployment Overview

Genji supports multiple deployment strategies:

### Option 1: Traditional Deployment
- **Backend:** Uvicorn/Gunicorn on production server
- **Frontend:** Nginx serving static files
- **Database:** External PostgreSQL instance
- **Reverse Proxy:** Nginx for both frontend and API

### Option 2: Docker Deployment
- **All Services:** Containerized with Docker Compose
- **Orchestration:** Docker Swarm or Kubernetes (optional)
- **Scaling:** Multi-container replicas

### Recommended Architecture

```
Internet
    ↓
[Load Balancer / CDN]
    ↓
[Nginx Reverse Proxy]
    ↓
    ├─→ [Frontend] (React SPA) - Port 80/443
    │
    └─→ [Backend] (FastAPI) - Port 8000
            ↓
        [PostgreSQL] - Port 5432
```

---

## Prerequisites

### System Requirements

- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **CPU:** 2+ cores (4+ recommended)
- **RAM:** 4GB minimum (8GB+ recommended)
- **Disk:** 20GB+ available space
- **Network:** Public IP with ports 80, 443 open

### Software Requirements

```bash
# Required
- Python 3.10+
- PostgreSQL 15+
- Node.js 18+ (for building frontend)
- Nginx 1.18+
- Git

# Optional
- Docker 20.10+ & Docker Compose 2.0+
- Certbot (for SSL certificates)
- Supervisor (process management)
```

### Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    nginx git curl build-essential

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
python3 --version    # Should be 3.10+
psql --version       # Should be 15+
node --version       # Should be 18+
nginx -v             # Should be 1.18+
```

---

## Environment Configuration

### 1. Create Application User

```bash
# Create dedicated user (security best practice)
sudo useradd -m -s /bin/bash genji
sudo usermod -aG sudo genji
sudo su - genji
```

### 2. Clone Repository

```bash
cd /home/genji
git clone https://github.com/yourusername/rc-genji.git
cd rc-genji
git checkout main  # Or your production branch
```

### 3. Environment Variables

#### Backend Environment

**File:** `api/.env`

```bash
# Database
SQLALCHEMY_DATABASE_URL=postgresql://genji_user:STRONG_PASSWORD@localhost:5432/genji_prod
DB_SCHEMA=app

# Security
SECRET_KEY=your-generated-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CAS Authentication (Dartmouth)
CAS_SERVER_URL=https://login.dartmouth.edu/cas
CAS_SERVICE_URL=https://yourdomain.com/api/auth/cas/callback
CAS_VERSION=3
CAS_AFTER_LOGIN_URL=https://yourdomain.com/dashboard

# File Uploads
UPLOAD_DIR=/home/genji/rc-genji/api/uploads
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
```

**Generate Secret Key:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Frontend Environment

**File:** `core-ui/.env.production`

```bash
VITE_API_URL=https://yourdomain.com/api
VITE_APP_TITLE=Genji Document Annotation
```

### 4. Secure Environment Files

```bash
chmod 600 api/.env
chmod 600 core-ui/.env.production
```

---

## Database Setup

### 1. Create PostgreSQL User and Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER genji_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE genji_prod OWNER genji_user;
GRANT ALL PRIVILEGES ON DATABASE genji_prod TO genji_user;

# Exit PostgreSQL
\q
```

### 2. Configure PostgreSQL

**File:** `/etc/postgresql/15/main/postgresql.conf`

```conf
# Performance tuning (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB

# Connection settings
max_connections = 100
```

**File:** `/etc/postgresql/15/main/pg_hba.conf`

```conf
# Allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

**Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 3. Run Database Migrations

```bash
cd /home/genji/rc-genji/api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Verify schema
psql -U genji_user -d genji_prod -c "\dt app.*"
```

### 4. Create Admin User

```bash
# Create seed script
cat > /home/genji/rc-genji/api/seed_admin.py << 'EOF'
from database import SessionLocal
from models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

# Check if admin exists
admin = db.query(User).filter(User.email == "admin@dartmouth.edu").first()

if not admin:
    admin = User(
        email="admin@dartmouth.edu",
        username="admin",
        hashed_password=pwd_context.hash("CHANGE_THIS_PASSWORD"),
        is_admin=True,
        is_instructor=True
    )
    db.add(admin)
    db.commit()
    print("Admin user created successfully")
else:
    print("Admin user already exists")

db.close()
EOF

# Run seed script
python seed_admin.py
```

---

## Backend Deployment

### Option 1: Uvicorn with Gunicorn (Recommended)

#### 1. Install Gunicorn

```bash
cd /home/genji/rc-genji/api
source venv/bin/activate
pip install gunicorn uvicorn[standard]
```

#### 2. Create Systemd Service

**File:** `/etc/systemd/system/genji-api.service`

```ini
[Unit]
Description=Genji FastAPI Application
After=network.target postgresql.service

[Service]
Type=notify
User=genji
Group=genji
WorkingDirectory=/home/genji/rc-genji/api
Environment="PATH=/home/genji/rc-genji/api/venv/bin"
ExecStart=/home/genji/rc-genji/api/venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/genji/access.log \
    --error-logfile /var/log/genji/error.log \
    --log-level info
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 3. Create Log Directory

```bash
sudo mkdir -p /var/log/genji
sudo chown genji:genji /var/log/genji
```

#### 4. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable genji-api
sudo systemctl start genji-api

# Check status
sudo systemctl status genji-api

# View logs
sudo journalctl -u genji-api -f
```

### Option 2: Supervisor

#### 1. Install Supervisor

```bash
sudo apt install supervisor
```

#### 2. Create Supervisor Config

**File:** `/etc/supervisor/conf.d/genji-api.conf`

```ini
[program:genji-api]
command=/home/genji/rc-genji/api/venv/bin/gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
directory=/home/genji/rc-genji/api
user=genji
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/genji/api.log
```

#### 3. Start Supervisor

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start genji-api

# Check status
sudo supervisorctl status genji-api
```

---

## Frontend Deployment

### 1. Build Production Frontend

```bash
cd /home/genji/rc-genji/core-ui

# Install dependencies
npm install

# Install additional required packages
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-router-dom

# Build for production
npm run build

# Output will be in: /home/genji/rc-genji/core-ui/dist
```

### 2. Nginx Configuration for Frontend

**File:** `/etc/nginx/sites-available/genji`

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend - Serve React SPA
    location / {
        root /home/genji/rc-genji/core-ui/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API - Proxy to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File uploads
    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3. Enable Site and Restart Nginx

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/genji /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Nginx Configuration

### Production Nginx Template

**File:** `/etc/nginx/nginx.conf`

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 2048;
    use epoll;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Include site configs
    include /etc/nginx/sites-enabled/*;
}
```

### Rate Limiting for API

```nginx
location /api/ {
    limit_req zone=api burst=20 nodelay;
    limit_conn addr 10;
    
    proxy_pass http://127.0.0.1:8000/;
    # ... other proxy settings
}
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

#### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

#### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Certbot will automatically:**
- Obtain SSL certificate
- Modify Nginx configuration
- Set up auto-renewal

#### 3. Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

### Manual SSL Configuration

**File:** `/etc/nginx/sites-available/genji` (Updated)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ... rest of configuration
}
```

---

## Docker Production Deployment

### 1. Production docker-compose.yml

**File:** `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  ui:
    build:
      context: ./core-ui
      dockerfile: Dockerfile
    container_name: genji-ui
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - genji-network

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: genji-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - SQLALCHEMY_DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - DB_SCHEMA=app
    volumes:
      - ./api/uploads:/app/uploads
    depends_on:
      - db
    networks:
      - genji-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    container_name: genji-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - genji-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  migrations:
    build:
      context: ./api
      dockerfile: Dockerfile.migrations
    container_name: genji-migrations
    environment:
      - SQLALCHEMY_DATABASE_URL=${DATABASE_URL}
      - DB_SCHEMA=app
    depends_on:
      - db
    networks:
      - genji-network

volumes:
  postgres_data:

networks:
  genji-network:
    driver: bridge
```

### 2. Deploy with Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Docker Healthchecks

Monitor container health:
```bash
docker inspect --format='{{json .State.Health}}' genji-api | jq
```

---

## Monitoring and Logging

### 1. Application Logging

**Backend Logging Configuration:**

**File:** `api/main.py`

```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            '/var/log/genji/app.log',
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

### 2. Nginx Access Logs

**Parse Nginx logs:**
```bash
# View recent access logs
sudo tail -f /var/log/nginx/access.log

# Count requests by IP
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# Find slow requests
sudo awk '$NF > 1 {print $0}' /var/log/nginx/access.log
```

### 3. PostgreSQL Logging

**File:** `/etc/postgresql/15/main/postgresql.conf`

```conf
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'mod'  # Log all modifications
log_min_duration_statement = 1000  # Log queries > 1 second
```

### 4. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop

# Monitor disk I/O
sudo iotop

# Monitor network
sudo nethogs

# Check disk space
df -h

# Check memory usage
free -h
```

### 5. Application Monitoring (Optional)

Consider integrating:
- **Sentry** - Error tracking
- **Prometheus + Grafana** - Metrics and dashboards
- **ELK Stack** - Log aggregation
- **New Relic / Datadog** - APM

---

## Backup and Recovery

### 1. Database Backup

#### Automated Daily Backup

**File:** `/home/genji/scripts/backup_db.sh`

```bash
#!/bin/bash

BACKUP_DIR="/home/genji/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="genji_prod"
DB_USER="genji_user"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/genji_${DATE}.dump"

# Compress backup
gzip "$BACKUP_DIR/genji_${DATE}.dump"

# Delete backups older than 30 days
find $BACKUP_DIR -name "genji_*.dump.gz" -mtime +30 -delete

echo "Backup completed: genji_${DATE}.dump.gz"
```

**Make executable:**
```bash
chmod +x /home/genji/scripts/backup_db.sh
```

**Add to crontab:**
```bash
crontab -e

# Add line:
0 2 * * * /home/genji/scripts/backup_db.sh >> /var/log/genji/backup.log 2>&1
```

#### Restore from Backup

```bash
# Restore from compressed backup
gunzip -c /home/genji/backups/genji_20250122_020000.dump.gz | pg_restore -U genji_user -d genji_prod -c
```

### 2. Application Files Backup

```bash
# Backup uploads directory
rsync -avz /home/genji/rc-genji/api/uploads/ /backup/location/uploads/

# Backup configuration
cp /home/genji/rc-genji/api/.env /backup/location/.env.backup
```

### 3. Disaster Recovery Plan

1. **Regular Backups:** Daily automated database backups
2. **Off-site Storage:** Copy backups to remote location (S3, etc.)
3. **Test Restores:** Quarterly test restoration procedures
4. **Documentation:** Keep recovery procedures up-to-date
5. **Monitoring:** Alert on backup failures

---

## Troubleshooting

### API Won't Start

```bash
# Check logs
sudo journalctl -u genji-api -n 100

# Test manually
cd /home/genji/rc-genji/api
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Check database connection
psql -U genji_user -d genji_prod -c "SELECT 1;"
```

### Frontend Not Loading

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify build files exist
ls -la /home/genji/rc-genji/core-ui/dist/

# Check permissions
sudo chown -R www-data:www-data /home/genji/rc-genji/core-ui/dist/
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Test connection
psql -U genji_user -h localhost -d genji_prod

# Check pg_hba.conf
sudo cat /etc/postgresql/15/main/pg_hba.conf
```

### High CPU/Memory Usage

```bash
# Check running processes
htop

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check Nginx worker processes
ps aux | grep nginx

# Restart services if needed
sudo systemctl restart genji-api
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

---

## Security Checklist

- [ ] Strong passwords for database user
- [ ] `.env` files have restricted permissions (600)
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key-based authentication (no password auth)
- [ ] Regular system updates
- [ ] SSL/TLS enabled with strong ciphers
- [ ] HSTS headers configured
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Application logging enabled
- [ ] File upload directory secured
- [ ] CORS properly configured
- [ ] Admin credentials changed from defaults

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_users_email ON app.users(email);
CREATE INDEX idx_documents_created_by ON app.documents(created_by);

-- Analyze tables
ANALYZE app.users;
ANALYZE app.documents;

-- Vacuum database
VACUUM ANALYZE;
```

### 2. Gunicorn Workers

Calculate optimal workers:
```
workers = (2 x num_cores) + 1
```

For 4 cores:
```bash
--workers 9
```

### 3. Nginx Caching

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Cache API responses (careful with dynamic content)
location /api/public/ {
    proxy_cache_valid 200 10m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
}
```

---

## Related Documentation

- [Development Setup](DEVELOPMENT_SETUP.md) - Local setup guide ✅
- [Docker Guide](DOCKER_GUIDE.md) - Docker reference ✅
- [System Architecture](../architecture/SYSTEM_OVERVIEW.md) - Architecture overview ✅
- [Database Schema](../database/SCHEMA.md) - Database documentation ✅

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Maintainers:** Dartmouth ITC Genji Team
