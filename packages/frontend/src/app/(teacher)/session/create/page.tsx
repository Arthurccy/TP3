'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sessionService } from '@/services/session.service'

function CreateSessionLogic() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quizId = searchParams.get('quizId')

  useEffect(() => {
    if (!quizId) {
      router.push('/dashboard')
      return
    }

    const createSession = async () => {
      try {
        // On crée la session via l'API
        const session = await sessionService.create(parseInt(quizId))
        // On redirige immédiatement vers la salle d'attente (Vue Host)
        router.push(`/session/${session.id}`)
      } catch (error) {
        console.error("Erreur création session:", error)
        alert("Impossible de créer la session. Vérifiez qu'une session n'est pas déjà active.")
        router.push('/dashboard')
      }
    }

    createSession()
  }, [quizId, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl animate-pulse">Création de la session en cours...</div>
    </div>
  )
}

// Suspense est obligatoire quand on utilise useSearchParams dans Next.js App Router
export default function CreateSessionPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <CreateSessionLogic />
    </Suspense>
  )
}