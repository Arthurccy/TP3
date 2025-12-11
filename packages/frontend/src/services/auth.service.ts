import apiClient from '@/lib/api'
import { User, LoginCredentials, RegisterData, AuthResponse } from '../types/index' 
// Note: Crée un fichier types/index.ts ou utilise celui du shared si configuré.
// Pour l'instant, tu peux utiliser 'any' si tu n'as pas encore les types, 
// mais voici ce qu'il faut idéalement :

export const authService = {
  async register(data: RegisterData) {
    const response = await apiClient.post<User>('/api/auth/register/', data)
    return response.data
  },

  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>('/api/auth/login/', credentials)
    if (response.data.access) {
      localStorage.setItem('accessToken', response.data.access)
      localStorage.setItem('refreshToken', response.data.refresh)
    }
    return response.data
  },

  async getCurrentUser() {
    const response = await apiClient.get<User>('/api/auth/me/')
    return response.data
  },

  logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
}