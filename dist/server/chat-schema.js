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
exports.ChatRoomState = exports.ChatUser = exports.ChatMessage = void 0;
const schema_1 = require("@colyseus/schema");
// ============================================
// СООБЩЕНИЕ ЧАТА
// ============================================
class ChatMessage extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.userId = "";
        this.userName = "";
        this.userStatus = "guest";
        this.content = "";
        this.type = "text"; // text, gif, voice, system, action, roll
        this.timestamp = Date.now();
        this.deleted = false;
        this.editedAt = "";
        // Для ответов
        this.replyToId = "";
        this.replyToContent = "";
        this.replyToUser = "";
        // Для голосовых
        this.voiceId = "";
        this.voiceDuration = 0;
        // Реакции (JSON строка)
        this.reactions = "[]";
        // Упоминания
        this.mentions = new schema_1.ArraySchema();
    }
}
exports.ChatMessage = ChatMessage;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "userId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "userName", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "userStatus", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "content", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatMessage.prototype, "timestamp", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "deleted", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "editedAt", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "replyToId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "replyToContent", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "replyToUser", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "voiceId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatMessage.prototype, "voiceDuration", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "reactions", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], ChatMessage.prototype, "mentions", void 0);
// ============================================
// ПОЛЬЗОВАТЕЛЬ В ЧАТЕ
// ============================================
class ChatUser extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.sessionId = "";
        this.nickname = "";
        this.status = "guest"; // guest, registered, admin, moderator
        this.isOnline = true;
        this.isTyping = false;
        this.lastActive = Date.now();
        this.joinedAt = Date.now();
    }
}
exports.ChatUser = ChatUser;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatUser.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatUser.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatUser.prototype, "nickname", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatUser.prototype, "status", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], ChatUser.prototype, "isOnline", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], ChatUser.prototype, "isTyping", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatUser.prototype, "lastActive", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatUser.prototype, "joinedAt", void 0);
// ============================================
// КОМНАТА ЧАТА
// ============================================
class ChatRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.roomId = "";
        this.roomName = "Lobby";
        this.isLobby = true;
        this.password = "";
        this.ownerId = "";
        this.users = new schema_1.MapSchema();
        this.userCount = 0;
        this.messages = new schema_1.ArraySchema();
        this.messageCount = 0;
        this.createdAt = Date.now();
    }
}
exports.ChatRoomState = ChatRoomState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatRoomState.prototype, "roomId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatRoomState.prototype, "roomName", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], ChatRoomState.prototype, "isLobby", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatRoomState.prototype, "password", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatRoomState.prototype, "ownerId", void 0);
__decorate([
    (0, schema_1.type)({ map: ChatUser }),
    __metadata("design:type", Object)
], ChatRoomState.prototype, "users", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatRoomState.prototype, "userCount", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", schema_1.ArraySchema)
], ChatRoomState.prototype, "messages", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatRoomState.prototype, "messageCount", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatRoomState.prototype, "createdAt", void 0);
//# sourceMappingURL=chat-schema.js.map