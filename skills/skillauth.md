# Skill: Auth (NextAuth.js v5)

## When to use this skill
Setting up login, session management, role-based access control.

---

## 1. Install
```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

---

## 2. src/lib/auth.ts
```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.id as string
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
})
```

---

## 3. src/app/api/auth/[...nextauth]/route.ts
```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

---

## 4. middleware.ts (root of project, protects all dashboard routes)
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/students') ||
    req.nextUrl.pathname.startsWith('/courses') ||
    req.nextUrl.pathname.startsWith('/attendance') ||
    req.nextUrl.pathname.startsWith('/qr')

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 5. src/app/(auth)/login/page.tsx
```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Attendance System</CardTitle>
          <p className="text-center text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="text-xs text-center mt-4 text-muted-foreground">
            Demo: admin@school.com / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 6. Role Guard Helper (use in server components)
```typescript
// src/lib/auth-guard.ts
import { auth } from './auth'
import { redirect } from 'next/navigation'

export async function requireRole(role: 'ADMIN' | 'FACULTY') {
  const session = await auth()
  if (!session) redirect('/login')
  if (role === 'ADMIN' && session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}
```

Usage in any server page:
```typescript
// app/students/page.tsx
import { requireRole } from '@/lib/auth-guard'

export default async function StudentsPage() {
  const session = await requireRole('ADMIN')
  // ... rest of page
}
```

---

## 7. Type augmentation (src/types/next-auth.d.ts)
```typescript
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }
}
```