# 🎯 IET TechSphere

**Official Event Management Platform for IET Technical Community, DDU Gorakhpur**

Welcome to TechSphere, a comprehensive event management and team collaboration platform designed specifically for the IET (Institution of Engineering and Technology) technical community at Deen Dayal Upadhyaya Gorakhpur University.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)


---

## 🌟 Overview

TechSphere is a full-stack web application that streamlines event management, team coordination, and participant engagement for the IET technical community. It provides administrators with powerful tools to organize events and manage teams, while offering participants an intuitive interface to register, join teams, and track their involvement.


---

## ✨ Features

### 🔐 **Authentication & Authorization**
- Secure OTP-based email verification
- JWT token-based authentication
- Admin API key management
- Role-based access control (Member, Leader, Admin)

### 📅 **Event Management**
- Create and manage events with full details
- Event scheduling with start/end times
- Location tracking and descriptions
- Admin-only event operations
- Event listing and discovery

### 👥 **Team Management**
- Create teams and assign team leaders
- Team member management
- Invite team members via shareable tokens
- Join request approval workflow
- Team statistics and analytics
- View team members and roles

### 📊 **Attendance Tracking**
- Mark attendance for events
- Admin-managed attendance recording
- Attendance reports by event
- Attendance status tracking (Present/Absent)

### 🎫 **Registration & Invitations**
- Shareable team invite links
- Invite preview before joining
- Streamlined registration process
- Event-specific team registrations

### 👤 **User Profiles**
- Comprehensive member profiles
- Professional information (college, skills, etc.)
- Social links (GitHub, LinkedIn)
- Team leader profile management
- Admin profile with organization details

### 📱 **Responsive Design**
- Fully responsive mobile-first UI
- Desktop, tablet, and mobile optimized
- Dark theme for modern aesthetics
- Smooth animations and transitions

### 🔔 **Email Notifications**
- OTP delivery via email
- Event notifications
- Team invitation emails
- Admin notifications for join requests

---

## 🛠 Tech Stack

### **Backend**
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** JWT (JSON Web Tokens)
- **Email Service:** SMTP with Gmail
- **ORM:** SQLAlchemy
- **Server:** Uvicorn

### **Frontend**
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** CSS3 with custom design system
- **Package Manager:** npm
- **Deployment:** Optimized for modern browsers

### **Infrastructure**
- **Database Hosting:** Supabase (PostgreSQL)
- **SMTP Provider:** Gmail SMTP
- **API Protocol:** REST with JSON

---

## 📁 Project Structure

```
TechSphere-New/
├── Backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                 # Configuration & environment variables
│   │   ├── database.py               # Database connection setup
│   │   ├── dependencies.py           # Dependency injection & authentication
│   │   ├── models.py                 # SQLAlchemy database models
│   │   ├── security.py               # Password hashing & JWT tokens
│   │   ├── main.py                   # FastAPI app initialization
│   │   ├── routers/                  # API route handlers
│   │   │   ├── admin.py              # Admin API routes
│   │   │   ├── auth.py               # Authentication routes
│   │   │   ├── events.py             # Event management routes
│   │   │   ├── teams.py              # Team management routes
│   │   │   ├── attendance.py         # Attendance tracking routes
│   │   │   ├── profiles.py           # User profile routes
│   │   │   └── __init__.py
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   │   ├── auth.py
│   │   │   ├── event.py
│   │   │   ├── team.py
│   │   │   ├── attendance.py
│   │   │   ├── profile.py
│   │   │   └── __init__.py
│   │   └── services/                 # Business logic services
│   │       ├── email_service.py      # Email delivery
│   │       ├── otp_service.py        # OTP generation & verification
│   │       └── __init__.py
│   ├── main.py                       # Application entry point
│   ├── requirements.txt              # Python dependencies
│   ├── .env                          # Environment variables
│   └── README.md                     # Backend documentation
│
├── Frontend/
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── AdminAuthPage.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── MemberAuthPage.tsx
│   │   │   ├── MemberDashboard.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── EventRegistration.tsx
│   │   │   ├── InvitePreviewPage.tsx
│   │   │   ├── SiteNav.tsx           # Navigation bar
│   │   │   ├── SiteFooter.tsx        # Footer
│   │   │   └── TechSphereLogo.tsx
│   │   ├── api.ts                    # API client functions
│   │   ├── types.ts                  # TypeScript types & interfaces
│   │   ├── App.tsx                   # Main app component
│   │   ├── main.tsx                  # React entry point
│   │   ├── styles.css                # Global styles
│   │   └── vite-env.d.ts
│   ├── package.json                  # npm dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── vite.config.ts                # Vite configuration
│   ├── index.html                    # HTML template
│   └── README.md                     # Frontend documentation
│
└── README.md                         # This file
```

---

## 🚀 Installation

### **Prerequisites**
- Python 3.8+
- Node.js 16+
- npm or yarn
- PostgreSQL database
- Git

### **Backend Setup**

1. **Navigate to backend directory:**
   ```bash
   cd Backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file with required variables:**
   ```env
   APP_NAME=TechSphere Event Management API
   APP_ENV=development
   DATABASE_URL=postgresql://user:password@host:port/dbname
   SECRET_KEY=your-secret-key-here
   JWT_SECRET=your-jwt-secret-here
   ADMIN_API_KEY=your-admin-api-key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

5. **Run the backend:**
   ```bash
   uvicorn main:app --reload
   ```

   Backend will be available at `http://localhost:8000`

### **Frontend Setup**

1. **Navigate to frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` file (if needed):**
   ```env
   VITE_API_BASE=http://localhost:8000
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:5173`

---

## 💡 Usage

### **Admin Functions**
1. **Login as Admin:** Use the admin API key
2. **Create Events:** Add new events with details
3. **Manage Teams:** Oversee team creation and membership
4. **Track Attendance:** Record and view attendance
5. **Approve Join Requests:** Review and approve user requests

### **Member Functions**
1. **Register:** Create an account with email verification
2. **Browse Events:** View all upcoming events
3. **Register for Events:** Join events by creating teams
4. **Join Teams:** Use invite links to join teams
5. **Update Profile:** Add skills, social links, and bio

### **Authentication Flow**
1. Send OTP to email
2. Verify OTP for registration
3. Create account with password
4. Login with credentials
5. Receive JWT token for authenticated requests

---

## 📚 API Documentation

### **Base URL**
```
http://localhost:8000
```

### **Key Endpoints**

#### **Authentication**
- `POST /auth/send-otp` - Send OTP to email
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

#### **Events**
- `GET /events` - List all events
- `POST /events` - Create event (Admin only)
- `PUT /events/{id}` - Update event (Admin only)
- `DELETE /events/{id}` - Delete event (Admin only)

#### **Teams**
- `GET /teams/my` - Get user's teams
- `POST /teams` - Create new team
- `GET /teams/event/{event_id}` - Get teams for event
- `POST /teams/{id}/invite` - Generate invite link
- `POST /teams/join-by-invite` - Join team via invite

#### **Attendance**
- `POST /attendance/mark` - Mark attendance (Admin)
- `GET /attendance/event/{event_id}` - Get attendance records

#### **Profiles**
- `GET /profiles/me` - Get user profile
- `PUT /profiles/me` - Update user profile
- `GET /profiles/admin` - Get admin profile

For detailed API documentation, run backend and visit `/docs`

---



## 🐛 Troubleshooting

### **Backend Issues**
- **Port already in use:** Change port with `--port 8001`
- **Database connection error:** Check `.env` database URL
- **Email not sending:** Verify SMTP credentials

### **Frontend Issues**
- **API not reachable:** Check `VITE_API_BASE` environment variable
- **Build errors:** Clear node_modules and run `npm install` again
- **Port conflicts:** Use `--port 5174` flag with `npm run dev`

---

## 📄 License

This project is developed for the IET Technical Community, DDU Gorakhpur.

---


**IET Technical Community** is an active student organization dedicated to:
- Organizing technical events and workshops
- Promoting collaborative learning
- Building industry connections
- Developing leadership skills

---

## 🙏 Acknowledgments

- All contributors and community members
- IET community coordinators and volunteers

---



