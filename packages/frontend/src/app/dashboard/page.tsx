'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth.service'
import { quizService } from '@/services/quiz.service'
import { sessionService } from '@/services/session.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, UserRole, Quiz } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authService.getCurrentUser()
      .then(setUser)
      .catch(() => router.push('/login'))
      .finally(() => setIsLoading(false))
  }, [router])

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre de navigation simple */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">QuizPlatform</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user.first_name} ({user.role === UserRole.TEACHER ? 'Prof' : 'Élève'})
              </span>
              <button 
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu principal selon le rôle */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {user.role === UserRole.TEACHER ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard />
        )}
      </main>
    </div>
  )
}

// --- Composant Vue Enseignant ---
function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])

  useEffect(() => {
    quizService.getAll().then(setQuizzes).catch(console.error)
  }, [])

  const handleDelete = async (id: number) => {
    if(!confirm("Supprimer ce quiz ?")) return;
    try {
      await quizService.delete(id)
      setQuizzes(quizzes.filter(q => q.id !== id))
    } catch (err) {
      alert("Erreur lors de la suppression")
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mes Quiz</h2>
        <Link href="/quiz/create">
          <Button className="w-auto">
            + Créer un nouveau quiz
          </Button>
        </Link>
      </div>

      {!Array.isArray(quizzes) || quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Vous n'avez pas encore créé de quiz.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                  {quiz.description || "Aucune description"}
                </p>
                <div className="text-sm text-gray-400 mb-4">
                  {quiz.question_count} questions • Créé le {new Date(quiz.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <Link href={`/quiz/${quiz.id}`} className="flex-1">
                   <Button variant="outline" className="text-sm py-1">Modifier</Button>
                </Link>
                {/* On ajoutera le bouton Lancer Session plus tard */}
                <button 
                  onClick={() => handleDelete(quiz.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-medium"
                >
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Composant Vue Élève ---
function StudentDashboard() {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessCode) return
    
    setIsLoading(true)
    setError('')

    try {
      const data = await sessionService.join(accessCode)
      // Redirection vers la salle d'attente (à créer plus tard)
      router.push(`/session/${data.session_id}`)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.access_code?.[0] || err.response?.data?.detail || "Code invalide ou session fermée")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Rejoindre une session</h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez le code fourni par votre enseignant
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <Input 
            label="Code d'accès"
            placeholder="Ex: AB12CD"
            value={accessCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccessCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center text-2xl tracking-widest uppercase font-mono"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm text-center">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={isLoading} disabled={accessCode.length < 6}>
            Rejoindre la partie
          </Button>
        </form>
      </div>
    </div>
  )
}