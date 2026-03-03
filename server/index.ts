import { Server } from "colyseus";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { FortressRoom } from "./fortress-room";

const port = Number(process.env.PORT || 2567);

// HTTP сервер с CORS
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
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
const gameServer = new Server({
  server: httpServer,
  pingInterval: 15000,
  pingMaxRetries: 3,
});

// Регистрируем комнату Fortress
gameServer.define("fortress", FortressRoom);

// Запускаем
gameServer.listen(port).then(() => {
  console.log(`
╔════════════════════════════════════════════╗
║     🏰 Fortress Game Server Started!       ║
║                                            ║
║  Colyseus Server running on port ${port}      ║
║  WebSocket: ws://localhost:${port}            ║
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
