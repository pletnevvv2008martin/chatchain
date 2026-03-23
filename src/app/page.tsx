'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Reply, Edit2, Trash2, Smile, X, MoreHorizontal, Check, Image as ImageIcon, Gift, Heart, Link2 } from 'lucide-react';
import Header from '@/components/Header';
import RoomsSidebar from '@/components/RoomsSidebar';
import SharedMusicPlayer from '@/components/SharedMusicPlayer';
import CreateRoomModal from '@/components/CreateRoomModal';
import PasswordModal from '@/components/PasswordModal';
import InviteModal from '@/components/InviteModal';
import GifPicker from '@/components/GifPicker';
import EmojiPicker from '@/components/EmojiPicker';
import AdminPanel from '@/components/AdminPanel';
import HeartsEffect from '@/components/HeartsEffect';
import AuthModal from '@/components/AuthModal';
import ProfileModal from '@/components/ProfileModal';
import GiftModal from '@/components/GiftModal';
import { useLanguage } from '@/lib/LanguageContext';
import {
  User,
  Room,
  Message,
  Reaction,
  getRooms,
  getAvailableLobby,
  joinRoom,
  generateId,
  getStatusEmoji,
  getStatusColor,
  getStatusName,
  createRoom as createRoomUtil,
  updateUser,
  getUserAvatar,
  AVAILABLE_REACTIONS,
  toggleReaction as toggleReactionUtil,
  getLevelByXp,
  checkDailyReward,
  addXp,
} from '@/lib/store';

// Админы по никнейму
const ADMIN_NAMES = ['Martin'];

// Проверка роли по никнейму
const getUserRole = (nickname: string): 'admin' | 'moderator' | 'user' => {
  if (ADMIN_NAMES.includes(nickname)) return 'admin';
  return 'user';
};

// Создание гостевого пользователя
const createGuestUser = (): User => {
  const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const guestNumber = Math.floor(Math.random() * 10000);
  return {
    id: guestId,
    nickname: `Гость_${guestNumber}`,
    points: 0,
    investedAmount: 0,
    status: 'guest',
    level: 1,
    xp: 0,
  };
};

// Slash команды
const SLASH_COMMANDS = {
  roll: () => `🎲 Выпало: ${Math.floor(Math.random() * 100) + 1}`,
  flip: () => `🪙 ${Math.random() > 0.5 ? 'Орёл' : 'Решка'}`,
  dice: () => `🎲 [${Math.floor(Math.random() * 6) + 1}] + [${Math.floor(Math.random() * 6) + 1}] = ${Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2}`,
  '8ball': () => {
    const answers = [
      'Да, определённо! ✓',
      'Скорее всего да',
      'Звёзды говорят да ✨',
      'Не уверен, попробуй ещё',
      'Спроси позже',
      'Лучше не знать...',
      'Скорее нет',
      'Точно нет! ✗',
      'Может быть 🤔',
      'Всё возможно!',
    ];
    return `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`;
  },
};

// Magic 8-ball answers for questions
const get8BallAnswer = (question: string): string => {
  const answers = [
    'Да, определённо! ✓',
    'Скорее всего да',
    'Звёзды говорят да ✨',
    'Не уверен, попробуй ещё',
    'Спроси позже',
    'Лучше не знать...',
    'Скорее нет',
    'Точно нет! ✗',
    'Может быть 🤔',
    'Всё возможно!',
  ];
  const answer = answers[Math.floor(Math.random() * answers.length)];
  return `🎱 "${question}" → ${answer}`;
};

// Проверка, зарегистрирован ли пользователь
const getIsUserRegistered = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('chatchain_registered') === 'true';
};

// ============================================
// КОМПОНЕНТ ПРЕВЬЮ ССЫЛОК
// ============================================

interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
}

const linkPreviewCache = new Map<string, LinkPreviewData>();

function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = linkPreviewCache.get(url);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.success && data.preview) {
          setPreview(data.preview);
          linkPreviewCache.set(url, data.preview);
        }
      } catch (e) {
        console.error('Link preview error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="link-preview-skeleton">
        <div className="skeleton-img"></div>
        <div className="skeleton-lines">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="link-preview-card"
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && (
        <div className="link-preview-img">
          <img src={preview.image} alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>
      )}
      <div className="link-preview-info">
        <div className="link-preview-site">
          {preview.favicon && <img src={preview.favicon} alt="" className="link-preview-favicon" onError={(e) => e.currentTarget.style.display = 'none'} />}
          <span>{preview.siteName || new URL(url).hostname}</span>
        </div>
        {preview.title && <div className="link-preview-title">{preview.title}</div>}
        {preview.description && <div className="link-preview-desc">{preview.description.slice(0, 100)}{preview.description.length > 100 ? '...' : ''}</div>}
      </div>
    </a>
  );
}

export default function ChatPage() {
  const { t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false); // Модалка регистрации по кнопке
  const [showProfileModal, setShowProfileModal] = useState(false); // Модалка профиля
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<Room | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMusic, setShowMobileMusic] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{userId: string; userName: string; messageCount: number; totalPoints: number; rank: number; badge: string}>>([]);
  
  // Загрузка топа пользователей
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=5');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, []);
  
  // Новые состояния для динамических функций
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyRewardData, setDailyRewardData] = useState<{ streak: number; bonus: number } | null>(null);
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ messageId: string; content: string; user: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [userRole, setUserRole] = useState<'user' | 'moderator' | 'admin'>('user');

  // Состояния для дуэлей
  const [pendingDuel, setPendingDuel] = useState<{
    id: string;
    challengerName: string;
    bet: number;
  } | null>(null);
  const [showDuelNotification, setShowDuelNotification] = useState(false);

  // Состояния для подарков
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<{ id: string; name: string } | null>(null);
  const [messageThanks, setMessageThanks] = useState<Record<string, { count: number; users: string[] }>>({});

  // Обработка успешной регистрации
  const handleAuthSuccess = (authUser: { id: string; nickname: string; email?: string; role?: string; xp?: number; points?: number }) => {
    localStorage.setItem('chatchain_registered', 'true');
    
    const newUser: User = {
      id: authUser.id,
      nickname: authUser.nickname,
      points: authUser.points || 100,
      investedAmount: 0,
      status: 'registered',
      level: 1,
      xp: authUser.xp || 0,
    };
    
    localStorage.setItem('chatchain_user', JSON.stringify(newUser));
    setUser(newUser);
    
    // Устанавливаем роль из ответа авторизации или по никнейму
    if (authUser.role === 'admin' || ADMIN_NAMES.includes(authUser.nickname)) {
      setUserRole('admin');
    } else if (authUser.role === 'moderator') {
      setUserRole('moderator');
    }
    
    setShowAuthModal(false);
  };

  // Проверка ежедневной награды при входе
  useEffect(() => {
    if (!isInitialized || !user) return;
    
    const result = checkDailyReward();
    if (!result.claimed) {
      setDailyRewardData({ streak: result.streak, bonus: result.bonus });
      setShowDailyReward(true);
      // Обновляем пользователя
      const storedUser = localStorage.getItem('chatchain_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [isInitialized, user?.id]);

  // Регистрация пользователя и проверка роли
  useEffect(() => {
    if (!user) return;
    
    // Сначала проверяем по локальному списку админов
    if (ADMIN_NAMES.includes(user.nickname)) {
      setUserRole('admin');
      return;
    }
    
    const registerUser = async () => {
      try {
        await fetch('/api/moderation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            userId: user.id,
            userName: user.nickname,
          }),
        });

        const res = await fetch(`/api/moderation?action=check_status&userId=${user.id}`);
        const data = await res.json();
        if (data.success && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to register user:', error);
      }
    };
    
    registerUser();
  }, [user]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isInitialized) return;

    // Получаем пользователя из localStorage или создаем гостя
    let userData: User;
    const storedUser = localStorage.getItem('chatchain_user');

    if (storedUser) {
      userData = JSON.parse(storedUser);
    } else {
      // Автоматически создаем гостя
      userData = createGuestUser();
      localStorage.setItem('chatchain_user', JSON.stringify(userData));
    }

    const roomsData = getRooms();
    const lobby = getAvailableLobby();
    const result = joinRoom(lobby.id, userData.id);

    setUser(userData);
    setRooms(roomsData);
    setCurrentRoomId(lobby.id);

    const initialMessages = result.success && result.room ? result.room.messages || [] : lobby.messages || [];
    setMessages(initialMessages);
    initialMessages.forEach((m: Message) => messageIdsRef.current.add(m.id));

    setIsInitialized(true);
    fetchLeaderboard();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join_room',
        roomId: lobby.id,
        userId: userData.id,
        userName: userData.nickname,
      }),
    });
  }, [isInitialized]);

  const syncMessages = useCallback(async () => {
    if (!currentRoomId || !isInitialized) return;
    
    try {
      const response = await fetch(`/api/chat?roomId=${currentRoomId}`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        const newMessages: Message[] = [];
        for (const msg of data.messages) {
          if (!messageIdsRef.current.has(msg.id)) {
            messageIdsRef.current.add(msg.id);
            newMessages.push(msg);
          }
        }
        
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
        }
        
        if (data.userCount) {
          setOnlineCount(data.userCount);
        }
      }
    } catch {}
  }, [currentRoomId, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const interval = setInterval(syncMessages, 1500);
    return () => clearInterval(interval);
  }, [isInitialized, syncMessages]);

  // Проверка вызовов на дуэль
  useEffect(() => {
    if (!isInitialized || !user) return;

    const checkPendingDuels = async () => {
      try {
        const res = await fetch(`/api/duel?action=get_pending&userId=${user.id}`);
        const data = await res.json();
        if (data.duels && data.duels.length > 0) {
          const latestDuel = data.duels[0];
          setPendingDuel({
            id: latestDuel.id,
            challengerName: latestDuel.challengerName,
            bet: latestDuel.bet,
          });
          setShowDuelNotification(true);
        }
      } catch (error) {
        console.error('Error checking duels:', error);
      }
    };

    checkPendingDuels();
    const interval = setInterval(checkPendingDuels, 5000);
    return () => clearInterval(interval);
  }, [isInitialized, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isGifUrl = (text: string): boolean => {
    const trimmed = text.trim();
    try {
      const url = new URL(trimmed);
      const isImageExtension = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(trimmed);
      const isMediaDomain = [
        'giphy.com', 'media.giphy.com',
        'pinimg.com', 'i.pinimg.com',
        'media.discordapp.net', 'cdn.discordapp.com',
        'tenor.com', 'media.tenor.com',
        'imgur.com', 'i.imgur.com',
        'gfycat.com',
        'redditmedia.com', 'i.redd.it',
        'twimg.com', 'pbs.twimg.com',
      ].some(domain => url.hostname.includes(domain));

      return isImageExtension || isMediaDomain;
    } catch {
      return false;
    }
  };

  // Извлечение URL из текста для превью
  const extractUrls = (text: string): string[] => {
    if (!text) return [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = text.match(urlRegex) || [];
    // Фильтруем - не показываем превью для GIF/изображений
    return matches.filter(url => !isGifUrl(url) && !/\.(png|jpg|jpeg|webp|gif|mp4|webm)(\?.*)?$/i.test(url));
  };

  const normalizeGifUrl = (url: string): string => {
    const trimmed = url.trim();

    // GIPHY ссылки
    if (trimmed.includes('giphy.com/gifs/')) {
      const parts = trimmed.split('/gifs/')[1]?.split('-');
      const id = parts?.pop();
      if (id) return `https://media.giphy.com/media/${id}/giphy.gif`;
    }
    
    // GIPHY страницы
    if (trimmed.includes('giphy.com/') && !trimmed.includes('media.giphy.com')) {
      const match = trimmed.match(/giphy\.com\/gifs\/[^-]+-([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        return `https://media.giphy.com/media/${match[1]}/giphy.gif`;
      }
    }
    
    // Imgur GIFV -> GIF
    if (trimmed.includes('imgur.com') && trimmed.endsWith('.gifv')) {
      return trimmed.replace('.gifv', '.gif');
    }
    
    // Imgur без расширения
    if (trimmed.includes('imgur.com/') && !trimmed.match(/\.(gif|png|jpg|jpeg|webp)$/i)) {
      return trimmed + '.gif';
    }

    return trimmed;
  };

  const sendMessage = async (content: string, type: 'text' | 'gif' = 'text') => {
    if (!content.trim() || !user) return;

    let finalContent = content.trim();
    let finalType: 'text' | 'gif' | 'action' | 'roll' | 'system' = type;

    // Обработка slash-команд
    if (type === 'text' && finalContent.startsWith('/')) {
      const parts = finalContent.split(' ');
      const command = parts[0].toLowerCase().slice(1);
      const args = parts.slice(1).join(' ');

      if (command === 'roll') {
        finalContent = `${user.nickname} ${SLASH_COMMANDS.roll()}`;
        finalType = 'roll';
      } else if (command === 'flip') {
        finalContent = `${user.nickname} подбрасывает монету... ${SLASH_COMMANDS.flip()}`;
        finalType = 'roll';
      } else if (command === 'dice') {
        finalContent = `${user.nickname} бросает кости... ${SLASH_COMMANDS.dice()}`;
        finalType = 'roll';
      } else if (command === '8ball' && args) {
        finalContent = get8BallAnswer(args);
        finalType = 'roll';
      } else if (command === '8ball') {
        finalContent = `🎱 Задайте вопрос! Пример: /8ball Сегодня хороший день?`;
        finalType = 'system';
      } else if (command === 'me' && args) {
        finalContent = `${user.nickname} ${args}`;
        finalType = 'action';
      } else if (command === 'me') {
        finalContent = `Использование: /me [действие] - например: /me танцует`;
        finalType = 'system';
      }
    }

    // Проверка на GIF URL
    if (type === 'text' && isGifUrl(finalContent)) {
      finalType = 'gif';
      finalContent = normalizeGifUrl(finalContent);
    }

    // Поиск упоминаний @username
    const mentionRegex = /@([a-zA-Z0-9_а-яА-Я]+)/g;
    const mentions = finalContent.match(mentionRegex)?.map(m => m.slice(1)) || [];

    setInputValue('');
    setShowEmoji(false);
    setShowGif(false);

    // Добавляем XP за сообщение
    const updatedUser = { ...user, xp: (user.xp || 0) + 1 };
    localStorage.setItem('chatchain_user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    // Сохраняем replyTo перед отправкой
    const currentReplyTo = replyTo;
    setReplyTo(null);

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_message',
        roomId: currentRoomId,
        userId: user.id,
        userName: user.nickname,
        content: finalContent,
        type: finalType,
        userStatus: user.status,
        mentions,
        replyTo: currentReplyTo,
      }),
    });

    // Проверка на триггеры конфетти
    const confettiTriggers = ['поздравляю', 'ура', 'ура!', '🎉', '🎊', 'поздравить', 'с днём'];
    if (confettiTriggers.some(trigger => finalContent.toLowerCase().includes(trigger))) {
      triggerConfetti();
    }

    syncMessages();
  };

  // Функция триггера конфетти
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Обработка реакции на сообщение
  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      return {
        ...msg,
        reactions: toggleReactionUtil(msg.reactions, emoji, user.id),
      };
    }));
    
    setActiveReactionMsg(null);
  };

  // Начать редактирование
  const startEditMessage = (msg: Message) => {
    setEditingMessage(msg.id);
    setEditContent(msg.content);
  };

  // Сохранить редактирование
  const saveEditMessage = async (msgId: string) => {
    if (!user || !editContent.trim()) return;
    
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_message',
        roomId: currentRoomId,
        messageId: msgId,
        userId: user.id,
        content: editContent.trim(),
      }),
    });
    
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      return { ...msg, content: editContent.trim(), editedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) };
    }));
    
    setEditingMessage(null);
    setEditContent('');
  };

  // Отменить редактирование
  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  // Удалить сообщение
  const handleDeleteMessage = async (msgId: string) => {
    if (!user) return;
    
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_message',
        roomId: currentRoomId,
        messageId: msgId,
        userId: user.id,
      }),
    });
    
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      return { ...msg, deleted: true, content: 'Сообщение удалено' };
    }));
  };

  // Начать ответ
  const startReplyTo = (msg: Message) => {
    setReplyTo({
      messageId: msg.id,
      content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
      user: msg.user,
    });
  };

  // Отменить ответ
  const cancelReply = () => setReplyTo(null);

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Воспроизведение голосового сообщения
  const playVoiceMessage = async (messageId: string, voiceIdOrData: string) => {
    console.log('=== playVoiceMessage START ===');
    console.log('messageId:', messageId);
    console.log('voiceIdOrData:', voiceIdOrData);

    if (playingVoiceId === messageId) {
      console.log('Stopping playback');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      console.log('Stopping previous audio');
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      if (!voiceIdOrData || typeof voiceIdOrData !== 'string') {
        console.error('Invalid voice data');
        alert('Ошибка: данные отсутствуют');
        return;
      }

      let audioUrl: string;

      if (voiceIdOrData.startsWith('voice_')) {
        audioUrl = `/api/voice?id=${voiceIdOrData}`;
        console.log('Loading from API:', audioUrl);
      } else if (voiceIdOrData.startsWith('data:audio')) {
        audioUrl = voiceIdOrData;
      } else if (voiceIdOrData.length > 100) {
        audioUrl = `data:audio/webm;base64,${voiceIdOrData}`;
      } else {
        alert('Неизвестный формат');
        return;
      }

      // Скачиваем аудио как ArrayBuffer и воспроизводим через Web Audio API
      console.log('Fetching audio...');
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      console.log('Audio fetched, size:', arrayBuffer.byteLength);

      // Создаём AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext state:', audioContext.state);
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed');
      }

      // Декодируем аудио
      console.log('Decoding audio...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio decoded, duration:', audioBuffer.duration, 'channels:', audioBuffer.numberOfChannels);
      
      // Проверяем, есть ли звук (не тишина)
      const channelData = audioBuffer.getChannelData(0);
      let maxAmplitude = 0;
      for (let i = 0; i < channelData.length; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > maxAmplitude) maxAmplitude = abs;
      }
      console.log('Max amplitude in audio:', maxAmplitude.toFixed(4), '(1.0 = max, 0.0 = silence)');
      
      if (maxAmplitude < 0.01) {
        console.warn('⚠️ Audio appears to be silent or very quiet!');
      }

      // Создаём источник
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Создаём gain node для контроля громкости
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0; // Максимальная громкость
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log('AudioContext destination:', audioContext.destination);
      console.log('Gain node connected, volume:', gainNode.gain.value);
      
      source.onended = () => {
        console.log('Playback ended');
        setPlayingVoiceId(null);
      };

      setPlayingVoiceId(messageId);
      source.start(0);
      console.log('✅ Playback started via Web Audio API');

    } catch (error: any) {
      console.error('❌ Error:', error);
      setPlayingVoiceId(null);
      alert('Ошибка воспроизведения: ' + (error.message || error));
    }
  };

  // Остановка записи голосового
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  };

  // Начало записи голосового сообщения
  const startVoiceRecording = async () => {
    console.log('startVoiceRecording called');
    
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted, tracks:', stream.getTracks().length);

      // Определяем поддерживаемый формат для записи
      // Safari не поддерживает webm, используем mp4
      let mimeType = 'audio/webm';
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
      } else {
        // Fallback - пробуем webm
        mimeType = 'audio/webm';
      }

      console.log('Using audio format:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      console.log('MediaRecorder created, state:', mediaRecorder.state);

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log('ondataavailable, size:', e.data.size);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('onstop called');
        stream.getTracks().forEach(track => track.stop());

        // Сохраняем duration ДО обнуления
        const finalDuration = recordingTimeRef.current;
        console.log('Recording stopped, duration:', finalDuration, 'chunks:', chunks.length);

        if (chunks.length > 0 && finalDuration > 0) {
          const blob = new Blob(chunks, { type: mimeType });
          console.log('Blob created, size:', blob.size, 'bytes');
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;

            console.log('Voice message encoded, base64 length:', base64.length, 'duration:', finalDuration);

            try {
              // Сначала сохраняем голосовое сообщение через API
              const voiceRes = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioData: base64,
                  userId: user?.id,
                  userName: user?.nickname,
                  duration: finalDuration,
                  mimeType: mimeType,
                }),
              });

              const voiceData = await voiceRes.json();
              console.log('Voice API response:', voiceData);

              if (voiceData.success && voiceData.voiceId) {
                // Затем отправляем сообщение в чат с voiceId
                await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'send_message',
                    roomId: currentRoomId,
                    userId: user?.id,
                    userName: user?.nickname,
                    content: voiceData.voiceId, // Сохраняем только ID
                    type: 'voice',
                    voiceDuration: finalDuration,
                  }),
                });
                console.log('Voice message sent with ID:', voiceData.voiceId);
                syncMessages();
              } else {
                console.error('Failed to save voice:', voiceData.error);
                alert('Не удалось сохранить голосовое сообщение: ' + (voiceData.error || 'неизвестная ошибка'));
              }
            } catch (error) {
              console.error('Error sending voice message:', error);
              alert('Ошибка при отправке голосового сообщения');
            }
          };
          reader.readAsDataURL(blob);
        } else {
          console.log('No audio data: chunks=', chunks.length, 'duration=', finalDuration);
          if (finalDuration === 0) {
            alert('Запись слишком короткая. Удерживайте кнопку дольше.');
          }
        }

        setIsRecording(false);
        setRecordingTime(0);
        recordingTimeRef.current = 0;
      };

      // Записываем с интервалом для получения данных
      mediaRecorder.start(1000);
      console.log('MediaRecorder started');
      
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      
      // Таймер записи
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(prev => {
          const newTime = prev + 1;
          console.log('Recording time:', newTime);
          return newTime;
        });
      }, 1000);
      console.log('Recording interval started');
      
    } catch (error: any) {
      console.error('Ошибка доступа к микрофону:', error);
      let errorMsg = 'Не удалось получить доступ к микрофону';
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Доступ к микрофону запрещён. Разрешите его в настройках браузера.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'Микрофон не найден. Подключите микрофон и попробуйте снова.';
      }
      alert(errorMsg);
    }
  };

  // Остановка записи
  const stopVoiceRecording = () => {
    console.log('stopVoiceRecording called, isRecording:', isRecording);
    
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping MediaRecorder, state:', mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      console.log('Clearing recording interval');
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Отправка статуса "печатает"
  const handleTyping = () => {
    if (!user) return;
    
    // Отправляем на сервер (можно оптимизировать)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'typing',
        roomId: currentRoomId,
        userId: user.id,
        userName: user.nickname,
      }),
    });
  };

  const handleSendText = () => {
    sendMessage(inputValue, 'text');
  };

  const handleSendGif = (gifUrl: string) => {
    sendMessage(gifUrl, 'gif');
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const originalSrc = target.src;

    // Если уже пробовали все методы - показываем ошибку
    if (target.dataset.retried === 'proxy') {
      // Пробуем wsrv.nl
      target.dataset.retried = 'wsrv';
      target.src = `https://wsrv.nl/?url=${encodeURIComponent(originalSrc.split('/api/gif-proxy?url=')[1] || originalSrc)}`;
      return;
    }
    
    if (target.dataset.retried === 'wsrv') {
      target.style.display = 'none';
      const parent = target.parentElement;
      if (parent && !parent.querySelector('.gif-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'gif-error';
        errorDiv.innerHTML = '🎬 GIF недоступен';
        parent.appendChild(errorDiv);
      }
      return;
    }

    // Первый fallback - наш прокси
    target.dataset.retried = 'proxy';
    target.src = `/api/gif-proxy?url=${encodeURIComponent(originalSrc)}`;
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmoji(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendText();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    handleTyping();
  };

  const handleCreateRoom = (name: string, password: string) => {
    if (!user) return;
    const newRoom = createRoomUtil(name, password, user.id);
    setRooms(getRooms());
    setCurrentRoomId(newRoom.id);
    setMessages([]);
    messageIdsRef.current.clear();
    setShowCreateRoom(false);
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (room.password) {
      setPasswordRoom(room);
      setShowPasswordModal(true);
      return;
    }

    const result = joinRoom(roomId, user.id);
    if (result.success && result.room) {
      setCurrentRoomId(roomId);
      const roomMessages = result.room.messages || [];
      setMessages(roomMessages);
      messageIdsRef.current.clear();
      roomMessages.forEach((m: Message) => messageIdsRef.current.add(m.id));
      setRooms(getRooms());

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_room',
          roomId,
          userId: user.id,
          userName: user.nickname,
        }),
      });
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (!user || !passwordRoom) return;
    const result = joinRoom(passwordRoom.id, user.id, password);
    if (result.success && result.room) {
      setCurrentRoomId(passwordRoom.id);
      setMessages(result.room.messages || []);
      setShowPasswordModal(false);
      setPasswordRoom(null);
      setPasswordError('');
    } else {
      setPasswordError(result.error || 'Ошибка');
    }
  };

  const handleInvite = () => {
    alert('Приглашение отправлено!');
    setShowInviteModal(false);
  };

  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const isRegistered = user ? getIsUserRegistered() : false;

  if (!user) {
    return <div className="app-container">{t('loading')}</div>;
  }

  return (
    <div className="app-container">
      <Header
        nickname={user.nickname}
        onlineCount={onlineCount}
        userRole={userRole}
        onAdminClick={() => setShowAdminPanel(true)}
        currentUserId={user.id}
        isRegistered={isRegistered}
        onRegisterClick={() => isRegistered ? setShowProfileModal(true) : setShowAuthModal(true)}
      />

      <div style={{ display: 'flex', gap: '20px', flex: 1, position: 'relative' }}>
        {!isMobile && (
          <RoomsSidebar
            rooms={rooms}
            currentRoomId={currentRoomId}
            user={user}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={() => setShowCreateRoom(true)}
          />
        )}

        <main className="chat-main" style={{ flex: 1, marginBottom: isMobile ? '60px' : '0' }}>
          <div style={{ padding: isMobile ? '8px 12px' : '10px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '14px' : 'inherit' }}>{currentRoom?.name || t('chat')}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: isMobile ? '12px' : 'inherit' }}>• {onlineCount} {t('participants')}</span>
              </div>
              {!currentRoom?.isLobby && !isMobile && (
                <button className="invite-btn" onClick={() => setShowInviteModal(true)}>
                  📨 {t('invite')}
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => setShowMobileMusic(!showMobileMusic)}
                  style={{
                    background: '#1db954',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '12px',
                  }}
                >
                  🎵
                </button>
              )}
            </div>
          </div>

          {/* Уведомление о вызове на дуэль */}
          {showDuelNotification && pendingDuel && (
            <div className="duel-notification-banner">
              <div className="duel-notification-content">
                <span className="duel-icon">⚔️</span>
                <div className="duel-text">
                  <strong>{pendingDuel.challengerName}</strong> вызывает вас на дуэль!
                  <span className="duel-bet">Ставка: {pendingDuel.bet} HP</span>
                </div>
                <div className="duel-actions-banner">
                  <button
                    className="duel-accept-btn"
                    onClick={() => {
                      window.location.href = '/duel';
                    }}
                  >
                    Принять
                  </button>
                  <button
                    className="duel-dismiss-btn"
                    onClick={() => setShowDuelNotification(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="messages-container">
            {messages.map((msg) => {
              const msgRole = getUserRole(msg.user);
              const isStaff = msgRole === 'admin' || msgRole === 'moderator';
              const isOwn = msg.userId === user?.id;
              
              // Подсветка упоминаний
              const highlightMentions = (text: string) => {
                if (!text) return text;
                const parts = text.split(/(@[a-zA-Z0-9_а-яА-Я]+)/g);
                return parts.map((part, i) => {
                  if (part.startsWith('@')) {
                    const mentionedName = part.slice(1);
                    const isMentioned = mentionedName.toLowerCase() === user?.nickname.toLowerCase();
                    return (
                      <span key={i} className={isMentioned ? 'mention-highlight' : 'mention'}>
                        {part}
                      </span>
                    );
                  }
                  return part;
                });
              };
              
              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`message discord-style ${msg.type === 'system' ? 'system' : isOwn ? 'own' : 'other'}`}
                  onMouseEnter={() => msg.type !== 'system' && setHoveredMessage(msg.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {msg.type !== 'system' && msg.type !== 'action' && msg.type !== 'roll' && (
                    <div className="message-avatar">
                      <img 
                        src={getUserAvatar(msg.userId, 40)} 
                        alt={msg.user}
                        className="avatar-img"
                      />
                    </div>
                  )}
                  <div className="message-body">
                    {/* Ответ/цитата */}
                    {msg.replyTo && (
                      <div className="discord-reply" onClick={() => {
                        const el = document.getElementById(`msg-${msg.replyTo?.messageId}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el?.classList.add('highlight-pulse');
                        setTimeout(() => el?.classList.remove('highlight-pulse'), 1500);
                      }}>
                        <div className="reply-line"></div>
                        <img src={getUserAvatar(msg.replyTo.user, 16)} alt="" className="reply-avatar" />
                        <span className="reply-author">{msg.replyTo.user}</span>
                        <span className="reply-preview">{msg.replyTo.content}</span>
                      </div>
                    )}
                    
                    {msg.type !== 'system' && msg.type !== 'action' && msg.type !== 'roll' && (
                      <div className="message-header">
                        <span className="message-user">
                          {msg.user}
                          {isStaff && (
                            <span className={`message-role-badge ${msgRole}`}>
                              {msgRole === 'admin' ? '👑' : '🛡️'}
                            </span>
                          )}
                        </span>
                        <span className="message-time">
                          {msg.time}
                          {msg.editedAt && <span className="edited-mark"> (ред.)</span>}
                        </span>
                      </div>
                    )}
                    
                    {/* Редактирование */}
                    {editingMessage === msg.id ? (
                      <div className="discord-edit-container">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditMessage(msg.id);
                            if (e.key === 'Escape') cancelEditMessage();
                          }}
                          className="discord-edit-input"
                          autoFocus
                        />
                        <div className="discord-edit-hint">
                          escape для отмены • enter для сохранения</div>
                      </div>
                    ) : (
                      <div className={`message-content ${msg.type === 'action' ? 'action-message' : msg.type === 'roll' ? 'roll-message' : msg.type === 'sticker' ? 'sticker-message' : ''}`}>
                        {msg.type === 'gif' ? (
                          <img
                            src={msg.content}
                            alt="GIF"
                            className="message-gif"
                            onError={handleImageError}
                            loading="lazy"
                          />
                        ) : msg.type === 'image' ? (
                          <img src={msg.content} alt="Image" className="message-image" loading="lazy" />
                        ) : msg.type === 'voice' ? (
                          <div className={`voice-message ${playingVoiceId === msg.id ? 'playing' : ''}`}>
                            <button
                              className="voice-play-btn"
                              onClick={() => playVoiceMessage(msg.id, msg.content)}
                              title={msg.content ? 'Нажмите для воспроизведения' : 'Голосовое сообщение недоступно'}
                              disabled={!msg.content}
                            >
                              {playingVoiceId === msg.id ? '⏸️' : '▶️'}
                            </button>
                            <div className="voice-waveform">
                              <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span className="voice-duration">
                              {msg.voiceDuration ? formatTime(msg.voiceDuration) : '0:00'}
                            </span>
                          </div>
                        ) : msg.type === 'sticker' ? (
                          (() => {
                            try {
                              const stickerData = JSON.parse(msg.content);
                              return (
                                <div className="sticker-display" style={{ background: stickerData.gradient }}>
                                  <span className="sticker-emoji-large">{stickerData.emoji}</span>
                                </div>
                              );
                            } catch {
                              return <span style={{ fontSize: '64px' }}>{msg.content}</span>;
                            }
                          })()
                        ) : (
                          highlightMentions(msg.content)
                        )}
                      </div>
                    )}
                    
                    {/* Превью ссылок */}
                    {msg.type === 'text' && extractUrls(msg.content).length > 0 && (
                      <div className="link-previews">
                        {extractUrls(msg.content).slice(0, 1).map((url, i) => (
                          <LinkPreview key={i} url={url} />
                        ))}
                      </div>
                    )}
                    
                    {/* Реакции Discord стиля */}
                    {msg.type !== 'system' && msg.type !== 'action' && msg.type !== 'roll' && (
                      <div className="discord-reactions">
                        {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                          <>
                            {msg.reactions.map((reaction: Reaction, i: number) => (
                              <button
                                key={i}
                                className={`discord-reaction ${reaction.users.includes(user?.id || '') ? 'active' : ''}`}
                                onClick={() => handleReaction(msg.id, reaction.emoji)}
                              >
                                <span className="reaction-emoji">{reaction.emoji}</span>
                                <span className="reaction-count">{reaction.users.length}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Панель действий Discord - появляется при hover */}
                  {hoveredMessage === msg.id && msg.type !== 'system' && msg.type !== 'action' && msg.type !== 'roll' && editingMessage !== msg.id && (
                    <div className="discord-actions">
                      <button 
                        className="discord-action-btn" 
                        onClick={() => handleReaction(msg.id, '👍')}
                        title="Быстрая реакция"
                      >
                        😊
                      </button>
                      <button 
                        className="discord-action-btn" 
                        onClick={() => startReplyTo(msg)}
                        title="Ответить"
                      >
                        <Reply size={16} />
                      </button>
                      {/* Кнопка поблагодарить */}
                      {!isOwn && (
                        <button 
                          className="discord-action-btn thanks-btn" 
                          onClick={async () => {
                            if (!user) return;
                            try {
                              const res = await fetch('/api/gift', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'thank',
                                  fromId: user.id,
                                  fromName: user.nickname,
                                  toId: msg.userId,
                                  toName: msg.user,
                                  messageId: msg.id,
                                }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                // Обновляем UI
                                setMessageThanks(prev => ({
                                  ...prev,
                                  [msg.id]: {
                                    count: (prev[msg.id]?.count || 0) + 1,
                                    users: [...(prev[msg.id]?.users || []), user.nickname]
                                  }
                                }));
                                // Показываем уведомление
                                const thanksNotif = document.createElement('div');
                                thanksNotif.className = 'thanks-toast';
                                thanksNotif.innerHTML = `💚 Вы поблагодарили <strong>${msg.user}</strong> (+${data.thanks.amount} HP)`;
                                document.body.appendChild(thanksNotif);
                                setTimeout(() => thanksNotif.remove(), 3000);
                              }
                            } catch (e) {
                              console.error('Error sending thanks:', e);
                            }
                          }}
                          title="Поблагодарить (+5 HP)"
                        >
                          <Heart size={16} />
                        </button>
                      )}
                      {/* Кнопка подарить */}
                      {!isOwn && (
                        <button 
                          className="discord-action-btn gift-btn" 
                          onClick={() => {
                            setGiftRecipient({ id: msg.userId, name: msg.user });
                            setShowGiftModal(true);
                          }}
                          title="Подарить HP"
                        >
                          <Gift size={16} />
                        </button>
                      )}
                      {isOwn && (
                        <>
                          <button 
                            className="discord-action-btn" 
                            onClick={() => startEditMessage(msg)}
                            title="Редактировать"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="discord-action-btn delete" 
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        className="discord-action-btn more" 
                        onClick={() => setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)}
                        title="Ещё реакции"
                      >
                        <Smile size={16} />
                      </button>
                    </div>
                  )}
                  
                  {/* Пикер реакций */}
                  {activeReactionMsg === msg.id && (
                    <div className="discord-reaction-picker" onClick={(e) => e.stopPropagation()}>
                      {AVAILABLE_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          className="discord-reaction-btn"
                          onClick={() => { handleReaction(msg.id, emoji); setActiveReactionMsg(null); }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Индикатор "печатает" */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <span className="typing-dots">
                  <span></span><span></span><span></span>
                </span>
                <span>{typingUsers.join(', ')} печатает...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Discord style reply preview */}
          {replyTo && (
            <div className="discord-reply-preview">
              <div className="reply-preview-content">
                <Reply size={14} />
                <span>Ответ <b>{replyTo.user}</b>: {replyTo.content}</span>
              </div>
              <button className="reply-preview-close" onClick={cancelReply}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className="input-toolbar">
            <button className={`toolbar-btn ${showEmoji ? 'active' : ''}`} onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); setShowStats(false); }}>😊</button>
            <button className={`toolbar-btn gif-icon-btn ${showGif ? 'active' : ''}`} onClick={() => { setShowGif(!showGif); setShowEmoji(false); setShowStats(false); }} title="GIF">
              <ImageIcon size={20} />
            </button>
            <button className={`toolbar-btn ${showStats ? 'active' : ''}`} onClick={() => { setShowStats(!showStats); setShowEmoji(false); setShowGif(false); fetchLeaderboard(); }} title="Статистика">📊</button>
            <button className="toolbar-btn" onClick={() => { setShowStats(true); fetchLeaderboard(); }} title="Топ">🏆</button>
          </div>

          <div className="input-container">
            <input
              id="messageInput"
              type="text"
              placeholder={isRecording ? `🔴 Запись: ${formatTime(recordingTime)}` : t('enterMessage')}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isRecording}
              style={isRecording ? { background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' } : {}}
            />
            {isRecording ? (
              <>
                <button 
                  id="sendBtn" 
                  onClick={stopVoiceRecording}
                  style={{ background: 'var(--accent-secondary)' }}
                  title="Отправить голосовое"
                >
                  ➤
                </button>
                <button 
                  style={{
                    width: '40px',
                    height: '40px',
                    border: 'none',
                    background: 'var(--accent-danger)',
                    color: 'white',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                  onClick={cancelRecording}
                  title="Отменить запись"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button 
                  style={{
                    width: '40px',
                    height: '40px',
                    border: 'none',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.3s',
                  }}
                  onClick={startVoiceRecording}
                  title="Голосовое сообщение"
                >
                  🎤
                </button>
                <button id="sendBtn" onClick={handleSendText}>➤</button>
              </>
            )}
          </div>
        </main>

        {!isMobile && (
          <SharedMusicPlayer
            currentUserId={user.id}
            currentUserName={user.nickname}
            mode="full"
          />
        )}
      </div>

      {showGif && (
        <GifPicker onSelect={handleSendGif} onClose={() => setShowGif(false)} />
      )}

      {showEmoji && (
        <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmoji(false)} />
      )}

      {isMobile && showMobileMusic && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowMobileMusic(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
            <SharedMusicPlayer currentUserId={user.id} currentUserName={user.nickname} mode="mobile" />
          </div>
        </div>
      )}

      <CreateRoomModal isOpen={showCreateRoom} onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} />
      <PasswordModal isOpen={showPasswordModal} roomName={passwordRoom?.name || ''} onClose={() => { setShowPasswordModal(false); setPasswordRoom(null); setPasswordError(''); }} onSubmit={handlePasswordSubmit} error={passwordError} />
      <InviteModal isOpen={showInviteModal} roomName={currentRoom?.name || ''} users={[]} onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />

      {showAdminPanel && (
        <AdminPanel
          currentUserId={user.id}
          currentUserRole={userRole}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {showProfileModal && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Ежедневная награда */}
      {showDailyReward && dailyRewardData && (
        <div className="daily-reward-overlay" onClick={() => setShowDailyReward(false)}>
          <div className="daily-reward-modal" onClick={e => e.stopPropagation()}>
            <div className="daily-reward-icon">🎁</div>
            <h2 className="daily-reward-title">Ежедневная награда!</h2>
            <div className="daily-reward-streak">
              🔥 Серия: {dailyRewardData.streak} {dailyRewardData.streak === 1 ? 'день' : dailyRewardData.streak < 5 ? 'дня' : 'дней'}
            </div>
            <div className="daily-reward-bonus">
              +{dailyRewardData.bonus} XP
            </div>
            <button className="daily-reward-btn" onClick={() => setShowDailyReward(false)}>
              Забрать!
            </button>
          </div>
        </div>
      )}

      {/* Конфетти эффект */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'][Math.floor(Math.random() * 6)],
              }}
            />
          ))}
        </div>
      )}

      <HeartsEffect currentUserId={user.id} />

      {/* Модальное окно подарка */}
      {showGiftModal && giftRecipient && (
        <GiftModal
          isOpen={showGiftModal}
          onClose={() => {
            setShowGiftModal(false);
            setGiftRecipient(null);
          }}
          toUser={giftRecipient}
          fromUser={{
            id: user.id,
            name: user.nickname,
            hp: user.xp || 0,
          }}
          onGiftSent={async (gift: any) => {
            // Обновляем баланс пользователя
            const updatedUser = { ...user, xp: gift.senderNewHp };
            localStorage.setItem('chatchain_user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            // Отправляем системное сообщение о подарке в чат
            await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_message',
                roomId: currentRoomId,
                userId: 'system',
                userName: '🎁 Подарки',
                content: `${user.nickname} подарил(а) ${giftRecipient.name} ${gift.amount} HP!${gift.message ? ` "${gift.message}"` : ''}`,
                type: 'system',
              }),
            });
            syncMessages();
            setShowGiftModal(false);
            setGiftRecipient(null);
          }}
        />
      )}

      {/* Панель статистики и топа */}
      {showStats && (
        <div 
          className="stats-overlay"
          onClick={() => setShowStats(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '20px',
              width: '90%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📊 Статистика</h2>
              <button 
                onClick={() => setShowStats(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >✕</button>
            </div>

            {/* Моя статистика */}
            {user && (
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                borderRadius: '12px', 
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>👤 {user.nickname}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Уровень</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {getLevelByXp(user.xp || 0).emoji} {getLevelByXp(user.xp || 0).level}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>XP</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-primary)' }}>
                      {user.xp || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Поинты</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-warning)' }}>
                      💎 {user.points || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Статус</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                      {getStatusEmoji(user.status)} {getStatusName(user.status)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Система статусов */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🏆 Система статусов</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', flex: 1, minWidth: '70px' }}>
                  <div style={{ fontSize: '20px' }}>👤</div>
                  <div style={{ fontSize: '10px' }}>Гость</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', textAlign: 'center', flex: 1, minWidth: '70px', border: '1px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '20px' }}>⭐</div>
                  <div style={{ fontSize: '10px' }}>Участник</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', textAlign: 'center', flex: 1, minWidth: '70px', border: '1px solid var(--accent-warning)' }}>
                  <div style={{ fontSize: '20px' }}>👑</div>
                  <div style={{ fontSize: '10px' }}>Король</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', textAlign: 'center', flex: 1, minWidth: '70px', border: '1px solid var(--accent-love)' }}>
                  <div style={{ fontSize: '20px' }}>🏆</div>
                  <div style={{ fontSize: '10px' }}>Легенда</div>
                </div>
              </div>
            </div>

            {/* Топ пользователей */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>🏆 Топ пользователей</h3>
                <button 
                  onClick={fetchLeaderboard}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  🔄
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {leaderboard.map((player, index) => (
                  <div 
                    key={player.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: index < 3 
                        ? `linear-gradient(135deg, ${index === 0 ? 'rgba(245, 158, 11, 0.15)' : index === 1 ? 'rgba(156, 163, 175, 0.15)' : 'rgba(217, 119, 6, 0.15)'}, transparent)` 
                        : 'var(--bg-tertiary)',
                      borderRadius: '10px',
                      border: index < 3 ? `1px solid ${index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : '#d97706'}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{player.badge}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '13px' }}>{player.userName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{player.messageCount} сообщений</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', color: 'var(--accent-primary)', fontSize: '13px' }}>💎 {player.totalPoints}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
