'use client'

import { useEffect, useState } from 'react'

interface TimerBarProps {
    duration: number // Durée en secondes
    onExpire?: () => void // Fonction optionnelle à appeler à la fin
}

export function TimerBar({ duration, onExpire }: TimerBarProps) {
    // L'état width est conservé
    const [width, setWidth] = useState(100)
    
    // L'état qui contrôle si la transition doit être active
    // Nous utilisons la durée elle-même comme clé d'activation
    const [isTransitionActive, setIsTransitionActive] = useState(false) 

    useEffect(() => {
        // --- 1. RÉINITIALISATION ---
        // Force l'état à 100% SANS transition (CSS transition-duration: 0s)
        setWidth(100)
        setIsTransitionActive(false) // Désactive la transition pour le reset

        // --- 2. DÉCLENCHEMENT DE L'ANIMATION ---
        const animationStartTimer = setTimeout(() => {
            setIsTransitionActive(true) // Active la transition CSS
            setWidth(0)               // Lance la réduction de la largeur (de 100% à 0% sur 'duration' secondes)
        }, 50) // Micro-délai (50ms) pour permettre au navigateur de rendre le 100% initial

        // --- 3. DÉCLENCHEMENT DE L'EXPIRATION ---
        const expireTimer = setTimeout(() => {
            if (onExpire) onExpire()
        }, duration * 1000)

        // Nettoyage : très important pour stopper les timers à la fin ou au changement de question
        return () => {
            clearTimeout(animationStartTimer)
            clearTimeout(expireTimer)
        }
    // L'effet se relance à chaque fois que la durée change (nouvelle question)
    }, [duration, onExpire]) 

    // Détermination de la couleur en fonction du pourcentage restant
    // (Utilisation simple de width ici, à noter que les couleurs changeront instantanément au lieu d'animer)
    const bgColor = width > 50 ? '#22c55e' : width > 20 ? '#eab308' : '#ef4444';

    return (
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
                className={`h-full ease-linear ${isTransitionActive ? 'transition-all' : ''}`}
                style={{ 
                    width: `${width}%`, 
                    // Si la transition n'est pas active, la durée est 0s pour un reset instantané.
                    transitionDuration: isTransitionActive ? `${duration}s` : '0s', 
                    backgroundColor: bgColor
                }}
            />
        </div>
    )
}