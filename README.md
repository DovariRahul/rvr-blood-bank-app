# 🩸 LifeLink — AI-Powered Blood Donor Platform

> An intelligent blood donor and emergency blood request platform built with React Native + Node.js + MongoDB Atlas.

## Architecture

```
LifeLink/
├── backend/          ← Node.js + Express + MongoDB Atlas
├── mobile-app/       ← React Native + Expo
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| Notifications | Firebase Cloud Messaging |
| Storage | Cloudinary |
| Maps | Google Maps / OpenStreetMap |

## Getting Started

### Backend

```bash
cd backend
npm install
# Configure .env with your MongoDB URI, JWT secrets, etc.
npm run seed    # Create default admin users
npm run dev     # Start development server
```

### Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/requests` | ✅ | Create blood request |
| GET | `/api/requests` | ✅ | List requests |
| POST | `/api/donors/register` | ⚡ | Register as donor |
| GET | `/api/donors/profile` | ✅ | Get donor profile |
| GET | `/api/admin/analytics` | 🔒 | Admin dashboard data |
| POST | `/api/upload/medical-proof` | ✅ | Upload medical proof |

## Default Admin Credentials

- Email: `admin@rvrbloodbank.org`
- Password: `Admin@RVR2026`

⚠️ **Change these in production!**
