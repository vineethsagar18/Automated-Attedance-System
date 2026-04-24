import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
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
    update: {
      name: 'Mr. Kumar',
      password: facultyPassword,
      role: 'FACULTY',
    },
    create: {
      name: 'Mr. Kumar',
      email: 'faculty@school.com',
      password: facultyPassword,
      role: 'FACULTY',
    },
  })

  // Create a second faculty user
  const faculty2Password = await bcrypt.hash('faculty123', 10)
  await prisma.user.upsert({
    where: { email: 'faculty2@school.com' },
    update: {
      name: 'Ms. Priya',
      password: faculty2Password,
      role: 'FACULTY',
    },
    create: {
      name: 'Ms. Priya',
      email: 'faculty2@school.com',
      password: faculty2Password,
      role: 'FACULTY',
    },
  })

  // Create courses
  const course1 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      name: 'Introduction to Computing',
      code: 'CS101',
      facultyId: faculty.id,
    },
  })

  const course2 = await prisma.course.upsert({
    where: { code: 'MATH201' },
    update: {},
    create: {
      name: 'Applied Mathematics',
      code: 'MATH201',
      facultyId: admin.id,
    },
  })

  // Create 5 demo students
  const studentData = [
    { name: 'Alice Johnson', rollNo: 'CS001', email: 'alice@student.com' },
    { name: 'Bob Smith', rollNo: 'CS002', email: 'bob@student.com' },
    { name: 'Charlie Brown', rollNo: 'CS003', email: 'charlie@student.com' },
    { name: 'Diana Prince', rollNo: 'CS004', email: 'diana@student.com' },
    { name: 'Eve Martinez', rollNo: 'CS005', email: 'eve@student.com' },
  ]

  for (const s of studentData) {
    const student = await prisma.student.upsert({
      where: { rollNo: s.rollNo },
      update: {},
      create: { name: s.name, rollNo: s.rollNo, email: s.email },
    })

    // Enroll in CS101
    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course1.id } },
      update: {},
      create: { studentId: student.id, courseId: course1.id },
    })

    // Enroll first 3 in MATH201 as well
    if (['CS001', 'CS002', 'CS003'].includes(s.rollNo)) {
      await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId: student.id, courseId: course2.id } },
        update: {},
        create: { studentId: student.id, courseId: course2.id },
      })
    }
  }

  console.log('✅ Seed complete!')
  console.log('   Admin  → admin@school.com   / admin123')
  console.log('   Faculty→ faculty@school.com / faculty123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
