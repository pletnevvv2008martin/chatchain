// Типы данных
export interface Reaction {
  emoji: string;
  users: string[]; // user ids who reacted
}

export interface User {
  id: string;
  nickname: string;
  points: number;
  investedAmount: number;
  status: 'guest' | 'participant' | 'king' | 'legend' | 'registered';
  level: number;
  xp: number;
  lastDailyReward?: string; // ISO date string
  streak?: number; // consecutive days
}

export interface Message {
  id: string;
  userId: string;
  user: string;
  content: string;
  time: string;
  type: 'text' | 'image' | 'system' | 'gif' | 'action' | 'dice' | 'roll' | 'sticker' | 'voice';
  userStatus?: 'guest' | 'participant' | 'king' | 'legend' | 'registered';
  reactions?: Reaction[];
  mentions?: string[]; // mentioned user nicknames
  isPinned?: boolean;
  voiceDuration?: number; // duration in seconds for voice messages
  voiceId?: string; // reference to voice file
}

export interface Room {
  id: string;
  name: string;
  password?: string;
  createdBy: string;
  users: string[];
  messages: Message[];
  maxUsers: number;
  isLobby: boolean;
  lobbyNumber?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  cover?: string;
  addedBy: string;
  isPaid: boolean;
  likes: number;
}

export interface MusicState {
  currentTrack: Track | null;
  queue: Track[];
  paidQueue: Track[];
  isPlaying: boolean;
  progress: number;
}

// Утилиты для localStorage
const STORAGE_KEYS = {
  USER: 'chatchain_user',
  ROOMS: 'chatchain_rooms',
  MESSAGES: 'chatchain_messages',
};

// Генерация ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Получение статуса по сумме вложений
export const getStatusByAmount = (amount: number): 'guest' | 'participant' | 'king' | 'legend' => {
  if (amount >= 100000) return 'legend';
  if (amount >= 10000) return 'king';
  if (amount >= 100) return 'participant';
  return 'guest';
};

// Название статуса
export const getStatusName = (status: 'guest' | 'participant' | 'king' | 'legend'): string => {
  const names = {
    guest: 'Гость',
    participant: 'Участник',
    king: 'Король',
    legend: 'Легенда',
  };
  return names[status];
};

// Эмодзи статуса
export const getStatusEmoji = (status: 'guest' | 'participant' | 'king' | 'legend' | 'registered'): string => {
  const emojis = {
    guest: '👤',
    participant: '⭐',
    king: '👑',
    legend: '🏆',
    registered: '✨',
  };
  return emojis[status];
};

// Цвет статуса
export const getStatusColor = (status: 'guest' | 'participant' | 'king' | 'legend' | 'registered'): string => {
  const colors = {
    guest: '#64748b',
    participant: '#3b82f6',
    king: '#f59e0b',
    legend: '#ec4899',
    registered: '#22c55e',
  };
  return colors[status];
};

// Уровни и ранги
export const LEVELS = [
  { level: 1, name: 'Новичок', xpRequired: 0, color: '#94a3b8' },
  { level: 2, name: 'Участник', xpRequired: 50, color: '#64748b' },
  { level: 3, name: 'Активист', xpRequired: 150, color: '#3b82f6' },
  { level: 4, name: 'Завсегдатай', xpRequired: 300, color: '#8b5cf6' },
  { level: 5, name: 'Ветеран', xpRequired: 500, color: '#ec4899' },
  { level: 6, name: 'Эксперт', xpRequired: 800, color: '#f59e0b' },
  { level: 7, name: 'Мастер', xpRequired: 1200, color: '#ef4444' },
  { level: 8, name: 'Гуру', xpRequired: 1800, color: '#10b981' },
  { level: 9, name: 'Легенда', xpRequired: 2500, color: '#f97316' },
  { level: 10, name: 'Бог чата', xpRequired: 3500, color: '#eab308' },
];

export const getLevelByXp = (xp: number): { level: number; name: string; color: string; progress: number } => {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  
  const currentXpInLevel = xp - currentLevel.xpRequired;
  const xpNeededForNext = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = currentLevel.level === 10 ? 100 : Math.floor((currentXpInLevel / xpNeededForNext) * 100);
  
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    color: currentLevel.color,
    progress,
  };
};

// Аватар пользователя (генерация на основе ID)
export const getUserAvatar = (userId: string, size: number = 40): string => {
  // Современные минималистичные геометрические аватары
  const seed = userId.replace(/[^a-zA-Z0-9]/g, '') || 'default';
  // DiceBear "shapes" - стильная геометрия с градиентами
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&size=${size}&backgroundColor=0D8ABC,FF6B6B,4ECDC4,45B7D1,96CEB4,FFEAA7,DDA0DD,98D8C8`;
};

// Доступные реакции
export const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '🎉', '👎'];

// Обновление реакций
export const toggleReaction = (
  reactions: Reaction[] | undefined,
  emoji: string,
  userId: string
): Reaction[] => {
  const currentReactions = Array.isArray(reactions) ? reactions : [];
  const existingIndex = currentReactions.findIndex(r => r.emoji === emoji);
  
  if (existingIndex >= 0) {
    const reaction = currentReactions[existingIndex];
    if (reaction.users.includes(userId)) {
      // Remove user from reaction
      const newUsers = reaction.users.filter(id => id !== userId);
      if (newUsers.length === 0) {
        return currentReactions.filter((_, i) => i !== existingIndex);
      }
      const newReactions = [...currentReactions];
      newReactions[existingIndex] = { ...reaction, users: newUsers };
      return newReactions;
    } else {
      // Add user to reaction
      const newReactions = [...currentReactions];
      newReactions[existingIndex] = { ...reaction, users: [...reaction.users, userId] };
      return newReactions;
    }
  } else {
    // New reaction
    return [...currentReactions, { emoji, users: [userId] }];
  }
};

// Работа с пользователем
export const getUser = (): User => {
  if (typeof window === 'undefined') {
    return {
      id: '',
      nickname: 'Гость',
      points: 100,
      investedAmount: 0,
      status: 'guest',
      level: 1,
      xp: 0,
    };
  }

  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  if (stored) {
    const user = JSON.parse(stored);
    // Ensure new fields exist
    return {
      level: 1,
      xp: 0,
      ...user,
    };
  }

  const newUser: User = {
    id: generateId(),
    nickname: `Гость_${Math.floor(Math.random() * 10000)}`,
    points: 100,
    investedAmount: 0,
    status: 'guest',
    level: 1,
    xp: 0,
  };

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  return newUser;
};

export const updateUser = (updates: Partial<User>): User => {
  if (typeof window === 'undefined') {
    return {
      id: '',
      nickname: 'Гость',
      points: 100,
      investedAmount: 0,
      status: 'guest',
      level: 1,
      xp: 0,
    };
  }

  const user = getUser();
  const updatedUser = { ...user, ...updates };

  if (updates.investedAmount !== undefined) {
    updatedUser.status = getStatusByAmount(updates.investedAmount);
  }
  
  // Update level based on XP
  if (updates.xp !== undefined) {
    const levelInfo = getLevelByXp(updates.xp);
    updatedUser.level = levelInfo.level;
  }

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  return updatedUser;
};

// Добавление XP пользователю
export const addXp = (amount: number): User => {
  const user = getUser();
  return updateUser({ xp: (user.xp || 0) + amount });
};

// Проверка ежедневной награды
export const checkDailyReward = (): { claimed: boolean; streak: number; bonus: number } => {
  const user = getUser();
  const today = new Date().toDateString();
  
  if (user.lastDailyReward === today) {
    return { claimed: true, streak: user.streak || 0, bonus: 0 };
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = user.lastDailyReward === yesterday.toDateString();
  
  const newStreak = wasYesterday ? (user.streak || 0) + 1 : 1;
  const bonus = 10 + (newStreak * 5); // Базовые 10 + бонус за серию
  
  updateUser({
    lastDailyReward: today,
    streak: newStreak,
    xp: (user.xp || 0) + bonus,
    points: user.points + bonus,
  });
  
  return { claimed: false, streak: newStreak, bonus };
};

// Работа с комнатами
export const getRooms = (): Room[] => {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEYS.ROOMS);
  if (stored) {
    return JSON.parse(stored);
  }

  // Создаём первое лобби по умолчанию
  const defaultLobby: Room = {
    id: 'lobby-1',
    name: 'Public Chat #1',
    createdBy: 'system',
    users: [],
    messages: [],
    maxUsers: 100,
    isLobby: true,
    lobbyNumber: 1,
  };

  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([defaultLobby]));
  return [defaultLobby];
};

export const saveRooms = (rooms: Room[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
};

export const createRoom = (name: string, password: string, userId: string): Room => {
  const rooms = getRooms();
  const newRoom: Room = {
    id: generateId(),
    name,
    password: password || undefined,
    createdBy: userId,
    users: [userId],
    messages: [],
    maxUsers: 50,
    isLobby: false,
  };

  saveRooms([...rooms, newRoom]);
  return newRoom;
};

export const getAvailableLobby = (): Room => {
  let rooms = getRooms();
  let availableLobby = rooms.find(r => r.isLobby && r.users.length < 100);

  if (!availableLobby) {
    // Создаём новое лобби
    const lobbyNumbers = rooms
      .filter(r => r.isLobby)
      .map(r => r.lobbyNumber || 0);
    const nextNumber = Math.max(...lobbyNumbers, 0) + 1;

    availableLobby = {
      id: `lobby-${nextNumber}`,
      name: `Public Chat #${nextNumber}`,
      createdBy: 'system',
      users: [],
      messages: [],
      maxUsers: 100,
      isLobby: true,
      lobbyNumber: nextNumber,
    };

    rooms = [...rooms, availableLobby];
    saveRooms(rooms);
  }

  return availableLobby;
};

export const joinRoom = (roomId: string, userId: string, password?: string): { success: boolean; error?: string; room?: Room } => {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);

  if (!room) {
    return { success: false, error: 'Комната не найдена' };
  }

  if (room.password && room.password !== password) {
    return { success: false, error: 'Неверный пароль' };
  }

  if (room.users.length >= room.maxUsers) {
    return { success: false, error: 'Комната заполнена' };
  }

  if (!room.users.includes(userId)) {
    room.users.push(userId);
    saveRooms(rooms);
  }

  return { success: true, room };
};

export const leaveRoom = (roomId: string, userId: string) => {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);

  if (room && !room.isLobby) {
    room.users = room.users.filter(id => id !== userId);
    if (room.users.length === 0) {
      // Удаляем пустую комнату
      saveRooms(rooms.filter(r => r.id !== roomId));
    } else {
      saveRooms(rooms);
    }
  }
};

// Работа с сообщениями
export const addMessageToRoom = (roomId: string, message: Message) => {
  if (typeof window === 'undefined') return;

  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);

  if (room) {
    room.messages.push(message);
    // Храним только последние 200 сообщений
    if (room.messages.length > 200) {
      room.messages = room.messages.slice(-200);
    }
    saveRooms(rooms);
  }
};

// Демо-треки для музыкального плеера
export const DEMO_TRACKS: Omit<Track, 'addedBy' | 'isPaid' | 'likes'>[] = [
  { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', duration: 200, cover: '/img/unnamed_1_1771144713.png' },
  { id: '2', title: 'Shape of You', artist: 'Ed Sheeran', duration: 234, cover: '/img/unnamed_1_1771144713.png' },
  { id: '3', title: 'Dance Monkey', artist: 'Tones and I', duration: 210, cover: '/img/unnamed_1_1771144713.png' },
  { id: '4', title: 'Someone Like You', artist: 'Adele', duration: 285, cover: '/img/unnamed_1_1771144713.png' },
  { id: '5', title: 'Uptown Funk', artist: 'Bruno Mars', duration: 270, cover: '/img/unnamed_1_1771144713.png' },
  { id: '6', title: 'Bad Guy', artist: 'Billie Eilish', duration: 194, cover: '/img/unnamed_1_1771144713.png' },
  { id: '7', title: 'Starboy', artist: 'The Weeknd', duration: 230, cover: '/img/unnamed_1_1771144713.png' },
  { id: '8', title: 'Levitating', artist: 'Dua Lipa', duration: 203, cover: '/img/unnamed_1_1771144713.png' },
  { id: '9', title: 'Watermelon Sugar', artist: 'Harry Styles', duration: 174, cover: '/img/unnamed_1_1771144713.png' },
  { id: '10', title: 'drivers license', artist: 'Olivia Rodrigo', duration: 242, cover: '/img/unnamed_1_1771144713.png' },
];
