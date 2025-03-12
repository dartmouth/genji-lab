from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import users, documents, document_collections, document_elements, annotations
from database import engine, create_schema
from models import models

# Create schema first
create_schema()

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Document Annotation API",
    description="API for managing document annotations",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(users.router)
app.include_router(documents.router)  # Add the documents router
app.include_router(document_collections.router)
app.include_router(document_elements.router)
app.include_router(annotations.router)

@app.get("/api/v1")
def read_root():
    return {"message": "Welcome to the Document Annotation API"}

@app.get("/")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)