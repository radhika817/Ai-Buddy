import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new user account with hashed password.
    Returns 400 if the email is already registered.
    Automatically reassigns existing legacy mock meetings to the first real registered user.
    """
    normalized_email = payload.email.strip().lower()

    # Check for existing user with this email
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user and existing_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in instead.",
        )

    hashed_pw = hash_password(payload.password)

    # Check if there is an unauthenticated mock user (e.g. id=1 with no password_hash)
    mock_user = db.query(User).filter(User.id == 1, User.password_hash.is_(None)).first()

    if existing_user and existing_user.id == 1 and not existing_user.password_hash:
        # User is setting up the mock account with real credentials
        existing_user.password_hash = hashed_pw
        if payload.name:
            existing_user.name = payload.name.strip()
        db.commit()
        db.refresh(existing_user)
        logger.info(f"Registered real credentials for user ID 1 ({normalized_email}).")
        return existing_user

    # Create new real user
    new_user = User(
        email=normalized_email,
        password_hash=hashed_pw,
        name=payload.name.strip() if payload.name else None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Reassign any meetings belonging to the legacy mock user (id=1) to the first real user
    if mock_user and mock_user.id != new_user.id:
        reassigned_count = (
            db.query(Meeting)
            .filter(Meeting.user_id == mock_user.id)
            .update({Meeting.user_id: new_user.id}, synchronize_session=False)
        )
        # Remove legacy passwordless user record
        db.delete(mock_user)
        db.commit()
        logger.info(f"Reassigned {reassigned_count} legacy meetings from mock user to new user ID {new_user.id}.")

    logger.info(f"Successfully registered new user: {normalized_email} (ID: {new_user.id})")
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates email and password, returning a 7-day signed JWT access token.
    """
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    logger.info(f"User {normalized_email} (ID: {user.id}) successfully authenticated.")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns profile information for the currently authenticated user.
    """
    return current_user
