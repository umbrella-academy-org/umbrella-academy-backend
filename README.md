# Dreamize Backend

Express + TypeScript API for the Dreamize LMS. This repository is **standalone** — clone, configure, and run it on its own. The frontend lives in a separate repo and talks to this API over HTTP.

## Prerequisites

- **Node.js** 18 or newer
- **pnpm** (recommended) or npm
- **MongoDB** — local instance or MongoDB Atlas connection string

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template and fill in values
cp .env.example .env

# 3. Start development server (with hot reload)
pnpm run dev
```

The API runs at **http://localhost:5000** by default.

Health check: **http://localhost:5000/health**

## Environment variables

Copy `.env.example` to `.env` and set the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing auth tokens |
| `FRONTEND_URL` | Yes | Frontend origin for CORS and email links (e.g. `http://localhost:3000`) |
| `EMAILJS_SERVICE_ID` | Yes* | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | Yes* | EmailJS template ID (unified template) |
| `EMAILJS_PUBLIC_KEY` | Yes* | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | Yes* | EmailJS private key |
| `ADMIN_EMAIL` | No | Admin account seeded on startup |
| `ADMIN_PASSWORD` | No | Admin password for seed |
| `ZOOM_ACCOUNT_ID` | No | Zoom Server-to-Server OAuth (online bookings) |
| `ZOOM_CLIENT_ID` | No | Zoom client ID |
| `ZOOM_CLIENT_SECRET` | No | Zoom client secret |
| `EMAIL_MAX_RETRIES` | No | Email retry attempts (default: `3`) |
| `EMAIL_RETRY_DELAY_MS` | No | Base delay between retries in ms (default: `1000`) |
| `EMAIL_DEBUG` | No | Log OTP codes to console in local dev |
| `PORT` | No | Server port (default: `5000`) |

\*Required for OTP, password reset, guardian invites, and other transactional emails.

### EmailJS template

The unified template should accept these variables:

- `{{to_email}}`
- `{{to_name}}`
- `{{subject}}`
- `{{message}}`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev server with nodemon + ts-node |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run production build (`node dist/index.js`) |
| `pnpm test` | Run Jest tests |
| `pnpm run seed:owner` | Seed admin user manually |

## Running with the frontend locally

1. Start this backend on port **5000**.
2. In `.env`, set `FRONTEND_URL=http://localhost:3000`.
3. Start the frontend repo (see its README) on port **3000**.

The frontend uses `http://localhost:5000` as the API base URL in development.

## Production build

```bash
pnpm install
pnpm run build
pnpm start
```

### Docker

```bash
docker build -t dreamize-backend .
docker run -p 5000:3000 --env-file .env dreamize-backend
```

> The Docker image listens on port **3000** inside the container. Map it to your host port as needed. Set all env vars via `--env-file` or your platform’s environment settings (do not rely on `.env` being copied into the image).

### Deploying (Render example)

1. Connect this repo to Render as a **Web Service**.
2. Set build command: `pnpm install && pnpm run build`
3. Set start command: `pnpm start`
4. Add all environment variables from `.env.example` in the Render dashboard.
5. Set `FRONTEND_URL` to your deployed frontend URL (e.g. Vercel).

Email is sent via **EmailJS over HTTPS**, which works on Render’s free tier (unlike raw SMTP).

## Project structure

```
src/
├── index.ts          # App entry, routes, server startup
├── config/           # Database connection
├── controllers/      # Route handlers
├── middleware/       # Auth, validation
├── models/           # Mongoose schemas
├── routes/           # Express routers
├── services/         # Business logic (auth, email, chat, etc.)
└── seed/             # Admin seed on startup
```

## Troubleshooting

**`Cannot find module '@emailjs/nodejs'`**  
Run `pnpm install` in the backend folder.

**MongoDB connection failed**  
Check `MONGODB_URI` and that MongoDB is running or Atlas allows your IP.

**Emails not sending**  
Confirm all `EMAILJS_*` vars are set. Check server logs for `[email]` messages. Failed sends retry automatically up to 3 times.

**CORS errors from frontend**  
Ensure `FRONTEND_URL` matches the exact URL the browser uses (including port).

## Contact

hello@dreamize.rw
