# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 14 (App Router) work order / maintenance management system ("ADTECH") for a
multi-site organization. Beyond core work orders it also covers sale orders, service
requests, defect reports, material requisitions, PM (preventive maintenance) schedules,
maintenance contracts, and a teams/roles structure — all gated by a fairly elaborate
role + site permission system.

## Commands

```
npm install               # postinstall runs `prisma generate` automatically
npm run dev                # start dev server (localhost:3000)
npm run build               # production build
npm run start                # run production build
npx prisma migrate dev --name <desc>   # create + apply a migration during development
npx prisma migrate deploy               # apply pending migrations (production)
npm run seed                            # tsx prisma/seed.ts — seeds 3 test users + sample data
npx prisma studio                       # inspect the DB visually
```

There is no test suite, lint script, or CI config in this repo — don't assume `npm test`
or `npm run lint` exist.

Required env vars (see `.env.example`): `DATABASE_URL`, `DIRECT_URL` (Prisma), `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`. Optional integrations degrade gracefully when unset (each logs and skips
rather than throwing): `GMAIL_USER`/`GMAIL_APP_PASSWORD` (email via nodemailer), `TELEGRAM_BOT_TOKEN`
(bot notifications), `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (client-side link-to-bot), `CRON_SECRET`
(protects the two cron endpoints below), and `BLOB_READ_WRITE_TOKEN` (Vercel Blob, for photo uploads).

## Architecture

**Stack**: Next.js 14 App Router, NextAuth (JWT sessions, credentials provider only),
Prisma + Postgres, `@react-pdf/renderer` for PDF generation, `@vercel/blob` for photo storage,
Recharts for dashboard charts, `xlsx` for report export. No client-side state library —
pages fetch directly from route handlers.

**Route-protection layering** (both layers exist independently — don't rely on just one):
1. `middleware.ts` — `next-auth/middleware` gates whole path prefixes (`/dashboard`,
   `/work-orders`, `/reports`, `/users`, etc.) behind having *any* session; it does not
   check roles.
2. Every `app/api/**/route.ts` handler independently calls `getServerSession(authOptions)`
   and then a role check, typically one of the `canAccess*` helpers in `lib/permissions.ts`
   (`canAccessWorkOrders`, `canAccessSaleOrders`, `canAccessServiceRequests`), or an inline
   allow-list array for narrower actions (e.g. photo upload). There's no central
   middleware-level RBAC — always add the check inside the handler itself when adding a
   new route.

**Roles** (`Role` enum in `prisma/schema.prisma`): `ADMIN`, `MANAGER`, `REQUESTER`, and
paired leader/engineer or leader/technician roles per department — `MAINTENANCE_LEADER`/
`MAINTENANCE_TECHNICIAN`, `TNC_LEADER`/`TNC_ENGINEER`, `SALES_LEADER`/`SALES_ENGINEER`,
`QC_LEADER`/`QC_ENGINEER`, `SHOP_DRAWING_LEADER`/`SHOP_DRAWING_ENGINEER`,
`ANA_LEADER`/`ANA_ENGINEER`. Which roles can see which top-level feature (work orders vs.
sale orders vs. service requests) is defined by the `canAccess*` functions in
`lib/permissions.ts` — check there rather than assuming from the role name.

**Multi-site scoping**: `Site` is a first-class model; `User`↔`Site` is a many-to-many via
`UserSite`. `WorkOrder`, `Asset`, and `DefectReport` carry a direct `siteId`. Non-admin users
only see data for sites they're assigned to; `ADMIN` bypasses this entirely. The pattern used
everywhere: call `getUserSiteIds(userId, role)` (returns `"ALL"` for admins, else an array of
site IDs) and pass the result through `siteWhere(siteIds)` to build the Prisma `where` clause.
Follow this pattern for any new site-scoped model/route rather than inventing a new check.

**Teams**: `Team` has a `category` (`SALES` | `PROJECT` | `MAINTENANCE`) and an optional
`teamLeaderId`. Work orders/sale orders/service requests can be attached to a team; a team's
`category` gets copied onto the record at creation. A user leading a team sees that team's
records even outside their normal role-based visibility — a user can lead more than one team,
so use `getLeaderTeamIds` (array-returning) rather than assuming a single team — this is `OR`'d
into the Prisma `where` alongside the role-based and site-based filters (see
`app/api/work-orders/route.ts` `GET` for the canonical shape: base site/archived filter,
`AND`ed with an `OR` of role-specific conditions).

**Domain modules** mostly follow the same shape — a Prisma model (or small model + item/
comment/photo sub-models), a `GET`/`POST` route at `app/api/<thing>/route.ts`, a `[id]`
sub-route for single-record `GET`/`PATCH`/`DELETE`, and a page under `app/<thing>/`:
work-orders, sale-orders, service-requests, defect-reports, material-requisitions,
maintenance-contracts, pm-schedules, assets (via `app/api/assets`), teams, sites, users.
Work orders, defect reports, and material requisitions additionally have `[id]/report`
(generates a PDF) and `[id]/send` (emails that PDF) sub-routes — see `lib/*Pdf.tsx` for the
`@react-pdf/renderer` document definitions (shared color constants/label maps live at the
top of each file; keep new PDFs visually consistent with those).

**Photo uploads** (`work-orders/[id]/photos`, `defect-reports/[id]/photos`) go straight to
Vercel Blob (`@vercel/blob`'s `put`) with a role allow-list checked inline, then a
`*Photo` row is created pointing at the blob URL — there's no local filesystem storage path.

**Notifications** are dual-channel and both are fire-and-forget (errors are caught and
logged, never thrown, so a notification failure never fails the calling request):
`lib/notifications.ts`'s `notifyUser()` writes an in-app `Notification` row (surfaced via
`app/api/notifications`), and `lib/email.ts`/`lib/telegram.ts` send email/Telegram
messages using template functions per event type (e.g. `workOrderAssignedEmail`,
`statusChangedEmail`). When adding a new notification-worthy event, add a template function
alongside the existing ones rather than building HTML inline at the call site.

**Cron-driven automation**: `vercel.json` schedules two protected cron endpoints (checked
against `CRON_SECRET` via `Authorization: Bearer <token>`, not session auth):
`/api/pm-schedules/generate` (creates a work order from any due `PMSchedule` and advances
its `nextDueAt`) and `/api/maintenance-contracts/check-alerts` (sends 30/7-day renewal
alerts for `MaintenanceContract`s, tracked via `alert30SentAt`/`alert7SentAt` so alerts
aren't resent).

**Auth**: `lib/auth.ts` defines the single `NextAuthOptions` (credentials provider, bcrypt
password check, JWT session strategy). Login accepts either email or username
(`identifier` field). `role` and `id` are threaded onto the JWT/session in the `jwt`/`session`
callbacks — read them off `session.user.role` / `session.user.id` (typed via
`types/next-auth.d.ts`), not by re-querying the DB for the current user's role.

**Pages** mix server and client components: list/detail pages are typically async server
components that call `getServerSession` + Prisma directly (see `app/dashboard/page.tsx`),
while interactive pages (forms, anything using `useSession`/`useState`) are `"use client"`.
When a page needs both a role check and live data, prefer doing the role check server-side
and redirecting/hiding rather than only hiding UI client-side (client-side hiding alone
doesn't protect the underlying API route, which must always be checked independently).

**Config note**: `next.config.js` is the active Next config (not `next.config.mjs`, which is
present but empty).
