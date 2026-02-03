"""
Script to create an admin user.
Usage: python -m app.scripts.create_admin
"""

import sys
from getpass import getpass

from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.db import SessionLocal, engine
from app.models import Base, User


def create_admin_user(username: str, password: str) -> None:
    """Create an admin user in the database."""
    db: Session = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"Error: User '{username}' already exists.")
            return

        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            hashed_password=hashed_password,
            is_active=True,
        )

        db.add(new_user)
        db.commit()
        print(f"Admin user '{username}' created successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        sys.exit(1)
    finally:
        db.close()


def main():
    """Main function to create admin user."""

    print("=== Create Admin User ===")
    username = input("Enter username (default: admin): ").strip() or "admin"

    password = getpass("Enter password: ")
    if not password:
        print("Error: Password cannot be empty.")
        sys.exit(1)

    password_confirm = getpass("Confirm password: ")
    if password != password_confirm:
        print("Error: Passwords do not match.")
        sys.exit(1)

    create_admin_user(username, password)


if __name__ == "__main__":
    main()
