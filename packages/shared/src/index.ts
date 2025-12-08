// Types partagés entre frontend et backend
export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface SocketMessage {
  type: string
  payload: unknown
  timestamp: string
}
