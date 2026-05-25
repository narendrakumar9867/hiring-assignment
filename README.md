Project: Question Paper Generator
================================

This repository contains a Next.js frontend and an Express backend for generating question papers.

Quick start (development)
-------------------------

- Backend
  - cd backend
  - npm install
  - Create a `.env` file with required variables (see below)
  - npm run dev

- Frontend
  - cd frontend
  - npm install
  - Create a `.env.local` file with required variables (see below)
  - npm run dev

Required environment variables
-----------------------------

Backend (example `.env`)
- MONGODB_URI=your_mongo_connection_string
- REDIS_URL=redis://localhost:6379
- FIREBASE_SERVICE_ACCOUNT_JSON='path-or-json-of-service-account'
- OPENAI_API_KEY=your_openai_or_ai_api_key
- JWT_SECRET=some_secret_for_tokens

Frontend (example `.env.local`)
- NEXT_PUBLIC_FIREBASE_API_KEY=...
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
- NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
- NEXT_PUBLIC_FIREBASE_APP_ID=...

Notes
-----
- Keep service account JSON secure; if you place JSON in an env var, ensure it's protected.
- The backend uses Redis and MongoDB. Start those services before running the backend.
- `npm run dev` commands assume scripts are defined in each `package.json`.

Production
----------
- Build frontend: `cd frontend && npm run build`
- Start backend in production mode per your hosting provider (e.g., PM2, Docker, etc.)

If you want this README in Hindi or more detailed steps (Docker, deployment), tell me and I will expand.
