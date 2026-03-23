"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const love_room_1 = require("./love-room");
const chat_room_1 = require("./chat-room");
const port = Number(process.env.PORT || 2567);
// HTTP сервер с CORS
const httpServer = (0, http_1.createServer)((req, res) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
    }
    res.writeHead(404);
    res.end('Not Found');
});
// Colyseus сервер
const gameServer = new colyseus_1.Server({
    server: httpServer,
    pingInterval: 15000,
    pingMaxRetries: 3,
});
// ============================================
// РЕГИСТРАЦИЯ КОМНАТ
// ============================================
// 💬 Чат - основной лобби чат
gameServer.define("chat", chat_room_1.ChatRoom, {
    roomName: "ChatChain Lobby",
    isLobby: true
}).enableRealtimeListing();
// 💬 Чат - дополнительные комнаты
gameServer.define("chat_general", chat_room_1.ChatRoom, {
    roomName: "Общий чат"
});
gameServer.define("chat_games", chat_room_1.ChatRoom, {
    roomName: "Игровой чат"
});
// 💕 Любовь - комнаты для знакомств
gameServer.define("love", love_room_1.LoveRoom).enableRealtimeListing();
gameServer.define("love_sandbox", love_room_1.LoveRoom, {
    roomName: "Песочница",
    isSandbox: true,
    maxPlayers: 8
});
gameServer.define("love_flirt", love_room_1.LoveRoom, {
    roomName: "Флирт и общение",
    maxPlayers: 12
});
// Запускаем
gameServer.listen(port).then(() => {
    console.log(`
╔════════════════════════════════════════════╗
║     🎮 ChatChain Server Started!            ║
║                                            ║
║  Colyseus Server running on port ${port}      ║
║  WebSocket: ws://localhost:${port}            ║
║                                            ║
║  💬 Chat - real-time messaging             ║
║  💕 Love - dating game                     ║
╚════════════════════════════════════════════╝
  `);
});
// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    gameServer.gracefullyShutdown().then(() => process.exit(0));
});
process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM...");
    gameServer.gracefullyShutdown().then(() => process.exit(0));
});
//# sourceMappingURL=index.js.map