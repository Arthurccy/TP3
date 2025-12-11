'use client'

import { useEffect, useState } from 'react'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'

// Couleurs fixes pour les options (style Kahoot)
const OPTION_COLORS = [
  "bg-red-500 hover:bg-red-600",    // Option 1
  "bg-blue-500 hover:bg-blue-600",   // Option 2
  "bg-yellow-500 hover:bg-yellow-600", // Option 3
  "bg-green-500 hover:bg-green-600"  // Option 4
]

export default function StudentSessionView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<any>(null)
  const [hasAnswered, setHasAnswered] = useState(false) // Pour bloquer après réponse
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await sessionService.getById(sessionId)
        setSession(data)

        // Reset de l'état "a répondu" si la question change
        // CORRECTION ICI : on ajoute "|| null" pour gérer le cas undefined
        const currentId = data.current_question?.id || null
        
        if (currentId !== lastQuestionId) {
            setHasAnswered(false)
            setLastQuestionId(currentId)
        }
      } catch (e) {
        console.error(e)
      }
    }
    
    fetchSession()
    const interval = setInterval(fetchSession, 1000)
    return () => clearInterval(interval)
  }, [sessionId, lastQuestionId])

  const handleAnswer = async (optionId: number) => {
    if (hasAnswered) return
    setHasAnswered(true) // On bloque immédiatement le bouton

    try {
        await sessionService.submitAnswer(sessionId, {
            selected_option: optionId,
            response_time: 1500 // On simule un temps pour l'instant
        })
    } catch (error) {
        console.error("Erreur réponse", error)
        setHasAnswered(false) // On débloque si erreur
        alert("Erreur lors de l'envoi de la réponse")
    }
  }

  if (!session) return <div className="p-8 text-center">Connexion à la session...</div>

  // --- ÉTAT 1 : LOBBY ---
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

  // --- ÉTAT 2 : JEU ---
  if (session.status === 'IN_PROGRESS' && session.current_question) {
    const options = session.current_question.options || []

    // Si l'étudiant a déjà répondu à CETTE question
    if (hasAnswered) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <div className="text-5xl mb-4">👍</div>
                    <h2 className="text-2xl font-bold text-gray-800">Réponse envoyée !</h2>
                    <p className="text-gray-500 mt-2">On attend les autres...</p>
                </div>
            </div>
        )
    }

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col p-4">
        {/* En-tête avec info question */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-700">Question en cours</span>
            {/* On affichera le timer ici plus tard */}
        </div>

        {/* Texte de la question pour aider l'élève */}
        <div className="mb-8 text-center">
            <h2 className="text-xl font-medium text-gray-800">{session.current_question.text}</h2>
        </div>
        
        {/* Grille des boutons */}
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz terminé !</h1>
            <p className="text-gray-600">Merci d'avoir participé.</p>
        </div>
    </div>
  )
}