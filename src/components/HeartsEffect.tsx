'use client';

import { useEffect, useState, useCallback } from 'react';

interface Heart { id: number; x: number; y: number; size: number; duration: number; delay: number; }
interface HeartsEffectProps { currentUserId: string; }

let lastHeartEventTime = 0;

export default function HeartsEffect({ currentUserId }: HeartsEffectProps) {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [isClient] = useState(() => typeof window !== 'undefined');

  const createHearts = useCallback((count: number) => {
    const newHearts: Heart[] = [];
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: Date.now() + i, x: Math.random() * 100, y: Math.random() * 100,
        size: 20 + Math.random() * 30, duration: 2 + Math.random() * 3, delay: Math.random() * 0.5,
      });
    }
    setHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => { setHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id))); }, 5000);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const checkHeartEvent = async () => {
      try {
        const res = await fetch('/api/music');
        const data = await res.json();
        if (data.success && data.state.heartEvent) {
          const eventTime = data.state.heartEvent.timestamp;
          const eventCount = data.state.heartEvent.count;
          if (eventTime > lastHeartEventTime) {
            lastHeartEventTime = eventTime;
            createHearts(eventCount);
          }
        }
      } catch {}
    };
    const interval = setInterval(checkHeartEvent, 500);
    return () => clearInterval(interval);
  }, [isClient, createHearts, currentUserId]);

  if (!isClient) return null;

  return (
    <div className="hearts-container">
      {hearts.map(heart => (
        <div key={heart.id} className="floating-heart" style={{ left: `${heart.x}%`, top: `${heart.y}%`, fontSize: `${heart.size}px`, animationDuration: `${heart.duration}s`, animationDelay: `${heart.delay}s` }}>❤️</div>
      ))}
    </div>
  );
}
