'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'

export default function TeacherSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fonction pour rafraîchir les données (Polling)
  const fetchSession = async () => {
    try {
      const data = await sessionService.getById(sessionId)
      setSession(data)
    } catch (e) {
      console.error(e)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
    // Polling : on rafraîchit toutes les 3 secondes en attendant les WebSockets
    const interval = setInterval(fetchSession, 3000)
    return () => clearInterval(interval)
  }, [sessionId, router])

  const handleStart = async () => {
    try {
      await sessionService.start(sessionId)
      fetchSession() // Mise à jour immédiate
    } catch (e) {
      alert("Erreur au démarrage de la session")
    }
  }

  const handleNext = async () => {
    try {
      await sessionService.nextQuestion(sessionId)
      fetchSession()
    } catch (e) {
      alert("Impossible de passer à la question suivante")
    }
  }

  const handleEnd = async () => {
    if(!confirm("Voulez-vous vraiment terminer la session ?")) return
    try {
      await sessionService.end(sessionId)
      router.push('/dashboard')
    } catch (e) {
      alert("Erreur lors de la fermeture de la session")
    }
  }

  if (loading || !session) return <div className="p-10 text-center">Chargement de la session...</div>

  // --- ÉTAT 1 : EN ATTENTE (LOBBY) ---
  if (session.status === 'WAITING') {
    return (
      <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8">
          <h1 className="text-4xl font-bold opacity-80">Rejoignez le quiz</h1>
          
          <div className="bg-white text-indigo-900 p-8 rounded-2xl shadow-2xl transform scale-110">
            <p className="text-sm uppercase tracking-widest font-bold mb-2">Code d'accès</p>
            <div className="text-6xl font-black tracking-widest font-mono">
              {session.access_code}
            </div>
          </div>

          <div className="mt-12">
            <div className="text-xl mb-4">
              Participants connectés : <span className="font-bold">{session.participant_count || 0}</span>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleStart} 
                className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 text-xl rounded-full font-bold shadow-lg transition-transform hover:scale-105"
              >
                Démarrer le Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- ÉTAT 2 : EN COURS (JEU) ---
  if (session.status === 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-700">Question {session.current_question_index + 1}</h2>
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-mono font-bold">
                Code: {session.access_code}
              </div>
            </div>

            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-900">La question est affichée aux élèves</h1>
              <div className="mt-4 inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                Question active
              </div>
              <p className="text-gray-500 mt-4">En attente des réponses...</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleNext} className="bg-blue-600 h-16 text-lg hover:bg-blue-700">
              Question Suivante →
            </Button>
            <Button onClick={handleEnd} className="bg-red-600 h-16 text-lg hover:bg-red-700 text-white">
              Arrêter la session
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Session terminée</h1>
            <Button onClick={() => router.push('/dashboard')} className="mt-4 w-auto">
                Retour au tableau de bord
            </Button>
        </div>
    </div>
  )
}