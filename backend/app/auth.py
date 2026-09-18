import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# Paths that don't require a valid login. Everything else under /api/* is
# protected by the global dependency below.
PUBLIC_PATHS = {
    "/", "/api/auth/login", "/api/health",
    "/docs", "/redoc", "/openapi.json",
}

# ---------------------------------------------------------------------------
# Secret key: MUST be set via environment variable in any real deployment,
# or every server restart invalidates all sessions (and a default key would
# be predictable / insecure for anything public-facing).
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
    print(
        "\n"
        "!! WARNING: no SECRET_KEY environment variable set. Using a random key\n"
        "   for this run only — everyone will be logged out on restart, and\n"
        "   this is NOT safe for a public deployment. Set SECRET_KEY to a long\n"
        "   random string in your environment before hosting this publicly.\n"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 14  # 14 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized
    username = decode_token(token)
    if not username:
        raise unauthorized
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise unauthorized
    return user


async def require_auth(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """
    Global gate applied to every route in the app. Requests to PUBLIC_PATHS
    pass through untouched; everything else must carry a valid Bearer token.
    """
    if request.url.path in PUBLIC_PATHS:
        return None
    return get_current_user(token=token, db=db)
