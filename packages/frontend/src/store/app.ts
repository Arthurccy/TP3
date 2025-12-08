import { create } from 'zustand'

interface AppStore {
  user: string | null
  setUser: (user: string | null) => void
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}))
