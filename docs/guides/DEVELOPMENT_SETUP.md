# Development Setup Guide

**Project:** Genji Document Annotation Platform  
**Last Updated:** October 22, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Docker** | 20.10+ | Container runtime |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Git** | 2.0+ | Version control |
| **PostgreSQL** | 15+ | Database (if running locally) |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 20 LTS | Frontend development without Docker |
| **Python** | 3.10-3.12 | Backend development without Docker |
| **VS Code** | Latest | Recommended IDE |

### System Requirements

- **OS:** Windows 10/11, macOS 11+, Linux (Ubuntu 20.04+)
- **RAM:** Minimum 8GB (16GB recommended)
- **Disk:** 10GB free space
- **Network:** Internet connection for package downloads

---

## Quick Start

### Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/dartmouth-itc/rc-genji.git
cd rc-genji

# 2. Configure environment variables
cp api/.env_sample api/.env
# Edit api/.env with your database connection string

# 3. Start all services
docker-compose up

# 4. Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development (Without Docker)

```bash
# 1. Clone repository
git clone https://github.com/dartmouth-itc/rc-genji.git
cd rc-genji

# 2. Setup backend
cd api
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
pip install -r requirements.txt
cp .env_sample .env
# Edit .env with database URL

# 3. Run database migrations
alembic upgrade head

# 4. Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. Setup frontend (new terminal)
cd ../core-ui
npm install
npm run dev
```

---

## Detailed Setup

### 1. Clone the Repository

```bash
git clone https://github.com/dartmouth-itc/rc-genji.git
cd rc-genji
```

**Project Structure:**
```
rc-genji/
├── api/              # Backend (FastAPI)
├── core-ui/          # Frontend (React)
├── docs/             # Documentation
└── docker-compose.yml
```

### 2. Backend Setup (API)

#### Install Python Dependencies

```bash
cd api

# Create virtual environment
python -m venv env

# Activate virtual environment
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Key Dependencies
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `psycopg2-binary` - PostgreSQL adapter
- `alembic` - Database migrations
- `python-docx` - Word document processing
- `passlib[bcrypt]` - Password hashing
- `python-jose[cryptography]` - JWT tokens

### 3. Frontend Setup (UI)

```bash
cd core-ui

# Install dependencies
npm install

# Dependencies installed:
# - react@19.0.0
# - react-router-dom@7.6.2
# - @reduxjs/toolkit@2.6.1
# - @mui/material@6.4.11
# - axios@1.8.2
# - typescript@5.7.2
# - vite@6.2.0
```

### 4. Database Setup

#### Option A: Use Docker PostgreSQL

```bash
# Add PostgreSQL to docker-compose.yml
services:
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

```bash
docker-compose up db
```

#### Option B: Install PostgreSQL Locally

**Windows:**
```powershell
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and schema
CREATE DATABASE genji;
\c genji
CREATE SCHEMA app;

# Exit
\q
```

---

## Environment Configuration

### Backend Environment Variables

**File:** `api/.env`

```bash
# Database Connection
SQLALCHEMY_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/genji"

# Database Schema
DB_SCHEMA=app

# Session Secret (generate with: openssl rand -hex 32)
SECRET_KEY="your-secret-key-here-change-in-production"

# CAS Authentication
CAS_SERVER_URL="https://login.dartmouth.edu/cas"
CAS_SERVICE_URL="http://localhost:5173"

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR="./uploads"

# Environment
ENVIRONMENT=development  # or 'production'
```

### Frontend Environment Variables

**File:** `core-ui/.env` (optional)

```bash
# API URL (defaults to /api/v1 via Vite proxy)
VITE_API_URL=http://localhost:8000

# CAS Configuration
VITE_CAS_SERVER_URL=https://login.dartmouth.edu/cas
```

### Generating Secret Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Or using OpenSSL
openssl rand -hex 32
```

---

## Database Setup

### Initialize Schema with Alembic

```bash
cd api

# Ensure virtual environment is activated
source env/bin/activate  # Windows: env\Scripts\activate

# Run migrations
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> abc123, Initial schema
INFO  [alembic.runtime.migration] Running upgrade abc123 -> def456, Add classrooms
```

### Verify Database

```bash
psql -U postgres -d genji -c "\dt app.*"
```

**Expected Tables:**
```
             List of relations
 Schema |        Name        | Type  |  Owner   
--------+--------------------+-------+----------
 app    | users              | table | postgres
 app    | documents          | table | postgres
 app    | annotations        | table | postgres
 app    | collections        | table | postgres
 app    | classrooms         | table | postgres
 app    | roles              | table | postgres
 app    | permissions        | table | postgres
 app    | site_settings      | table | postgres
 app    | groups             | table | postgres
 app    | object_sharing     | table | postgres
 app    | document_elements  | table | postgres
```

### Seed Initial Data (Optional)

```bash
# Create admin user
python -c "
from models.models import User, Role
from database import SessionLocal, engine
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Create admin role
admin_role = Role(name='admin', description='Administrator')
db.add(admin_role)
db.commit()

# Create admin user
admin_user = User(
    username='admin',
    first_name='Admin',
    last_name='User',
    email='admin@example.com',
    is_active=True
)
db.add(admin_user)
db.commit()

# Add role to user
admin_user.roles.append(admin_role)
db.commit()
print('Admin user created: username=admin')
"
```

---

## Running the Application

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up --build
```

**Services Started:**
- **ui** - Frontend dev server on http://localhost:5173
- **api** - Backend API server on http://localhost:8000
- **migrations** - Runs and exits

### Using Local Development Servers

#### Start Backend

```bash
cd api
source env/bin/activate  # Windows: env\Scripts\activate

# Development mode (with auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### Start Frontend

```bash
cd core-ui

# Development mode (with HMR)
npm run dev

# Build for production
npm run build
npm run preview
```

**Output:**
```
  VITE v6.2.0  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h + enter to show help
```

### Verify Installation

1. **Frontend:** http://localhost:5173
   - Should see Genji login page
   
2. **Backend API:** http://localhost:8000
   - Should see `{"message": "Welcome to Genji API"}`
   
3. **API Documentation:** http://localhost:8000/docs
   - Interactive Swagger UI
   
4. **Alternative API Docs:** http://localhost:8000/redoc
   - ReDoc documentation

---

## Development Workflow

### Hot Reload (Development Mode)

Both frontend and backend support hot reload:

**Backend (FastAPI with Uvicorn):**
- Edit any Python file in `api/`
- Server automatically reloads
- See changes immediately

**Frontend (React with Vite):**
- Edit any file in `core-ui/src/`
- Browser updates via Hot Module Replacement (HMR)
- State preserved when possible

### Code Quality Tools

#### Backend (Python)

```bash
cd api

# Run linting
flake8 .

# Format code
black .

# Type checking
mypy .

# Run tests (when available)
pytest
```

#### Frontend (TypeScript)

```bash
cd core-ui

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Run tests (when available)
npm test
```

### Database Migrations

#### Create New Migration

```bash
cd api

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Create empty migration for manual edits
alembic revision -m "Description of changes"
```

#### Apply Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade to specific revision
alembic upgrade abc123

# Downgrade one revision
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/my-new-feature

# Create Pull Request on GitHub
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:**
```
Error: Address already in use (port 8000)
```

**Solution:**
```bash
# Find process using port
# Windows:
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# macOS/Linux:
lsof -i :8000
kill -9 <process_id>

# Or use different port
uvicorn main:app --port 8001
```

#### 2. Database Connection Failed

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solutions:**
- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Verify database exists: `psql -U postgres -l`
- Check PostgreSQL logs

#### 3. Module Not Found (Python)

**Error:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Ensure virtual environment is activated
source env/bin/activate  # Windows: env\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### 4. npm Install Fails

**Error:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Use legacy peer deps if needed
npm install --legacy-peer-deps
```

#### 5. CORS Errors in Browser

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
- Verify Vite proxy configuration in `core-ui/vite.config.ts`
- Check FastAPI CORS middleware in `api/main.py`
- Ensure backend URL is correct

#### 6. Migration Conflicts

**Error:**
```
alembic.util.exc.CommandError: Multiple head revisions found
```

**Solution:**
```bash
# View branches
alembic branches

# Merge heads
alembic merge heads -m "Merge migration branches"

# Upgrade
alembic upgrade head
```

#### 7. Permission Denied on Uploads

**Error:**
```
PermissionError: [Errno 13] Permission denied: './uploads'
```

**Solution:**
```bash
# Create uploads directory
mkdir -p api/uploads

# Set permissions (Linux/macOS)
chmod 755 api/uploads

# Or configure different directory in .env
UPLOAD_DIR="/path/to/writable/directory"
```

### Debug Mode

#### Backend Debug

```python
# In api/main.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Frontend Debug

```typescript
// In core-ui/src/main.tsx, add:
console.log('Environment:', import.meta.env);

// In Redux store:
export const store = configureStore({
  reducer: rootReducer,
  devTools: true,  // Enable Redux DevTools
});
```

### Getting Help

1. **Check Logs:**
   ```bash
   # Docker Compose logs
   docker-compose logs -f api
   docker-compose logs -f ui
   
   # Application logs
   tail -f api/logs/app.log
   ```

2. **Check Documentation:**
   - [API Documentation](../api/OVERVIEW.md)
   - [Frontend Documentation](../frontend/OVERVIEW.md)
   - [Database Schema](../database/SCHEMA.md)

3. **GitHub Issues:**
   - Search existing issues: https://github.com/dartmouth-itc/rc-genji/issues
   - Create new issue with:
     - Environment details (OS, versions)
     - Steps to reproduce
     - Error messages
     - Expected vs actual behavior

---

## Next Steps

After successful setup:

1. **Read Documentation:**
   - [System Architecture](../architecture/SYSTEM_OVERVIEW.md)
   - [Frontend Overview](../frontend/OVERVIEW.md)
   - [API Overview](../api/OVERVIEW.md)

2. **Review Code Audits:**
   - [Backend Audit](../audits/BACKEND_AUDIT.md) - 33 issues identified
   - [Frontend Audit](../audits/FRONTEND_AUDIT.md) - 36 issues identified

3. **Explore the Application:**
   - Create test user account
   - Upload sample document
   - Create annotations
   - Set up test classroom

4. **Start Developing:**
   - Pick an issue from the audits
   - Create feature branch
   - Make changes with hot reload
   - Submit pull request

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Maintainers:** Dartmouth ITC Genji Team
