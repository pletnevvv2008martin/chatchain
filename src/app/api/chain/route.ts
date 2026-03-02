import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Типы
interface ChainCell {
  id: number;
  level: number;
  buyPrice: number;
  payout: number;
  cooldownHours: number;
  firstParticipant?: { 
    userId: string; 
    nickname: string; 
    timestamp: number;
  };
  status: 'available' | 'waiting';
}

interface HistoryRecord {
  cell: number;
  winner: string;
  winnerId: string;
  amount: number;
  time: string;
  timestamp: number;
}

interface UserCooldown {
  cellId: number;
  lastBuyTime: number;
}

interface GameStats {
  totalGames: number;
  totalPayouts: number;
  totalUsers: number;
}

interface GameState {
  cells: ChainCell[];
  history: HistoryRecord[];
  userCooldowns: Record<string, UserCooldown[]>;
  stats: GameStats;
  lastUpdate: number;
}

// Путь к файлу сохранения
const DATA_DIR = path.join(process.cwd(), 'data');
const SAVE_FILE = path.join(DATA_DIR, 'chain-game.json');

// Начальные ячейки
const generateCells = (): ChainCell[] => {
  const cells: ChainCell[] = [];
  
  const baseCells = [
    { price: 100, cooldown: 24 },
    { price: 200, cooldown: 48 },
    { price: 500, cooldown: 72 },
    { price: 1000, cooldown: 96 },
    { price: 2000, cooldown: 120 },
    { price: 3000, cooldown: 144 },
  ];
  
  baseCells.forEach((base, index) => {
    cells.push({
      id: index + 1,
      level: index + 1,
      buyPrice: base.price,
      payout: Math.floor(base.price * 1.5),
      cooldownHours: base.cooldown,
      status: 'available',
    });
  });
  
  // Ячейки 7-10
  for (let i = 6; i < 10; i++) {
    const price = 3000 + (i - 5) * 1000;
    const cooldown = 144 + (i - 5) * 24;
    cells.push({
      id: i + 1,
      level: i + 1,
      buyPrice: price,
      payout: Math.floor(price * 1.5),
      cooldownHours: cooldown,
      status: 'available',
    });
  }
  
  return cells;
};

// Начальное состояние
const getInitialState = (): GameState => ({
  cells: generateCells(),
  history: [],
  userCooldowns: {},
  stats: {
    totalGames: 0,
    totalPayouts: 0,
    totalUsers: 0,
  },
  lastUpdate: Date.now(),
});

// Загрузка состояния из файла
const loadGameState = (): GameState => {
  try {
    // Создаём директорию если не существует
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (fs.existsSync(SAVE_FILE)) {
      const data = fs.readFileSync(SAVE_FILE, 'utf-8');
      const saved = JSON.parse(data);
      
      // Проверяем валидность данных
      if (saved.cells && Array.isArray(saved.cells)) {
        return {
          ...getInitialState(),
          ...saved,
          lastUpdate: saved.lastUpdate || Date.now(),
        };
      }
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
  
  return getInitialState();
};

// Сохранение состояния в файл
const saveGameState = (state: GameState) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(SAVE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

// Глобальное состояние игры
let gameState: GameState = getInitialState();
let isLoaded = false;

// Ленивая загрузка при первом запросе
const ensureLoaded = () => {
  if (!isLoaded) {
    gameState = loadGameState();
    isLoaded = true;
  }
};

// Проверка кулдауна пользователя
const getUserCooldownRemaining = (userId: string, cellId: number): number => {
  const cooldowns = gameState.userCooldowns[userId];
  if (!cooldowns) return 0;
  
  const cooldown = cooldowns.find(c => c.cellId === cellId);
  if (!cooldown) return 0;
  
  const cell = gameState.cells.find(c => c.id === cellId);
  if (!cell) return 0;
  
  const elapsed = Date.now() - cooldown.lastBuyTime;
  const remaining = (cell.cooldownHours * 60 * 60 * 1000) - elapsed;
  
  return Math.max(0, remaining);
};

// Добавление кулдауна
const addUserCooldown = (userId: string, cellId: number) => {
  if (!gameState.userCooldowns[userId]) {
    gameState.userCooldowns[userId] = [];
  }
  
  const existingIndex = gameState.userCooldowns[userId].findIndex(c => c.cellId === cellId);
  if (existingIndex >= 0) {
    gameState.userCooldowns[userId][existingIndex].lastBuyTime = Date.now();
  } else {
    gameState.userCooldowns[userId].push({ cellId, lastBuyTime: Date.now() });
  }
  
  gameState.lastUpdate = Date.now();
};

// GET - получить состояние игры
export async function GET(request: NextRequest) {
  ensureLoaded();
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const cellId = searchParams.get('cellId');
  const since = searchParams.get('since');
  
  // Если запрашивают конкретную ячейку
  if (cellId) {
    const cell = gameState.cells.find(c => c.id === parseInt(cellId));
    if (!cell) {
      return NextResponse.json({ success: false, error: 'Cell not found' }, { status: 404 });
    }
    
    const cooldownRemaining = userId ? getUserCooldownRemaining(userId, parseInt(cellId)) : 0;
    
    return NextResponse.json({
      success: true,
      cell,
      cooldownRemaining,
      canBuy: cooldownRemaining <= 0,
    });
  }
  
  // Получить кулдауны пользователя
  const userCooldowns = userId ? gameState.userCooldowns[userId] || [] : [];
  
  // Проверить, были ли обновления с момента последнего запроса
  if (since) {
    const sinceTime = parseInt(since);
    if (gameState.lastUpdate <= sinceTime) {
      return NextResponse.json({
        success: true,
        updated: false,
        lastUpdate: gameState.lastUpdate,
      });
    }
  }
  
  return NextResponse.json({
    success: true,
    updated: true,
    cells: gameState.cells,
    history: gameState.history.slice(0, 20),
    userCooldowns,
    stats: gameState.stats,
    lastUpdate: gameState.lastUpdate,
  });
}

// POST - купить ячейку
export async function POST(request: NextRequest) {
  ensureLoaded();
  
  try {
    const body = await request.json();
    const { action, userId, userName, cellId, userHp } = body;
    
    if (!userId || !userName) {
      return NextResponse.json({ success: false, error: 'User ID and name required' }, { status: 400 });
    }
    
    // Получить состояние игры
    if (action === 'get_state') {
      const userCooldowns = gameState.userCooldowns[userId] || [];
      return NextResponse.json({
        success: true,
        cells: gameState.cells,
        history: gameState.history.slice(0, 20),
        userCooldowns,
        stats: gameState.stats,
        lastUpdate: gameState.lastUpdate,
      });
    }
    
    // Получить статистику пользователя
    if (action === 'get_user_stats') {
      const userHistory = gameState.history.filter(h => h.winnerId === userId);
      const totalWon = userHistory.reduce((sum, h) => sum + h.amount, 0);
      const gamesPlayed = userHistory.length;
      
      return NextResponse.json({
        success: true,
        stats: {
          gamesPlayed,
          totalWon,
          lastWin: userHistory[0] || null,
        },
      });
    }
    
    // Купить ячейку
    if (action === 'buy_cell') {
      if (!cellId) {
        return NextResponse.json({ success: false, error: 'Cell ID required' }, { status: 400 });
      }
      
      const cell = gameState.cells.find(c => c.id === cellId);
      if (!cell) {
        return NextResponse.json({ success: false, error: 'Cell not found' }, { status: 404 });
      }
      
      // Проверка кулдауна
      const cooldownRemaining = getUserCooldownRemaining(userId, cellId);
      if (cooldownRemaining > 0) {
        return NextResponse.json({
          success: false,
          error: 'Cell on cooldown',
          cooldownRemaining,
        }, { status: 400 });
      }
      
      // Проверка HP (клиентская проверка, но дублируем на сервере)
      if (userHp !== undefined && userHp < cell.buyPrice) {
        return NextResponse.json({
          success: false,
          error: 'Not enough HP',
        }, { status: 400 });
      }
      
      // Проверяем, не является ли пользователь уже первым участником
      if (cell.firstParticipant && cell.firstParticipant.userId === userId) {
        return NextResponse.json({
          success: false,
          error: 'You are already waiting in this cell',
        }, { status: 400 });
      }
      
      if (cell.firstParticipant) {
        // Это ВТОРОЙ участник!
        const winner = cell.firstParticipant;
        const payout = cell.payout;
        
        // Обновляем ячейку - второй участник становится первым для следующего раунда
        gameState.cells = gameState.cells.map(c => 
          c.id === cellId 
            ? { 
                ...c, 
                firstParticipant: { userId, nickname: userName, timestamp: Date.now() },
                status: 'waiting' as const,
              }
            : c
        );
        
        // Добавляем кулдаун
        addUserCooldown(userId, cellId);
        
        // Добавляем в историю
        gameState.history.unshift({
          cell: cell.level,
          winner: winner.nickname,
          winnerId: winner.userId,
          amount: payout,
          time: new Date().toLocaleTimeString('ru-RU'),
          timestamp: Date.now(),
        });
        
        // Ограничиваем историю
        if (gameState.history.length > 100) {
          gameState.history = gameState.history.slice(0, 100);
        }
        
        // Обновляем статистику
        gameState.stats.totalGames++;
        gameState.stats.totalPayouts += payout;
        gameState.stats.totalUsers = Object.keys(gameState.userCooldowns).length;
        
        gameState.lastUpdate = Date.now();
        
        // Сохраняем состояние
        saveGameState(gameState);
        
        // Определяем, выиграл ли текущий пользователь
        const isWinner = winner.userId === userId;
        
        return NextResponse.json({
          success: true,
          action: 'payout',
          isWinner,
          winner: winner.nickname,
          winnerId: winner.userId,
          payout,
          message: isWinner 
            ? `🎉 Игрок найден! Вы выиграли ${payout} HP!` 
            : `Вы заняли ячейку #${cell.level}! Ожидайте следующего участника.`,
          cells: gameState.cells,
          history: gameState.history.slice(0, 20),
          stats: gameState.stats,
        });
        
      } else {
        // Это ПЕРВЫЙ участник
        gameState.cells = gameState.cells.map(c => 
          c.id === cellId 
            ? { 
                ...c, 
                firstParticipant: { userId, nickname: userName, timestamp: Date.now() },
                status: 'waiting' as const,
              }
            : c
        );
        
        // Добавляем кулдаун
        addUserCooldown(userId, cellId);
        
        // Обновляем статистику пользователей
        gameState.stats.totalUsers = Object.keys(gameState.userCooldowns).length;
        
        gameState.lastUpdate = Date.now();
        
        // Сохраняем состояние
        saveGameState(gameState);
        
        return NextResponse.json({
          success: true,
          action: 'waiting',
          message: `Вы заняли ячейку #${cell.level}! Ожидайте второго участника...`,
          cells: gameState.cells,
          history: gameState.history.slice(0, 20),
        });
      }
    }
    
    // Проверить выигрыши (для polling)
    if (action === 'check_wins') {
      // Находим ячейки где пользователь был первым и уже получил выплату
      const recentWins = gameState.history.filter(h => 
        h.winnerId === userId && 
        Date.now() - h.timestamp < 60000 // За последнюю минуту
      );
      
      if (recentWins.length > 0) {
        return NextResponse.json({
          success: true,
          hasWins: true,
          wins: recentWins,
        });
      }
      
      return NextResponse.json({
        success: true,
        hasWins: false,
      });
    }
    
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    
  } catch (error) {
    console.error('Chain API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// DELETE - сбросить игру (только для тестирования/админа)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminKey = searchParams.get('adminKey');
  
  // Простая проверка (в реальном приложении использовать правильную авторизацию)
  if (adminKey !== 'reset-chain-2024') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  gameState = getInitialState();
  saveGameState(gameState);
  
  return NextResponse.json({ success: true, message: 'Game reset' });
}
