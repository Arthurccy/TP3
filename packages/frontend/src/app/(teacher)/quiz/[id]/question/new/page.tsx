'use client'

import { useState } from 'react' // J'ai retiré 'use' ici
import { useRouter } from 'next/navigation'
import { questionService } from '@/services/question.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Interface locale pour gérer l'état du formulaire
interface OptionState {
  text: string
  isCorrect: boolean
}

// CORRECTION ICI : params est un objet simple { id: string }
export default function AddQuestionPage({ params }: { params: { id: string } }) {
  // On récupère l'ID directement depuis l'objet params
  const quizId = parseInt(params.id)
  
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // État de la question
  const [questionText, setQuestionText] = useState('')
  const [timeLimit, setTimeLimit] = useState(30)
  
  // État des options (On commence avec 2 options vides par défaut)
  const [options, setOptions] = useState<OptionState[]>([
    { text: '', isCorrect: true }, // La première est correcte par défaut
    { text: '', isCorrect: false }
  ])

  // --- Gestionnaires d'événements ---

  // Ajouter une nouvelle ligne d'option
  const handleAddOption = () => {
    setOptions([...options, { text: '', isCorrect: false }])
  }

  // Supprimer une option
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return // On garde toujours au moins 2 options
    
    const newOptions = options.filter((_, i) => i !== index)
    
    // Si on a supprimé la réponse correcte, on met la première comme correcte par défaut
    if (options[index].isCorrect) {
        newOptions[0].isCorrect = true
    }
    
    setOptions(newOptions)
  }

  // Modifier le texte d'une option
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index].text = value
    setOptions(newOptions)
  }

  // Changer la bonne réponse (Radio button logic)
  const handleSetCorrect = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }))
    setOptions(newOptions)
  }

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // 1. Validation Frontend basique
    if (!questionText.trim()) {
        setError("La question ne peut pas être vide")
        setIsLoading(false)
        return
    }
    
    if (options.some(opt => !opt.text.trim())) {
        setError("Toutes les options doivent avoir du texte")
        setIsLoading(false)
        return
    }

    try {
      // 2. Préparation du payload pour l'API
      const payload = {
        text: questionText,
        time_limit: timeLimit,
        question_type: 'MULTIPLE_CHOICE',
        order: 1, // Tu pourras gérer l'ordre dynamiquement plus tard
        options: options.map((opt, index) => ({
            text: opt.text,
            is_correct: opt.isCorrect,
            order: index + 1
        }))
      }

      // 3. Envoi au backend
      await questionService.create(quizId, payload)
      
      // 4. Retour à la liste des questions
      router.push(`/quiz/${quizId}`)
      
    } catch (err: any) {
      console.error(err)
      // Gestion fine des erreurs de validation Django
      if (err.response?.data?.options) {
          setError("Erreur dans les options : " + err.response.data.options)
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
        
        {/* Partie Question */}
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

        {/* Partie Options */}
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <h2 className="text-lg font-medium text-gray-900">Réponses</h2>
                <span className="text-sm text-gray-500">Cochez la bonne réponse</span>
            </div>

            {options.map((option, index) => (
                <div key={index} className="flex gap-4 items-start">
                    {/* Radio Button pour la bonne réponse */}
                    <div className="pt-3">
                        <input
                            type="radio"
                            name="correctOption"
                            checked={option.isCorrect}
                            onChange={() => handleSetCorrect(index)}
                            className="w-5 h-5 text-blue-600 cursor-pointer focus:ring-blue-500"
                        />
                    </div>

                    {/* Champ Texte Option */}
                    <div className="flex-1">
                        <Input 
                            label={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOptionChange(index, e.target.value)}
                            placeholder={`Réponse ${index + 1}`}
                            className="mb-0" // Override le margin-bottom par défaut de l'input
                        />
                    </div>

                    {/* Bouton Supprimer */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            disabled={options.length <= 2}
                            className={`p-2 rounded text-gray-400 hover:text-red-600 ${options.length <= 2 ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Supprimer l'option"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddOption} className="mt-2">
                + Ajouter une option
            </Button>
        </div>

        {/* Message d'erreur global */}
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-center">
                {error}
            </div>
        )}

        {/* Actions du formulaire */}
        <div className="flex gap-4 pt-6 border-t">
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                className="w-1/3"
            >
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