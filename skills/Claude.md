# Attendance System – Claude Code Guide

## Project Overview
A web-based student attendance system for a school. Built with Next.js 14 (App Router),
deployed free on Vercel. Supports QR-based check-in, manual marking, and CSV export.
Max scale: ~10 students, 1-2 teachers, 1 admin.

## Tech Stack (All Free)
- **Framework:** Next.js 14 with App Router + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite via Prisma ORM (file-based, zero setup, free forever)
- **Auth:** NextAuth.js v5 (free, credentials provider)
- **QR Generation:** `qrcode` npm package (server-side)
- **QR Scanning:** `html5-qrcode` (browser webcam, no install needed)
- **CSV Export:** `csv-writer` npm package
- **Deployment:** Vercel (free hobby plan)

> No PostgreSQL, no Redis, no paid services needed for this scale.

---

## Database
- SQLite file stored at `prisma/dev.db`
- Managed via Prisma ORM
- On Vercel: use **Turso** (free SQLite-compatible cloud DB) OR switch to **Vercel Postgres** free tier
- See `skill-database.md` for full schema

---

## Project Structure
```
attendance-system/
├── CLAUDE.md                  ← This file
├── prisma/
│   ├── schema.prisma          ← Database schema
│   └── seed.ts                ← Seed admin + demo data
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx     ← Sidebar + nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── students/page.tsx
│   │   │   ├── courses/page.tsx
│   │   │   ├── attendance/
│   │   │   │   ├── mark/page.tsx   ← QR scanner + manual
│   │   │   │   └── view/page.tsx   ← Table + export
│   │   │   └── qr/
│   │   │       └── generate/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── students/route.ts
│   │       ├── courses/route.ts
│   │       ├── attendance/route.ts
│   │       └── qr/route.ts
│   ├── components/
│   │   ├── ui/                ← shadcn/ui auto-generated
│   │   ├── QRScanner.tsx
│   │   ├── AttendanceTable.tsx
│   │   └── StatsCard.tsx
│   ├── lib/
│   │   ├── prisma.ts          ← Prisma client singleton
│   │   ├── auth.ts            ← NextAuth config
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── .env.local                 ← Secrets (never commit)
├── next.config.ts
└── package.json
```

---

## User Roles
| Role    | Can do |
|---------|--------|
| `ADMIN` | Everything — manage users, courses, students, view all reports |
| `FACULTY` | Mark attendance for their courses, view their reports |
| `STUDENT` | View own attendance (optional, can skip for v1) |

---

## Key Pages
| Route | Purpose |
|-------|---------|
| `/login` | Sign in with email + password |
| `/dashboard` | Stats overview (total students, today's attendance %) |
| `/students` | Add / edit / delete students |
| `/courses` | Manage courses, assign faculty |
| `/attendance/mark` | Webcam QR scanner OR manual checkbox |
| `/attendance/view` | Filterable table, export CSV |
| `/qr/generate` | Generate + download QR codes per student |

---

## Environment Variables (.env.local)
```
NEXTAUTH_SECRET=any-random-string-here
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
```
For Vercel deployment, add these in Vercel dashboard > Settings > Environment Variables.

---

## Setup Commands (run in order)
```bash
# 1. Create Next.js app
npx create-next-app@latest attendance-system --typescript --tailwind --app --src-dir

# 2. Install dependencies
cd attendance-system
npm install prisma @prisma/client next-auth@beta qrcode html5-qrcode csv-writer
npm install -D @types/qrcode

# 3. Setup shadcn/ui
npx shadcn@latest init

# 4. Initialize Prisma with SQLite
npx prisma init --datasource-provider sqlite

# 5. After writing schema.prisma (see skill-database.md):
npx prisma migrate dev --name init
npx prisma db seed

# 6. Run dev server
npm run dev
```

---

## Skill Files (read these for each feature)
- `skill-database.md` → Prisma schema + seed data
- `skill-auth.md` → NextAuth setup, login page, role guard
- `skill-qr.md` → QR generation + browser scanning
- `skill-attendance.md` → Mark attendance, view table, CSV export
- `skill-ui.md` → Dashboard layout, components, shadcn/ui setup

---

## Coding Rules
1. Always use TypeScript — no `any` types
2. Use server components by default; add `"use client"` only when needed (forms, webcam, state)
3. Prisma queries go in API route handlers, never in client components
4. All API routes return `NextResponse.json()`
5. Use `zod` for input validation in API routes
6. Keep components small — split into `components/` if >80 lines

---

## Deployment to Vercel (Free)
1. Push code to GitHub
2. Go to vercel.com → Import repository
3. Add environment variables in Vercel dashboard
4. For database on Vercel: replace SQLite with **Turso** (free tier, SQLite-compatible)
   - Or use `@vercel/postgres` free tier and change `DATABASE_URL`
5. Vercel auto-deploys on every `git push`

> SQLite file doesn't persist on Vercel's serverless functions — use Turso for production.