from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.media import TokenResponse, UserLoginRequest, UserRegisterRequest
from app.services.auth_service import auth_service

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(
    payload: UserRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        user = auth_service.register(db, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    token = auth_service.create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user_id=user.id, role=user.role)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    user = auth_service.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = auth_service.create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user_id=user.id, role=user.role)


@router.get("/me")
def me(user: Annotated[User, Depends(get_current_user)]):
    return {"id": user.id, "email": user.email, "role": user.role}
