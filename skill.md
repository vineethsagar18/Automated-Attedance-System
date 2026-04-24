# Attendance System Setup Guide (From Scratch)

This guide helps you install, run, and test the project on a new machine.

## 1) Prerequisites

Install these first:

- Node.js 20+ (LTS recommended)
- npm (comes with Node.js)
- Git
- VS Code (recommended)

Check versions:

```bash
node -v
npm -v
git --version
```

## 2) Get the project

If you already have this folder, skip this section.

```bash
git clone <your-repository-url>
cd attendance-system
```

If your folder name is different, use your real folder name.

## 3) Install dependencies

Run:

```bash
npm install
```

This project uses a `postinstall` step to generate the Prisma client automatically.

## 4) Create environment file

Create a `.env` file in the project root.

Use this template:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a strong secret (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste that value into `NEXTAUTH_SECRET`.

## 5) Initialize database

Run migrations and seed demo data:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

What seed creates:

- Admin: `admin@school.com` / `admin123`
- Faculty: `faculty@school.com` / `faculty123`
- Demo courses and students

## 6) Start development server

Run:

```bash
npm run dev
```

Open:

- Local: http://localhost:3000

## 7) Useful commands

```bash
npm run test         # Run unit tests once
npm run test:watch   # Watch mode tests
npm run lint         # Lint project
npm run build        # Production build
npm run start        # Start production build
```

## 8) First login flow

1. Open `/login`
2. Sign in with one of the seeded users
3. Go to dashboard pages (courses, students, attendance)

## 9) Common issues and fixes

### Port already in use

If port 3000 is busy:

- stop other app using 3000, or
- run with another port:

```bash
npx next dev -p 3001
```

### Prisma or DB issues

If schema changed and DB got out of sync:

```bash
npx prisma generate
npx prisma migrate reset
npx prisma db seed
```

> `migrate reset` deletes local database data. Use only for local/dev environments.

### Login not working

Check:

- `.env` values are present
- `NEXTAUTH_URL` matches the URL you are using
- seed command ran successfully

## 10) Project quick map

- App routes and pages: `src/app`
- APIs: `src/app/api`
- Shared UI: `src/components`
- Auth + Prisma libs: `src/lib`
- Prisma schema and seed: `prisma/schema.prisma`, `prisma/seed.ts`

---

If you want, the next step can be a deployment-ready version of this guide (for Vercel + managed database) in a separate file.
