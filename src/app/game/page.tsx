'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  User,
  getUser,
  updateUser,
  getStatusColor,
} from '@/lib/store';

// Символы для слотов
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🔔'];

// Коэффициенты выплат
const PAYOUTS: Record<string, number> = {
  '7️⃣': 10,
  '💎': 8,
  '⭐': 6,
  '🍇': 4,
  '🔔': 3,
  '🍊': 2,
  '🍋': 1.5,
  '🍒': 1.2,
};

// Размеры ставок в HP
const BET_SIZES = [5, 10, 25, 50, 100, 250];

export default function GamePage() {
  const router = useRouter();
  
  // Инициализация при первом рендере
  const [user, setUser] = useState<User | null>(() => getUser());
  const [hp, setHp] = useState(() => {
    const u = getUser();
    return u?.xp || 0;
  });
  const [bet, setBet] = useState(5);
  const [betIndex, setBetIndex] = useState(0);
  
  // Состояние барабанов
  const [reels, setReels] = useState<string[][]>([
    ['🍒', '🍋', '🍊'],
    ['🍒', '🍋', '🍊'],
    ['🍒', '🍋', '🍊'],
  ]);
  
  // Анимация
  const [spinning, setSpinning] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  
  // История
  const [history, setHistory] = useState<Array<{ result: string[]; win: number; bet: number }>>([]);

  // Синхронизация HP с localStorage
  useEffect(() => {
    const syncHp = () => {
      const currentUser = getUser();
      if (currentUser) {
        setHp(currentUser.xp || 0);
        setUser(currentUser);
      }
    };
    
    // Синхронизация при фокусе окна
    window.addEventListener('focus', syncHp);
    
    // Интервал синхронизации
    const interval = setInterval(syncHp, 5000);
    
    return () => {
      window.removeEventListener('focus', syncHp);
      clearInterval(interval);
    };
  }, []);

  // Переход на главный чат
  const goToMainChat = () => {
    router.push('/');
  };

  // Генерация случайного символа
  const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  // Проверка выигрыша
  const checkWin = (finalReels: string[][]): number => {
    const middleRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
    
    // Три одинаковых
    if (middleRow[0] === middleRow[1] && middleRow[1] === middleRow[2]) {
      return PAYOUTS[middleRow[0]] || 1;
    }
    
    // Два одинаковых
    if (middleRow[0] === middleRow[1] || middleRow[1] === middleRow[2] || middleRow[0] === middleRow[2]) {
      return 0.5;
    }
    
    return 0;
  };

  // Вращение
  const spin = () => {
    if (spinning || hp < bet) return;
    
    setSpinning(true);
    setShowWin(false);
    
    // Вычитаем ставку из HP
    const newHp = hp - bet;
    setHp(newHp);
    
    // Сохраняем в localStorage
    updateUser({ xp: newHp });
    
    // Анимация вращения
    const spinInterval = setInterval(() => {
      setReels(prev => prev.map(reel => 
        reel.map(() => getRandomSymbol())
      ));
    }, 100);
    
    // Остановка барабанов последовательно
    const stopTimes = [1000, 1500, 2000];
    const finalReels: string[][] = [[], [], []];
    
    stopTimes.forEach((time, index) => {
      setTimeout(() => {
        finalReels[index] = [
          getRandomSymbol(),
          getRandomSymbol(),
          getRandomSymbol(),
        ];
        setReels(prev => {
          const newReels = [...prev];
          newReels[index] = finalReels[index];
          return newReels;
        });
        
        if (index === 2) {
          clearInterval(spinInterval);
          setSpinning(false);
          
          // Проверка выигрыша
          const multiplier = checkWin(finalReels);
          const win = Math.floor(bet * multiplier);
          
          if (win > 0) {
            setTimeout(() => {
              const finalHp = newHp + win;
              setHp(finalHp);
              setWinAmount(win);
              setShowWin(true);
              
              // Обновление пользователя
              const updatedUser = updateUser({ xp: finalHp });
              setUser(updatedUser);
            }, 300);
          }
          
          // Добавление в историю
          const result = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
          setHistory(prev => [{
            result,
            win: win > 0 ? win - bet : -bet,
            bet,
          }, ...prev.slice(0, 9)]);
        }
      }, time);
    });
  };

  // Изменение ставки
  const changeBet = (direction: 'up' | 'down') => {
    const newIndex = direction === 'up' 
      ? Math.min(betIndex + 1, BET_SIZES.length - 1)
      : Math.max(betIndex - 1, 0);
    setBetIndex(newIndex);
    setBet(BET_SIZES[newIndex]);
  };

  const maxBet = () => {
    // Найти максимальную доступную ставку
    const availableBetIndex = BET_SIZES.findIndex(b => b > hp) - 1;
    const maxIndex = availableBetIndex >= 0 ? availableBetIndex : BET_SIZES.length - 1;
    setBetIndex(Math.max(0, maxIndex));
    setBet(BET_SIZES[Math.max(0, maxIndex)]);
  };

  if (!user) {
    return <div className="app-container">Загрузка...</div>;
  }

  return (
    <div className="app-container">
      <Header 
        nickname={user.nickname} 
        onlineCount={3} 
        onLogoClick={goToMainChat}
      />

      <div className="game-page">
        {/* Баланс HP */}
        <div className="balance-row">
          <div className="balance hp-balance">
            <span className="balance-icon">❤️</span>
            <span className="balance-value">{hp.toLocaleString()} HP</span>
          </div>
          <div className="hp-info">
            <span className="hp-label">Валюта из чата</span>
            <span className="hp-hint">Зарабатывайте HP в чате!</span>
          </div>
        </div>

        {/* Слот-машина */}
        <div className={`slot-machine ${showWin ? 'winning' : ''}`}>
          <div className="reels-container">
            {reels.map((reel, i) => (
              <div key={i} className="reel">
                <div className="reel-inner">
                  {reel.map((symbol, j) => (
                    <span 
                      key={j} 
                      className={`reel-symbol ${spinning ? 'spinning' : ''}`}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Выигрыш */}
          {showWin && (
            <div className="win-display">
              <div className="win-amount">+{winAmount} ❤️ HP</div>
              <div className="win-text">🎉 ВЫИГРЫШ!</div>
            </div>
          )}
        </div>

        {/* Управление ставками */}
        <div className="bet-controls">
          <button 
            className="bet-btn" 
            onClick={() => changeBet('down')}
            disabled={spinning || betIndex === 0}
          >
            ◀
          </button>
          
          <div className="bet-display">
            <div className="bet-label">СТАВКА HP</div>
            <div className="bet-amount">❤️ {bet}</div>
          </div>
          
          <button 
            className="bet-btn" 
            onClick={() => changeBet('up')}
            disabled={spinning || betIndex === BET_SIZES.length - 1 || BET_SIZES[betIndex + 1] > hp}
          >
            ▶
          </button>
          
          <button 
            className="bet-max-btn" 
            onClick={maxBet}
            disabled={spinning}
          >
            МАКС
          </button>
        </div>

        {/* Кнопка вращения */}
        <button 
          className={`spin-btn ${spinning ? 'spinning' : ''}`}
          onClick={spin}
          disabled={spinning || hp < bet}
        >
          {spinning ? (
            <>
              <span>🎰</span>
              <span>Вращение...</span>
            </>
          ) : hp < bet ? (
            <>
              <span>💔</span>
              <span>Недостаточно HP</span>
            </>
          ) : (
            <>
              <span>🎰</span>
              <span>КРУТИТЬ</span>
            </>
          )}
        </button>

        {/* Таблица выплат */}
        <div className="payout-table">
          <h3>💎 Выплаты (x от ставки)</h3>
          <div className="payout-row">
            <span className="payout-symbols">7️⃣ 7️⃣ 7️⃣</span>
            <span className="payout-value">x10</span>
          </div>
          <div className="payout-row">
            <span className="payout-symbols">💎 💎 💎</span>
            <span className="payout-value">x8</span>
          </div>
          <div className="payout-row">
            <span className="payout-symbols">⭐ ⭐ ⭐</span>
            <span className="payout-value">x6</span>
          </div>
          <div className="payout-row">
            <span className="payout-symbols">🍇 🍇 🍇</span>
            <span className="payout-value">x4</span>
          </div>
          <div className="payout-row">
            <span className="payout-symbols">🔔 🔔 🔔</span>
            <span className="payout-value">x3</span>
          </div>
          <div className="payout-row">
            <span className="payout-symbols">🍊 🍊 🍊</span>
            <span className="payout-value">x2</span>
          </div>
          <div className="payout-row small">
            <span className="payout-symbols">2 совпадения</span>
            <span className="payout-value">x0.5</span>
          </div>
        </div>

        {/* История */}
        {history.length > 0 && (
          <div className="history-section">
            <h3>📜 История</h3>
            <div className="history-list">
              {history.slice(0, 5).map((item, i) => (
                <div key={i} className={`history-item ${item.win > 0 ? 'win' : 'loss'}`}>
                  <span className="history-result">{item.result.join(' ')}</span>
                  <span className={`history-outcome ${item.win > 0 ? 'positive' : 'negative'}`}>
                    {item.win > 0 ? `+${item.win} HP` : `${item.win} HP`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Информация */}
        <div className="game-info">
          <p>❤️ HP = Experience Points из чата</p>
          <p>💬 Пишите в чате, чтобы заработать HP!</p>
        </div>
        
        {/* Кнопка возврата в чат */}
        <button className="back-to-chat-btn" onClick={goToMainChat}>
          ← Вернуться в чат
        </button>
      </div>
    </div>
  );
}
