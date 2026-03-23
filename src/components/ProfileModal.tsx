'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Castle, Swords, Trophy, TrendingUp, Crown, Star, 
  Medal, Clock, Package, Target, Heart, Users,
  ChevronRight, Lock, Gift, Zap, Crosshair, Gamepad2, Skull
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProfileModalProps {
  user: {
    id: string;
    nickname: string;
    points?: number;
    xp?: number;
    status?: string;
    level?: number;
  };
  onClose: () => void;
}

interface FortressData {
  race: string | null;
  raceEmoji: string;
  raceName: string;
  level: number;
  rating: number;
  armyPower: number;
  buildingsBuilt: number;
  battlesWon: number;
  battlesLost: number;
  resourcesCollected: number;
}

interface SurvivStats {
  gamesPlayed: number;
  wins: number;
  totalKills: number;
  bestKills: number;
  totalHPearned: number;
  achievements: { id: string; name: string; emoji: string }[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const RACES: Record<string, { name: string; emoji: string }> = {
  human: { name: 'Люди', emoji: '👤' },
  elf: { name: 'Эльфы', emoji: '🧝' },
  dwarf: { name: 'Гномы', emoji: '🪓' },
  darkElf: { name: 'Тёмные эльфы', emoji: '🦇' },
  undead: { name: 'Нежить', emoji: '🦴' },
  werewolf: { name: 'Оборотни', emoji: '🐺' },
  orc: { name: 'Орки', emoji: '🧌' },
  mage: { name: 'Маги', emoji: '🧙' },
  vampire: { name: 'Вампиры', emoji: '🧛' },
  dragonborn: { name: 'Дракониды', emoji: '🐲' },
};

export default function ProfileModal({ user, onClose }: ProfileModalProps) {
  const router = useRouter();
  const [fortress, setFortress] = useState<FortressData | null>(null);
  const [survivStats, setSurvivStats] = useState<SurvivStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Загрузка данных крепости
        const fortressRes = await fetch(`/api/fortress?userId=${user.id}`);
        const fortressData = await fortressRes.json();
        
        if (fortressData.success && fortressData.fortress?.race) {
          const raceInfo = RACES[fortressData.fortress.race] || { name: 'Неизвестно', emoji: '?' };
          setFortress({
            race: fortressData.fortress.race,
            raceEmoji: raceInfo.emoji,
            raceName: raceInfo.name,
            level: fortressData.stats?.level || 1,
            rating: fortressData.stats?.rating || 0,
            armyPower: fortressData.fortress.army?.totalPower || 0,
            buildingsBuilt: fortressData.fortress.stats?.buildingsBuilt || 0,
            battlesWon: fortressData.fortress.stats?.battlesWon || 0,
            battlesLost: fortressData.fortress.stats?.battlesLost || 0,
            resourcesCollected: fortressData.fortress.stats?.resourcesCollected || 0,
          });
        }

        // Загрузка статистики Surviv.io
        if (typeof window !== 'undefined') {
          const survivData = localStorage.getItem('chatchain_surviv_stats');
          if (survivData) {
            const stats = JSON.parse(survivData);
            const achievs = localStorage.getItem('chatchain_surviv_achievements');
            const unlockedAchievs = achievs ? JSON.parse(achievs) : [];
            setSurvivStats({
              gamesPlayed: stats.gamesPlayed || 0,
              wins: stats.wins || 0,
              totalKills: stats.totalKills || 0,
              bestKills: stats.bestKills || 0,
              totalHPearned: stats.totalHPearned || 0,
              achievements: unlockedAchievs,
            });
          }
        }

        // Генерация достижений на основе статистики
        const userAchievements = generateAchievements(user, fortressData);
        setAchievements(userAchievements);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user.id]);

  const generateAchievements = (userData: any, fortressData: any): Achievement[] => {
    const stats = fortressData?.fortress?.stats || {};
    const level = fortressData?.stats?.level || 0;
    
    return [
      {
        id: 'first_message',
        name: 'Первые шаги',
        description: 'Отправить первое сообщение',
        emoji: '💬',
        unlocked: true,
      },
      {
        id: 'chat_veteran',
        name: 'Ветеран чата',
        description: 'Написать 100 сообщений',
        emoji: '🗣️',
        unlocked: (userData.xp || 0) >= 100,
        progress: Math.min(100, userData.xp || 0),
        maxProgress: 100,
      },
      {
        id: 'fortress_founder',
        name: 'Основатель',
        description: 'Создать крепость',
        emoji: '🏰',
        unlocked: !!fortressData?.fortress?.race,
      },
      {
        id: 'builder',
        name: 'Строитель',
        description: 'Построить 10 зданий',
        emoji: '🏗️',
        unlocked: (stats.buildingsBuilt || 0) >= 10,
        progress: Math.min(10, stats.buildingsBuilt || 0),
        maxProgress: 10,
      },
      {
        id: 'army_commander',
        name: 'Полководец',
        description: 'Иметь армию силой 1000',
        emoji: '⚔️',
        unlocked: (fortressData?.fortress?.army?.totalPower || 0) >= 1000,
        progress: Math.min(1000, fortressData?.fortress?.army?.totalPower || 0),
        maxProgress: 1000,
      },
      {
        id: 'first_victory',
        name: 'Первая победа',
        description: 'Выиграть первый бой',
        emoji: '🏆',
        unlocked: (stats.battlesWon || 0) >= 1,
      },
      {
        id: 'veteran_warrior',
        name: 'Опытный воин',
        description: 'Выиграть 10 боёв',
        emoji: '🎖️',
        unlocked: (stats.battlesWon || 0) >= 10,
        progress: Math.min(10, stats.battlesWon || 0),
        maxProgress: 10,
      },
      {
        id: 'resource_master',
        name: 'Мастер ресурсов',
        description: 'Собрать 10000 ресурсов',
        emoji: '💎',
        unlocked: (stats.resourcesCollected || 0) >= 10000,
        progress: Math.min(10000, stats.resourcesCollected || 0),
        maxProgress: 10000,
      },
      {
        id: 'level_10',
        name: 'Развитие',
        description: 'Достичь 10 уровня крепости',
        emoji: '📈',
        unlocked: level >= 10,
        progress: Math.min(10, level),
        maxProgress: 10,
      },
      {
        id: 'level_50',
        name: 'Империя',
        description: 'Достичь 50 уровня крепости',
        emoji: '👑',
        unlocked: level >= 50,
        progress: Math.min(50, level),
        maxProgress: 50,
      },
      {
        id: 'millionaire',
        name: 'Миллионер',
        description: 'Накопить 1000000 ресурсов',
        emoji: '💰',
        unlocked: (stats.resourcesCollected || 0) >= 1000000,
        progress: Math.min(1000000, stats.resourcesCollected || 0),
        maxProgress: 1000000,
      },
      {
        id: 'married',
        name: 'Союз сердец',
        description: 'Заключить брак',
        emoji: '💒',
        unlocked: false, // Будет реализовано позже
      },
    ];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const getStatusEmoji = (status?: string): string => {
    switch (status) {
      case 'legend': return '👑';
      case 'elite': return '💎';
      case 'pro': return '⭐';
      case 'registered': return '✅';
      default: return '🆓';
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>
        
        {/* Заголовок профиля */}
        <div className="profile-header" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '36px',
          }}>
            {fortress?.raceEmoji || '👤'}
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{user.nickname}</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <Badge variant="secondary">
              {getStatusEmoji(user.status)} {user.status || 'guest'}
            </Badge>
            {fortress && (
              <Badge variant="outline">
                {fortress.raceName}
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="animate-pulse">Загрузка...</div>
          </div>
        ) : (
          <>
            {/* Статистика чата */}
            <Card style={{ margin: '0 20px 16px' }}>
              <CardHeader style={{ paddingBottom: '8px' }}>
                <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap className="w-4 h-4" />
                  Активность в чате
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.xp || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.points || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HP</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.level || 1}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Уровень</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статистика крепости */}
            {fortress ? (
              <Card style={{ margin: '0 20px 16px' }}>
                <CardHeader style={{ paddingBottom: '8px' }}>
                  <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Castle className="w-4 h-4" />
                      Крепость
                    </span>
                    <Badge>Ур. {fortress.level}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatNumber(fortress.rating)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Рейтинг</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Swords className="w-5 h-5 text-red-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatNumber(fortress.armyPower)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Армия</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {fortress.battlesWon}/{fortress.battlesWon + fortress.battlesLost}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Победы</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Package className="w-5 h-5 text-purple-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{fortress.buildingsBuilt}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Зданий</div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    onClick={() => router.push('/fortress')}
                  >
                    <Castle className="w-4 h-4 mr-2" />
                    Открыть крепость
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card style={{ margin: '0 20px 16px' }}>
                <CardContent style={{ textAlign: 'center', padding: '24px' }}>
                  <Castle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                    У вас ещё нет крепости
                  </p>
                  <Button onClick={() => router.push('/fortress')}>
                    <Castle className="w-4 h-4 mr-2" />
                    Создать крепость
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Статистика Surviv.io */}
            {survivStats && survivStats.gamesPlayed > 0 && (
              <Card style={{ margin: '0 20px 16px' }}>
                <CardHeader style={{ paddingBottom: '8px' }}>
                  <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crosshair className="w-4 h-4 text-red-500" />
                      Surviv.io
                    </span>
                    <Badge variant="outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                      {survivStats.wins} побед
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Gamepad2 className="w-5 h-5 text-blue-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{survivStats.gamesPlayed}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Игр</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Skull className="w-5 h-5 text-red-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{survivStats.totalKills}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Убийств</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Star className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{survivStats.bestKills}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Лучший рекорд</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Heart className="w-5 h-5 text-pink-500" />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>+{survivStats.totalHPearned}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HP заработано</div>
                      </div>
                    </div>
                  </div>

                  {/* Достижения Surviv */}
                  {survivStats.achievements.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {survivStats.achievements.slice(0, 6).map((a, i) => (
                        <span key={i} style={{ fontSize: '20px' }} title={a.name}>{a.emoji}</span>
                      ))}
                      {survivStats.achievements.length > 6 && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          +{survivStats.achievements.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  <Button 
                    className="w-full mt-4" 
                    onClick={() => router.push('/surviv')}
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }}
                  >
                    <Crosshair className="w-4 h-4 mr-2" />
                    Играть в Surviv.io
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Достижения */}
            <Card style={{ margin: '0 20px 16px' }}>
              <CardHeader style={{ paddingBottom: '8px' }}>
                <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Medal className="w-4 h-4" />
                    Достижения
                  </span>
                  <Badge variant="secondary">{unlockedCount}/{achievements.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {achievements.slice(0, 8).map((achievement) => (
                    <div
                      key={achievement.id}
                      style={{
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        background: achievement.unlocked ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        opacity: achievement.unlocked ? 1 : 0.5,
                        position: 'relative',
                      }}
                      title={`${achievement.name}: ${achievement.description}`}
                    >
                      <div style={{ fontSize: '24px' }}>
                        {achievement.unlocked ? achievement.emoji : '🔒'}
                      </div>
                      <div style={{ fontSize: '10px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {achievement.name}
                      </div>
                      {achievement.progress !== undefined && !achievement.unlocked && (
                        <Progress 
                          value={(achievement.progress / (achievement.maxProgress || 1)) * 100} 
                          style={{ height: '2px', marginTop: '4px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {achievements.length > 8 && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                    +{achievements.length - 8} достижений
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Кнопки действий */}
            <div style={{ padding: '0 20px 20px' }}>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
