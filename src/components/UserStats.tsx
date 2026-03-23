'use client';

import { useState, useEffect } from 'react';
import { getUserAvatar, getLevelByXp, LEVELS } from '@/lib/store';

interface UserStatsProps {
  userId: string;
  nickname: string;
  xp: number;
  onClose: () => void;
}

interface UserStats {
  messageCount: number;
  totalPoints: number;
}

export default function UserStatsPanel({ userId, nickname, xp, onClose }: UserStatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [levelInfo, setLevelInfo] = useState(getLevelByXp(xp));

  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      try {
        const res = await fetch(`/api/chat?action=get_user_level&userId=${userId}`);
        const data = await res.json();
        if (mounted && data.success) {
          setStats({
            messageCount: data.messageCount || 0,
            totalPoints: data.level ? 0 : 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
      if (mounted) {
        setLevelInfo(getLevelByXp(xp));
      }
    };
    
    loadStats();
    return () => { mounted = false; };
  }, [userId, xp]);

  const getNextLevel = () => {
    const nextLevelIndex = LEVELS.findIndex(l => l.level === levelInfo.level + 1);
    return nextLevelIndex !== -1 ? LEVELS[nextLevelIndex] : null;
  };

  const nextLevel = getNextLevel();
  const xpToNext = nextLevel ? nextLevel.xpRequired - xp : 0;

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-panel" onClick={e => e.stopPropagation()}>
        <button className="stats-close" onClick={onClose}>✕</button>

        <div className="stats-avatar-section">
          <img src={getUserAvatar(userId, 80)} alt={nickname} className="stats-avatar" />
          <h2 className="stats-nickname">{nickname}</h2>
        </div>

        <div className="stats-level-section">
          <div className="level-badge" style={{ backgroundColor: levelInfo.color }}>
            <span className="level-number">{levelInfo.level}</span>
            <span className="level-name">{levelInfo.name}</span>
          </div>

          <div className="xp-bar-container">
            <div className="xp-bar">
              <div
                className="xp-bar-fill"
                style={{ width: `${levelInfo.progress}%`, backgroundColor: levelInfo.color }}
              />
            </div>
            <div className="xp-info">
              <span>{xp} XP</span>
              {nextLevel && <span>До {nextLevel.name}: {xpToNext} XP</span>}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-value">{stats?.messageCount || 0}</div>
            <div className="stat-label">Сообщений</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{xp}</div>
            <div className="stat-label">Всего XP</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{levelInfo.level}</div>
            <div className="stat-label">Уровень</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{levelInfo.progress}%</div>
            <div className="stat-label">Прогресс</div>
          </div>
        </div>

        <div className="levels-preview">
          <h3>🎯 Все уровни</h3>
          <div className="levels-list">
            {LEVELS.map(l => (
              <div
                key={l.level}
                className={`level-item ${l.level === levelInfo.level ? 'current' : ''} ${l.level <= levelInfo.level ? 'achieved' : ''}`}
              >
                <span className="level-num" style={{ color: l.color }}>{l.level}</span>
                <span className="level-title">{l.name}</span>
                <span className="level-xp">{l.xpRequired} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
