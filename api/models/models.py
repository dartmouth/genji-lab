from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import Sequence

from sqlalchemy import Index

from database import Base
from dotenv import load_dotenv, find_dotenv
import os
load_dotenv(find_dotenv())

# Create metadata with schema
metadata = MetaData(schema='app')


# Define a sequence
annotation_body_id_seq = Sequence('annotation_body_id_seq', schema='app')
annotation_target_id_seq = Sequence('annotation_target_id_seq', schema='app')

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    user_metadata = Column(JSONB)
    
    # Relationships
    created_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.created_by_id", back_populates="created_by")
    modified_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.modified_by_id", back_populates="modified_by")
    annotations = relationship("Annotation", back_populates="creator")


class DocumentCollection(Base):
    __tablename__ = "document_collections"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    visibility = Column(String(50))
    text_direction = Column(String(50))
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by_id = Column(Integer, ForeignKey(f"{'app'}.users.id")) 
    modified_by_id = Column(Integer, ForeignKey(f"{'app'}.users.id")) 
    language = Column(String(50))
    hierarchy = Column(JSONB)
    collection_metadata = Column(JSONB)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_collections")
    modified_by = relationship("User", foreign_keys=[modified_by_id], back_populates="modified_collections")
    documents = relationship("Document", back_populates="collection")
    annotations = relationship("Annotation", back_populates="document_collection")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer, ForeignKey(f"{'app'}.document_collections.id")) 
    title = Column(String(255))
    description = Column(Text)
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    collection = relationship("DocumentCollection", back_populates="documents")
    elements = relationship("DocumentElement", back_populates="document")
    annotations = relationship("Annotation", back_populates="document")


class DocumentElement(Base):
    __tablename__ = "document_elements"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey(f"{'app'}.documents.id")) 
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    hierarchy = Column(JSONB)
    content = Column(JSONB)
    
    # Relationships
    document = relationship("Document", back_populates="elements")
    annotations = relationship("Annotation", back_populates="document_element")


class Annotation(Base):
    __tablename__ = "annotations"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer, ForeignKey(f"{'app'}.document_collections.id")) 
    document_id = Column(Integer, ForeignKey(f"{'app'}.documents.id")) 
    document_element_id = Column(Integer, ForeignKey(f"{'app'}.document_elements.id")) 
    creator_id = Column(Integer, ForeignKey(f"{'app'}.users.id")) 
    
    type = Column(String(100))
    created = Column(DateTime)
    modified = Column(DateTime)
    generator = Column(String(255))
    generated = Column(DateTime)
    motivation = Column(String(100))
    
    body = Column(JSONB)
    target = Column(JSONB)
    
    status = Column(String(50))
    annotation_type = Column(String(100))
    context = Column(String(255))
    
    # Relationships
    document_collection = relationship("DocumentCollection", back_populates="annotations")
    document = relationship("Document", back_populates="annotations")
    document_element = relationship("DocumentElement", back_populates="annotations")
    creator = relationship("User", back_populates="annotations")


# Foreign key indices
Index('idx_document_collections_created_by', DocumentCollection.created_by_id)
Index('idx_document_collections_modified_by', DocumentCollection.modified_by_id)
Index('idx_documents_collection_id', Document.document_collection_id)
Index('idx_document_elements_document_id', DocumentElement.document_id)
Index('idx_annotations_document_id', Annotation.document_id)
Index('idx_annotations_document_element_id', Annotation.document_element_id)
Index('idx_annotations_creator_id', Annotation.creator_id)
Index('idx_annotations_collection_id', Annotation.document_collection_id)
# Annotation field indices
Index('idx_annotations_type', Annotation.type)
Index('idx_annotations_created', Annotation.created)
Index('idx_annotations_motivation', Annotation.motivation)

# GIN indices for JSONB fields
Index('idx_users_metadata', User.user_metadata, postgresql_using='gin')
Index('idx_document_collections_hierarchy', DocumentCollection.hierarchy, postgresql_using='gin')
Index('idx_document_collections_metadata', DocumentCollection.collection_metadata, postgresql_using='gin')
Index('idx_document_elements_hierarchy', DocumentElement.hierarchy, postgresql_using='gin')
Index('idx_document_elements_content', DocumentElement.content, postgresql_using='gin')
Index('idx_annotations_body', Annotation.body, postgresql_using='gin')
Index('idx_annotations_target', Annotation.target, postgresql_using='gin')
