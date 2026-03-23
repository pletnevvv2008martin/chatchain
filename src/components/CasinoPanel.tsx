'use client';

import { useState, useEffect } from 'react';

interface CasinoPanelProps {
  userId: string;
  onClose: () => void;
  onXpChange: (amount: number) => void;
}

export default function CasinoPanel({ userId, onClose, onXpChange }: CasinoPanelProps) {
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({ totalBet: 0, totalWin: 0, gamesPlayed: 0 });
  const [bet, setBet] = useState(10);
  const [activeGame, setActiveGame] = useState<'slots' | 'coinflip' | 'dice' | 'wheel' | null>(null);
  const [result, setResult] = useState<{ result: string; win: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotsDisplay, setSlotsDisplay] = useState(['❓', '❓', '❓']);
  const [coinflipChoice, setCoinflipChoice] = useState<'heads' | 'tails'>('heads');
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadBalance = async () => {
      try {
        const res = await fetch('/api/casino', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_balance', userId }),
        });
        const data = await res.json();
        if (mounted && data.success) {
          setBalance(data.balance);
          setStats(data.stats);
        }
      } catch (e) {
        console.error('Failed to fetch balance', e);
      }
    };
    
    loadBalance();
    return () => { mounted = false; };
  }, [userId]);

  const playGame = async (game: 'slots' | 'coinflip' | 'dice' | 'wheel') => {
    if (bet <= 0 || bet > balance) return;

    setLoading(true);
    setResult(null);
    setSpinning(true);

    try {
      const res = await fetch('/api/casino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: game,
          userId,
          bet,
          choice: coinflipChoice,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setBalance(data.newBalance);
        setStats(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          totalBet: prev.totalBet + bet,
          totalWin: prev.totalWin + data.win,
        }));

        if (game === 'slots') {
          // Анимация слотов
          const spinInterval = setInterval(() => {
            const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];
            setSlotsDisplay([
              symbols[Math.floor(Math.random() * symbols.length)],
              symbols[Math.floor(Math.random() * symbols.length)],
              symbols[Math.floor(Math.random() * symbols.length)],
            ]);
          }, 100);

          setTimeout(() => {
            clearInterval(spinInterval);
            setSlotsDisplay(data.symbols);
            setResult({ result: data.result, win: data.win });
            setSpinning(false);
          }, 1500);
        } else {
          setResult({ result: data.result, win: data.win });
          setSpinning(false);
        }

        if (data.win > 0) {
          onXpChange(data.win);
        }
      }
    } catch (e) {
      console.error('Game error', e);
      setSpinning(false);
    }

    setLoading(false);
  };

  const addBalance = async () => {
    try {
      const res = await fetch('/api/casino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_balance', userId, amount: 50 }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.newBalance);
      }
    } catch (e) {
      console.error('Add balance error', e);
    }
  };

  return (
    <div className="casino-overlay" onClick={onClose}>
      <div className="casino-panel" onClick={e => e.stopPropagation()}>
        <div className="casino-header">
          <h2>🎰 Казино</h2>
          <button className="casino-close" onClick={onClose}>✕</button>
        </div>

        <div className="casino-balance">
          <div className="balance-display">
            <span className="balance-icon">💰</span>
            <span className="balance-amount">{balance} XP</span>
          </div>
          <button className="add-balance-btn" onClick={addBalance}>
            +50 XP (бесплатно)
          </button>
        </div>

        <div className="casino-stats">
          <div className="stat">
            <span className="stat-label">Игр:</span>
            <span className="stat-value">{stats.gamesPlayed}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Ставок:</span>
            <span className="stat-value">{stats.totalBet}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Выигрышей:</span>
            <span className="stat-value">{stats.totalWin}</span>
          </div>
        </div>

        <div className="bet-controls">
          <label>Ставка:</label>
          <div className="bet-buttons">
            {[5, 10, 25, 50, 100].map(amount => (
              <button
                key={amount}
                className={`bet-btn ${bet === amount ? 'active' : ''}`}
                onClick={() => setBet(amount)}
                disabled={amount > balance}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="games-grid">
          {/* Slots */}
          <div className={`game-card ${activeGame === 'slots' ? 'active' : ''}`}>
            <h3>🎰 Слоты</h3>
            <div className="slots-display">
              {slotsDisplay.map((s, i) => (
                <span key={i} className={`slot-symbol ${spinning ? 'spinning' : ''}`}>{s}</span>
              ))}
            </div>
            <button
              className="play-btn"
              onClick={() => { setActiveGame('slots'); playGame('slots'); }}
              disabled={loading || bet > balance}
            >
              Крутить!
            </button>
          </div>

          {/* Coinflip */}
          <div className={`game-card ${activeGame === 'coinflip' ? 'active' : ''}`}>
            <h3>🪙 Монетка</h3>
            <div className="coinflip-choices">
              <button
                className={`choice-btn ${coinflipChoice === 'heads' ? 'active' : ''}`}
                onClick={() => setCoinflipChoice('heads')}
              >
                🦅 Орёл
              </button>
              <button
                className={`choice-btn ${coinflipChoice === 'tails' ? 'active' : ''}`}
                onClick={() => setCoinflipChoice('tails')}
              >
                🪙 Решка
              </button>
            </div>
            <button
              className="play-btn"
              onClick={() => { setActiveGame('coinflip'); playGame('coinflip'); }}
              disabled={loading || bet > balance}
            >
              Подбросить!
            </button>
          </div>

          {/* Dice */}
          <div className={`game-card ${activeGame === 'dice' ? 'active' : ''}`}>
            <h3>🎲 Кости</h3>
            <p className="game-rules">
              Дубль = x2, 6-6 = x5, Сумма 7 = x1.5
            </p>
            <button
              className="play-btn"
              onClick={() => { setActiveGame('dice'); playGame('dice'); }}
              disabled={loading || bet > balance}
            >
              Бросить!
            </button>
          </div>

          {/* Wheel */}
          <div className={`game-card ${activeGame === 'wheel' ? 'active' : ''}`}>
            <h3>🎡 Колесо</h3>
            <p className="game-rules">
              x0.5 → x10 ДЖЕКПОТ!
            </p>
            <button
              className="play-btn"
              onClick={() => { setActiveGame('wheel'); playGame('wheel'); }}
              disabled={loading || bet > balance}
            >
              Крутить!
            </button>
          </div>
        </div>

        {result && (
          <div className={`game-result ${result.win > 0 ? 'win' : 'lose'}`}>
            <span className="result-text">{result.result}</span>
            {result.win > 0 && <span className="win-amount">+{result.win} XP!</span>}
          </div>
        )}
      </div>
    </div>
  );
}
