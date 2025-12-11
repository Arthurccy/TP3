'use client'

import { useEffect, useState } from 'react'
import { authService } from '@/services/auth.service'
import { UserRole } from '@/types'
import { useRouter } from 'next/navigation'


import TeacherSessionView from './TeacherView' 
import StudentSessionView from './StudentView' 

export default function SessionRouterPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    authService.getCurrentUser()
      .then(setUser)
      .catch(() => router.push('/login'))
  }, [router])

  if (!user) return <div>Chargement...</div>

  // Aiguillage selon le rôle
  if (user.role === UserRole.TEACHER) {
    return <TeacherSessionView sessionId={params.id} />
  } else {
    return <StudentSessionView sessionId={params.id} />
  }
}