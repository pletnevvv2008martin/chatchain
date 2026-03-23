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
exports.GIFT_ITEMS = exports.ROUND_CONFIG = exports.LoveRoomState = exports.RoundResult = exports.LoveVote = exports.LoveMessage = exports.LovePlayer = exports.LoveGift = void 0;
const schema_1 = require("@colyseus/schema");
// ============================================
// ПОДАРОК
// ============================================
class LoveGift extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.emoji = "";
        this.name = "";
        this.fromId = "";
        this.fromName = "";
        this.timestamp = Date.now();
    }
}
exports.LoveGift = LoveGift;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveGift.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveGift.prototype, "emoji", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveGift.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveGift.prototype, "fromId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveGift.prototype, "fromName", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveGift.prototype, "timestamp", void 0);
// ============================================
// ИГРОК В КОМНАТЕ
// ============================================
class LovePlayer extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.sessionId = "";
        this.name = "";
        this.age = 25;
        this.city = "";
        this.gender = "male";
        this.avatar = "👤";
        this.bio = "";
        this.rating = 1000;
        this.level = 1;
        this.exp = 0;
        this.isOnline = true;
        this.isVerified = false;
        this.isRegistered = false;
        this.gifts = new schema_1.ArraySchema();
        this.joinedAt = Date.now();
        this.lastActive = Date.now();
        this.kissCount = 0; // Сколько раз поцеловали
        this.winkCount = 0; // Сколько раз подмигнули
        this.likeCount = 0; // Сколько раз лайкнули
    }
}
exports.LovePlayer = LovePlayer;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "age", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "city", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "gender", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "avatar", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LovePlayer.prototype, "bio", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "rating", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "level", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "exp", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LovePlayer.prototype, "isOnline", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LovePlayer.prototype, "isVerified", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LovePlayer.prototype, "isRegistered", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], LovePlayer.prototype, "gifts", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "joinedAt", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "lastActive", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "kissCount", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "winkCount", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LovePlayer.prototype, "likeCount", void 0);
// ============================================
// СООБЩЕНИЕ ЧАТА
// ============================================
class LoveMessage extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.playerId = "";
        this.playerName = "";
        this.playerAvatar = "";
        this.text = "";
        this.timestamp = Date.now();
        this.isSystem = false;
    }
}
exports.LoveMessage = LoveMessage;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveMessage.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveMessage.prototype, "playerId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveMessage.prototype, "playerName", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveMessage.prototype, "playerAvatar", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveMessage.prototype, "text", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveMessage.prototype, "timestamp", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LoveMessage.prototype, "isSystem", void 0);
// ============================================
// ГОЛОС В РАУНДЕ
// ============================================
class LoveVote extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.voterId = "";
        this.targetId = "";
        this.action = "skip"; // kiss, wink, skip, like
        this.timestamp = Date.now();
    }
}
exports.LoveVote = LoveVote;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveVote.prototype, "voterId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveVote.prototype, "targetId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveVote.prototype, "action", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveVote.prototype, "timestamp", void 0);
// ============================================
// РЕЗУЛЬТАТ РАУНДА
// ============================================
class RoundResult extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.type = "";
        this.icon = "";
        this.title = "";
        this.data = ""; // JSON строка с результатами
        this.timestamp = Date.now();
    }
}
exports.RoundResult = RoundResult;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], RoundResult.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], RoundResult.prototype, "icon", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], RoundResult.prototype, "title", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], RoundResult.prototype, "data", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], RoundResult.prototype, "timestamp", void 0);
// ============================================
// СОСТОЯНИЕ КОМНАТЫ
// ============================================
class LoveRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        // Комната
        this.roomId = "";
        this.roomName = "Знакомства";
        this.maxPlayers = 12;
        this.isSandbox = false;
        // Игроки
        this.players = new schema_1.MapSchema();
        this.playerCount = 0;
        // Раунд
        this.roundType = 'waiting';
        this.roundNumber = 0;
        this.roundTimer = 0;
        this.roundDuration = 30;
        this.roundActive = false;
        // Голоса
        this.votes = new schema_1.MapSchema();
        this.voteCount = 0;
        // Результаты
        this.lastResult = new RoundResult();
        this.showResults = false;
        // Чат
        this.messages = new schema_1.ArraySchema(); // JSON строки
        // Статистика комнаты
        this.createdAt = Date.now();
        this.totalRounds = 0;
        this.totalKisses = 0;
        this.totalWinks = 0;
        this.totalLikes = 0;
    }
}
exports.LoveRoomState = LoveRoomState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveRoomState.prototype, "roomId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveRoomState.prototype, "roomName", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "maxPlayers", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LoveRoomState.prototype, "isSandbox", void 0);
__decorate([
    (0, schema_1.type)({ map: LovePlayer }),
    __metadata("design:type", Object)
], LoveRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "playerCount", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], LoveRoomState.prototype, "roundType", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "roundNumber", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "roundTimer", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "roundDuration", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LoveRoomState.prototype, "roundActive", void 0);
__decorate([
    (0, schema_1.type)({ map: LoveVote }),
    __metadata("design:type", Object)
], LoveRoomState.prototype, "votes", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "voteCount", void 0);
__decorate([
    (0, schema_1.type)(RoundResult),
    __metadata("design:type", Object)
], LoveRoomState.prototype, "lastResult", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], LoveRoomState.prototype, "showResults", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], LoveRoomState.prototype, "messages", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "createdAt", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "totalRounds", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "totalKisses", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "totalWinks", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], LoveRoomState.prototype, "totalLikes", void 0);
// ============================================
// КОНСТАНТЫ РАУНДОВ
// ============================================
exports.ROUND_CONFIG = {
    waiting: { name: 'Ожидание', icon: '💕', duration: 0, description: 'Место для встреч' },
    kiss: { name: 'Раунд поцелуя', icon: '💋', duration: 30, description: 'Выбери: поцелуй, подмигнуть или пропустить' },
    choose_pair: { name: 'Выбираем пару', icon: '💑', duration: 45, description: 'Голосуй за лучшую пару' },
    who_likes: { name: 'Кто больше нравится?', icon: '❤️', duration: 30, description: 'Выбери понравившегося игрока' },
    truth_or_dare: { name: 'Правда или действие', icon: '🎯', duration: 60, description: 'Отвечай честно или выполняй задание' }
};
// ============================================
// ПОДАРКИ
// ============================================
exports.GIFT_ITEMS = [
    { id: 'rose', emoji: '🌹', name: 'Роза', price: 10 },
    { id: 'heart', emoji: '❤️', name: 'Сердце', price: 25 },
    { id: 'kiss', emoji: '💋', name: 'Поцелуй', price: 50 },
    { id: 'diamond', emoji: '💎', name: 'Бриллиант', price: 100 },
    { id: 'crown', emoji: '👑', name: 'Корона', price: 200 },
    { id: 'ring', emoji: '💍', name: 'Кольцо', price: 500 },
    { id: 'love', emoji: '💕', name: 'Любовь', price: 1000 },
];
//# sourceMappingURL=love-schema.js.map