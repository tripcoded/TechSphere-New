import smtplib
from email.message import EmailMessage

from app.config import settings


class EmailService:
    @staticmethod
    def _build_otp_message(recipient: str, otp_code: str) -> EmailMessage:
        message = EmailMessage()
        message["Subject"] = "Verify your email"
        message["From"] = f"TechSphere <{settings.smtp_from_email}>"
        message["To"] = recipient

        # Plain text fallback for clients that do not render HTML.
        message.set_content(
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

        message.add_alternative(html_content, subtype="html")
        return message

    def send_otp_email(self, recipient: str, otp_code: str) -> None:
        if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
            raise ValueError("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.")

        message = self._build_otp_message(recipient=recipient, otp_code=otp_code)

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
