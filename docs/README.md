# Genji Project Documentation

Welcome to the Genji documentation! This directory contains comprehensive documentation for developers, contributors, and maintainers.

> **🚀 New here?** Start with the [Quick Start Guide](QUICK_START.md) to get up and running in minutes!

---

## 📚 Documentation Index

### ⚡ Quick Start
- **[Quick Start Guide](QUICK_START.md)**

### 🏗️ Architecture
- **[System Overview](architecture/SYSTEM_OVERVIEW.md)** - Three-tier architecture review
- **[Data Flow Diagrams](architecture/SYSTEM_OVERVIEW.md#data-flow)** - Document loading, annotation, search flows
- **[Integration Points](architecture/SYSTEM_OVERVIEW.md#integration-points)** - Frontend-backend integration patterns
- **[Deployment Architecture](architecture/SYSTEM_OVERVIEW.md#deployment-architecture)** - Docker, production deployment diagrams
- **[Network Architecture](architecture/SYSTEM_OVERVIEW.md#network-architecture)** - Network topology and communication

### 🔌 API Documentation
- **[API Overview](api/OVERVIEW.md)** - Backend architecture, routers, auth, patterns
- **[Endpoints Reference](api/OVERVIEW.md#api-endpoints-summary)** - API endpoint reference
- **[Authentication](api/OVERVIEW.md#authentication-system)** - Dual auth system (CAS + local password)
- **[Routers](api/OVERVIEW.md#router-modules)** - Router organization and patterns
- **[Data Models](api/OVERVIEW.md#database-models)** - SQLAlchemy models and schema

### ⚛️ Frontend Documentation
- **[Frontend Overview](frontend/OVERVIEW.md)** - React architecture, tech stack, features
- **[Redux Store](frontend/REDUX_STORE.md)** - State management documentation

### 🗄️ Database Documentation
- **[Schema Overview](database/SCHEMA.md)** - ERD diagrams, all tables, JSONB fields, indexes
- **[Tables Reference](database/TABLES.md)** - Quick reference with SQL examples
- **[Migrations](database/MIGRATIONS.md)** - Alembic guide

### 📖 Setup & Deployment Guides
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Local and Docker setup guide
- **[Docker Guide](DOCKER_GUIDE.md)** - Docker reference and best practices
- **[Deployment](DEPLOYMENT.md)** - Production deployment guide

### 🔍 Code Quality & Audits
- **[Backend Audit](audits/BACKEND_AUDIT.md)** - Backend code analysis: 33 issues identified (0 critical, 6 high, 15 medium, 12 low)
- **[Frontend Audit](audits/FRONTEND_AUDIT.md)** - Frontend code analysis: 36 issues identified (0 critical, 8 high, 17 medium, 11 low)
- **[Deprecated Code Audit](audits/DEPRECATED_CODE_AUDIT.md)** - Code cleanup analysis: 18 items requiring action
