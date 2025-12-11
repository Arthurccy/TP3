'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'
import { TimerBar } from '@/components/session/TimerBar'
import { useSocket } from '@/hooks/useSocket'

// Couleurs fixes pour les options QCM
const OPTION_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
  "bg-purple-500 hover:bg-purple-600",
  "bg-pink-500 hover:bg-pink-600"
]

export default function StudentSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const socket = useSocket(sessionId)

  const [session, setSession] = useState<any>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null)
  
  // État pour la réponse textuelle
  const [textAnswer, setTextAnswer] = useState('')

  const fetchSession = async () => {
    try {
      const data = await sessionService.getById(sessionId)
      setSession(data)

      const currentId = data.current_question?.id || null
      if (currentId !== lastQuestionId) {
          setHasAnswered(false)
          setLastQuestionId(currentId)
          setTextAnswer('') // Reset du champ texte
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchSession()
    if (socket) {
        socket.on('session_updated', () => fetchSession())
    }
    const interval = setInterval(fetchSession, 10000)
    return () => {
        clearInterval(interval)
        if (socket) socket.off('session_updated')
    }
  }, [sessionId, lastQuestionId, socket])

  // --- Envoi de la réponse (Texte ou ID) ---
  const handleAnswer = async (responseContent: number | string) => {
    if (hasAnswered) return
    setHasAnswered(true)

    try {
        const payload: any = { response_time: 1500 }
        
        // Si c'est un nombre, c'est un ID d'option (QCM ou V/F)
        if (typeof responseContent === 'number') {
            payload.selected_option = responseContent
        } else {
            // Sinon c'est du texte (Short Answer)
            payload.text_answer = responseContent
        }

        await sessionService.submitAnswer(sessionId, payload)
        
        if (socket) socket.emit('trigger_update', sessionId)
        
    } catch (error) {
        console.error("Erreur réponse", error)
        setHasAnswered(false)
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
    const qType = session.current_question.question_type || 'MULTIPLE_CHOICE'
    const options = session.current_question.options || []

    // Ecran "Déjà répondu"
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

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col p-4">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-700">Question en cours</span>
            <span className="text-sm font-mono bg-gray-100 px-2 rounded">
                {session.current_question.time_limit}s
             </span>
        </div>

        <div className="mb-6 px-1">
            <TimerBar 
                key={session.current_question.id}
                duration={session.current_question.time_limit} 
            />
        </div>

        <div className="mb-8 text-center">
            <h2 className="text-xl font-medium text-gray-800">{session.current_question.text}</h2>
        </div>
        
        {/* --- ZONE D'INTERACTION SELON LE TYPE --- */}

        {/* 1. QCM */}
        {qType === 'MULTIPLE_CHOICE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {options.map((option: any, index: number) => (
                <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={`${OPTION_COLORS[index % OPTION_COLORS.length]} h-32 text-white text-xl font-bold rounded-xl shadow-md transform transition active:scale-95 flex items-center justify-center p-4 break-words`}
                >
                    {option.text}
                </button>
            ))}
            </div>
        )}

        {/* 2. VRAI / FAUX */}
        {qType === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-6 flex-1 max-h-80">
            {options.map((option: any) => (
                <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={`
                        h-full text-white text-3xl font-bold rounded-xl shadow-md transform transition active:scale-95
                        ${option.text === 'Vrai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'}
                    `}
                >
                    {option.text}
                </button>
            ))}
            </div>
        )}

        {/* 3. RÉPONSE COURTE */}
        {qType === 'SHORT_ANSWER' && (
            <div className="flex-1 flex flex-col items-center w-full max-w-lg mx-auto">
                <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Tapez votre réponse ici..."
                    className="w-full p-6 text-2xl text-center border-2 border-gray-300 rounded-xl mb-6 focus:border-blue-500 focus:outline-none shadow-sm"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && textAnswer.trim()) {
                            handleAnswer(textAnswer);
                        }
                    }}
                />
                <Button 
                    onClick={() => handleAnswer(textAnswer)}
                    disabled={!textAnswer.trim()}
                    className="h-16 text-xl w-full"
                >
                    Valider ma réponse
                </Button>
            </div>
        )}

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