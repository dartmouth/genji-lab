# Genji Project Documentation

Welcome to the Genji documentation! This directory contains comprehensive documentation for developers, contributors, and maintainers.

---

## 📚 Documentation Index

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

### 📖 Guides
- **[Development Setup](guides/DEVELOPMENT_SETUP.md)** - Local and Docker setup guide
- **[Docker Guide](guides/DOCKER_GUIDE.md)** - Docker reference and best practices
- **[Deployment](guides/DEPLOYMENT.md)** - Production deployment guide

### 🔍 Code Quality & Audits
- **[Backend Audit](audits/BACKEND_AUDIT.md)** - Backend code analysis: 33 issues identified (0 critical, 6 high, 15 medium, 12 low)
- **[Frontend Audit](audits/FRONTEND_AUDIT.md)** - Frontend code analysis: 36 issues identified (0 critical, 8 high, 17 medium, 11 low)
- **[Deprecated Code Audit](audits/DEPRECATED_CODE_AUDIT.md)** - Code cleanup analysis: 18 items requiring action

---

## 🚀 Quick Links

### Getting Started
1. Read the [Root README](../README.md) for project overview
2. Follow [Development Setup](guides/DEVELOPMENT_SETUP.md) to get running
3. Review [Architecture Overview](architecture/SYSTEM_OVERVIEW.md) to understand the system

### For Backend Developers
1. [API Overview](api/OVERVIEW.md) - Understand the FastAPI structure
2. [Database Schema](database/SCHEMA.md) - Learn the database models
3. [Router Modules](api/OVERVIEW.md#router-modules) - Explore API endpoints

### For Frontend Developers
1. [Frontend Overview](frontend/OVERVIEW.md) - React app structure
2. [Redux Store](frontend/REDUX_STORE.md) - State management patterns
3. [Component Architecture](frontend/OVERVIEW.md#component-architecture) - Component patterns

### For DevOps
1. [Docker Guide](guides/DOCKER_GUIDE.md) - Container setup
2. [Deployment](guides/DEPLOYMENT.md) - Production deployment
3. [Database Migrations](database/MIGRATIONS.md) - Schema management

---

## 🔍 Finding What You Need

### By Role
- **New Developer**: Start with [README](../README.md) → [Dev Setup](guides/DEVELOPMENT_SETUP.md) → [Architecture Overview](architecture/SYSTEM_OVERVIEW.md)
- **Backend Developer**: [API docs](api/OVERVIEW.md) → [Data Models](database/SCHEMA.md) → [Routers](api/OVERVIEW.md#routers)
- **Frontend Developer**: [Frontend Overview](frontend/OVERVIEW.md) → [Redux Store](frontend/REDUX_STORE.md) → [Components](frontend/OVERVIEW.md#component-architecture)
- **DevOps/SRE**: [Docker Guide](guides/DOCKER_GUIDE.md) → [Deployment](guides/DEPLOYMENT.md) → [Database](database/SCHEMA.md)
- **Contributor**: [Backend Audit](audits/BACKEND_AUDIT.md) → [Frontend Audit](audits/FRONTEND_AUDIT.md) → [Dev Setup](guides/DEVELOPMENT_SETUP.md)

### By Task
- **Setting up locally**: [Development Setup](guides/DEVELOPMENT_SETUP.md)
- **Adding an API endpoint**: [Router Modules](api/OVERVIEW.md#router-modules) and [API Endpoints](api/OVERVIEW.md#api-endpoints-summary)
- **Creating a React component**: [Component Architecture](frontend/OVERVIEW.md#component-architecture)
- **Database migration**: [Migrations](database/MIGRATIONS.md)
- **Understanding auth flow**: [Authentication System](api/OVERVIEW.md#authentication-system)
- **Deploying to production**: [Deployment](guides/DEPLOYMENT.md)

### By Technology
- **FastAPI**: [API Overview](api/OVERVIEW.md)
- **React**: [Frontend Overview](frontend/OVERVIEW.md)
- **Redux**: [Redux Store](frontend/REDUX_STORE.md)
- **PostgreSQL**: [Database Schema](database/SCHEMA.md)
- **Docker**: [Docker Guide](guides/DOCKER_GUIDE.md)

---

**Documentation maintained by**: Dartmouth ITC Team