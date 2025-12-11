import apiClient from '@/lib/api'

export const questionService = {
  // Ajouter une question à un quiz
  async create(quizId: number, data: any) {
    // Note: on envoie quizId dans le body comme attendu par le serializer corrigé
    return apiClient.post('/api/questions/', { ...data, quiz: quizId })
  },

  // Modifier une question
  async update(id: number, data: any) {
    return apiClient.patch(`/api/questions/${id}/`, data)
  },

  // Supprimer une question
  async delete(id: number) {
    return apiClient.delete(`/api/questions/${id}/`)
  }
}