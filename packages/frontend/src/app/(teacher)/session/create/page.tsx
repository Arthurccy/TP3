'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sessionService } from '@/services/session.service'
// --- IMPORTATIONS TANSTACK QUERY ---
import { useMutation } from '@tanstack/react-query'
// -----------------------------------

function CreateSessionLogic() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // L'ID est toujours une chaîne ou null ici
  const quizIdStr = searchParams.get('quizId') 

  // 1. MUTATION: Créer la session
  const createSessionMutation = useMutation({
    // La fonction qui effectue l'appel API
    // On reçoit l'ID du quiz sous forme de nombre
    mutationFn: (id: number) => sessionService.create(id),
    
    // Logique après succès
    onSuccess: (session) => {
      // Redirection vers la salle d'attente (Vue Host)
      router.push(`/session/${session.id}`)
    },
    
    // Logique en cas d'échec
    onError: (error: any) => {
      console.error("Erreur création session:", error)
      alert("Impossible de créer la session. Vérifiez qu'une session n'est pas déjà active ou que le quiz existe.")
      router.push('/dashboard')
    },
  })

  // 2. LOGIQUE DE DÉCLENCHEMENT DANS useEffect
  useEffect(() => {
    // Si l'ID est manquant, rediriger
    if (!quizIdStr) {
      router.push('/dashboard')
      return
    }

    const quizId = parseInt(quizIdStr)

    // Vérifier si la mutation est nécessaire et si elle n'est pas déjà en cours
    if (createSessionMutation.isIdle) {
        // Déclencher la mutation une seule fois au chargement
        createSessionMutation.mutate(quizId)
    }

    // Le tableau de dépendances inclut l'état de la mutation (isIdle) pour garantir
    // que la logique de déclenchement est réévaluée si l'état change
  }, [quizIdStr, router, createSessionMutation.isIdle])


  // 3. AFFICHAGE DES ÉTATS (en utilisant les états de la mutation)
  const isPending = createSessionMutation.isPending;
  const isError = createSessionMutation.isError;
  const error = createSessionMutation.error;

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl animate-pulse">Création de la session en cours...</div>
      </div>
    );
  }

  if (isError) {
     return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-red-600 p-8">
             Erreur lors de la création de la session. Redirection vers le tableau de bord.
             <br />
             <small className="text-sm text-gray-500">{error.message}</small>
          </div>
        </div>
     );
  }

  // Si on arrive ici, soit la mutation a réussi et la redirection a eu lieu (onSuccess),
  // soit nous attendons le résultat. Normalement, cette partie n'est pas rendue longtemps.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl text-gray-500">Préparation...</div>
    </div>
  );
}

// Suspense est maintenu pour gérer useSearchParams
export default function CreateSessionPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <CreateSessionLogic />
    </Suspense>
  )
}