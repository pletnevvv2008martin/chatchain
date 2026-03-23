"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_CONFIG = exports.RACE_BONUSES = exports.RACE_COLORS = exports.RACE_EMOJIS = exports.FortressState = exports.GameMap = exports.Player = exports.Building = exports.Teleport = exports.MapNode = exports.CastleTerritory = exports.Hero = exports.Army = exports.Resources = exports.AllGamesStats = exports.GameStats = void 0;
const schema_1 = require("@colyseus/schema");
// ============================================
// СТАТИСТИКА ИГРОКА (общая для всех игр)
// ============================================
class GameStats extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.totalGames = 0;
        this.wins = 0;
        this.losses = 0;
        this.score = 0;
        this.playTime = 0; // минуты
        this.lastPlayed = "";
        this.highestScore = 0;
    }
}
exports.GameStats = GameStats;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "totalGames", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "wins", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "losses", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "playTime", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameStats.prototype, "lastPlayed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameStats.prototype, "highestScore", void 0);
class AllGamesStats extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.fortress = new GameStats();
        this.mafia = new GameStats();
        this.duel = new GameStats();
        this.chain = new GameStats();
        this.poker = new GameStats();
    }
}
exports.AllGamesStats = AllGamesStats;
__decorate([
    (0, schema_1.type)(GameStats),
    __metadata("design:type", GameStats)
], AllGamesStats.prototype, "fortress", void 0);
__decorate([
    (0, schema_1.type)(GameStats),
    __metadata("design:type", GameStats)
], AllGamesStats.prototype, "mafia", void 0);
__decorate([
    (0, schema_1.type)(GameStats),
    __metadata("design:type", GameStats)
], AllGamesStats.prototype, "duel", void 0);
__decorate([
    (0, schema_1.type)(GameStats),
    __metadata("design:type", GameStats)
], AllGamesStats.prototype, "chain", void 0);
__decorate([
    (0, schema_1.type)(GameStats),
    __metadata("design:type", GameStats)
], AllGamesStats.prototype, "poker", void 0);
// ============================================
// РЕСУРСЫ
// ============================================
class Resources extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.gold = 500;
        this.stone = 200;
        this.wood = 200;
        this.iron = 50;
        this.food = 100;
        this.mana = 50;
        this.gems = 0; // Новая валюта
        this.teleportScrolls = 0; // Свитки телепорта
    }
}
exports.Resources = Resources;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "gold", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "stone", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "wood", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "iron", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "food", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "mana", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "gems", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Resources.prototype, "teleportScrolls", void 0);
// ============================================
// АРМИЯ
// ============================================
class Army extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.warriors = 10;
        this.archers = 5;
        this.cavalry = 0;
        this.mages = 0;
        this.totalPower = 150;
    }
}
exports.Army = Army;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Army.prototype, "warriors", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Army.prototype, "archers", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Army.prototype, "cavalry", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Army.prototype, "mages", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Army.prototype, "totalPower", void 0);
// ============================================
// ГЕРОЙ
// ============================================
class Hero extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.currentNodeId = "";
        this.x = 0; // Позиция на карте
        this.y = 0;
        this.level = 1;
        this.experience = 0;
        this.army = new Army();
        this.movementPoints = 5;
        this.maxMovement = 5;
        this.attack = 10;
        this.defense = 10;
    }
}
exports.Hero = Hero;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Hero.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Hero.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Hero.prototype, "currentNodeId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "level", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "experience", void 0);
__decorate([
    (0, schema_1.type)(Army),
    __metadata("design:type", Object)
], Hero.prototype, "army", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "movementPoints", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "maxMovement", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "attack", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Hero.prototype, "defense", void 0);
// ============================================
// ТЕРРИТОРИЯ ЗАМКА
// ============================================
class CastleTerritory extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 50; // Радиус территории
        this.ownedNodes = new schema_1.ArraySchema();
        this.defenseBonus = 20;
    }
}
exports.CastleTerritory = CastleTerritory;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CastleTerritory.prototype, "centerX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CastleTerritory.prototype, "centerY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CastleTerritory.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], CastleTerritory.prototype, "ownedNodes", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CastleTerritory.prototype, "defenseBonus", void 0);
// ============================================
// УЗЕЛ КАРТЫ
// ============================================
class MapNode extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.type = 'village';
        this.name = "";
        this.x = 0;
        this.y = 0;
        this.ownerId = "";
        this.ownerName = "";
        this.heroId = "";
        this.garrison = 0;
        this.defense = 0;
        this.connections = new schema_1.ArraySchema();
        this.goldReward = 0;
        this.monsterPower = 0;
        this.monsterType = ""; // Тип монстра
        this.terrain = "🌿"; // Эмодзи ландшафта
        this.isTerritory = false; // Часть территории замка
    }
}
exports.MapNode = MapNode;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "ownerId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "ownerName", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "heroId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "garrison", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "defense", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], MapNode.prototype, "connections", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "goldReward", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MapNode.prototype, "monsterPower", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "monsterType", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MapNode.prototype, "terrain", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], MapNode.prototype, "isTerritory", void 0);
// ============================================
// ТЕЛЕПОРТ
// ============================================
class Teleport extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.x = 0;
        this.y = 0;
        this.targetMapId = ""; // Для обелисков
        this.targetTeleportId = ""; // Для телепортов на той же карте
        this.cost = 100; // Стоимость использования
        this.type = "teleport";
    }
}
exports.Teleport = Teleport;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Teleport.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Teleport.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Teleport.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Teleport.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Teleport.prototype, "targetMapId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Teleport.prototype, "targetTeleportId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Teleport.prototype, "cost", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Teleport.prototype, "type", void 0);
// ============================================
// ЗДАНИЕ
// ============================================
class Building extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.level = 0;
    }
}
exports.Building = Building;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Building.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Building.prototype, "level", void 0);
// ============================================
// ИГРОК
// ============================================
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.race = 'human';
        this.color = "#4a90d9";
        this.resources = new Resources();
        this.heroes = new schema_1.MapSchema();
        this.buildings = new schema_1.MapSchema();
        this.castleNodeId = "";
        this.territory = new CastleTerritory();
        this.score = 0;
        this.battlesWon = 0;
        this.battlesLost = 0;
        this.online = true;
        this.lastActive = Date.now();
        this.isRegistered = false; // Зарегистрирован или гость
        this.currentMapId = "green_valley"; // Текущая карта
        this.stats = new AllGamesStats();
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "race", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)(Resources),
    __metadata("design:type", Object)
], Player.prototype, "resources", void 0);
__decorate([
    (0, schema_1.type)({ map: Hero }),
    __metadata("design:type", Object)
], Player.prototype, "heroes", void 0);
__decorate([
    (0, schema_1.type)({ map: Building }),
    __metadata("design:type", Object)
], Player.prototype, "buildings", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "castleNodeId", void 0);
__decorate([
    (0, schema_1.type)(CastleTerritory),
    __metadata("design:type", Object)
], Player.prototype, "territory", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "battlesWon", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "battlesLost", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "online", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "lastActive", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isRegistered", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "currentMapId", void 0);
__decorate([
    (0, schema_1.type)(AllGamesStats),
    __metadata("design:type", Object)
], Player.prototype, "stats", void 0);
// ============================================
// КАРТА
// ============================================
class GameMap extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.theme = "forest";
        this.maxPlayers = 50;
        this.currentPlayerCount = 0;
        this.nodes = new schema_1.MapSchema();
        this.teleports = new schema_1.MapSchema();
    }
}
exports.GameMap = GameMap;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameMap.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameMap.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameMap.prototype, "theme", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameMap.prototype, "maxPlayers", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameMap.prototype, "currentPlayerCount", void 0);
__decorate([
    (0, schema_1.type)({ map: MapNode }),
    __metadata("design:type", Object)
], GameMap.prototype, "nodes", void 0);
__decorate([
    (0, schema_1.type)({ map: Teleport }),
    __metadata("design:type", Object)
], GameMap.prototype, "teleports", void 0);
// ============================================
// СОСТОЯНИЕ ИГРЫ
// ============================================
class FortressState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.maps = new schema_1.MapSchema(); // 10 карт
        this.chat = new schema_1.ArraySchema();
        this.turn = 1;
        this.lastUpdate = Date.now();
        this.gamePhase = "waiting";
        this.activeMapId = "green_valley";
    }
}
exports.FortressState = FortressState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], FortressState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: GameMap }),
    __metadata("design:type", Object)
], FortressState.prototype, "maps", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], FortressState.prototype, "chat", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], FortressState.prototype, "turn", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], FortressState.prototype, "lastUpdate", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], FortressState.prototype, "gamePhase", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], FortressState.prototype, "activeMapId", void 0);
// ============================================
// КОНСТАНТЫ РАС
// ============================================
exports.RACE_EMOJIS = {
    human: '👤', elf: '🧝', dwarf: '🪓', darkElf: '🦇', undead: '🦴',
    werewolf: '🐺', orc: '🧌', mage: '🧙', vampire: '🧛', dragonborn: '🐲'
};
exports.RACE_COLORS = {
    human: '#4a90d9', elf: '#4ade80', dwarf: '#f59e0b', darkElf: '#a855f7',
    undead: '#2dd4bf', werewolf: '#78716c', orc: '#84cc16', mage: '#3b82f6',
    vampire: '#dc2626', dragonborn: '#f97316'
};
exports.RACE_BONUSES = {
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
exports.NODE_CONFIG = {
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
//# sourceMappingURL=fortress-schema.js.map