from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routers import users, documents, document_collections, document_elements, annotations, roles, site_settings, search

from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

from routers.cas_auth import router as cas_router
from routers.auth import router as auth_router 

from database import engine
from models import models

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Document Annotation API",
    description="API for managing document annotations",
    version="1.0.0"
)

# Configure session middleware
app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SESSION_SECRET_KEY", "your-secret-key-change-in-production")
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create uploads directory and mount static files
uploads_dir = Path("/app/uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Include routers
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(document_collections.router)
app.include_router(document_elements.router)
app.include_router(annotations.router)
app.include_router(roles.router) 
app.include_router(site_settings.router)
app.include_router(cas_router) 
app.include_router(auth_router)
app.include_router(search.router)

@app.get("/api/v1")
def read_root():
    return {"message": "Welcome to the Document Annotation API"}

@app.get("/")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)