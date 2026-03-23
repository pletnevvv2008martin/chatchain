'use client';

import { useState, useEffect } from 'react';
import { getUserAvatar } from '@/lib/store';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  xp: number;
  level: number;
  messages: number;
}

interface LeaderboardProps {
  currentUserId: string;
  onClose: () => void;
}

export default function Leaderboard({ currentUserId, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=20');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }

      // Получаем ранг текущего пользователя
      const rankRes = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_rank', userId: currentUserId }),
      });
      const rankData = await rankRes.json();
      if (rankData.success && rankData.rank) {
        setUserRank(rankData.rank);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return '';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-panel" onClick={e => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>🏆 Топ игроков</h2>
          <button className="leaderboard-close" onClick={onClose}>✕</button>
        </div>

        {userRank && (
          <div className="your-rank">
            Ваше место: <span className="rank-number">#{userRank}</span>
          </div>
        )}

        {loading ? (
          <div className="leaderboard-loading">Загрузка...</div>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <div className="no-data">Пока нет данных</div>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`leaderboard-entry ${entry.userId === currentUserId ? 'own' : ''} ${getRankStyle(entry.rank)}`}
                >
                  <div className="entry-rank">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="entry-avatar">
                    <img src={getUserAvatar(entry.userId, 40)} alt={entry.nickname} />
                  </div>
                  <div className="entry-info">
                    <span className="entry-name">{entry.nickname}</span>
                    <span className="entry-level">Уровень {entry.level}</span>
                  </div>
                  <div className="entry-stats">
                    <div className="entry-xp">{entry.xp} XP</div>
                    <div className="entry-messages">{entry.messages} сообщений</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="leaderboard-footer">
          <button className="refresh-btn" onClick={fetchLeaderboard}>
            🔄 Обновить
          </button>
        </div>
      </div>
    </div>
  );
}
