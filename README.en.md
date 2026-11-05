# Mesa · Internal Support Management

[Español](README.md) | **English**

Full Stack Junior technical assessment: a web application for registering and tracking internal technology support requests.

## Technology stack

- Next.js App Router, React, TypeScript, and Tailwind CSS for the frontend.
- NestJS and DTOs with class-validator for the REST API.
- Supabase PostgreSQL, accessed from NestJS through `@supabase/supabase-js`.
- A SQL RPC function for transactions, row locking, and consistent change history.
- Node Test Runner, Supertest, and PGlite for tests without real credentials or production data.

This stack matches the candidate's experience. The assessment allows a choice of technologies; Vue and Express are recommendations rather than requirements.

## Prerequisites

- Node.js 24 and npm.
- A Supabase project dedicated to this assessment.
- Git.

## Installation

```powershell
git clone https://github.com/calossandres/Prueba-ITM-SAS-Full-Stack-Junior.git
cd "Prueba-ITM-SAS-Full-Stack-Junior"
git switch develop
npm ci
Copy-Item .env.example .env.local
```

If `.env.local` already exists, edit it instead of overwriting it with the template. The copy command above uses PowerShell; on macOS/Linux, use `cp .env.example .env.local`.

## Environment variables

Create `.env.local` at the repository root, next to the root `package.json`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

| Variable | Where to find it | Purpose |
|---|---|---|
| SUPABASE_URL | Supabase > Settings > Data API > Project URL | Project address |
| SUPABASE_SECRET_KEY | Supabase > Settings > API Keys > Secret keys | Server access exclusively from NestJS |
| PORT | Local configuration: 3001 | API port |
| FRONTEND_ORIGIN | Local configuration: http://localhost:3000 | Allowed CORS origin |

Never prefix the secret key with `NEXT_PUBLIC_`. The frontend calls NestJS and does not need Supabase keys. A publishable key cannot replace the secret key for these operations. Neither `DATABASE_URL` nor the PostgreSQL password is required.

`.env.local` and its variants are ignored by Git. `.env.example` contains placeholders only. To change the API destination in another environment, set `API_URL` in the Next.js environment before building; the local default is `http://127.0.0.1:3001`.

## Supabase setup

Run these scripts in order in your assessment project's SQL Editor:

1. `supabase/migrations/001_initial.sql`: tables, indexes, and Row Level Security (RLS).
2. `supabase/migrations/002_supabase_rpc.sql`: transactional function and execution permissions.
3. `supabase/migrations/003_request_images.sql`: image references and audited updates.
4. `supabase/migrations/004_image_storage.sql`: private image bucket.
5. `supabase/migrations/005_atomic_creation_image.sql`: one creation event when registering a request with an image.

If `support_requests` and `request_history` already exist with this application's schema, run the pending migrations in order. Switching to the Supabase client does not require deleting tables or data.

Run these migrations through the SQL Editor with administrative privileges. Only `service_role` can execute the `support_api` function; anonymous access is not enabled. The secret key stays in the backend.

## Running the application

From the repository root:

```powershell
npm run dev
```

- Application: http://localhost:3000
- Health check: http://localhost:3001/api/health
- Request list API: http://localhost:3001/api/requests

The health check should return `{"status":"ok","database":"Supabase PostgreSQL"}`. It calls the RPC function and verifies access to both tables.

Alternatively, start each workspace in a separate terminal:

```powershell
npm run dev -w backend
npm run dev -w frontend
```

Use only one startup approach at a time. Running the combined command while a backend is already listening on the same port causes `EADDRINUSE`.

## Verification

```powershell
npm test
npm run typecheck
npm run build
```

Tests use embedded PostgreSQL and a local HTTP server to check the Supabase client. They do not load `.env.local`, require real keys, or modify your Supabase project.

To run the production build locally, first run `npm run build`, then:

```powershell
npm start -w backend
npm start -w frontend
```

Run these commands in two separate terminals and stop development servers first. See the Vercel guide to publish both projects.

## Features and business rules

- Create requests with a title, description, requester, category, and priority. Initial status: `Pendiente` (Pending).
- View request lists and details; edit open requests.
- Search titles, descriptions, and requesters without case sensitivity.
- Filter by status, priority, and category; sort and paginate results.
- Record creation, edits, and status changes with an actor, timestamp, and observation.
- Cancel pending requests while preserving history. Cancellation was chosen instead of physical deletion, as allowed by the assessment.

Allowed transitions, using the actual Spanish values accepted by the API:

```text
Pendiente -> En progreso -> Resuelta
Pendiente -> Cancelada
```

| API value | English meaning |
|---|---|
| Pendiente | Pending |
| En progreso | In progress |
| Resuelta | Resolved |
| Cancelada | Cancelled |

`Resuelta` and `Cancelada` are final states. Resolving a request with priority `Crítica` (Critical) requires a nonempty observation. General request edits cannot change status.

The interface and API enum values remain in Spanish; this English README does not change the application language or accepted payloads.

## Project structure and documentation

```text
backend/src/              Controllers, DTOs, service, and Supabase client
backend/test/             API, SQL, and SDK HTTP transport tests
frontend/app/             Interface, layout, and styles
supabase/migrations/      Schema and RPC function
docs/                     Explanations, API reference, and manual checks
.github/workflows/        Automated verification in GitHub
```

The detailed guides below are written in Spanish:

- [Architecture and technical decisions](docs/ARQUITECTURA.md)
- [Study guide and code walkthrough](docs/GUIA_ESTUDIO.md)
- [REST API reference](docs/API.md)
- [Manual verification and delivery](docs/VERIFICACION.md)
- [Assessment requirements review and delivery status](docs/REVISION_ENTREGA.md)

## Git workflow and delivery

Development takes place on `develop`. The assessment requires `main`, `develop`, at least five commits, and an integration from develop into main. Group commits by meaningful changes and verify the application before merging.

Using GitHub Desktop: commit on develop, Push origin, stop the servers before switching to main, choose Branch > Merge into current branch > develop, confirm, and Push origin. Check that both branches are available on GitHub and that the repository is public.

Do not upload `node_modules` or generated `.next` and `dist` files. Switching to an older branch without `.gitignore` may make these files appear as untracked. Do not commit them or use Discard all changes as a workaround.

## Scope and limitations

User sign-in is not implemented because the assessment does not require it. The actor's name is supplied by the user and is not an authenticated identity. This API is intended for local evaluation; authentication and authorization must be added before exposing it as a public help desk.

AI assistance was used for implementation and review. The candidate must study, run, and verify the code and be able to explain or modify it during the technical review.

## Images and Vercel demo

One optional image per request, with an original-file limit of 500 MB. The browser optimizes it before upload; NestJS validates and re-encodes it, and Supabase stores it in a private bucket. Creating with an image generates one Creation event. Later image changes generate an Edit event.

`npm run dev` waits for the API health check before starting Next.js. The frontend also shows a connection state while the API is starting.

Publish two Vercel projects from this monorepo: `backend` (NestJS) and `frontend` (Next.js). Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` only on the backend, and `API_URL` on the frontend. The following detailed guides are in Spanish:

- [Vercel deployment](docs/VERCEL.md)
- [Image configuration and behavior](docs/IMAGENES.md)
- [Original assessment PDF](docs/PRUEBA_TECNICA.pdf)
