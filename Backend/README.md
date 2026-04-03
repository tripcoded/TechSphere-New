# TechSphere Event Management Backend

Lightweight FastAPI backend for event management with:
- SMTP OTP-based member registration
- JWT member login
- Admin API key protection
- Event management
- Team registration
- Member-wise attendance

## 1. Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and update values.

## 2. Run

```bash
uvicorn main:app --reload
```

Alternative from the repo root:

```bash
uvicorn Backend.app.main:app --reload
```

Open docs at:
- `http://127.0.0.1:8000/docs`

## 3. Key APIs

- `POST /auth/send-otp`
- `POST /auth/register`
- `POST /auth/login`
- `GET /events`
- `POST /events` (admin, `X-API-Key`)
- `PUT /events/{event_id}` (admin)
- `DELETE /events/{event_id}` (admin)
- `POST /teams` (member token)
- `GET /teams/my` (member token)
- `GET /teams/event/{event_id}` (admin)
- `POST /attendance/mark` (admin)
- `GET /attendance/event/{event_id}` (admin)

## 4. Notes

- OTP data and rate-limit counters are stored in-memory in this phase.
- Tables auto-create on startup using SQLAlchemy metadata.
- For production, replace defaults with strong secrets and a PostgreSQL URL.
- To test PostgreSQL connectivity separately, run `python db_connection_check.py`.
