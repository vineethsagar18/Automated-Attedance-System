import type { Metadata } from 'next'
import { Doto, Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const doto = Doto({
  subsets: ['latin'],
  variable: '--font-display',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'AttendEase – School Attendance System',
  description: 'QR-based student attendance management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${doto.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}>
        <Providers>
          <div className="min-h-screen w-full relative">
            <div className="absolute inset-0 z-0 app-aurora-bg" />
            <div className="relative z-10">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
