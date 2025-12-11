'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'



export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await authService.login(formData)
      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      // On gère le cas où l'erreur vient du backend Django
      const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.non_field_errors?.[0] || 
                           'Erreur de connexion'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Connexion</h2>
          <p className="mt-2 text-gray-600">Accédez à vos quiz</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              // Correction TypeScript appliquée ici
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({...formData, email: e.target.value})
              }
              placeholder="exemple@email.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              required
              value={formData.password}
              // Correction TypeScript appliquée ici
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({...formData, password: e.target.value})
              }
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" isLoading={isLoading}>
            Se connecter
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-600">Pas encore de compte ? </span>
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              S'inscrire
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}