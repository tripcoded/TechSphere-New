# TechSphere Frontend (TypeScript)

Minimal, responsive React + TypeScript frontend for the TechSphere backend.

## Features
- Light-tone, mobile-first UI
- Separate login pages:
  - Member login/register
  - Admin API-key login
- Mobile-friendly layout
- Member flows:
  - Send OTP
  - Register
  - Login
- Member dashboard sections:
  - Dashboard
  - Event Registration
  - Registered Events
- Admin dashboard sections:
  - Current Events (search event, locate teams, member-wise attendance tick)
  - Add Events
- Dummy credentials for UI testing:
  - Member Email: `demo@techsphere.dev`
  - Member Password: `Demo@12345`
  - Admin API Key: `DEMO_ADMIN_KEY`

## Setup
```bash
cd Frontend
npm install
```

Copy `.env.example` to `.env` (optional):
```env
VITE_API_BASE=http://127.0.0.1:8000
```

## Run
```bash
npm run dev
```

Open:
- `http://127.0.0.1:5173`

## Notes
- Dummy credentials enable demo mode with mocked data and simulated writes.
- Real member login uses backend `POST /auth/login`.
- Real admin login validates API key using admin-protected endpoints.
