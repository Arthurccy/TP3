import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())

const httpServer = createServer(app)

// Configuration CORS pour accepter les connexions du Frontend (port 3000)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

io.on('connection', (socket) => {
  console.log(`🔌 Client connecté : ${socket.id}`)

  // 1. Un utilisateur rejoint une session (Prof ou Élève)
  socket.on('join_session', (sessionId) => {
    const roomName = `session_${sessionId}`
    socket.join(roomName)
    console.log(`Cient ${socket.id} a rejoint la salle ${roomName}`)
    
    // On notifie juste celui qui vient d'arriver que c'est bon
    socket.emit('joined', { room: roomName })
  })

  // 2. Signal de mise à jour (Envoyé par le Prof ou l'Élève après une action)
  socket.on('trigger_update', (sessionId) => {
    const roomName = `session_${sessionId}`
    console.log(`🔄 Mise à jour demandée pour ${roomName}`)
    
    // On dit à TOUT LE MONDE dans la salle (y compris l'expéditeur) de rafraîchir
    io.to(roomName).emit('session_updated')
  })

  // 3. Signal spécifique : Un élève a répondu (Optionnel, pour effet visuel immédiat)
  socket.on('student_answered', (sessionId) => {
    const roomName = `session_${sessionId}`
    // On notifie le prof (et les autres) que quelqu'un a répondu
    io.to(roomName).emit('new_answer')
  })

  socket.on('disconnect', () => {
    console.log(`❌ Déconnexion : ${socket.id}`)
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket Server (Rooms) running on http://localhost:${PORT}`)
})