'use client'

import React from 'react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-primary">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-white mb-8">TP3 Monorepo</h1>
        <p className="text-gray-400 mb-4">
          Next.js + TypeScript + Tailwind CSS + TanStack Query + Zustand
        </p>
        <p className="text-gray-400">Django REST + PostgreSQL + Socket.io</p>
      </div>
    </main>
  )
}
