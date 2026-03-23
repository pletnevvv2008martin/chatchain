'use client';

import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  type: 'confetti' | 'heart' | 'spark' | 'fire';
  rotation: number;
  rotationSpeed: number;
}

interface ConfettiEffectProps {
  trigger: { type: string; timestamp: number } | null;
}

export default function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const createParticles = useCallback((type: string) => {
    const newParticles: Particle[] = [];
    const count = type === 'fire' ? 30 : type === 'heart' ? 20 : 50;
    
    for (let i = 0; i < count; i++) {
      let particleType: Particle['type'] = 'confetti';
      let colors: string[] = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      
      if (type === 'heart') {
        particleType = 'heart';
        colors = ['#ff4757', '#ff6b81', '#ff7f50', '#ff4757', '#e84393'];
      } else if (type === 'fire' || type === 'sparks') {
        particleType = Math.random() > 0.5 ? 'fire' : 'spark';
        colors = ['#ff4500', '#ff6600', '#ff8c00', '#ffd700', '#ff0000'];
      }
      
      newParticles.push({
        id: Date.now() + i,
        x: type === 'heart' ? Math.random() * 100 : 50,
        y: type === 'confetti' ? -10 : 100,
        vx: (Math.random() - 0.5) * (type === 'confetti' ? 10 : 5),
        vy: type === 'confetti' ? Math.random() * 5 + 3 : -(Math.random() * 10 + 5),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        type: particleType,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20
      });
    }
    
    setParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => setParticles([]), 3000);
  }, []);

  useEffect(() => {
    if (trigger) {
      createParticles(trigger.type);
    }
  }, [trigger, createParticles]);

  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * 0.1,
        y: p.y + p.vy * 0.1,
        vy: p.vy + (p.type === 'confetti' ? 0.1 : 0.2),
        rotation: p.rotation + p.rotationSpeed
      })).filter(p => p.y < 120 && p.y > -20));
    }, 16);

    return () => clearInterval(interval);
  }, [particles.length]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className={`particle particle-${p.type}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.type === 'confetti' ? p.color : 'transparent',
            transform: `rotate(${p.rotation}deg)`,
            color: p.color
          }}
        >
          {p.type === 'heart' && '❤️'}
          {p.type === 'spark' && '✨'}
          {p.type === 'fire' && '🔥'}
        </div>
      ))}
    </div>
  );
}
