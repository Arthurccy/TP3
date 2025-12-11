import apiClient from '@/lib/api'

export const sessionService = {
  async join(accessCode: string) {
    // Cette route retourne { message, session_id, participant_id }
    const response = await apiClient.post('/api/sessions/join/', { access_code: accessCode })
    return response.data
  }
}