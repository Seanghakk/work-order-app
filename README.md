# Maintenance work order system

A production-ready starting point: work orders, assets, preventive maintenance (PM)
scheduling, and reporting, with role-based login for requesters, technicians, and managers.

## Roles

- **Requester** — submits work orders, sees their own.
- **Technician** — sees work orders assigned to them, updates status, adds comments.
- **Manager / Admin** — sees everything, assigns work, manages assets and PM schedules, views reports.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in a real `DATABASE_URL` (see hosting below)
   and a random `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32`).
3. Create the database tables:
   ```
   npx prisma migrate dev --name init
   ```
4. Seed sample data (three test users, one asset, one PM schedule, one work order):
   ```
   npm run seed
   ```
   Test logins (password `changeme123` for all): `manager@example.com`,
   `tech@example.com`, `requester@example.com`. **Change these before going live.**
5. Run it:
   ```
   npm run dev
   ```
   Visit http://localhost:3000

## Recommended hosting (no infrastructure needed)

This stack was chosen so you don't need to manage a server:

1. **Database** — create a free Postgres instance at
   [supabase.com](https://supabase.com) or [railway.app](https://railway.app).
   Copy the connection string into `DATABASE_URL`.
2. **App hosting** — push this folder to a GitHub repo, then import it at
   [vercel.com](https://vercel.com). Add `DATABASE_URL` and `NEXTAUTH_SECRET`
   as environment variables in the Vercel project settings, and set
   `NEXTAUTH_URL` to your deployed URL (e.g. `https://your-app.vercel.app`).
3. Run `npx prisma migrate deploy` once against the production database
   (Vercel's build step can do this automatically if you add it to the build command:
   `prisma migrate deploy && next build`).

Cost at this department's likely scale: free to a few dollars a month.

## Automating PM schedules

`POST /api/pm-schedules/generate` checks for any PM schedule that's due and creates
a real work order from it, then advances the schedule's next-due date. It's
protected by a `CRON_SECRET` env var you set yourself — call it with header
`Authorization: Bearer <CRON_SECRET>`.

Trigger it daily with **Vercel Cron** (add a `vercel.json` cron entry pointing at
that route) or any external scheduler (cron-job.org, GitHub Actions on a schedule).

## What's here vs. what to add next

Included: auth + roles, work order CRUD with status/priority/comments, asset
registry, PM schedule creation + auto-generation, and a reports page (status
breakdown, priority breakdown, average time to close, overdue count).

Natural next additions once this is in use: file/photo attachments on work
orders, email notifications on assignment, a technician mobile view, audit
history, and CSV export from Reports. Happy to build any of these next —
just say which.
