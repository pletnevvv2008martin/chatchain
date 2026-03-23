/**
 * Интегрированный сервер Next.js + Colyseus
 * Правильно разделяет WebSocket для Colyseus и Next.js HMR
 */

import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'colyseus';
import { FortressRoom } from './server/fortress-room';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Проверка, является ли запрос Colyseus WebSocket
function isColyseusRequest(req: IncomingMessage): boolean {
  const url = req.url || '';
  // Colyseus использует пути /matchmake, /room и т.д.
  // Next.js HMR использует /_next/webpack-hmr
  return (
    url.includes('/matchmake') ||
    url.includes('/room') ||
    url.includes('/fortress') ||
    (req.headers.upgrade === 'websocket' && !url.includes('/_next/'))
  );
}

async function main() {
  // Инициализация Next.js
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  try {
    await app.prepare();
    console.log('✅ Next.js prepared');

    // Создаём HTTP сервер с правильной обработкой upgrade
    const httpServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Создаём Colyseus сервер
    const gameServer = new Server({
      server: httpServer,
      pingInterval: 15000,
      pingMaxRetries: 3,
    });

    // Регистрируем игровую комнату
    gameServer.define('fortress', FortressRoom);

    // Правильная обработка WebSocket upgrade
    // Сначала сохраняем исходные обработчики
    const originalUpgradeListeners = httpServer.listeners('upgrade').slice();

    // Удаляем все обработчики upgrade
    httpServer.removeAllListeners('upgrade');

    // Добавляем наш обработчик, который правильно маршрутизирует
    httpServer.on('upgrade', (req, socket, head) => {
      const url = req.url || '';

      // Next.js HMR - пропускаем через стандартный обработчик Next.js
      if (url.includes('/_next/webpack-hmr')) {
        console.log('🔌 Next.js HMR WebSocket:', url.substring(0, 50));
        // Передаём Next.js для обработки
        handle(req, socket as any, head);
        return;
      }

      // Colyseus WebSocket
      if (isColyseusRequest(req)) {
        console.log('🏰 Colyseus WebSocket upgrade:', url.substring(0, 100));
        // Вызываем оригинальные обработчики Colyseus
        for (const listener of originalUpgradeListeners) {
          listener.call(httpServer, req, socket, head);
        }
        return;
      }

      // Остальные WebSocket запросы - передаём Next.js
      console.log('🔌 Other WebSocket upgrade:', url.substring(0, 50));
      handle(req, socket as any, head);
    });

    // Запускаем сервер
    httpServer.listen(port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 ChatChain + Fortress Server Started!                    ║
║                                                               ║
║   Next.js:      http://localhost:${port}                        ║
║   WebSocket:    ws://localhost:${port}                          ║
║                                                               ║
║   🏰 Fortress game is now accessible through the tunnel!      ║
║   📱 Mobile users: Use the same URL as the website            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      gameServer.gracefullyShutdown().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM...');
      gameServer.gracefullyShutdown().then(() => process.exit(0));
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
