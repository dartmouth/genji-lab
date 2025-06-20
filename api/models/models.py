from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, MetaData, Boolean, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import Sequence, Index

from database import Base
from dotenv import load_dotenv, find_dotenv
import os
load_dotenv(find_dotenv())

# Create metadata with schema
metadata = MetaData(schema='app')

# Define sequences
annotation_body_id_seq = Sequence('annotation_body_id_seq', schema='app')
annotation_target_id_seq = Sequence('annotation_target_id_seq', schema='app')

# Group membership association table
group_members = Table(
    'group_members',
    Base.metadata,
    Column('group_id', Integer, ForeignKey(f"{'app'}.groups.id")),
    Column('user_id', Integer, ForeignKey(f"{'app'}.users.id")),
    Column('joined_at', DateTime, default=func.current_timestamp()),
    schema='app'
)

# User-role association table
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey(f"{'app'}.users.id")),
    Column('role_id', Integer, ForeignKey(f"{'app'}.roles.id")),
    schema='app'
)

# Role-permission association table
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey(f"{'app'}.roles.id")),
    Column('permission_id', Integer, ForeignKey(f"{'app'}.permissions.id")),
    schema='app'
)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    username = Column(String(255), unique=True, index=True)
    user_metadata = Column(JSONB)
    
    # Relationships
    created_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.created_by_id", back_populates="created_by")
    modified_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.modified_by_id", back_populates="modified_by")
    annotations = relationship("Annotation", foreign_keys="Annotation.creator_id", back_populates="creator")
    owned_annotations = relationship("Annotation", foreign_keys="Annotation.owner_id", back_populates="owner")
    owned_documents = relationship("Document", foreign_keys="Document.owner_id", back_populates="owner")
    owned_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.owner_id", back_populates="owner")
    modified_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.modified_by_id", back_populates="modified_by")
    owned_collections = relationship("DocumentCollection", foreign_keys="DocumentCollection.owner_id", back_populates="owner")
    created_groups = relationship("Group", foreign_keys="Group.created_by_id", back_populates="created_by")
    created_shares = relationship("ObjectSharing", foreign_keys="ObjectSharing.created_by_id", back_populates="created_by")
    roles = relationship("Role", secondary=user_roles, back_populates="users")  # This line is MISSING
    groups = relationship("Group", secondary=group_members, back_populates="members")

class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True)
    description = Column(String(255))
    
    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    description = Column(String(255))
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(String(255))
    created_at = Column(DateTime, default=func.current_timestamp())
    created_by_id = Column(Integer, ForeignKey(f"{'app'}.users.id"))
    
    # Relationships
    members = relationship("User", secondary=group_members, back_populates="groups")
    created_by = relationship("User", foreign_keys=[created_by_id])

class ObjectSharing(Base):
    __tablename__ = "object_sharing"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(Integer, index=True)
    object_type = Column(String(50), index=True)
    shared_with_id = Column(Integer, index=True)
    shared_with_type = Column(String(10))  # 'user' or 'group'
    access_level = Column(String(20))  # 'view', 'edit', 'manage'
    created_at = Column(DateTime, default=func.current_timestamp())
    created_by_id = Column(Integer, ForeignKey(f"{'app'}.users.id"))
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])

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
    owner_id = Column(Integer, ForeignKey(f"{'app'}.users.id"))
    language = Column(String(50))
    hierarchy = Column(JSONB)
    collection_metadata = Column(JSONB)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_collections")
    modified_by = relationship("User", foreign_keys=[modified_by_id], back_populates="modified_collections")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_collections")
    documents = relationship("Document", back_populates="collection")
    annotations = relationship("Annotation", back_populates="document_collection")

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer, ForeignKey(f"{'app'}.document_collections.id"))
    owner_id = Column(Integer, ForeignKey(f"{'app'}.users.id"))
    title = Column(String(255))
    description = Column(Text)
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    collection = relationship("DocumentCollection", back_populates="documents")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_documents")
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
    owner_id = Column(Integer, ForeignKey(f"{'app'}.users.id"))
    
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
    creator = relationship("User", foreign_keys=[creator_id], back_populates="annotations")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_annotations")

# Indices
# Foreign key indices
Index('idx_document_collections_created_by', DocumentCollection.created_by_id)
Index('idx_document_collections_modified_by', DocumentCollection.modified_by_id)
Index('idx_document_collections_owner', DocumentCollection.owner_id)
Index('idx_documents_collection_id', Document.document_collection_id)
Index('idx_documents_owner', Document.owner_id)
Index('idx_document_elements_document_id', DocumentElement.document_id)
Index('idx_annotations_document_id', Annotation.document_id)
Index('idx_annotations_document_element_id', Annotation.document_element_id)
Index('idx_annotations_creator_id', Annotation.creator_id)
Index('idx_annotations_owner_id', Annotation.owner_id)
Index('idx_annotations_collection_id', Annotation.document_collection_id)
Index('idx_object_sharing_object', ObjectSharing.object_id, ObjectSharing.object_type)
Index('idx_object_sharing_shared_with', ObjectSharing.shared_with_id, ObjectSharing.shared_with_type)

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