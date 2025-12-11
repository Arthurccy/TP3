import apiClient from '@/lib/api'
import { Quiz } from '@/types'

export const quizService = {
  async getAll() {
    const response = await apiClient.get('/api/quizzes/')
    
    // CAS 1 : Django renvoie un objet paginé { results: [...] }
    if (response.data.results && Array.isArray(response.data.results)) {
      return response.data.results as Quiz[]
    }
    
    // CAS 2 : Django renvoie directement le tableau [...]
    if (Array.isArray(response.data)) {
      return response.data as Quiz[]
    }

    // CAS 3 : Sécurité (si l'API renvoie autre chose)
    return []
  },

  async getById(id: string) {
    const response = await apiClient.get<Quiz>(`/api/quizzes/${id}/`)
    return response.data
  },

  async create(data: { title: string; description: string }) {
    const response = await apiClient.post<Quiz>('/api/quizzes/', data)
    return response.data
  },

  async delete(id: number) {
    await apiClient.delete(`/api/quizzes/${id}/`)
  }
}