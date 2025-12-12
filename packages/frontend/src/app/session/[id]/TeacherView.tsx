'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'
import { TimerBar } from '@/components/session/TimerBar'
import { useSocket } from '@/hooks/useSocket'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// --- DÉFINITION DE TYPE CORRIGÉE POUR TANSTACK QUERY ---
// Ce type doit englober toutes les données utilisées dans le composant
interface SessionData {
    id: number;
    access_code: string;
    status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
    // Assurez-vous que le service retourne ces champs, sinon l'erreur persiste.
    participants: Participant[]; 
    quiz?: { // Rendu optionnel au cas où le service ne le fournit pas toujours
        question_count: number;
    };
    current_question_index: number;
    current_question?: {
        id?: number;
        time_limit?: number;
    };
}

interface Participant {
    id: number;
    username: string;
    score: number;
    answer_count: number;
    has_answered: boolean;
}
// ----------------------------------------------------

export default function TeacherSessionView({ sessionId }: { sessionId: string }) {
    const router = useRouter()
    const socket = useSocket(sessionId)
    const queryClient = useQueryClient()

    // 1. REQUÊTE (QUERY): Récupérer l'état de la session
    const { 
        data: session, 
        isLoading, 
        error: sessionError,
    } = useQuery<SessionData>({ // Utilisation du type SessionData corrigé
        queryKey: ['session', sessionId], 
        queryFn: async () => {
            const data = await sessionService.getById(sessionId);
            return {
                ...data,
                participants: data.participants || [],
            } as SessionData;
        },
        enabled: !!sessionId,
        refetchInterval: 5000, 
    })

    // --- LOGIQUE SOCKET ---
    useEffect(() => {
        if (socket) {
            const handleSessionUpdate = () => {
                queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
            }
            
            socket.on('session_updated', handleSessionUpdate)
            
            return () => {
                socket.off('session_updated', handleSessionUpdate)
            }
        }
    }, [sessionId, socket, queryClient]) 
    
    // --- MUTATIONS D'ACTIONS (START, NEXT, END) ---
    
    const emitUpdate = () => {
        if (socket) socket.emit('trigger_update', sessionId)
    }
    
    // Utilitaire pour invalider et émettre après succès
    const handleSuccess = () => {
        emitUpdate(); 
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    }

    const startMutation = useMutation({
        mutationFn: () => sessionService.start(sessionId),
        onSuccess: handleSuccess,
        onError: () => alert("Erreur démarrage"),
    })

    const nextMutation = useMutation({
        mutationFn: () => sessionService.nextQuestion(sessionId),
        onSuccess: handleSuccess,
        onError: () => alert("Impossible de passer à la suite"),
    })

    const endMutation = useMutation({
        mutationFn: () => sessionService.end(sessionId),
        onSuccess: () => { // Redirection spécifique pour la fin
            emitUpdate(); 
            router.push('/dashboard')
        },
        onError: () => alert("Erreur fin"),
    })

    // --- Gestionnaires d'événements utilisant les mutations ---

    const handleStart = () => startMutation.mutate()
    const handleNext = () => nextMutation.mutate()
    const handleEnd = () => {
        if(!confirm("Terminer la session ?")) return
        endMutation.mutate()
    }

    // Calcul de l'état global de chargement des actions
    const isActionLoading = startMutation.isPending || nextMutation.isPending || endMutation.isPending;

    // --- GESTION DES ÉTATS DE LA REQUÊTE ---
    if (isLoading) return <div className="p-10 text-center">Chargement...</div>
    if (sessionError) return <div className="p-10 text-center text-red-600">Erreur de chargement de la session.</div>
    if (!session) return <div className="p-10 text-center">Session non trouvée.</div>

    // Données pour le rendu
    const participants = session.participants || []
    const answersCount = participants.filter(p => p.has_answered).length
    const totalPlayers = participants.length

    // --- ÉTAT 1 : LOBBY (WAITING) ---
    if (session.status === 'WAITING') {
        return (
            <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-8 max-w-2xl w-full">
                    <h1 className="text-4xl font-bold opacity-80">Rejoignez le quiz</h1>
                    
                    <div className="bg-white text-indigo-900 p-8 rounded-2xl shadow-2xl transform scale-110 mb-8">
                        <p className="text-sm uppercase tracking-widest font-bold mb-2">Code d'accès</p>
                        <div className="text-6xl font-black tracking-widest font-mono select-all">
                            {session.access_code}
                        </div>
                    </div>

                    <div className="bg-indigo-800/50 rounded-xl p-6 backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-4">
                            Participants ({participants.length})
                        </h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {participants.map((p) => (
                                <span key={p.id} className="bg-white/20 px-3 py-1 rounded-full text-sm animate-fade-in">
                                    {p.username}
                                </span>
                            ))}
                            {(participants.length === 0) && (
                                <p className="text-indigo-300 italic">En attente de joueurs...</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                        <Button 
                            onClick={handleStart} 
                            disabled={participants.length === 0 || isActionLoading}
                            isLoading={startMutation.isPending}
                            className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 text-xl rounded-full font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                            Démarrer le Quiz
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // --- ÉTAT 2 : JEU (IN_PROGRESS) ---
    if (session.status === 'IN_PROGRESS') {
        const currentQIndex = (session.current_question_index ?? 0) + 1
        const duration = session.current_question?.time_limit || 30; 

        return (
            <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-700">Question {currentQIndex}</h2>
                            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-mono font-bold">
                                Code: {session.access_code}
                            </div>
                        </div>

                        <div className="text-center py-8">
                            <div className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">Question en cours</div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Question affichée aux élèves
                            </h1>

                            <div className="max-w-md mx-auto mb-8">
                                <TimerBar 
                                    key={session.current_question?.id || session.current_question_index}
                                    duration={duration} 
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">Temps restant estimé</p>
                            </div>
                            
                            <div className="mt-8 max-w-md mx-auto">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Réponses reçues</span>
                                    <span className="font-bold">{answersCount} / {totalPlayers}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                    <div 
                                        className="bg-blue-600 h-4 transition-all duration-300 ease-out"
                                        style={{ width: `${(answersCount / totalPlayers) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            onClick={handleNext} 
                            disabled={isActionLoading}
                            isLoading={nextMutation.isPending}
                            className="bg-blue-600 h-16 text-lg hover:bg-blue-700"
                        >
                            Question Suivante →
                        </Button>
                        <Button 
                            onClick={handleEnd} 
                            disabled={isActionLoading}
                            isLoading={endMutation.isPending}
                            className="bg-red-600 h-16 text-lg hover:bg-red-700 text-white"
                        >
                            Finir la session
                        </Button>
                    </div>
                </div>

                <div className="w-full md:w-80 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-bold text-gray-800">Classement en direct</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {participants.map((p, index: number) => (
                            <div key={p.id} className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <div className={`
                                    w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 text-sm
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                      index === 1 ? 'bg-gray-200 text-gray-700' : 
                                      index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500 border'}
                                `}>
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {p.username}
                                        {p.has_answered && <span className="ml-2 text-green-500 text-xs font-bold">✓</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{p.answer_count} réponses</p>
                                </div>
                                <div className="font-bold text-blue-600">
                                    {p.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // --- ÉTAT 3 : FINISHED ou autres ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-xl">Session terminée.</div>
        </div>
    )
}