'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'
// Import du Hook Socket qu'on vient de créer
import { useSocket } from '@/hooks/useSocket'

// Couleurs fixes pour les options (style Kahoot)
const OPTION_COLORS = [
  "bg-red-500 hover:bg-red-600",     // Option 1
  "bg-blue-500 hover:bg-blue-600",    // Option 2
  "bg-yellow-500 hover:bg-yellow-600",// Option 3
  "bg-green-500 hover:bg-green-600"   // Option 4
]

export default function StudentSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  
  // 1. Connexion WebSocket via notre Hook personnalisé
  const socket = useSocket(sessionId)

  const [session, setSession] = useState<any>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null)

  // Fonction de récupération des données (appelée sur signal du socket)
  const fetchSession = async () => {
    try {
      const data = await sessionService.getById(sessionId)
      setSession(data)

      // Détection de changement de question pour réactiver les boutons
      const currentId = data.current_question?.id || null
      
      if (currentId !== lastQuestionId) {
          setHasAnswered(false)
          setLastQuestionId(currentId)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 2. Gestion des Événements WebSocket
  useEffect(() => {
    // Chargement initial
    fetchSession()

    if (socket) {
        // Écoute du signal "Mise à jour" venant du serveur
        socket.on('session_updated', () => {
            console.log("⚡ Socket: Mise à jour reçue !")
            fetchSession()
        })
    }
    
    // Fallback : On garde un polling très lent (10s) au cas où le socket coupe
    const interval = setInterval(fetchSession, 10000)
    
    return () => {
        clearInterval(interval)
        if (socket) socket.off('session_updated')
    }
  }, [sessionId, lastQuestionId, socket])

  const handleAnswer = async (optionId: number) => {
    if (hasAnswered) return
    setHasAnswered(true)

    try {
        // Envoi de la réponse à l'API Django
        await sessionService.submitAnswer(sessionId, {
            selected_option: optionId,
            response_time: 1500 
        })

        // 3. Signalement immédiat via Socket
        // On dit au serveur : "J'ai changé l'état du jeu, préviens tout le monde"
        if (socket) {
            socket.emit('trigger_update', sessionId)
        }

    } catch (error) {
        console.error("Erreur réponse", error)
        setHasAnswered(false)
        alert("Erreur lors de l'envoi de la réponse")
    }
  }

  if (!session) return <div className="p-8 text-center">Connexion à la session...</div>

  // --- ÉTAT 1 : LOBBY (EN ATTENTE) ---
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

  // --- ÉTAT 2 : JEU (EN COURS) ---
  if (session.status === 'IN_PROGRESS' && session.current_question) {
    const options = session.current_question.options || []

    // Écran d'attente après réponse
    if (hasAnswered) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
                    <div className="text-5xl mb-4">👍</div>
                    <h2 className="text-2xl font-bold text-gray-800">Réponse envoyée !</h2>
                    <p className="text-gray-500 mt-2">On attend les autres...</p>
                </div>
            </div>
        )
    }

    // Écran de jeu (Questions)
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col p-4">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-700">Question en cours</span>
        </div>

        <div className="mb-8 text-center">
            <h2 className="text-xl font-medium text-gray-800">{session.current_question.text}</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
           {options.map((option: any, index: number) => (
               <button
                 key={option.id}
                 onClick={() => handleAnswer(option.id)}
                 className={`${OPTION_COLORS[index % 4]} h-32 text-white text-xl font-bold rounded-xl shadow-md transform transition active:scale-95 flex items-center justify-center p-4`}
               >
                 {option.text}
               </button>
           ))}
        </div>
      </div>
    )
  }

  // --- ÉTAT 3 : FIN ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
            <div className="text-6xl mb-6">🏁</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz terminé !</h1>
            <p className="text-gray-600 mb-8">
                Merci d'avoir participé à cette session.
            </p>
            
            <Button onClick={() => router.push('/dashboard')}>
                Retour au tableau de bord
            </Button>
        </div>
    </div>
  )
}