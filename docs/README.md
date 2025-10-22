# Genji Project Documentation

Welcome to the Genji documentation! This directory contains comprehensive documentation for developers, contributors, and maintainers.

---

## 📚 Documentation Index

### 📋 Planning & Strategy
- **[Documentation Plan](DOCUMENTATION_PLAN.md)** - Complete documentation strategy and roadmap

### 🏗️ Architecture
- **[System Overview](architecture/SYSTEM_OVERVIEW.md)** - ✅ Complete three-tier architecture, 12+ Mermaid diagrams
- **[Data Flow](architecture/DATA_FLOW.md)** - Request/response flows *(See SYSTEM_OVERVIEW.md)*
- **[Integration](architecture/INTEGRATION.md)** - Frontend-backend integration *(See SYSTEM_OVERVIEW.md)*
- **[Diagrams](architecture/DIAGRAMS.md)** - All architectural diagrams *(See SYSTEM_OVERVIEW.md)*

### 🔌 API Documentation
- **[API Overview](api/OVERVIEW.md)** - ✅ Complete backend architecture, routers, auth, patterns
- **[Endpoints Reference](api/ENDPOINTS.md)** - Complete API reference *(Coming Soon)*
- **[Authentication](api/AUTHENTICATION.md)** - Auth system documentation *(Coming Soon)*
- **[Routers](api/ROUTERS.md)** - Router breakdown *(Coming Soon)*
- **[Data Models](api/DATA_MODELS.md)** - SQLAlchemy models *(Coming Soon)*

### ⚛️ Frontend Documentation
- **[Frontend Overview](frontend/OVERVIEW.md)** - ✅ Complete React architecture, tech stack, features
- **[Redux Store](frontend/REDUX_STORE.md)** - ✅ Complete state management documentation
- **[Components](frontend/COMPONENTS.md)** - Component documentation *(Coming Soon)*
- **[Routing](frontend/ROUTING.md)** - React Router setup *(See OVERVIEW.md)*
- **[Features](frontend/FEATURES.md)** - Feature modules *(See OVERVIEW.md)*

### 🗄️ Database Documentation
- **[Schema Overview](database/SCHEMA.md)** - ✅ Complete ERD diagrams, all tables, JSONB fields, indexes
- **[Tables Reference](database/TABLES.md)** - ✅ Quick reference with SQL examples
- **[Relationships](database/RELATIONSHIPS.md)** - Relational mapping *(See SCHEMA.md)*
- **[Migrations](database/MIGRATIONS.md)** - ✅ Complete Alembic guide

### 📖 Guides
- **[Development Setup](guides/DEVELOPMENT_SETUP.md)** - ✅ Complete local and Docker setup guide
- **[Docker Guide](guides/DOCKER_GUIDE.md)** - ✅ Complete Docker reference and best practices
- **[Deployment](guides/DEPLOYMENT.md)** - ✅ Complete production deployment guide
- **[Common Tasks](guides/COMMON_TASKS.md)** - Development workflows *(Coming Soon)*

### 🔍 Code Audits
- **[Backend Audit](audits/BACKEND_AUDIT.md)** - ✅ Complete analysis: 33 issues identified (0 critical, 6 high, 15 medium, 12 low)
- **[Frontend Audit](audits/FRONTEND_AUDIT.md)** - ✅ Complete analysis: 36 issues identified (0 critical, 8 high, 17 medium, 11 low)
- **[Performance](audits/PERFORMANCE.md)** - Performance analysis *(Coming Soon)*
- **[Recommendations](audits/RECOMMENDATIONS.md)** - Improvement suggestions *(See audit docs)*

---

## 🚀 Quick Links

### Getting Started
1. Read the [Root README](../README.md) for project overview
2. Follow [Development Setup](guides/DEVELOPMENT_SETUP.md) to get running
3. Review [Architecture Overview](architecture/SYSTEM_OVERVIEW.md) to understand the system

### For Backend Developers
1. [API Overview](api/OVERVIEW.md) - Understand the FastAPI structure
2. [Data Models](api/DATA_MODELS.md) - Learn the database models
3. [Routers](api/ROUTERS.md) - Explore API endpoints

### For Frontend Developers
1. [Frontend Overview](frontend/OVERVIEW.md) - React app structure
2. [Redux Store](frontend/REDUX_STORE.md) - State management patterns
3. [Components](frontend/COMPONENTS.md) - Component library

### For DevOps
1. [Docker Guide](guides/DOCKER_GUIDE.md) - Container setup
2. [Deployment](guides/DEPLOYMENT.md) - Production deployment
3. [Database Migrations](database/MIGRATIONS.md) - Schema management

---

## 📊 Documentation Status

| Category | Status | Last Updated |
|----------|--------|--------------|
| Root README | ✅ Complete | Oct 22, 2025 |
| Documentation Plan | ✅ Complete | Oct 22, 2025 |
| Architecture | ✅ Complete | Oct 22, 2025 |
| API Documentation | ✅ Complete | Oct 22, 2025 |
| Frontend Documentation | ✅ Complete | Oct 22, 2025 |
| Database Documentation | ✅ Complete | Oct 22, 2025 |
| Guides | ✅ Complete | Oct 22, 2025 |
| Code Audits | ✅ Complete | Oct 22, 2025 |

**Legend:**
- ✅ Complete and reviewed
- 🟢 Complete but needs review
- 🟡 In progress
- ⚪ Planned but not started
- 🔴 Needs significant work

---

## 🤝 Contributing to Documentation

We welcome documentation contributions! When adding or updating documentation:

1. **Follow the structure** outlined in [DOCUMENTATION_PLAN.md](DOCUMENTATION_PLAN.md)
2. **Use Markdown** with proper formatting and code blocks
3. **Include diagrams** using Mermaid for visual explanations
4. **Add examples** - code samples, API calls, screenshots
5. **Update this index** when adding new documentation files
6. **Keep it current** - update docs when code changes

### Documentation Standards
- Use clear, concise language
- Include code examples with syntax highlighting
- Use Mermaid for diagrams (GitHub renders them natively)
- Cross-reference related documents
- Update the "Last Updated" date when modifying

---

## 🔍 Finding What You Need

### By Role
- **New Developer**: Start with README → Dev Setup → Architecture Overview
- **Backend Developer**: API docs → Data Models → Routers
- **Frontend Developer**: Frontend Overview → Redux Store → Components
- **DevOps/SRE**: Docker Guide → Deployment → Database
- **Contributor**: Contributing Guide → Common Tasks

### By Task
- **Setting up locally**: [Development Setup](guides/DEVELOPMENT_SETUP.md)
- **Adding an API endpoint**: [Common Tasks](guides/COMMON_TASKS.md)
- **Creating a React component**: [Components](frontend/COMPONENTS.md)
- **Database migration**: [Migrations](database/MIGRATIONS.md)
- **Understanding auth flow**: [Authentication](api/AUTHENTICATION.md)
- **Deploying to production**: [Deployment](guides/DEPLOYMENT.md)

### By Technology
- **FastAPI**: [API Overview](api/OVERVIEW.md)
- **React**: [Frontend Overview](frontend/OVERVIEW.md)
- **Redux**: [Redux Store](frontend/REDUX_STORE.md)
- **PostgreSQL**: [Database Schema](database/SCHEMA.md)
- **Docker**: [Docker Guide](guides/DOCKER_GUIDE.md)

---

## 📝 Documentation TODO

High priority documentation needed:
- [ ] Complete API endpoint documentation with examples
- [ ] Document all Redux slices and thunks
- [ ] Create database ERD diagrams
- [ ] Write development setup guide
- [ ] Document authentication flows
- [ ] Complete code audits
- [ ] Add troubleshooting guides
- [ ] Create API usage examples

See [DOCUMENTATION_PLAN.md](DOCUMENTATION_PLAN.md) for the complete roadmap.

---

## 🆘 Need Help?

If you can't find what you're looking for:
1. Check the [Root README](../README.md) for high-level overview
2. Search this documentation directory
3. Review the [API docs](http://localhost:8000/docs) (when running)
4. Open an issue on GitHub
5. Contact the development team

---

**Documentation maintained by**: Dartmouth ITC Team  
**Last Updated**: October 22, 2025
