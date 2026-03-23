import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================
// ТИПЫ
// ============================================

export type NodeType = 
  | 'castle'      // Замок игрока
  | 'town'        // Город
  | 'village'     // Деревня
  | 'gold_mine'   // Золотая шахта
  | 'stone_quarry'// Каменоломня
  | 'lumber_mill' // Лесопилка
  | 'iron_mine'   // Железная шахта
  | 'farm'        // Ферма
  | 'mana_well'   // Источник маны
  | 'monster_lair' // Логово монстров
  | 'teleport'    // Телепорт на карте
  | 'obelisk';    // Обелиск перехода между картами

export type RaceId = 'human' | 'elf' | 'dwarf' | 'darkElf' | 'undead' | 'werewolf' | 'orc' | 'mage' | 'vampire' | 'dragonborn';

// ============================================
// СТАТИСТИКА ИГРОКА (общая для всех игр)
// ============================================

export class GameStats extends Schema {
  @type("number") totalGames: number = 0;
  @type("number") wins: number = 0;
  @type("number") losses: number = 0;
  @type("number") score: number = 0;
  @type("number") playTime: number = 0; // минуты
  @type("string") lastPlayed: string = "";
  @type("number") highestScore: number = 0;
}

export class AllGamesStats extends Schema {
  @type(GameStats) fortress: GameStats = new GameStats();
  @type(GameStats) mafia: GameStats = new GameStats();
  @type(GameStats) duel: GameStats = new GameStats();
  @type(GameStats) chain: GameStats = new GameStats();
  @type(GameStats) poker: GameStats = new GameStats();
}

// ============================================
// РЕСУРСЫ
// ============================================

export class Resources extends Schema {
  @type("number") gold: number = 500;
  @type("number") stone: number = 200;
  @type("number") wood: number = 200;
  @type("number") iron: number = 50;
  @type("number") food: number = 100;
  @type("number") mana: number = 50;
  @type("number") gems: number = 0;      // Новая валюта
  @type("number") teleportScrolls: number = 0; // Свитки телепорта
}

// ============================================
// АРМИЯ
// ============================================

export class Army extends Schema {
  @type("number") warriors: number = 10;
  @type("number") archers: number = 5;
  @type("number") cavalry: number = 0;
  @type("number") mages: number = 0;
  @type("number") totalPower: number = 150;
}

// ============================================
// ГЕРОЙ
// ============================================

export class Hero extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") currentNodeId: string = "";
  @type("number") x: number = 0;  // Позиция на карте
  @type("number") y: number = 0;
  @type("number") level: number = 1;
  @type("number") experience: number = 0;
  @type(Army) army = new Army();
  @type("number") movementPoints: number = 5;
  @type("number") maxMovement: number = 5;
  @type("number") attack: number = 10;
  @type("number") defense: number = 10;
}

// ============================================
// ТЕРРИТОРИЯ ЗАМКА
// ============================================

export class CastleTerritory extends Schema {
  @type("number") centerX: number = 0;
  @type("number") centerY: number = 0;
  @type("number") radius: number = 50; // Радиус территории
  @type(["string"]) ownedNodes: ArraySchema<string> = new ArraySchema<string>();
  @type("number") defenseBonus: number = 20;
}

// ============================================
// УЗЕЛ КАРТЫ
// ============================================

export class MapNode extends Schema {
  @type("string") id: string = "";
  @type("string") type: NodeType = 'village';
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") ownerId: string = "";
  @type("string") ownerName: string = "";
  @type("string") heroId: string = "";
  @type("number") garrison: number = 0;
  @type("number") defense: number = 0;
  @type(["string"]) connections: ArraySchema<string> = new ArraySchema<string>();
  @type("number") goldReward: number = 0;
  @type("number") monsterPower: number = 0;
  @type("string") monsterType: string = ""; // Тип монстра
  @type("string") terrain: string = "🌿";   // Эмодзи ландшафта
  @type("boolean") isTerritory: boolean = false; // Часть территории замка
}

// ============================================
// ТЕЛЕПОРТ
// ============================================

export class Teleport extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") targetMapId: string = ""; // Для обелисков
  @type("string") targetTeleportId: string = ""; // Для телепортов на той же карте
  @type("number") cost: number = 100; // Стоимость использования
  @type("string") type: "teleport" | "obelisk" = "teleport";
}

// ============================================
// ЗДАНИЕ
// ============================================

export class Building extends Schema {
  @type("string") id: string = "";
  @type("number") level: number = 0;
}

// ============================================
// ИГРОК
// ============================================

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") race: RaceId = 'human';
  @type("string") color: string = "#4a90d9";
  @type(Resources) resources = new Resources();
  @type({ map: Hero }) heroes = new MapSchema<Hero>();
  @type({ map: Building }) buildings = new MapSchema<Building>();
  @type("string") castleNodeId: string = "";
  @type(CastleTerritory) territory = new CastleTerritory();
  @type("number") score: number = 0;
  @type("number") battlesWon: number = 0;
  @type("number") battlesLost: number = 0;
  @type("boolean") online: boolean = true;
  @type("number") lastActive: number = Date.now();
  @type("boolean") isRegistered: boolean = false; // Зарегистрирован или гость
  @type("string") currentMapId: string = "green_valley"; // Текущая карта
  @type(AllGamesStats) stats = new AllGamesStats();
}

// ============================================
// КАРТА
// ============================================

export class GameMap extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") theme: string = "forest";
  @type("number") maxPlayers: number = 50;
  @type("number") currentPlayerCount: number = 0;
  @type({ map: MapNode }) nodes = new MapSchema<MapNode>();
  @type({ map: Teleport }) teleports = new MapSchema<Teleport>();
}

// ============================================
// СОСТОЯНИЕ ИГРЫ
// ============================================

export class FortressState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: GameMap }) maps = new MapSchema<GameMap>(); // 10 карт
  @type(["string"]) chat: ArraySchema<string> = new ArraySchema<string>();
  @type("number") turn: number = 1;
  @type("number") lastUpdate: number = Date.now();
  @type("string") gamePhase: string = "waiting";
  @type("string") activeMapId: string = "green_valley";
}

// ============================================
// КОНСТАНТЫ РАС
// ============================================

export const RACE_EMOJIS: Record<RaceId, string> = {
  human: '👤', elf: '🧝', dwarf: '🪓', darkElf: '🦇', undead: '🦴',
  werewolf: '🐺', orc: '🧌', mage: '🧙', vampire: '🧛', dragonborn: '🐲'
};

export const RACE_COLORS: Record<RaceId, string> = {
  human: '#4a90d9', elf: '#4ade80', dwarf: '#f59e0b', darkElf: '#a855f7',
  undead: '#2dd4bf', werewolf: '#78716c', orc: '#84cc16', mage: '#3b82f6',
  vampire: '#dc2626', dragonborn: '#f97316'
};

export const RACE_BONUSES: Record<RaceId, { attack: number; defense: number; magic: number; economy: number }> = {
  human: { attack: 1, defense: 1, magic: 1, economy: 1.2 },
  elf: { attack: 0.8, defense: 0.8, magic: 1.5, economy: 1 },
  dwarf: { attack: 0.9, defense: 1.5, magic: 0.5, economy: 1.2 },
  darkElf: { attack: 1.4, defense: 0.7, magic: 1.2, economy: 0.8 },
  undead: { attack: 1.2, defense: 0.8, magic: 1.3, economy: 0.7 },
  werewolf: { attack: 1.5, defense: 0.6, magic: 0.8, economy: 1 },
  orc: { attack: 1.4, defense: 0.8, magic: 0.3, economy: 0.9 },
  mage: { attack: 0.6, defense: 0.6, magic: 2, economy: 0.8 },
  vampire: { attack: 1.3, defense: 1.1, magic: 1.2, economy: 0.9 },
  dragonborn: { attack: 1.4, defense: 1, magic: 1, economy: 1.3 }
};

export const NODE_CONFIG: Record<NodeType, { 
  emoji: string; 
  name: string; 
  baseDefense: number;
  production?: { resource: string; amount: number };
  monsterPower?: number;
  goldReward?: number;
}> = {
  castle: { emoji: '🏰', name: 'Замок', baseDefense: 100 },
  town: { emoji: '🏘️', name: 'Город', baseDefense: 50, production: { resource: 'gold', amount: 20 } },
  village: { emoji: '🏠', name: 'Деревня', baseDefense: 20, production: { resource: 'food', amount: 15 } },
  gold_mine: { emoji: '💰', name: 'Золотая шахта', baseDefense: 30, production: { resource: 'gold', amount: 30 } },
  stone_quarry: { emoji: '🪨', name: 'Каменоломня', baseDefense: 25, production: { resource: 'stone', amount: 25 } },
  lumber_mill: { emoji: '🪵', name: 'Лесопилка', baseDefense: 20, production: { resource: 'wood', amount: 20 } },
  iron_mine: { emoji: '⚙️', name: 'Железная шахта', baseDefense: 35, production: { resource: 'iron', amount: 15 } },
  farm: { emoji: '🌾', name: 'Ферма', baseDefense: 15, production: { resource: 'food', amount: 25 } },
  mana_well: { emoji: '🔮', name: 'Источник маны', baseDefense: 40, production: { resource: 'mana', amount: 10 } },
  monster_lair: { emoji: '🐉', name: 'Логово монстров', baseDefense: 0, monsterPower: 150, goldReward: 500 },
  teleport: { emoji: '🌀', name: 'Телепорт', baseDefense: 0 },
  obelisk: { emoji: '🗼', name: 'Обелиск', baseDefense: 0 },
};

