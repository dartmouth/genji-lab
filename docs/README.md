# Genji Project Documentation

Welcome to the Genji documentation! This directory contains comprehensive documentation for developers, contributors, and maintainers.

> **🚀 New here?** Start with the [Quick Start Guide](QUICK_START.md) to get up and running in minutes!

---

## 📚 Documentation Index

### ⚡ Quick Start
- **[Quick Start Guide](QUICK_START.md)** - Get started in under 10 minutes (all user roles)

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

### 👥 User Guides
- **[User Guide](guides/USER_GUIDE.md)** - General platform overview for all users
- **[Student Guide](guides/STUDENT_GUIDE.md)** - Guide for students using Genji
- **[Instructor Guide](guides/INSTRUCTOR_GUIDE.md)** - Classroom management and teaching guide
- **[Administrator Guide](guides/ADMIN_GUIDE.md)** - System administration guide
- **[Annotations Guide](guides/ANNOTATIONS_GUIDE.md)** - Comprehensive annotation features and best practices

### 🔍 Code Quality & Audits
- **[Backend Audit](audits/BACKEND_AUDIT.md)** - Backend code analysis: 33 issues identified (0 critical, 6 high, 15 medium, 12 low)
- **[Frontend Audit](audits/FRONTEND_AUDIT.md)** - Frontend code analysis: 36 issues identified (0 critical, 8 high, 17 medium, 11 low)
- **[Deprecated Code Audit](audits/DEPRECATED_CODE_AUDIT.md)** - Code cleanup analysis: 18 items requiring action

---

## 🚀 Quick Links

### ⚡ Fastest Path (New Users)
1. **[Quick Start Guide](QUICK_START.md)** - Get running in 5-10 minutes (choose your role)
2. Then explore role-specific guides for complete details

### Getting Started (Developers)
1. **[Quick Start - Developer Path](QUICK_START.md#-developer-quick-start)** - Run locally in 10 minutes
2. Then: [Development Setup](DEVELOPMENT_SETUP.md) for comprehensive setup
3. Review [Architecture Overview](architecture/SYSTEM_OVERVIEW.md) to understand the system

### Getting Started (Users)
1. **[Quick Start Guide](QUICK_START.md)** - Choose your role (student/instructor/admin)
2. Then: [User Guide](guides/USER_GUIDE.md) for complete platform overview
3. Explore role-specific guides: [Student](guides/STUDENT_GUIDE.md) | [Instructor](guides/INSTRUCTOR_GUIDE.md) | [Admin](guides/ADMIN_GUIDE.md)

### For Backend Developers
1. [API Overview](api/OVERVIEW.md) - Understand the FastAPI structure
2. [Database Schema](database/SCHEMA.md) - Learn the database models
3. [Router Modules](api/OVERVIEW.md#router-modules) - Explore API endpoints

### For Frontend Developers
1. [Frontend Overview](frontend/OVERVIEW.md) - React app structure
2. [Redux Store](frontend/REDUX_STORE.md) - State management patterns
3. [Component Architecture](frontend/OVERVIEW.md#component-architecture) - Component patterns

### For DevOps
1. [Docker Guide](DOCKER_GUIDE.md) - Container setup
2. [Deployment](DEPLOYMENT.md) - Production deployment
3. [Database Migrations](database/MIGRATIONS.md) - Schema management

### For Users
- **Students**: **[Quick Start](QUICK_START.md#-student-quick-start)** → [Student Guide](guides/STUDENT_GUIDE.md) → [Annotations Guide](guides/ANNOTATIONS_GUIDE.md)
- **Instructors**: **[Quick Start](QUICK_START.md#-instructor-quick-start)** → [Instructor Guide](guides/INSTRUCTOR_GUIDE.md) → [Annotations Guide](guides/ANNOTATIONS_GUIDE.md)
- **Administrators**: **[Quick Start](QUICK_START.md#-administrator-quick-start)** → [Administrator Guide](guides/ADMIN_GUIDE.md) → [User Guide](guides/USER_GUIDE.md)

---

## 🔍 Finding What You Need

### By Role
- **New Developer**: **[Quick Start](QUICK_START.md#-developer-quick-start)** → [Dev Setup](DEVELOPMENT_SETUP.md) → [Architecture Overview](architecture/SYSTEM_OVERVIEW.md)
- **Backend Developer**: [API docs](api/OVERVIEW.md) → [Data Models](database/SCHEMA.md) → [Routers](api/OVERVIEW.md#routers)
- **Frontend Developer**: [Frontend Overview](frontend/OVERVIEW.md) → [Redux Store](frontend/REDUX_STORE.md) → [Components](frontend/OVERVIEW.md#component-architecture)
- **DevOps/SRE**: [Docker Guide](DOCKER_GUIDE.md) → [Deployment](DEPLOYMENT.md) → [Database](database/SCHEMA.md)
- **Contributor**: [Backend Audit](audits/BACKEND_AUDIT.md) → [Frontend Audit](audits/FRONTEND_AUDIT.md) → [Dev Setup](DEVELOPMENT_SETUP.md)
- **New User**: **[Quick Start](QUICK_START.md)** → Role-specific guide → [Annotations Guide](guides/ANNOTATIONS_GUIDE.md)

### By Task (Development)
- **Setting up locally**: [Development Setup](DEVELOPMENT_SETUP.md)
- **Adding an API endpoint**: [Router Modules](api/OVERVIEW.md#router-modules) and [API Endpoints](api/OVERVIEW.md#api-endpoints-summary)
- **Creating a React component**: [Component Architecture](frontend/OVERVIEW.md#component-architecture)
- **Running with Docker**: [Docker Guide](DOCKER_GUIDE.md)
- **Deploying to production**: [Deployment](DEPLOYMENT.md)

### By Task (Usage)
- **Learning to annotate**: [Annotations Guide](guides/ANNOTATIONS_GUIDE.md)
- **Setting up a classroom**: [Instructor Guide - Classroom Management](guides/INSTRUCTOR_GUIDE.md#classroom-management)
- **Joining a class**: [Student Guide - Joining a Classroom](guides/STUDENT_GUIDE.md#joining-a-classroom)
- **Managing users**: [Administrator Guide - User Management](guides/ADMIN_GUIDE.md#user-management)
- **Uploading documents**: [Instructor Guide - Document Management](guides/INSTRUCTOR_GUIDE.md#document-management)
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