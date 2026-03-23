'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  Heart, X, Star, MessageCircle, Gift, Crown, Flame,
  ChevronLeft, ChevronRight, Settings, Users,
  Sparkles, MapPin, Send, ArrowLeft, User,
  ThumbsUp, Eye, Zap, Award, Clock, Wifi, WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Colyseus from 'colyseus.js';

// ============================================
// ТИПЫ
// ============================================

interface LovePlayer {
  id: string;
  sessionId: string;
  name: string;
  age: number;
  city: string;
  gender: 'male' | 'female';
  avatar: string;
  bio: string;
  rating: number;
  level: number;
  exp: number;
  isOnline: boolean;
  isVerified: boolean;
  isRegistered: boolean;
  gifts: string[];
  kissCount: number;
  winkCount: number;
  likeCount: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface RoomInfo {
  roomId: string;
  name: string;
  clients: number;
  maxClients: number;
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

export default function LovePage() {
  const router = useRouter();
  
  // Пользователь
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [userHP, setUserHP] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Сетевое подключение
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<Colyseus.Client | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  
  // Комната
  const [players, setPlayers] = useState<Map<string, LovePlayer>>(new Map());
  const [roomId, setRoomId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);
  
  // Раунд
  const [roundType, setRoundType] = useState<string>('waiting');
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundTimer, setRoundTimer] = useState(0);
  const [roundActive, setRoundActive] = useState(false);
  const [myVote, setMyVote] = useState<{targetId: string; action: string} | null>(null);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  
  // Чат
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  
  // Подарки
  const [showGifts, setShowGifts] = useState(false);
  const [giftTarget, setGiftTarget] = useState<LovePlayer | null>(null);
  
  // Просмотр профиля
  const [viewingProfile, setViewingProfile] = useState<LovePlayer | null>(null);
  
  // Рейтинг
  const [showRating, setShowRating] = useState(false);

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedUser = localStorage.getItem('chatchain_user');
    const registered = localStorage.getItem('chatchain_registered') === 'true';
    
    if (!storedUser || !registered) {
      setLoading(false);
      return;
    }
    
    const user = JSON.parse(storedUser);
    setUserId(user.id);
    setUserName(user.nickname);
    setIsRegistered(true);
    
    const hp = parseInt(localStorage.getItem('chatchain_hp') || '0');
    setUserHP(hp);
    
    setLoading(false);
  }, []);

  // Подключение к серверу
  const connectToServer = useCallback(async () => {
    if (clientRef.current || isConnecting) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Определяем URL сервера
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? 'ws://179.61.145.218:2567'
        : 'ws://localhost:2567';
      
      console.log('🔌 Подключение к серверу:', serverUrl);
      
      const client = new Colyseus.Client(serverUrl);
      clientRef.current = client;
      
      // Получаем список комнат
      const rooms = await client.getAvailableRooms('love');
      setAvailableRooms(rooms.map(r => ({
        roomId: r.roomId,
        name: r.metadata?.roomName || 'Комната',
        clients: r.clients,
        maxClients: r.maxClients || 12
      })));
      
      setIsConnected(true);
      console.log('✅ Подключено к серверу');
      
    } catch (error: any) {
      console.error('❌ Ошибка подключения:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Присоединение к комнате
  const joinRoom = useCallback(async (roomTypeName: string = 'love') => {
    if (!clientRef.current || !isConnected) {
      await connectToServer();
    }
    
    try {
      const client = clientRef.current!;
      
      // Получаем профиль из localStorage
      const profileStr = localStorage.getItem('chatchain_love_profile');
      const profile = profileStr ? JSON.parse(profileStr) : {};
      
      const options = {
        id: userId,
        name: profile.name || userName,
        age: profile.age || 25,
        city: profile.city || 'Москва',
        gender: profile.gender || 'male',
        avatar: profile.avatar || '👤',
        bio: profile.bio || '',
        rating: profile.rating || 1000,
        level: profile.level || 1,
        exp: profile.exp || 0,
        isVerified: false,
        isRegistered: true
      };
      
      console.log('🚪 Присоединение к комнате:', roomTypeName);
      
      const room = await client.joinOrCreate(roomTypeName, options);
      roomRef.current = room;
      
      setRoomId(room.roomId);
      setRoomName(room.name || 'Знакомства');
      
      // Обработчики событий комнаты
      room.onStateChange((state) => {
        console.log('📊 State changed:', state);
        
        // Обновляем игроков
        const newPlayers = new Map<string, LovePlayer>();
        state.players?.forEach((p: any, key: string) => {
          newPlayers.set(key, p);
        });
        setPlayers(newPlayers);
        
        // Обновляем состояние раунда
        if (state.roundType) setRoundType(state.roundType);
        if (state.roundNumber !== undefined) setRoundNumber(state.roundNumber);
        if (state.roundTimer !== undefined) setRoundTimer(state.roundTimer);
        if (state.roundActive !== undefined) setRoundActive(state.roundActive);
        if (state.voteCount !== undefined) setVoteCount(state.voteCount);
        if (state.showResults !== undefined) setShowResults(state.showResults);
        
        // Результаты раунда
        if (state.lastResult) {
          setRoundResults(state.lastResult);
        }
        
        // Название комнаты
        if (state.roomName) setRoomName(state.roomName);
      });
      
      // Новое сообщение
      room.onMessage("message", (message) => {
        console.log('💬 Message:', message);
        setMessages(prev => [...prev, message]);
      });
      
      // Начало раунда
      room.onMessage("round_start", (data) => {
        console.log('🎭 Round started:', data);
        setRoundType(data.type);
        setRoundNumber(data.roundNumber);
        setRoundTimer(data.duration);
        setRoundActive(true);
        setMyVote(null);
        setShowResults(false);
      });
      
      // Тик таймера
      room.onMessage("round_tick", (data) => {
        setRoundTimer(data.timer);
      });
      
      // Конец раунда
      room.onMessage("round_end", (results) => {
        console.log('🏆 Round ended:', results);
        setRoundResults(results);
        setShowResults(true);
        setRoundActive(false);
        
        // HP за участие
        const hpEarned = 2;
        setUserHP(prev => {
          const newHP = prev + hpEarned;
          localStorage.setItem('chatchain_hp', String(newHP));
          return newHP;
        });
      });
      
      // Сброс раунда
      room.onMessage("round_reset", () => {
        setRoundType('waiting');
        setShowResults(false);
      });
      
      // Подтверждение голоса
      room.onMessage("vote_confirmed", (data) => {
        setMyVote(data);
      });
      
      // Подарок получен
      room.onMessage("gift_received", (data) => {
        console.log('🎁 Gift received:', data);
      });
      
      // Ошибка
      room.onMessage("error", (data) => {
        console.error('❌ Room error:', data.message);
        setConnectionError(data.message);
      });
      
      // Приветствие
      room.onMessage("welcome", (data) => {
        console.log('👋 Welcome:', data);
      });
      
      setShowRoomList(false);
      console.log('✅ Присоединился к комнате');
      
    } catch (error: any) {
      console.error('❌ Ошибка присоединения:', error.message);
      setConnectionError(error.message);
    }
  }, [userId, userName, isConnected, connectToServer]);

  // Выход из комнаты
  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    setRoomId('');
    setPlayers(new Map());
    setMessages([]);
    setRoundType('waiting');
    setRoundActive(false);
    setShowResults(false);
    setMyVote(null);
  }, []);

  // Автоподключение при загрузке
  useEffect(() => {
    if (isRegistered && !isConnected && !isConnecting) {
      connectToServer();
    }
  }, [isRegistered, isConnected, isConnecting, connectToServer]);

  // Автоскролл чата
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // ============================================
  // ДЕЙСТВИЯ
  // ============================================

  const sendMessage = useCallback(() => {
    if (!chatMessage.trim() || !roomRef.current) return;
    roomRef.current.send("chat", { text: chatMessage });
    setChatMessage('');
  }, [chatMessage]);

  const startRound = useCallback(() => {
    if (!roomRef.current) return;
    roomRef.current.send("start_round");
  }, []);

  const castVote = useCallback((targetId: string, action: string) => {
    if (!roomRef.current || myVote) return;
    roomRef.current.send("vote", { targetId, action });
  }, [myVote]);

  const sendGift = useCallback((giftId: string, giftPrice: number) => {
    if (giftPrice > userHP) {
      alert('Недостаточно HP!');
      return;
    }
    if (!roomRef.current || !giftTarget) return;
    
    roomRef.current.send("gift", { targetId: giftTarget.sessionId, giftId });
    
    const newHP = userHP - giftPrice;
    setUserHP(newHP);
    localStorage.setItem('chatchain_hp', String(newHP));
    
    setShowGifts(false);
    setGiftTarget(null);
  }, [userHP, giftTarget]);

  // ============================================
  // РЕНДЕР
  // ============================================

  if (loading) {
    return (
      <div className="love-page loading">
        <Heart className="w-16 h-16 animate-pulse text-pink-500" />
        <p>Загрузка...</p>
        <Styles />
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="love-page not-registered">
        <Heart className="w-20 h-20 text-pink-500 mb-4" />
        <h1>💕 Только для зарегистрированных</h1>
        <p>Зарегистрируйтесь, чтобы найти свою любовь!</p>
        <Button onClick={() => router.push('/')} className="back-btn">
          <ArrowLeft size={16} /> На главную
        </Button>
        <Styles />
      </div>
    );
  }

  // Рейтинг
  if (showRating) {
    const sortedPlayers = Array.from(players.values()).sort((a, b) => b.rating - a.rating);
    
    return (
      <div className="love-page rating-page">
        <div className="rating-header">
          <button onClick={() => setShowRating(false)}>
            <ChevronLeft size={24} />
          </button>
          <h1>👑 Топ игроков</h1>
        </div>
        
        <div className="rating-list">
          {sortedPlayers.map((player, index) => (
            <div key={player.sessionId} className="rating-item">
              <span className="rating-place">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <div className="rating-avatar">{player.avatar}</div>
              <div className="rating-info">
                <span className="rating-name">{player.name}, {player.age}</span>
                <span className="rating-city">{player.city}</span>
              </div>
              <div className="rating-score">
                <Flame size={14} /> {player.rating.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        
        <Styles />
      </div>
    );
  }

  // Просмотр профиля
  if (viewingProfile) {
    return (
      <div className="love-page">
        <div className="profile-view">
          <button className="back-button" onClick={() => setViewingProfile(null)}>
            <ChevronLeft size={24} /> Назад
          </button>
          
          <div className="profile-photo-large">
            {viewingProfile.avatar}
          </div>
          
          <div className="profile-info-detailed">
            <h1>{viewingProfile.name}, {viewingProfile.age}</h1>
            <div className="location"><MapPin size={16} /> {viewingProfile.city}</div>
            
            <div className="stats-row">
              <div className="stat-item">
                <Flame size={18} />
                <span>{viewingProfile.rating.toLocaleString()}</span>
                <small>Рейтинг</small>
              </div>
              <div className="stat-item">
                <Award size={18} />
                <span>{viewingProfile.level}</span>
                <small>Уровень</small>
              </div>
              <div className="stat-item">
                <Heart size={18} />
                <span>{viewingProfile.kissCount}</span>
                <small>Поцелуи</small>
              </div>
            </div>
            
            {viewingProfile.bio && (
              <div className="bio-section">
                <h3>О себе</h3>
                <p>{viewingProfile.bio}</p>
              </div>
            )}
          </div>
          
          <div className="profile-actions">
            <Button onClick={() => { setGiftTarget(viewingProfile); setShowGifts(true); }} className="gift-btn">
              <Gift size={20} /> Подарить
            </Button>
          </div>
        </div>
        <Styles />
      </div>
    );
  }

  // Список комнат
  if (showRoomList && !roomId) {
    return (
      <div className="love-page rooms-page">
        <div className="rooms-header">
          <button onClick={() => setShowRoomList(false)}>
            <ChevronLeft size={24} />
          </button>
          <h1>🏠 Комнаты</h1>
        </div>
        
        {/* Статус подключения */}
        <div className="connection-status">
          {isConnected ? (
            <span className="connected"><Wifi size={16} /> Подключено</span>
          ) : (
            <span className="disconnected"><WifiOff size={16} /> Не подключено</span>
          )}
        </div>
        
        <div className="rooms-list">
          {/* Стандартные комнаты */}
          <div className="room-card" onClick={() => joinRoom('love')}>
            <div className="room-info">
              <h3>💕 Знакомства</h3>
              <div className="room-meta">
                <span><Users size={14} /> Общение</span>
              </div>
            </div>
            <ChevronRight size={20} className="room-arrow" />
          </div>
          
          <div className="room-card" onClick={() => joinRoom('love_flirt')}>
            <div className="room-info">
              <h3>💋 Флирт и общение</h3>
              <div className="room-meta">
                <span><Users size={14} /> До 12 игроков</span>
              </div>
            </div>
            <ChevronRight size={20} className="room-arrow" />
          </div>
          
          <div className="room-card" onClick={() => joinRoom('love_sandbox')}>
            <div className="room-info">
              <h3>🏰 Песочница</h3>
              <div className="room-meta">
                <span><Users size={14} /> Для новичков</span>
              </div>
            </div>
            <ChevronRight size={20} className="room-arrow" />
          </div>
        </div>
        
        <Styles />
      </div>
    );
  }

  // В комнате
  if (roomId) {
    const otherPlayers = Array.from(players.values()).filter(p => p.sessionId !== roomRef.current?.sessionId);
    const me = Array.from(players.values()).find(p => p.sessionId === roomRef.current?.sessionId);

    return (
      <div className="love-page game-room">
        {/* Header */}
        <div className="room-header">
          <button onClick={leaveRoom} className="leave-btn">
            <ChevronLeft size={24} />
          </button>
          <div className="room-title">
            <h1>{roomName}</h1>
            <span className="players-count">
              <Users size={14} /> {players.size}
            </span>
          </div>
          <div className="header-right">
            <span className="hp-count">💎 {userHP}</span>
            <button onClick={() => setShowRating(true)}><Crown size={20} /></button>
            <span className={`connection ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            </span>
          </div>
        </div>

        {/* Players Grid */}
        <div className="players-section">
          <h2>Игроки в комнате</h2>
          <div className="players-grid">
            {Array.from(players.values()).map(player => (
              <div 
                key={player.sessionId} 
                className={`player-card ${player.sessionId === roomRef.current?.sessionId ? 'me' : ''}`}
                onClick={() => player.sessionId !== roomRef.current?.sessionId && setViewingProfile(player)}
              >
                <div className="player-avatar">{player.avatar}</div>
                <div className="player-name">{player.name}</div>
                <div className="player-level">Ур. {player.level}</div>
                {player.isVerified && <span className="verified">✓</span>}
                {player.sessionId !== roomRef.current?.sessionId && (
                  <button 
                    className="quick-gift"
                    onClick={(e) => { e.stopPropagation(); setGiftTarget(player); setShowGifts(true); }}
                  >
                    <Gift size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Round Area */}
        <div className="round-section">
          {roundType === 'waiting' ? (
            <div className="waiting-area">
              <div className="waiting-icon">💕</div>
              <p>Место для встреч</p>
              <button className="start-round-btn" onClick={startRound} disabled={players.size < 2}>
                <Zap size={20} /> Начать раунд
              </button>
              {players.size < 2 && <p className="hint">Нужно минимум 2 игрока</p>}
            </div>
          ) : showResults && roundResults ? (
            <div className="results-area">
              <h2>{roundResults.icon} {roundResults.title}</h2>
              <div className="results-content">
                {roundResults.type === 'kiss' && (
                  <div className="pairs-list">
                    {JSON.parse(roundResults.data || '{}').pairs?.map((pair: any, i: number) => (
                      <div key={i} className="pair-result">
                        <span className="pair-avatar">{pair.player1?.avatar}</span>
                        <span className="pair-action">
                          {pair.action === 'kiss' ? '💋' : pair.action === 'wink' ? '😉' : '❌'}
                        </span>
                        <span className="pair-avatar">{pair.player2?.avatar}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="next-round-hint">Следующий раунд через 5 секунд...</p>
            </div>
          ) : (
            <div className="active-round">
              <div className="round-header">
                <span className="round-icon">{roundType === 'kiss' ? '💋' : roundType === 'choose_pair' ? '💑' : '❤️'}</span>
                <h2>{roundType === 'kiss' ? 'Раунд поцелуя' : roundType === 'choose_pair' ? 'Выбираем пару' : 'Кто больше нравится?'}</h2>
                <div className="round-timer">
                  <Clock size={16} />
                  <span>{roundTimer}с</span>
                </div>
              </div>

              {/* Kiss Round */}
              {roundType === 'kiss' && (
                <div className="kiss-round">
                  <p>Выберите действие:</p>
                  <div className="vote-list">
                    {otherPlayers.map(player => (
                      <div key={player.sessionId} className="vote-item">
                        <span className="vote-avatar">{player.avatar}</span>
                        <span className="vote-name">{player.name}</span>
                        <div className="vote-buttons">
                          <button 
                            className={`vote-btn kiss ${myVote?.targetId === player.sessionId && myVote?.action === 'kiss' ? 'selected' : ''}`}
                            onClick={() => castVote(player.sessionId, 'kiss')}
                            disabled={!!myVote}
                          >💋</button>
                          <button 
                            className={`vote-btn wink ${myVote?.targetId === player.sessionId && myVote?.action === 'wink' ? 'selected' : ''}`}
                            onClick={() => castVote(player.sessionId, 'wink')}
                            disabled={!!myVote}
                          >😉</button>
                          <button 
                            className={`vote-btn skip ${myVote?.targetId === player.sessionId && myVote?.action === 'skip' ? 'selected' : ''}`}
                            onClick={() => castVote(player.sessionId, 'skip')}
                            disabled={!!myVote}
                          >❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Who Likes Round */}
              {(roundType === 'who_likes' || roundType === 'choose_pair') && (
                <div className="likes-round">
                  <p>{roundType === 'choose_pair' ? 'Кто лучшая пара?' : 'Кто больше нравится?'}</p>
                  <div className="likes-grid">
                    {otherPlayers.map(player => (
                      <button 
                        key={player.sessionId}
                        className={`like-option ${myVote?.targetId === player.sessionId ? 'selected' : ''}`}
                        onClick={() => castVote(player.sessionId, 'like')}
                        disabled={!!myVote}
                      >
                        <span className="like-avatar">{player.avatar}</span>
                        <span className="like-name">{player.name}</span>
                        <Heart size={16} className="like-icon" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {myVote && (
                <div className="vote-confirmation">
                  <p>✓ Ваш голос засчитан! Ожидаем других игроков...</p>
                  <p className="vote-progress">{voteCount} / {players.size} проголосовали</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        {showChat && (
          <div className="chat-section">
            <div className="chat-messages" ref={chatRef}>
              {messages.map(msg => (
                <div key={msg.id} className={`chat-msg ${msg.isSystem ? 'system' : ''} ${msg.playerId === userId ? 'own' : ''}`}>
                  {!msg.isSystem && <span className="msg-avatar">{msg.playerAvatar}</span>}
                  <div className="msg-content">
                    {!msg.isSystem && <span className="msg-name">{msg.playerName}</span>}
                    <span className="msg-text">{msg.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Сообщение..."
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}><Send size={18} /></button>
            </div>
          </div>
        )}

        <button className="toggle-chat" onClick={() => setShowChat(!showChat)}>
          <MessageCircle size={20} />
        </button>

        {/* Gift Modal */}
        {showGifts && giftTarget && (
          <div className="modal-overlay" onClick={() => { setShowGifts(false); setGiftTarget(null); }}>
            <div className="gift-modal" onClick={e => e.stopPropagation()}>
              <h2>🎁 Подарок для {giftTarget.name}</h2>
              <div className="gift-grid">
                {GIFT_ITEMS.map(gift => (
                  <button
                    key={gift.id}
                    className={`gift-item ${gift.price > userHP ? 'disabled' : ''}`}
                    onClick={() => sendGift(gift.id, gift.price)}
                    disabled={gift.price > userHP}
                  >
                    <span className="gift-emoji">{gift.emoji}</span>
                    <span className="gift-name">{gift.name}</span>
                    <span className="gift-price">💎 {gift.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Styles />
      </div>
    );
  }

  // Главное меню
  return (
    <div className="love-page main-menu">
      <div className="main-header">
        <button onClick={() => router.push('/')} className="back-link">
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">💕 Любовь</h1>
        <div className="header-right">
          <span className="hp-count">💎 {userHP}</span>
          <button onClick={() => setShowRating(true)}><Crown size={20} /></button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-panel">
        {isConnected ? (
          <div className="status connected">
            <Wifi size={18} />
            <span>Подключено к серверу</span>
          </div>
        ) : connectionError ? (
          <div className="status error">
            <WifiOff size={18} />
            <span>Ошибка: {connectionError}</span>
            <button onClick={connectToServer}>Повторить</button>
          </div>
        ) : isConnecting ? (
          <div className="status connecting">
            <span className="spinner"></span>
            <span>Подключение...</span>
          </div>
        ) : (
          <div className="status disconnected">
            <WifiOff size={18} />
            <span>Не подключено</span>
            <button onClick={connectToServer}>Подключиться</button>
          </div>
        )}
      </div>

      <div className="main-actions">
        <button className="action-card primary" onClick={() => setShowRoomList(true)} disabled={!isConnected}>
          <div className="action-icon">🏠</div>
          <div className="action-text">
            <h3>Комнаты</h3>
            <p>Присоединяйся и общайся!</p>
          </div>
          <ChevronRight size={20} />
        </button>

        <button className="action-card" onClick={() => setShowRating(true)}>
          <div className="action-icon">👑</div>
          <div className="action-text">
            <h3>Рейтинг</h3>
            <p>Топ игроков</p>
          </div>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="info-section">
        <h3>💕 О игре</h3>
        <p>Интерактивный multiplayer чат для общения и новых знакомств. 
        Играй в раунды, отправляй подарки и находи свою любовь!</p>
        
        <div className="features-list">
          <div className="feature"><span>💋</span> Раунды поцелуев</div>
          <div className="feature"><span>💑</span> Выбор пар</div>
          <div className="feature"><span>🎁</span> Подарки</div>
          <div className="feature"><span>🌐</span> Real-time мультиплеер</div>
        </div>
      </div>

      <Styles />
    </div>
  );
}

// ============================================
// КОНСТАНТЫ
// ============================================

const GIFT_ITEMS = [
  { id: 'rose', emoji: '🌹', name: 'Роза', price: 10 },
  { id: 'heart', emoji: '❤️', name: 'Сердце', price: 25 },
  { id: 'kiss', emoji: '💋', name: 'Поцелуй', price: 50 },
  { id: 'diamond', emoji: '💎', name: 'Бриллиант', price: 100 },
  { id: 'crown', emoji: '👑', name: 'Корона', price: 200 },
  { id: 'ring', emoji: '💍', name: 'Кольцо', price: 500 },
  { id: 'love', emoji: '💕', name: 'Любовь', price: 1000 },
];

// ============================================
// СТИЛИ
// ============================================

function Styles() {
  return (
    <style jsx global>{`
      .love-page {
        min-height: 100vh;
        background: linear-gradient(180deg, #1a0a1a 0%, #2d1a2d 50%, #1a0a1a 100%);
        color: white;
        font-family: 'Segoe UI', sans-serif;
      }

      .love-page.loading, .love-page.not-registered {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px;
      }

      .love-page.not-registered h1 { font-size: 28px; margin: 16px 0; color: #ec4899; }
      .love-page.not-registered p { color: #888; margin-bottom: 24px; }
      .back-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }

      /* Header */
      .main-header, .room-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .header-title {
        font-size: 20px;
        font-weight: 600;
        background: linear-gradient(135deg, #ec4899, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-right button {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .header-right button:hover {
        background: rgba(236, 72, 153, 0.3);
      }

      .hp-count {
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
      }

      .room-title {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .room-title h1 {
        font-size: 16px;
        margin: 0;
      }

      .players-count {
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .leave-btn, .back-link {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* Connection Status */
      .connection-panel {
        padding: 12px 20px;
      }

      .status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 14px;
      }

      .status.connected {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .status.disconnected {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .status.connecting {
        background: rgba(234, 179, 8, 0.2);
        color: #eab308;
      }

      .status.error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        flex-wrap: wrap;
      }

      .status button {
        margin-left: auto;
        padding: 4px 12px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 16px;
        color: white;
        font-size: 12px;
        cursor: pointer;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #eab308;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .connection {
        padding: 4px;
        border-radius: 50%;
      }

      .connection.connected { color: #22c55e; }
      .connection.disconnected { color: #ef4444; }

      /* Actions */
      .main-actions {
        padding: 0 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .action-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        color: white;
      }

      .action-card:hover:not(:disabled) {
        background: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.4);
      }

      .action-card:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .action-card.primary {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(139, 92, 246, 0.3));
        border-color: rgba(236, 72, 153, 0.5);
      }

      .action-icon {
        font-size: 32px;
      }

      .action-text {
        flex: 1;
      }

      .action-text h3 {
        margin: 0;
        font-size: 16px;
      }

      .action-text p {
        margin: 4px 0 0 0;
        font-size: 12px;
        color: #888;
      }

      /* Info */
      .info-section {
        padding: 24px 20px;
        margin-top: 20px;
      }

      .info-section h3 {
        margin: 0 0 12px 0;
        font-size: 18px;
      }

      .info-section p {
        color: #888;
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 16px 0;
      }

      .features-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .feature {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        font-size: 14px;
      }

      /* Players Section */
      .players-section {
        padding: 16px 20px;
      }

      .players-section h2 {
        font-size: 16px;
        margin: 0 0 12px 0;
      }

      .players-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }

      .player-card {
        position: relative;
        padding: 12px 8px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .player-card:hover {
        background: rgba(236, 72, 153, 0.2);
      }

      .player-card.me {
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.4);
      }

      .player-avatar {
        font-size: 32px;
        margin-bottom: 4px;
      }

      .player-name {
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .player-level {
        font-size: 10px;
        color: #888;
      }

      .player-card .verified {
        position: absolute;
        top: 4px;
        right: 4px;
        color: #3b82f6;
        font-size: 12px;
      }

      .quick-gift {
        position: absolute;
        bottom: 4px;
        right: 4px;
        background: rgba(236, 72, 153, 0.5);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Round Section */
      .round-section {
        padding: 16px 20px;
        min-height: 200px;
      }

      .waiting-area {
        text-align: center;
        padding: 40px 20px;
        background: rgba(255,255,255,0.05);
        border-radius: 16px;
      }

      .waiting-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .waiting-area p {
        color: #888;
        margin: 0 0 20px 0;
      }

      .hint {
        font-size: 12px;
        color: #f59e0b !important;
        margin-top: 8px !important;
      }

      .start-round-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border: none;
        border-radius: 24px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      }

      .start-round-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .active-round {
        background: rgba(255,255,255,0.05);
        border-radius: 16px;
        padding: 16px;
      }

      .round-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .round-icon {
        font-size: 28px;
      }

      .round-header h2 {
        flex: 1;
        font-size: 18px;
        margin: 0;
      }

      .round-timer {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: rgba(239, 68, 68, 0.2);
        border-radius: 12px;
        color: #ef4444;
        font-weight: 600;
      }

      .vote-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .vote-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
      }

      .vote-avatar {
        font-size: 24px;
      }

      .vote-name {
        flex: 1;
        font-size: 14px;
      }

      .vote-buttons {
        display: flex;
        gap: 8px;
      }

      .vote-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.2);
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .vote-btn:hover:not(:disabled) {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.2);
      }

      .vote-btn.selected {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.4);
      }

      .vote-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .likes-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .like-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px;
        background: rgba(255,255,255,0.05);
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s;
        color: white;
      }

      .like-option:hover:not(:disabled) {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.2);
      }

      .like-option.selected {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.3);
      }

      .like-option:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .like-avatar {
        font-size: 48px;
      }

      .like-name {
        font-size: 14px;
      }

      .like-icon {
        color: #ec4899;
      }

      .vote-confirmation {
        margin-top: 16px;
        padding: 12px;
        background: rgba(34, 197, 94, 0.2);
        border-radius: 12px;
        text-align: center;
        color: #22c55e;
      }

      .vote-progress {
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }

      /* Results */
      .results-area {
        text-align: center;
        padding: 20px;
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2));
        border-radius: 16px;
      }

      .results-area h2 {
        margin: 0 0 16px 0;
        font-size: 20px;
      }

      .pairs-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pair-result {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
      }

      .pair-action {
        font-size: 24px;
      }

      .next-round-hint {
        margin-top: 16px;
        color: #888;
        font-size: 12px;
      }

      /* Chat */
      .chat-section {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        max-height: 40vh;
        display: flex;
        flex-direction: column;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        max-height: 200px;
      }

      .chat-msg {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }

      .chat-msg.own {
        flex-direction: row-reverse;
      }

      .msg-avatar {
        font-size: 20px;
      }

      .msg-content {
        max-width: 70%;
      }

      .msg-name {
        display: block;
        font-size: 11px;
        color: #888;
        margin-bottom: 2px;
      }

      .msg-text {
        display: inline-block;
        padding: 8px 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        font-size: 14px;
        word-break: break-word;
      }

      .chat-msg.own .msg-text {
        background: rgba(236, 72, 153, 0.3);
      }

      .chat-msg.system .msg-text {
        background: rgba(139, 92, 246, 0.2);
        color: #a78bfa;
      }

      .chat-input {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .chat-input input {
        flex: 1;
        padding: 10px 16px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 20px;
        color: white;
        font-size: 14px;
      }

      .chat-input button {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toggle-chat {
        position: fixed;
        bottom: 12px;
        right: 12px;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
      }

      /* Rooms List */
      .rooms-header, .rating-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
      }

      .rooms-header button, .rating-header button {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .rooms-header h1, .rating-header h1 {
        flex: 1;
        margin: 0;
        font-size: 18px;
      }

      .connection-status {
        padding: 8px 20px;
      }

      .connection-status .connected {
        color: #22c55e;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .connection-status .disconnected {
        color: #ef4444;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .rooms-list {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .room-card {
        display: flex;
        align-items: center;
        padding: 16px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .room-card:hover {
        background: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.4);
      }

      .room-info {
        flex: 1;
      }

      .room-info h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
      }

      .room-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #888;
      }

      .room-meta span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .room-arrow {
        color: #888;
      }

      /* Rating */
      .rating-list {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .rating-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
      }

      .rating-place {
        font-size: 18px;
        min-width: 32px;
      }

      .rating-avatar {
        font-size: 28px;
      }

      .rating-info {
        flex: 1;
      }

      .rating-name {
        display: block;
        font-size: 14px;
      }

      .rating-city {
        display: block;
        font-size: 12px;
        color: #888;
      }

      .rating-score {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #f59e0b;
        font-size: 14px;
      }

      /* Profile View */
      .profile-view {
        padding: 20px;
      }

      .back-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        margin-bottom: 20px;
      }

      .profile-photo-large {
        font-size: 100px;
        text-align: center;
        padding: 20px;
      }

      .profile-info-detailed {
        padding: 0 20px;
      }

      .profile-info-detailed h1 {
        margin: 0 0 8px 0;
        font-size: 24px;
        text-align: center;
      }

      .location {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #888;
        margin-bottom: 16px;
      }

      .stats-row {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-bottom: 24px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: #f59e0b;
      }

      .stat-item span {
        font-size: 18px;
        font-weight: 600;
      }

      .stat-item small {
        font-size: 11px;
        color: #888;
      }

      .bio-section {
        margin-bottom: 16px;
      }

      .bio-section h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #888;
      }

      .bio-section p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }

      .profile-actions {
        padding: 20px;
        display: flex;
        justify-content: center;
      }

      .gift-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border: none;
        border-radius: 24px;
        color: white;
        font-size: 16px;
        cursor: pointer;
      }

      /* Gift Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .gift-modal {
        background: #2d1a2d;
        padding: 24px;
        border-radius: 20px;
        width: 90%;
        max-width: 400px;
      }

      .gift-modal h2 {
        margin: 0 0 20px 0;
        text-align: center;
      }

      .gift-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }

      .gift-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        color: white;
      }

      .gift-item:hover:not(.disabled) {
        background: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.4);
      }

      .gift-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .gift-emoji {
        font-size: 28px;
      }

      .gift-name {
        font-size: 11px;
      }

      .gift-price {
        font-size: 10px;
        color: #888;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .players-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .likes-grid {
          grid-template-columns: 1fr 1fr;
        }
        
        .gift-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `}</style>
  );
}
