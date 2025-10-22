# Genji Project Documentation Plan

**Project**: rc-genji  
**Repository**: dartmouth-itc/rc-genji  
**Documentation Start Date**: October 22, 2025  
**Current Branch**: admin

---

## 📊 Documentation Overview

This document outlines the comprehensive documentation strategy for the Genji project - a document annotation platform with FastAPI backend and React frontend.

### Goals
1. **Deep Understanding**: Comprehensive documentation of API, data models, and frontend architecture
2. **Code Quality**: Identify unused code, duplicates, and optimization opportunities
3. **Maintainability**: Establish patterns and practices for future development
4. **Onboarding**: Enable new developers to quickly understand and contribute to the codebase

### Audience
- Primary: Software engineers on the project team
- Secondary: External contributors and future maintainers

---

## 📁 Documentation Structure

```
docs/
├── DOCUMENTATION_PLAN.md          # This file - overall strategy
├── api/                           # Backend API documentation
│   ├── OVERVIEW.md               # API architecture overview
│   ├── ENDPOINTS.md              # Complete endpoint reference
│   ├── AUTHENTICATION.md         # Auth flows (CAS + local)
│   ├── ROUTERS.md                # Router-by-router breakdown
│   └── DATA_MODELS.md            # SQLAlchemy models explained
├── frontend/                      # Frontend documentation
│   ├── OVERVIEW.md               # React app architecture
│   ├── COMPONENTS.md             # Component hierarchy & usage
│   ├── REDUX_STORE.md            # Store structure, slices, thunks
│   ├── ROUTING.md                # React Router setup
│   └── FEATURES.md               # Feature-by-feature breakdown
├── database/                      # Database documentation
│   ├── SCHEMA.md                 # Database schema overview
│   ├── TABLES.md                 # Table-by-table documentation
│   ├── RELATIONSHIPS.md          # Foreign keys & relationships
│   └── MIGRATIONS.md             # Alembic migration guide
├── architecture/                  # System architecture
│   ├── SYSTEM_OVERVIEW.md        # High-level architecture
│   ├── DATA_FLOW.md              # Request/response flows
│   ├── INTEGRATION.md            # Frontend ↔ Backend integration
│   └── DIAGRAMS.md               # All Mermaid diagrams
├── guides/                        # How-to guides
│   ├── DEVELOPMENT_SETUP.md      # Local dev environment
│   ├── DOCKER_GUIDE.md           # Docker/compose usage
│   ├── DEPLOYMENT.md             # Production deployment
│   └── COMMON_TASKS.md           # Frequent development tasks
└── audits/                        # Code audit reports
    ├── BACKEND_AUDIT.md          # API code analysis
    ├── FRONTEND_AUDIT.md         # React code analysis
    ├── PERFORMANCE.md            # Performance findings
    └── RECOMMENDATIONS.md        # Improvement suggestions
```

---

## 🎯 Phase 1: Foundation Documentation

**Priority**: HIGH  
**Timeline**: Weeks 1-2  
**Status**: 🟡 In Progress

### 1.1 Root README.md
- [ ] Project description and purpose
- [ ] Tech stack overview (FastAPI, React, PostgreSQL, Docker)
- [ ] Quick start guide (Docker Compose)
- [ ] High-level architecture diagram
- [ ] Link to detailed docs
- [ ] Basic contribution guidelines

### 1.2 API Documentation
- [ ] **api/OVERVIEW.md**: API architecture, patterns, conventions
- [ ] **api/ENDPOINTS.md**: Complete endpoint reference with examples
- [ ] **api/AUTHENTICATION.md**: CAS auth flow, local auth, session management
- [ ] **api/ROUTERS.md**: Detailed breakdown of each router file
  - annotations.py
  - auth.py / cas_auth.py
  - documents.py / document_collections.py / document_elements.py
  - flags.py
  - groups.py
  - roles.py
  - search.py
  - site_settings.py
  - users.py
- [ ] **api/DATA_MODELS.md**: SQLAlchemy model documentation
  - User, UserPassword, Role, Permission
  - Document, DocumentCollection, DocumentElement
  - Annotation, AnnotationBody, AnnotationTarget
  - Group, ObjectSharing
  - Flags, SiteSettings

### 1.3 Frontend Documentation
- [ ] **frontend/OVERVIEW.md**: React architecture, folder structure, conventions
- [ ] **frontend/COMPONENTS.md**: Component hierarchy and responsibilities
  - AppHeader, AuthContext, ErrorBoundary
  - LoginForm, RegisterForm
  - Admin components (AdminPanel, ManageClassrooms, etc.)
  - Document components (DocumentGallery, DocumentViewer, etc.)
  - Annotation components
- [ ] **frontend/REDUX_STORE.md**: Complete Redux documentation
  - Store structure
  - Slices breakdown (13+ slices)
  - Thunks and async operations
  - Selectors and derived state
- [ ] **frontend/ROUTING.md**: React Router setup and route structure
- [ ] **frontend/FEATURES.md**: Feature modules
  - Admin panel
  - Document gallery
  - Document viewer
  - Search
  - Annotations

### 1.4 Database Documentation
- [ ] **database/SCHEMA.md**: Schema overview with ERD diagram
- [ ] **database/TABLES.md**: Table-by-table documentation
- [ ] **database/RELATIONSHIPS.md**: Foreign keys, joins, associations
- [ ] **database/MIGRATIONS.md**: Alembic workflow and best practices

### 1.5 Architecture Documentation
- [ ] **architecture/SYSTEM_OVERVIEW.md**: Full system architecture
- [ ] **architecture/DATA_FLOW.md**: Request/response flows with diagrams
- [ ] **architecture/INTEGRATION.md**: Frontend-backend integration patterns
- [ ] **architecture/DIAGRAMS.md**: Collection of all Mermaid diagrams
  - System architecture diagram
  - Authentication flow
  - Annotation creation flow
  - Document upload flow
  - Search flow

---

## 🔍 Phase 2: Code Audit & Analysis

**Priority**: HIGH  
**Timeline**: Weeks 2-3  
**Status**: ⚪ Not Started

### 2.1 Backend Audit (api/)
- [ ] **Unused Code Analysis**
  - Unused imports across all files
  - Dead functions/classes never called
  - Unreferenced models or schema definitions
  - Old/deprecated code (e.g., old_api.py)
- [ ] **Code Duplication**
  - Duplicate validation logic
  - Repeated database queries
  - Similar endpoint patterns
- [ ] **Organization Issues**
  - Inconsistent error handling
  - Mixed concerns in routers
  - Large files that should be split
- [ ] **Dependencies**
  - Unused requirements in requirements.txt
  - Missing type hints
  - Inconsistent use of Pydantic schemas

### 2.2 Frontend Audit (core-ui/)
- [ ] **Unused Code Analysis**
  - Unused React components
  - Dead Redux slices/actions
  - Unused imports in TS/TSX files
  - Orphaned utility functions
- [ ] **Code Duplication**
  - Duplicate API calls
  - Repeated component patterns
  - Similar hooks
- [ ] **Organization Issues**
  - Large component files
  - Redux state that could be local state
  - Inconsistent styling approaches
  - Type definition issues
- [ ] **Dependencies**
  - Unused npm packages
  - Outdated dependencies
  - Missing types (@types packages)

### 2.3 Cross-Cutting Analysis
- [ ] **API-Frontend Alignment**
  - Unused API endpoints
  - Frontend code for non-existent endpoints
  - Type mismatches between frontend and backend
- [ ] **Data Flow Analysis**
  - Map complete data flow for each feature
  - Identify bottlenecks or inefficiencies
- [ ] **Test Coverage**
  - Areas lacking tests
  - Opportunities for integration tests

### 2.4 Audit Reports
- [ ] **audits/BACKEND_AUDIT.md**: Complete backend findings
- [ ] **audits/FRONTEND_AUDIT.md**: Complete frontend findings
- [ ] **audits/PERFORMANCE.md**: Performance analysis and recommendations
- [ ] **audits/RECOMMENDATIONS.md**: Prioritized improvement suggestions

---

## 📚 Phase 3: User & Developer Guides

**Priority**: MEDIUM  
**Timeline**: Weeks 3-4  
**Status**: ⚪ Not Started

### 3.1 Development Guides
- [ ] **guides/DEVELOPMENT_SETUP.md**
  - Prerequisites (Python, Node, Docker)
  - Environment configuration (.env setup)
  - Database initialization
  - Running locally (with and without Docker)
  - Common troubleshooting
- [ ] **guides/DOCKER_GUIDE.md**
  - Docker Compose services explained
  - Building and running containers
  - Volume mounts and hot reload
  - Database migrations in Docker
- [ ] **guides/COMMON_TASKS.md**
  - Adding a new API endpoint
  - Creating a new React component
  - Adding a database model
  - Running migrations
  - Debugging techniques

### 3.2 Deployment Guides
- [ ] **guides/DEPLOYMENT.md**
  - Production environment setup
  - Environment variables reference
  - Database backup/restore
  - Monitoring and logging
  - Security considerations

### 3.3 Feature Documentation
- [ ] Document major features from user perspective
  - Document annotation workflow
  - Classroom management
  - User roles and permissions
  - Search functionality
  - Document collections

---

## 🌐 Phase 4: GitHub Wiki (Optional)

**Priority**: LOW  
**Timeline**: Week 5+  
**Status**: ⚪ Not Started

- [ ] Convert core documentation to Wiki format
- [ ] Add troubleshooting pages
- [ ] Create FAQ section
- [ ] Add visual screenshots/demos
- [ ] Create API playground examples

---

## 🛠️ Documentation Standards

### Markdown Conventions
- Use ATX-style headers (`#` not `===`)
- Include table of contents for long documents
- Use code blocks with language specification
- Use Mermaid for diagrams (GitHub native support)

### Diagram Standards
- **System Architecture**: C4 model approach (Context, Container, Component)
- **Data Flow**: Sequence diagrams
- **Database**: ERD diagrams
- **State Management**: State machine diagrams where applicable

### Code Examples
- Include realistic, working examples
- Show both request and response for API endpoints
- Include error handling examples
- Document common edge cases

### File Naming
- Use UPPERCASE.md for major documentation files
- Use lowercase-with-hyphens.md for supporting docs
- Keep filenames descriptive and specific

---

## 📊 Progress Tracking

### Week 1-2: Foundation
- [x] Documentation structure created
- [x] Documentation plan established
- [ ] Root README.md
- [ ] API overview documentation
- [ ] Frontend overview documentation
- [ ] Database schema documentation
- [ ] System architecture diagrams

### Week 2-3: Deep Dive & Audit
- [ ] Complete API documentation
- [ ] Complete frontend documentation
- [ ] Backend code audit
- [ ] Frontend code audit
- [ ] Performance analysis

### Week 3-4: Guides & Polish
- [ ] Development setup guide
- [ ] Docker guide
- [ ] Common tasks guide
- [ ] Deployment guide
- [ ] Review and refine all docs

### Week 4+: Maintenance
- [ ] GitHub Wiki setup (optional)
- [ ] Continuous updates as code changes
- [ ] Team review and feedback incorporation

---

## 🎯 Success Metrics

1. **Completeness**: All major systems and features documented
2. **Clarity**: New developers can set up and understand project in <2 hours
3. **Accuracy**: Documentation matches current codebase (not stale)
4. **Actionable**: Code audit leads to tangible improvements
5. **Maintainable**: Documentation structure is easy to update

---

## 📝 Notes & Decisions

### Technology Choices
- **FastAPI**: Auto-generates OpenAPI docs at `/docs` endpoint
- **React + Redux**: Complex state management requires detailed documentation
- **PostgreSQL**: Schema-based approach (app schema) needs careful documentation
- **Docker Compose**: Simplifies local development setup

### Key Areas Requiring Deep Documentation
1. **Authentication**: Dual system (CAS + local) is complex
2. **Annotations**: Core feature with complex data model
3. **Permissions**: Role-based access control needs clarity
4. **Redux Store**: 13+ slices require comprehensive documentation
5. **Document Processing**: Upload and parsing workflows

### Questions to Answer During Documentation
- [ ] What is the purpose of the `old_api.py` file?
- [ ] Are all API endpoints being used by the frontend?
- [ ] What is the data/doc_processing.ipynb notebook for?
- [ ] Are there unused routers or models?
- [ ] What's the difference between groups and classrooms?
- [ ] How do flags work in the system?

---

## 🔄 Maintenance Plan

1. **Update Documentation**: Any code change should update relevant docs
2. **Monthly Review**: Check for stale documentation
3. **New Feature Documentation**: Must be written as features are added
4. **Audit Updates**: Quarterly code audits to keep codebase clean

---

## 👥 Contributors

- Documentation initiated: October 22, 2025
- Primary documenter: Team
- Review process: Peer review before merge

---

**Last Updated**: October 22, 2025  
**Next Review Date**: November 22, 2025
