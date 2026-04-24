# Skill: Database (Prisma + SQLite)

## When to use this skill
Building the database layer: schema design, migrations, seed data, Prisma client setup.

---

## 1. prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // bcrypt hashed
  role      Role     @default(FACULTY)
  createdAt DateTime @default(now())

  // Relations
  courses     Course[]    // courses taught (faculty)
  attendances Attendance[] // attendances marked by this user
}

enum Role {
  ADMIN
  FACULTY
  STUDENT
}

model Student {
  id        String   @id @default(cuid())
  name      String
  rollNo    String   @unique  // e.g. "CS001"
  email     String?
  qrCode    String?  // base64 PNG or URL
  createdAt DateTime @default(now())

  enrollments Enrollment[]
  attendances Attendance[]
}

model Course {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique  // e.g. "CS101"
  faculty   User     @relation(fields: [facultyId], references: [id])
  facultyId String
  createdAt DateTime @default(now())

  enrollments Enrollment[]
  attendances Attendance[]
}

model Enrollment {
  id        String  @id @default(cuid())
  student   Student @relation(fields: [studentId], references: [id])
  studentId String
  course    Course  @relation(fields: [courseId], references: [id])
  courseId  String

  @@unique([studentId, courseId])
}

model Attendance {
  id          String          @id @default(cuid())
  student     Student         @relation(fields: [studentId], references: [id])
  studentId   String
  course      Course          @relation(fields: [courseId], references: [id])
  courseId    String
  markedBy    User            @relation(fields: [markedById], references: [id])
  markedById  String
  date        DateTime        @default(now())
  status      AttendanceStatus @default(PRESENT)
  method      MarkMethod      @default(MANUAL)

  @@index([studentId, courseId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

enum MarkMethod {
  QR_SCAN
  MANUAL
}
```

---

## 2. src/lib/prisma.ts (singleton client)
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 3. prisma/seed.ts (run with `npx prisma db seed`)
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@school.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Create a faculty user
  const facultyPassword = await bcrypt.hash('faculty123', 10)
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@school.com' },
    update: {},
    create: {
      name: 'Mr. Kumar',
      email: 'faculty@school.com',
      password: facultyPassword,
      role: 'FACULTY',
    },
  })

  // Create a course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: 'Introduction to Computing',
      code: 'CS101',
      facultyId: faculty.id,
    },
  })

  // Create 5 demo students
  const students = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
  for (let i = 0; i < students.length; i++) {
    const student = await prisma.student.upsert({
      where: { rollNo: `CS00${i + 1}` },
      update: {},
      create: {
        name: students[i],
        rollNo: `CS00${i + 1}`,
        email: `${students[i].toLowerCase()}@student.com`,
      },
    })
    // Enroll in course
    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id },
    })
  }

  console.log('✅ Seed complete. Login: admin@school.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```
Install: `npm install -D ts-node bcryptjs @types/bcryptjs`

---

## 4. Common Prisma Queries

### Get all students with attendance count
```typescript
const students = await prisma.student.findMany({
  include: {
    _count: { select: { attendances: true } }
  }
})
```

### Get attendance for a course on a date
```typescript
const records = await prisma.attendance.findMany({
  where: {
    courseId,
    date: {
      gte: new Date(date + 'T00:00:00'),
      lte: new Date(date + 'T23:59:59'),
    }
  },
  include: { student: true }
})
```

### Mark attendance (upsert — avoids duplicates)
```typescript
await prisma.attendance.upsert({
  where: {
    // add @@unique([studentId, courseId, date]) to schema if you want one record/day
    id: existingId ?? 'new'
  },
  update: { status: 'PRESENT', method: 'QR_SCAN' },
  create: {
    studentId,
    courseId,
    markedById: session.user.id,
    status: 'PRESENT',
    method: 'QR_SCAN',
  }
})
```

---

## 5. For Vercel Deployment (replace SQLite)
SQLite files don't survive Vercel's serverless cold starts. Use **Turso** (free):
```bash
npm install @libsql/client @prisma/adapter-libsql
```
Update `schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("TURSO_DATABASE_URL")
  // add adapter support
}
```
Or use `@vercel/postgres` and change provider to `postgresql`.