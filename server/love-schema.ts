import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================
// ТИПЫ
// ============================================

export type RoundType = 'waiting' | 'kiss' | 'choose_pair' | 'who_likes' | 'truth_or_dare';
export type VoteAction = 'kiss' | 'wink' | 'skip' | 'like';

// ============================================
// ПОДАРОК
// ============================================

export class LoveGift extends Schema {
  @type("string") id: string = "";
  @type("string") emoji: string = "";
  @type("string") name: string = "";
  @type("string") fromId: string = "";
  @type("string") fromName: string = "";
  @type("number") timestamp: number = Date.now();
}

// ============================================
// ИГРОК В КОМНАТЕ
// ============================================

export class LovePlayer extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("number") age: number = 25;
  @type("string") city: string = "";
  @type("string") gender: string = "male";
  @type("string") avatar: string = "👤";
  @type("string") bio: string = "";
  @type("number") rating: number = 1000;
  @type("number") level: number = 1;
  @type("number") exp: number = 0;
  @type("boolean") isOnline: boolean = true;
  @type("boolean") isVerified: boolean = false;
  @type("boolean") isRegistered: boolean = false;
  @type(["string"]) gifts: ArraySchema<string> = new ArraySchema<string>();
  @type("number") joinedAt: number = Date.now();
  @type("number") lastActive: number = Date.now();
  @type("number") kissCount: number = 0;      // Сколько раз поцеловали
  @type("number") winkCount: number = 0;      // Сколько раз подмигнули
  @type("number") likeCount: number = 0;      // Сколько раз лайкнули
}

// ============================================
// СООБЩЕНИЕ ЧАТА
// ============================================

export class LoveMessage extends Schema {
  @type("string") id: string = "";
  @type("string") playerId: string = "";
  @type("string") playerName: string = "";
  @type("string") playerAvatar: string = "";
  @type("string") text: string = "";
  @type("number") timestamp: number = Date.now();
  @type("boolean") isSystem: boolean = false;
}

// ============================================
// ГОЛОС В РАУНДЕ
// ============================================

export class LoveVote extends Schema {
  @type("string") voterId: string = "";
  @type("string") targetId: string = "";
  @type("string") action: string = "skip"; // kiss, wink, skip, like
  @type("number") timestamp: number = Date.now();
}

// ============================================
// РЕЗУЛЬТАТ РАУНДА
// ============================================

export class RoundResult extends Schema {
  @type("string") type: string = "";
  @type("string") icon: string = "";
  @type("string") title: string = "";
  @type("string") data: string = ""; // JSON строка с результатами
  @type("number") timestamp: number = Date.now();
}

// ============================================
// СОСТОЯНИЕ КОМНАТЫ
// ============================================

export class LoveRoomState extends Schema {
  // Комната
  @type("string") roomId: string = "";
  @type("string") roomName: string = "Знакомства";
  @type("number") maxPlayers: number = 12;
  @type("boolean") isSandbox: boolean = false;
  
  // Игроки
  @type({ map: LovePlayer }) players = new MapSchema<LovePlayer>();
  @type("number") playerCount: number = 0;
  
  // Раунд
  @type("string") roundType: RoundType = 'waiting';
  @type("number") roundNumber: number = 0;
  @type("number") roundTimer: number = 0;
  @type("number") roundDuration: number = 30;
  @type("boolean") roundActive: boolean = false;
  
  // Голоса
  @type({ map: LoveVote }) votes = new MapSchema<LoveVote>();
  @type("number") voteCount: number = 0;
  
  // Результаты
  @type(RoundResult) lastResult = new RoundResult();
  @type("boolean") showResults: boolean = false;
  
  // Чат
  @type(["string"]) messages: ArraySchema<string> = new ArraySchema<string>(); // JSON строки
  
  // Статистика комнаты
  @type("number") createdAt: number = Date.now();
  @type("number") totalRounds: number = 0;
  @type("number") totalKisses: number = 0;
  @type("number") totalWinks: number = 0;
  @type("number") totalLikes: number = 0;
}

// ============================================
// КОНСТАНТЫ РАУНДОВ
// ============================================

export const ROUND_CONFIG: Record<RoundType, { 
  name: string; 
  icon: string; 
  duration: number;
  description: string;
}> = {
  waiting: { name: 'Ожидание', icon: '💕', duration: 0, description: 'Место для встреч' },
  kiss: { name: 'Раунд поцелуя', icon: '💋', duration: 30, description: 'Выбери: поцелуй, подмигнуть или пропустить' },
  choose_pair: { name: 'Выбираем пару', icon: '💑', duration: 45, description: 'Голосуй за лучшую пару' },
  who_likes: { name: 'Кто больше нравится?', icon: '❤️', duration: 30, description: 'Выбери понравившегося игрока' },
  truth_or_dare: { name: 'Правда или действие', icon: '🎯', duration: 60, description: 'Отвечай честно или выполняй задание' }
};

// ============================================
// ПОДАРКИ
// ============================================

export const GIFT_ITEMS = [
  { id: 'rose', emoji: '🌹', name: 'Роза', price: 10 },
  { id: 'heart', emoji: '❤️', name: 'Сердце', price: 25 },
  { id: 'kiss', emoji: '💋', name: 'Поцелуй', price: 50 },
  { id: 'diamond', emoji: '💎', name: 'Бриллиант', price: 100 },
  { id: 'crown', emoji: '👑', name: 'Корона', price: 200 },
  { id: 'ring', emoji: '💍', name: 'Кольцо', price: 500 },
  { id: 'love', emoji: '💕', name: 'Любовь', price: 1000 },
];
