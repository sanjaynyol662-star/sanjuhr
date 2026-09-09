"""Pluggable email helper.

Uses SMTP if all SMTP_* env vars are set, otherwise logs to console. This lets
the app work end-to-end in dev without any external credentials — customer can
later plug in Gmail/SendGrid/Resend SMTP details via .env to enable delivery.
"""
import os
import smtplib
import asyncio
import logging
import resend
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

log = logging.getLogger("emails")


def _smtp_configured() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"))


def _resend_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY"))


def _do_send_resend(to: str, subject: str, html: str, text_body: str) -> dict:
    """Blocking Resend API call. Run in a thread from async code."""
    try:
        resend.api_key = os.environ["RESEND_API_KEY"]
        sender = os.environ.get("SENDER_EMAIL") or "onboarding@resend.dev"
        res = resend.Emails.send({"from": sender, "to": [to], "subject": subject, "html": html, "text": text_body})
        log.info(f"Email sent via Resend to {to}: {subject} (id={res.get('id') if isinstance(res, dict) else res})")
        return {"sent": True, "mode": "resend"}
    except Exception as e:
        log.error(f"Resend send failed: {e}")
        return {"sent": False, "mode": "resend", "error": str(e)}


def _do_send_smtp(to: str, subject: str, html: str, text_body: str) -> dict:
    """Blocking SMTP call. Must be run in an executor when called from async code."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = os.environ["SMTP_FROM"]
        msg["To"] = to
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html, "html"))
        host = os.environ["SMTP_HOST"]
        port = int(os.environ["SMTP_PORT"])
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.starttls()
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
            s.sendmail(os.environ["SMTP_FROM"], [to], msg.as_string())
        log.info(f"Email sent to {to}: {subject}")
        return {"sent": True, "mode": "smtp"}
    except Exception as e:
        log.error(f"Failed to send email: {e}")
        return {"sent": False, "mode": "smtp", "error": str(e)}


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> dict:
    """Send an email synchronously.

    In DEV mode (no SMTP configured) logs to console — this is safe to call from
    async code because it does not block. When SMTP IS configured this DOES block
    for up to 15s; async callers should use `send_email_async()` instead.
    Returns {sent: bool, mode: 'smtp'|'log', error?: str}.
    """
    text_body = text or html
    if _resend_configured():
        return _do_send_resend(to, subject, html, text_body)
    if not _smtp_configured():
        log.info("=" * 70)
        log.info(f"[EMAIL — DEV MODE, would send to] {to}")
        log.info(f"[Subject] {subject}")
        log.info(f"[Body]\n{text_body}")
        log.info("=" * 70)
        return {"sent": True, "mode": "log"}
    return _do_send_smtp(to, subject, html, text_body)


async def send_email_async(to: str, subject: str, html: str, text: Optional[str] = None) -> dict:
    """Non-blocking wrapper — offloads SMTP send to a thread so it never stalls the event loop."""
    text_body = text or html
    if _resend_configured():
        return await asyncio.to_thread(_do_send_resend, to, subject, html, text_body)
    if not _smtp_configured():
        # DEV mode is pure logging — safe to inline
        return send_email(to, subject, html, text)
    return await asyncio.to_thread(_do_send_smtp, to, subject, html, text_body)


def render_confirmation(kind: str, name: str, ref_no: str, extra_lines: list = None) -> tuple:
    """Return (subject, html) for an application confirmation email."""
    label = "Solar" if kind == "solar" else "Loan"
    lines = extra_lines or []
    lines_html = "".join(f"<li>{l}</li>" for l in lines)
    subject = f"[Haryana Enterprises] {label} Application Received — {ref_no}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
      <div style="background: #0e6b3a; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">HARYANA ENTERPRISES</h2>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Solar · Subsidy · Loan · Installation</div>
      </div>
      <div style="padding: 24px; background: #f7f9f8;">
        <p style="font-size: 16px;">Hello <b>{name}</b>,</p>
        <p>Thank you for submitting your <b>{label}</b> application. Our team will reach out within 24 hours.</p>
        <div style="background:#fff; border-left:4px solid #f57c00; padding:14px 18px; margin: 18px 0; border-radius:4px;">
          <div style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:2px;">Reference Number</div>
          <div style="font-size:22px; color:#0e6b3a; font-weight:700; letter-spacing:1px;">{ref_no}</div>
        </div>
        {"<ul style='color:#333; line-height:1.6;'>" + lines_html + "</ul>" if lines_html else ""}
        <p style="margin-top: 20px;">You can track status anytime at
          <a href="#" style="color:#0e6b3a; font-weight:600;">Track Application</a>.
        </p>
        <p style="color:#666; font-size: 13px; margin-top: 26px;">
          — Team Haryana Enterprises<br>
          Kagdana, Sirsa · +91 8167862016 · WhatsApp 8168762016
        </p>
      </div>
      <div style="background:#0a5330; color:#cfe7d6; padding:14px; text-align:center; font-size:12px;">
        © Haryana Enterprises. This is an automated confirmation.
      </div>
    </div>
    """
    return subject, html


def render_reset(name: str, reset_link: str) -> tuple:
    subject = "[Haryana Enterprises] Password Reset Link"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin:0 auto; color:#222;">
      <div style="background:#0e6b3a; color:#fff; padding:20px; text-align:center;">
        <h2 style="margin:0;">Password Reset</h2>
      </div>
      <div style="padding:24px; background:#f7f9f8;">
        <p>Hello <b>{name}</b>,</p>
        <p>You (or someone) requested to reset your password. Click below within 1 hour to set a new password:</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{reset_link}" style="background:#0e6b3a; color:#fff; padding:12px 26px; border-radius:6px; text-decoration:none; font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="color:#666; font-size: 13px;">Or copy/paste this link:<br>
          <a href="{reset_link}" style="color:#0e6b3a; word-break:break-all;">{reset_link}</a>
        </p>
        <p style="color:#666; font-size: 13px; margin-top:22px;">If you did not request this, ignore this email.</p>
      </div>
    </div>
    """
    return subject, html
