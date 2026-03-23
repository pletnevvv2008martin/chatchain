'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { User, getUser, updateUser } from '@/lib/store';

// Типы
type Role = 'civilian' | 'mafia' | 'doctor' | 'commissioner' | 'lover';
type GamePhase = 'lobby' | 'night' | 'day' | 'voting' | 'ended';

interface Player {
  id: string;
  nickname: string;
  role?: Role;
  isAlive: boolean;
  votedFor?: string;
  nightAction?: string;
}

interface Game {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  day: number;
  entryFee: number;
  prizePool: number;
  winner?: 'city' | 'mafia';
  checkedPlayers: { targetId: string; isMafia: boolean }[];
  messages: string[];
  lastUpdate: number;
}

interface LobbyGame {
  id: string;
  hostId: string;
  playersCount: number;
  entryFee: number;
  prizePool: number;
}

const ROLE_NAMES: Record<Role, string> = {
  civilian: '👤 Мирный житель',
  mafia: '🔫 Мафия',
  doctor: '💊 Доктор',
  commissioner: '🕵️ Комиссар',
  lover: '❤️ Любовница',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  civilian: 'Выживите и найдите мафию! Ночью вы спите.',
  mafia: 'Каждую ночь выбирайте жертву для убийства.',
  doctor: 'Ночью выбирайте игрока для спасения от мафии.',
  commissioner: 'Ночью проверяйте игроков - мафия они или нет.',
  lover: 'Ваш голос на дневном голосовании равен 2 голосам.',
};

const ROLE_COLORS: Record<Role, string> = {
  civilian: '#3b82f6',
  mafia: '#ef4444',
  doctor: '#10b981',
  commissioner: '#8b5cf6',
  lover: '#ec4899',
};

export default function MafiaGamePage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => getUser());
  const [hp, setHp] = useState(() => getUser()?.xp || 0);
  
  // Состояния игры
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [lobbyGames, setLobbyGames] = useState<LobbyGame[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [entryFee, setEntryFee] = useState(100);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Показать уведомление
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Загрузка списка игр
  const fetchLobbyGames = useCallback(async () => {
    try {
      const response = await fetch('/api/mafia?action=list');
      const data = await response.json();
      if (data.success) {
        setLobbyGames(data.games);
      }
    } catch (error) {
      console.error('Failed to fetch lobby games:', error);
    }
  }, []);
  
  // Загрузка текущей игры
  const fetchCurrentGame = useCallback(async () => {
    if (!user) return;
    
    try {
      // Проверяем, есть ли игрок в игре
      const gameCheck = await fetch(`/api/mafia?userId=${user.id}`);
      const gameData = await gameCheck.json();
      
      if (gameData.gameId) {
        // Загружаем состояние игры
        const response = await fetch(`/api/mafia?gameId=${gameData.gameId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success && data.game) {
          setCurrentGame(data.game);
          setView('game');
        }
      } else {
        setView('lobby');
        fetchLobbyGames();
      }
    } catch (error) {
      console.error('Failed to fetch current game:', error);
    }
  }, [user, fetchLobbyGames]);
  
  // Polling для обновления игры
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      if (currentGame && user) {
        fetch(`/api/mafia?gameId=${currentGame.id}&userId=${user.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.game) {
              setCurrentGame(data.game);
            }
          })
          .catch(console.error);
      } else if (view === 'lobby') {
        fetchLobbyGames();
      }
    }, 2000);
  }, [currentGame, user, view, fetchLobbyGames]);
  
  // Инициализация
  useEffect(() => {
    fetchCurrentGame();
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchCurrentGame]);
  
  useEffect(() => {
    startPolling();
  }, [startPolling]);
  
  // Создать игру
  const createGame = async () => {
    if (!user) return;
    
    if (hp < entryFee) {
      showNotification('error', `Недостаточно HP! Нужно: ${entryFee}`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: user.id,
          userName: user.nickname,
          entryFee,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newHp = hp - entryFee;
        setHp(newHp);
        updateUser({ xp: newHp });
        setCurrentGame(data.game);
        setView('game');
        showNotification('success', 'Игра создана! Ожидайте игроков.');
      } else {
        showNotification('error', data.error || 'Ошибка создания');
      }
    } catch (error) {
      showNotification('error', 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Присоединиться к игре
  const joinGame = async (gameId: string, fee: number) => {
    if (!user) return;
    
    if (hp < fee) {
      showNotification('error', `Недостаточно HP! Нужно: ${fee}`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          userId: user.id,
          userName: user.nickname,
          gameId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newHp = hp - fee;
        setHp(newHp);
        updateUser({ xp: newHp });
        setCurrentGame(data.game);
        setView('game');
        showNotification('success', 'Вы присоединились к игре!');
      } else {
        showNotification('error', data.error || 'Ошибка присоединения');
      }
    } catch (error) {
      showNotification('error', 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Выйти из игры
  const leaveGame = async () => {
    if (!user) return;
    
    try {
      await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          userId: user.id,
        }),
      });
      
      setCurrentGame(null);
      setView('lobby');
      fetchLobbyGames();
    } catch (error) {
      console.error('Leave error:', error);
    }
  };
  
  // Начать игру
  const startGame = async () => {
    if (!user || !currentGame) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          userId: user.id,
          gameId: currentGame.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentGame(data.game);
        showNotification('success', 'Игра началась! Вам выдана роль.');
      } else {
        showNotification('error', data.error || 'Ошибка старта');
      }
    } catch (error) {
      showNotification('error', 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ночное действие
  const nightAction = async (targetId: string | null) => {
    if (!user || !currentGame) return;
    
    try {
      const response = await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'night_action',
          userId: user.id,
          gameId: currentGame.id,
          targetId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentGame(data.game);
        showNotification('info', 'Действие выполнено!');
        setSelectedTarget(null);
      } else {
        showNotification('error', data.error || 'Ошибка');
      }
    } catch (error) {
      showNotification('error', 'Ошибка соединения');
    }
  };
  
  // Голосование
  const vote = async (targetId: string | null) => {
    if (!user || !currentGame) return;
    
    try {
      const response = await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          userId: user.id,
          gameId: currentGame.id,
          targetId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentGame(data.game);
        showNotification('info', 'Ваш голос учтён!');
        setSelectedTarget(null);
      } else {
        showNotification('error', data.error || 'Ошибка');
      }
    } catch (error) {
      showNotification('error', 'Ошибка соединения');
    }
  };
  
  // Пропустить ночь
  const skipNight = async () => {
    if (!user || !currentGame) return;
    
    try {
      await fetch('/api/mafia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip_night',
          userId: user.id,
          gameId: currentGame.id,
        }),
      });
      showNotification('info', 'Вы пропустили ночь');
    } catch (error) {
      console.error('Skip error:', error);
    }
  };
  
  // Получить текущего игрока
  const getCurrentPlayer = () => {
    return currentGame?.players.find(p => p.id === user?.id);
  };
  
  // Можно ли выполнять действия
  const canAct = () => {
    const player = getCurrentPlayer();
    if (!player || !player.isAlive) return false;
    if (!currentGame) return false;
    
    if (currentGame.phase === 'night') {
      return player.role !== 'civilian' && !player.nightAction;
    }
    
    if (currentGame.phase === 'day') {
      return !player.votedFor;
    }
    
    return false;
  };
  
  const goToMainChat = () => router.push('/');
  
  if (!user) {
    return <div className="app-container">Загрузка...</div>;
  }
  
  // --- LOBBY VIEW ---
  if (view === 'lobby') {
    return (
      <div className="app-container">
        <Header nickname={user.nickname} onlineCount={1} onLogoClick={goToMainChat} />
        
        <div className="mafia-page">
          <div className="mafia-header">
            <h1>🎭 МАФИЯ</h1>
            <p>Классическая игра на HP</p>
          </div>
          
          <div className="mafia-balance">
            <span>❤️</span>
            <span>{hp.toLocaleString()} HP</span>
          </div>
          
          {/* Создать игру */}
          <div className="mafia-create">
            <h3>🎮 Создать игру</h3>
            <div className="create-options">
              <div className="fee-selector">
                <label>Ставка:</label>
                <select value={entryFee} onChange={e => setEntryFee(Number(e.target.value))}>
                  <option value={100}>100 HP</option>
                  <option value={200}>200 HP</option>
                  <option value={500}>500 HP</option>
                  <option value={1000}>1000 HP</option>
                </select>
              </div>
              <button className="create-btn" onClick={createGame} disabled={isLoading}>
                Создать игру
              </button>
            </div>
          </div>
          
          {/* Список игр */}
          <div className="mafia-games-list">
            <h3>🎯 Доступные игры</h3>
            {lobbyGames.length === 0 ? (
              <div className="no-games">Нет активных игр. Создайте первую!</div>
            ) : (
              lobbyGames.map(game => (
                <div key={game.id} className="game-card">
                  <div className="game-info">
                    <span className="game-players">👥 {game.playersCount}/10</span>
                    <span className="game-fee">💰 {game.entryFee} HP</span>
                    <span className="game-prize">🏆 {game.prizePool} HP</span>
                  </div>
                  <button className="join-btn" onClick={() => joinGame(game.id, game.entryFee)}>
                    Войти
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Правила */}
          <div className="mafia-rules">
            <h3>📜 Правила</h3>
            <ul>
              <li><strong>👥 4-10 игроков</strong> для начала игры</li>
              <li><strong>🌙 Ночь:</strong> Мафия убивает, Доктор лечит, Комиссар проверяет</li>
              <li><strong>☀️ День:</strong> Обсуждение и голосование</li>
              <li><strong>🎭 Роли:</strong> Мирные, Мафия, Доктор, Комиссар, Любовница</li>
              <li><strong>🏆 Победа города:</strong> Вся мафия уничтожена</li>
              <li><strong>🔫 Победа мафии:</strong> Мафии больше или равно мирным</li>
            </ul>
          </div>
          
          <button className="back-btn" onClick={goToMainChat}>← Вернуться</button>
        </div>
        
        {notification && (
          <div className={`mafia-notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
    );
  }
  
  // --- GAME VIEW ---
  const currentPlayer = getCurrentPlayer();
  
  return (
    <div className="app-container">
      <Header nickname={user.nickname} onlineCount={1} onLogoClick={goToMainChat} />
      
      <div className="mafia-page">
        {/* Заголовок игры */}
        <div className="mafia-game-header">
          <div className="game-phase">
            {currentGame?.phase === 'lobby' && '⏳ Лобби'}
            {currentGame?.phase === 'night' && `🌙 Ночь ${currentGame.day}`}
            {currentGame?.phase === 'day' && `☀️ День ${currentGame.day}`}
            {currentGame?.phase === 'ended' && (currentGame.winner === 'city' ? '🎉 Город победил!' : '🔫 Мафия победила!')}
          </div>
          <div className="game-prize-pool">
            🏆 Призовой фонд: {currentGame?.prizePool.toLocaleString()} HP
          </div>
        </div>
        
        {/* Роль игрока */}
        {currentPlayer?.role && currentGame?.phase !== 'lobby' && (
          <div className="player-role" style={{ borderColor: ROLE_COLORS[currentPlayer.role] }}>
            <div className="role-name" style={{ color: ROLE_COLORS[currentPlayer.role] }}>
              {ROLE_NAMES[currentPlayer.role]}
            </div>
            <div className="role-description">
              {ROLE_DESCRIPTIONS[currentPlayer.role]}
            </div>
            <div className="role-status">
              {currentPlayer.isAlive ? '✅ Жив' : '💀 Мёртв'}
            </div>
          </div>
        )}
        
        {/* Результаты проверок (для комиссара) */}
        {currentPlayer?.role === 'commissioner' && currentGame?.checkedPlayers && currentGame.checkedPlayers.length > 0 && (
          <div className="checked-players">
            <h4>🔍 Ваши проверки:</h4>
            {currentGame.checkedPlayers.map((check, i) => {
              const target = currentGame.players.find(p => p.id === check.targetId);
              return (
                <div key={i} className={`check-result ${check.isMafia ? 'mafia' : 'civilian'}`}>
                  {target?.nickname}: {check.isMafia ? '🔫 МАФИЯ' : '👤 НЕ МАФИЯ'}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Игроки */}
        <div className="players-grid">
          {currentGame?.players.map(player => (
            <div
              key={player.id}
              className={`player-card ${!player.isAlive ? 'dead' : ''} ${selectedTarget === player.id ? 'selected' : ''} ${player.id === user.id ? 'own' : ''}`}
              onClick={() => {
                if (canAct() && player.isAlive && player.id !== user?.id) {
                  setSelectedTarget(player.id);
                }
              }}
            >
              <div className="player-avatar">
                {player.isAlive ? '👤' : '💀'}
              </div>
              <div className="player-name">
                {player.nickname}
                {player.id === currentGame.hostId && ' 👑'}
                {player.id === user?.id && ' (Вы)'}
              </div>
              {!player.isAlive && <div className="player-status">Мёртв</div>}
              {player.votedFor && <div className="voted-badge">🗳️</div>}
            </div>
          ))}
        </div>
        
        {/* Действия */}
        <div className="game-actions">
          {/* Лобби */}
          {currentGame?.phase === 'lobby' && (
            <>
              <div className="lobby-info">
                Игроков: {currentGame.players.length}/10
                {currentGame.players.length < 4 && ` (минимум 4)`}
              </div>
              {currentGame.hostId === user.id ? (
                <button
                  className="action-btn start"
                  onClick={startGame}
                  disabled={currentGame.players.length < 4 || isLoading}
                >
                  🎮 Начать игру
                </button>
              ) : (
                <div className="waiting-host">Ожидание хоста...</div>
              )}
              <button className="action-btn leave" onClick={leaveGame}>
                Выйти
              </button>
            </>
          )}
          
          {/* Ночь */}
          {currentGame?.phase === 'night' && currentPlayer?.isAlive && (
            <>
              {currentPlayer.role === 'civilian' ? (
                <div className="night-wait">
                  😴 Вы мирный житель. Спите спокойно...
                  <button className="action-btn skip" onClick={skipNight}>
                    Пропустить ночь
                  </button>
                </div>
              ) : (
                <div className="night-action">
                  <p>
                    {currentPlayer.role === 'mafia' && '🔫 Выберите жертву для убийства'}
                    {currentPlayer.role === 'doctor' && '💊 Выберите игрока для спасения'}
                    {currentPlayer.role === 'commissioner' && '🕵️ Выберите игрока для проверки'}
                    {currentPlayer.role === 'lover' && '❤️ Ожидайте утра...'}
                  </p>
                  {currentPlayer.role !== 'lover' && (
                    <>
                      <button
                        className="action-btn confirm"
                        onClick={() => nightAction(selectedTarget)}
                        disabled={!selectedTarget || currentPlayer.nightAction}
                      >
                        Подтвердить
                      </button>
                      {currentPlayer.nightAction && <span className="action-done">✅ Действие выполнено</span>}
                    </>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* День */}
          {currentGame?.phase === 'day' && currentPlayer?.isAlive && (
            <div className="day-action">
              <p>🗳️ Голосуйте за игрока, которого хотите изгнать!</p>
              <button
                className="action-btn vote"
                onClick={() => vote(selectedTarget)}
                disabled={!selectedTarget || currentPlayer.votedFor}
              >
                Проголосовать
              </button>
              {currentPlayer.votedFor && (
                <span className="action-done">✅ Вы проголосовали</span>
              )}
            </div>
          )}
          
          {/* Мёртв */}
          {currentGame?.phase !== 'lobby' && currentGame?.phase !== 'ended' && !currentPlayer?.isAlive && (
            <div className="dead-notice">
              💀 Вы мертвы и наблюдаете за игрой...
            </div>
          )}
          
          {/* Конец игры */}
          {currentGame?.phase === 'ended' && (
            <button className="action-btn leave" onClick={leaveGame}>
              Выйти в лобби
            </button>
          )}
        </div>
        
        {/* Сообщения */}
        <div className="game-messages">
          <h4>📜 События</h4>
          <div className="messages-list">
            {currentGame?.messages.map((msg, i) => (
              <div key={i} className="message-item">{msg}</div>
            ))}
          </div>
        </div>
      </div>
      
      {notification && (
        <div className={`mafia-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
