'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { User, getUser, updateUser } from '@/lib/store';

// Типы ячеек цепи
interface ChainCell {
  id: number;
  level: number;
  buyPrice: number;
  payout: number;
  cooldownHours: number;
  firstParticipant?: { 
    userId: string; 
    nickname: string; 
    timestamp: number;
  };
  status: 'available' | 'waiting';
}

// Запись в истории
interface HistoryRecord {
  cell: number;
  winner: string;
  winnerId: string;
  amount: number;
  time: string;
  timestamp: number;
}

// Пользовательский кулдаун
interface UserCooldown {
  cellId: number;
  lastBuyTime: number;
}

// Статистика игры
interface GameStats {
  totalGames: number;
  totalPayouts: number;
  totalUsers: number;
}

// Статистика пользователя
interface UserStats {
  gamesPlayed: number;
  totalWon: number;
  lastWin: HistoryRecord | null;
}

export default function ChainGamePage() {
  const router = useRouter();
  const [user] = useState<User | null>(() => getUser());
  const [hp, setHp] = useState(() => getUser()?.xp || 0);
  const [cells, setCells] = useState<ChainCell[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [userCooldowns, setUserCooldowns] = useState<UserCooldown[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedCell, setSelectedCell] = useState<ChainCell | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [waitingModal, setWaitingModal] = useState<ChainCell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinModal, setShowWinModal] = useState<{ amount: number; cell: number } | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Воспроизвести звук выигрыша
  const playWinSound = () => {
    try {
      // Создаём простой звук через Web Audio API
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Создаём осциллятор для звука победы
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Игнорируем ошибки аудио
    }
  };

  // Показать конфетти
  const triggerConfetti = () => {
    setShowConfetti(true);
    playWinSound();
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Загрузка состояния с сервера
  const fetchGameState = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_state',
          userId: user.id,
          userName: user.nickname,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCells(data.cells);
        setHistory(data.history);
        setUserCooldowns(data.userCooldowns || []);
        setGameStats(data.stats || null);
        setLastUpdate(data.lastUpdate);
        lastUpdateRef.current = data.lastUpdate;
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Загрузка статистики пользователя
  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_stats',
          userId: user.id,
          userName: user.nickname,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  }, [user]);

  // Polling для синхронизации
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      if (!user) return;
      
      try {
        // Проверяем обновления
        const response = await fetch(`/api/chain?userId=${user.id}&since=${lastUpdateRef.current}`);
        const data = await response.json();
        
        if (data.success && data.updated) {
          setCells(data.cells);
          setHistory(data.history);
          setUserCooldowns(data.userCooldowns || []);
          setGameStats(data.stats || null);
          setLastUpdate(data.lastUpdate);
          lastUpdateRef.current = data.lastUpdate;
          
          // Проверяем, выиграл ли пользователь
          if (data.history && data.history.length > 0) {
            const lastWin = data.history[0];
            if (lastWin.winnerId === user.id && Date.now() - lastWin.timestamp < 5000) {
              // Недавний выигрыш!
              triggerConfetti();
              setShowWinModal({ amount: lastWin.amount, cell: lastWin.cell });
              fetchUserStats();
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Каждые 3 секунды
  }, [user, fetchUserStats]);

  // Инициализация
  useEffect(() => {
    fetchGameState();
    fetchUserStats();
    startPolling();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchGameState, fetchUserStats, startPolling]);

  // Проверка кулдауна для пользователя
  const getUserCooldownRemaining = useCallback((cellId: number): number => {
    const cooldown = userCooldowns.find(c => c.cellId === cellId);
    if (!cooldown) return 0;
    
    const cell = cells.find(c => c.id === cellId);
    if (!cell) return 0;
    
    const elapsed = Date.now() - cooldown.lastBuyTime;
    const remaining = (cell.cooldownHours * 60 * 60 * 1000) - elapsed;
    
    return Math.max(0, remaining);
  }, [userCooldowns, cells]);

  // Форматирование времени
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Доступно';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м ${seconds}с`;
  };

  // Показать уведомление
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Проверить доступность ячейки для пользователя
  const isCellAvailableForUser = (cell: ChainCell): boolean => {
    const cooldown = getUserCooldownRemaining(cell.id);
    return cooldown <= 0;
  };

  // Купить ячейку
  const buyCell = (cell: ChainCell) => {
    if (!user) {
      showNotification('error', 'Необходимо войти в систему!');
      return;
    }
    
    if (hp < cell.buyPrice) {
      showNotification('error', `Недостаточно HP! Нужно: ${cell.buyPrice}, у вас: ${hp}`);
      return;
    }

    if (!isCellAvailableForUser(cell)) {
      const remaining = getUserCooldownRemaining(cell.id);
      showNotification('error', `Ячейка доступна через ${formatTimeRemaining(remaining)}`);
      return;
    }

    setSelectedCell(cell);
    setShowConfirm(true);
  };

  // Подтвердить покупку
  const confirmBuy = async () => {
    if (!user || !selectedCell) return;

    try {
      const response = await fetch('/api/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy_cell',
          userId: user.id,
          userName: user.nickname,
          cellId: selectedCell.id,
          userHp: hp,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        showNotification('error', data.error || 'Ошибка покупки');
        return;
      }
      
      // Вычитаем HP локально
      const newHp = hp - selectedCell.buyPrice;
      setHp(newHp);
      updateUser({ xp: newHp });
      
      // Обновляем состояние
      if (data.cells) {
        setCells(data.cells);
      }
      if (data.history) {
        setHistory(data.history);
      }
      if (data.stats) {
        setGameStats(data.stats);
      }
      if (data.lastUpdate) {
        setLastUpdate(data.lastUpdate);
        lastUpdateRef.current = data.lastUpdate;
      }
      
      // Обновляем кулдауны и статистику
      fetchGameState();
      fetchUserStats();
      
      if (data.action === 'payout') {
        // Был произведён выигрыш
        if (data.isWinner) {
          // Текущий пользователь выиграл!
          const winnerHp = newHp + data.payout;
          setHp(winnerHp);
          updateUser({ xp: winnerHp });
          
          // Показываем модалку выигрыша
          triggerConfetti();
          setShowWinModal({ amount: data.payout, cell: selectedCell.level });
        } else {
          // Текущий пользователь стал вторым
          showNotification('info', data.message);
        }
      } else if (data.action === 'waiting') {
        // Первый участник
        showNotification('info', data.message);
        setWaitingModal(selectedCell);
      }
      
    } catch (error) {
      console.error('Buy error:', error);
      showNotification('error', 'Ошибка соединения');
    } finally {
      setShowConfirm(false);
      setSelectedCell(null);
    }
  };

  const goToMainChat = () => {
    router.push('/');
  };

  if (!user || isLoading) {
    return <div className="app-container">Загрузка игры...</div>;
  }

  return (
    <div className="app-container">
      <Header 
        nickname={user.nickname} 
        onlineCount={1} 
        onLogoClick={goToMainChat}
      />

      <div className="chain-page">
        {/* Заголовок */}
        <div className="chain-header">
          <h1>⛓️ Игра Цепь</h1>
          <p>Покупайте ячейки и выигрывайте 150%!</p>
        </div>

        {/* Баланс и статистика */}
        <div className="chain-balance-row">
          <div className="chain-balance">
            <span className="balance-icon">❤️</span>
            <span className="balance-value">{hp.toLocaleString()} HP</span>
          </div>
          <button className="stats-btn" onClick={() => setShowStats(true)}>
            📊 Статистика
          </button>
        </div>

        {/* Информация о механике */}
        <div className="chain-info">
          <div className="info-item">
            <span className="info-icon">💰</span>
            <span>Выплата: 150%</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⏱️</span>
            <span>Комиссия: 30%</span>
          </div>
        </div>

        {/* Онлайн статус */}
        <div className="chain-online">
          <span className="online-dot"></span>
          <span>Синхронизация активна</span>
          {gameStats && (
            <span className="online-users">
              • {gameStats.totalUsers} игроков
            </span>
          )}
        </div>

        {/* Сетка ячеек */}
        <div className="chain-cells">
          {cells.map(cell => {
            const cooldownRemaining = getUserCooldownRemaining(cell.id);
            const isOnCooldown = cooldownRemaining > 0;
            
            return (
              <div 
                key={cell.id}
                className={`chain-cell ${cell.status} ${isOnCooldown ? 'cooldown' : ''}`}
                onClick={() => buyCell(cell)}
              >
                <div className="cell-level">Уровень {cell.level}</div>
                <div className="cell-price">💰 {cell.buyPrice.toLocaleString()} HP</div>
                <div className="cell-payout">💳 Выплата: {cell.payout.toLocaleString()} HP</div>
                <div className="cell-cooldown">
                  ⏱️ Кулдаун: {cell.cooldownHours}ч
                </div>
                
                {/* Статус ожидания */}
                {cell.status === 'waiting' && cell.firstParticipant && (
                  <div className="cell-waiting">
                    <div className="waiting-animation">
                      <span className="waiting-dot"></span>
                      <span className="waiting-dot"></span>
                      <span className="waiting-dot"></span>
                    </div>
                    <div className="waiting-text">
                      {cell.firstParticipant.nickname === user.nickname 
                        ? 'Ожидание игрока...' 
                        : `Игрок: ${cell.firstParticipant.nickname.slice(0, 10)}...`}
                    </div>
                    {cell.firstParticipant.nickname === user.nickname && (
                      <div className="waiting-hint">
                        Вы получите {cell.payout} HP!
                      </div>
                    )}
                  </div>
                )}

                {/* Кулдаун пользователя */}
                {isOnCooldown && (
                  <div className="cell-user-cooldown">
                    🔒 Доступно через: {formatTimeRemaining(cooldownRemaining)}
                  </div>
                )}

                {/* Доступно */}
                {cell.status === 'available' && !isOnCooldown && (
                  <div className="cell-available">
                    ✅ Доступно для покупки
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* История */}
        {history.length > 0 && (
          <div className="chain-history">
            <h3>📜 История выплат</h3>
            <div className="history-list">
              {history.slice(0, 10).map((item, i) => (
                <div key={i} className={`history-item ${item.winnerId === user.id ? 'own-win' : ''}`}>
                  <span className="history-cell">#{item.cell}</span>
                  <span className="history-winner">🏆 {item.winner}</span>
                  <span className="history-amount">+{item.amount.toLocaleString()} HP</span>
                  <span className="history-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Правила */}
        <div className="chain-rules">
          <h3>📋 Как это работает</h3>
          <ul>
            <li><strong>Покупка:</strong> Оплатите ячейку, чтобы занять место</li>
            <li><strong>Ожидание:</strong> Дождитесь второго участника</li>
            <li><strong>Выплата:</strong> Получите 150% от своей ставки!</li>
            <li><strong>Мультиплеер:</strong> Игра синхронизирована между всеми!</li>
          </ul>
          <div className="rules-example">
            <h4>Пример для ячейки 100 HP:</h4>
            <div className="example-flow">
              <div className="flow-step">
                <span className="step-num">1</span>
                <span>Платите 100 HP</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">2</span>
                <span>Игрок покупает</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">3</span>
                <span>Получаете 150 HP!</span>
              </div>
            </div>
          </div>
        </div>

        <button className="back-to-chat-btn" onClick={goToMainChat}>
          ← Вернуться в чат
        </button>
      </div>

      {/* Модальное окно подтверждения */}
      {showConfirm && selectedCell && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content chain-modal" onClick={e => e.stopPropagation()}>
            <h3>⛓️ Подтверждение</h3>
            <div className="modal-cell-info">
              <div className="modal-cell-level">Уровень {selectedCell.level}</div>
              <div className="modal-cell-price">💰 {selectedCell.buyPrice.toLocaleString()} HP</div>
            </div>
            <div className="modal-details">
              <div className="detail-row">
                <span>Ставка:</span>
                <strong>{selectedCell.buyPrice.toLocaleString()} HP</strong>
              </div>
              <div className="detail-row highlight">
                <span>Выигрыш:</span>
                <strong className="payout">+{selectedCell.payout.toLocaleString()} HP</strong>
              </div>
              <div className="detail-row">
                <span>Кулдаун:</span>
                <strong>{selectedCell.cooldownHours}ч</strong>
              </div>
              <div className="detail-row">
                <span>Баланс:</span>
                <strong>{hp.toLocaleString()} HP</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowConfirm(false)}>Отмена</button>
              <button className="modal-btn confirm" onClick={confirmBuy}>
                Купить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно ожидания */}
      {waitingModal && (
        <div className="modal-overlay" onClick={() => setWaitingModal(null)}>
          <div className="modal-content waiting-modal" onClick={e => e.stopPropagation()}>
            <div className="waiting-icon">
              <span className="chain-spinner"></span>
            </div>
            <h3>⏳ Ожидание игрока</h3>
            <p>Ячейка #{waitingModal.level}</p>
            <div className="waiting-details">
              <div>Ставка: {waitingModal.buyPrice.toLocaleString()} HP</div>
              <div className="payout-info">Выигрыш: {waitingModal.payout.toLocaleString()} HP</div>
            </div>
            <div className="waiting-animation-large">
              <span className="waiting-dot"></span>
              <span className="waiting-dot"></span>
              <span className="waiting-dot"></span>
            </div>
            <button className="modal-btn confirm" onClick={() => setWaitingModal(null)}>
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно выигрыша */}
      {showWinModal && (
        <div className="modal-overlay win-overlay" onClick={() => setShowWinModal(null)}>
          <div className="modal-content win-modal" onClick={e => e.stopPropagation()}>
            <div className="win-icon">🎉</div>
            <h2>ПОБЕДА!</h2>
            <div className="win-amount">+{showWinModal.amount.toLocaleString()} HP</div>
            <p>Ячейка #{showWinModal.cell}</p>
            <button className="modal-btn confirm win-btn" onClick={() => setShowWinModal(null)}>
              Отлично!
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно статистики */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal-content stats-modal" onClick={e => e.stopPropagation()}>
            <div className="stats-header">
              <h3>📊 Статистика</h3>
              <button className="stats-close" onClick={() => setShowStats(false)}>✕</button>
            </div>
            
            {/* Личная статистика */}
            {userStats && (
              <div className="stats-section">
                <h4>👤 Ваша статистика</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{userStats.gamesPlayed}</div>
                    <div className="stat-label">Игр сыграно</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{userStats.totalWon.toLocaleString()}</div>
                    <div className="stat-label">HP выиграно</div>
                  </div>
                </div>
                {userStats.lastWin && (
                  <div className="last-win">
                    <span>Последний выигрыш: </span>
                    <span className="last-win-amount">+{userStats.lastWin.amount} HP</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Общая статистика */}
            {gameStats && (
              <div className="stats-section">
                <h4>🌐 Общая статистика</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{gameStats.totalGames}</div>
                    <div className="stat-label">Всего игр</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{gameStats.totalPayouts.toLocaleString()}</div>
                    <div className="stat-label">HP выплачено</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{gameStats.totalUsers}</div>
                    <div className="stat-label">Игроков</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Конфетти */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#8b5cf6'][Math.floor(Math.random() * 7)],
              }}
            />
          ))}
        </div>
      )}

      {/* Уведомление */}
      {notification && (
        <div className={`chain-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
