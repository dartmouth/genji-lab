
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    user_metadata JSONB
);

-- Create document_collections table
CREATE TABLE document_collections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    visibility VARCHAR(50),
    text_direction VARCHAR(50),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id),
    modified_by_id INTEGER REFERENCES users(id),
    language VARCHAR(50),
    hierarchy JSONB,
    collection_metadata JSONB
);

-- Create documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    document_collection_id INTEGER REFERENCES document_collections(id),
    title VARCHAR(255),
    description TEXT,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document_elements table
CREATE TABLE document_elements (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hierarchy JSONB,
    content JSONB,
    links JSONB
);

-- Updated annotations table with corrected fields
CREATE TABLE annotations (
    id SERIAL PRIMARY KEY,
    document_collection_id INTEGER REFERENCES document_collections(id),
    document_id INTEGER REFERENCES documents(id),
    document_element_id INTEGER REFERENCES document_elements(id),
    
    -- Changed to reference users table directly
    creator_id INTEGER REFERENCES users(id),  -- references user table instead of storing URI
    
    -- Removed annotation_id as it's redundant with the table's primary key
    
    type VARCHAR(100),                   -- from "type" in JSON
    created TIMESTAMP,                   -- from "created" in JSON
    modified TIMESTAMP,                  -- from "modified" in JSON
    generator VARCHAR(255),              -- from "generator" in JSON
    generated TIMESTAMP,                 -- from "generated" in JSON
    motivation VARCHAR(100),             -- from "motivation" in JSON
    
    -- Keep these as JSONB as requested
    body JSONB,                          -- the "body" object
    target JSONB,                        -- the "target" array
    
    -- Original fields
    status VARCHAR(50),
    annotation_type VARCHAR(100),
    
    -- Context field for W3C compliance
    context VARCHAR(255)                 -- from "@context" in JSON
);

-- Add indexes for foreign keys to improve query performance
CREATE INDEX idx_document_collections_created_by ON document_collections(created_by_id);
CREATE INDEX idx_document_collections_modified_by ON document_collections(modified_by_id);
CREATE INDEX idx_documents_collection_id ON documents(document_collection_id);
CREATE INDEX idx_document_elements_document_id ON document_elements(document_id);
CREATE INDEX idx_annotations_document_id ON annotations(document_id);
CREATE INDEX idx_annotations_document_element_id ON annotations(document_element_id);
CREATE INDEX idx_annotations_creator_id ON annotations(creator_id);  -- Updated to creator_id
CREATE INDEX idx_annotations_collection_id ON annotations(document_collection_id);

-- Add indexes for extracted annotation fields
CREATE INDEX idx_annotations_type ON annotations(type);
CREATE INDEX idx_annotations_created ON annotations(created);
CREATE INDEX idx_annotations_motivation ON annotations(motivation);

-- Add GIN indexes for JSONB fields to enable efficient querying of JSON data
CREATE INDEX idx_users_metadata ON users USING GIN (user_metadata);
CREATE INDEX idx_document_collections_hierarchy ON document_collections USING GIN (hierarchy);
CREATE INDEX idx_document_collections_metadata ON document_collections USING GIN (collection_metadata);
CREATE INDEX idx_document_elements_hierarchy ON document_elements USING GIN (hierarchy);
CREATE INDEX idx_document_elements_content ON document_elements USING GIN (content);
CREATE INDEX idx_annotations_body ON annotations USING GIN (body);
CREATE INDEX idx_annotations_target ON annotations USING GIN (target);

-- Create sequences for annotation IDs
CREATE SEQUENCE app.annotation_body_id_seq START 1;
CREATE SEQUENCE app.annotation_target_id_seq START 1;

grant all on sequence app.annotation_body_id_seq to application;
grant all on sequence app.annotation_target_id_seq to application;
alter table app.document_elements add column links JSONB;

create index idx_element_links on document_elements using GIN (links);

select * from users;
select * from user_roles;
delete from user_roles where user_id = 6 and role_id = 1;

insert into user_roles values (6, 1);
