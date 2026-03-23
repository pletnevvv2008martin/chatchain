'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import {
  User,
  getUser,
  updateUser,
} from '@/lib/store';

// Типы для покера
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface PokerPlayer {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  folded: boolean;
  isBot: boolean;
  isAllIn: boolean;
}

interface PokerTable {
  id: string;
  name: string;
  minBuyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  blinds: { small: number; big: number };
}

// Колоды и карты
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Создание колоды
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

// Перемешивание колоды
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Оценка руки (упрощенная)
const evaluateHand = (cards: Card[]): { rank: number; name: string } => {
  const rankValues: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  
  const values = cards.map(c => rankValues[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  const uniqueValues = [...new Set(values)];
  let isStraight = false;
  if (uniqueValues.length >= 5) {
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        isStraight = true;
        break;
      }
    }
  }
  
  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countValues = Object.values(counts).sort((a, b) => b - a);
  
  if (isFlush && isStraight) return { rank: 8, name: 'Стрит-флеш!' };
  if (countValues[0] === 4) return { rank: 7, name: 'Каре!' };
  if (countValues[0] === 3 && countValues[1] === 2) return { rank: 6, name: 'Фулл-хаус!' };
  if (isFlush) return { rank: 5, name: 'Флеш!' };
  if (isStraight) return { rank: 4, name: 'Стрит!' };
  if (countValues[0] === 3) return { rank: 3, name: 'Сет!' };
  if (countValues[0] === 2 && countValues[1] === 2) return { rank: 2, name: 'Две пары!' };
  if (countValues[0] === 2) return { rank: 1, name: 'Пара' };
  return { rank: 0, name: 'Старшая карта' };
};

// Столы для покера
const POKER_TABLES: PokerTable[] = [
  { id: '1', name: 'Новичковый стол', minBuyIn: 50, maxPlayers: 6, currentPlayers: 2, blinds: { small: 5, big: 10 } },
  { id: '2', name: 'Средний уровень', minBuyIn: 100, maxPlayers: 6, currentPlayers: 4, blinds: { small: 10, big: 20 } },
  { id: '3', name: 'Высокие ставки', minBuyIn: 500, maxPlayers: 4, currentPlayers: 1, blinds: { small: 25, big: 50 } },
];

// Имена ботов
const BOT_NAMES = ['Александр', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена', 'Максим', 'Ольга'];

export default function PokerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => getUser());
  const [isRegistered, setIsRegistered] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // HP из чата
  const [hp, setHp] = useState(() => {
    const u = getUser();
    return u?.xp || 0;
  });
  
  // Состояние игры
  const [currentTable, setCurrentTable] = useState<PokerTable | null>(null);
  const [gamePhase, setGamePhase] = useState<'lobby' | 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('lobby');
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [winner, setWinner] = useState<PokerPlayer | null>(null);
  const [winningHand, setWinningHand] = useState('');

  // Refs для доступа к текущим значениям в callbacks
  const playersRef = useRef<PokerPlayer[]>(players);
  const currentBetRef = useRef(currentBet);
  const potRef = useRef(pot);
  const gamePhaseRef = useRef(gamePhase);
  const deckRef = useRef(deck);
  const hpRef = useRef(hp);
  const currentTableRef = useRef(currentTable);

  useEffect(() => {
    playersRef.current = players;
    currentBetRef.current = currentBet;
    potRef.current = pot;
    gamePhaseRef.current = gamePhase;
    deckRef.current = deck;
    hpRef.current = hp;
    currentTableRef.current = currentTable;
  }, [players, currentBet, pot, gamePhase, deck, hp, currentTable]);

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

  // Переход на главный чат
  const goToMainChat = () => {
    router.push('/');
  };

  // Завершение раздачи
  const endHand = useCallback((winnerPlayer: PokerPlayer, handName: string = '') => {
    setWinner(winnerPlayer);
    setWinningHand(handName);
    
    const currentPot = potRef.current;
    const currentHp = hpRef.current;
    
    // Обновляем фишки победителя
    setPlayers(prev => prev.map(p => 
      p.id === winnerPlayer.id ? { ...p, chips: p.chips + currentPot } : p
    ));
    
    // Если это игрок - обновляем HP
    if (!winnerPlayer.isBot) {
      const newHp = currentHp + currentPot;
      setHp(newHp);
      updateUser({ xp: newHp });
    }
    
    setGamePhase('showdown');
  }, []);

  // Определение победителя
  const determineWinner = useCallback(() => {
    const currentPlayers = playersRef.current;
    const currentCommunityCards = communityCards;
    
    const activePlayers = currentPlayers.filter(p => !p.folded);
    let bestHand = { rank: -1, name: '' };
    let bestPlayer: PokerPlayer | null = null;
    
    activePlayers.forEach(player => {
      const allCards = [...player.cards, ...currentCommunityCards];
      const hand = evaluateHand(allCards);
      
      if (hand.rank > bestHand.rank) {
        bestHand = hand;
        bestPlayer = player;
      }
    });
    
    if (bestPlayer) {
      endHand(bestPlayer, bestHand.name);
    }
  }, [communityCards, endHand]);

  // Переход к следующей фазе
  const advancePhase = useCallback(() => {
    const currentGamePhase = gamePhaseRef.current;
    const currentDeck = deckRef.current;
    
    const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
    const currentIndex = phases.indexOf(currentGamePhase as any);
    
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      setGamePhase(nextPhase);
      
      // Сброс ставок
      setPlayers(prev => prev.map(p => ({ ...p, bet: 0 })));
      setCurrentBet(0);
      setCurrentPlayerIndex(0);
      
      // Раздача карт
      if (nextPhase === 'flop') {
        const flop = [currentDeck[currentDeck.length - 1], currentDeck[currentDeck.length - 2], currentDeck[currentDeck.length - 3]];
        setCommunityCards(flop);
      } else if (nextPhase === 'turn') {
        setCommunityCards(prev => [...prev, currentDeck[currentDeck.length - 4]]);
      } else if (nextPhase === 'river') {
        setCommunityCards(prev => [...prev, currentDeck[currentDeck.length - 5]]);
      } else if (nextPhase === 'showdown') {
        setTimeout(() => determineWinner(), 500);
      }
    }
  }, [determineWinner]);

  // Переход к следующему игроку
  const moveToNextPlayer = useCallback((fromIndex: number) => {
    const currentPlayers = playersRef.current;
    const bet = currentBetRef.current;
    
    let nextIndex = (fromIndex + 1) % currentPlayers.length;
    let attempts = 0;
    
    while (attempts < currentPlayers.length) {
      const nextPlayer = currentPlayers[nextIndex];
      if (nextPlayer && !nextPlayer.folded && !nextPlayer.isAllIn) {
        break;
      }
      nextIndex = (nextIndex + 1) % currentPlayers.length;
      attempts++;
    }
    
    // Проверяем, закончился ли раунд
    const activePlayers = currentPlayers.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      endHand(activePlayers[0]);
      return;
    }
    
    // Проверяем, все ли сравнялись
    const allMatched = activePlayers.every(p => p.bet === bet || p.isAllIn);
    if (allMatched && nextIndex === 0) {
      advancePhase();
      return;
    }
    
    setCurrentPlayerIndex(nextIndex);
  }, [endHand, advancePhase]);

  // Бот делает ход
  const botAction = useCallback((botIndex: number) => {
    const currentPlayers = playersRef.current;
    const table = currentTableRef.current;
    const bet = currentBetRef.current;
    
    const bot = currentPlayers[botIndex];
    if (!bot || bot.folded || bot.isAllIn) return;
    
    const callAmount = bet - bot.bet;
    const random = Math.random();
    
    if (callAmount === 0) {
      // Можно чекнуть
      if (random > 0.7) {
        // Рейз
        const raiseAmt = (table?.blinds.big || 10) * 2;
        if (bot.chips >= raiseAmt) {
          setPlayers(prev => prev.map((p, i) => 
            i === botIndex ? { ...p, chips: p.chips - raiseAmt, bet: p.bet + raiseAmt } : p
          ));
          setPot(prev => prev + raiseAmt);
          setCurrentBet(prev => prev + raiseAmt);
        }
      }
    } else {
      if (random > 0.3 && bot.chips >= callAmount) {
        // Колл
        setPlayers(prev => prev.map((p, i) => 
          i === botIndex ? { ...p, chips: p.chips - callAmount, bet: bet } : p
        ));
        setPot(prev => prev + callAmount);
      } else if (random > 0.6 && bot.chips >= callAmount * 2) {
        // Рейз
        const raiseAmt = callAmount + (table?.blinds.big || 10);
        setPlayers(prev => prev.map((p, i) => 
          i === botIndex ? { ...p, chips: p.chips - raiseAmt, bet: p.bet + raiseAmt } : p
        ));
        setPot(prev => prev + raiseAmt);
        setCurrentBet(prev => prev + raiseAmt);
      } else {
        // Фолд
        setPlayers(prev => prev.map((p, i) => 
          i === botIndex ? { ...p, folded: true } : p
        ));
      }
    }
    
    setTimeout(() => {
      moveToNextPlayer(botIndex);
    }, 1000);
  }, [moveToNextPlayer]);

  // Начало новой игры
  const startNewHand = useCallback(() => {
    if (players.length < 2) return;
    
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck);
    
    const table = currentTableRef.current;
    const sbAmount = table?.blinds.small || 5;
    const bbAmount = table?.blinds.big || 10;
    
    // Сброс состояния игроков
    setPlayers(prev => {
      const resetPlayers = prev.map(p => ({
        ...p,
        cards: [],
        bet: 0,
        folded: false,
        isAllIn: false,
      }));
      
      // Раздача карт
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < resetPlayers.length; j++) {
          resetPlayers[j].cards.push(newDeck.pop()!);
        }
      }
      
      // Блайнды
      resetPlayers[0].chips -= sbAmount;
      resetPlayers[0].bet = sbAmount;
      if (resetPlayers[1]) {
        resetPlayers[1].chips -= bbAmount;
        resetPlayers[1].bet = bbAmount;
      }
      
      return resetPlayers;
    });
    
    setPot(sbAmount + bbAmount);
    setCurrentBet(bbAmount);
    setCurrentPlayerIndex(2 % players.length);
    setCommunityCards([]);
    setWinner(null);
    setWinningHand('');
    setGamePhase('preflop');
    setRaiseAmount(bbAmount * 2);
  }, [players.length]);

  // Присоединение к столу
  const joinTable = (table: PokerTable) => {
    if (hp < table.minBuyIn) {
      alert(`Недостаточно HP для входа. Минимум: ${table.minBuyIn} HP`);
      return;
    }
    
    setCurrentTable(table);
    setGamePhase('waiting');
    
    const botCount = Math.floor(Math.random() * 3) + 2;
    const shuffledBotNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    
    const newPlayers: PokerPlayer[] = [
      {
        id: user?.id || 'player',
        name: user?.nickname || 'Игрок',
        chips: table.minBuyIn,
        cards: [],
        bet: 0,
        folded: false,
        isBot: false,
        isAllIn: false,
      },
    ];
    
    for (let i = 0; i < botCount; i++) {
      newPlayers.push({
        id: `bot-${i}`,
        name: shuffledBotNames[i],
        chips: table.minBuyIn,
        cards: [],
        bet: 0,
        folded: false,
        isBot: true,
        isAllIn: false,
      });
    }
    
    setPlayers(newPlayers);
    setMyPlayerIndex(0);
  };

  // Действия игрока
  const playerFold = () => {
    setPlayers(prev => prev.map((p, i) => 
      i === myPlayerIndex ? { ...p, folded: true } : p
    ));
    moveToNextPlayer(myPlayerIndex);
  };

  const playerCheck = () => {
    if (currentBet > players[myPlayerIndex].bet) return;
    moveToNextPlayer(myPlayerIndex);
  };

  const playerCall = () => {
    const callAmount = currentBet - players[myPlayerIndex].bet;
    if (callAmount <= 0 || players[myPlayerIndex].chips < callAmount) return;
    
    setPlayers(prev => prev.map((p, i) => 
      i === myPlayerIndex ? { ...p, chips: p.chips - callAmount, bet: currentBet } : p
    ));
    setPot(prev => prev + callAmount);
    
    const newHp = hp - callAmount;
    setHp(newHp);
    updateUser({ xp: newHp });
    
    moveToNextPlayer(myPlayerIndex);
  };

  const playerRaise = () => {
    const myPlayer = players[myPlayerIndex];
    const totalBet = raiseAmount;
    const additionalBet = totalBet - myPlayer.bet;
    
    if (myPlayer.chips < additionalBet || additionalBet <= 0) return;
    
    setPlayers(prev => prev.map((p, i) => 
      i === myPlayerIndex ? { ...p, chips: p.chips - additionalBet, bet: totalBet } : p
    ));
    setPot(prev => prev + additionalBet);
    setCurrentBet(totalBet);
    
    const newHp = hp - additionalBet;
    setHp(newHp);
    updateUser({ xp: newHp });
    
    moveToNextPlayer(myPlayerIndex);
  };

  const playerAllIn = () => {
    const myPlayer = players[myPlayerIndex];
    const allInAmount = myPlayer.chips;
    
    setPlayers(prev => prev.map((p, i) => 
      i === myPlayerIndex ? { ...p, chips: 0, bet: p.bet + allInAmount, isAllIn: true } : p
    ));
    setPot(prev => prev + allInAmount);
    setCurrentBet(prev => Math.max(prev, myPlayer.bet + allInAmount));
    
    const newHp = hp - allInAmount;
    setHp(newHp);
    updateUser({ xp: newHp });
    
    moveToNextPlayer(myPlayerIndex);
  };

  // Выход из игры
  const leaveTable = () => {
    setCurrentTable(null);
    setGamePhase('lobby');
    setPlayers([]);
    setCommunityCards([]);
    setPot(0);
  };

  // Рендер карты
  const renderCard = (card: Card | null, hidden: boolean = false) => {
    if (hidden) {
      return (
        <div className="poker-card hidden">
          <span>?</span>
        </div>
      );
    }
    
    if (!card) return null;
    
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    
    return (
      <div className={`poker-card ${isRed ? 'red' : 'black'}`}>
        <span>{card.rank}</span>
        <span>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    );
  };

  // Эффект для бота - делаем ход когда его очередь
  useEffect(() => {
    if (gamePhase !== 'showdown' && currentPlayerIndex !== myPlayerIndex && players[currentPlayerIndex]?.isBot && !players[currentPlayerIndex]?.folded) {
      const timer = setTimeout(() => {
        botAction(currentPlayerIndex);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, gamePhase, players, myPlayerIndex, botAction]);

  // Если не зарегистрирован
  if (!isRegistered) {
    return (
      <div className="app-container">
        <Header 
          nickname={user?.nickname} 
          onLogoClick={goToMainChat}
        />
        
        <div className="poker-page">
          <div className="registration-required">
            <h2>🔐 Требуется регистрация</h2>
            <p>
              Игра в покер доступна только зарегистрированным пользователям. 
              Зарегистрируйтесь, чтобы получить доступ к игре и использовать 
              заработанные HP в качестве валюты.
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
            onSuccess={(authUser) => {
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

      <div className="poker-page">
        {/* Баланс HP */}
        <div className="balance-row">
          <div className="balance hp-balance">
            <span className="balance-icon">❤️</span>
            <span className="balance-value">{hp.toLocaleString()} HP</span>
          </div>
        </div>

        {/* Лобби */}
        {gamePhase === 'lobby' && (
          <div className="poker-lobby">
            <div className="poker-lobby-header">
              <h2>🃏 Выберите стол</h2>
            </div>
            
            <div className="poker-tables">
              {POKER_TABLES.map(table => (
                <div key={table.id} className={`poker-table-card ${table.currentPlayers >= table.maxPlayers ? 'full' : ''}`}>
                  <div className="poker-table-name">{table.name}</div>
                  <div className="poker-table-info">
                    <span>Вход: {table.minBuyIn} HP</span>
                    <span>{table.currentPlayers}/{table.maxPlayers} игроков</span>
                  </div>
                  <div className="poker-table-info">
                    <span>Блайнды: {table.blinds.small}/{table.blinds.big}</span>
                  </div>
                  <button 
                    className="poker-table-join"
                    onClick={() => joinTable(table)}
                    disabled={hp < table.minBuyIn || table.currentPlayers >= table.maxPlayers}
                  >
                    {hp < table.minBuyIn ? 'Недостаточно HP' : 'Играть'}
                  </button>
                </div>
              ))}
            </div>
            
            <button className="back-to-chat-btn" onClick={goToMainChat}>
              ← Вернуться в чат
            </button>
          </div>
        )}

        {/* Ожидание */}
        {gamePhase === 'waiting' && currentTable && (
          <div className="poker-lobby">
            <div className="poker-lobby-header">
              <h2>🃏 {currentTable.name}</h2>
              <button className="poker-action-btn fold" onClick={leaveTable}>
                Выйти
              </button>
            </div>
            
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <h3>Ожидание игроков...</h3>
              <p>Игроков за столом: {players.length}</p>
              <button 
                className="poker-action-btn raise" 
                onClick={startNewHand}
                style={{ marginTop: '20px' }}
              >
                Начать игру
              </button>
            </div>
          </div>
        )}

        {/* Игра */}
        {['preflop', 'flop', 'turn', 'river', 'showdown'].includes(gamePhase) && currentTable && (
          <div className="poker-game">
            <div className="poker-header">
              <span style={{ color: 'white', fontSize: '14px' }}>
                {gamePhase === 'preflop' && 'Префлоп'}
                {gamePhase === 'flop' && 'Флоп'}
                {gamePhase === 'turn' && 'Тёрн'}
                {gamePhase === 'river' && 'Ривер'}
                {gamePhase === 'showdown' && 'Вскрытие'}
              </span>
              <div className="poker-pot">
                Банк: {pot} ❤️
              </div>
              <button className="poker-action-btn fold" onClick={leaveTable} style={{ padding: '6px 12px', fontSize: '12px' }}>
                Выйти
              </button>
            </div>

            {/* Общие карты */}
            <div className="poker-community-cards">
              {communityCards.map((card, i) => (
                <span key={i}>{renderCard(card)}</span>
              ))}
              {[...Array(5 - communityCards.length)].map((_, i) => (
                <span key={`empty-${i}`}>{renderCard(null, false)}</span>
              ))}
            </div>

            {/* Игроки */}
            <div className="poker-players">
              {players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`poker-player ${index === currentPlayerIndex ? 'active' : ''} ${player.folded ? 'folded' : ''}`}
                >
                  <div className="poker-player-name">
                    {player.name}
                    {!player.isBot && ' (Вы)'}
                  </div>
                  <div className="poker-player-chips">
                    {player.chips} ❤️
                  </div>
                  <div className="poker-player-cards">
                    {player.cards.map((card, i) => (
                      <span key={i}>
                        {renderCard(card, player.isBot && index !== myPlayerIndex && gamePhase !== 'showdown')}
                      </span>
                    ))}
                  </div>
                  {player.bet > 0 && (
                    <div className="poker-player-bet">
                      Ставка: {player.bet}
                    </div>
                  )}
                  {player.folded && (
                    <div className="poker-player-status">Фолд</div>
                  )}
                  {player.isAllIn && (
                    <div className="poker-player-status">All-in!</div>
                  )}
                  {winner && winner.id === player.id && (
                    <div className="poker-player-status winner">🏆 Победитель!</div>
                  )}
                </div>
              ))}
            </div>

            {/* Результат */}
            {gamePhase === 'showdown' && winner && (
              <div className="poker-result">
                <h3>🏆 {winner.name} победил!</h3>
                <p>{winningHand || 'Выиграл банк'}</p>
                <p>+{pot} ❤️ HP</p>
                <div className="poker-result-actions">
                  <button className="poker-action-btn raise" onClick={startNewHand}>
                    Новая раздача
                  </button>
                  <button className="poker-action-btn fold" onClick={leaveTable}>
                    Выйти
                  </button>
                </div>
              </div>
            )}

            {/* Действия игрока */}
            {gamePhase !== 'showdown' && currentPlayerIndex === myPlayerIndex && !players[myPlayerIndex]?.folded && (
              <>
                <div className="poker-actions">
                  <button className="poker-action-btn fold" onClick={playerFold}>
                    Фолд
                  </button>
                  
                  {currentBet === players[myPlayerIndex]?.bet ? (
                    <button className="poker-action-btn check" onClick={playerCheck}>
                      Чек
                    </button>
                  ) : (
                    <button className="poker-action-btn call" onClick={playerCall} disabled={players[myPlayerIndex].chips < currentBet - players[myPlayerIndex].bet}>
                      Колл {currentBet - players[myPlayerIndex].bet}
                    </button>
                  )}
                  
                  <button className="poker-action-btn raise" onClick={playerRaise} disabled={players[myPlayerIndex].chips < raiseAmount - players[myPlayerIndex].bet}>
                    Рейз {raiseAmount}
                  </button>
                  
                  <button className="poker-action-btn all-in" onClick={playerAllIn}>
                    All-in {players[myPlayerIndex].chips}
                  </button>
                </div>
                
                <div className="raise-slider">
                  <span style={{ color: 'white' }}>Рейз:</span>
                  <input
                    type="range"
                    min={currentBet + (currentTable.blinds.big)}
                    max={players[myPlayerIndex].chips + players[myPlayerIndex].bet}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                  />
                  <span className="raise-value">{raiseAmount} ❤️</span>
                </div>
              </>
            )}
            
            {/* Ожидание хода бота */}
            {currentPlayerIndex !== myPlayerIndex && !players[myPlayerIndex]?.folded && gamePhase !== 'showdown' && (
              <div style={{ textAlign: 'center', color: 'white' }}>
                Ожидание хода {players[currentPlayerIndex]?.name}...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
