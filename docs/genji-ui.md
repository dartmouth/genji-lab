```mermaid
flowchart TD
    %% ---------- Top‑level application ----------
    A[App] --> B["AuthProvider (React context)"]
    B --> C[React Router]
    C --> D[Main Layout]

    %% ---------- Global data stores ----------
    D --> E[Redux Store]
    E --> F["API Client (axios.create /api/v1)"]

    %% ---------- Admin section (vertical tabs) ----------
    D --> G["AdminPanel (vertical tabs)"]
    G --> H["ManageCollections (table + dialogs)"]
    G --> I["ManageDocuments (table + editor)"]
    G --> J["ManageUsers (table + role chips)"]
    G --> K["ManageClassrooms (list + dialogs)"]
    G --> L["ManageFlags (review board)"]
    G --> M["SiteSettings (form + preview)"]

    %% ---------- Document view ----------
    D --> N["DocumentView (DocumentContentPanel + DocumentComparisonContainer)"]
    N --> O["AnnotationCard (edit / reply / tag UI)"]
    O --> P["ExternalReferenceIcon (tooltip & click)"]
    P --> Q[ExternalReferencePreviewModal]

    %% ---------- Data‑flow arrows ----------
    %% UI components dispatch actions → Redux → API
    H -->|dispatch fetch / create / update| E
    I -->|dispatch fetch / create / update| E
    J -->|dispatch fetch / update| E
    K -->|dispatch fetch / update| E
    L -->|dispatch fetch / resolve| E
    M -->|dispatch fetch / save| E
    O -->|dispatch add / edit annotation| E

    %% API client calls backend → receives JSON → Redux updates
    F -->|"HTTP request (GET/POST/PUT/DELETE)"| R[FastAPI Backend]
    R -->|JSON response| E

    %% Redux store feeds data back to UI components
    E -->|state selectors| H
    E -->|state selectors| I
    E -->|state selectors| J
    E -->|state selectors| K
    E -->|state selectors| L
    E -->|state selectors| M
    E -->|state selectors| N
    E -->|state selectors| O