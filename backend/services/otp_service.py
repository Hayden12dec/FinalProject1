import os
import random
import smtplib
import logging
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from backend.config.settings import settings

logger = logging.getLogger(__name__)

class OTPService:
    """
    Manages One-Time Password (OTP) generation, secure SMTP email delivery,
    and verification for Student and Administrator registration.
    """
    def __init__(self, expiry_minutes: int = 10, max_attempts: int = 5):
        self.expiry_minutes = expiry_minutes
        self.max_attempts = max_attempts
        # In-memory store: { email_lower: { "otp": str, "expires_at": datetime, "attempts": int, "verified": bool } }
        self._otp_store: Dict[str, Dict[str, Any]] = {}

    def generate_otp(self, email: str, purpose: str = "registration") -> str:
        """
        Generates a 6-digit numeric OTP, stores it with expiry, logs it to console,
        and dispatches an HTML email to the registered email address.
        """
        clean_email = email.lower().strip()
        otp = f"{random.randint(100000, 999999):06d}"
        expires_at = datetime.utcnow() + timedelta(minutes=self.expiry_minutes)

        self._otp_store[clean_email] = {
            "otp": otp,
            "purpose": purpose,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "attempts": 0,
            "verified": False
        }

        # Prominently log the generated OTP to console for proctor/developer visibility
        print("\n" + "=" * 65)
        print(f" [OTP DISPATCH SERVICE]")
        print(f" Target Recipient: {clean_email}")
        print(f" Verification OTP: {otp}")
        print(f" Valid Duration:   {self.expiry_minutes} Minutes (Until {expires_at.strftime('%H:%M:%S UTC')})")
        print(f" Account Scope:    {purpose.replace('-', ' ').title()}")
        print("=" * 65 + "\n")

        logger.info(f"Generated registration OTP for {clean_email}: {otp}")

        # Send to registered email asynchronously in background thread
        self.send_email_async(clean_email, otp, purpose)

        return otp

    def send_email_async(self, recipient_email: str, otp_code: str, purpose: str = "registration"):
        """
        Dispatches email in a background daemon thread so API responses remain instant.
        """
        email_thread = threading.Thread(
            target=self._send_email_smtp,
            args=(recipient_email, otp_code, purpose),
            daemon=True,
            name=f"otp-email-{recipient_email}"
        )
        email_thread.start()

    def _send_email_smtp(self, recipient_email: str, otp_code: str, purpose: str):
        """
        Connects via SMTP to send the verification email with HTML styling and fallback.
        """
        smtp_user = settings.SMTP_USER.strip()
        smtp_password = settings.SMTP_PASSWORD.replace(" ", "").strip()
        smtp_host = settings.SMTP_HOST.strip()
        smtp_port = settings.SMTP_PORT
        from_email = settings.SMTP_FROM_EMAIL.strip() or smtp_user or "no-reply@proctor.edu"
        from_name = settings.SMTP_FROM_NAME.strip() or "Smart Proctoring System"

        if not settings.SMTP_ENABLED or not smtp_user or not smtp_password:
            logger.info(
                f"[EMAIL NOTICE] SMTP is not fully configured (SMTP_USER/SMTP_PASSWORD empty in .env). "
                f"Verification OTP for {recipient_email} is '{otp_code}' (logged in console and response)."
            )
            return

        try:
            role_label = "Administrator" if "admin" in purpose.lower() else "Student Candidate"
            subject = f"Your Verification Code: {otp_code} - Smart Examination Proctoring"

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = recipient_email

            # Plain text fallback
            text_content = (
                f"AI-Based Smart Examination Proctoring System\n\n"
                f"Your registration verification code for {role_label} account is:\n\n"
                f"    {otp_code}\n\n"
                f"This code will expire in {self.expiry_minutes} minutes.\n"
                f"If you did not request this code, please ignore this email.\n"
            )

            # Modern Rich HTML Template
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background-color: #151d30; border-radius: 16px; border: 1px solid #2a3754; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;">
                <tr>
                  <td style="padding: 32px 28px; text-align: center;">
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 50px; color: #60a5fa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                      Secure Authentication
                    </div>
                    <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                      Smart Examination Proctoring
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                      Please verify your email address to complete your <strong>{role_label}</strong> profile registration.
                    </p>

                    <div style="background-color: #0a0e1a; border: 2px dashed #3b82f6; border-radius: 12px; padding: 22px 16px; margin: 0 0 24px 0;">
                      <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        One-Time Verification Code
                      </div>
                      <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace;">
                        {otp_code}
                      </div>
                    </div>

                    <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; border-radius: 4px; padding: 12px 14px; margin-bottom: 24px; text-align: left; font-size: 12px; color: #e2e8f0; line-height: 1.5;">
                      ⏰ <strong>Security Notice:</strong> This OTP is valid for <strong>{self.expiry_minutes} minutes</strong>. Do not share this code with anyone. Institutional proctors will never ask for your verification code.
                    </div>

                    <div style="border-top: 1px solid #23314d; padding-top: 18px; font-size: 11px; color: #64748b; line-height: 1.4;">
                      Sent automatically to <strong>{recipient_email}</strong>.<br/>
                      © 2026 AI-Based Smart Examination Proctoring System.
                    </div>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port} for {recipient_email}...")

            if settings.SMTP_USE_TLS:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
                server.ehlo()

            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, [recipient_email], msg.as_string())
            server.quit()

            print(f" [EMAIL DISPATCHED] OTP successfully sent to {recipient_email} via {smtp_host}!\n")
            logger.info(f"OTP email successfully sent to {recipient_email}")

        except Exception as err:
            err_str = str(err)
            print("\n" + "!" * 65)
            print(f" [EMAIL DISPATCH FAILED] Could not send OTP to {recipient_email} via SMTP")
            print(f" Reason: {err_str}")
            if "534" in err_str or "Authentication" in err_str or "Connection unexpectedly closed" in err_str:
                print(" TIP (Gmail Users): Google requires a 16-character App Password.")
                print(" 1. Ensure 2-Step Verification is active on your Google account.")
                print(" 2. Generate an App Password at: https://myaccount.google.com/apppasswords")
                print(" 3. Set SMTP_USER and SMTP_PASSWORD in your .env file and restart backend.")
            print(f" [ACTIVE OTP FOR TESTING]: {otp_code} (or click 'Quick Fill' in the UI)")
            print("!" * 65 + "\n")
            logger.warning(f"SMTP error while sending OTP email to {recipient_email}: {err}")

    def verify_otp(self, email: str, otp: str, consume: bool = True) -> bool:
        """
        Validates the provided OTP against the stored code for the email.
        """
        clean_email = email.lower().strip()
        clean_otp = str(otp).strip()

        # In Demo Mode, allow master fallback code '123456' or '000000'
        if settings.DEMO_MODE_ENABLED and clean_otp in ("123456", "000000"):
            logger.info(f"Demo master OTP accepted for {clean_email}")
            return True

        record = self._otp_store.get(clean_email)
        if not record:
            logger.warning(f"No OTP record found for {clean_email}")
            return False

        # Check expiration
        if datetime.utcnow() > record["expires_at"]:
            logger.warning(f"Expired OTP used for {clean_email}")
            del self._otp_store[clean_email]
            return False

        # Check maximum attempts
        record["attempts"] += 1
        if record["attempts"] > self.max_attempts:
            logger.warning(f"Max OTP verification attempts exceeded for {clean_email}")
            del self._otp_store[clean_email]
            return False

        if record["otp"] == clean_otp:
            record["verified"] = True
            if consume:
                # Remove consumed OTP to prevent replay attacks
                del self._otp_store[clean_email]
            logger.info(f"OTP successfully verified for {clean_email}")
            return True

        logger.warning(f"Invalid OTP entered for {clean_email}: {clean_otp}")
        return False

    def get_active_otp(self, email: str) -> Optional[str]:
        """Returns the current active OTP if not expired (useful for demo/UI previews)."""
        clean_email = email.lower().strip()
        record = self._otp_store.get(clean_email)
        if record and datetime.utcnow() <= record["expires_at"]:
            return record["otp"]
        return None

otp_service = OTPService()
