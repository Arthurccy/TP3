'use client'

import { useEffect, useState } from 'react' // J'ai retiré 'use'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { quizService } from '@/services/quiz.service'
import { questionService } from '@/services/question.service'
import { Button } from '@/components/ui/Button'
import { Quiz } from '@/types'

// Type temporaire pour une question
interface Question {
  id: number
  text: string
  question_type: string
  time_limit: number
  order: number
}

// CORRECTION ICI : params n'est pas une Promise dans ta version
export default function EditQuizPage({ params }: { params: { id: string } }) {
  // On accède directement à l'ID sans utiliser use()
  // Note: il faut s'assurer que l'ID est bien converti en string si besoin, mais params.id est déjà string
  const id = params.id 
  
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Le reste du code est identique...
  useEffect(() => {
    const fetchData = async () => {
      try {
        const quizData = await quizService.getById(id)
        setQuiz(quizData)

        if ((quizData as any).questions) {
            setQuestions((quizData as any).questions)
        }
      } catch (err) {
        console.error(err)
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    
    // On vérifie que l'ID existe avant de lancer la requête
    if (id) {
        fetchData()
    }
  }, [id, router])

  // ... (Garde tout le reste du return inchangé)
  const handleDeleteQuestion = async (questionId: number) => {
    if(!confirm("Supprimer cette question ?")) return
    try {
      await questionService.delete(questionId)
      setQuestions(questions.filter(q => q.id !== questionId))
    } catch (err) {
      alert("Erreur suppression")
    }
  }

  if (isLoading) return <div className="p-10 text-center">Chargement...</div>
  if (!quiz) return null

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
            <Link href={`/quiz/${id}/question/new`}>
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
                                className="text-red-600 hover:bg-red-50 p-2 rounded"
                            >
                                🗑
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