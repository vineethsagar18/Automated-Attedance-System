# Skill: Vercel Deployment (Free)

## When to use this skill
Deploying the project to Vercel with a free cloud database.

---

## The Problem with SQLite on Vercel
Vercel uses serverless functions — each request may spin up a fresh container.
SQLite is a local file, so it won't persist. Solution: **Turso** (free, SQLite-compatible cloud DB).

---

## Option A: Turso (Recommended — stays SQLite, minimal code changes)

### 1. Create free Turso DB
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create DB
turso db create attendance-db

# Get credentials
turso db show attendance-db      # shows URL
turso db tokens create attendance-db  # get auth token
```

### 2. Install adapter
```bash
npm install @libsql/client @prisma/adapter-libsql
```

### 3. Update prisma/schema.prisma
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("TURSO_DATABASE_URL")
}
```

### 4. Update src/lib/prisma.ts
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }
  // Fallback to local SQLite in dev
  return new PrismaClient({ log: ['query'] })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 5. .env.local (add these)
```
DATABASE_URL="file:./dev.db"           # local dev
TURSO_DATABASE_URL="libsql://your-db-name-yourname.turso.io"
TURSO_AUTH_TOKEN="your-token-here"
```

### 6. Push schema to Turso
```bash
npx prisma db push
```

---

## Option B: Vercel Postgres (also free, but switches to PostgreSQL)

### 1. In Vercel dashboard → Storage → Create Postgres DB
### 2. Copy connection string into .env.local
### 3. Update schema.prisma:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```
### 4. Change all SQLite-specific types (no `enum` in SQLite — Postgres supports them natively, so keep as-is)
### 5. `npx prisma db push`

---

## Deploying to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourname/attendance-system.git
git push -u origin main
```

### 2. Import on Vercel
- Go to vercel.com → Add New Project → Import from GitHub
- Select your repo
- Framework: Next.js (auto-detected)
- Click Deploy

### 3. Add Environment Variables in Vercel
Go to: Project → Settings → Environment Variables
Add all of these:
```
NEXTAUTH_SECRET          = (generate: openssl rand -base64 32)
NEXTAUTH_URL             = https://your-project.vercel.app
TURSO_DATABASE_URL       = libsql://...
TURSO_AUTH_TOKEN         = ...
```

### 4. After deploy, seed data
```bash
# Run seed against Turso
TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." npx prisma db seed
```

### 5. Redeploy on every git push
Vercel auto-deploys when you push to `main`.

---

## next.config.ts (required for Prisma on Vercel)
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@libsql/client'],
}

export default nextConfig
```

---

## Checklist before deploy
- [ ] `.env.local` is in `.gitignore` (never commit secrets)
- [ ] All env variables added to Vercel dashboard
- [ ] `NEXTAUTH_URL` set to actual Vercel URL (not localhost)
- [ ] `npx prisma generate` runs in build (add `postinstall` script)

```json
// package.json
"scripts": {
  "postinstall": "prisma generate",
  "build": "next build"
}
```