# WESTERN COMMERCIAL BANK - Production-Ready Web Application

**Senior Full-Stack Software Architect Implementation**

A secure, mobile-first digital banking platform with strict RBAC, administrative enrollment only, and realistic two-factor authentication (OTP) flow.

## ✨ Key Features Implemented

### Security & Access Control
- **No public registration** — User accounts can **only** be created by administrators via the isolated `/administrator` panel.
- **JWT-based RBAC**: Separate pre-OTP and full-access tokens. Regular users are **strictly blocked** from all `/api/admin/*` endpoints.
- **OTP Flow**: Password login → Backend generates & persists OTP (5-min expiry) → Admin can instantly view active OTPs in real-time monitor → User enters OTP to activate full session.
- **Role-based UI**: Regular users see clean mobile banking interface with floating bottom tab bar. Admins see dedicated professional dashboard.

### User Experience (Mobile-First)
- Deep Navy (#0F172A) + Slate professional corporate theme.
- Persistent floating bottom navigation bar (Home, Transfers, Profile) on mobile viewports.
- Modern OTP input with auto-focus, paste support, and countdown timer.
- Real-time balance updates, transaction history, and instant transfer feedback.
- Fully responsive — beautiful on phones, tablets, and desktop.

### Admin Capabilities (`/administrator`)
- Create new user accounts (username, email, full name, initial balance, password).
- View all users with live balances.
- Adjust any user's balance (credit/debit with audit note).
- **OTP Live Monitor**: See currently active OTP codes for any user attempting login (with expiry countdown). Admins can manually provide OTP to customers.

### Business Logic
- Secure transfers between users (prevents self-transfer, insufficient funds, non-existent recipient).
- Transaction ledger with timestamps and descriptions.
- Prisma ORM with PostgreSQL-compatible schema (Neon + Render friendly).

## 🛠 Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS 3.4
- Lucide React (beautiful icons)
- React Router v6
- Axios + React Context for auth state

**Backend**
- Node.js + Express
- Prisma ORM + PostgreSQL
- bcryptjs (password hashing)
- jsonwebtoken (secure sessions)
- CORS configured for development

## 🚀 Quick Start (Local Development)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL to your local Postgres/Neon connection string
npm run prisma:migrate
node server.js
```
Backend runs on **http://localhost:5000**

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**

Open http://localhost:5173 — you will land on the professional Sign In screen.

### Default Admin Credentials ( seeded on first run )
- **Username**: `admin`
- **Password**: `SecureAdmin2026!`

> **Important**: Change this password immediately in production. The admin account is created automatically if it doesn't exist.

### How to Test the Full Flow
1. Login as `admin` / `SecureAdmin2026!` → redirected to OTP screen.
2. Go to Admin Dashboard (or navigate to http://localhost:5173/administrator).
3. In **OTP Live Monitor** tab you will see the active OTP for the admin login attempt.
4. Enter the OTP on the verification screen → Full admin access granted.
5. Create 2-3 test users from Admin panel.
6. Logout admin.
7. Login as one of the created users (use the OTP from Admin monitor).
8. Explore Home (balance + tx history), Transfers, Profile.
9. Perform a transfer between users.

## Production Recommendations
- Use Neon/PostgreSQL with `npm run prisma:deploy` during deployment.
- Add refresh token rotation + short-lived access tokens.
- Implement rate limiting (express-rate-limit) on auth endpoints.
- Add input validation (zod + express-validator).
- Use environment-specific secrets (never commit .env).
- Add HTTPS, security headers (helmet), and Content Security Policy.
- For frontend: Add React Query / SWR for data fetching, form libraries (react-hook-form + zod).
- Add end-to-end tests (Playwright/Cypress) and unit tests (Vitest).
- Deploy: Backend → Railway/Fly.io/Heroku, Frontend → Vercel/Netlify with API proxy.

## Project Structure
```
western-commercial-bank/
├── backend/
│   ├── server.js              # Express entry + middleware
│   ├── db.js                  # Prisma query layer + seed logic
│   ├── prisma/schema.prisma   # Prisma schema
│   ├── middleware/auth.js     # JWT + RBAC guards
│   ├── routes/
│   │   ├── auth.js            # login, verify-otp
│   │   ├── admin.js           # user mgmt + OTP monitor
│   │   └── user.js            # profile, transfers, tx history
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router + root layout + tab state
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js    # Axios instance + interceptors
│   │   ├── components/        # Reusable UI (BottomNav, OtpInput, etc.)
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## Security Notes
- All admin routes are **hardened** — regular user JWTs are rejected with 403.
- OTPs are single-use and time-bound (deleted after successful verification or expiry).
- Passwords never stored in plain text.
- No sensitive data (full card numbers, SSN) stored — this is a focused banking demo.

Built with ❤️ for professional banking UX. Ready for extension into full digital bank platform.

© 2026 Western Commercial Bank — All Rights Reserved (Demo)
