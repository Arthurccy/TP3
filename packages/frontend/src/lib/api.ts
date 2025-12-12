import axios from 'axios'

const apiClient = axios.create({
  baseURL: "http://localhost:8000", // Utilise une variable d'environnement dans un vrai projet
  headers: {
    'Content-Type': 'application/json',
  },
})

// Ajouter le token à chaque requête
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Gérer l'expiration du token (Refresh)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh/`,
          { refresh: refreshToken }
        )

        localStorage.setItem('accessToken', data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Si le refresh échoue, on déconnecte tout
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient