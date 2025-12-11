import apiClient from '@/lib/api'

// On définit l'interface ici pour la clarté
interface QuizSession {
  id: number
  access_code: string
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'
  quiz_title: string
  current_question_index: number
  current_question?: {
    id: number
    text: string
    time_limit: number
    options: Array<{
        id: number
        text: string
        order: number
    }>
  }
}

export const sessionService = {
  // L'étudiant rejoint
  async join(accessCode: string) {
    const response = await apiClient.post('/api/sessions/join/', { access_code: accessCode })
    return response.data
  },

  // L'enseignant crée une session
  async create(quizId: number) {
    const response = await apiClient.post('/api/sessions/', { quiz: quizId })
    return response.data
  },

  // Récupérer les infos d'une session (pour le Host et le Joueur)
  async getById(id: string | number) {
    const response = await apiClient.get<QuizSession>(`/api/sessions/${id}/`)
    return response.data
  },

  // Démarrer la session (WAITING -> IN_PROGRESS)
  async start(id: string | number) {
    const response = await apiClient.post(`/api/sessions/${id}/start/`)
    return response.data
  },

  // Passer à la question suivante
  async nextQuestion(id: string | number) {
    const response = await apiClient.post(`/api/sessions/${id}/next-question/`)
    return response.data
  },

  // Terminer la session
  async end(id: string | number) {
    const response = await apiClient.post(`/api/sessions/${id}/end/`)
    return response.data
  },

  // Envoyer une réponse
  async submitAnswer(sessionId: string | number, data: { selected_option: number; response_time: number }) {
    const response = await apiClient.post(`/api/sessions/${sessionId}/answer/`, data)
    return response.data
  }
}