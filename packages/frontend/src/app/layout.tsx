import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TP3 Monorepo',
  description: 'Fullstack application with Next.js, Django, and Socket.io',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
