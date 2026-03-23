const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('colyseus');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Инициализация Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Импорт комнаты Fortress (CommonJS стиль)
let FortressRoom;
try {
  // Динамический импорт для ESM модуля
  FortressRoom = require('./dist/server/fortress-room.js').FortressRoom;
} catch (e) {
  console.log('Fortress room not compiled, using inline version');
}

async function main() {
  try {
    await app.prepare();

    const httpServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    // Инициализация Colyseus
    if (FortressRoom) {
      const gameServer = new Server({
        server: httpServer,
      });

      gameServer.define('fortress', FortressRoom);

      console.log(`
╔════════════════════════════════════════════╗
║     🏰 Fortress Game Server Integrated!    ║
║     Colyseus running on same port 3000     ║
╚════════════════════════════════════════════╝
      `);
    } else {
      console.log('⚠️  Fortress room not available in this mode');
    }

    httpServer.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   🚀 ChatChain Server Started!             ║
║                                            ║
║   Next.js: http://localhost:${port}          ║
║   WebSocket: ws://localhost:${port}          ║
╚════════════════════════════════════════════╝
      `);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
