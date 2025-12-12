'use client'

// --- SUPPRIMER: import { useEffect, useState } from 'react' ---
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { quizService } from '@/services/quiz.service'
import { questionService } from '@/services/question.service'
import { Button } from '@/components/ui/Button'
import { Quiz } from '@/types'
// --- IMPORTATIONS TANSTACK QUERY ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// -----------------------------------

// Type de question (afin de garder une structure claire)
interface Question {
  id: number
  text: string
  question_type: string
  time_limit: number
  order: number
}

// Type Quiz enrichi pour useQuery (Doit correspondre à ce que renvoie quizService.getById)
type QuizWithQuestions = Quiz & { questions?: Question[] }


export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id 
  const router = useRouter()
  const queryClient = useQueryClient()

  // 1. REQUÊTE (QUERY): Récupérer les détails du quiz et les questions
  const { 
    data: quiz, 
    isLoading: isQuizLoading, 
    error: fetchError 
  } = useQuery<QuizWithQuestions>({
    // Clé de cache unique pour ce quiz
    queryKey: ['quiz', quizId], 
    // Fonction de fetching
    queryFn: () => quizService.getById(quizId),
    // S'assurer que l'ID existe
    enabled: !!quizId, 
  })
  
  // 2. MUTATION: Supprimer une question
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) => questionService.delete(questionId),
    
    // Après le succès, invalider la requête 'quiz' pour re-fetch la liste à jour
    onSuccess: () => {
      // Invalider le cache du quiz spécifique (clé ['quiz', quizId])
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] }) 
      // Optionnel : Afficher un message de succès (ou utiliser une librairie de toast)
    },
    
    onError: (err: any) => {
      console.error("Erreur suppression:", err)
      const message = err.response?.data?.detail || "Erreur lors de la suppression de la question."
      alert(message)
    }
  })

  // 3. Gestionnaire de suppression (utilise la mutation)
  const handleDeleteQuestion = (questionId: number) => {
    // Empêcher les soumissions multiples
    if (deleteQuestionMutation.isPending) return;

    if(!confirm("Êtes-vous sûr de vouloir supprimer cette question ?")) return
    
    // Déclencher la mutation
    deleteQuestionMutation.mutate(questionId)
  }

  // 4. Affichage des états de la requête (Query)
  if (isQuizLoading) return <div className="p-10 text-center">Chargement...</div>
  
  if (fetchError) {
    // Si une erreur de chargement se produit, afficher un message d'erreur
    console.error("Erreur de chargement du quiz:", fetchError)
    // Optional: Redirection si le quiz n'existe pas
    // router.push('/dashboard') 
    return <div className="p-10 text-center text-red-600">Erreur lors du chargement du quiz : {fetchError.message || "Quiz introuvable ou erreur de connexion."}</div>
  }
  
  // Si les données sont chargées et que quiz est défini
  if (!quiz) return null

  // Données prêtes pour le rendu
  const questions: Question[] = quiz.questions || []
  const isDeleting = deleteQuestionMutation.isPending // État de chargement pour la suppression
  
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mb-2 inline-block">← Retour au tableau de bord</Link>
            <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-600 mt-1">{quiz.description}</p>
        </div>
        <div className="flex gap-2">
            <Link href={`/session/create?quizId=${quiz.id}`}>
                <Button className="bg-green-600 hover:bg-green-700">
                    Lancer une session
                </Button>
            </Link>
        </div>
      </div>

      {/* Liste des questions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
            <Link href={`/quiz/${quizId}/question/new`}>
                <Button className="w-auto text-sm">
                    + Ajouter une question
                </Button>
            </Link>
        </div>

        <div className="divide-y divide-gray-200">
            {questions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    Ce quiz n'a pas encore de questions.
                </div>
            ) : (
                questions.map((q, index) => (
                    <div key={q.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                                {index + 1}
                            </span>
                            <div>
                                <p className="font-medium text-gray-900">{q.text}</p>
                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                                        {q.question_type === 'MULTIPLE_CHOICE' ? 'QCM' : q.question_type}
                                    </span>
                                    <span>⏱ {q.time_limit}s</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleDeleteQuestion(q.id)}
                                // Désactiver le bouton pendant la suppression
                                disabled={isDeleting} 
                                className={`text-red-600 hover:bg-red-50 p-2 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isDeleting ? '...' : '🗑'}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  )
}