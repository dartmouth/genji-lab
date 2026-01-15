# services/auth_service.py

from datetime import datetime
from typing import Optional
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from passlib.context import CryptContext

from models import models
from schemas.auth import UserRegister, UserLogin, PasswordChange
from services.base_service import BaseService
from routers.auth_utils import (
    create_session,
    clear_session,
    calculate_session_ttl,
    get_user_roles,
    get_user_groups,
    assign_default_role_to_user,
    load_user_with_relations,
    update_user_last_login,
)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService(BaseService[models.User]):
    """Service for authentication operations."""

    def __init__(self):
        super().__init__(models.User)

    # ==================== Password Utilities ====================

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hashed password."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)

    # ==================== Helper Methods ====================

    def _check_existing_user(
        self, db: Session, email: str, username: str
    ) -> None:
        """
        Check if user already exists by email or username.
        
        Raises HTTPException 400 if user exists.
        """
        existing_user = (
            db.query(models.User)
            .filter(
                (models.User.email == email)
                | (models.User.username == username)
            )
            .first()
        )

        if existing_user:
            if existing_user.email == email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )

    def _assign_admin_if_first_user(self, db: Session, user: models.User) -> bool:
        """
        Check if this is the first user in the system (no admins exist).
        If so, grant them the admin role.
        
        Returns True if admin was assigned, False otherwise.
        """
        admin_role = db.query(models.Role).filter(models.Role.name == "admin").first()

        if not admin_role:
            admin_role = models.Role(
                name="admin",
                description="System administrator with full privileges",
            )
            db.add(admin_role)
            db.flush()

        existing_admin = (
            db.query(models.User)
            .join(models.user_roles)
            .join(models.Role)
            .filter(models.Role.name == "admin")
            .first()
        )

        if existing_admin is None:
            if admin_role not in user.roles:
                user.roles.append(admin_role)
                db.commit()
                return True

        return False

    def _build_user_response_data(self, user: models.User) -> dict:
        """Build response data dictionary for a user."""
        ttl = calculate_session_ttl()
        return {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "username": user.username,
            "is_active": user.is_active,
            "viewed_tutorial": user.viewed_tutorial,
            "roles": get_user_roles(user),
            "groups": get_user_groups(user),
            "user_metadata": user.user_metadata,
            "ttl": ttl,
        }

    # ==================== Authentication Operations ====================

    def register(
        self,
        db: Session,
        user_data: UserRegister,
        request: Request,
    ) -> dict:
        """
        Register a new user with username/password authentication.
        
        Raises HTTPException 400 if email or username already exists.
        Returns user response data dictionary.
        """
        self._check_existing_user(db, user_data.email, user_data.username)

        new_user = models.User(
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            email=user_data.email,
            username=user_data.username,
            is_active=True,
            user_metadata={
                "created_at": datetime.now().isoformat(),
                "auth_method": "password",
            },
        )

        db.add(new_user)
        db.flush()

        hashed_password = self.get_password_hash(user_data.password)
        user_password = models.UserPassword(
            user_id=new_user.id, hashed_password=hashed_password
        )

        db.add(user_password)
        db.commit()

        assign_default_role_to_user(db, new_user)
        self._assign_admin_if_first_user(db, new_user)

        user_with_relations = load_user_with_relations(db, new_user.id)
        create_session(request, user_with_relations.id, user_with_relations.username)

        return self._build_user_response_data(user_with_relations)

    def login(
        self,
        db: Session,
        login_data: UserLogin,
        request: Request,
    ) -> dict:
        """
        Login with username and password.
        
        Raises HTTPException 401 if credentials invalid or user inactive.
        Returns user response data dictionary.
        """
        query = (
            select(models.User)
            .options(
                joinedload(models.User.roles),
                joinedload(models.User.groups),
                joinedload(models.User.password_auth),
            )
            .filter(models.User.username == login_data.username)
        )

        result = db.execute(query)
        user = result.scalars().unique().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
            )

        if not user.password_auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password authentication not available for this user",
            )

        if not self.verify_password(
            login_data.password, user.password_auth.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        update_user_last_login(user, db)
        create_session(request, user.id, user.username)

        return self._build_user_response_data(user)

    def get_current_user_info(self, current_user: models.User) -> dict:
        """
        Get current user information.
        
        Returns user response data dictionary.
        """
        return self._build_user_response_data(current_user)

    def change_password(
        self,
        db: Session,
        password_data: PasswordChange,
        current_user: models.User,
    ) -> dict:
        """
        Change user password.
        
        Raises HTTPException 400 if password auth not available or current password incorrect.
        Returns success message dictionary.
        """
        if not current_user.password_auth:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password authentication not available for this user",
            )

        if not self.verify_password(
            password_data.current_password, current_user.password_auth.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        current_user.password_auth.hashed_password = self.get_password_hash(
            password_data.new_password
        )
        current_user.password_auth.updated_at = datetime.now()

        db.commit()

        return {"message": "Password changed successfully"}

    def logout(self, request: Request) -> dict:
        """
        Logout user by clearing session.
        
        Returns success message dictionary.
        """
        clear_session(request)
        return {"message": "Logged out successfully"}


# Singleton instance for easy importing
auth_service = AuthService()