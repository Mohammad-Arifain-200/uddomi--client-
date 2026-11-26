# Uddomi – Empowering People, Inspiring Change

A community-driven social development events platform built with Next.js App Router and an Express API backend. Community members can discover upcoming social initiatives, RSVP/join events, host their own events, and manage participation cleanly.

## Links

- **Live Site Link**: https://ais-pre-w4hennzj3azcwy3u4wbk7q-149637408810.asia-southeast1.run.app
- **GitHub Repository (server)**: https://github.com/Mohammad-Arifain-200/uddomi-server
- **GitHub Repository (client)**: https://github.com/Mohammad-Arifain-200/uddomi-client

## Key Features

- **Upcoming Community Events**: Browse, search, and filter upcoming social development events by category (`Cleanup`, `Plantation`, `Donation`, `Education`, etc.) with responsive pagination and detail views.
- **Event Creation & Management**: Authenticated organizers can create new future-dated events, edit existing events, update thumbnails (image upload or validated URL), and delete events they own.
- **Volunteer Participation**: Join or leave upcoming community events and track upcoming participation in **Joined Events**.
- **Authentication & Sessions**: Email & password sign-up/sign-in plus **GitHub OAuth** powered by Better Auth with HTTP-only session cookies and asymmetric RS256 JWT tokens verified against JWKS.
- **Profile Management**: Update display name and profile photo with client- and server-side validation.
- **Media & Input Safety**: Validates uploaded image formats (`JPEG`, `PNG`, `WEBP`, `GIF`, `AVIF`), enforces future-only event dates, and blocks unsafe or internal network image URLs on the server.
- **Resilient Persistence**: Connects to MongoDB Atlas (`MONGODB_URI`) with automatic persistent local fallback storage when MongoDB is unavailable.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons
- **Authentication**: Better Auth (`emailAndPassword`, GitHub OAuth, `jwt` + `bearer` plugins)
- **Backend API**: Express 4, TypeScript (`tsx` / `esbuild`), MongoDB Node Driver, `jose`, `express-rate-limit`

## Project Structure

- `app/` — Next.js App Router pages, route protection (`proxy.ts`), and `/api/auth/*` handlers
- `src/` — Shared UI views, layout shell, `AuthContext`, API client, and client validation helpers
- `server/` — Express API server (`events`, `user`, `image`, `health`), JWT/session middleware, and MongoDB/fallback database manager
- `scripts/` — Unified startup helpers (`run-app.mjs`, `run-next.mjs`) running both Next.js and Express cleanly
- `tests/` & `server/tests/` — Automated frontend, auth, SSRF, CORS, rate-limit, and API security tests

## Environment Variables

Copy `.env.example` to `.env` and configure your environment values:

```env
APP_URL="http://localhost:3000"
PORT=3000
BACKEND_PORT=4000
API_BACKEND_URL="http://127.0.0.1:4000"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000"
FRONTEND_ORIGIN="http://localhost:3000"
FRONTEND_ORIGINS="http://localhost:3000"
BETTER_AUTH_SECRET="replace_with_a_cryptographically_random_secret_min_32_characters"
MONGODB_URI=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

For GitHub OAuth in hosted previews or Vercel deployments, register `<YOUR_APP_URL>/api/auth/callback/github` as an Authorized Callback URL in your GitHub OAuth App settings.

## Available Scripts

- `npm run dev` — Starts both Express backend (port `4000`) and Next.js frontend (port `3000`)
- `npm run build` — Builds the Next.js production bundle
- `npm start` — Runs the built Next.js production app + Express backend
- `npm run server:build` — Typechecks and bundles `server/` to `server/dist/index.mjs`
- `npm run lint` — Runs TypeScript typechecking (`tsc --noEmit`)
- `npm test` — Runs the automated frontend and backend test suite

## Pushing to Separate Client & Server Repositories

The `server/` folder includes its own standalone `package.json`, `.gitignore`, `.env.example`, `vercel.json`, and `README.md`, so you can push `uddomi-server` and `uddomi-client` independently:

### 1. Push Backend (`uddomi-server`)

```bash
cd server
git init
git add .
git commit -m "Setup standalone uddomi-server backend"
git branch -M main
git remote add origin https://github.com/Mohammad-Arifain-200/uddomi-server.git
git push -u origin main
```

### 2. Push Frontend (`uddomi-client`)

From the project root (excluding `server/` if you want client-only, or keeping root as-is):

```bash
git init
git add .
git commit -m "Setup uddomi-client frontend"
git branch -M main
git remote add origin https://github.com/Mohammad-Arifain-200/uddomi-client.git
git push -u origin main
```

When deploying `uddomi-client` separately on Vercel, set `USE_EXTERNAL_BACKEND=1` and `API_BACKEND_URL=https://your-uddomi-server.vercel.app`.

