# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Jam Karo" (package name `jam-to-gig`) — an MVP marketplace connecting musicians, bands, and gig hirers. Two-user-type app (`musician` / `hirer`) covering discovery/swiping, band lineups, a gig board with escrow, gear rentals, jam circles, community + 1-on-1 chat, and notifications.

## Layout

Two separate npm packages with independent `package_lock.json` / `node_modules`:

- **Root** — React 19 + Vite 8 frontend (`src/`). ESM (`"type": "module"`).
- **`server/`** — Express 4 + `sqlite3` backend, single file `server/server.js`. CommonJS (`require`).

Install dependencies in both: `npm install` in the root and again in `server/`.

## Commands

Frontend (run from root):
- `npm run dev` — Vite dev server (default port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built bundle
- `npm run lint` — oxlint (config in `.oxlintrc.json`; `react/rules-of-hooks` is an error)

Backend (run from `server/`):
- `npm start` — `node server.js` on port **3001** (hard-coded)

No test runner is configured in either package.

## Architecture

### Frontend

- `src/main.jsx` → `src/App.jsx` is the whole app shell. No router — `App` holds `user`, `activeTab`, and modal state (`chatPartner`, notification drawer) in `useState` and swaps components by tab. Available tabs depend on `user.userType` and `user.skillLevel`.
- Session persistence: the logged-in user object is stored in `localStorage` under `jam_to_gig_session`; `App` rehydrates from it on mount. No tokens — auth is a plain email/password lookup.
- `src/config.js` exports `API_BASE_URL` = `import.meta.env.VITE_API_URL || 'http://localhost:3001'`. **All** fetch calls must go through this constant. Set `VITE_API_URL` (e.g. in `.env`) for non-local backends.
- Components in `src/components/` each own their data fetching with raw `fetch`. Notifications are polled every 5s from `App`.
- Icons: `lucide-react`. Styling: hand-written CSS in `src/App.css` / `src/index.css` (no CSS framework).

### Backend

- Everything lives in `server/server.js`: middleware, Multer setup, schema, and ~14 REST endpoint groups under `/api/*`.
- SQLite file `server/database.db` is created on boot; `initializeTables()` runs `CREATE TABLE IF NOT EXISTS` for all tables (`users`, `matches`, `joint_profiles`, `gigs`, `gear_rentals`, `community_messages`, `jam_sessions`, `private_messages`, `notifications`). There are **no migrations** — changing a column means editing the `CREATE TABLE` and deleting `database.db` (gitignored) to recreate.
- The `users` table is a combined auth + profile record. Passwords are stored in plaintext (MVP).
- File uploads (`avatar`, `video`) use Multer disk storage into `server/uploads/` (gitignored), served statically at `/uploads`. `POST /api/profiles/update` builds its `UPDATE` query dynamically so a field is only overwritten when a new file is sent. Upload URLs are currently hard-coded to `http://localhost:3001` in `server.js`.
- API field convention: DB columns are `snake_case`; every endpoint maps them to `camelCase` in responses and expects `camelCase` in request bodies. Array/JSON fields (`genres`, band `members`) are stored as comma-joined strings or `JSON.stringify`'d text and parsed back on read.
- Some handlers use placeholder IDs (e.g. `currentUserId = 99` in `/api/matches`, fallback `targetUserId = 3` for notifications) — real user context is not yet wired through.

### OTP / SMS

`POST /api/auth/send-otp` generates a 4-digit code held in the in-memory `activeOtps` map (lost on restart) and consumed by `/api/auth/signup`. If `FAST2SMS_API_KEY` is set in `server/.env` it sends a real SMS via Fast2SMS; otherwise the code is logged to the server console and returned in the response as a fallback. `dotenv` is loaded at the top of `server.js`.

## Conventions

- **Validation**: use **Zod** for all request/input validation (frontend forms and backend endpoints). It is not yet a dependency — add it (`npm install zod` in the relevant package) when introducing the first schema. Prefer parsing a Zod schema over the current ad-hoc `if (!field)` checks in `server.js`.
- Keep frontend network calls routed through `API_BASE_URL` from `src/config.js`.
- Match the existing snake_case-DB / camelCase-API mapping when adding endpoints.
