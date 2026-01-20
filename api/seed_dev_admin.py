"""
Development-only script to seed admin user, sample collection, and document.
DO NOT RUN IN PRODUCTION - protected by environment check.
"""
import os
import sys
import requests
from pathlib import Path
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime

from database import SessionLocal
from models import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

def seed_admin_user(db: Session):
    """Create admin user for development only."""
    
    # SAFETY CHECK: Only run in development
    if os.getenv("ENVIRONMENT", "development") == "production":
        print("❌ ERROR: This script cannot run in production!")
        sys.exit(1)
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(models.User).filter(
            models.User.username == "admin"
        ).first()
        
        if existing_admin:
            print("ℹ️  Admin user already exists")
            return existing_admin
        
        # Check if admin role exists (id=1)
        admin_role = db.query(models.Role).filter(models.Role.id == 1).first()
        if not admin_role:
            print("⚠️  Creating admin role...")
            admin_role = models.Role(
                id=1,
                name="admin",
                description="System administrator with full access"
            )
            db.add(admin_role)
            db.flush()
        
        # Create admin user
        admin_user = models.User(
            first_name="Admin",
            last_name="User",
            email="admin@localhost.dev",
            username="admin",
            is_active=True,
            user_metadata={
                "created_at": datetime.now().isoformat(),
                "auth_method": "password",
                "dev_seed": True
            }
        )
        
        db.add(admin_user)
        db.flush()
        
        # Create password
        hashed_password = pwd_context.hash("admin123")
        user_password = models.UserPassword(
            user_id=admin_user.id,
            hashed_password=hashed_password
        )
        
        db.add(user_password)
        db.flush()
        
        # Assign admin role
        admin_user.roles.append(admin_role)
        
        db.commit()
        
        print("✅ Admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Password: admin123")
        
        return admin_user
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)


def seed_document_collection(db: Session, admin_user: models.User):
    """Create a sample document collection."""
    
    try:
        # Check if collection already exists
        existing_collection = db.query(models.DocumentCollection).filter(
            models.DocumentCollection.title == "Sample Collection"
        ).first()
        
        if existing_collection:
            print("ℹ️  Sample collection already exists")
            return existing_collection
        
        # Create collection
        collection = models.DocumentCollection(
            title="Sample Collection",
            visibility="public",
            text_direction="ltr",
            language="en",
            created_by_id=admin_user.id,
            modified_by_id=admin_user.id,
            owner_id=admin_user.id,
            hierarchy={},
            collection_metadata={
                "synopsis": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer eu finibus nisi, at convallis dui. Phasellus purus sem, dignissim ac eleifend eget, tristique id nunc. Phasellus eu efficitur mauris. Integer pulvinar elit sem, id fringilla mi ullamcorper sit amet. Integer euismod, sapien quis luctus pretium, leo sapien egestas arcu, ultrices varius nunc libero sit amet mauris. Pellentesque varius, magna id malesuada consectetur, tortor ex ornare ante, sit amet cursus lectus arcu ac nibh. Suspendisse non eros eu nunc sagittis lobortis vitae mollis enim. Mauris congue rutrum arcu nec fermentum. Etiam imperdiet velit a nisi varius rhoncus. Sed egestas enim ac.",
                "character_list": ["Lorem", "Ipsum", "Dolor"],
                "timeline": "From ye olden days to a while ago",
                "image_url": "https://en.wikipedia.org/wiki/Python_%28programming_language%29#/media/File:Python-logo-notext.svg"


            }
        )
        
        db.add(collection)
        db.commit()
        db.refresh(collection)
        
        print(f"✅ Sample collection created (id={collection.id})")
        return collection
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating collection: {e}")
        sys.exit(1)


def authenticate_and_get_session():
    """Login as admin and return session for API calls."""
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return None
        
        print("✅ Authenticated as admin")
        return response.cookies
        
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None


def seed_word_document(collection_id: int, session_cookies):
    """Upload a sample Word document through the API."""
    
    # Check if sample .docx file exists, or create a simple one
    sample_doc_path = Path("./kiritsubo_original_text.docx")
    
    try:
        with open(sample_doc_path, 'rb') as f:
            files = {
                'file': ('kiritsubo_original_text.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            }
            
            # Send parameters as query parameters, not form data
            params = {
                'document_collection_id': collection_id,
                'title': 'Sample Document',
                'description': 'A sample document for development and testing'
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/v1/documents/import-word-doc",
                params=params,  # Use params instead of data
                files=files,
                cookies=session_cookies
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Word document imported successfully!")
                print(f"   Document ID: {result['document']['id']}")
                print(f"   Elements created: {result['import_results']['elements_created']}")
            else:
                print(f"❌ Document import failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error importing document: {e}")


def main():
    """Main seeding function."""
    db = SessionLocal()
    
    try:
        print("🌱 Starting development data seeding...\n")
        
        # 1. Create admin user and role
        admin_user = seed_admin_user(db)
        
        # 2. Create sample collection
        collection = seed_document_collection(db, admin_user)
        
        # 3. Authenticate
        session_cookies = authenticate_and_get_session()
        
        if not session_cookies:
            print("❌ Cannot proceed without authentication")
            sys.exit(1)
        
        # 4. Import Word document
        seed_word_document(collection.id, session_cookies)
        
        print("\n✅ Development data seeding complete!")
        
    finally:
        db.close()


if __name__ == "__main__":
    main()