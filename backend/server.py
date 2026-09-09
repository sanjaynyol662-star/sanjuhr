"""HARYANA ENTERPRISES - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import asyncio
import logging
import uuid
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Body, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, PlainTextResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from starlette.middleware.cors import CORSMiddleware
from bson import ObjectId

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
    require_admin,
)
from emails import send_email, send_email_async, render_confirmation, render_reset
from csc_services import CSC_CATEGORIES, all_service_ids, find_service
from scrapers import fetch_freejobalert, refresh_vacancies_into_db, fetch_article_detail, backfill_application_mode, is_expired, parse_last_date, state_from_text, _cat_from_title, _dedupe_key, clean_promo_html, _is_junk_link, apply_brand, brand_html
import ssr
import hindi_content
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Dynamic rendering is only active in production (dev/preview always serves the SPA).
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in ("production", "prod")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="HR Digital Services API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("haryana")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ─────────── Models ───────────
class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str


class EnquiryIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    mobile: str = Field(min_length=7, max_length=15)
    email: EmailStr
    service: str = Field(min_length=2, max_length=80)
    message: str = Field(min_length=5, max_length=1500)


class SolarApplicationIn(BaseModel):
    application_type: str
    full_name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    state: str = "Haryana"
    pincode: str
    property_type: str
    roof_area_sqft: Optional[float] = None
    estimated_kw: Optional[float] = None
    monthly_bill: Optional[float] = None
    electricity_provider: Optional[str] = None
    consumer_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    notes: Optional[str] = None


class LoanApplicationIn(BaseModel):
    loan_type: str
    full_name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    state: str = "Haryana"
    pincode: str
    occupation: str
    monthly_income: float
    loan_amount: float
    loan_tenure_months: int
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    notes: Optional[str] = None


class StatusUpdateIn(BaseModel):
    status: str


class NoticeIn(BaseModel):
    title_hi: str
    title_en: str
    type: str = "info"


class CSCRequestIn(BaseModel):
    service_id: str
    full_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    aadhaar_number: Optional[str] = None
    remarks: Optional[str] = None
    custom_service: Optional[str] = None  # for 'other_custom'


class IrrigationApplicationIn(BaseModel):
    scheme_type: str  # 'diggi' | 'sprinkler' | 'drip' | 'poplar' | 'other'
    full_name: str
    email: EmailStr
    phone: str
    village: str
    tehsil: Optional[str] = None
    district: str = "Sirsa"
    state: str = "Haryana"
    pincode: Optional[str] = None
    land_area_acre: Optional[float] = None
    khasra_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    crops: Optional[str] = None
    water_source: Optional[str] = None  # 'canal' | 'tubewell' | 'borewell' | 'other'
    category: Optional[str] = None      # 'general' | 'sc' | 'st' | 'obc' | 'small' | 'marginal'
    notes: Optional[str] = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


# ─────────── Uploads dir (legacy local files) + Emergent Object Storage ───────────
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_MB = 8

# New uploads go to Emergent object storage so they persist across deploys.
import requests as _requests

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "hr-digital-services"
_storage_key = None


def init_storage(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = _requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = _requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:  # dead cached key — re-init once
        init_storage(force=True)
        resp = _requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _storage_key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        init_storage(force=True)
        resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": _storage_key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ─────────── Helpers ───────────
def user_public(u: dict) -> dict:
    return {
        "id": u.get("user_id") or str(u.get("_id") or u.get("id", "")),
        "user_id": u.get("user_id") or str(u.get("_id") or ""),
        "name": u.get("name"),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "role": u.get("role", "user"),
        "picture": u.get("picture"),
        "auth_provider": u.get("auth_provider", "email"),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


def doc_public(a: dict) -> dict:
    a = dict(a)
    a["id"] = str(a.pop("_id", a.get("id", "")))
    for k, v in list(a.items()):
        if isinstance(v, datetime):
            a[k] = v.isoformat()
    return a


# ─────────── Root ───────────
@api.get("/")
async def root():
    return {"message": "HR Digital Services API", "status": "ok"}


# ─────────── Auth: register/login/logout/me ───────────
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "name": payload.name,
        "email": email,
        "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"user": user_public(doc), "access_token": access}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Ensure user_id exists
    user_id = user.get("user_id") or str(user["_id"])
    if not user.get("user_id"):
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"user_id": user_id}})
        user["user_id"] = user_id
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"user": user_public(user), "access_token": access}


@api.post("/auth/session")
async def create_google_session(request: Request, response: Response):
    """Exchange Emergent Auth session_id (from URL fragment) for a session_token cookie."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header required")

    async with httpx.AsyncClient(timeout=15.0) as http:
        try:
            r = await http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
        except Exception as e:
            log.error(f"Emergent auth call failed: {e}")
            raise HTTPException(status_code=502, detail="Auth provider unreachable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()

    email = (data.get("email") or "").lower()
    name = data.get("name") or "User"
    picture = data.get("picture") or ""
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="Malformed auth provider response")

    # Upsert user
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing.get("user_id") or str(existing["_id"])
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"user_id": user_id, "name": name, "picture": picture, "auth_provider": "google"}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "user",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })

    # Save session
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        "session_token", session_token,
        httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 3600, path="/",
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user_public(user)}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Also delete session record if any
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user_public(user)


# ─────────── Password reset ───────────
@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, request: Request):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    # Do not leak whether email exists — always return ok.
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user.get("user_id") or str(user["_id"]),
            "email": email,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })
        # Build reset link using frontend origin
        origin = request.headers.get("origin") or os.environ.get("FRONTEND_URL", "")
        reset_link = f"{origin.rstrip('/')}/reset-password?token={token}"
        subject, html = render_reset(user.get("name", "there"), reset_link)
        send_email(email, subject, html)
        log.info(f"Password reset requested for {email}. Link: {reset_link}")
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    doc = await db.password_reset_tokens.find_one({"token": payload.token})
    if not doc or doc.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or already used token")
    exp = doc["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")

    # Update password
    new_hash = hash_password(payload.password)
    user_id = doc["user_id"]
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": new_hash}})
    if result.matched_count == 0:
        # Fallback by email
        await db.users.update_one({"email": doc["email"]}, {"$set": {"password_hash": new_hash}})

    await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
    return {"ok": True, "message": "Password updated. You can now sign in."}


# ─────────── Contact ───────────
@api.post("/contact")
async def create_contact(payload: ContactIn):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    res = await db.contacts.insert_one(doc)
    log.info(f"Contact submitted: {payload.email} - {payload.subject}")
    return {"id": str(res.inserted_id), "ok": True}


# ─────────── SEO: dynamic vacancy sitemap (referenced by /sitemap.xml sitemap index at site root) ───────────
SITE_URL = os.environ.get("PUBLIC_SITE_URL", "https://hrdigitalservices.in").rstrip("/")


@api.get("/sitemap.xml", response_class=Response)
async def sitemap_xml():
    """Canonical dynamic sitemap — static pages + ACTIVE (non-expired) vacancies + blogs."""
    body = await ssr.build_sitemap(db, SITE_URL)
    return Response(content=body, media_type="application/xml",
                    headers={"Cache-Control": "public, max-age=1800"})


@api.get("/sitemap-vacancies.xml", response_class=Response)
async def sitemap_vacancies_xml():
    """Vacancies-only sitemap (ACTIVE jobs). Kept for backwards-compatibility."""
    urls = []
    today = datetime.now(timezone.utc).date().isoformat()
    try:
        async for v in db.vacancies.find(
            {}, {"_id": 1, "fetched_at": 1, "last_date_text": 1}, sort=[("fetched_at", -1)]
        ).limit(2000):
            if is_expired(v.get("last_date_text")):
                continue
            fetched = v.get("fetched_at")
            lastmod = fetched.date().isoformat() if fetched else today
            urls.append(
                f"  <url><loc>{SITE_URL}/vacancies/{str(v['_id'])}</loc>"
                f"<lastmod>{lastmod}</lastmod>"
                f"<changefreq>weekly</changefreq>"
                f"<priority>0.8</priority></url>"
            )
    except Exception as e:
        log.warning(f"sitemap vacancies query failed: {e}")

    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    return Response(content=body, media_type="application/xml",
                    headers={"Cache-Control": "public, max-age=1800"})


@api.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt_legacy():
    """Legacy alias — the canonical robots.txt is served statically at the site root."""
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /api/sitemap.xml\n"
        "Allow: /api/sitemap-vacancies.xml\n"
        "Disallow: /api/\n"
        f"Sitemap: {SITE_URL}/api/sitemap.xml\n"
    )


# ─────────── Dynamic Rendering (SSR-for-bots) ───────────
@api.get("/render", response_class=Response)
async def render_for_crawler(path: str = "/"):
    """Explicit server-render endpoint. Returns full crawlable HTML for a route
    backed by live data. Used by the production edge-rewrite for crawler traffic
    (and for verification via `curl -A Googlebot`). Falls back to 404 for
    unsupported routes so the caller can serve the SPA instead."""
    html_out = await ssr.render_path(db, path, SITE_URL, DEFAULT_SITE_CONTENT)
    if not html_out:
        raise HTTPException(status_code=404, detail="Route not SSR-supported")
    return Response(content=html_out, media_type="text/html; charset=utf-8",
                    headers={"Cache-Control": "public, max-age=1800",
                             "X-Rendered-By": "ssr"})


# ─────────── Customer Enquiry (public, minimal fields) ───────────
@api.post("/enquiry")
async def create_enquiry(payload: EnquiryIn):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    doc["ref_no"] = f"ENQ-{uuid.uuid4().hex[:8].upper()}"
    res = await db.enquiries.insert_one(doc)
    log.info(f"Enquiry submitted: {payload.email} - {payload.service} ({doc['ref_no']})")
    return {"id": str(res.inserted_id), "ref_no": doc["ref_no"], "ok": True}


# ─────────── Solar / Loan Applications ───────────
async def _optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


@api.post("/solar/apply")
@api.post("/loan/apply")
async def _deprecated_solar_loan_apply():
    raise HTTPException(
        status_code=410,
        detail="This application endpoint has been discontinued. Please use the customer enquiry form at /api/enquiry (Name, Mobile, Email, Service, Message only). We no longer collect Aadhaar, PAN or bank details.",
    )


@api.get("/solar/my")
async def my_solar_apps(user=Depends(get_current_user)):
    apps = await db.solar_applications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [doc_public(a) for a in apps]


@api.get("/loan/my")
async def my_loan_apps(user=Depends(get_current_user)):
    apps = await db.loan_applications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [doc_public(a) for a in apps]


# ─────────── File uploads ───────────
@api.post("/uploads")
async def upload_file(
    file: UploadFile = File(...),
    kind: str = Form("misc"),
    ref_no: Optional[str] = Form(None),
    user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Only PDF/JPEG/PNG/WebP allowed. Got {file.content_type}")
    body = await file.read()
    if len(body) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_MB} MB.")

    ext = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    fname = f"{uuid.uuid4().hex}.{ext}"
    storage_path = f"{APP_NAME}/uploads/{user['id']}/{fname}"
    await asyncio.to_thread(put_object, storage_path, body, file.content_type)

    meta = {
        "id": fname,
        "user_id": user["id"],
        "original_name": file.filename,
        "mime": file.content_type,
        "size": len(body),
        "kind": kind,
        "ref_no": ref_no,
        "storage_path": storage_path,
        "is_deleted": False,
        "url": f"/api/uploads/{fname}",
        "created_at": datetime.now(timezone.utc),
    }
    await db.uploads.insert_one(meta)

    # If ref_no is attached, push URL into the application's documents array
    if ref_no:
        upd = {"$push": {"documents": {"kind": kind, "url": meta["url"], "original_name": file.filename, "size": len(body)}}}
        r1 = await db.solar_applications.update_one({"ref_no": ref_no, "user_id": user["id"]}, upd)
        if r1.matched_count == 0:
            await db.loan_applications.update_one({"ref_no": ref_no, "user_id": user["id"]}, upd)

    meta.pop("_id", None)
    meta["created_at"] = meta["created_at"].isoformat()
    return meta


@api.get("/uploads/{fname}")
async def get_upload(fname: str):
    # Basic path traversal guard
    if "/" in fname or "\\" in fname or ".." in fname:
        raise HTTPException(status_code=400, detail="Invalid filename")
    fpath = UPLOAD_DIR / fname
    if fpath.exists():  # legacy locally-stored files
        return FileResponse(fpath)
    meta = await db.uploads.find_one({"id": fname, "is_deleted": {"$ne": True}})
    if not meta or not meta.get("storage_path"):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = await asyncio.to_thread(get_object, meta["storage_path"])
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=meta.get("mime") or ctype)


# ─────────── Public Status ───────────
@api.get("/status/{ref_no}")
async def status_lookup(ref_no: str):
    for coll in ("solar_applications", "loan_applications"):
        doc = await db[coll].find_one({"ref_no": ref_no})
        if doc:
            return doc_public(doc)
    raise HTTPException(status_code=404, detail="Application not found")


# ─────────── Public Content ───────────
@api.get("/notices")
async def get_notices():
    notices = await db.notices.find({}).sort("created_at", -1).to_list(50)
    return [doc_public(n) for n in notices]


@api.get("/faqs")
async def get_faqs():
    items = await db.faqs.find({}).to_list(200)
    return [doc_public(i) for i in items]


@api.get("/downloads")
async def get_downloads():
    items = await db.downloads.find({}).to_list(200)
    return [doc_public(i) for i in items]


# ─────────── Vacancies (FreeJobAlert scraper) ───────────
def _annotate_and_filter_vacancy_expired(items: list, include_expired: bool = False) -> list:
    """Compute `is_expired` for each vacancy on the fly and (optionally) filter them out."""
    out = []
    for v in items:
        v["is_expired"] = is_expired(v.get("last_date_text"))
        if v["is_expired"] and not include_expired:
            continue
        out.append(v)
    return out


# Common Indian govt-job acronyms → full phrases so a search like "gds" also
# matches "Gramin Dak Sevak". Applied per-token during vacancy search.
SEARCH_SYNONYMS = {
    "gds": ["gramin dak sevak", "gramin dak"],
    "postman": ["post office"],
    "ssc": ["staff selection"],
    "upsc": ["union public service"],
    "ibps": ["institute of banking"],
    "rrb": ["railway recruitment"],
    "po": ["probationary officer"],
    "tgt": ["trained graduate teacher"],
    "pgt": ["post graduate teacher"],
    "anm": ["auxiliary nurse"],
    "gnm": ["general nursing"],
    "je": ["junior engineer"],
    "ldc": ["lower division clerk"],
    "udc": ["upper division clerk"],
    "mts": ["multi tasking staff", "multi-tasking"],
    "asi": ["assistant sub inspector"],
    "si": ["sub inspector"],
    "cgl": ["combined graduate level"],
    "chsl": ["combined higher secondary"],
}



@api.get("/vacancies")
async def list_vacancies(
    category: Optional[str] = None,
    q: Optional[str] = None,
    qualification: Optional[str] = None,
    mode: Optional[str] = None,
    state: Optional[str] = None,
    include_expired: bool = False,
    only_expired: bool = False,
    limit: int = 500,
    page: int = 1,
    per_page: int = 20,
):
    query = {}
    # Haryana is a "cross-cutting" view: include any vacancy tagged as haryana
    # OR any vacancy whose title/organization mentions Haryana / HSSC / HPSC etc.
    haryana_rx = r"\b(haryana|hssc|hpsc|hbse|hkrn|hprb|panchkula|chandigarh)\b"
    if category == "haryana":
        query["$or"] = [
            {"category": "haryana"},
            {"title": {"$regex": haryana_rx, "$options": "i"}},
            {"organization": {"$regex": haryana_rx, "$options": "i"}},
            {"post_name": {"$regex": haryana_rx, "$options": "i"}},
            {"row_text": {"$regex": haryana_rx, "$options": "i"}},
        ]
    elif category == "other":
        # "Other" = non-Haryana misc jobs; Haryana posts live in the Haryana category
        query["category"] = "other"
        if not state or state == "all":
            query["state"] = {"$ne": "haryana"}
    elif category and category != "all":
        query["category"] = category
    # Hide admit_card / result listings unless the user explicitly selected
    # those categories. This applies to the default "All" view AND every
    # other category (including haryana / state filters) so admit-card items
    # never leak into a normal job-browsing session.
    # EXCEPTION: when the user is running a text search (`q`), search across
    # ALL categories (including admit_card/result) so a matching post surfaces
    # even without selecting its category filter.
    if not q and category not in ("admit_card", "result"):
        existing = query.get("category")
        if isinstance(existing, dict):
            existing["$nin"] = list(set(existing.get("$nin", []) + ["admit_card", "result"]))
        elif isinstance(existing, str):
            # Concrete category chosen (e.g. bank/ssc) — no need to exclude,
            # that category is already narrower than admit_card/result.
            pass
        else:
            query["category"] = {"$nin": ["admit_card", "result"]}
    if state and state != "all":
        query["state"] = state
    if qualification and qualification != "all":
        query["qualification"] = {"$regex": qualification, "$options": "i"}
    if mode == "other":
        query["$and"] = query.get("$and", []) + [{
            "$or": [{"application_mode": None}, {"application_mode": {"$exists": False}}]
        }]
    elif mode and mode in ("online", "offline"):
        query["application_mode"] = mode
    if q:
        # Advanced keyword search — every word in the query must match somewhere:
        # title, post name, organization, qualification, category, state or raw text.
        # e.g. "clerk haryana" finds posts containing BOTH words (in any field).
        raw_tokens = [t for t in re.split(r"\s+", q.strip()) if t]
        search_fields = ["title", "post_name", "organization", "qualification", "row_text", "category", "state"]
        and_clauses = query.setdefault("$and", [])
        if "$or" in query:  # preserve existing $or (e.g. haryana cross-cutting view)
            and_clauses.append({"$or": query.pop("$or")})
        for raw in raw_tokens:
            tok = re.escape(raw)
            ors = [{f: {"$regex": tok, "$options": "i"}} for f in search_fields]
            for syn in SEARCH_SYNONYMS.get(raw.lower(), []):
                syn_rx = re.escape(syn)
                ors += [{f: {"$regex": syn_rx, "$options": "i"}} for f in search_fields]
            and_clauses.append({"$or": ors})
    # When user explicitly wants expired items OR wants to include them,
    # we need to scan more docs because they tend to be older (sort=fetched_at desc)
    effective_limit = 1000 if (only_expired or include_expired) else min(limit, 1000)
    items = await db.vacancies.find(query).sort("fetched_at", -1).to_list(effective_limit)
    public = [doc_public(v) for v in items]
    for v in public:
        v["is_expired"] = is_expired(v.get("last_date_text"))
    if only_expired:
        public = [v for v in public if v["is_expired"]]
    elif not include_expired:
        public = [v for v in public if not v["is_expired"]]
    # Server-side pagination — 20 vacancies per page by default
    per_page = min(max(per_page, 1), 50)
    page = max(page, 1)
    total = len(public)
    if q and page == 1:
        try:
            qn = q.strip()
            await db.search_logs.insert_one({
                "q": qn[:120],
                "q_lower": qn.lower()[:120],
                "results": total,
                "at": datetime.now(timezone.utc),
            })
        except Exception:
            pass
    start = (page - 1) * per_page
    return {
        "items": public[start:start + per_page],
        "total": total,
        "page": page,
        "pages": max((total + per_page - 1) // per_page, 1),
    }


@api.get("/vacancies/stats")
async def vacancies_stats():
    # We compute expiry client-side on the "last_date_text" field, so aggregate manually
    all_items = await db.vacancies.find({}, {
        "category": 1, "application_mode": 1, "last_date_text": 1, "fetched_at": 1,
        "title": 1, "organization": 1, "post_name": 1, "row_text": 1, "state": 1,
    }).to_list(2000)

    total_including_expired = len(all_items)
    active_items = [v for v in all_items if not is_expired(v.get("last_date_text"))]
    expired_count = total_including_expired - len(active_items)
    # "All Vacancies" view excludes admit_card and result — they have their own
    # dedicated buttons/pages. This keeps the top-level counts aligned with what
    # a student sees when they land on /vacancies with no category selected.
    job_items = [v for v in active_items if v.get("category") not in ("admit_card", "result")]
    total = len(job_items)

    by_cat_counts: dict = {}
    for v in active_items:
        c = v.get("category") or "other"
        by_cat_counts[c] = by_cat_counts.get(c, 0) + 1

    # Haryana is a cross-cutting view — include vacancies from any category whose
    # title/organization mentions Haryana / HSSC / HPSC etc. (matches list_vacancies)
    haryana_re = re.compile(r"\b(haryana|hssc|hpsc|hbse|hkrn|hprb|panchkula|chandigarh)\b", re.I)
    haryana_count = 0
    for v in active_items:
        blob = " ".join([str(v.get(k) or "") for k in ("title", "organization", "post_name", "row_text")])
        if v.get("category") == "haryana" or haryana_re.search(blob):
            haryana_count += 1
    by_cat_counts["haryana"] = haryana_count

    by_cat = [{"category": c, "count": n} for c, n in by_cat_counts.items()]

    online_count = sum(1 for v in job_items if v.get("application_mode") == "online")
    offline_count = sum(1 for v in job_items if v.get("application_mode") == "offline")
    other_count = sum(1 for v in job_items if not v.get("application_mode"))
    by_mode = {"all": total, "online": online_count, "offline": offline_count, "other": other_count}

    # State counts (canonical slug -> count) — exclude admit_card/result too so
    # the state dropdown matches the "All Vacancies" view semantics.
    by_state_counts: dict = {}
    for v in job_items:
        s = v.get("state")
        if s:
            by_state_counts[s] = by_state_counts.get(s, 0) + 1
    by_state = [{"state": s, "count": n} for s, n in sorted(by_state_counts.items(), key=lambda x: -x[1])]

    latest = await db.vacancies.find({}, sort=[("fetched_at", -1)], limit=1).to_list(1)
    last_updated = latest[0]["fetched_at"].isoformat() if latest and latest[0].get("fetched_at") else None
    return {
        "total": total,
        "total_including_expired": total_including_expired,
        "expired": expired_count,
        "by_category": by_cat,
        "by_mode": by_mode,
        "by_state": by_state,
        "last_updated": last_updated,
    }


async def _enrich_vacancy_bg(vac_id: str):
    """Background enrichment: scrape article detail (if missing) and (re)generate
    Hindi content via templates + LLM. Runs AFTER the response is sent so opening
    a vacancy is instant. Safe to fail silently."""
    try:
        oid = ObjectId(vac_id)
        v = await db.vacancies.find_one({"_id": oid})
        if not v:
            return
        # Scrape full article detail if we don't have it yet.
        if not v.get("content_html") and v.get("url") and v.get("source") != "manual":
            detail = await fetch_article_detail(v["url"])
            if detail:
                await db.vacancies.update_one({"_id": oid}, {"$set": detail})
                v.update(detail)
            else:
                await db.vacancies.update_one({"_id": oid}, {"$set": {"detail_attempted_at": datetime.now(timezone.utc)}})
        # Full Hindi generation (templates + LLM rewrite) unless admin-edited.
        if not v.get("hindi_edited"):
            hindi = await hindi_content.generate_hindi_content(v)
            await db.vacancies.update_one({"_id": oid}, {"$set": hindi})
    except Exception as e:
        log.warning(f"Background enrich failed for {vac_id}: {e}")


@api.get("/vacancies/{vac_id}")
async def get_vacancy_detail(vac_id: str, background_tasks: BackgroundTasks):
    try:
        oid = ObjectId(vac_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    v = await db.vacancies.find_one({"_id": oid})
    if not v:
        raise HTTPException(404, "Vacancy not found")

    now_utc = datetime.now(timezone.utc)
    prev_attempt = v.get("detail_attempted_at")
    if prev_attempt and prev_attempt.tzinfo is None:
        prev_attempt = prev_attempt.replace(tzinfo=timezone.utc)
    recently_attempted = prev_attempt and (now_utc - prev_attempt).total_seconds() < 3600

    # ─── Instant-response strategy ───
    # Heavy work (article scraping + LLM Hindi rewrite) is deferred to a
    # background task so the page opens immediately. On this view the user sees
    # instant template content; richer content appears on the next view.
    stale_hindi = (v.get("hindi_ver") or 0) < hindi_content.HINDI_CONTENT_VER
    need_detail = not v.get("content_html") and bool(v.get("url")) and v.get("source") != "manual" and not recently_attempted
    need_hindi = not v.get("hindi_edited") and (not v.get("hindi_intro") or stale_hindi)

    set_now = {}
    # Ensure Hindi templates exist RIGHT NOW (instant, no LLM) so nothing is blank.
    if not v.get("hindi_edited") and (not v.get("hindi_intro") or stale_hindi):
        base = hindi_content.build_templates(v)
        base["hindi_source"] = v.get("hindi_source") if v.get("hindi_source") == "llm" else "template"
        base["hindi_ver"] = hindi_content.HINDI_CONTENT_VER  # optimistic: stops re-scheduling
        # keep any existing LLM description until the bg task refreshes it
        if v.get("hindi_source") == "llm" and v.get("hindi_description"):
            base["hindi_description"] = v["hindi_description"]
        set_now.update(base)
        v.update(base)

    # English descriptive fields (instant, deterministic).
    if not v.get("english_intro"):
        eng = hindi_content.build_english_templates(v)
        set_now.update(eng)
        v.update(eng)

    if set_now:
        await db.vacancies.update_one({"_id": oid}, {"$set": set_now})

    # Schedule background enrichment (detail scrape + LLM Hindi) if needed.
    if need_detail or need_hindi:
        background_tasks.add_task(_enrich_vacancy_bg, vac_id)

    await db.vacancies.update_one({"_id": oid}, {"$inc": {"views": 1}})
    v["views"] = (v.get("views") or 0) + 1
    return doc_public(v)


@api.post("/admin/vacancies/refresh")
async def admin_refresh_vacancies(_=Depends(require_admin)):
    before_urls = set([v["url"] async for v in db.vacancies.find({}, {"url": 1})])
    added = await refresh_vacancies_into_db(db)
    total = await db.vacancies.count_documents({})
    ssr.clear_cache()  # crawlers should see the refreshed data
    # Fan-out notifications for newly-added vacancies
    if added > 0:
        new_docs = await db.vacancies.find({"url": {"$nin": list(before_urls)}}).to_list(added * 2)
        if new_docs:
            await _enrich_vacancy_docs(new_docs)  # SEO variants + WhatsApp summaries
            await _notify_subscribers_of_new_vacancies(new_docs)
    return {"ok": True, "new_added": added, "total": total}


# ─────────── WhatsApp Smart Engine + SEO Shuffler ───────────
WHATSAPP_CHANNEL_URL = os.environ.get(
    "WHATSAPP_CHANNEL_URL", "https://whatsapp.com/channel/0029Va4Owji5Ui2bLEktCl1C"
)

SEO_TITLE_PREFIXES = [
    "Haryana Govt Jobs 2026:",
    "Sarkari Bharti Haryana:",
    "Latest Haryana Vacancy:",
    "HKRN Recruitment Update:",
    "Haryana Sarkari Naukri Alert:",
    "Haryana Bharti Board Notice:",
]

SEO_DESC_OPENERS = [
    "Haryana mein nayi sarkari bharti ki latest jaankari.",
    "Latest update Haryana government recruitment ke liye yahan padhein.",
    "Sarkari naukri ki talash mein hain? Yeh bharti zaroor dekhein.",
    "Haryana ke candidates ke liye sunahra avsar.",
    "Official notification ke anusar nayi vacancy publish hui hai.",
    "Haryana job seekers ke liye important recruitment alert.",
]


def _extract_total_posts(v: dict) -> str:
    s = v.get("structured") or {}
    tp = s.get("total_posts_num") or s.get("total_posts")
    if tp:
        return str(tp)
    for field in (v.get("post_name"), v.get("title"), v.get("row_text")):
        if field:
            m = re.search(r"(\d[\d,]*)\s*(post|vacan|seat)", str(field), re.I)
            if m:
                return m.group(1)
    return "Notification देखें"


def build_whatsapp_summary(v: dict) -> str:
    """WhatsApp Smart Engine — auto-formatted shareable summary for a vacancy."""
    title = (v.get("post_name") or v.get("title") or "Govt Vacancy").strip()
    qual = v.get("qualification") or (v.get("structured") or {}).get("qualification") or "As per notification"
    last = v.get("last_date_text") or (v.get("structured") or {}).get("apply_end") or "जल्द ही घोषित"
    vac_id = str(v.get("_id") or v.get("id") or "")
    link = f"{SITE_URL}/vacancies/{vac_id}" if vac_id else (v.get("apply_url") or SITE_URL)
    return (
        f"🔥 {title} 🔥\n"
        f"✅ कुल पद: {_extract_total_posts(v)}\n"
        f"✅ योग्यता: {qual}\n"
        f"📅 आखरी तारीख: {last}\n"
        f"👇 लिंक: {link}"
    )


def _seo_variant(base_title: str, base_desc: str, idx: int):
    prefix = SEO_TITLE_PREFIXES[idx % len(SEO_TITLE_PREFIXES)]
    opener = SEO_DESC_OPENERS[idx % len(SEO_DESC_OPENERS)]
    title = f"{prefix} {base_title}".strip()
    desc = f"{opener} {base_desc or base_title}".strip()
    return title[:200], desc[:400]


async def _enrich_vacancy_docs(docs: list):
    """Assign SEO title/description variants (scraped jobs) and WhatsApp summaries
    to any vacancy docs that don't have them yet. Idempotent."""
    for v in docs:
        updates = {}
        if v.get("source") != "manual":
            if not v.get("original_title"):
                updates["original_title"] = v.get("title") or ""
                updates["original_description"] = v.get("description") or v.get("row_text") or ""
            if not v.get("seo_title"):
                idx = secrets.randbelow(len(SEO_TITLE_PREFIXES))
                t, d = _seo_variant(
                    updates.get("original_title") or v.get("original_title") or v.get("title", ""),
                    updates.get("original_description") or v.get("original_description") or "",
                    idx,
                )
                updates["seo_title"] = t
                updates["seo_description"] = d
        if not v.get("whatsapp_summary"):
            updates["whatsapp_summary"] = build_whatsapp_summary(v)
        if updates:
            await db.vacancies.update_one({"_id": v["_id"]}, {"$set": updates})


# ─────────── Admin: Manual Vacancy CRUD ───────────
# Manually-authored vacancies live in the same `vacancies` collection but carry
# `source: "manual"` and a synthetic `url: "internal://manual/{uuid}"` so they
# never collide with (or get overwritten by) the FreeJobAlert scraper's upserts.

class ManualVacancyIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=250)
    organization: Optional[str] = Field(None, max_length=180)
    post_name: Optional[str] = Field(None, max_length=250)
    qualification: Optional[str] = Field(None, max_length=180)
    category: Optional[str] = Field(None, max_length=40)     # e.g. bank, ssc, teaching, haryana
    application_mode: Optional[str] = Field(None, pattern="^(online|offline)?$")
    state: Optional[str] = Field(None, max_length=40)        # canonical slug (e.g. haryana, delhi)
    last_date_text: Optional[str] = Field(None, max_length=80)
    apply_url: Optional[str] = Field(None, max_length=500)   # external "Apply Now" link
    description: Optional[str] = Field(None, max_length=200000)  # simple HTML / markdown-ish text (scraped posts can be long)
    total_posts: Optional[str] = Field(None, max_length=40)
    seo_title: Optional[str] = Field(None, max_length=200)
    focus_keyword: Optional[str] = Field(None, max_length=120)
    seo_description: Optional[str] = Field(None, max_length=400)
    tags: Optional[List[str]] = None
    important_links: Optional[List[dict]] = None   # [{label, url, type}] — URLs and/or uploaded PDFs
    # Hindi descriptive fields (admin-editable; auto-generated by default)
    hindi_intro: Optional[str] = Field(None, max_length=20000)
    hindi_description: Optional[str] = Field(None, max_length=200000)
    hindi_how_to_apply: Optional[str] = Field(None, max_length=20000)
    hindi_selection_process: Optional[str] = Field(None, max_length=20000)


def _manual_doc(payload: ManualVacancyIn, existing_url: Optional[str] = None) -> dict:
    now = datetime.now(timezone.utc)
    url = existing_url or f"internal://manual/{uuid.uuid4().hex}"
    # Description is rendered by the frontend detail page via `content_html`; wrap
    # plain text in <p> so the reader gets sensible spacing.
    desc = (payload.description or "").strip()
    if desc and "<" not in desc:
        desc = "".join(f"<p>{line}</p>" for line in desc.split("\n") if line.strip())
    doc = {
        "url": url,
        "source": "manual",
        "source_type": "manual",
        "title": payload.title.strip()[:250],
        "organization": (payload.organization or "").strip()[:180] or None,
        "post_name": (payload.post_name or payload.title).strip()[:250],
        "qualification": (payload.qualification or "").strip()[:180] or None,
        "category": (payload.category or "other").strip().lower()[:40],
        "application_mode": payload.application_mode or None,
        "state": (payload.state or "").strip().lower()[:40] or None,
        "last_date_text": (payload.last_date_text or "").strip()[:80] or None,
        "apply_url": (payload.apply_url or "").strip()[:500] or None,
        "content_html": desc or None,
        "detail_fetched_at": now,   # marks detail as "fresh" — no lazy scrape needed
        "row_text": f"{payload.title} {payload.organization or ''}",
        "fetched_at": now,
        "structured": {
            "post_name": (payload.post_name or payload.title).strip()[:250],
            "qualification": (payload.qualification or "").strip()[:180] or None,
            "last_date_text": (payload.last_date_text or "").strip()[:80] or None,
            "total_posts": (payload.total_posts or "").strip()[:40] or None,
            "description": desc or None,
        },
        "seo_title": (payload.seo_title or "").strip()[:200] or None,
        "focus_keyword": (payload.focus_keyword or "").strip()[:120] or None,
        "seo_description": (payload.seo_description or "").strip()[:400] or None,
        "tags": [t.strip()[:60] for t in (payload.tags or []) if t and t.strip()][:20],
        "important_links": [
            {
                "label": (l.get("label") or "").strip()[:120] or "Link",
                "url": (l.get("url") or "").strip()[:600],
                "type": (l.get("type") or "link").strip()[:20],
            }
            for l in (payload.important_links or [])
            if (l.get("url") or "").strip()
        ][:30],
    }
    # Hindi descriptive fields: only persist when the admin actually supplied
    # them (so an ordinary edit never wipes previously generated/edited Hindi).
    # Supplying any of them marks the post as admin-edited → no auto-regeneration.
    _hindi_map = {
        "hindi_intro": payload.hindi_intro,
        "hindi_description": payload.hindi_description,
        "hindi_how_to_apply": payload.hindi_how_to_apply,
        "hindi_selection_process": payload.hindi_selection_process,
    }
    _provided = {k: v.strip() for k, v in _hindi_map.items() if v is not None and v.strip()}
    if _provided:
        doc.update(_provided)
        doc["hindi_edited"] = True
        doc["hindi_source"] = "admin"
        doc["hindi_generated_at"] = now
    return doc


@api.get("/admin/vacancies")
async def admin_list_manual_vacancies(_=Depends(require_admin)):
    """List manual (admin-authored) vacancies only. Sorted newest first."""
    rows = await db.vacancies.find({"source": "manual"}).sort("created_at", -1).to_list(500)
    return [doc_public(r) for r in rows]


@api.post("/admin/vacancies")
async def admin_create_manual_vacancy(payload: ManualVacancyIn, _=Depends(require_admin)):
    doc = _manual_doc(payload)
    doc["created_at"] = datetime.now(timezone.utc)
    res = await db.vacancies.insert_one(doc)
    doc["_id"] = res.inserted_id
    doc["whatsapp_summary"] = build_whatsapp_summary(doc)
    await db.vacancies.update_one({"_id": res.inserted_id}, {"$set": {"whatsapp_summary": doc["whatsapp_summary"]}})
    return doc_public(doc)


@api.put("/admin/vacancies/{vac_id}")
async def admin_update_manual_vacancy(vac_id: str, payload: ManualVacancyIn, _=Depends(require_admin)):
    try:
        oid = ObjectId(vac_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    existing = await db.vacancies.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Vacancy not found")
    # Editing an API (scraped) post is allowed — doing so promotes it to a
    # "manual" post so it ranks better and is never touched by auto-refresh /
    # Shuffle-API-SEO again. Manual posts can of course also be edited.
    new_doc = _manual_doc(payload, existing_url=existing.get("url"))
    if existing.get("source") != "manual" and not existing.get("original_title"):
        new_doc["original_title"] = existing.get("title")
        new_doc["original_description"] = existing.get("seo_description") or existing.get("description")
    new_doc["whatsapp_summary"] = build_whatsapp_summary({**new_doc, "_id": oid})
    await db.vacancies.update_one({"_id": oid}, {"$set": new_doc})
    updated = await db.vacancies.find_one({"_id": oid})
    return doc_public(updated)


@api.post("/admin/vacancies/{vac_id}/hindi/regenerate")
async def admin_regenerate_hindi(vac_id: str, _=Depends(require_admin)):
    """Force re-generation of the Hindi descriptive content (templates + LLM).
    Clears the admin-edited flag so the fresh auto-generated content is used."""
    try:
        oid = ObjectId(vac_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    v = await db.vacancies.find_one({"_id": oid})
    if not v:
        raise HTTPException(404, "Vacancy not found")
    hindi = await hindi_content.generate_hindi_content(v)
    hindi["hindi_edited"] = False
    await db.vacancies.update_one({"_id": oid}, {"$set": hindi})
    ssr.clear_cache()
    updated = await db.vacancies.find_one({"_id": oid})
    return doc_public(updated)



@api.delete("/admin/vacancies/{vac_id}")
async def admin_delete_manual_vacancy(vac_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(vac_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    existing = await db.vacancies.find_one({"_id": oid}, {"source": 1})
    if not existing:
        raise HTTPException(404, "Vacancy not found")
    if existing.get("source") != "manual":
        raise HTTPException(400, "Only manual vacancies can be deleted from the admin panel")
    await db.vacancies.delete_one({"_id": oid})
    return {"ok": True, "id": vac_id}


# ─────────── Vacancy Alert Subscriptions ───────────
class SubscribeIn(BaseModel):
    email: EmailStr
    categories: List[str] = []      # e.g. ["bank", "ssc"]
    qualifications: List[str] = []  # e.g. ["graduate", "12th"]
    keyword: Optional[str] = None


@api.post("/vacancy-alerts/subscribe")
async def vacancy_alerts_subscribe(payload: SubscribeIn):
    if not payload.categories and not payload.qualifications and not payload.keyword:
        raise HTTPException(400, "Select at least one category, qualification or a keyword")
    doc = {
        "email": payload.email.lower(),
        "categories": [c.lower() for c in payload.categories][:12],
        "qualifications": [q.lower() for q in payload.qualifications][:8],
        "keyword": (payload.keyword or "").strip()[:80] or None,
        "unsubscribe_token": secrets.token_urlsafe(16),
        "created_at": datetime.now(timezone.utc),
        "verified": True,  # skip double opt-in for now
        "active": True,
        "last_notified_at": None,
    }
    res = await db.vacancy_subscriptions.update_one(
        {"email": doc["email"]},
        {"$set": {k: v for k, v in doc.items() if k not in ("created_at",)},
         "$setOnInsert": {"created_at": doc["created_at"]}},
        upsert=True,
    )
    # Confirmation email via existing (mocked in dev) sender
    try:
        subject = "You're subscribed to HR Digital Services job alerts"
        body_html = (
            f"<h3>Alerts activated ✔</h3>"
            f"<p>You'll be notified about new government vacancies matching:</p>"
            f"<ul>"
            f"<li><b>Categories:</b> {', '.join(doc['categories']) or 'Any'}</li>"
            f"<li><b>Qualifications:</b> {', '.join(doc['qualifications']) or 'Any'}</li>"
            f"<li><b>Keyword:</b> {doc['keyword'] or '—'}</li>"
            f"</ul>"
            f"<p>Unsubscribe anytime: <code>{doc['unsubscribe_token']}</code></p>"
        )
        await send_email_async(payload.email, subject, body_html)
    except Exception as e:
        log.warning(f"subscribe email send failed: {e}")
    return {"ok": True, "created": res.upserted_id is not None, "unsubscribe_token": doc["unsubscribe_token"]}


@api.get("/vacancy-alerts/status")
async def vacancy_alerts_status(email: EmailStr):
    sub = await db.vacancy_subscriptions.find_one({"email": email.lower()})
    if not sub:
        return {"subscribed": False}
    return {
        "subscribed": bool(sub.get("active", True)),
        "categories": sub.get("categories", []),
        "qualifications": sub.get("qualifications", []),
        "keyword": sub.get("keyword"),
    }


@api.post("/vacancy-alerts/unsubscribe")
async def vacancy_alerts_unsubscribe(token: str = Body(..., embed=True)):
    res = await db.vacancy_subscriptions.update_one({"unsubscribe_token": token}, {"$set": {"active": False}})
    if res.matched_count == 0:
        raise HTTPException(404, "Invalid unsubscribe token")
    return {"ok": True}


def _vacancy_matches_sub(v: dict, sub: dict) -> bool:
    cats = sub.get("categories") or []
    quals = sub.get("qualifications") or []
    kw = (sub.get("keyword") or "").lower().strip()
    if cats and v.get("category") not in cats:
        return False
    if quals:
        qtext = (v.get("qualification") or "").lower()
        if not any(q in qtext for q in quals):
            return False
    if kw:
        blob = f"{v.get('title','')} {v.get('post_name','')} {v.get('organization','')} {v.get('qualification','')}".lower()
        if kw not in blob:
            return False
    return True


async def _notify_subscribers_of_new_vacancies(new_vacancies: list[dict]):
    subs = await db.vacancy_subscriptions.find({"active": True}).to_list(2000)
    if not subs:
        return
    frontend_base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    sent = 0
    for sub in subs:
        matched = [v for v in new_vacancies if _vacancy_matches_sub(v, sub)]
        if not matched:
            continue
        items_html = "".join(
            f'<li style="margin:8px 0"><b>{(m.get("post_name") or m.get("title") or "Vacancy")}</b> '
            f'— {m.get("organization","")} · Last: {m.get("last_date_text","N/A")} '
            f'<br/><a href="{frontend_base}/vacancies/{str(m["_id"])}">View details</a></li>'
            for m in matched[:15]
        )
        body = (
            f'<h3>{len(matched)} new job(s) match your alert</h3>'
            f'<ul>{items_html}</ul>'
            f'<p style="font-size:11px;color:#888">Unsubscribe token: <code>{sub.get("unsubscribe_token","")}</code></p>'
        )
        try:
            await send_email_async(sub["email"], f"[Job Alert] {len(matched)} new vacancies for you", body)
            await db.vacancy_subscriptions.update_one(
                {"_id": sub["_id"]},
                {"$set": {"last_notified_at": datetime.now(timezone.utc)}}
            )
            sent += 1
        except Exception as e:
            log.warning(f"notify {sub.get('email')} failed: {e}")
    log.info(f"[alerts] Notified {sent}/{len(subs)} subscribers about {len(new_vacancies)} new vacancies")


# ─────────── CSC Services ───────────
@api.get("/csc/services")
async def csc_services_list():
    return CSC_CATEGORIES


@api.post("/csc/apply")
@api.post("/irrigation/apply")
async def _deprecated_csc_irrigation_apply():
    raise HTTPException(
        status_code=410,
        detail="This application endpoint has been discontinued. Please use the customer enquiry form at /api/enquiry (Name, Mobile, Email, Service, Message only). We no longer collect Aadhaar, PAN or bank details.",
    )


@api.get("/csc/my")
async def csc_my(user=Depends(get_current_user)):
    apps = await db.csc_requests.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [doc_public(a) for a in apps]


@api.get("/admin/csc")
async def admin_csc(_=Depends(require_admin)):
    apps = await db.csc_requests.find({}).sort("created_at", -1).to_list(1000)
    return [doc_public(a) for a in apps]


@api.patch("/admin/csc/{ref_no}/status")
async def admin_update_csc_status(ref_no: str, payload: StatusUpdateIn, _=Depends(require_admin)):
    if payload.status not in ("submitted", "under_review", "approved", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.csc_requests.update_one({"ref_no": ref_no}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ─────────── Micro Irrigation / Farm services ───────────
IRRIGATION_SCHEMES = {
    "diggi":     {"hi": "डिग्गी (फार्म पॉण्ड)",        "en": "Diggi (Farm Pond)",              "subsidy": "70% – 85%"},
    "sprinkler": {"hi": "फव्वारा सिंचाई प्रणाली",       "en": "Sprinkler Irrigation System",   "subsidy": "Up to 85%"},
    "drip":      {"hi": "ड्रिप सिंचाई",                "en": "Drip Irrigation",                "subsidy": "Up to 85%"},
    "poplar":    {"hi": "सफेदा (Poplar) बागवानी",     "en": "Poplar (Safeda) Plantation",     "subsidy": "P23, P288 varieties"},
    "other":     {"hi": "अन्य कृषि योजना",             "en": "Other Farm Scheme",              "subsidy": "As applicable"},
}


@api.get("/irrigation/schemes")
async def irrigation_schemes():
    return IRRIGATION_SCHEMES


@api.post("/irrigation/apply")
async def _deprecated_irrigation_apply():
    raise HTTPException(
        status_code=410,
        detail="This application endpoint has been discontinued. Please use the customer enquiry form at /api/enquiry (Name, Mobile, Email, Service, Message only). We no longer collect Aadhaar, PAN or bank details.",
    )


@api.get("/irrigation/my")
async def irrigation_my(user=Depends(get_current_user)):
    apps = await db.irrigation_applications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [doc_public(a) for a in apps]


@api.get("/admin/irrigation")
async def admin_irrigation(_=Depends(require_admin)):
    apps = await db.irrigation_applications.find({}).sort("created_at", -1).to_list(1000)
    return [doc_public(a) for a in apps]


@api.patch("/admin/irrigation/{ref_no}/status")
async def admin_update_irrigation_status(ref_no: str, payload: StatusUpdateIn, _=Depends(require_admin)):
    if payload.status not in ("submitted", "under_review", "approved", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.irrigation_applications.update_one({"ref_no": ref_no}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ─────────── ADMIN ROUTES ───────────
@api.get("/admin/stats")
async def admin_stats(_=Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "solar_apps": await db.solar_applications.count_documents({}),
        "loan_apps": await db.loan_applications.count_documents({}),
        "csc_requests": await db.csc_requests.count_documents({}),
        "contacts": await db.contacts.count_documents({}),
        "solar_pending": await db.solar_applications.count_documents({"status": "submitted"}),
        "loan_pending": await db.loan_applications.count_documents({"status": "submitted"}),
        "csc_pending": await db.csc_requests.count_documents({"status": "submitted"}),
        "solar_approved": await db.solar_applications.count_documents({"status": "approved"}),
        "loan_approved": await db.loan_applications.count_documents({"status": "approved"}),
    }


@api.get("/admin/analytics")
async def admin_analytics(_=Depends(require_admin)):
    """Aggregate analytics for dashboard charts."""
    now = datetime.now(timezone.utc)
    days = [(now - timedelta(days=i)).date() for i in range(29, -1, -1)]

    async def by_day(coll_name):
        buckets = {d.isoformat(): 0 for d in days}
        cur = db[coll_name].find({"created_at": {"$gte": now - timedelta(days=30)}})
        async for doc in cur:
            ca = doc.get("created_at")
            if isinstance(ca, str):
                try: ca = datetime.fromisoformat(ca)
                except Exception: continue
            if not ca: continue
            key = ca.date().isoformat()
            if key in buckets:
                buckets[key] += 1
        return [{"date": k, "count": v} for k, v in buckets.items()]

    async def by_status(coll_name):
        pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        return [{"status": r["_id"] or "unknown", "count": r["count"]} async for r in db[coll_name].aggregate(pipeline)]

    async def by_type(coll_name, field):
        pipeline = [{"$group": {"_id": f"${field}", "count": {"$sum": 1}}}]
        return [{"type": r["_id"] or "unknown", "count": r["count"]} async for r in db[coll_name].aggregate(pipeline)]

    async def loan_amount_stats():
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$loan_amount"}, "avg": {"$avg": "$loan_amount"}, "max": {"$max": "$loan_amount"}}}]
        async for r in db.loan_applications.aggregate(pipeline):
            return {"total": r.get("total") or 0, "avg": r.get("avg") or 0, "max": r.get("max") or 0}
        return {"total": 0, "avg": 0, "max": 0}

    return {
        "solar_by_day": await by_day("solar_applications"),
        "loan_by_day": await by_day("loan_applications"),
        "user_by_day": await by_day("users"),
        "solar_by_status": await by_status("solar_applications"),
        "loan_by_status": await by_status("loan_applications"),
        "solar_by_type": await by_type("solar_applications", "application_type"),
        "loan_by_type": await by_type("loan_applications", "loan_type"),
        "loan_amount": await loan_amount_stats(),
    }



@api.get("/admin/users")
async def admin_users(_=Depends(require_admin)):
    users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(500)
    return [user_public(u) for u in users]


@api.get("/admin/solar")
async def admin_solar(_=Depends(require_admin)):
    apps = await db.solar_applications.find({}).sort("created_at", -1).to_list(500)
    return [doc_public(a) for a in apps]


@api.get("/admin/loan")
async def admin_loan(_=Depends(require_admin)):
    apps = await db.loan_applications.find({}).sort("created_at", -1).to_list(500)
    return [doc_public(a) for a in apps]


@api.get("/admin/contacts")
async def admin_contacts(_=Depends(require_admin)):
    items = await db.contacts.find({}).sort("created_at", -1).to_list(500)
    return [doc_public(c) for c in items]


@api.patch("/admin/solar/{ref_no}/status")
async def admin_update_solar_status(ref_no: str, payload: StatusUpdateIn, _=Depends(require_admin)):
    if payload.status not in ("submitted", "under_review", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.solar_applications.update_one({"ref_no": ref_no}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.patch("/admin/loan/{ref_no}/status")
async def admin_update_loan_status(ref_no: str, payload: StatusUpdateIn, _=Depends(require_admin)):
    if payload.status not in ("submitted", "under_review", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.loan_applications.update_one({"ref_no": ref_no}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.post("/admin/notices")
async def admin_create_notice(payload: NoticeIn, _=Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    res = await db.notices.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_public(doc)


@api.delete("/admin/notices/{notice_id}")
async def admin_delete_notice(notice_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(notice_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.notices.delete_one({"_id": oid})
    return {"ok": True}


# ─────────── Site Content (SEO + editable front-page copy) ───────────
# Stored in the `site_content` collection as { key, value, updated_at } where
# `value` is a free-form dict so the admin can attach any shape (SEO fields,
# hero copy, contact info, etc.) without new migrations.

class SiteContentIn(BaseModel):
    """Public payload for PUT /api/site-content/{key}."""
    value: Dict[str, Any] = Field(default_factory=dict)


# Sensible defaults so a fresh install / production without seeded content still
# renders the site correctly. Admin edits merge into these.
DEFAULT_SITE_CONTENT: Dict[str, Dict[str, Any]] = {
    "seo:home": {
        "title": "HR Digital Services — Govt Approved Rooftop Solar Vendor & Job Vacancies",
        "description": "HR Digital Services: govt-approved rooftop solar vendor. Also India ki latest sarkari naukri, admit card, result — Hindi/English, mobile-friendly.",
        "keywords": "haryana enterprises, rooftop solar vendor, sarkari naukri, admit card, result, latest jobs, hindi jobs, offline form filing",
    },
    "seo:vacancies": {
        "title": "Latest Sarkari Naukri 2026 — HR Digital Services",
        "description": "Explore latest govt jobs, admit cards & results — filter by state, category and application mode. Updated every 6 hours.",
        "keywords": "sarkari naukri, latest govt jobs 2026, admit card, exam result, haryana jobs, delhi jobs, punjab jobs",
    },
    "seo:solar": {
        "title": "Solar Services — HR Digital Services",
        "description": "Govt-approved rooftop solar installation, subsidy guidance aur site survey — Kagdana, Sirsa (Haryana) aur aas-pas ke districts mein.",
        "keywords": "rooftop solar haryana, pm surya ghar subsidy, solar vendor sirsa, solar installation kagdana",
    },
    "seo:blogs": {
        "title": "Blogs — Haryana Jobs News & Career Guidance | HR Digital Services",
        "description": "Haryana sarkari naukri se jude articles — exam preparation tips, recruitment guides aur solar subsidy ki jaankari.",
        "keywords": "haryana jobs blog, sarkari naukri news, exam tips, hkrn guide, solar subsidy blog",
    },
    "seo:services": {
        "title": "Solar Services — HR Digital Services",
        "description": "Govt-approved rooftop solar installation, financing guidance, and CSC-related services in Haryana and neighbouring states.",
        "keywords": "rooftop solar installation, haryana solar vendor, solar financing, csc services",
    },
    "seo:about": {
        "title": "About Us — HR Digital Services",
        "description": "Learn about HR Digital Services — a private, govt-approved rooftop solar vendor helping households and businesses go solar.",
        "keywords": "haryana enterprises about, solar vendor haryana",
    },
    "seo:contact": {
        "title": "Contact — HR Digital Services",
        "description": "Reach out for rooftop solar quotes, offline form assistance, and job-vacancy queries.",
        "keywords": "haryana enterprises contact, rooftop solar quote",
    },
    "content:hero": {
        "heading_hi": "एचआर डिजिटल सर्विसेज",
        "heading_en": "HR Digital Services",
        "tagline_hi": "सरकार-अनुमोदित रूफटॉप सोलर वेंडर — घर और व्यवसाय दोनों के लिए",
        "tagline_en": "Govt-Approved Rooftop Solar Vendor — for Homes & Businesses",
        "cta_hi": "मुफ्त कोटेशन पाएँ",
        "cta_en": "Get a Free Quote",
    },
    "content:about": {
        "text_hi": "HR Digital Services एक निजी, सरकार-अनुमोदित रूफटॉप सोलर वेंडर है। हम घरों और व्यवसायों के लिए सोलर पैनल इंस्टॉलेशन, फ़ाइनेंसिंग गाइडेंस और ऑफ़लाइन फ़ॉर्म भरने की सुविधा प्रदान करते हैं।",
        "text_en": "HR Digital Services is a private, government-approved rooftop solar vendor. We provide solar installation, financing guidance and offline form-filing assistance for households and small businesses.",
    },
    "content:contact": {
        "phone": "+91-9812345678",
        "whatsapp": "+919812345678",
        "email": "info@hrdigitalservices.in",
        "address_hi": "मुख्य बाज़ार, हरियाणा",
        "address_en": "Main Market, Haryana",
    },
}


def _merged_content(key: str, stored):
    """Merge admin-stored value over the default (partial edits stay safe)."""
    base = dict(DEFAULT_SITE_CONTENT.get(key, {}))
    if stored:
        base.update(stored)
    return base


@api.get("/site-content")
async def get_all_site_content():
    """Public — returns every content key merged with defaults. Cached by client."""
    rows = await db.site_content.find({}).to_list(200)
    by_key = {r["key"]: r.get("value", {}) for r in rows}
    out = {k: _merged_content(k, by_key.get(k)) for k in DEFAULT_SITE_CONTENT}
    return {"content": out, "keys": list(DEFAULT_SITE_CONTENT.keys())}


@api.get("/site-content/{key}")
async def get_site_content(key: str):
    if key not in DEFAULT_SITE_CONTENT:
        raise HTTPException(status_code=404, detail="Unknown content key")
    row = await db.site_content.find_one({"key": key})
    return {"key": key, "value": _merged_content(key, (row or {}).get("value"))}


@api.put("/site-content/{key}")
async def put_site_content(key: str, payload: SiteContentIn, _=Depends(require_admin)):
    if key not in DEFAULT_SITE_CONTENT:
        raise HTTPException(status_code=400, detail="Unknown content key")
    # Only accept known fields for this key so an admin typo doesn't inject garbage
    allowed = set(DEFAULT_SITE_CONTENT[key].keys())
    clean = {k: v for k, v in (payload.value or {}).items() if k in allowed}
    now = datetime.now(timezone.utc)
    await db.site_content.update_one(
        {"key": key},
        {"$set": {"value": clean, "updated_at": now}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"key": key, "value": _merged_content(key, clean), "updated_at": now.isoformat()}



# ─────────── SEO Shuffler & Per-Job SEO Manager (Rank Math style) ───────────
class VacancySeoIn(BaseModel):
    seo_title: Optional[str] = Field(None, max_length=200)
    focus_keyword: Optional[str] = Field(None, max_length=120)
    seo_description: Optional[str] = Field(None, max_length=400)
    custom_head: Optional[str] = Field(None, max_length=5000)


@api.post("/admin/vacancies/shuffle-seo")
async def admin_shuffle_api_seo(_=Depends(require_admin)):
    """Rotate title/description variants for all scraped (API) vacancies so
    Google doesn't treat them as duplicate content."""
    n = 0
    async for v in db.vacancies.find({"source": {"$ne": "manual"}}):
        base_t = v.get("original_title") or v.get("title") or ""
        base_d = v.get("original_description") or v.get("description") or v.get("row_text") or ""
        idx = secrets.randbelow(len(SEO_TITLE_PREFIXES))
        t, d = _seo_variant(base_t, base_d, idx)
        await db.vacancies.update_one({"_id": v["_id"]}, {"$set": {"seo_title": t, "seo_description": d}})
        n += 1
    return {"ok": True, "shuffled": n}


@api.post("/admin/vacancies/clean-promo")
async def admin_clean_promo(_=Depends(require_admin)):
    """Strip FreeJobAlert promo links/blocks (Join Telegram/WhatsApp/Arattai
    channel, Sarkari Result, Download Mobile App, etc.) from already-stored
    scraped vacancy content + important_links."""
    cleaned = 0
    async for v in db.vacancies.find({"source": {"$ne": "manual"}}, {"content_html": 1, "important_links": 1}):
        update = {}
        html = v.get("content_html")
        if html:
            new_html = clean_promo_html(html)
            if new_html != html:
                update["content_html"] = new_html
        links = v.get("important_links") or []
        if links:
            kept = [l for l in links if not _is_junk_link(l.get("text") or l.get("label") or "", l.get("href") or l.get("url") or "")]
            if len(kept) != len(links):
                update["important_links"] = kept
        if update:
            await db.vacancies.update_one({"_id": v["_id"]}, {"$set": update})
            cleaned += 1
    return {"ok": True, "cleaned": cleaned}


@api.get("/admin/vacancies-seo")
async def admin_vacancies_seo_list(page: int = 1, per_page: int = 20, q: str = "", _=Depends(require_admin)):
    """Paginated list of ALL vacancies (manual + scraped) with their SEO fields."""
    per_page = min(max(per_page, 1), 50)
    page = max(page, 1)
    query = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"title": rx}, {"organization": rx}, {"post_name": rx}]
    total = await db.vacancies.count_documents(query)
    rows = await db.vacancies.find(query, {
        "title": 1, "organization": 1, "post_name": 1, "source": 1, "category": 1,
        "last_date_text": 1, "seo_title": 1, "focus_keyword": 1, "seo_description": 1,
        "custom_head": 1, "views": 1,
        "whatsapp_summary": 1, "fetched_at": 1,
    }).sort("fetched_at", -1).skip((page - 1) * per_page).limit(per_page).to_list(per_page)
    return {
        "items": [doc_public(r) for r in rows],
        "total": total, "page": page,
        "pages": max((total + per_page - 1) // per_page, 1),
    }


@api.put("/admin/vacancies/{vac_id}/seo")
async def admin_update_vacancy_seo(vac_id: str, payload: VacancySeoIn, _=Depends(require_admin)):
    try:
        oid = ObjectId(vac_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    existing = await db.vacancies.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Vacancy not found")
    update = {
        "seo_title": (payload.seo_title or "").strip()[:200] or None,
        "focus_keyword": (payload.focus_keyword or "").strip()[:120] or None,
        "seo_description": (payload.seo_description or "").strip()[:400] or None,
        "custom_head": (payload.custom_head or "").strip()[:5000] or None,
        # Editing SEO promotes a scraped (API) post to "manual" so the periodic
        # Shuffle-API-SEO job never overwrites the admin's custom SEO again.
        "source": "manual",
        "source_type": "manual",
    }
    if existing.get("source") != "manual" and not existing.get("original_title"):
        update["original_title"] = existing.get("title")
        update["original_description"] = existing.get("seo_description") or existing.get("description")
    await db.vacancies.update_one({"_id": oid}, {"$set": update})
    updated = await db.vacancies.find_one({"_id": oid})
    return doc_public(updated)


# ─────────── Resume / CV Templates (admin upload, public download) ───────────
RESUME_MIME = ALLOWED_MIME | {
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def _save_public_file(file: UploadFile, allowed_mime: set):
    if file.content_type not in allowed_mime:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")
    body = await file.read()
    if len(body) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_MB} MB.")
    ext = Path(file.filename or "").suffix.lower() or ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{APP_NAME}/public/{fname}"
    await asyncio.to_thread(put_object, storage_path, body, file.content_type or "application/octet-stream")
    await db.uploads.insert_one({
        "id": fname,
        "storage_path": storage_path,
        "original_name": file.filename,
        "mime": file.content_type,
        "size": len(body),
        "kind": "public",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
    })
    return f"/api/uploads/{fname}", len(body)


ADMIN_UPLOAD_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


@api.post("/admin/uploads")
async def admin_upload(file: UploadFile = File(...), _=Depends(require_admin)):
    """Generic admin file upload (PDF / image) used by Manual Job Posts important-links."""
    url, size = await _save_public_file(file, ADMIN_UPLOAD_MIME)
    return {"url": url, "name": file.filename, "size": size, "mime": file.content_type}


@api.get("/admin/overview")
async def admin_overview(_=Depends(require_admin)):
    async def _views(coll):
        cur = db[coll].aggregate([{"$group": {"_id": None, "v": {"$sum": {"$ifNull": ["$views", 0]}}}}])
        rows = await cur.to_list(1)
        return int(rows[0]["v"]) if rows else 0
    vac_views = await _views("vacancies")
    blog_views = await _views("blogs")
    return {
        "total_vacancies": await db.vacancies.count_documents({}),
        "manual_vacancies": await db.vacancies.count_documents({"source": "manual"}),
        "total_blogs": await db.blogs.count_documents({}),
        "published_blogs": await db.blogs.count_documents({"status": "published"}),
        "total_reviews": await db.reviews.count_documents({}),
        "total_views": vac_views + blog_views,
        "vacancy_views": vac_views,
        "blog_views": blog_views,
        "contacts": await db.contacts.count_documents({}),
    }


@api.get("/admin/search-analytics")
async def admin_search_analytics(days: int = 30, _=Depends(require_admin)):
    since = datetime.now(timezone.utc) - timedelta(days=max(days, 1))
    match = {"at": {"$gte": since}}
    total_searches = await db.search_logs.count_documents(match)
    unique_terms = len(await db.search_logs.distinct("q_lower", match))

    async def _agg(extra_match, limit):
        rows = await db.search_logs.aggregate([
            {"$match": {**match, **extra_match}},
            {"$group": {
                "_id": "$q_lower",
                "count": {"$sum": 1},
                "q": {"$last": "$q"},
                "avg_results": {"$avg": "$results"},
                "last_at": {"$max": "$at"},
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]).to_list(limit)
        return [{
            "query": r.get("q") or r["_id"],
            "count": r["count"],
            "avg_results": round(r.get("avg_results") or 0),
            "last_at": r.get("last_at"),
        } for r in rows]

    return {
        "days": days,
        "total_searches": total_searches,
        "unique_terms": unique_terms,
        "top": await _agg({}, 30),
        "zero_results": await _agg({"results": 0}, 20),
    }


@api.get("/resume-templates")
async def list_resume_templates():
    rows = await db.resume_templates.find({}).sort("created_at", -1).to_list(200)
    return [doc_public(r) for r in rows]


@api.post("/admin/resume-templates")
async def admin_upload_resume_template(name: str = Form(""), file: UploadFile = File(...), _=Depends(require_admin)):
    url, size = await _save_public_file(file, RESUME_MIME)
    doc = {
        "name": (name or "").strip()[:120] or file.filename,
        "filename": file.filename,
        "url": url,
        "size": size,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.resume_templates.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_public(doc)


@api.delete("/admin/resume-templates/{tpl_id}")
async def admin_delete_resume_template(tpl_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(tpl_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    doc = await db.resume_templates.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Template not found")
    fname = (doc.get("url") or "").rsplit("/", 1)[-1]
    if fname:  # soft-delete in storage registry (object storage has no delete API)
        await db.uploads.update_many({"id": fname}, {"$set": {"is_deleted": True}})
    await db.resume_templates.delete_one({"_id": oid})
    return {"ok": True}


# ─────────── Blogs (public read, admin manage with text editor + image upload) ───────────
BLOG_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp"}


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", (text or "").lower()).strip()
    s = re.sub(r"[\s-]+", "-", s)[:60].strip("-")
    return f"{s}-{uuid.uuid4().hex[:6]}"


def _csv_list(s: str, limit: int = 30):
    return [x.strip()[:60] for x in (s or "").split(",") if x.strip()][:limit]


@api.get("/blogs")
async def list_blogs(limit: int = 50):
    rows = await db.blogs.find({"status": "published"}).sort("created_at", -1).to_list(min(limit, 100))
    return [doc_public(b) for b in rows]


@api.get("/blogs/{slug}")
async def get_blog(slug: str):
    b = await db.blogs.find_one({"slug": slug})
    if not b:
        raise HTTPException(status_code=404, detail="Blog not found")
    await db.blogs.update_one({"_id": b["_id"]}, {"$inc": {"views": 1}})
    b["views"] = (b.get("views") or 0) + 1
    return doc_public(b)


@api.get("/admin/blogs")
async def admin_list_blogs(_=Depends(require_admin)):
    rows = await db.blogs.find({}).sort("created_at", -1).to_list(300)
    return [doc_public(b) for b in rows]


@api.post("/admin/blogs")
async def admin_create_blog(
    title: str = Form(...),
    excerpt: str = Form(""),
    content: str = Form(""),
    status: str = Form("published"),
    categories: str = Form(""),
    tags: str = Form(""),
    focus_keyword: str = Form(""),
    seo_title: str = Form(""),
    seo_description: str = Form(""),
    custom_head: str = Form(""),
    image: Optional[UploadFile] = File(None),
    center_image: Optional[UploadFile] = File(None),
    _=Depends(require_admin),
):
    image_url = ""
    if image and image.filename:
        image_url, _ = await _save_public_file(image, BLOG_IMAGE_MIME)
    center_image_url = ""
    if center_image and center_image.filename:
        center_image_url, _ = await _save_public_file(center_image, BLOG_IMAGE_MIME)
    now = datetime.now(timezone.utc)
    doc = {
        "title": title.strip()[:250],
        "slug": _slugify(title),
        "excerpt": excerpt.strip()[:400],
        "content": content,
        "status": status if status in ("published", "draft") else "published",
        "image_url": image_url,
        "center_image_url": center_image_url,
        "categories": _csv_list(categories),
        "tags": _csv_list(tags),
        "focus_keyword": focus_keyword.strip()[:120],
        "seo_title": seo_title.strip()[:200],
        "seo_description": seo_description.strip()[:400],
        "custom_head": custom_head.strip()[:5000],
        "views": 0,
        "author": "HR Digital Services",
        "created_at": now,
        "updated_at": now,
    }
    res = await db.blogs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_public(doc)


@api.get("/admin/blog-taxonomy")
async def admin_blog_taxonomy(_=Depends(require_admin)):
    cats = await db.blogs.distinct("categories")
    tags = await db.blogs.distinct("tags")
    return {
        "categories": sorted([c for c in cats if c]),
        "tags": sorted([t for t in tags if t]),
    }


@api.get("/site-settings")
async def get_site_settings():
    doc = await db.settings.find_one({"_id": "site"}) or {}
    return {
        "ga4_id": doc.get("ga4_id", ""),
        "gsc_verification": doc.get("gsc_verification", ""),
        "webpushr_key": doc.get("webpushr_key", ""),
        "channel_whatsapp": doc.get("channel_whatsapp", ""),
        "channel_telegram": doc.get("channel_telegram", ""),
        "channel_arattai": doc.get("channel_arattai", ""),
        "channel_youtube": doc.get("channel_youtube", ""),
        "channel_instagram": doc.get("channel_instagram", ""),
        "channel_app": doc.get("channel_app", ""),
        "default_theme": doc.get("default_theme", "light"),
        "default_primary": doc.get("default_primary", ""),
        "social_twitter": doc.get("social_twitter", ""),
        "social_facebook": doc.get("social_facebook", ""),
        "social_instagram": doc.get("social_instagram", ""),
        "social_youtube": doc.get("social_youtube", ""),
        "social_whatsapp": doc.get("social_whatsapp", ""),
        "theme_locked": bool(doc.get("theme_locked", False)),
        "theme_updated_at": doc.get("theme_updated_at", ""),
    }


@api.put("/admin/site-settings")
async def update_site_settings(payload: dict = Body(...), _=Depends(require_admin)):
    fields = ["ga4_id", "gsc_verification", "webpushr_key", "channel_whatsapp", "channel_telegram",
              "channel_arattai", "channel_youtube", "channel_instagram", "channel_app",
              "default_theme", "default_primary",
              "social_twitter", "social_facebook", "social_instagram", "social_youtube", "social_whatsapp"]
    update = {}
    for f in fields:
        if f in payload:
            update[f] = str(payload.get(f) or "").strip()[:400]
    if update.get("default_theme") and update["default_theme"] not in {"light", "dark", "system", "luxury", "retro", "arctic", "nature", "ember", "dracula", "midnight"}:
        raise HTTPException(400, "Invalid theme")
    if update.get("default_primary") and not re.fullmatch(r"#[0-9a-fA-F]{6}", update["default_primary"]):
        raise HTTPException(400, "Primary colour must be #RRGGBB")
    if "theme_locked" in payload:
        update["theme_locked"] = bool(payload.get("theme_locked"))
    if any(k in update for k in ("default_theme", "default_primary", "theme_locked")):
        update["theme_updated_at"] = datetime.now(timezone.utc).isoformat()
    if update:
        await db.settings.update_one({"_id": "site"}, {"$set": update}, upsert=True)
    return {"ok": True, **update}


# ─────────── Hero News Slider (carousel) ───────────
@api.get("/slides")
async def public_slides():
    out = []
    async for s in db.slides.find({"active": True}).sort("order", 1):
        out.append(doc_public(s))
    return out


@api.get("/admin/slides")
async def admin_list_slides(_=Depends(require_admin)):
    out = []
    async for s in db.slides.find({}).sort("order", 1):
        out.append(doc_public(s))
    return out


@api.post("/admin/slides")
async def admin_create_slide(
    title: str = Form(""),
    subtitle: str = Form(""),
    link: str = Form(""),
    order: int = Form(0),
    active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    _=Depends(require_admin),
):
    image_url = ""
    if image and image.filename:
        image_url, _ = await _save_public_file(image, BLOG_IMAGE_MIME)
    now = datetime.now(timezone.utc)
    doc = {
        "title": title.strip()[:200],
        "subtitle": subtitle.strip()[:300],
        "link": link.strip()[:500],
        "order": int(order),
        "active": bool(active),
        "image_url": image_url,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.slides.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_public(doc)


@api.put("/admin/slides/{slide_id}")
async def admin_update_slide(
    slide_id: str,
    title: str = Form(""),
    subtitle: str = Form(""),
    link: str = Form(""),
    order: int = Form(0),
    active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    _=Depends(require_admin),
):
    try:
        oid = ObjectId(slide_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    existing = await db.slides.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Slide not found")
    update = {
        "title": title.strip()[:200],
        "subtitle": subtitle.strip()[:300],
        "link": link.strip()[:500],
        "order": int(order),
        "active": bool(active),
        "updated_at": datetime.now(timezone.utc),
    }
    if image and image.filename:
        update["image_url"], _ = await _save_public_file(image, BLOG_IMAGE_MIME)
    await db.slides.update_one({"_id": oid}, {"$set": update})
    return doc_public(await db.slides.find_one({"_id": oid}))


@api.delete("/admin/slides/{slide_id}")
async def admin_delete_slide(slide_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(slide_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    await db.slides.delete_one({"_id": oid})
    return {"ok": True}


@api.put("/admin/blogs/{blog_id}")
async def admin_update_blog(
    blog_id: str,
    title: str = Form(...),
    excerpt: str = Form(""),
    content: str = Form(""),
    status: str = Form("published"),
    slug: str = Form(""),
    categories: str = Form(""),
    tags: str = Form(""),
    focus_keyword: str = Form(""),
    seo_title: str = Form(""),
    seo_description: str = Form(""),
    custom_head: str = Form(""),
    image: Optional[UploadFile] = File(None),
    center_image: Optional[UploadFile] = File(None),
    remove_center_image: str = Form(""),
    _=Depends(require_admin),
):
    try:
        oid = ObjectId(blog_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    existing = await db.blogs.find_one({"_id": oid})
    if not existing:
        raise HTTPException(404, "Blog not found")
    update = {
        "title": title.strip()[:250],
        "excerpt": excerpt.strip()[:400],
        "content": content,
        "status": status if status in ("published", "draft") else "published",
        "categories": _csv_list(categories),
        "tags": _csv_list(tags),
        "focus_keyword": focus_keyword.strip()[:120],
        "seo_title": seo_title.strip()[:200],
        "seo_description": seo_description.strip()[:400],
        "custom_head": custom_head.strip()[:5000],
        "updated_at": datetime.now(timezone.utc),
    }
    if slug.strip():
        update["slug"] = _slugify(slug)
    if image and image.filename:
        update["image_url"], _ = await _save_public_file(image, BLOG_IMAGE_MIME)
    if center_image and center_image.filename:
        update["center_image_url"], _ = await _save_public_file(center_image, BLOG_IMAGE_MIME)
    elif remove_center_image.strip().lower() in ("1", "true", "yes"):
        update["center_image_url"] = ""
    await db.blogs.update_one({"_id": oid}, {"$set": update})
    updated = await db.blogs.find_one({"_id": oid})
    return doc_public(updated)


@api.delete("/admin/blogs/{blog_id}")
async def admin_delete_blog(blog_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(blog_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    res = await db.blogs.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Blog not found")
    return {"ok": True}


# ─────────── Reviews (public post + read, admin moderate) ───────────
class ReviewIn(BaseModel):
    target_type: str = Field(..., max_length=20)   # 'blog' | 'vacancy'
    target_id: str = Field(..., max_length=120)     # blog slug or vacancy id
    name: str = Field(..., min_length=1, max_length=80)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field("", max_length=1500)


async def _review_target_title(target_type: str, target_id: str) -> str:
    try:
        if target_type == "blog":
            b = await db.blogs.find_one({"slug": target_id}, {"title": 1})
            return (b or {}).get("title") or target_id
        if target_type == "vacancy":
            v = await db.vacancies.find_one({"_id": ObjectId(target_id)}, {"title": 1})
            return (v or {}).get("title") or target_id
    except Exception:
        pass
    return target_id


@api.get("/reviews")
async def list_reviews(target_type: str, target_id: str):
    rows = await db.reviews.find({
        "target_type": target_type,
        "target_id": target_id,
        "hidden": {"$ne": True},
    }).sort("created_at", -1).to_list(300)
    items = [doc_public(r) for r in rows]
    count = len(items)
    avg = round(sum(int(r.get("rating") or 0) for r in items) / count, 1) if count else 0
    return {"items": items, "count": count, "average": avg}


@api.post("/reviews")
async def create_review(payload: ReviewIn):
    if payload.target_type not in ("blog", "vacancy"):
        raise HTTPException(400, "Invalid target_type")
    doc = {
        "target_type": payload.target_type,
        "target_id": payload.target_id.strip()[:120],
        "name": payload.name.strip()[:80],
        "rating": int(payload.rating),
        "comment": payload.comment.strip()[:1500],
        "hidden": False,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.reviews.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_public(doc)


@api.get("/admin/reviews")
async def admin_list_reviews(_=Depends(require_admin)):
    rows = await db.reviews.find({}).sort("created_at", -1).to_list(1000)
    out = []
    for r in rows:
        item = doc_public(r)
        item["target_title"] = await _review_target_title(r.get("target_type"), r.get("target_id"))
        out.append(item)
    return out


@api.put("/admin/reviews/{review_id}/toggle")
async def admin_toggle_review(review_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(review_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    r = await db.reviews.find_one({"_id": oid})
    if not r:
        raise HTTPException(404, "Review not found")
    new_hidden = not bool(r.get("hidden"))
    await db.reviews.update_one({"_id": oid}, {"$set": {"hidden": new_hidden}})
    return {"ok": True, "hidden": new_hidden}


@api.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, _=Depends(require_admin)):
    try:
        oid = ObjectId(review_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    res = await db.reviews.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Review not found")
    return {"ok": True}



# ─────────── Webpushr push subscribers ───────────
class WebpushrSubscriberIn(BaseModel):
    subscriber_id: int


@api.post("/webpushr/subscriber")
async def save_webpushr_subscriber(payload: WebpushrSubscriberIn):
    """Store/refresh a Webpushr subscriber ID (sent by the frontend snippet after subscribe)."""
    await db.push_subscribers.update_one(
        {"subscriber_id": payload.subscriber_id},
        {"$set": {"subscriber_id": payload.subscriber_id, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


# ─────────── Include router + CORS ───────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─────────── Dynamic Rendering catch-all (PRODUCTION + crawler only) ───────────
# In production, when a search-engine / social crawler requests a page URL, serve
# fully-rendered HTML. Real users (and everything in dev/preview) get the SPA.
# This route is registered LAST so it never shadows the /api routes above.
_SPA_INDEX = Path(__file__).parent.parent / "frontend" / "build" / "index.html"


def _serve_spa_fallback():
    if _SPA_INDEX.exists():
        return FileResponse(str(_SPA_INDEX))
    # Backend does not host the SPA in this environment — signal the edge/proxy
    # to serve the SPA build itself.
    raise HTTPException(status_code=404, detail="Not found")


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_or_ssr(full_path: str, request: Request):
    # Never intercept API / asset paths.
    if full_path.startswith("api/") or full_path.startswith("static/"):
        raise HTTPException(status_code=404, detail="Not found")

    ua = request.headers.get("user-agent", "")
    if IS_PRODUCTION and ssr.is_bot(ua):
        try:
            html_out = await ssr.render_path(db, "/" + full_path, SITE_URL, DEFAULT_SITE_CONTENT)
            if html_out:
                return Response(content=html_out, media_type="text/html; charset=utf-8",
                                headers={"X-Rendered-By": "ssr"})
        except Exception as e:  # requirement 7: never 5xx to a crawler
            log.warning(f"SSR catch-all failed for /{full_path}: {e}")
    return _serve_spa_fallback()



# ─────────── Startup: indexes + seed ───────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    try:
        await asyncio.to_thread(init_storage)
        log.info("Object storage initialized")
    except Exception as e:
        log.warning(f"Object storage init failed (uploads will fail until fixed): {e}")
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at")
    await db.solar_applications.create_index("ref_no", unique=True)
    await db.loan_applications.create_index("ref_no", unique=True)
    await db.csc_requests.create_index("ref_no", unique=True)
    await db.csc_requests.create_index("user_id")
    await db.irrigation_applications.create_index("ref_no", unique=True)
    await db.irrigation_applications.create_index("user_id")
    await db.vacancies.create_index("url", unique=True)
    await db.vacancies.create_index("category")
    await db.vacancies.create_index("fetched_at")
    await db.vacancies.create_index("state")
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.uploads.create_index("user_id")

    # One-time backfill: WhatsApp summaries for every vacancy + SEO title/description
    # variants for scraped (API) jobs so Google doesn't see duplicate content.
    try:
        stale = await db.vacancies.find(
            {"$or": [{"whatsapp_summary": {"$exists": False}},
                     {"source": {"$ne": "manual"}, "seo_title": {"$exists": False}}]}
        ).to_list(3000)
        if stale:
            await _enrich_vacancy_docs(stale)
            log.info(f"[startup] Enriched {len(stale)} vacancies (WhatsApp summary / SEO variants)")
    except Exception as e:
        log.warning(f"vacancy enrich backfill failed: {e}")

    # One-time backfill: strip FreeJobAlert promo blocks/links from already-stored
    # scraped content so old posts also lose the Join Telegram/WhatsApp/Arattai,
    # Sarkari Result & Download Mobile App junk.
    try:
        flag = await db.settings.find_one({"_id": "promo_cleaned_v1"})
        if not flag:
            cleaned = 0
            async for v in db.vacancies.find({"source": {"$ne": "manual"}}, {"content_html": 1, "important_links": 1}):
                update = {}
                html = v.get("content_html")
                if html:
                    nh = clean_promo_html(html)
                    if nh != html:
                        update["content_html"] = nh
                links = v.get("important_links") or []
                if links:
                    kept = [l for l in links if not _is_junk_link(l.get("text") or l.get("label") or "", l.get("href") or l.get("url") or "")]
                    if len(kept) != len(links):
                        update["important_links"] = kept
                if update:
                    await db.vacancies.update_one({"_id": v["_id"]}, {"$set": update})
                    cleaned += 1
            await db.settings.update_one({"_id": "promo_cleaned_v1"}, {"$set": {"at": datetime.now(timezone.utc), "cleaned": cleaned}}, upsert=True)
            log.info(f"[startup] Promo cleanup done on {cleaned} scraped vacancies")
    except Exception as e:
        log.warning(f"promo cleanup backfill failed: {e}")

    # One-time backfill: strip source branding ("FreeJobAlert" etc.) from
    # already-stored scraped posts so old posts also carry our own brand.
    try:
        flag = await db.settings.find_one({"_id": "brand_applied_v1"})
        if not flag:
            branded = 0
            async for v in db.vacancies.find(
                {"source": {"$ne": "manual"}},
                {"title": 1, "post_name": 1, "organization": 1, "row_text": 1,
                 "heading": 1, "description": 1, "content_html": 1,
                 "seo_title": 1, "seo_description": 1, "original_title": 1,
                 "original_description": 1},
            ):
                update = {}
                for f in ("title", "post_name", "organization", "row_text", "heading",
                          "description", "seo_title", "seo_description",
                          "original_title", "original_description"):
                    val = v.get(f)
                    if val:
                        nb = apply_brand(val)
                        if nb != val:
                            update[f] = nb
                html = v.get("content_html")
                if html:
                    nh = brand_html(html)
                    if nh != html:
                        update["content_html"] = nh
                if update:
                    await db.vacancies.update_one({"_id": v["_id"]}, {"$set": update})
                    branded += 1
            await db.settings.update_one({"_id": "brand_applied_v1"}, {"$set": {"at": datetime.now(timezone.utc), "branded": branded}}, upsert=True)
            log.info(f"[startup] Brand replacement done on {branded} scraped vacancies")
    except Exception as e:
        log.warning(f"brand backfill failed: {e}")

    # One-time backfill: dedupe_key on existing vacancies so the 2nd source
    # (Haryana DC Rate/HKRN) can never create duplicate posts.
    try:
        cnt = 0
        async for d in db.vacancies.find({"dedupe_key": {"$exists": False}}, {"title": 1}):
            await db.vacancies.update_one({"_id": d["_id"]}, {"$set": {"dedupe_key": _dedupe_key(d.get("title", ""))}})
            cnt += 1
        if cnt:
            log.info(f"[startup] dedupe_key backfilled on {cnt} vacancies")
    except Exception as e:
        log.warning(f"dedupe_key backfill failed: {e}")

    # Backfill user_id on legacy users
    async for u in db.users.find({"user_id": {"$exists": False}}):
        await db.users.update_one({"_id": u["_id"]}, {"$set": {"user_id": str(u["_id"])}})

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@haryanaenterprises.com").lower()
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_uid = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": admin_uid,
            "name": "Admin",
            "email": admin_email,
            "phone": "8167862016",
            "password_hash": hash_password(admin_pass),
            "role": "admin",
            "auth_provider": "email",
            "created_at": datetime.now(timezone.utc),
        })
        log.info(f"Seeded admin: {admin_email}")
    else:
        # Only ensure admin role; do NOT overwrite password on every restart —
        # that would silently reset a password an admin intentionally changed.
        if existing.get("role") != "admin":
            await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})

    # Seed test user
    test_email = "user@test.com"
    if not await db.users.find_one({"email": test_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": "Test User",
            "email": test_email,
            "phone": "9999999999",
            "password_hash": hash_password("Test@123"),
            "role": "user",
            "auth_provider": "email",
            "created_at": datetime.now(timezone.utc),
        })

    # Seed notices (informational only - no fake portal claims)
    if await db.notices.count_documents({}) == 0:
        await db.notices.insert_many([
            {"title_hi": "रूफटॉप सोलर के लिए मुफ्त परामर्श उपलब्ध",
             "title_en": "Free rooftop solar consultation available",
             "type": "info", "created_at": datetime.now(timezone.utc)},
            {"title_hi": "साइट असेसमेंट के लिए संपर्क करें · 8168762016",
             "title_en": "Contact for site assessment · 8168762016",
             "type": "info", "created_at": datetime.now(timezone.utc)},
            {"title_hi": "सरकारी सोलर योजनाओं की सामान्य जानकारी के लिए पूछताछ करें",
             "title_en": "Enquire for general information on government solar schemes",
             "type": "update", "created_at": datetime.now(timezone.utc)},
            {"title_hi": "एचआर डिजिटल सर्विसेज कागदाना (सिरसा) में सेवा उपलब्ध",
             "title_en": "HR Digital Services services available in Kagdana (Sirsa)",
             "type": "info", "created_at": datetime.now(timezone.utc)},
            {"title_hi": "छात्रों के लिए ताज़ा भर्तियाँ · Vacancies पेज पर देखें",
             "title_en": "Latest job alerts for students · check Vacancies page",
             "type": "important", "created_at": datetime.now(timezone.utc)},
        ])

    # Seed FAQs (informational only, no fake portal claims)
    if await db.faqs.count_documents({}) == 0:
        await db.faqs.insert_many([
            {"q_hi": "क्या एचआर डिजिटल सर्विसेज एक सरकारी पोर्टल है?",
             "q_en": "Is HR Digital Services a government portal?",
             "a_hi": "नहीं। एचआर डिजिटल सर्विसेज एक निजी संस्था है जो सरकार अनुमोदित रूफटॉप सोलर वेंडर के रूप में परामर्श, साइट सर्वे और इंस्टॉलेशन सहायता प्रदान करती है। यह कोई सरकारी पोर्टल नहीं है।",
             "a_en": "No. HR Digital Services is a private business that acts as a Govt-approved rooftop solar vendor providing consultation, site survey and installation assistance. It is not a government portal."},
            {"q_hi": "रूफटॉप सोलर पर सरकारी योजनाओं की जानकारी कहाँ से मिलेगी?",
             "q_en": "Where can I find information about government schemes for rooftop solar?",
             "a_hi": "सरकारी योजनाओं की सामान्य जानकारी हम आपको प्रदान कर सकते हैं। कृपया वर्तमान पात्रता, सब्सिडी नियम और आवेदन प्रक्रिया के लिए pmsuryaghar.gov.in और mnre.gov.in जैसी आधिकारिक साइटों पर सत्यापन करें।",
             "a_en": "We can share general information about Government schemes. Please verify current eligibility, subsidy rules and application procedures on official sites like pmsuryaghar.gov.in and mnre.gov.in."},
            {"q_hi": "क्या आप ऋण मंज़ूरी की गारंटी देते हैं?",
             "q_en": "Do you guarantee loan approval?",
             "a_hi": "नहीं। वित्तीय सुविधा की उपलब्धता, ब्याज दर, पात्रता एवं शर्तें संबंधित ऋणदाता की वर्तमान नीति और अनुमोदन के अधीन हैं। हम केवल सामान्य जानकारी प्रदान करते हैं।",
             "a_en": "No. Financing availability, interest rates, eligibility and terms are subject to the respective lender's current policies and approval. We only provide general information."},
            {"q_hi": "पूछताछ करते समय कौन-सी जानकारी माँगी जाती है?",
             "q_en": "What information do you ask for during an enquiry?",
             "a_hi": "केवल पूरा नाम, मोबाइल नंबर, ईमेल, रुचि की सेवा और संदेश। हम कभी भी आधार, PAN, बैंक विवरण, OTP या पासवर्ड नहीं माँगते।",
             "a_en": "Only Full Name, Mobile, Email, Service of interest and Message. We never ask for Aadhaar, PAN, bank details, OTP or passwords."},
            {"q_hi": "क्या सोलर पैनल पर वारंटी मिलती है?",
             "q_en": "Is warranty offered on solar panels?",
             "a_hi": "आमतौर पर पैनलों पर निर्माता की 25 वर्ष तक की परफॉर्मेंस वारंटी और इनवर्टर पर 5–10 वर्ष की वारंटी उपलब्ध होती है (निर्माता की शर्तों के अनुसार)।",
             "a_en": "Panels typically come with a manufacturer's up-to-25-year performance warranty; inverters usually carry a 5–10-year warranty (subject to manufacturer terms)."},
            {"q_hi": "क्या पूछताछ के लिए कोई शुल्क है?",
             "q_en": "Is there any fee for enquiry?",
             "a_hi": "नहीं। पूछताछ और प्रारंभिक परामर्श निःशुल्क है। हम कोई एडवांस भुगतान नहीं लेते।",
             "a_en": "No. Enquiry and initial consultation are free. We do not take any advance payment."},
        ])

    # Seed downloads (informational only, no fake gov application forms)
    if await db.downloads.count_documents({}) == 0:
        await db.downloads.insert_many([
            {"title_hi": "रूफटॉप सोलर ब्रोशर (HR Digital Services)",
             "title_en": "Rooftop Solar Brochure (HR Digital Services)",
             "size": "PDF · 1.2 MB", "url": "#"},
            {"title_hi": "साइट सर्वे चेकलिस्ट",
             "title_en": "Site Survey Checklist",
             "size": "PDF · 180 KB", "url": "#"},
            {"title_hi": "सोलर सिस्टम रखरखाव गाइड",
             "title_en": "Solar System Maintenance Guide",
             "size": "PDF · 340 KB", "url": "#"},
            {"title_hi": "सरकारी योजना संदर्भ लिंक (केवल सामान्य जानकारी)",
             "title_en": "Government Scheme Reference Links (General Information Only)",
             "size": "Info · verify at pmsuryaghar.gov.in", "url": "https://pmsuryaghar.gov.in"},
        ])

    # Backfill `state` field on ALL vacancy docs (idempotent — corrects false
    # positives when the state regex is updated between releases).
    try:
        tagged = 0
        async for d in db.vacancies.find(
            {}, {"title": 1, "organization": 1, "post_name": 1, "row_text": 1, "state": 1, "category": 1, "source": 1}
        ):
            # Skip manual (admin-authored) rows — admin's state/category is authoritative
            if d.get("source") == "manual":
                continue
            st = state_from_text(
                d.get("title", ""), d.get("organization", ""),
                d.get("post_name", ""), d.get("row_text", "")
            )
            updates = {}
            if d.get("state") != st:
                updates["state"] = st
            # Category backfill — downgrade stale admit_card/result docs whose
            # current title no longer matches those categories (e.g. legacy
            # "Syllabus" articles that leaked in from earlier scraper versions).
            stored_cat = d.get("category")
            if stored_cat in ("admit_card", "result"):
                derived_cat = _cat_from_title(d.get("title", ""))
                if derived_cat != stored_cat:
                    updates["category"] = derived_cat
            if updates:
                await db.vacancies.update_one({"_id": d["_id"]}, {"$set": updates})
                tagged += 1
        if tagged:
            log.info(f"[vacancy-backfill] retagged {tagged} vacancies (state/category)")
    except Exception as e:
        log.warning(f"vacancy backfill failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ─────────── Background scheduler (all sources every 1 hr) ───────────
_scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


@app.on_event("startup")
async def start_scheduler():
    async def _job():
        try:
            before_urls = set([v["url"] async for v in db.vacancies.find({}, {"url": 1})])
            n = await refresh_vacancies_into_db(db)
            # Always backfill so historical rows also get application_mode populated
            await backfill_application_mode(db)
            ssr.clear_cache()  # crawlers should see the refreshed data
            log.info(f"[scheduler] Vacancies refreshed. new={n}")
            if n > 0:
                new_docs = await db.vacancies.find({"url": {"$nin": list(before_urls)}}).to_list(n * 2)
                if new_docs:
                    await _enrich_vacancy_docs(new_docs)  # SEO variants + WhatsApp summaries
                    await _notify_subscribers_of_new_vacancies(new_docs)
        except Exception as e:
            log.warning(f"[scheduler] Vacancy refresh failed: {e}")

    _scheduler.add_job(_job, "interval", hours=1, next_run_time=datetime.now(timezone.utc))
    _scheduler.start()
    log.info("Scheduler started (vacancies every 1h — FreeJobAlert)")


@app.on_event("shutdown")
async def stop_scheduler():
    try: _scheduler.shutdown(wait=False)
    except Exception: pass
