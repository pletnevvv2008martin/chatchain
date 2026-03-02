import fs from 'fs';
import path from 'path';

// Типы рас
export type RaceId = 'human' | 'elf' | 'dwarf' | 'darkElf' | 'undead' | 'werewolf' | 'orc' | 'mage' | 'vampire' | 'dragonborn';

export interface Race {
  id: RaceId;
  name: string;
  emoji: string;
  attack: number;
  defense: number;
  magic: number;
  economy: number;
  special: string;
  description: string;
}

// Расы с бонусами
export const RACES: Record<RaceId, Race> = {
  human: {
    id: 'human',
    name: 'Люди',
    emoji: '👤',
    attack: 1,
    defense: 1,
    magic: 1,
    economy: 1.2,
    special: 'Баланс во всём',
    description: 'Универсальная раса с бонусом к экономике. Идеально для новичков.'
  },
  elf: {
    id: 'elf',
    name: 'Эльфы',
    emoji: '🧝',
    attack: 0.8,
    defense: 0.8,
    magic: 1.5,
    economy: 1,
    special: '+50% магия',
    description: 'Мастерство магии и долголетие. Слабая защита, но мощные заклинания.'
  },
  dwarf: {
    id: 'dwarf',
    name: 'Гномы',
    emoji: '🪓',
    attack: 0.9,
    defense: 1.5,
    magic: 0.5,
    economy: 1.2,
    special: '+50% защита',
    description: 'Непробиваемая защита и мастерство строительства. Слабая магия.'
  },
  darkElf: {
    id: 'darkElf',
    name: 'Тёмные эльфы',
    emoji: '🦇',
    attack: 1.4,
    defense: 0.7,
    magic: 1.2,
    economy: 0.8,
    special: '+40% атака ночью',
    description: 'Смертоносные воины тьмы. Мощная атака, но слабая экономика.'
  },
  undead: {
    id: 'undead',
    name: 'Нежить',
    emoji: '🦴',
    attack: 1.2,
    defense: 0.8,
    magic: 1.3,
    economy: 0.7,
    special: 'Воскрешение павших',
    description: 'Армия бессмертных. Погибшие воины возвращаются в строй.'
  },
  werewolf: {
    id: 'werewolf',
    name: 'Оборотни',
    emoji: '🐺',
    attack: 1.5,
    defense: 0.6,
    magic: 0.8,
    economy: 1,
    special: '+100% в полнолуние',
    description: 'Свирепые воины, усиливающиеся в полнолуние. Уязвимы к серебру.'
  },
  orc: {
    id: 'orc',
    name: 'Орки',
    emoji: '🧌',
    attack: 1.4,
    defense: 0.8,
    magic: 0.3,
    economy: 0.9,
    special: '+30% размер армии',
    description: 'Многочисленные и свирепые. Слабая магия, но огромная армия.'
  },
  mage: {
    id: 'mage',
    name: 'Маги',
    emoji: '🧙',
    attack: 0.6,
    defense: 0.6,
    magic: 2,
    economy: 0.8,
    special: 'x2 магия',
    description: 'Повелители арканы. Хрупкие, но невероятно мощные заклинания.'
  },
  vampire: {
    id: 'vampire',
    name: 'Вампиры',
    emoji: '🧛',
    attack: 1.3,
    defense: 1.1,
    magic: 1.2,
    economy: 0.9,
    special: 'Вампиризм',
    description: 'Бессмертные аристократы ночи. Лечатся, нанося урон врагам.'
  },
  dragonborn: {
    id: 'dragonborn',
    name: 'Дракониды',
    emoji: '🐲',
    attack: 1.4,
    defense: 1,
    magic: 1,
    economy: 1.3,
    special: 'Летающие юниты',
    description: 'Потомки драконов. Могут атаковать с воздуха, игнорируя стены.'
  }
};

// Типы ресурсов
export type ResourceId = 'gold' | 'stone' | 'wood' | 'iron' | 'food' | 'mana';

export interface Resource {
  id: ResourceId;
  name: string;
  emoji: string;
  color: string;
}

export const RESOURCES: Record<ResourceId, Resource> = {
  gold: { id: 'gold', name: 'Золото', emoji: '💰', color: '#FFD700' },
  stone: { id: 'stone', name: 'Камень', emoji: '🪨', color: '#808080' },
  wood: { id: 'wood', name: 'Дерево', emoji: '🪵', color: '#8B4513' },
  iron: { id: 'iron', name: 'Железо', emoji: '⚙️', color: '#4682B4' },
  food: { id: 'food', name: 'Еда', emoji: '🍖', color: '#32CD32' },
  mana: { id: 'mana', name: 'Мана', emoji: '🔮', color: '#9370DB' }
};

// Типы зданий
export type BuildingId = 
  | 'castle' | 'barracks' | 'farm' | 'mine' | 'lumbermill' 
  | 'warehouse' | 'wall' | 'tower' | 'temple' | 'chapel'
  | 'mageTower' | 'arena' | 'market' | 'tavern' | 'forge'
  | 'treasury' | 'library' | 'stable' | 'workshop' | 'observatory';

export interface Building {
  id: BuildingId;
  name: string;
  emoji: string;
  maxLevel: number;
  baseCost: Partial<Record<ResourceId, number>>;
  effect: string;
  description: string;
  unlocked: boolean;
  requires?: Partial<Record<BuildingId, number>>;
  category: 'military' | 'economy' | 'magic' | 'special';
}

export const BUILDINGS: Record<BuildingId, Building> = {
  castle: {
    id: 'castle',
    name: 'Замок',
    emoji: '🏠',
    maxLevel: 100,
    baseCost: { gold: 500, stone: 300 },
    effect: '+10% ко всему',
    description: 'Сердце вашей крепости. Уровень замка определяет максимальный уровень других зданий.',
    unlocked: true,
    category: 'special'
  },
  barracks: {
    id: 'barracks',
    name: 'Казарма',
    emoji: '⚔️',
    maxLevel: 50,
    baseCost: { gold: 200, stone: 100 },
    effect: '+10 воинов',
    description: 'Тренировка воинов. Каждый уровень увеличивает лимит армии.',
    unlocked: true,
    category: 'military'
  },
  farm: {
    id: 'farm',
    name: 'Ферма',
    emoji: '🌾',
    maxLevel: 30,
    baseCost: { gold: 100, wood: 150 },
    effect: '+50 еды/час',
    description: 'Производство еды для содержания армии.',
    unlocked: true,
    category: 'economy'
  },
  mine: {
    id: 'mine',
    name: 'Шахта',
    emoji: '⛏️',
    maxLevel: 30,
    baseCost: { gold: 150, wood: 100 },
    effect: '+30 камня/час',
    description: 'Добыча камня для строительства.',
    unlocked: true,
    category: 'economy'
  },
  lumbermill: {
    id: 'lumbermill',
    name: 'Лесопилка',
    emoji: '🪵',
    maxLevel: 30,
    baseCost: { gold: 100, stone: 50 },
    effect: '+40 дерева/час',
    description: 'Заготовка древесины.',
    unlocked: true,
    category: 'economy'
  },
  warehouse: {
    id: 'warehouse',
    name: 'Склад',
    emoji: '🏦',
    maxLevel: 20,
    baseCost: { gold: 300, stone: 200 },
    effect: '+1000 лимит',
    description: 'Хранилище ресурсов. Увеличивает максимальный запас.',
    unlocked: true,
    category: 'economy'
  },
  wall: {
    id: 'wall',
    name: 'Стена',
    emoji: '🧱',
    maxLevel: 50,
    baseCost: { gold: 200, stone: 400 },
    effect: '+500 HP',
    description: 'Оборонительная стена. Увеличивает HP крепости.',
    unlocked: true,
    category: 'military'
  },
  tower: {
    id: 'tower',
    name: 'Башня',
    emoji: '🗼',
    maxLevel: 30,
    baseCost: { gold: 250, stone: 300 },
    effect: '+200 урон',
    description: 'Оборонительная башня. Атакует врагов при осаде.',
    requires: { wall: 5 },
    category: 'military'
  },
  temple: {
    id: 'temple',
    name: 'Храм',
    emoji: '⛪',
    maxLevel: 20,
    baseCost: { gold: 400, stone: 250 },
    effect: '+2% удача',
    description: 'Место поклонения. Увеличивает удачу и ману.',
    requires: { castle: 10 },
    category: 'magic'
  },
  chapel: {
    id: 'chapel',
    name: 'Часовня',
    emoji: '💒',
    maxLevel: 10,
    baseCost: { gold: 500, stone: 300 },
    effect: 'Свадьбы',
    description: 'Проводите свадьбы и получайте бонусы от союзов.',
    requires: { temple: 5 },
    category: 'special'
  },
  mageTower: {
    id: 'mageTower',
    name: 'Башня мага',
    emoji: '🔮',
    maxLevel: 25,
    baseCost: { gold: 600, stone: 200 },
    effect: '+1 заклинание',
    description: 'Исследование заклинаний. Открывает новые способности.',
    requires: { castle: 15 },
    category: 'magic'
  },
  arena: {
    id: 'arena',
    name: 'Арена',
    emoji: '🎭',
    maxLevel: 15,
    baseCost: { gold: 800, stone: 400 },
    effect: '+10% награды',
    description: 'Место битв. Увеличивает награды за победы.',
    requires: { barracks: 20 },
    category: 'military'
  },
  market: {
    id: 'market',
    name: 'Рынок',
    emoji: '🏪',
    maxLevel: 20,
    baseCost: { gold: 400, wood: 200 },
    effect: '-5% комиссия',
    description: 'Торговая площадь. Улучшает условия обмена ресурсов.',
    requires: { warehouse: 10 },
    category: 'economy'
  },
  tavern: {
    id: 'tavern',
    name: 'Таверна',
    emoji: '🍺',
    maxLevel: 15,
    baseCost: { gold: 300, wood: 250 },
    effect: '+1 слот героя',
    description: 'Найм героев. Здесь можно найти уникальных персонажей.',
    requires: { castle: 5 },
    category: 'special'
  },
  forge: {
    id: 'forge',
    name: 'Кузница',
    emoji: '🔨',
    maxLevel: 25,
    baseCost: { gold: 350, stone: 200, iron: 100 },
    effect: '+5% атака',
    description: 'Ковка оружия. Улучшает экипировку армии.',
    requires: { barracks: 10 },
    category: 'military'
  },
  treasury: {
    id: 'treasury',
    name: 'Сокровищница',
    emoji: '💎',
    maxLevel: 15,
    baseCost: { gold: 1000, stone: 500 },
    effect: '+5% золота',
    description: 'Защищённое хранилище золота. Увеличивает доход.',
    requires: { castle: 25, warehouse: 15 },
    category: 'economy'
  },
  library: {
    id: 'library',
    name: 'Библиотека',
    emoji: '📚',
    maxLevel: 20,
    baseCost: { gold: 500, wood: 300 },
    effect: '+5% опыт',
    description: 'Хранилище знаний. Ускоряет изучение новых технологий.',
    requires: { mageTower: 5 },
    category: 'magic'
  },
  stable: {
    id: 'stable',
    name: 'Конюшня',
    emoji: '🐎',
    maxLevel: 20,
    baseCost: { gold: 400, wood: 200, food: 100 },
    effect: 'Кавалерия',
    description: 'Разведение лошадей. Открывает кавалерийские юниты.',
    requires: { barracks: 15 },
    category: 'military'
  },
  workshop: {
    id: 'workshop',
    name: 'Мастерская',
    emoji: '🔧',
    maxLevel: 20,
    baseCost: { gold: 300, wood: 400 },
    effect: '-5% стоимость',
    description: 'Инженерный корпус. Снижает стоимость строительства.',
    requires: { forge: 10 },
    category: 'economy'
  },
  observatory: {
    id: 'observatory',
    name: 'Обсерватория',
    emoji: '🔭',
    maxLevel: 10,
    baseCost: { gold: 800, stone: 400 },
    effect: 'Разведка',
    description: 'Наблюдение за звёздами. Открывает возможности разведки.',
    requires: { mageTower: 15, library: 10 },
    category: 'magic'
  }
};

// Типы юнитов
export interface Unit {
  id: string;
  name: string;
  emoji: string;
  attack: number;
  defense: number;
  cost: Partial<Record<ResourceId, number>>;
  upkeep: number; // потребление еды
  requires?: Partial<Record<BuildingId, number>>;
}

// Данные крепости пользователя
export interface FortressData {
  userId: string;
  userName: string;
  race: RaceId | null;
  createdAt: string;
  lastUpdate: string;
  
  // Уровни зданий
  buildings: Partial<Record<BuildingId, number>>;
  
  // Ресурсы
  resources: Partial<Record<ResourceId, number>>;
  
  // Лимиты ресурсов
  resourceLimits: Partial<Record<ResourceId, number>>;
  
  // Армия
  army: {
    warriors: number;
    archers: number;
    cavalry: number;
    mages: number;
    totalPower: number;
  };
  
  // Герои
  heroes: Array<{
    id: string;
    name: string;
    level: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  
  // Статистика
  stats: {
    battlesWon: number;
    battlesLost: number;
    resourcesCollected: number;
    buildingsBuilt: number;
  };
  
  // Последний сбор ресурсов
  lastResourceCollection: string;
}

// Начальные данные для новой крепости
export const createInitialFortress = (userId: string, userName: string, race: RaceId): FortressData => {
  const now = new Date().toISOString();
  
  return {
    userId,
    userName,
    race,
    createdAt: now,
    lastUpdate: now,
    
    buildings: {
      castle: 1,
      barracks: 1,
      farm: 1,
      mine: 1,
      lumbermill: 1,
      warehouse: 1
    },
    
    resources: {
      gold: 500,
      stone: 200,
      wood: 200,
      iron: 50,
      food: 100,
      mana: 50
    },
    
    resourceLimits: {
      gold: 5000,
      stone: 3000,
      wood: 3000,
      iron: 1000,
      food: 2000,
      mana: 500
    },
    
    army: {
      warriors: 10,
      archers: 0,
      cavalry: 0,
      mages: 0,
      totalPower: 100
    },
    
    heroes: [],
    
    stats: {
      battlesWon: 0,
      battlesLost: 0,
      resourcesCollected: 0,
      buildingsBuilt: 6
    },
    
    lastResourceCollection: now
  };
};

// Функции для работы с файлами данных (серверная часть)
const FORTRESS_DATA_DIR = path.join(process.cwd(), 'data', 'fortress');

export const getFortressFilePath = (userId: string): string => {
  return path.join(FORTRESS_DATA_DIR, `${userId}.json`);
};

export const loadFortressData = (userId: string): FortressData | null => {
  try {
    const filePath = getFortressFilePath(userId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading fortress data:', error);
    return null;
  }
};

export const saveFortressData = (data: FortressData): boolean => {
  try {
    // Убедимся, что директория существует
    if (!fs.existsSync(FORTRESS_DATA_DIR)) {
      fs.mkdirSync(FORTRESS_DATA_DIR, { recursive: true });
    }
    
    data.lastUpdate = new Date().toISOString();
    const filePath = getFortressFilePath(data.userId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving fortress data:', error);
    return false;
  }
};

// Расчёт стоимости улучшения здания
export const calculateUpgradeCost = (
  buildingId: BuildingId, 
  currentLevel: number
): Partial<Record<ResourceId, number>> => {
  const building = BUILDINGS[buildingId];
  if (!building) return {};
  
  const cost: Partial<Record<ResourceId, number>> = {};
  const multiplier = Math.pow(1.5, currentLevel);
  
  for (const [resource, baseAmount] of Object.entries(building.baseCost)) {
    cost[resource as ResourceId] = Math.floor(baseAmount * multiplier);
  }
  
  return cost;
};

// Проверка возможности улучшения здания
export const canUpgradeBuilding = (
  fortress: FortressData,
  buildingId: BuildingId
): { canUpgrade: boolean; reason: string } => {
  const building = BUILDINGS[buildingId];
  if (!building) {
    return { canUpgrade: false, reason: 'Здание не найдено' };
  }
  
  const currentLevel = fortress.buildings[buildingId] || 0;
  
  // Проверка максимального уровня
  if (currentLevel >= building.maxLevel) {
    return { canUpgrade: false, reason: 'Достигнут максимальный уровень' };
  }
  
  // Проверка требований к другим зданиям
  if (building.requires) {
    for (const [reqBuilding, reqLevel] of Object.entries(building.requires)) {
      const currentReqLevel = fortress.buildings[reqBuilding as BuildingId] || 0;
      if (currentReqLevel < reqLevel) {
        return { 
          canUpgrade: false, 
          reason: `Требуется ${BUILDINGS[reqBuilding as BuildingId].name} уровня ${reqLevel}` 
        };
      }
    }
  }
  
  // Проверка зависимости от уровня замка
  if (buildingId !== 'castle') {
    const castleLevel = fortress.buildings.castle || 0;
    if (currentLevel >= castleLevel) {
      return { canUpgrade: false, reason: `Требуется улучшить Замок до уровня ${currentLevel + 1}` };
    }
  }
  
  // Проверка ресурсов
  const cost = calculateUpgradeCost(buildingId, currentLevel);
  for (const [resource, amount] of Object.entries(cost)) {
    const available = fortress.resources[resource as ResourceId] || 0;
    if (available < amount) {
      return { 
        canUpgrade: false, 
        reason: `Недостаточно ${RESOURCES[resource as ResourceId].name}: нужно ${amount}, есть ${available}` 
      };
    }
  }
  
  return { canUpgrade: true, reason: '' };
};

// Расчёт производства ресурсов в час
export const calculateResourceProduction = (
  fortress: FortressData
): Partial<Record<ResourceId, number>> => {
  const race = fortress.race ? RACES[fortress.race] : null;
  const economyBonus = race ? race.economy : 1;
  
  const production: Partial<Record<ResourceId, number>> = {
    gold: Math.floor(50 * economyBonus), // Базовый доход
    stone: 0,
    wood: 0,
    iron: 0,
    food: 0,
    mana: Math.floor(10 * (race?.magic || 1)) // Базовая регенерация маны
  };
  
  // Бонусы от зданий
  const farmLevel = fortress.buildings.farm || 0;
  const mineLevel = fortress.buildings.mine || 0;
  const lumbermillLevel = fortress.buildings.lumbermill || 0;
  const castleLevel = fortress.buildings.castle || 0;
  const templeLevel = fortress.buildings.temple || 0;
  const treasuryLevel = fortress.buildings.treasury || 0;
  
  // Ферма производит еду
  production.food = Math.floor((50 * farmLevel + 20) * economyBonus);
  
  // Шахта производит камень
  production.stone = Math.floor((30 * mineLevel + 10) * economyBonus);
  
  // Лесопилка производит дерево
  production.wood = Math.floor((40 * lumbermillLevel + 15) * economyBonus);
  
  // Замок добавляет золото
  production.gold = Math.floor((50 + 10 * castleLevel + 5 * treasuryLevel) * economyBonus);
  
  // Храм добавляет ману
  production.mana = Math.floor((10 + 5 * templeLevel) * (race?.magic || 1));
  
  return production;
};

// Расчёт лимитов ресурсов
export const calculateResourceLimits = (
  fortress: FortressData
): Partial<Record<ResourceId, number>> => {
  const warehouseLevel = fortress.buildings.warehouse || 0;
  const castleLevel = fortress.buildings.castle || 0;
  const treasuryLevel = fortress.buildings.treasury || 0;
  
  const baseLimit = 1000;
  const warehouseBonus = 1000 * warehouseLevel;
  const castleBonus = 500 * castleLevel;
  const treasuryBonus = 2000 * treasuryLevel;
  
  return {
    gold: baseLimit + warehouseBonus + castleBonus + treasuryBonus,
    stone: baseLimit + warehouseBonus + castleBonus,
    wood: baseLimit + warehouseBonus + castleBonus,
    iron: baseLimit + warehouseBonus / 2,
    food: baseLimit + warehouseBonus,
    mana: 100 + 50 * castleLevel + 25 * (fortress.buildings.mageTower || 0)
  };
};

// Сбор накопленных ресурсов
export const collectResources = (fortress: FortressData): FortressData => {
  const now = new Date();
  const lastCollection = new Date(fortress.lastResourceCollection);
  const hoursPassed = (now.getTime() - lastCollection.getTime()) / (1000 * 60 * 60);
  
  if (hoursPassed < 0.1) { // Минимум 6 минут
    return fortress;
  }
  
  const production = calculateResourceProduction(fortress);
  const limits = calculateResourceLimits(fortress);
  const maxHours = 24; // Максимум 24 часа накопления
  
  const hoursToCollect = Math.min(hoursPassed, maxHours);
  
  const updatedResources = { ...fortress.resources };
  
  for (const [resource, rate] of Object.entries(production)) {
    if (rate && rate > 0) {
      const produced = Math.floor(rate * hoursToCollect);
      const current = updatedResources[resource as ResourceId] || 0;
      const limit = limits[resource as ResourceId] || 10000;
      updatedResources[resource as ResourceId] = Math.min(current + produced, limit);
    }
  }
  
  return {
    ...fortress,
    resources: updatedResources,
    resourceLimits: limits,
    lastResourceCollection: now.toISOString()
  };
};

// Улучшение здания
export const upgradeBuilding = (
  fortress: FortressData,
  buildingId: BuildingId
): { success: boolean; fortress: FortressData; message: string } => {
  const checkResult = canUpgradeBuilding(fortress, buildingId);
  
  if (!checkResult.canUpgrade) {
    return { success: false, fortress, message: checkResult.reason };
  }
  
  const currentLevel = fortress.buildings[buildingId] || 0;
  const cost = calculateUpgradeCost(buildingId, currentLevel);
  
  // Вычитаем ресурсы
  const updatedResources = { ...fortress.resources };
  for (const [resource, amount] of Object.entries(cost)) {
    updatedResources[resource as ResourceId] = (updatedResources[resource as ResourceId] || 0) - amount;
  }
  
  // Увеличиваем уровень здания
  const updatedBuildings = { ...fortress.buildings };
  updatedBuildings[buildingId] = currentLevel + 1;
  
  const updatedFortress: FortressData = {
    ...fortress,
    buildings: updatedBuildings,
    resources: updatedResources,
    stats: {
      ...fortress.stats,
      buildingsBuilt: fortress.stats.buildingsBuilt + 1
    }
  };
  
  return {
    success: true,
    fortress: updatedFortress,
    message: `${BUILDINGS[buildingId].name} улучшено до уровня ${currentLevel + 1}!`
  };
};

// Расчёт общей силы армии
export const calculateArmyPower = (fortress: FortressData): number => {
  const race = fortress.race ? RACES[fortress.race] : null;
  const barracksLevel = fortress.buildings.barracks || 0;
  const forgeLevel = fortress.buildings.forge || 0;
  const arenaLevel = fortress.buildings.arena || 0;
  
  const basePower = 
    fortress.army.warriors * 10 + 
    fortress.army.archers * 15 + 
    fortress.army.cavalry * 25 + 
    fortress.army.mages * 20;
  
  const raceBonus = race ? (race.attack + race.defense) / 2 : 1;
  const forgeBonus = 1 + (forgeLevel * 0.05);
  const arenaBonus = 1 + (arenaLevel * 0.1);
  const barracksBonus = 1 + (barracksLevel * 0.02);
  
  return Math.floor(basePower * raceBonus * forgeBonus * arenaBonus * barracksBonus);
};

// Получение уровня крепости
export const getFortressLevel = (fortress: FortressData): number => {
  const totalLevels = Object.values(fortress.buildings).reduce((sum, level) => sum + (level || 0), 0);
  return Math.floor(totalLevels / 10) + 1;
};

// Получение рейтинга крепости
export const getFortressRating = (fortress: FortressData): number => {
  const level = getFortressLevel(fortress);
  const power = calculateArmyPower(fortress);
  const resources = Object.values(fortress.resources).reduce((sum, r) => sum + (r || 0), 0);
  const battleWinRate = fortress.stats.battlesWon / Math.max(1, fortress.stats.battlesWon + fortress.stats.battlesLost);
  
  return Math.floor(
    level * 100 + 
    power * 0.1 + 
    resources * 0.01 + 
    battleWinRate * 1000
  );
};

// Получение всех крепостей для рейтинга
export const getAllFortresses = (): FortressData[] => {
  try {
    if (!fs.existsSync(FORTRESS_DATA_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(FORTRESS_DATA_DIR).filter(f => f.endsWith('.json'));
    const fortresses: FortressData[] = [];
    
    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(FORTRESS_DATA_DIR, file), 'utf-8');
        const fortress = JSON.parse(data) as FortressData;
        // Собираем ресурсы перед показом
        fortresses.push(collectResources(fortress));
      } catch (e) {
        console.error(`Error reading fortress file ${file}:`, e);
      }
    }
    
    return fortresses.sort((a, b) => getFortressRating(b) - getFortressRating(a));
  } catch (error) {
    console.error('Error getting all fortresses:', error);
    return [];
  }
};
