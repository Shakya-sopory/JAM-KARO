# JAM KARO

Nashik's ground-level music network — a marketplace connecting musicians, bands, and gig hirers.
Discovery/swiping, band lineups, a shows board, gear rentals, jam circles, community + 1-on-1 chat,
and notifications.

## Stack

- **Frontend** — React 19 + Vite (repository root)
- **Backend** — Express + SQLite, with bcrypt password hashing and JWT auth (`server/`)

The frontend and backend are two independent npm packages and run as two separate processes.

## Prerequisites

- Node.js 18+ and npm

## Running locally

You need **two terminal windows** — one for the frontend, one for the backend.

### Terminal 1 — backend (`server/`)

```bash
cd server
cp .env.example .env   # then edit .env and set a real JWT_SECRET
npm install
npm start
```

The API runs on **http://localhost:3001**.

`.env` values:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Secret used to sign auth tokens. Required for production; a dev fallback is used if unset. |
| `FAST2SMS_API_KEY` | Optional. If set, OTP codes are sent by real SMS via Fast2SMS; otherwise the code is printed to the server console. |

The SQLite database file (`server/database.db`) and the `server/uploads/` folder are created automatically on first run.

### Terminal 2 — frontend (repository root)

```bash
npm install
npm run dev
```

Vite serves the app on **http://localhost:5173** and talks to the backend at `http://localhost:3001` by default.

To point the frontend at a different backend, set `VITE_API_URL` (e.g. in a root `.env` file):

```bash
VITE_API_URL=https://your-api-host.example.com
```

## Other commands

Frontend (root):

- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run oxlint

Backend (`server/`):

- `npm start` — start the API server
