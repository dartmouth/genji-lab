# API Architecture Diagrams

## 1. Request Flow Overview

```mermaid
flowchart TD
    A[React UI] -->|HTTP Request via Axios| B[API Client]
    B -->|"/api/v1/*"| C[FastAPI Application]
    C -->|Route to appropriate handler| D[Router Layer]
    D -->|Business logic| E[Service Layer]
    E -->|Data access| F[SQLAlchemy ORM]
    F -->|SQL queries| G[(PostgreSQL Database)]
    
    G -->|Result set| F
    F -->|Python objects| E
    E -->|Validated data| D
    D -->|Pydantic serialization| C
    C -->|JSON response| B
    B -->|Update Redux| A
```

## 2. API Routers (13 total)

```mermaid
flowchart LR
    API[FastAPI Application] --> R1[/annotations]
    API --> R2[/document-collections]
    API --> R3[/documents]
    API --> R4[/document-elements]
    API --> R5[/users]
    API --> R6[/groups]
    API --> R7[/roles]
    API --> R8[/flags]
    API --> R9[/search]
    API --> R10[/site-settings]
    API --> R11[/auth]
    API --> R12[/cas-config]
    
    R11 -.->|Session/Cookie| Auth[Authentication Middleware]
    Auth -.->|CAS validation| CAS[CAS Server]
```

## 3. Service & Data Layer

```mermaid
flowchart TD
    subgraph Routers
        R1[Annotations Router]
        R2[Collections Router]
        R3[Documents Router]
        R4[Elements Router]
    end
    
    subgraph Services
        S1[AnnotationService]
        S2[CollectionService]
        S3[DocumentService]
        S4[ElementService]
    end
    
    subgraph Models
        M1[Annotation Model]
        M2[Collection Model]
        M3[Document Model]
        M4[Element Model]
    end
    
    R1 --> S1 --> M1
    R2 --> S2 --> M2
    R3 --> S3 --> M3
    R4 --> S4 --> M4
    
    M1 --> DB[(PostgreSQL)]
    M2 --> DB
    M3 --> DB
    M4 --> DB
```

## 4. Validation & Documentation

```mermaid
flowchart TD
    A[Incoming Request] --> B{Request Validation}
    B -->|Invalid| C[422 Validation Error]
    B -->|Valid| D[Pydantic Schema]
    
    D --> E[Router Handler]
    E --> F[Service Logic]
    F --> G[Database Operation]
    
    G --> H[Pydantic Response Model]
    H --> I[JSON Serialization]
    I --> J[HTTP Response]
    
    API[FastAPI App] -.->|Auto-generates| K[OpenAPI Spec]
    K --> L[/docs - Swagger UI]
    K --> M[/redoc - ReDoc UI]
```
