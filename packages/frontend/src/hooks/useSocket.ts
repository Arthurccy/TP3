import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

// URL du serveur Node.js
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

export const useSocket = (sessionId: string | number) => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // 1. Connexion au serveur
    const socketInstance = io(SOCKET_URL)

    // 2. Dès qu'on est connecté, on rejoint la "Room" de la session
    socketInstance.on('connect', () => {
      console.log('Socket connecté ! Rejoindre session:', sessionId)
      socketInstance.emit('join_session', sessionId)
    })

    setSocket(socketInstance)

    // 3. Nettoyage quand on quitte la page
    return () => {
      socketInstance.disconnect()
    }
  }, [sessionId])

  return socket
}