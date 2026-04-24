import { auth } from './auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

export async function requireRole(role: 'ADMIN' | 'FACULTY') {
  const session = await auth()
  if (!session) redirect('/login')
  if (role === 'ADMIN' && session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}
