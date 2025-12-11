'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quizService } from '@/services/quiz.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function CreateQuizPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. On crée le quiz
      const newQuiz = await quizService.create(formData)
      // 2. On redirige vers la page d'édition pour ajouter des questions
      router.push(`/quiz/${newQuiz.id}`)
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la création du quiz")
    } finally {
      setIsLoading(false)
    }
  }

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

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Suivant : Ajouter des questions
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}