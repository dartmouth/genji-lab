# System Architecture

**Project:** Genji Document Annotation Platform  
**Architecture:** Three-Tier Web Application  
**Last Updated:** October 22, 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Diagram](#component-diagram)
4. [Data Flow](#data-flow)
5. [Authentication Flows](#authentication-flows)
6. [Annotation Lifecycle](#annotation-lifecycle)
7. [Deployment Architecture](#deployment-architecture)
8. [Network Architecture](#network-architecture)
9. [Integration Points](#integration-points)
10. [Scalability Considerations](#scalability-considerations)

---

## System Overview

Genji is a **document annotation platform** that enables students and instructors to collaboratively annotate and discuss documents. The system follows a **three-tier architecture** with clear separation between presentation, application, and data layers.

### System Purpose

- **Document Management** - Upload, organize, and share document collections
- **Collaborative Annotation** - Students and instructors can annotate documents with various motivations (comments, scholarly notes, tags, links, citations)
- **Classroom Integration** - Support for classroom-based document sharing and annotation
- **Search & Discovery** - Full-text search across document content and annotations
- **Administration** - Manage users, roles, permissions, and content

### Key Characteristics

- **Single Page Application (SPA)** - React-based frontend
- **RESTful API** - JSON-based communication
- **Containerized** - Docker-based deployment
- **Stateless Backend** - Session management via cookies/tokens
- **Relational Database** - PostgreSQL with JSONB for flexibility

---

## High-Level Architecture

### Three-Tier Architecture

```mermaid
graph TB
    subgraph "Presentation Tier"
        Browser[Web Browser]
        React[React 19 SPA]
        Redux[Redux Store]
    end
    
    subgraph "Application Tier"
        FastAPI[FastAPI Server]
        Auth[Auth Middleware]
        Routers[12 Router Modules]
        ORM[SQLAlchemy ORM]
    end
    
    subgraph "Data Tier"
        PostgreSQL[(PostgreSQL Database)]
        Schema[App Schema]
        Tables[11 Tables]
    end
    
    subgraph "External Services"
        CAS[Dartmouth CAS Server]
    end
    
    Browser --> React
    React --> Redux
    Redux --> FastAPI
    FastAPI --> Auth
    Auth --> CAS
    Auth --> Routers
    Routers --> ORM
    ORM --> PostgreSQL
    PostgreSQL --> Schema
    Schema --> Tables
```

### Layer Responsibilities

| Layer | Technology | Responsibilities |
|-------|------------|------------------|
| **Presentation** | React 19, TypeScript, Redux Toolkit | UI rendering, state management, user interactions |
| **Application** | FastAPI, Python 3.12, SQLAlchemy | Business logic, API endpoints, authentication, data validation |
| **Data** | PostgreSQL 15+ | Data persistence, relationships, constraints, indexes |

---

## Component Diagram

### Detailed System Components

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        
        subgraph "React Application"
            B[App Component]
            C[Redux Store<br/>15 Slices]
            D[React Router<br/>7 Routes]
            E[Features]
            F[Components]
        end
    end
    
    subgraph "API Gateway"
        G[Nginx/Vite Dev Proxy]
    end
    
    subgraph "Application Layer"
        H[FastAPI Application]
        
        subgraph "Middleware"
            I[CORS Middleware]
            J[Session Middleware]
        end
        
        subgraph "Routers - 12 Modules"
            K[Authentication]
            L[Collections]
            M[Documents]
            N[Document Elements]
            O[Annotations]
            P[Search]
            Q[Users]
            R[Roles]
            S[Classrooms]
            T[Site Settings]
            U[Groups]
            V[Object Sharing]
        end
        
        subgraph "Data Access"
            W[SQLAlchemy Models<br/>11 Models]
            X[Alembic Migrations]
        end
    end
    
    subgraph "Database Layer"
        Y[(PostgreSQL)]
        
        subgraph "App Schema"
            Z1[users]
            Z2[documents]
            Z3[annotations]
            Z4[collections]
            Z5[classrooms]
            Z6[roles/permissions]
            Z7[site_settings]
        end
    end
    
    subgraph "External Services"
        AA[Dartmouth CAS<br/>login.dartmouth.edu]
    end
    
    A --> B
    B --> C
    B --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
    I --> K
    J --> K
    K --> AA
    K --> L
    L --> M
    M --> N
    N --> O
    O --> P
    P --> W
    W --> X
    X --> Y
    Y --> Z1
    Y --> Z2
    Y --> Z3
```

### Component Details

#### Frontend Components (React)
- **App** - Root component with providers (Redux, Auth, Router)
- **Redux Store** - 15 slices managing global state
- **Router** - 7 main routes with nested paths
- **Features** - 4 feature modules (admin, documentGallery, documentView, search)
- **Components** - Shared UI components

#### Backend Components (FastAPI)
- **FastAPI App** - ASGI application with automatic OpenAPI docs
- **Middleware** - CORS (allows all origins), Session management
- **Routers** - 12 modules handling different domains
- **Models** - 11 SQLAlchemy models
- **Migrations** - Alembic for schema versioning

#### Database Components (PostgreSQL)
- **11 Main Tables** - users, documents, annotations, collections, etc.
- **3 Association Tables** - user_roles, role_permissions, group_members
- **30+ Indexes** - B-tree, GIN for JSONB
- **7 JSONB Columns** - Flexible data storage

---

## Data Flow

### Request/Response Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant React
    participant Redux
    participant Axios
    participant FastAPI
    participant SQLAlchemy
    participant PostgreSQL

    User->>Browser: Interact with UI
    Browser->>React: User Action (click, type)
    React->>Redux: Dispatch Action
    Redux->>Redux: Check if data in store
    
    alt Data not in store
        Redux->>Axios: HTTP Request
        Axios->>FastAPI: GET/POST/PUT/DELETE /api/v1/*
        FastAPI->>FastAPI: Validate Request
        FastAPI->>FastAPI: Check Authentication
        FastAPI->>SQLAlchemy: Query/Mutation
        SQLAlchemy->>PostgreSQL: SQL Query
        PostgreSQL->>SQLAlchemy: Result Set
        SQLAlchemy->>FastAPI: Python Objects
        FastAPI->>FastAPI: Serialize to JSON
        FastAPI->>Axios: HTTP Response (JSON)
        Axios->>Redux: Update Store
    end
    
    Redux->>React: Re-render Components
    React->>Browser: Update DOM
    Browser->>User: Display Result
```

### Data Flow Patterns

#### 1. Document Loading Flow

```mermaid
graph LR
    A[User navigates to document] --> B[Router matches URL]
    B --> C[DocumentContentView component]
    C --> D[useEffect: dispatch fetchDocumentElements]
    D --> E[Redux Thunk]
    E --> F[GET /api/v1/documents/:id/elements]
    F --> G[Backend: fetch from DB]
    G --> H[Return paragraphs with formatting]
    H --> I[Redux: normalize into byId]
    I --> J[Selector: get elements for view]
    J --> K[HighlightedText components render]
    K --> L[User sees document]
```

#### 2. Annotation Creation Flow

```mermaid
graph TB
    A[User selects text] --> B[MouseUp event]
    B --> C[Redux: initSelection action]
    C --> D[Redux: addSelectionSegment]
    D --> E[User clicks annotation button]
    E --> F[AnnotationCreationDialog opens]
    F --> G[User types comment]
    G --> H[User clicks Save]
    H --> I[Redux: saveAnnotation thunk]
    I --> J[POST /api/v1/annotations]
    J --> K[Backend: create annotation]
    K --> L[Backend: return with ID]
    L --> M[Redux: addAnnotation action]
    M --> N[Redux: update byId and byParent]
    N --> O[Highlight overlay renders]
    O --> P[Annotation appears in sidebar]
```

#### 3. Search Flow

```mermaid
graph LR
    A[User types in search] --> B[Debounce 300ms]
    B --> C[POST /api/v1/search]
    C --> D[Backend: parse query]
    D --> E[PostgreSQL: full-text search]
    E --> F[Return results with highlights]
    F --> G[Redux: setSearchResults]
    G --> H[SearchResults component]
    H --> I[Display with context snippets]
```

### Data Transformation Pipeline

**Frontend → Backend:**
```
TypeScript Object → JSON → Python Pydantic Schema → SQLAlchemy Model → PostgreSQL Row
```

**Backend → Frontend:**
```
PostgreSQL Row → SQLAlchemy Model → Pydantic Schema → JSON → TypeScript Object → Redux Store
```

---

## Authentication Flows

### Dual Authentication System

Genji supports **two authentication methods** that share the same session mechanism.

```mermaid
graph TB
    Start[User visits app] --> Check{Has Session?}
    
    Check -->|Yes| Valid{Session Valid?}
    Check -->|No| LoginChoice{Choose Auth Method}
    
    Valid -->|Yes| App[Load Application]
    Valid -->|No| LoginChoice
    
    LoginChoice -->|CAS Login| CASFlow[CAS Authentication Flow]
    LoginChoice -->|Local Login| LocalFlow[Local Authentication Flow]
    
    CASFlow --> CASSuccess[Session Created]
    LocalFlow --> LocalSuccess[Session Created]
    
    CASSuccess --> App
    LocalSuccess --> App
    
    App --> Interact[User Interacts]
    Interact --> API{API Request}
    API --> CheckAuth{Check Session}
    CheckAuth -->|Valid| Process[Process Request]
    CheckAuth -->|Invalid| Redirect401[401 Unauthorized]
    Process --> Response[Return Response]
    Redirect401 --> LoginChoice
```

### CAS Authentication Flow (Dartmouth SSO)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant FastAPI
    participant CAS as Dartmouth CAS<br/>login.dartmouth.edu
    participant DB as PostgreSQL

    User->>Frontend: Click "CAS Login"
    Frontend->>CAS: Redirect to CAS login page<br/>(with service URL)
    CAS->>User: Display login form
    User->>CAS: Enter netid/password
    CAS->>CAS: Validate credentials
    CAS->>Frontend: Redirect to service URL<br/>(with ticket parameter)
    Frontend->>FastAPI: POST /api/v1/validate-cas-ticket<br/>{ticket, service}
    FastAPI->>CAS: Validate ticket
    CAS->>FastAPI: Return user data<br/>(netid, name, email)
    FastAPI->>DB: Find or create user<br/>(by netid)
    DB->>FastAPI: User record
    FastAPI->>FastAPI: Create session
    FastAPI->>Frontend: Set session cookie<br/>Return user data
    Frontend->>Frontend: Store auth state
    Frontend->>User: Redirect to app
```

**Key Points:**
- **Redirect-based flow** - User leaves app, returns with ticket
- **Ticket validation** - Backend validates with CAS server
- **User creation** - Auto-creates user record if first login
- **Session cookie** - HTTPOnly cookie with 1-week TTL

### Local Password Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant FastAPI
    participant DB as PostgreSQL

    User->>Frontend: Enter username/password
    Frontend->>FastAPI: POST /api/v1/auth/login<br/>{username, password}
    FastAPI->>DB: Query user by username
    DB->>FastAPI: User record (with hashed password)
    FastAPI->>FastAPI: Verify password hash
    
    alt Password valid
        FastAPI->>FastAPI: Create session
        FastAPI->>Frontend: Set session cookie<br/>Return user data
        Frontend->>Frontend: Store auth state
        Frontend->>User: Redirect to app
    else Password invalid
        FastAPI->>Frontend: 401 Unauthorized
        Frontend->>User: Show error
    end
```

**Key Points:**
- **Password hashing** - Bcrypt with salt
- **Same session mechanism** - Uses same cookie as CAS
- **Registration** - POST /api/v1/auth/register creates account

### Session Management

```mermaid
graph TB
    A[Session Created] --> B[Store in Redis/Memory]
    B --> C[Set HTTPOnly Cookie]
    C --> D[TTL: 1 week]
    
    D --> E{Every API Request}
    E --> F[Check cookie exists]
    F --> G{Cookie Valid?}
    
    G -->|Yes| H[Extract user ID]
    H --> I[Load user from DB]
    I --> J[Attach to request context]
    J --> K[Process request]
    
    G -->|No| L[Return 401]
    L --> M[Frontend redirects to login]
    
    K --> N[Return response]
    N --> E
```

**Session Data:**
```python
{
  "user_id": 123,
  "netid": "f002abc",  # CAS users
  "username": "jdoe",  # Local users
  "roles": ["student"],
  "groups": [5, 12],
  "created_at": "2025-10-22T10:00:00Z",
  "expires_at": "2025-10-29T10:00:00Z"
}
```

### Authorization Flow

```mermaid
graph TB
    A[Authenticated Request] --> B{Check Required Roles}
    
    B -->|No role required| C[Allow]
    B -->|Role required| D{User has role?}
    
    D -->|Yes| E{Check Permissions}
    D -->|No| F[403 Forbidden]
    
    E -->|Has permission| G{Check Resource Ownership}
    E -->|No permission| F
    
    G -->|Is owner| C
    G -->|Not owner| H{Check Sharing}
    
    H -->|Is shared| C
    H -->|Not shared| F
    
    C --> I[Process Request]
```

**Role Hierarchy:**
- **Admin** - Full system access
- **Instructor** - Manage classrooms, view student work
- **Student** - View shared content, create annotations
- **Public** - View public collections only

---

## Annotation Lifecycle

### Complete Annotation Workflow

```mermaid
stateDiagram-v2
    [*] --> TextSelection: User selects text
    
    TextSelection --> AnnotationDraft: Click annotation button
    AnnotationDraft --> AnnotationForm: Choose annotation type
    
    AnnotationForm --> Creating: Submit form
    Creating --> Validating: POST /api/v1/annotations
    
    Validating --> Persisting: Validation passed
    Validating --> FormError: Validation failed
    FormError --> AnnotationForm: Show errors
    
    Persisting --> Stored: Insert to DB
    Stored --> ReduxUpdate: Return annotation with ID
    
    ReduxUpdate --> Rendering: Update byId and byParent
    Rendering --> Visible: Render highlight and card
    
    Visible --> Editing: User clicks edit
    Editing --> Updating: PATCH /api/v1/annotations/id
    Updating --> Stored: Update in DB
    
    Visible --> Replying: User clicks reply
    Replying --> Creating: Create reply annotation
    
    Visible --> Deleting: User clicks delete
    Deleting --> Removing: DELETE /api/v1/annotations/id
    Removing --> Removed: Remove from DB
    Removed --> ReduxCleanup: Remove from store
    ReduxCleanup --> [*]
```

### Annotation Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as HighlightedText
    participant Redux
    participant API as FastAPI
    participant DB as PostgreSQL

    User->>UI: Select text (mouseup)
    UI->>Redux: initSelection({docId, elementId})
    Redux->>Redux: Store selection segments
    
    User->>UI: Click "Comment" button
    UI->>UI: Open AnnotationCreationDialog
    
    User->>UI: Type comment
    User->>UI: Click "Save"
    
    UI->>Redux: saveAnnotation(annotation)
    Redux->>API: POST /api/v1/annotations
    
    API->>API: Validate annotation schema
    API->>API: Check user permissions
    API->>DB: INSERT annotation
    DB->>DB: Generate UUID
    DB->>DB: Set timestamps
    DB->>API: Return annotation with ID
    
    API->>Redux: Return annotation JSON
    Redux->>Redux: addAnnotation(annotation)
    Redux->>Redux: Update byId[id] = annotation
    Redux->>Redux: Update byParent[elementId].push(id)
    
    Redux->>UI: Trigger re-render
    UI->>UI: Calculate highlight positions
    UI->>UI: Render Highlight overlay
    UI->>UI: Add to TabbedAnnotationsPanel
    
    UI->>User: Show success notification
```

### Annotation Types & Motivations

```mermaid
graph TB
    A[Annotation] --> B{Motivation}
    
    B -->|commenting| C[General Comment]
    B -->|replying| D[Reply to Annotation]
    B -->|scholarly| E[Scholarly Note]
    B -->|tagging| F[Tag/Label]
    B -->|upvoting| G[Like/Vote]
    B -->|flagging| H[Flag/Report]
    B -->|linking| I[Cross-Document Link]
    B -->|external_reference| J[External Citation]
    
    C --> K[Store in commenting slice]
    D --> L[Store in replying slice]
    E --> M[Store in scholarly slice]
    F --> N[Store in tagging slice]
    G --> O[Store in upvoting slice]
    H --> P[Store in flagging slice]
    I --> Q[Store in linking slice]
    J --> R[Store in external_reference slice]
```

---

## Deployment Architecture

### Container Architecture (Docker Compose)

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "UI Container"
            A[Node.js Dev Server<br/>Port 5173]
            B[Vite<br/>Hot Module Reload]
            C[React App<br/>Source Code]
        end
        
        subgraph "API Container"
            D[Python 3.10<br/>Port 8000]
            E[Uvicorn ASGI Server<br/>--reload]
            F[FastAPI App<br/>Source Code]
        end
        
        subgraph "Migrations Container"
            G[Python 3.10]
            H[Alembic CLI]
            I[Migration Scripts]
        end
        
        J[Volume: core-ui/src]
        K[Volume: api/]
        
        J --> C
        K --> F
        K --> I
    end
    
    L[Host Port 5173] --> A
    M[Host Port 8000] --> D
    
    A --> |Proxy /api/v1| D
    
    N[External PostgreSQL] --> F
    N --> I
```

### Docker Compose Services

**File:** `docker-compose.yml`

```yaml
services:
  ui:                          # Frontend development server
    build:
      context: ./core-ui
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"           # Vite dev server
    volumes:
      - ./core-ui/src:/app/src           # Hot reload
      - ./core-ui/vite.config.ts:/app/vite.config.ts

  api:                         # Backend API server
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"           # FastAPI server
    volumes:
      - ./api:/app            # Hot reload

  migrations:                  # Database migration tool
    build:
      context: ./api
      dockerfile: Dockerfile.migrations
    volumes:
      - ./api:/app
```

### Production Architecture (Nginx)

```mermaid
graph TB
    A[Internet] --> B[Load Balancer<br/>Port 443 HTTPS]
    
    B --> C[Nginx Reverse Proxy]
    
    C --> D{Route?}
    
    D -->|/| E[Nginx Static Server<br/>React Build]
    D -->|/api/v1/*| F[Uvicorn<br/>FastAPI]
    
    E --> G[React SPA<br/>index.html + JS bundles]
    
    F --> H[FastAPI Application]
    H --> I[(PostgreSQL<br/>Production DB)]
    
    J[Docker Network] --> E
    J --> F
    J --> I
```

**Production Dockerfile** (`core-ui/Dockerfile`):
```dockerfile
FROM node:lts-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build              # Vite build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Environment Configuration

**Development:**
- UI: Vite dev server with HMR
- API: Uvicorn with --reload
- DB: Local PostgreSQL or Docker PostgreSQL
- Proxy: Vite proxies `/api/v1` to `http://api:8000`

**Production:**
- UI: Nginx serving static files
- API: Uvicorn (multiple workers)
- DB: Managed PostgreSQL (AWS RDS, etc.)
- Proxy: Nginx reverse proxy

---

## Network Architecture

### Development Network Flow

```mermaid
graph LR
    A[Developer Browser<br/>localhost:5173] --> B[Vite Dev Server<br/>Container: ui]
    
    B --> C{Request Type?}
    
    C -->|/*.html,js,css| D[Serve from /src]
    C -->|/api/v1/*| E[Proxy to API]
    
    E --> F[FastAPI Server<br/>Container: api<br/>Port 8000]
    
    F --> G[(PostgreSQL<br/>Host or Container)]
    
    H[Docker Network<br/>Bridge Mode] --> B
    H --> F
```

### Production Network Flow

```mermaid
graph TB
    A[User Browser] --> B[HTTPS<br/>Port 443]
    B --> C[Load Balancer]
    C --> D[Nginx Reverse Proxy<br/>Port 80/443]
    
    D --> E{Route}
    E -->|/| F[Nginx Static Files<br/>React Build]
    E -->|/api/v1/*| G[FastAPI<br/>Port 8000]
    
    F --> H[Browser]
    
    G --> I[Auth Middleware]
    I --> J{Authenticated?}
    J -->|Yes| K[Business Logic]
    J -->|No| L[401 Response]
    
    K --> M[(PostgreSQL<br/>Private Network)]
    
    N[CDN<br/>Static Assets] --> H
```

### Port Mapping

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| UI (Dev) | 5173 | 5173 | Vite dev server |
| UI (Prod) | 80 | 80/443 | Nginx static server |
| API | 8000 | 8000 | FastAPI ASGI server |
| PostgreSQL | 5432 | - | Database (internal only) |

---

## Data Flow Mapping

This section provides detailed mappings of how data flows from frontend components through Redux thunks to backend endpoints and back into the Redux store.

### Document Collection Flow

```mermaid
graph TB
    subgraph "Frontend Components"
        A[CollectionsView.tsx]
        B[DocumentCollectionGallery.tsx]
    end
    
    subgraph "Redux Layer"
        C[fetchDocumentCollections thunk]
        D[documentCollections slice]
    end
    
    subgraph "API Layer"
        E[GET /api/v1/collections]
    end
    
    subgraph "Backend"
        F[document_collections.py router]
        G[DocumentCollection model]
        H[(PostgreSQL app.document_collections)]
    end
    
    A -->|useEffect| C
    B -->|dispatch| C
    C -->|axios.get| E
    E --> F
    F -->|SQLAlchemy query| G
    G -->|SELECT| H
    H -->|results| G
    G -->|Pydantic schema| F
    F -->|JSON response| E
    E -->|response.data| C
    C -->|fulfilled action| D
    D -->|byId, allIds| A
    D -->|state update| B
```

### Document Loading Flow

```mermaid
graph TB
    subgraph "Frontend"
        A[DocumentsView.tsx]
        B[DocumentGallery.tsx]
    end
    
    subgraph "Redux Thunks"
        C[fetchDocumentsByCollection thunk]
        D[documents slice]
    end
    
    subgraph "API"
        E[GET /api/v1/collections/:id/documents]
    end
    
    subgraph "Backend"
        F[document_collections.py]
        G[Document model]
        H[(app.documents table)]
    end
    
    A -->|collectionId from URL| C
    B -->|dispatch on mount| C
    C -->|axios.get with collectionId| E
    E --> F
    F -->|filter by collection_id| G
    G -->|SELECT WHERE collection_id| H
    H -->|document list| G
    G -->|serialize| F
    F -->|JSON array| E
    E -->|response.data| C
    C -->|normalized data| D
    D -->|byId map, allIds array| A
```

### Document Elements Flow

```mermaid
sequenceDiagram
    participant DCV as DocumentContentView.tsx
    participant Hook as useVisibilityWithPrefetch
    participant Thunk as fetchDocumentElements
    participant Slice as documentElements slice
    participant API as GET /api/v1/documents/:id/elements
    participant Router as document_elements.py
    participant DB as PostgreSQL
    
    DCV->>Hook: documentId from URL
    Hook->>Hook: Calculate visible paragraphs
    Hook->>Thunk: dispatch(fetchDocumentElements)
    Thunk->>API: GET /documents/123/elements
    API->>Router: Route to handler
    Router->>DB: SELECT * FROM app.document_elements WHERE document_id=123
    DB->>Router: Return elements array
    Router->>API: JSON response with elements
    API->>Thunk: response.data
    Thunk->>Slice: Add to byId map
    Slice->>DCV: Updated state
    DCV->>DCV: Render HighlightedText components
```

### Annotation Creation Flow

```mermaid
graph TB
    subgraph "UI Components"
        A[HighlightedText.tsx]
        B[AnnotationCreationDialog.tsx]
    end
    
    subgraph "Redux"
        C[createAnnotation slice]
        D[saveAnnotation thunk]
        E[annotations.commenting slice]
    end
    
    subgraph "API"
        F[POST /api/v1/annotations]
    end
    
    subgraph "Backend"
        G[annotations.py router]
        H[Annotation model]
        I[(app.annotations table)]
    end
    
    A -->|Text selection| C
    C -->|Store target segments| C
    B -->|User submits form| D
    D -->|POST annotation payload| F
    F --> G
    G -->|Validate motivation| G
    G -->|Create Annotation| H
    H -->|INSERT| I
    I -->|Generated UUID, timestamps| H
    H -->|Return with creator| G
    G -->|JSON response| F
    F -->|response.data| D
    D -->|Add to byId| E
    D -->|Add ID to byParent| E
    E -->|Update store| A
    A -->|Render Highlight| A
```

### Annotation Fetching by Motivation Flow

```mermaid
sequenceDiagram
    participant TAP as TabbedAnnotationsPanel.tsx
    participant Tab as AnnotationsList component
    participant Thunk as fetchAnnotationByMotivation
    participant API as GET /api/v1/annotations
    participant Router as annotations.py
    participant DB as PostgreSQL
    participant Slice as annotations.commenting slice
    
    TAP->>Tab: Render tab for "commenting"
    Tab->>Tab: useEffect with elementId
    Tab->>Thunk: dispatch(fetch motivation=commenting)
    Thunk->>API: GET /annotations?document_element_id=456&motivation=commenting
    API->>Router: Route handler
    Router->>DB: SELECT WHERE document_element_id=456 AND motivation=commenting
    DB->>Router: Annotation records
    Router->>Router: Join with users table for creator
    Router->>API: JSON array with full annotation objects
    API->>Thunk: response.data
    Thunk->>Slice: byId[annotationId] = annotation
    Thunk->>Slice: byParent[elementId].push(annotationId)
    Slice->>Tab: State updated
    Tab->>Tab: Render AnnotationCard for each
```

### Admin Document Upload Flow

```mermaid
graph TB
    subgraph "Admin UI"
        A[ManageDocuments.tsx]
        B[File Upload Form]
    end
    
    subgraph "Redux/Direct API"
        C[axios.post multipart/form-data]
    end
    
    subgraph "API"
        D[POST /api/v1/documents]
    end
    
    subgraph "Backend Processing"
        E[documents.py router]
        F[python-docx parser]
        G[Document model]
        H[DocumentElement model]
        I[(app.documents table)]
        J[(app.document_elements table)]
    end
    
    A -->|User selects .docx file| B
    B -->|FormData with file| C
    C -->|Upload file| D
    D --> E
    E -->|Save to uploads/| E
    E -->|Parse with python-docx| F
    F -->|Extract paragraphs| F
    F -->|Create Document record| G
    G -->|INSERT| I
    I -->|Return document_id| G
    G -->|Create element per paragraph| H
    H -->|INSERT batch| J
    J -->|Confirm inserts| H
    H -->|Return document with elements| E
    E -->|JSON response| D
    D -->|Document created| C
    C -->|Refresh document list| A
```

### Search Flow

```mermaid
sequenceDiagram
    participant SB as SearchBar.tsx
    participant Thunk as performSearch thunk
    participant Slice as searchResults slice
    participant API as POST /api/v1/search
    participant Router as search.py
    participant DB as PostgreSQL full-text search
    
    SB->>SB: User types query (debounced)
    SB->>Thunk: dispatch(performSearch query, filters)
    Thunk->>Slice: Set loading=true
    Thunk->>API: POST with query params
    API->>Router: search endpoint
    Router->>DB: to_tsquery on document_elements.content
    DB->>DB: Full-text search with ranking
    DB->>Router: Matching elements with ts_rank
    Router->>Router: Join with documents, collections
    Router->>API: JSON results with highlights
    API->>Thunk: response.data
    Thunk->>Slice: results array, loading=false
    Slice->>SB: Trigger re-render
    SB->>SB: Display SearchResults component
```

### User Management Flow

```mermaid
graph LR
    subgraph "Admin Component"
        A[ManageUsers.tsx]
    end
    
    subgraph "Redux"
        B[fetchUsers thunk]
        C[users slice]
    end
    
    subgraph "API"
        D[GET /api/v1/users]
    end
    
    subgraph "Backend"
        E[users.py router]
        F[User model]
        G[(app.users table)]
    end
    
    A -->|Component mount| B
    B -->|axios.get| D
    D --> E
    E -->|Admin check| E
    E -->|Query users| F
    F -->|SELECT with roles| G
    G -->|User records| F
    F -->|Serialize safely| E
    E -->|JSON array| D
    D -->|response.data| B
    B -->|Normalized data| C
    C -->|byId, allIds| A
```

### Complete Data Flow Reference Table

#### Part 1: Frontend to Backend Routing

| Feature | Component File | Redux Thunk | HTTP Method | API Endpoint |
|---------|---------------|-------------|-------------|--------------|
| **Collections** |
| List collections | `CollectionsView.tsx` | `fetchDocumentCollections` | GET | `/api/v1/collections` |
| **Documents** |
| List documents | `DocumentsView.tsx` | `fetchDocumentsByCollection` | GET | `/api/v1/collections/:id/documents` |
| Upload document | `ManageDocuments.tsx` | Direct axios | POST | `/api/v1/documents` |
| Delete document | `ManageDocuments.tsx` | Direct axios | DELETE | `/api/v1/documents/:id` |
| **Document Elements** |
| Load paragraphs | `DocumentContentView.tsx` | `fetchDocumentElements` | GET | `/api/v1/documents/:id/elements` |
| Bulk load | `DocumentGallery.tsx` | `fetchAllDocumentElements` | GET | `/api/v1/documents/:id/elements` |
| **Annotations** |
| Create comment | `AnnotationCreationDialog.tsx` | `saveAnnotation` | POST | `/api/v1/annotations` |
| Fetch comments | `TabbedAnnotationsPanel.tsx` | `fetchAnnotationByMotivation` | GET | `/api/v1/annotations?motivation=commenting` |
| Update annotation | `AnnotationCard.tsx` | `patchAnnotation` | PATCH | `/api/v1/annotations/:id` |
| Delete annotation | `AnnotationCard.tsx` | `deleteAnnotation` | DELETE | `/api/v1/annotations/:id` |
| Reply to comment | `AnnotationReplyForm.tsx` | `saveAnnotation` | POST | `/api/v1/annotations` |
| **Search** |
| Search content | `SearchBar.tsx` | `performSearch` | POST | `/api/v1/search` |
| **Users & Auth** |
| List users | `ManageUsers.tsx` | `fetchUsers` | GET | `/api/v1/users` |
| Login | `LoginForm.tsx` | Direct axios | POST | `/api/v1/auth/login` |
| Register | `RegisterForm.tsx` | Direct axios | POST | `/api/v1/auth/register` |
| CAS login | `useAuth.ts` hook | `useCasAuth` | POST | `/api/v1/validate-cas-ticket` |
| **Classrooms** |
| List classrooms | `ManageClassrooms.tsx` | `fetchClassrooms` | GET | `/api/v1/classrooms` |
| Create classroom | `ManageClassrooms.tsx` | `createClassroom` | POST | `/api/v1/classrooms` |
| Join classroom | `JoinClassroomPage.tsx` | Direct axios | POST | `/api/v1/classrooms/:id/join` |
| List members | `ManageClassrooms.tsx` | `fetchClassroomMembers` | GET | `/api/v1/classrooms/:id/members` |
| **Roles** |
| Fetch roles | `ManageUsers.tsx` | `fetchRoles` | GET | `/api/v1/roles` |
| **Site Settings** |
| Get settings | `SiteSettings.tsx` | `fetchSiteSettings` | GET | `/api/v1/site-settings` |
| Update setting | `SiteSettings.tsx` | `updateSiteSetting` | PUT | `/api/v1/site-settings/:key` |

#### Part 2: Backend to Redux Store Mapping

| Feature | Backend Router | Redux Slice | Database Table |
|---------|----------------|-------------|----------------|
| **Collections** |
| List collections | `document_collections.py` | `documentCollections` | `app.document_collections` |
| **Documents** |
| List documents | `document_collections.py` | `documents` | `app.documents` |
| Upload document | `documents.py` | `documents` | `app.documents` |
| Delete document | `documents.py` | `documents` | `app.documents` |
| **Document Elements** |
| Load paragraphs | `document_elements.py` | `documentElements` | `app.document_elements` |
| Bulk load | `document_elements.py` | `documentElements` | `app.document_elements` |
| **Annotations** |
| Create comment | `annotations.py` | `annotations.commenting` | `app.annotations` |
| Fetch comments | `annotations.py` | `annotations.commenting` | `app.annotations` |
| Update annotation | `annotations.py` | `annotations.commenting` | `app.annotations` |
| Delete annotation | `annotations.py` | `annotations.commenting` | `app.annotations` |
| Reply to comment | `annotations.py` | `annotations.replying` | `app.annotations` |
| **Search** |
| Search content | `search.py` | `searchResults` | `app.document_elements` (full-text) |
| **Users & Auth** |
| List users | `users.py` | `users` | `app.users` |
| Login | `auth.py` | Auth context | `app.users`, `app.user_passwords` |
| Register | `auth.py` | Auth context | `app.users`, `app.user_passwords` |
| CAS login | `cas_auth.py` | Auth context | `app.users` |
| **Classrooms** |
| List classrooms | `groups.py` | `classrooms` | `app.groups` (type=classroom) |
| Create classroom | `groups.py` | `classrooms` | `app.groups` |
| Join classroom | `groups.py` | `classrooms` | `app.group_memberships` |
| List members | `groups.py` | `classrooms.members` | `app.group_memberships` |
| **Roles** |
| Fetch roles | `roles.py` | `roles` | `app.roles` |
| **Site Settings** |
| Get settings | `site_settings.py` | `siteSettings` | `app.site_settings` |
| Update setting | `site_settings.py` | `siteSettings` | `app.site_settings` |

### Key Observations

#### Data Flow Patterns

1. **Normalized State Pattern**
   - Most slices use `byId` (object) + `allIds` (array) for O(1) lookups
   - Annotations use `byId` + `byParent` for filtering by document element

2. **Thunk Usage**
   - Collections/Documents: Simple fetch thunks
   - Annotations: Parameterized by motivation type (8 variants)
   - Bulk loading: `fetchAllDocumentElements` with per-document loading callbacks

3. **Direct Axios vs Thunks**
   - Admin operations (upload, delete): Often use direct axios
   - Data fetching/listing: Always use thunks
   - Authentication: Direct axios (pre-Redux setup)

4. **Backend Router Organization**
   - 1 router file per resource type
   - RESTful patterns (GET list, GET by ID, POST, PATCH, DELETE)
   - Nested routes for relationships (e.g., `/collections/:id/documents`)

5. **Database Joins**
   - Annotations JOIN users for creator info
   - Documents JOIN collections for collection metadata
   - Search results JOIN multiple tables for context

---

## Integration Points

### Frontend ↔ Backend Integration


```mermaid
graph LR
    A[React Component] --> B[Redux Action/Thunk]
    B --> C[Axios HTTP Client]
    C --> D[API v1 endpoint]
    
    D --> E[FastAPI Router]
    E --> F[Pydantic Validation]
    F --> G{Valid?}
    
    G -->|Yes| H[Business Logic]
    G -->|No| I[422 Validation Error]
    
    H --> J[SQLAlchemy Query]
    J --> K[(PostgreSQL)]
    K --> J
    
    J --> L[Pydantic Schema]
    L --> M[JSON Response]
    
    M --> C
    I --> C
    
    C --> N[Redux Store Update]
    N --> O[Component Re-render]
```

### API Contract

**Request Format:**
```typescript
// Frontend (TypeScript)
interface AnnotationCreate {
  document_collection_id: number;
  document_id: number;
  document_element_id: number;
  motivation: string;
  body: {
    type: string;
    value: string;
    format: string;
  };
  target: Array<{
    source: string;
    selector?: {...};
  }>;
}

// POST /api/v1/annotations
axios.post('/api/v1/annotations', annotation);
```

**Response Format:**
```python
# Backend (Python)
class AnnotationResponse(BaseModel):
    id: str                    # UUID
    created: datetime
    modified: datetime
    creator: UserPublic
    motivation: str
    body: AnnotationBody
    target: List[AnnotationTarget]
    # ...other fields

# Returns JSON
return JSONResponse(content=annotation.model_dump())
```

### External Integrations

```mermaid
graph TB
    A[Genji System] --> B{External Services}
    
    B --> C[Dartmouth CAS<br/>login.dartmouth.edu]
    B --> D[Email Server<br/>SMTP]
    B --> E[File Storage<br/>Local/S3]
    
    C --> F[CAS Ticket Validation<br/>/serviceValidate]
    C --> G[CAS Login Page<br/>/login]
    C --> H[CAS Logout<br/>/logout]
    
    D --> I[User Notifications]
    D --> J[Password Reset]
    
    E --> K[Document Storage<br/>Word, PDF files]
    E --> L[User Uploads]
```

---

## Scalability Considerations

### Current Architecture Limitations

1. **Stateful Sessions** - Sessions stored in-memory (single server)
2. **Single Database** - No read replicas
3. **No Caching** - Direct database queries for all reads
4. **File Storage** - Local filesystem (not distributed)

### Scalability Roadmap

```mermaid
graph TB
    subgraph "Phase 1: Current"
        A1[Single API Server]
        A2[Local Sessions]
        A3[Single PostgreSQL]
        A4[Local File Storage]
    end
    
    subgraph "Phase 2: Horizontal Scaling"
        B1[Multiple API Servers]
        B2[Redis Session Store]
        B3[PostgreSQL Primary]
        B4[S3 File Storage]
        B5[Load Balancer]
    end
    
    subgraph "Phase 3: High Availability"
        C1[Auto-scaling API Servers]
        C2[Redis Cluster]
        C3[PostgreSQL Primary + Read Replicas]
        C4[CDN for Static Assets]
        C5[Application Load Balancer]
        C6[Database Connection Pool]
    end
    
    subgraph "Phase 4: Advanced"
        D1[Kubernetes Orchestration]
        D2[Redis Cluster + Backup]
        D3[PostgreSQL Cluster<br/>Multi-AZ]
        D4[ElasticSearch for Search]
        D5[Microservices<br/>Auth, Annotations, Search]
        D6[Message Queue<br/>Async Processing]
    end
```

### Performance Optimizations

**Database Level:**
- Add read replicas for GET requests
- Implement connection pooling
- Add Redis cache for frequently accessed data
- Optimize indexes based on query patterns

**Application Level:**
- Implement API response caching
- Use background jobs for document processing
- Batch database queries
- Implement rate limiting

**Frontend Level:**
- Code splitting for large components
- Lazy loading for routes
- Virtual scrolling for long lists
- Service worker for offline support

---

## Related Documentation

- **[Frontend Overview](../frontend/OVERVIEW.md)** - React architecture
- **[API Overview](../api/OVERVIEW.md)** - Backend architecture
- **[Database Schema](../database/SCHEMA.md)** - Database design
- **[Deployment Guide](../guides/DEPLOYMENT.md)** - Production deployment

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Maintainers:** Dartmouth ITC Genji Team
