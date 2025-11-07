```mermaid
flowchart TD
    %% ---------- UI → API ----------
    A[React UI] -->|Axios| B["API Client (axios.create /api/v1)"]

    %% ---------- API core ----------
    B --> C[FastAPI Application]

    %% ---------- Routers ----------
    C --> D[Router: /items]
    C --> E[Router: /collections]
    C --> F[Router: /documents]
    C --> G[Router: /users]
    C --> H[Router: /classrooms]
    C --> I[Router: /flags]
    C --> J["Router: /auth (CAS)"]

    %% ---------- Security ----------
    J --> K[APIKeyQuery / APIKeyHeader]
    K --> C

    %% ---------- Validation & Serialization ----------
    D --> L[Pydantic Model: Item]
    E --> M[Pydantic Model: DocumentCollection]
    F --> N[Pydantic Model: Document]
    G --> O[Pydantic Model: User]
    H --> P[Pydantic Model: Classroom]
    I --> Q[Pydantic Model: Flag]

    %% ---------- Database ----------
    L --> R["Database (SQLAlchemy / ORM)"]
    M --> R
    N --> R
    O --> R
    P --> R
    Q --> R

    %% ---------- Response flow ----------
    R --> S[Raw DB rows]
    S --> T["FastAPI Response (JSON)"]
    T --> C

    %% ---------- OpenAPI / Docs ----------
    C --> U["OpenAPI generator (get_openapi ...)"]
    U --> V["/docs & /redoc (Swagger UI)"]

    %% ---------- UI receives data ----------
    T --> B
    B -->|data → Redux store| A