'use client'

import { useEffect, useState } from 'react'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'

export default function StudentSessionView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<any>(null)

  // Polling simple pour l'étudiant aussi
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await sessionService.getById(sessionId)
        setSession(data)
      } catch (e) {
        console.error(e)
      }
    }
    
    fetchSession()
    const interval = setInterval(fetchSession, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (!session) return <div className="p-8 text-center">Connexion à la session...</div>

  if (session.status === 'WAITING') {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Vous êtes connecté !</h1>
          <p className="text-blue-600">En attente de l'enseignant...</p>
          <div className="mt-8 text-4xl">⏳</div>
        </div>
      </div>
    )
  }

  if (session.status === 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-8">Le Quiz a commencé !</h1>
        <p>Regardez l'écran de l'enseignant pour voir la question.</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
           {/* Boutons factices pour tester */}
           <Button className="h-24 bg-red-500 hover:bg-red-600 text-2xl">Rouge</Button>
           <Button className="h-24 bg-blue-500 hover:bg-blue-600 text-2xl">Bleu</Button>
           <Button className="h-24 bg-yellow-500 hover:bg-yellow-600 text-2xl">Jaune</Button>
           <Button className="h-24 bg-green-500 hover:bg-green-600 text-2xl">Vert</Button>
        </div>
      </div>
    )
  }

  return <div>Quiz terminé !</div>
}