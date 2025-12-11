'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserRole } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // État initial du formulaire
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    role: UserRole.STUDENT // Par défaut
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation basique côté front
    if (formData.password !== formData.password_confirm) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    try {
      await authService.register(formData)
      // En cas de succès, on redirige vers le login
      alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.")
      router.push('/login')
    } catch (err: any) {
      console.error(err)
      // Gestion des erreurs API (ex: "Cet email existe déjà")
      const backendError = err.response?.data
      if (backendError) {
        // On prend la première erreur qu'on trouve (username, email, password...)
        const firstErrorKey = Object.keys(backendError)[0]
        const errorMessage = Array.isArray(backendError[firstErrorKey]) 
          ? backendError[firstErrorKey][0] 
          : backendError[firstErrorKey]
        
        setError(`${firstErrorKey}: ${errorMessage}`)
      } else {
        setError("Une erreur est survenue lors de l'inscription")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Créer un compte</h2>
          <p className="mt-2 text-gray-600">Rejoignez la plateforme de quiz</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center border border-red-200">
              {error}
            </div>
          )}

          {/* Sélection du Rôle (Enseignant ou Étudiant) */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: UserRole.STUDENT })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                formData.role === UserRole.STUDENT
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              🎓 Étudiant
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: UserRole.TEACHER })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                formData.role === UserRole.TEACHER
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              👨‍🏫 Enseignant
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Jean"
              />
              <Input
                label="Nom"
                name="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Dupont"
              />
            </div>

            <Input
              label="Nom d'utilisateur"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="jeandupont123"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jean@exemple.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              name="password_confirm"
              required
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" isLoading={isLoading} className="mt-6">
            S'inscrire
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-600">Déjà un compte ? </span>
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}