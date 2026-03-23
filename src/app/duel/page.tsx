'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import { Swords, RefreshCw, Clock, Trophy, X, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import {
  User,
  getUser,
  updateUser,
} from '@/lib/store';

// Типы
interface Duel {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar?: string;
  bet: number;
  status: 'pending' | 'accepted' | 'playing' | 'finished';
  createdAt: number;
  expiresAt: number;
  challengerRoll?: number[];
  opponentRoll?: number[];
  winnerId?: string;
  winnerName?: string;
}

interface ChatUser {
  id: string;
  nickname: string;
  avatar?: string;
  xp?: number;
  isOnline?: boolean;
}

// Компонент кости
const Dice = ({ value, rolling }: { value: number; rolling: boolean }) => {
  const diceComponents: Record<number, React.ReactNode> = {
    1: <Dice1 />,
    2: <Dice2 />,
    3: <Dice3 />,
    4: <Dice4 />,
    5: <Dice5 />,
    6: <Dice6 />,
  };

  return (
    <div className={`dice ${rolling ? 'rolling' : ''}`}>
      {value >= 1 && value <= 6 ? diceComponents[value] : '?'}
    </div>
  );
};

// Ставки
const BET_OPTIONS = [50, 100, 200, 500, 1000];

export default function DuelPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => getUser());
  const [hp, setHp] = useState(() => user?.xp || 0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Состояние дуэлей
  const [pendingDuels, setPendingDuels] = useState<Duel[]>([]);
  const [myDuels, setMyDuels] = useState<Duel[]>([]);
  const [selectedBet, setSelectedBet] = useState(BET_OPTIONS[0]);
  const [searchUser, setSearchUser] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<ChatUser | null>(null);

  // Состояние игры
  const [currentDuel, setCurrentDuel] = useState<Duel | null>(null);
  const [showDuelResult, setShowDuelResult] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // Проверка регистрации
  useEffect(() => {
    const registered = localStorage.getItem('chatchain_registered') === 'true';
    setIsRegistered(registered);
  }, []);

  // Синхронизация HP
  useEffect(() => {
    const syncHp = () => {
      const currentUser = getUser();
      if (currentUser) {
        setHp(currentUser.xp || 0);
        setUser(currentUser);
      }
    };
    window.addEventListener('focus', syncHp);
    const interval = setInterval(syncHp, 5000);
    return () => {
      window.removeEventListener('focus', syncHp);
      clearInterval(interval);
    };
  }, []);

  // Загрузка пользователей из чата
  useEffect(() => {
    const loadUsers = () => {
      try {
        const stored = localStorage.getItem('chatchain_users');
        if (stored) {
          const users = JSON.parse(stored);
          const userList: ChatUser[] = Object.entries(users)
            .filter(([id, u]: [string, any]) => u.nickname && id !== user?.id)
            .map(([id, u]: [string, any]) => ({
              id,
              nickname: u.nickname,
              avatar: u.avatar,
              xp: u.xp || 0,
              isOnline: true,
            }));
          setOnlineUsers(userList);
        }
      } catch (e) {
        console.error('Error loading users:', e);
      }
    };
    loadUsers();
    const interval = setInterval(loadUsers, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Загрузка дуэлей
  const loadDuels = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Получаем ожидающие дуэли
      const pendingRes = await fetch(`/api/duel?action=get_pending&userId=${user.id}`);
      const pendingData = await pendingRes.json();
      setPendingDuels(pendingData.duels || []);

      // Получаем наши дуэли
      const myRes = await fetch(`/api/duel?action=get_my_duels&userId=${user.id}`);
      const myData = await myRes.json();
      setMyDuels(myData.duels || []);
    } catch (e) {
      console.error('Error loading duels:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDuels();
    const interval = setInterval(loadDuels, 3000);
    return () => clearInterval(interval);
  }, [loadDuels]);

  // Переход на главный чат
  const goToMainChat = () => {
    router.push('/');
  };

  // Создать вызов
  const createDuel = async () => {
    if (!selectedOpponent || !user) return;

    if (hp < selectedBet) {
      alert('Недостаточно HP для ставки!');
      return;
    }

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          challengerId: user.id,
          challengerName: user.nickname,
          challengerAvatar: user.avatar,
          opponentId: selectedOpponent.id,
          opponentName: selectedOpponent.nickname,
          opponentAvatar: selectedOpponent.avatar,
          bet: selectedBet,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        setSelectedOpponent(null);
        setSearchUser('');
        loadDuels();
      }
    } catch (e) {
      console.error('Error creating duel:', e);
      alert('Ошибка при создании дуэли');
    }
  };

  // Принять вызов
  const acceptDuel = async (duel: Duel) => {
    if (!user) return;

    if (hp < duel.bet) {
      alert('Недостаточно HP для принятия вызова!');
      return;
    }

    setIsRolling(true);
    setShowDuelResult(true);
    setCurrentDuel(duel);

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          duelId: duel.id,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (data.duel) {
        // Задержка для анимации
        setTimeout(() => {
          setCurrentDuel(data.duel);
          setIsRolling(false);

          // Обновляем HP если выиграли
          if (data.duel.winnerId === user.id) {
            const newHp = hp + data.duel.bet;
            setHp(newHp);
            updateUser({ xp: newHp });
          } else {
            const newHp = hp - data.duel.bet;
            setHp(newHp);
            updateUser({ xp: newHp });
          }

          loadDuels();
        }, 2000);
      }
    } catch (e) {
      console.error('Error accepting duel:', e);
      setIsRolling(false);
    }
  };

  // Отклонить вызов
  const declineDuel = async (duelId: string) => {
    if (!user) return;

    try {
      await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          duelId,
          userId: user.id,
        }),
      });
      loadDuels();
    } catch (e) {
      console.error('Error declining duel:', e);
    }
  };

  // Отменить вызов
  const cancelDuel = async (duelId: string) => {
    if (!user) return;

    try {
      await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          duelId,
          userId: user.id,
        }),
      });
      loadDuels();
    } catch (e) {
      console.error('Error canceling duel:', e);
    }
  };

  // Закрыть результат
  const closeResult = () => {
    setShowDuelResult(false);
    setCurrentDuel(null);
  };

  // Фильтрованные пользователи
  const filteredUsers = onlineUsers.filter(u =>
    u.nickname.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Форматирование времени
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Оставшееся время
  const getRemainingTime = (expiresAt: number) => {
    const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    if (remaining <= 0) return 'Истекло';
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Если не зарегистрирован
  if (!isRegistered) {
    return (
      <div className="app-container">
        <Header
          nickname={user?.nickname}
          onLogoClick={goToMainChat}
        />

        <div className="duel-page">
          <div className="registration-required">
            <h2>⚔️ Требуется регистрация</h2>
            <p>
              Дуэли доступны только зарегистрированным пользователям.
              Зарегистрируйтесь, чтобы бросать вызовы и выигрывать HP!
            </p>
            <button
              className="register-prompt-btn"
              onClick={() => setShowAuthModal(true)}
            >
              Зарегистрироваться
            </button>
            <button
              className="back-to-chat-btn"
              onClick={goToMainChat}
              style={{ marginTop: '12px', background: 'var(--bg-tertiary)' }}
            >
              ← Вернуться в чат
            </button>
          </div>
        </div>

        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              localStorage.setItem('chatchain_registered', 'true');
              setIsRegistered(true);
              setShowAuthModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        nickname={user?.nickname}
        onLogoClick={goToMainChat}
      />

      <div className="duel-page">
        {/* Баланс HP */}
        <div className="balance-row">
          <div className="balance hp-balance">
            <span className="balance-icon">❤️</span>
            <span className="balance-value">{hp.toLocaleString()} HP</span>
          </div>
        </div>

        {/* Ожидающие вызовы */}
        {pendingDuels.length > 0 && (
          <div className="duel-section">
            <h3 className="section-title">
              <Swords size={20} />
              Вам бросили вызов!
            </h3>
            <div className="pending-duels">
              {pendingDuels.map(duel => (
                <div key={duel.id} className="pending-duel-card">
                  <div className="duel-info">
                    <div className="duel-player">
                      <span className="player-avatar">
                        {duel.challengerAvatar ? (
                          <img src={duel.challengerAvatar} alt="" />
                        ) : (
                          <span className="avatar-placeholder">👤</span>
                        )}
                      </span>
                      <span className="player-name">{duel.challengerName}</span>
                    </div>
                    <div className="duel-vs">VS</div>
                    <div className="duel-player">
                      <span className="player-avatar">
                        {duel.opponentAvatar ? (
                          <img src={duel.opponentAvatar} alt="" />
                        ) : (
                          <span className="avatar-placeholder">👤</span>
                        )}
                      </span>
                      <span className="player-name">{duel.opponentName}</span>
                    </div>
                  </div>
                  <div className="duel-bet">
                    <span className="bet-label">Ставка:</span>
                    <span className="bet-value">❤️ {duel.bet} HP</span>
                  </div>
                  <div className="duel-timer">
                    <Clock size={14} />
                    <span>{getRemainingTime(duel.expiresAt)}</span>
                  </div>
                  <div className="duel-actions">
                    <button
                      className="duel-btn accept"
                      onClick={() => acceptDuel(duel)}
                      disabled={hp < duel.bet}
                    >
                      ⚔️ Принять
                    </button>
                    <button
                      className="duel-btn decline"
                      onClick={() => declineDuel(duel.id)}
                    >
                      ✕ Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Создать вызов */}
        <div className="duel-section">
          <h3 className="section-title">
            <Swords size={20} />
            Бросить вызов
          </h3>

          {/* Выбор противника */}
          <div className="opponent-select">
            <input
              type="text"
              placeholder="Введите имя противника..."
              value={searchUser}
              onChange={(e) => {
                setSearchUser(e.target.value);
                setSelectedOpponent(null);
              }}
              className="opponent-search"
            />

            {searchUser && !selectedOpponent && filteredUsers.length > 0 && (
              <div className="opponent-list">
                {filteredUsers.slice(0, 5).map(u => (
                  <div
                    key={u.id}
                    className={`opponent-option ${u.xp && u.xp < selectedBet ? 'low-hp' : ''}`}
                    onClick={() => {
                      setSelectedOpponent(u);
                      setSearchUser(u.nickname);
                    }}
                  >
                    <span className="opponent-avatar">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" />
                      ) : (
                        <span>👤</span>
                      )}
                    </span>
                    <span className="opponent-name">{u.nickname}</span>
                    <span className="opponent-hp">❤️ {u.xp || 0} HP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Выбор ставки */}
          <div className="bet-select">
            <span className="bet-label">Ставка:</span>
            <div className="bet-options">
              {BET_OPTIONS.map(bet => (
                <button
                  key={bet}
                  className={`bet-option ${selectedBet === bet ? 'selected' : ''} ${hp < bet ? 'disabled' : ''}`}
                  onClick={() => setSelectedBet(bet)}
                  disabled={hp < bet}
                >
                  ❤️ {bet}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопка вызова */}
          <button
            className="create-duel-btn"
            onClick={createDuel}
            disabled={!selectedOpponent || hp < selectedBet}
          >
            ⚔️ Бросить вызов
            {selectedOpponent && (
              <span className="duel-target"> → {selectedOpponent.nickname}</span>
            )}
          </button>
        </div>

        {/* Мои вызовы */}
        {myDuels.filter(d => d.status === 'pending').length > 0 && (
          <div className="duel-section">
            <h3 className="section-title">
              <Clock size={20} />
              Мои вызовы (ожидают ответа)
            </h3>
            <div className="my-duels">
              {myDuels
                .filter(d => d.status === 'pending' && d.challengerId === user?.id)
                .map(duel => (
                  <div key={duel.id} className="my-duel-card">
                    <div className="duel-info">
                      <span>Вызов для: <strong>{duel.opponentName}</strong></span>
                      <span className="duel-bet-small">❤️ {duel.bet} HP</span>
                    </div>
                    <div className="duel-timer">
                      <Clock size={14} />
                      <span>{getRemainingTime(duel.expiresAt)}</span>
                    </div>
                    <button
                      className="cancel-duel-btn"
                      onClick={() => cancelDuel(duel.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* История дуэлей */}
        <div className="duel-section">
          <h3 className="section-title">
            <Trophy size={20} />
            История дуэлей
          </h3>
          {myDuels.filter(d => d.status === 'finished').length > 0 ? (
            <div className="duel-history">
              {myDuels
                .filter(d => d.status === 'finished')
                .slice(0, 10)
                .map(duel => {
                  const isWinner = duel.winnerId === user?.id;
                  const isChallenger = duel.challengerId === user?.id;
                  const opponentName = isChallenger ? duel.opponentName : duel.challengerName;

                  return (
                    <div key={duel.id} className={`history-item ${isWinner ? 'win' : 'loss'}`}>
                      <div className="history-header">
                        <span className="history-result">
                          {isWinner ? '🏆 Победа' : '💀 Поражение'}
                        </span>
                        <span className="history-time">{formatTime(duel.createdAt)}</span>
                      </div>
                      <div className="history-details">
                        <span>vs {opponentName}</span>
                        <span className={`history-hp ${isWinner ? 'positive' : 'negative'}`}>
                          {isWinner ? '+' : '-'}{duel.bet} HP
                        </span>
                      </div>
                      {duel.challengerRoll && duel.opponentRoll && (
                        <div className="history-dice">
                          <span className="dice-result">
                            {isChallenger ? 'Вы' : duel.challengerName}: {duel.challengerRoll[0]}+{duel.challengerRoll[1]} = {duel.challengerRoll[0] + duel.challengerRoll[1]}
                          </span>
                          <span className="dice-result">
                            {isChallenger ? duel.opponentName : 'Вы'}: {duel.opponentRoll[0]}+{duel.opponentRoll[1]} = {duel.opponentRoll[0] + duel.opponentRoll[1]}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="no-history">
              <p>У вас пока нет завершённых дуэлей</p>
            </div>
          )}
        </div>

        {/* Кнопка возврата */}
        <button className="back-to-chat-btn" onClick={goToMainChat}>
          ← Вернуться в чат
        </button>
      </div>

      {/* Модальное окно результата дуэли */}
      {showDuelResult && currentDuel && (
        <div className="duel-result-modal">
          <div className="duel-result-content">
            <button className="close-modal-btn" onClick={closeResult}>
              <X size={24} />
            </button>

            <h2 className="result-title">
              {isRolling ? '🎲 Бросок костей...' : '⚔️ Результат дуэли'}
            </h2>

            <div className="result-players">
              {/* Игрок 1 */}
              <div className="result-player">
                <div className="player-info">
                  <span className="player-avatar large">
                    {currentDuel.challengerAvatar ? (
                      <img src={currentDuel.challengerAvatar} alt="" />
                    ) : (
                      <span>👤</span>
                    )}
                  </span>
                  <span className="player-name">{currentDuel.challengerName}</span>
                </div>
                <div className="player-dice">
                  {currentDuel.challengerRoll ? (
                    <>
                      <Dice value={currentDuel.challengerRoll[0]} rolling={isRolling} />
                      <Dice value={currentDuel.challengerRoll[1]} rolling={isRolling} />
                      <span className="dice-total">
                        = {currentDuel.challengerRoll[0] + currentDuel.challengerRoll[1]}
                      </span>
                    </>
                  ) : (
                    <span className="dice-waiting">?</span>
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="result-vs">VS</div>

              {/* Игрок 2 */}
              <div className="result-player">
                <div className="player-info">
                  <span className="player-avatar large">
                    {currentDuel.opponentAvatar ? (
                      <img src={currentDuel.opponentAvatar} alt="" />
                    ) : (
                      <span>👤</span>
                    )}
                  </span>
                  <span className="player-name">{currentDuel.opponentName}</span>
                </div>
                <div className="player-dice">
                  {currentDuel.opponentRoll ? (
                    <>
                      <Dice value={currentDuel.opponentRoll[0]} rolling={isRolling} />
                      <Dice value={currentDuel.opponentRoll[1]} rolling={isRolling} />
                      <span className="dice-total">
                        = {currentDuel.opponentRoll[0] + currentDuel.opponentRoll[1]}
                      </span>
                    </>
                  ) : (
                    <span className="dice-waiting">?</span>
                  )}
                </div>
              </div>
            </div>

            {/* Результат */}
            {!isRolling && currentDuel.winnerName && (
              <div className={`winner-announcement ${currentDuel.winnerId === user?.id ? 'im-winner' : ''}`}>
                <Trophy size={32} />
                <h3>{currentDuel.winnerName} побеждает!</h3>
                <p className="winner-prize">
                  {currentDuel.winnerId === user?.id
                    ? `🎉 Вы выиграли +${currentDuel.bet} HP!`
                    : `Вы проиграли -${currentDuel.bet} HP`
                  }
                </p>
              </div>
            )}

            {/* Ставка */}
            <div className="result-bet">
              <span>Ставка: ❤️ {currentDuel.bet} HP</span>
            </div>

            {!isRolling && (
              <button className="close-result-btn" onClick={closeResult}>
                Закрыть
              </button>
            )}
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            localStorage.setItem('chatchain_registered', 'true');
            setIsRegistered(true);
            setShowAuthModal(false);
          }}
        />
      )}
    </div>
  );
}
