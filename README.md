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


Architecture
------------

- Backend: Node.js + Express. Uses Mongoose (MongoDB) for storage and Redis for caching/pub-sub. A background worker (BullMQ) processes generation jobs.
- AI service: separated module that builds prompts and calls the AI provider (OpenAI or similar) to generate JSON-formatted papers.
- Worker: processes queued jobs, calls AI service, saves `GeneratedPaper` to DB, and publishes progress via Redis.
- WebSocket: server forwards worker progress to connected clients using a `ws` WebSocket server and Redis pub/sub.
- Frontend: Next.js (app router) + React + TypeScript. Uses Tailwind for styling, `useWebSocket` hook for realtime updates, and client-side print CSS for PDF export.

Approach
--------

1. User creates an assignment (form data + optional file + spoken `additionalInstructions`).
2. Backend saves the assignment and enqueues a generation job.
3. Worker pulls the job, uses the AI service to generate a structured paper, saves the result, and publishes job updates.
4. The backend WebSocket server receives Redis messages and forwards them to the browser client (subscribed by job id).
5. Frontend receives updates via `useWebSocket`, displays progress, and shows the generated paper. `window.print()` + print CSS creates the PDF.
6. Speech input: frontend uses Web Speech API (hooked via `useSpeechToText`) to capture interim transcripts and put them in the `additionalInstructions` field.

---
Thank you !!
