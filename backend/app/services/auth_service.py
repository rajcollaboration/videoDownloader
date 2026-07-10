from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def create_access_token(self, user_id: str, role: str) -> str:
        expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
        payload = {"sub": user_id, "role": role, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)

    def decode_token(self, token: str) -> dict[str, Any]:
        try:
            return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        except JWTError as exc:
            raise ValueError("Invalid token") from exc

    def register(self, db: Session, email: str, password: str, role: str = "user") -> User:
        existing = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
        if existing:
            raise ValueError("Email already registered")
        user = User(email=email, password_hash=self.hash_password(password), role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate(self, db: Session, email: str, password: str) -> User | None:
        user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
        if not user or not self.verify_password(password, user.password_hash):
            return None
        return user

    def get_user(self, db: Session, user_id: str) -> User | None:
        return db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()


auth_service = AuthService()
