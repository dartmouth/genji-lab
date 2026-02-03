# Database Tables Quick Reference

**Project**: Genji Document Annotation Platform  
**Quick reference for all database tables**

---

## Tables at a Glance

| # | Table | Purpose | Row Est. | Key Relationships |
|---|-------|---------|----------|-------------------|
| 1 | `users` | User accounts | 100-1000s | → roles, groups, all content |
| 2 | `user_passwords` | Password storage | = users | 1:1 with users |
| 3 | `roles` | User roles | 3-10 | ← users, → permissions |
| 4 | `permissions` | Access rights | 20-50 | ← roles |
| 5 | `groups` | Classrooms/teams | 10-100s | ← users (members) |
| 6 | `object_sharing` | Share permissions | 100-1000s | → users, groups |
| 7 | `document_collections` | Doc containers | 10-100s | → documents |
| 8 | `documents` | Individual docs | 100-1000s | → elements |
| 9 | `document_elements` | Content units | 1000s-10000s | → annotations |
| 10 | `annotations` | User annotations | 1000s-100000s | → elements, users |
| 11 | `site_settings` | Platform config | 1 | Singleton |
| 12 | `cas_configuration` | CAS/SSO config | 1 | Singleton |

---

## Table Details

### 👤 User Management

#### users
```sql
CREATE TABLE app.users (
    id                INTEGER PRIMARY KEY,
    username          VARCHAR(255) UNIQUE NOT NULL,
    email             VARCHAR(255) UNIQUE NOT NULL,
    first_name        VARCHAR(255),
    last_name         VARCHAR(255),
    is_active         BOOLEAN DEFAULT TRUE,
    user_metadata     JSONB
);
```
**Key Points**: Email and username must be unique. Soft delete via `is_active`.

---

#### user_passwords
```sql
CREATE TABLE app.user_passwords (
    id                INTEGER PRIMARY KEY,
    user_id           INTEGER UNIQUE REFERENCES app.users(id),
    hashed_password   VARCHAR(255) NOT NULL,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);
```
**Key Points**: Bcrypt hashed passwords. One per user. CAS users have no record here.

---

#### roles
```sql
CREATE TABLE app.roles (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);
```
**Typical Values**: `admin`, `instructor`, `student`

---

#### permissions
```sql
CREATE TABLE app.permissions (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255)
);
```
**Status**: Defined but not fully implemented

---

### 👥 Collaboration

#### groups
```sql
CREATE TABLE app.groups (
    id              INTEGER PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW(),
    created_by_id   INTEGER REFERENCES app.users(id),
    start_date      DATE,
    end_date        DATE
);
```
**Use Case**: Semester-based classrooms, study groups

---

#### object_sharing
```sql
CREATE TABLE app.object_sharing (
    id                INTEGER PRIMARY KEY,
    object_id         INTEGER NOT NULL,
    object_type       VARCHAR(50) NOT NULL,  -- 'document', 'collection'
    shared_with_id    INTEGER NOT NULL,
    shared_with_type  VARCHAR(10) NOT NULL,  -- 'user', 'group'
    access_level      VARCHAR(20) NOT NULL,  -- 'view', 'edit', 'manage'
    created_at        TIMESTAMP DEFAULT NOW(),
    created_by_id     INTEGER REFERENCES app.users(id)
);
```
**Status**: Schema exists, API endpoints TODO

---

### 📄 Content Management

#### document_collections
```sql
CREATE TABLE app.document_collections (
    id                    INTEGER PRIMARY KEY,
    title                 VARCHAR(255) NOT NULL,
    visibility            VARCHAR(50),
    text_direction        VARCHAR(50),
    created               TIMESTAMP DEFAULT NOW(),
    modified              TIMESTAMP DEFAULT NOW(),
    created_by_id         INTEGER REFERENCES app.users(id),
    modified_by_id        INTEGER REFERENCES app.users(id),
    owner_id              INTEGER REFERENCES app.users(id),
    language              VARCHAR(50),
    hierarchy             JSONB,
    collection_metadata   JSONB
);
```
**JSONB Fields**: `hierarchy` = structure definition, `collection_metadata` = custom data

---

#### documents
```sql
CREATE TABLE app.documents (
    id                      INTEGER PRIMARY KEY,
    document_collection_id  INTEGER REFERENCES app.document_collections(id),
    owner_id                INTEGER REFERENCES app.users(id),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    created                 TIMESTAMP DEFAULT NOW(),
    modified                TIMESTAMP DEFAULT NOW()
);
```
**Key Points**: Must belong to one collection. Content in document_elements.

---

#### document_elements
```sql
CREATE TABLE app.document_elements (
    id          INTEGER PRIMARY KEY,
    document_id INTEGER REFERENCES app.documents(id),
    created     TIMESTAMP DEFAULT NOW(),
    modified    TIMESTAMP DEFAULT NOW(),
    hierarchy   JSONB,  -- Position: chapter, section, paragraph
    content     JSONB   -- Text and formatting
);
```
**Granularity**: Typically one element = one paragraph or section

---

### ✍️ Annotations

#### annotations
```sql
CREATE TABLE app.annotations (
    id                      INTEGER PRIMARY KEY,
    document_collection_id  INTEGER REFERENCES app.document_collections(id),
    document_id             INTEGER REFERENCES app.documents(id),
    document_element_id     INTEGER REFERENCES app.document_elements(id),
    creator_id              INTEGER REFERENCES app.users(id),
    owner_id                INTEGER REFERENCES app.users(id),
    classroom_id            INTEGER REFERENCES app.groups(id),
    
    type                    VARCHAR(100),
    created                 TIMESTAMP,
    modified                TIMESTAMP,
    generator               VARCHAR(255),
    generated               TIMESTAMP,
    motivation              VARCHAR(100),  -- commenting, tagging, highlighting
    
    body                    JSONB,         -- Annotation content
    target                  JSONB,         -- Target specification
    
    status                  VARCHAR(50),
    annotation_type         VARCHAR(100),
    context                 VARCHAR(255)
);
```
**Most Complex Table**: Multiple foreign keys, JSONB fields, extensive indexing

**Motivation Values**: `commenting`, `highlighting`, `tagging`, `questioning`, `replying`, `linking`

---

### ⚙️ Configuration

#### site_settings
```sql
CREATE TABLE app.site_settings (
    id                      INTEGER PRIMARY KEY,
    site_title              VARCHAR(50) NOT NULL DEFAULT 'Site Title',
    site_logo_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_id           INTEGER NOT NULL REFERENCES app.users(id),
    updated_at              TIMESTAMP DEFAULT NOW(),
    site_logo_data          TEXT,          -- Base64 encoded
    site_logo_mime_type     VARCHAR(50),
    site_favicon_data       TEXT,          -- Base64 encoded
    site_favicon_mime_type  VARCHAR(50)
);
```
**Pattern**: Singleton table (typically 1 row)

---

#### cas_configuration
```sql
CREATE TABLE app.cas_configuration (
    id                      INTEGER PRIMARY KEY,
    enabled                 BOOLEAN DEFAULT FALSE,
    server_url              VARCHAR(255) NOT NULL,  -- e.g., https://login.dartmouth.edu/cas
    validation_endpoint     VARCHAR(100) DEFAULT '/serviceValidate',
    protocol_version        VARCHAR(10) DEFAULT '2.0',
    xml_namespace           VARCHAR(255) DEFAULT 'http://www.yale.edu/tp/cas',
    attribute_mapping       JSONB,         -- Map CAS attrs to user fields
    username_patterns       TEXT[],        -- Extraction patterns
    display_name            VARCHAR(100) DEFAULT 'Institutional Login',
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    updated_by_id           INTEGER REFERENCES app.users(id)
);
```
**Pattern**: Singleton table (typically 1 row) for CAS/SSO authentication settings

---

## Association Tables

### user_roles (Many-to-Many)
```sql
CREATE TABLE app.user_roles (
    user_id INTEGER REFERENCES app.users(id),
    role_id INTEGER REFERENCES app.roles(id),
    PRIMARY KEY (user_id, role_id)
);
```

### role_permissions (Many-to-Many)
```sql
CREATE TABLE app.role_permissions (
    role_id       INTEGER REFERENCES app.roles(id),
    permission_id INTEGER REFERENCES app.permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

### group_members (Many-to-Many)
```sql
CREATE TABLE app.group_members (
    group_id  INTEGER REFERENCES app.groups(id),
    user_id   INTEGER REFERENCES app.users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);
```

---

## Field Type Reference

### Common Column Types

| SQLAlchemy Type | PostgreSQL Type | Use Case |
|-----------------|-----------------|----------|
| `Integer` | `INTEGER` | IDs, counts, foreign keys |
| `String(N)` | `VARCHAR(N)` | Short text (names, emails) |
| `Text` | `TEXT` | Long text (descriptions) |
| `Boolean` | `BOOLEAN` | Flags (is_active, enabled) |
| `DateTime` | `TIMESTAMP` | Timestamps (created, modified) |
| `Date` | `DATE` | Calendar dates (start_date) |
| `JSONB` | `JSONB` | Structured data, flexible schema |

### JSONB vs Text

**Use JSONB when**:
- Need to query nested data
- Structure may evolve
- Want indexing capabilities
- Data is truly JSON

**Use TEXT when**:
- Opaque string data
- No need to query contents
- Simple storage (base64 images)

---

## Index Reference

### B-tree Indexes (Standard)

**Purpose**: Fast equality and range queries  
**Automatic**: Primary keys, unique constraints, explicit indexes  
**Example**: `WHERE user_id = 42`, `WHERE created > '2025-01-01'`

### GIN Indexes (JSONB)

**Purpose**: Fast containment queries on JSONB  
**Syntax**: `CREATE INDEX ... USING gin`  
**Example**: `WHERE content @> '{"text": "search"}'`

**JSONB Indexes in Schema**:
- `users.user_metadata`
- `document_collections.hierarchy`
- `document_collections.collection_metadata`
- `document_elements.hierarchy`
- `document_elements.content`
- `annotations.body`
- `annotations.target`

### Composite Indexes

**Purpose**: Multi-column queries  
**Example**: `(object_id, object_type)` for object_sharing lookups

**Composite Indexes in Schema**:
- `object_sharing` - (object_id, object_type)
- `object_sharing` - (shared_with_id, shared_with_type)

---

## Relationship Cheat Sheet

### User Owns...
- `document_collections` (via owner_id)
- `documents` (via owner_id)
- `annotations` (via owner_id)

### User Creates...
- `document_collections` (via created_by_id)
- `groups` (via created_by_id)
- `annotations` (via creator_id)
- `object_sharing` (via created_by_id)

### User Belongs To...
- `roles` (via user_roles)
- `groups` (via group_members)

### Hierarchy...
```
DocumentCollection (1)
    ↓
Document (N)
    ↓
DocumentElement (N)
    ↓
Annotation (N)
```

### Cross-References...
- `annotations` references collection, document, AND element
- Enables queries at any level of hierarchy

---

## Query Patterns

### Get User with Roles
```python
user = db.query(User).options(
    joinedload(User.roles)
).filter(User.id == user_id).first()
```

### Get Collection with Documents
```python
collection = db.query(DocumentCollection).options(
    joinedload(DocumentCollection.documents)
).filter(DocumentCollection.id == coll_id).first()
```

### Get Annotations for Element
```python
annotations = db.query(Annotation).filter(
    Annotation.document_element_id == element_id
).all()
```

### Search JSONB Content
```python
elements = db.query(DocumentElement).filter(
    DocumentElement.content.op('@>')({"text": "search term"})
).all()
```

### Filter by Motivation
```python
comments = db.query(Annotation).filter(
    Annotation.motivation == 'commenting',
    Annotation.classroom_id == classroom_id
).all()
```

---

## Data Integrity Rules

### Cascading Deletes

| When Deleted | Cascade Effect |
|--------------|----------------|
| User | ❌ RESTRICT (cannot delete if has content) |
| Collection | ✅ CASCADE (deletes documents) |
| Document | ✅ CASCADE (deletes elements) |
| Element | ✅ CASCADE (deletes annotations) |
| Group | ⚠️ SET NULL (annotations lose classroom context) |

### Orphan Prevention

- Documents must have a collection
- Elements must have a document
- Annotations should have an element (but can lose document/collection)
- Users with content cannot be deleted

---

## Size Estimates

### Typical Production Database

| Table | Rows | Size Est. | Growth Rate |
|-------|------|-----------|-------------|
| users | 500 | 50 KB | Steady |
| document_collections | 50 | 100 KB | Slow |
| documents | 500 | 500 KB | Moderate |
| document_elements | 10,000 | 50 MB | Fast |
| annotations | 50,000 | 100 MB | Very Fast |

**Total Estimated Size** (1 year): 200-500 MB for data, 100-200 MB for indexes

### JSONB Storage Impact

JSONB fields compressed by PostgreSQL but can grow large:
- Small JSONB (< 1 KB): Minimal impact
- Large JSONB (> 100 KB): Consider separate table or file storage

---

## Common Issues & Solutions

### Issue: N+1 Queries
**Problem**: Loading annotations triggers many user queries  
**Solution**: Use `joinedload(Annotation.creator)`

### Issue: Slow JSONB Queries
**Problem**: JSONB queries without GIN index  
**Solution**: Ensure GIN indexes exist, use `@>` operator

### Issue: Cannot Delete User
**Problem**: Foreign key constraints  
**Solution**: Either reassign content or use soft delete (`is_active = false`)

### Issue: Duplicate Usernames
**Problem**: Email vs username confusion  
**Solution**: Enforce unique constraints on both fields

### Issue: Lost Classroom Context
**Problem**: Deleted group, annotations lose context  
**Solution**: SET NULL behavior is intentional (preserve annotations)

---

## See Also

- **[Complete Schema Documentation](SCHEMA.md)** - Full details
- **[Migrations Guide](MIGRATIONS.md)** - Database changes
- **[API Data Models](../api/DATA_MODELS.md)** - SQLAlchemy models

---
