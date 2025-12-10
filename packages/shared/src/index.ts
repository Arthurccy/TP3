// Types partagés entre frontend et backend
// Correspondent aux modèles Django dans packages/backend/api/models.py

// ==================== Enums ====================

export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export enum SessionStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// ==================== Modèles principaux ====================

export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  dateJoined?: string
}

export interface Quiz {
  id: number
  title: string
  description: string
  createdBy: number
  createdAt: string
  updatedAt: string
  questionCount?: number
}

export interface Question {
  id: number
  quiz: number
  text: string
  questionType: QuestionType
  order: number
  timeLimit: number
  options?: QuestionOption[]
}

export interface QuestionOption {
  id: number
  question: number
  text: string
  isCorrect: boolean
  order: number
}

export interface QuizSession {
  id: number
  quiz: number | Quiz
  accessCode: string
  host: number | User
  status: SessionStatus
  currentQuestionIndex: number
  createdAt: string
  startedAt?: string | null
  endedAt?: string | null
  participantCount?: number
}

export interface Participant {
  id: number
  session: number
  user: number | User
  joinedAt: string
  score: number
  correctAnswersCount?: number
  totalAnswersCount?: number
  averageResponseTime?: number
}

export interface Answer {
  id: number
  participant: number
  question: number
  selectedOption?: number | null
  textAnswer?: string
  isCorrect: boolean
  responseTime: number
  answeredAt: string
}

// ==================== DTOs et types utilitaires ====================

export interface LeaderboardEntry {
  rank: number
  participant: Participant
  user: User
  score: number
  correctAnswers: number
  totalAnswers: number
  averageResponseTime: number
}

export interface QuestionStats {
  questionId: number
  totalAnswers: number
  correctAnswers: number
  incorrectAnswers: number
  correctPercentage: number
  optionDistribution?: {
    optionId: number
    optionText: string
    count: number
    percentage: number
  }[]
  topResponders?: {
    user: User
    responseTime: number
    isCorrect: boolean
  }[]
}

export interface SessionResults {
  sessionId: number
  quiz: Quiz
  totalParticipants: number
  totalQuestions: number
  leaderboard: LeaderboardEntry[]
  questionStats: QuestionStats[]
  averageScore: number
  completionRate: number
}

// ==================== Requêtes et réponses API ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  username: string
  firstName: string
  lastName: string
  role: UserRole
}

// Quiz
export interface CreateQuizRequest {
  title: string
  description?: string
}

export interface UpdateQuizRequest {
  title?: string
  description?: string
}

export interface CreateQuestionRequest {
  text: string
  questionType: QuestionType
  order: number
  timeLimit?: number
  options?: {
    text: string
    isCorrect: boolean
    order: number
  }[]
}

// Session
export interface CreateSessionRequest {
  quizId: number
}

export interface JoinSessionRequest {
  accessCode: string
}

export interface SubmitAnswerRequest {
  questionId: number
  selectedOptionId?: number
  textAnswer?: string
  responseTime: number
}

// ==================== Événements WebSocket ====================

export enum SocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Session lifecycle
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  START_SESSION = 'start_session',
  END_SESSION = 'end_session',

  // Questions
  NEXT_QUESTION = 'next_question',
  QUESTION_TIMEOUT = 'question_timeout',

  // Answers
  SUBMIT_ANSWER = 'submit_answer',
  ANSWER_RESULT = 'answer_result',
  ANSWER_COUNT_UPDATED = 'answer_count_updated',

  // Results
  SHOW_RESULTS = 'show_results',
  QUESTION_RESULTS = 'question_results',
  SHOW_LEADERBOARD = 'show_leaderboard',
  LEADERBOARD_UPDATE = 'leaderboard_update',

  // Participants
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',

  // Server events
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  TIMER_UPDATE = 'timer_update',
}

// Payloads WebSocket
export interface JoinSessionPayload {
  sessionId: number
  userId: number
  token: string
}

export interface StartSessionPayload {
  sessionId: number
  token: string
}

export interface NextQuestionPayload {
  sessionId: number
  token: string
}

export interface SubmitAnswerPayload {
  sessionId: number
  userId: number
  questionId: number
  answer: {
    selectedOptionId?: number
    textAnswer?: string
  }
  responseTime: number
  token: string
}

export interface ShowResultsPayload {
  sessionId: number
  questionId: number
  token: string
}

export interface ShowLeaderboardPayload {
  sessionId: number
  token: string
}

export interface EndSessionPayload {
  sessionId: number
  token: string
}

// Réponses WebSocket
export interface ParticipantJoinedEvent {
  participant: {
    userId: number
    name: string
  }
  participantCount: number
}

export interface SessionStartedEvent {
  question: Question
  timeLimit: number
  questionNumber: number
  totalQuestions: number
}

export interface NextQuestionEvent {
  question: Question
  timeLimit: number
  questionNumber: number
  totalQuestions: number
}

export interface QuestionTimeoutEvent {
  message: string
}

export interface AnswerResultEvent {
  isCorrect: boolean
  correctAnswer?: QuestionOption
  pointsEarned?: number
}

export interface AnswerCountUpdatedEvent {
  answersCount: number
  participantsCount: number
}

export interface QuestionResultsEvent {
  questionId: number
  stats: QuestionStats
}

export interface LeaderboardUpdateEvent {
  leaderboard: LeaderboardEntry[]
}

export interface SessionEndedEvent {
  finalLeaderboard: LeaderboardEntry[]
  statistics: SessionResults
}

export interface TimerUpdateEvent {
  remaining: number
}

// ==================== Types utilitaires ====================

export type QuizWithQuestions = Quiz & {
  questions: Question[]
}

export type QuestionWithOptions = Question & {
  options: QuestionOption[]
}

export type SessionWithDetails = QuizSession & {
  quiz: Quiz
  host: User
  participants?: Participant[]
}

export type ParticipantWithUser = Participant & {
  user: User
}
