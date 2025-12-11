'use client'

import { useEffect, useState } from 'react'

interface TimerBarProps {
  duration: number // Durée en secondes
  onExpire?: () => void // Fonction optionnelle à appeler à la fin
}

export function TimerBar({ duration, onExpire }: TimerBarProps) {
  const [width, setWidth] = useState(100)
  
  // On démarre l'animation dès que le composant est monté
  useEffect(() => {
    // Petit délai pour permettre au navigateur de rendre la barre pleine avant de réduire
    const timer = setTimeout(() => {
      setWidth(0)
    }, 100)

    // Timer logique pour déclencher onExpire
    const expireTimer = setTimeout(() => {
      if (onExpire) onExpire()
    }, duration * 1000)

    return () => {
      clearTimeout(timer)
      clearTimeout(expireTimer)
    }
  }, [duration, onExpire])

  return (
    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
      <div 
        className="h-full transition-all ease-linear"
        style={{ 
          width: `${width}%`, 
          transitionDuration: `${duration}s`,
          // Changement de couleur dynamique via CSS (Vert -> Jaune -> Rouge)
          backgroundColor: width > 50 ? '#22c55e' : width > 20 ? '#eab308' : '#ef4444'
        }}
      />
    </div>
  )
}