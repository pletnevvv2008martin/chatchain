import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Файл для хранения дуэлей
const DUELS_FILE = path.join(process.cwd(), 'data', 'duels.json');

// Типы
interface Duel {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar?: string;
  opponentId: string;
  opponentName: string;
  opponentAvatar?: string;
  bet: number;
  status: 'pending' | 'accepted' | 'playing' | 'finished';
  createdAt: number;
  expiresAt: number;
  // Результаты игры в кости
  challengerRoll?: number[];
  opponentRoll?: number[];
  winnerId?: string;
  winnerName?: string;
}

// Загрузка дуэлей
function loadDuels(): Duel[] {
  try {
    if (fs.existsSync(DUELS_FILE)) {
      const data = fs.readFileSync(DUELS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading duels:', error);
  }
  return [];
}

// Сохранение дуэлей
function saveDuels(duels: Duel[]) {
  try {
    const dir = path.dirname(DUELS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DUELS_FILE, JSON.stringify(duels, null, 2));
  } catch (error) {
    console.error('Error saving duels:', error);
  }
}

// Генерация ID
function generateId(): string {
  return `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Бросок костей
function rollDice(): number[] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');

  const duels = loadDuels();

  // Очистка истекших дуэлей
  const now = Date.now();
  const activeDuels = duels.filter(d => d.status === 'pending' ? d.expiresAt > now : true);

  if (action === 'get_pending') {
    // Получить ожидающие дуэли для пользователя
    const pendingDuels = activeDuels.filter(d =>
      d.status === 'pending' &&
      d.opponentId === userId
    );
    return NextResponse.json({ duels: pendingDuels });
  }

  if (action === 'get_my_duels') {
    // Получить все дуэли пользователя
    const myDuels = activeDuels.filter(d =>
      d.challengerId === userId || d.opponentId === userId
    ).sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ duels: myDuels });
  }

  if (action === 'get_all') {
    // Получить все активные дуэли (для отображения в чате)
    const allDuels = activeDuels.filter(d =>
      d.status === 'pending' || d.status === 'playing'
    );
    return NextResponse.json({ duels: allDuels });
  }

  if (action === 'get_duel') {
    const duelId = searchParams.get('duelId');
    const duel = activeDuels.find(d => d.id === duelId);
    if (duel) {
      return NextResponse.json({ duel });
    }
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  return NextResponse.json({ duels: activeDuels });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  const duels = loadDuels();

  // Создать вызов на дуэль
  if (action === 'create') {
    const { challengerId, challengerName, challengerAvatar, opponentId, opponentName, opponentAvatar, bet } = body;

    if (!challengerId || !opponentId || !bet || bet < 10) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Проверка на существующий вызов
    const existingDuel = duels.find(d =>
      d.status === 'pending' &&
      ((d.challengerId === challengerId && d.opponentId === opponentId) ||
       (d.challengerId === opponentId && d.opponentId === challengerId))
    );

    if (existingDuel) {
      return NextResponse.json({ error: 'Уже есть активный вызов между этими игроками', duel: existingDuel }, { status: 400 });
    }

    const newDuel: Duel = {
      id: generateId(),
      challengerId,
      challengerName,
      challengerAvatar,
      opponentId,
      opponentName,
      opponentAvatar,
      bet,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут на принятие
    };

    duels.push(newDuel);
    saveDuels(duels);

    return NextResponse.json({ success: true, duel: newDuel });
  }

  // Принять вызов
  if (action === 'accept') {
    const { duelId, userId } = body;

    const duelIndex = duels.findIndex(d => d.id === duelId);
    if (duelIndex === -1) {
      return NextResponse.json({ error: 'Дуэль не найдена' }, { status: 404 });
    }

    const duel = duels[duelIndex];

    if (duel.opponentId !== userId) {
      return NextResponse.json({ error: 'Вы не являетесь вызываемым игроком' }, { status: 403 });
    }

    if (duel.status !== 'pending') {
      return NextResponse.json({ error: 'Дуэль уже не активна' }, { status: 400 });
    }

    if (duel.expiresAt < Date.now()) {
      duel.status = 'finished';
      saveDuels(duels);
      return NextResponse.json({ error: 'Время на принятие истекло' }, { status: 400 });
    }

    // Начинаем игру - оба бросают кости
    duel.challengerRoll = rollDice();
    duel.opponentRoll = rollDice();
    duel.status = 'playing';

    // Определяем победителя
    const challengerTotal = duel.challengerRoll[0] + duel.challengerRoll[1];
    const opponentTotal = duel.opponentRoll[0] + duel.opponentRoll[1];

    if (challengerTotal > opponentTotal) {
      duel.winnerId = duel.challengerId;
      duel.winnerName = duel.challengerName;
    } else if (opponentTotal > challengerTotal) {
      duel.winnerId = duel.opponentId;
      duel.winnerName = duel.opponentName;
    } else {
      // Ничья - перебрасываем
      while (duel.challengerRoll[0] + duel.challengerRoll[1] === duel.opponentRoll[0] + duel.opponentRoll[1]) {
        duel.challengerRoll = rollDice();
        duel.opponentRoll = rollDice();
      }
      const newChallengerTotal = duel.challengerRoll[0] + duel.challengerRoll[1];
      const newOpponentTotal = duel.opponentRoll[0] + duel.opponentRoll[1];
      duel.winnerId = newChallengerTotal > newOpponentTotal ? duel.challengerId : duel.opponentId;
      duel.winnerName = newChallengerTotal > newOpponentTotal ? duel.challengerName : duel.opponentName;
    }

    duel.status = 'finished';
    duels[duelIndex] = duel;
    saveDuels(duels);

    return NextResponse.json({ success: true, duel });
  }

  // Отклонить вызов
  if (action === 'decline') {
    const { duelId, userId } = body;

    const duelIndex = duels.findIndex(d => d.id === duelId);
    if (duelIndex === -1) {
      return NextResponse.json({ error: 'Дуэль не найдена' }, { status: 404 });
    }

    const duel = duels[duelIndex];

    if (duel.opponentId !== userId && duel.challengerId !== userId) {
      return NextResponse.json({ error: 'Нет прав' }, { status: 403 });
    }

    duel.status = 'finished';
    duels[duelIndex] = duel;
    saveDuels(duels);

    return NextResponse.json({ success: true });
  }

  // Отменить вызов (для инициатора)
  if (action === 'cancel') {
    const { duelId, userId } = body;

    const duelIndex = duels.findIndex(d => d.id === duelId);
    if (duelIndex === -1) {
      return NextResponse.json({ error: 'Дуэль не найдена' }, { status: 404 });
    }

    const duel = duels[duelIndex];

    if (duel.challengerId !== userId) {
      return NextResponse.json({ error: 'Только инициатор может отменить' }, { status: 403 });
    }

    if (duel.status !== 'pending') {
      return NextResponse.json({ error: 'Нельзя отменить' }, { status: 400 });
    }

    duel.status = 'finished';
    duels[duelIndex] = duel;
    saveDuels(duels);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
