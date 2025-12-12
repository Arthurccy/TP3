'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'
import { TimerBar } from '@/components/session/TimerBar'
import { useSocket } from '@/hooks/useSocket'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
  const queryClient = useQueryClient()

  // --- ÉTATS LOCAUX CONSERVÉS ---
  const [hasAnswered, setHasAnswered] = useState(false)
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState('')

  // 1. REQUÊTE (QUERY): Récupérer l'état de la session
  const { 
    data: session, 
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery<any>({
    queryKey: ['session', sessionId], 
    queryFn: () => sessionService.getById(sessionId),
    enabled: !!sessionId,
    refetchInterval: 10000, 
  })

  // 2. MUTATION: Soumettre une réponse
  const submitAnswerMutation = useMutation({
    mutationFn: (payload: any) => sessionService.submitAnswer(sessionId, payload),
    onMutate: () => { setHasAnswered(true) },
    onSuccess: () => { if (socket) socket.emit('trigger_update', sessionId) },
    onError: (error) => {
      console.error("Erreur réponse", error)
      setHasAnswered(false)
      alert("Erreur lors de l'envoi de la réponse.")
    }
  })

  // 3. LOGIQUE DE MISE À JOUR (Gestion du changement de question et des Sockets)
  useEffect(() => {
    const currentId = session?.current_question?.id || null
    if (currentId !== lastQuestionId) {
      setHasAnswered(false)
      setLastQuestionId(currentId)
      setTextAnswer('')
    }
    
    if (socket) {
      const handleSessionUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      }
      socket.on('session_updated', handleSessionUpdate)
      return () => { socket.off('session_updated', handleSessionUpdate) }
    }
  }, [session, lastQuestionId, socket, sessionId, queryClient]) 

  // --- Envoi de la réponse (Texte ou ID) ---
  const handleAnswer = (responseContent: number | string) => {
    if (hasAnswered || submitAnswerMutation.isPending) return
    
    const payload: any = { response_time: 1500 }
    
    if (typeof responseContent === 'number') {
      payload.selected_option = responseContent
    } else {
      payload.text_answer = responseContent
    }

    submitAnswerMutation.mutate(payload)
  }

  // --- GESTION DES ÉTATS DE CHARGEMENT ET D'ERREUR ---
  if (isSessionLoading) return <div className="p-8 text-center">Connexion à la session...</div>
  if (sessionError) {
    return <div className="p-8 text-center text-red-600">Erreur de connexion à la session.</div>
  }
  if (!session) return null


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
    
    // VARIABLES DÉDUITES
    const rawQType = session.current_question.question_type;
    const options = session.current_question.options || [];

    // Logique de déduction sécurisée du type de question pour le rendu.
    // Si le type n'est pas SHORT_ANSWER mais qu'il y a une seule option, 
    // il s'agit probablement d'une erreur de sérialisation et nous traitons cela
    // comme un SHORT_ANSWER pour afficher le champ texte.
    let qType = rawQType;
    if (options.length === 1 && qType !== 'TRUE_FALSE') {
        qType = 'SHORT_ANSWER';
    } else if (!qType) {
        qType = 'MULTIPLE_CHOICE';
    }


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
    
    const isSubmitting = submitAnswerMutation.isPending;

    // --- Fonction de rendu de la zone d'interaction ---
    const renderInteractionZone = () => {
        
        // 1. RENDU RÉPONSE COURTE (Priorité si déduit ou type explicite)
        if (qType === 'SHORT_ANSWER') {
            return (
                <div className="flex-1 flex flex-col items-center w-full max-w-lg mx-auto">
                    {/* Affichez la réponse attendue uniquement dans la console pour le débogage */}
                    {/* {console.log("Réponse attendue:", options[0]?.text)} */}
                    <input
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Tapez votre réponse ici..."
                        disabled={isSubmitting}
                        className="w-full p-6 text-2xl text-center border-2 border-gray-300 rounded-xl mb-6 focus:border-blue-500 focus:outline-none shadow-sm"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && textAnswer.trim() && !isSubmitting) {
                                handleAnswer(textAnswer);
                            }
                        }}
                    />
                    <Button 
                        onClick={() => handleAnswer(textAnswer)}
                        disabled={!textAnswer.trim() || isSubmitting}
                        isLoading={isSubmitting}
                        className="h-16 text-xl w-full"
                    >
                        Valider ma réponse
                    </Button>
                </div>
            );
        }

        // 2. RENDU VRAI / FAUX
        if (qType === 'TRUE_FALSE') {
             return (
                <div className="grid grid-cols-2 gap-6 flex-1 max-h-80">
                {options.map((option: any) => (
                    <button
                        key={option.id}
                        onClick={() => handleAnswer(option.id)}
                        disabled={isSubmitting}
                        className={`
                            h-full text-white text-3xl font-bold rounded-xl shadow-md transform transition active:scale-95
                            ${option.text === 'Vrai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'}
                            ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        {option.text}
                    </button>
                ))}
                </div>
            );
        }

        // 3. RENDU QCM (MULTIPLE_CHOICE ou Fallback)
        // Ceci gère les QCM standards.
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {options.map((option: any, index: number) => (
                <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    disabled={isSubmitting}
                    className={`${OPTION_COLORS[index % OPTION_COLORS.length]} h-32 text-white text-xl font-bold rounded-xl shadow-md transform transition active:scale-95 flex items-center justify-center p-4 break-words ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {option.text}
                </button>
            ))}
            </div>
        );
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
        
        {/* --- ZONE D'INTERACTION EXCLUSIVE --- */}
        {renderInteractionZone()}

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