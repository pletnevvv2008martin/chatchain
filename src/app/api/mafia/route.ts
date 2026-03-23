import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Типы
type Role = 'civilian' | 'mafia' | 'doctor' | 'commissioner' | 'lover';
type GamePhase = 'lobby' | 'night' | 'day' | 'voting' | 'ended';

interface Player {
  id: string;
  nickname: string;
  role?: Role;
  isAlive: boolean;
  votedFor?: string;
  nightAction?: string; // ID игрока для ночного действия
}

interface Game {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  day: number;
  entryFee: number;
  prizePool: number;
  winner?: 'city' | 'mafia';
  nightActions: {
    mafiaKill?: string;
    doctorHeal?: string;
    commissionerCheck?: string;
    loverTarget?: string;
  };
  checkedPlayers: { targetId: string; isMafia: boolean }[];
  messages: string[];
  createdAt: number;
  lastUpdate: number;
}

interface GameState {
  games: Record<string, Game>;
  playerGames: Record<string, string>; // playerId -> gameId
}

// Роли и их количество в зависимости от числа игроков
const ROLE_DISTRIBUTION: Record<number, Role[]> = {
  4: ['mafia', 'doctor', 'civilian', 'civilian'],
  5: ['mafia', 'doctor', 'commissioner', 'civilian', 'civilian'],
  6: ['mafia', 'mafia', 'doctor', 'commissioner', 'civilian', 'civilian'],
  7: ['mafia', 'mafia', 'doctor', 'commissioner', 'lover', 'civilian', 'civilian'],
  8: ['mafia', 'mafia', 'doctor', 'commissioner', 'lover', 'civilian', 'civilian', 'civilian'],
  9: ['mafia', 'mafia', 'mafia', 'doctor', 'commissioner', 'lover', 'civilian', 'civilian', 'civilian'],
  10: ['mafia', 'mafia', 'mafia', 'doctor', 'commissioner', 'lover', 'civilian', 'civilian', 'civilian', 'civilian'],
};

const ROLE_NAMES: Record<Role, string> = {
  civilian: '👤 Мирный житель',
  mafia: '🔫 Мафия',
  doctor: '💊 Доктор',
  commissioner: '🕵️ Комиссар',
  lover: '❤️ Любовница',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  civilian: 'Выживите и найдите мафию!',
  mafia: 'Уничтожьте всех мирных жителей!',
  doctor: 'Спасайте игроков ночью от мафии',
  commissioner: 'Проверяйте игроков на принадлежность к мафии',
  lover: 'Ваш голос решает судьбу игрока днём (2 голоса)',
};

// Путь к файлу сохранения
const DATA_DIR = path.join(process.cwd(), 'data');
const SAVE_FILE = path.join(DATA_DIR, 'mafia-games.json');

// Загрузка состояния
const loadGameState = (): GameState => {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const data = fs.readFileSync(SAVE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading mafia games:', error);
  }
  return { games: {}, playerGames: {} };
};

// Сохранение состояния
const saveGameState = (state: GameState) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SAVE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving mafia games:', error);
  }
};

// Глобальное состояние
let gameState: GameState = { games: {}, playerGames: {} };
let isLoaded = false;

const ensureLoaded = () => {
  if (!isLoaded) {
    gameState = loadGameState();
    isLoaded = true;
  }
};

// Генерация ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Перемешивание массива
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Распределение ролей
const assignRoles = (players: Player[]): Player[] => {
  const count = players.length;
  let roles = ROLE_DISTRIBUTION[count];
  
  if (!roles) {
    // Для чисел не в таблице - адаптируем ближайшее
    const baseCount = Math.min(Math.max(count, 4), 10);
    roles = [...ROLE_DISTRIBUTION[baseCount]];
    while (roles.length < count) {
      roles.push('civilian');
    }
    roles = roles.slice(0, count);
  }
  
  const shuffledRoles = shuffleArray(roles);
  
  return players.map((player, index) => ({
    ...player,
    role: shuffledRoles[index],
    isAlive: true,
  }));
};

// Проверка победы
const checkWinCondition = (game: Game): 'city' | 'mafia' | null => {
  const alivePlayers = game.players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia').length;
  const aliveCivilians = alivePlayers.filter(p => p.role !== 'mafia').length;
  
  if (aliveMafia === 0) return 'city';
  if (aliveMafia >= aliveCivilians) return 'mafia';
  return null;
};

// Обработка ночи
const processNight = (game: Game): string[] => {
  const messages: string[] = [];
  const { mafiaKill, doctorHeal } = game.nightActions;
  
  // Обработка убийства мафии
  if (mafiaKill) {
    const target = game.players.find(p => p.id === mafiaKill);
    if (target && doctorHeal !== mafiaKill) {
      target.isAlive = false;
      messages.push(`💀 ${target.nickname} был убит мафией!`);
    } else if (doctorHeal === mafiaKill) {
      messages.push(`💊 Доктор спас игрока от мафии!`);
    }
  }
  
  // Обработка проверки комиссара
  if (game.nightActions.commissionerCheck) {
    const target = game.players.find(p => p.id === game.nightActions.commissionerCheck);
    if (target) {
      game.checkedPlayers.push({
        targetId: target.id,
        isMafia: target.role === 'mafia',
      });
    }
  }
  
  return messages;
};

// Создание новой игры
const createGame = (hostId: string, hostName: string, entryFee: number): Game => {
  const game: Game = {
    id: generateId(),
    hostId,
    players: [{
      id: hostId,
      nickname: hostName,
      isAlive: true,
    }],
    phase: 'lobby',
    day: 0,
    entryFee,
    prizePool: entryFee,
    nightActions: {},
    checkedPlayers: [],
    messages: [],
    createdAt: Date.now(),
    lastUpdate: Date.now(),
  };
  
  return game;
};

// GET - получить состояние игры
export async function GET(request: NextRequest) {
  ensureLoaded();
  
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  
  // Получить список игр в лобби
  if (action === 'list') {
    const lobbyGames = Object.values(gameState.games)
      .filter(g => g.phase === 'lobby')
      .map(g => ({
        id: g.id,
        hostId: g.hostId,
        playersCount: g.players.length,
        entryFee: g.entryFee,
        prizePool: g.prizePool,
      }));
    
    return NextResponse.json({ success: true, games: lobbyGames });
  }
  
  // Получить состояние конкретной игры
  if (gameId) {
    const game = gameState.games[gameId];
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }
    
    // Скрыть информацию о ролях других игроков
    const publicGame = {
      ...game,
      players: game.players.map(p => {
        const isCurrentPlayer = p.id === userId;
        return {
          id: p.id,
          nickname: p.nickname,
          isAlive: p.isAlive,
          role: isCurrentPlayer ? p.role : undefined,
          votedFor: p.votedFor,
        };
      }),
      // Показать результаты проверок только комиссару
      checkedPlayers: game.players.find(p => p.id === userId && p.role === 'commissioner')
        ? game.checkedPlayers
        : [],
    };
    
    return NextResponse.json({ success: true, game: publicGame });
  }
  
  // Получить игру игрока
  if (userId) {
    const playerGameId = gameState.playerGames[userId];
    if (playerGameId) {
      const game = gameState.games[playerGameId];
      if (game) {
        return NextResponse.json({ success: true, gameId: game.id });
      }
    }
    return NextResponse.json({ success: true, gameId: null });
  }
  
  return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
}

// POST - действия с игрой
export async function POST(request: NextRequest) {
  ensureLoaded();
  
  try {
    const body = await request.json();
    const { action, userId, userName, gameId, targetId, entryFee } = body;
    
    if (!userId || !userName) {
      return NextResponse.json({ success: false, error: 'User required' }, { status: 400 });
    }
    
    // Создать новую игру
    if (action === 'create') {
      // Проверяем, не в игре ли уже игрок
      if (gameState.playerGames[userId]) {
        return NextResponse.json({ success: false, error: 'Already in game' }, { status: 400 });
      }
      
      const fee = entryFee || 100;
      const game = createGame(userId, userName, fee);
      
      gameState.games[game.id] = game;
      gameState.playerGames[userId] = game.id;
      game.lastUpdate = Date.now();
      
      saveGameState(gameState);
      
      return NextResponse.json({ success: true, game });
    }
    
    // Присоединиться к игре
    if (action === 'join') {
      if (!gameId) {
        return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
      }
      
      const game = gameState.games[gameId];
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      
      if (game.phase !== 'lobby') {
        return NextResponse.json({ success: false, error: 'Game already started' }, { status: 400 });
      }
      
      if (game.players.find(p => p.id === userId)) {
        return NextResponse.json({ success: false, error: 'Already in game' }, { status: 400 });
      }
      
      if (game.players.length >= 10) {
        return NextResponse.json({ success: false, error: 'Game is full' }, { status: 400 });
      }
      
      game.players.push({
        id: userId,
        nickname: userName,
        isAlive: true,
      });
      game.prizePool += game.entryFee;
      gameState.playerGames[userId] = gameId;
      game.lastUpdate = Date.now();
      
      saveGameState(gameState);
      
      return NextResponse.json({ success: true, game });
    }
    
    // Выйти из игры (только в лобби)
    if (action === 'leave') {
      const playerGameId = gameState.playerGames[userId];
      if (!playerGameId) {
        return NextResponse.json({ success: false, error: 'Not in game' }, { status: 400 });
      }
      
      const game = gameState.games[playerGameId];
      if (!game) {
        delete gameState.playerGames[userId];
        return NextResponse.json({ success: true });
      }
      
      if (game.phase !== 'lobby') {
        return NextResponse.json({ success: false, error: 'Cannot leave during game' }, { status: 400 });
      }
      
      game.players = game.players.filter(p => p.id !== userId);
      game.prizePool -= game.entryFee;
      delete gameState.playerGames[userId];
      
      if (game.players.length === 0) {
        delete gameState.games[playerGameId];
      }
      
      game.lastUpdate = Date.now();
      saveGameState(gameState);
      
      return NextResponse.json({ success: true });
    }
    
    // Начать игру
    if (action === 'start') {
      const game = gameState.games[gameId];
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      
      if (game.hostId !== userId) {
        return NextResponse.json({ success: false, error: 'Only host can start' }, { status: 400 });
      }
      
      if (game.players.length < 4) {
        return NextResponse.json({ success: false, error: 'Need at least 4 players' }, { status: 400 });
      }
      
      // Распределяем роли
      game.players = assignRoles(game.players);
      game.phase = 'night';
      game.day = 1;
      game.nightActions = {};
      game.messages = ['🌙 Наступает ночь... Город засыпает.'];
      game.lastUpdate = Date.now();
      
      saveGameState(gameState);
      
      return NextResponse.json({ success: true, game });
    }
    
    // Ночное действие
    if (action === 'night_action') {
      const game = gameState.games[gameId];
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      
      if (game.phase !== 'night') {
        return NextResponse.json({ success: false, error: 'Not night phase' }, { status: 400 });
      }
      
      const player = game.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return NextResponse.json({ success: false, error: 'Player not alive' }, { status: 400 });
      }
      
      // Записываем действие в зависимости от роли
      if (player.role === 'mafia' && targetId) {
        game.nightActions.mafiaKill = targetId;
      } else if (player.role === 'doctor' && targetId) {
        game.nightActions.doctorHeal = targetId;
      } else if (player.role === 'commissioner' && targetId) {
        game.nightActions.commissionerCheck = targetId;
      }
      
      player.nightAction = targetId;
      game.lastUpdate = Date.now();
      
      // Проверяем, все ли живые игроки с ролями сделали ход
      const aliveWithRoles = game.players.filter(p => 
        p.isAlive && ['mafia', 'doctor', 'commissioner'].includes(p.role!)
      );
      const actedCount = aliveWithRoles.filter(p => p.nightAction).length;
      
      // Автоматически переходим к дню если все сделали ход или по таймеру
      // Для упрощения - переходим когда мафия сделала ход
      if (game.nightActions.mafiaKill) {
        const nightMessages = processNight(game);
        game.messages.push(...nightMessages);
        
        const winner = checkWinCondition(game);
        if (winner) {
          game.phase = 'ended';
          game.winner = winner;
          game.messages.push(winner === 'city' 
            ? '🎉 Город победил! Вся мафия уничтожена!' 
            : '🔫 Мафия победила!');
        } else {
          game.phase = 'day';
          game.messages.push(`☀️ Наступает день ${game.day}. Обсуждайте!`);
        }
        
        game.nightActions = {};
        game.players.forEach(p => p.nightAction = undefined);
      }
      
      saveGameState(gameState);
      
      return NextResponse.json({ success: true, game });
    }
    
    // Голосование
    if (action === 'vote') {
      const game = gameState.games[gameId];
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      
      if (game.phase !== 'day') {
        return NextResponse.json({ success: false, error: 'Not day phase' }, { status: 400 });
      }
      
      const player = game.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return NextResponse.json({ success: false, error: 'Player not alive' }, { status: 400 });
      }
      
      if (targetId) {
        // Любовница имеет 2 голоса
        const voteWeight = player.role === 'lover' ? 2 : 1;
        player.votedFor = targetId;
        
        game.messages.push(`🗳️ ${player.nickname} проголосовал${voteWeight > 1 ? ` (x${voteWeight})` : ''}`);
      }
      
      // Подсчитываем голоса
      const votes: Record<string, number> = {};
      game.players.filter(p => p.isAlive && p.votedFor).forEach(p => {
        const weight = p.role === 'lover' ? 2 : 1;
        votes[p.votedFor!] = (votes[p.votedFor!] || 0) + weight;
      });
      
      // Если все проголосовали или большинство - казним
      const alivePlayers = game.players.filter(p => p.isAlive);
      const votedCount = alivePlayers.filter(p => p.votedFor).length;
      
      if (votedCount >= Math.ceil(alivePlayers.length * 0.6)) {
        // Находим игрока с наибольшим количеством голосов
        let maxVotes = 0;
        let eliminated: string | null = null;
        
        Object.entries(votes).forEach(([playerId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            eliminated = playerId;
          }
        });
        
        if (eliminated) {
          const eliminatedPlayer = game.players.find(p => p.id === eliminated);
          if (eliminatedPlayer) {
            eliminatedPlayer.isAlive = false;
            game.messages.push(`⚔️ ${eliminatedPlayer.nickname} был изгнан! Он был ${ROLE_NAMES[eliminatedPlayer.role!]}`);
          }
        }
        
        // Очищаем голоса
        game.players.forEach(p => p.votedFor = undefined);
        
        // Проверяем победу
        const winner = checkWinCondition(game);
        if (winner) {
          game.phase = 'ended';
          game.winner = winner;
          game.messages.push(winner === 'city' 
            ? '🎉 Город победил! Вся мафия уничтожена!' 
            : '🔫 Мафия победила!');
        } else {
          // Следующая ночь
          game.phase = 'night';
          game.day++;
          game.messages.push(`🌙 Наступает ночь ${game.day}...`);
        }
      }
      
      game.lastUpdate = Date.now();
      saveGameState(gameState);
      
      return NextResponse.json({ success: true, game, votes });
    }
    
    // Пропустить ночь (для мирных)
    if (action === 'skip_night') {
      const game = gameState.games[gameId];
      if (!game) {
        return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
      }
      
      const player = game.players.find(p => p.id === userId);
      if (player && player.isAlive && player.role === 'civilian') {
        player.nightAction = 'skip';
        game.lastUpdate = Date.now();
        saveGameState(gameState);
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    
  } catch (error) {
    console.error('Mafia API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// DELETE - удалить игру
export async function DELETE(request: NextRequest) {
  ensureLoaded();
  
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const adminKey = searchParams.get('adminKey');
  
  if (adminKey === 'reset-mafia-2024') {
    gameState = { games: {}, playerGames: {} };
    saveGameState(gameState);
    return NextResponse.json({ success: true, message: 'All games deleted' });
  }
  
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'Game ID required' }, { status: 400 });
  }
  
  const game = gameState.games[gameId];
  if (!game) {
    return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
  }
  
  // Удаляем связи игроков
  game.players.forEach(p => {
    delete gameState.playerGames[p.id];
  });
  
  delete gameState.games[gameId];
  saveGameState(gameState);
  
  return NextResponse.json({ success: true });
}
