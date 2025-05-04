// page.tsx
"use client"

import ParticleSphere from "@/components/particle-sphere"
import HudOverlay from "@/components/hud-overlay"
import { useState, useCallback } from "react"

export default function Home() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [particleSize, setParticleSize] = useState(0.5)

  const toggleRotation = useCallback(() => {
    setAutoRotate((prev) => !prev)
  }, [])

  // Handle keyboard events for rotation toggle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") {
        toggleRotation()
      }
    },
    [toggleRotation],
  )

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <ParticleSphere autoRotate={autoRotate} particleSize={particleSize} onKeyDown={handleKeyDown} />
      <HudOverlay
        autoRotate={autoRotate}
        toggleRotation={toggleRotation}
        particleSize={particleSize}
        setParticleSize={setParticleSize}
      />
      <div className="absolute bottom-4 right-6 text-xs text-white font-semibold font-inter">
        <span className="opacity-60">Nuclues</span> <span className="opacity-30">by Aamon</span>
      </div>
    </main>
  )
}
