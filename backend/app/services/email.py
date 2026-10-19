"""
Email service for sending registration and notification emails.
"""

import os
import secrets
import smtplib
from email.message import EmailMessage


def generate_password() -> str:
    """Generate a secure random password for new users."""
    return secrets.token_urlsafe(9)


def send_email(to: str, subject: str, body: str) -> None:
    """
    Send an email using SMTP configuration from environment variables.

    Raises:
        RuntimeError: If SMTP_HOST is not configured.
        smtplib.SMTPException: If sending fails.
    """
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        raise RuntimeError("SMTP not configured")

    smtp_port = int(os.getenv("SMTP_PORT", "1025"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", "noreply@plavdata.local")
    smtp_tls = os.getenv("SMTP_TLS", "false").lower() == "true"

    msg = EmailMessage()
    msg["From"] = smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        if smtp_tls:
            server.starttls()
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(msg)
