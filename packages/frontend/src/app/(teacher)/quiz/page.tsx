'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quizService } from '@/services/quiz.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
// --- IMPORTATIONS TANSTACK QUERY ---
import { useMutation, useQueryClient } from '@tanstack/react-query'
// -----------------------------------

// Type pour le payload du formulaire
interface QuizFormData {
    title: string
    description: string
}

export default function CreateQuizPage() {
  const router = useRouter()
  
  // États locaux pour le formulaire et les erreurs de validation
  const [formData, setFormData] = useState<QuizFormData>({
    title: '',
    description: ''
  })
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 1. CONFIGURATION TANSTACK QUERY
  const queryClient = useQueryClient()

  const createQuizMutation = useMutation({
    // La fonction qui effectue l'appel API
    mutationFn: (data: QuizFormData) => quizService.create(data),
    
    // Logique après succès
    onSuccess: (newQuiz) => {
      // 1. Invalider le cache de la liste des quiz (clé 'quizzes') pour rafraîchir le Dashboard
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      
      // 2. Rediriger vers la page d'édition pour ajouter des questions
      router.push(`/quiz/${newQuiz.id}`)
    },
    
    // Logique en cas d'échec
    onError: (error: any) => {
      console.error("Erreur lors de la création du quiz:", error)
      // Afficher l'erreur à l'utilisateur
      setSubmitError(error.response?.data?.detail || "Erreur lors de la création du quiz")
    },
  })

  // 2. GESTIONNAIRE DE SOUMISSION MODIFIÉ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null) // Réinitialiser l'erreur

    // Validation simple avant la mutation
    if (!formData.title.trim()) {
        setSubmitError("Le titre du quiz est requis.")
        return
    }

    // Déclencher la mutation avec les données du formulaire
    createQuizMutation.mutate(formData)
  }

  const isLoading = createQuizMutation.isPending; // Utilisation de l'état de la mutation

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nouveau Quiz</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Titre du quiz" 
            placeholder="Ex: Mathématiques - Chapitre 1"
            required
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnelle)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Affichage des erreurs (locales ou de la mutation) */}
          {(submitError || createQuizMutation.isError) && (
             <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded text-sm text-center">
                {submitError || (createQuizMutation.error as any).response?.data?.detail || "Erreur inconnue."}
             </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              // Utilisation de l'état de chargement de la mutation
              isLoading={isLoading} 
              disabled={isLoading}
            >
              Suivant : Ajouter des questions
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}