from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


def get_current_user(db: Session = Depends(get_db)) -> User:
    """
    Retrieve current logged-in user.
    Provides a default user for development until the auth module is connected.
    """
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(
            id=1,
            email="radhika@example.com",
            name="Radhika Kandalkar",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
