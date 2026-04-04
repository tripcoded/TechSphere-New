import smtplib
from email.message import EmailMessage
from urllib.parse import urlsplit, urlunsplit

import httpx

from app.config import settings


class EmailService:
    RESEND_USER_AGENT = "techsphere-backend/1.0"

    @staticmethod
    def _build_otp_content(otp_code: str) -> tuple[str, str, str]:
        subject = "Verify your email"
        text_content = (
            f"Your OTP is {otp_code}. "
            f"It expires in {settings.otp_ttl_seconds // 60} minutes."
        )
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
                <div style="max-width: 500px; margin: auto; background: white; padding: 25px; border-radius: 10px;">
                    <h2 style="color: #333;">Verify Your Email</h2>

                    <p style="color: #555;">
                        Use the following OTP to complete your verification:
                    </p>

                    <div style="
                        font-size: 28px;
                        font-weight: bold;
                        letter-spacing: 6px;
                        background: #f1f3f5;
                        padding: 15px;
                        text-align: center;
                        border-radius: 8px;
                        margin: 20px 0;
                    ">
                        {otp_code}
                    </div>

                    <p style="color: #777;">
                        This OTP is valid for {settings.otp_ttl_seconds // 60} minutes.
                    </p>

                    <p style="color: #999; font-size: 12px;">
                        If you did not request this, you can safely ignore this email.
                    </p>

                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />

                    <p style="font-size: 12px; color: #aaa;">
                        TechSphere Team
                    </p>
                </div>
            </body>
        </html>
        """
        return subject, text_content, html_content

    @classmethod
    def _build_otp_message(cls, recipient: str, otp_code: str) -> EmailMessage:
        subject, text_content, html_content = cls._build_otp_content(otp_code)
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"TechSphere <{settings.smtp_from_email}>"
        message["To"] = recipient

        # Plain text fallback for clients that do not render HTML.
        message.set_content(text_content)
        message.add_alternative(html_content, subtype="html")
        return message

    @staticmethod
    def _resolve_provider() -> str:
        if settings.email_provider == "auto":
            return "resend" if settings.resend_api_key else "smtp"
        return settings.email_provider

    @staticmethod
    def _resolve_resend_api_url() -> str:
        raw_url = (settings.resend_api_url or "").strip() or "https://api.resend.com/emails"
        parsed = urlsplit(raw_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(
                "RESEND_API_URL is invalid. Use the full endpoint, for example "
                "https://api.resend.com/emails."
            )

        normalized_path = parsed.path.rstrip("/")
        if normalized_path in {"", "/"}:
            normalized_path = "/emails"

        return urlunsplit((parsed.scheme, parsed.netloc, normalized_path, parsed.query, parsed.fragment))

    @staticmethod
    def _raise_resend_error(response: httpx.Response) -> None:
        if response.is_success:
            return

        detail = response.text.strip()
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            detail = payload.get("message") or payload.get("error") or payload.get("name") or detail

        if response.status_code == 401:
            raise ValueError(
                "Resend rejected the request with 401. Check that RESEND_API_KEY is present and valid."
            )

        if response.status_code == 403:
            from_email = settings.resend_from_email.strip().lower()
            if from_email.endswith("@resend.dev"):
                raise ValueError(
                    "Resend rejected the request with 403. The testing sender onboarding@resend.dev "
                    "can only send to the email address associated with your Resend account. To send OTPs "
                    "to other recipients, verify your own domain in Resend and set RESEND_FROM_EMAIL to "
                    "an address on that domain."
                )
            raise ValueError(
                "Resend rejected the request with 403. Check that RESEND_FROM_EMAIL uses a verified "
                "domain in Resend and that the API key has permission to send email. "
                f"Resend response: {detail or 'Forbidden'}"
            )

        raise httpx.HTTPStatusError(
            f"Resend email request failed with status {response.status_code}: {detail or response.reason_phrase}",
            request=response.request,
            response=response,
        )

    @staticmethod
    def _send_via_smtp(message: EmailMessage) -> None:
        if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
            raise ValueError("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.")

        try:
            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as client:
                    client.login(settings.smtp_user, settings.smtp_password)
                    client.send_message(message)
                return

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as client:
                client.ehlo()
                if settings.smtp_use_tls:
                    client.starttls()
                    client.ehlo()
                client.login(settings.smtp_user, settings.smtp_password)
                client.send_message(message)
        except OSError as exc:
            if exc.errno == 101 and settings.smtp_port in {25, 465, 587}:
                raise OSError(
                    "SMTP connection failed before handshake. If this service runs on Render Free, "
                    "ports 25, 465, and 587 are blocked. Configure Resend or move to a paid instance."
                ) from exc
            raise

    @classmethod
    def _send_via_resend(cls, recipient: str, otp_code: str) -> None:
        if not settings.resend_api_key:
            raise ValueError("Resend is not configured. Set RESEND_API_KEY.")

        subject, text_content, html_content = cls._build_otp_content(otp_code)
        response = httpx.post(
            cls._resolve_resend_api_url(),
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
                "User-Agent": cls.RESEND_USER_AGENT,
            },
            json={
                "from": f"TechSphere <{settings.resend_from_email}>",
                "to": [recipient],
                "subject": subject,
                "text": text_content,
                "html": html_content,
            },
            timeout=15,
        )
        cls._raise_resend_error(response)

    def send_otp_email(self, recipient: str, otp_code: str) -> None:
        provider = self._resolve_provider()
        if provider == "smtp":
            message = self._build_otp_message(recipient=recipient, otp_code=otp_code)
            self._send_via_smtp(message)
            return
        if provider == "resend":
            self._send_via_resend(recipient=recipient, otp_code=otp_code)
            return
        raise ValueError("Unsupported email provider. Use EMAIL_PROVIDER=auto, smtp, or resend.")
