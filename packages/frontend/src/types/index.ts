// Définition des rôles
export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

// L'utilisateur tel qu'il vient de l'API Django (snake_case)
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
}

// Les données nécessaires pour se connecter
export interface LoginCredentials {
  email: string
  password: string
}

// Les données nécessaires pour s'inscrire
export interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  role: UserRole
}

// La réponse de l'API lors du login (Token + User)
export interface AuthResponse {
  access: string
  refresh: string
  user: User
}


export interface Quiz {
  id: number
  title: string
  description: string
  created_at: string
  question_count: number
}