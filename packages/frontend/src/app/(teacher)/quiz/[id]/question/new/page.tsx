'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { questionService } from '@/services/question.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface OptionState {
  text: string
  isCorrect: boolean
}

export default function AddQuestionPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id)
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // État du Type de question
  const [questionType, setQuestionType] = useState<'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'>('MULTIPLE_CHOICE')

  // État de la question
  const [questionText, setQuestionText] = useState('')
  const [timeLimit, setTimeLimit] = useState(30)
  
  // État des options
  const [options, setOptions] = useState<OptionState[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false }
  ])

  // --- Reset des options quand le type change ---
  useEffect(() => {
    if (questionType === 'TRUE_FALSE') {
        setOptions([
            { text: 'Vrai', isCorrect: true },
            { text: 'Faux', isCorrect: false }
        ])
    } else if (questionType === 'SHORT_ANSWER') {
        // Pour réponse courte, on stocke la réponse attendue dans la première option
        setOptions([
            { text: '', isCorrect: true }
        ])
    } else {
        // Retour au QCM standard (2 vides)
        setOptions([
            { text: '', isCorrect: true },
            { text: '', isCorrect: false }
        ])
    }
  }, [questionType])

  // --- Gestionnaires d'événements ---

  const handleAddOption = () => {
    setOptions([...options, { text: '', isCorrect: false }])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    const newOptions = options.filter((_, i) => i !== index)
    if (options[index].isCorrect) {
        newOptions[0].isCorrect = true
    }
    setOptions(newOptions)
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index].text = value
    setOptions(newOptions)
  }

  const handleSetCorrect = (index: number) => {
    // Pour QCM et Vrai/Faux : une seule réponse correcte (Radio)
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }))
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation basique
    if (!questionText.trim()) {
        setError("La question ne peut pas être vide")
        setIsLoading(false)
        return
    }
    
    if (questionType !== 'SHORT_ANSWER' && options.some(opt => !opt.text.trim())) {
        setError("Toutes les options doivent avoir du texte")
        setIsLoading(false)
        return
    }
    
    if (questionType === 'SHORT_ANSWER' && !options[0].text.trim()) {
        setError("La réponse attendue ne peut pas être vide")
        setIsLoading(false)
        return
    }

    try {
      const payload = {
        text: questionText,
        time_limit: timeLimit,
        question_type: questionType,
        order: 1, // Géré par le backend maintenant
        options: options.map((opt, index) => ({
            text: opt.text,
            is_correct: opt.isCorrect,
            order: index + 1
        }))
      }

      await questionService.create(quizId, payload)
      router.push(`/quiz/${quizId}`)
      
    } catch (err: any) {
      console.error(err)
      if (err.response?.data?.options) {
          setError("Erreur options : " + err.response.data.options)
      } else {
          setError(err.response?.data?.detail || "Erreur lors de la création")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajouter une question</h1>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow">
        
        {/* --- SÉLECTEUR DE TYPE --- */}
        <div className="border-b pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Type de question</label>
            <div className="flex flex-wrap gap-2 sm:gap-4">
                <button
                    type="button"
                    onClick={() => setQuestionType('MULTIPLE_CHOICE')}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                        questionType === 'MULTIPLE_CHOICE' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Choix Multiple
                </button>
                <button
                    type="button"
                    onClick={() => setQuestionType('TRUE_FALSE')}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                        questionType === 'TRUE_FALSE' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Vrai / Faux
                </button>
                <button
                    type="button"
                    onClick={() => setQuestionType('SHORT_ANSWER')}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                        questionType === 'SHORT_ANSWER' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Réponse Courte
                </button>
            </div>
        </div>

        {/* --- ÉNONCÉ --- */}
        <div className="space-y-4 border-b pb-6">
            <h2 className="text-lg font-medium text-gray-900">Énoncé</h2>
            <Input 
                label="Question" 
                value={questionText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestionText(e.target.value)}
                placeholder="Ex: Quelle est la capitale de la France ?"
                required
            />
            
            <div className="w-1/3">
                <Input 
                    label="Temps limite (secondes)" 
                    type="number"
                    value={timeLimit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeLimit(parseInt(e.target.value))}
                    min={5}
                    max={300}
                />
            </div>
        </div>

        {/* --- ZONE DE RÉPONSES (DYNAMIQUE) --- */}
        <div className="space-y-4">
            
            {/* Cas 1 : Réponse Courte */}
            {questionType === 'SHORT_ANSWER' && (
                <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-2">Réponse attendue</h2>
                    <p className="text-sm text-gray-500 mb-2">Entrez la réponse exacte. La casse (majuscule/minuscule) sera ignorée par le serveur.</p>
                    <Input 
                        label="Bonne réponse"
                        value={options[0]?.text || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOptionChange(0, e.target.value)}
                        placeholder="Ex: Paris"
                    />
                </div>
            )}

            {/* Cas 2 : Vrai / Faux */}
            {questionType === 'TRUE_FALSE' && (
                <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Quelle est la bonne réponse ?</h2>
                    <div className="flex gap-4">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSetCorrect(index)}
                                className={`flex-1 p-6 rounded-lg border-2 text-xl font-bold transition-all ${
                                    option.isCorrect 
                                        ? 'border-green-500 bg-green-50 text-green-700 shadow-md' 
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                {option.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Cas 3 : QCM (Classique) */}
            {questionType === 'MULTIPLE_CHOICE' && (
                 <>
                    <div className="flex justify-between items-end">
                        <h2 className="text-lg font-medium text-gray-900">Réponses</h2>
                        <span className="text-sm text-gray-500">Cochez la bonne réponse</span>
                    </div>

                    {options.map((option, index) => (
                        <div key={index} className="flex gap-4 items-start">
                            <div className="pt-3">
                                <input
                                    type="radio"
                                    name="correctOption"
                                    checked={option.isCorrect}
                                    onChange={() => handleSetCorrect(index)}
                                    className="w-5 h-5 text-blue-600 cursor-pointer focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex-1">
                                <Input 
                                    label={`Option ${index + 1}`}
                                    value={option.text}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Réponse ${index + 1}`}
                                    className="mb-0"
                                />
                            </div>
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveOption(index)}
                                    disabled={options.length <= 2}
                                    className={`p-2 rounded text-gray-400 hover:text-red-600 ${options.length <= 2 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}

                    <Button type="button" variant="outline" onClick={handleAddOption} className="mt-2">
                        + Ajouter une option
                    </Button>
                 </>
            )}
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-center">
                {error}
            </div>
        )}

        <div className="flex gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-1/3">
                Annuler
            </Button>
            <Button type="submit" isLoading={isLoading} className="flex-1">
                Enregistrer la question
            </Button>
        </div>
      </form>
    </div>
  )
}