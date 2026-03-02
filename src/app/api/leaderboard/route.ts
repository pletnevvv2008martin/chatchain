import { NextRequest, NextResponse } from 'next/server';

interface UserStats {
  messageCount: number;
  lastRewardTime: number | null;
  totalPoints: number;
  userName?: string;
}

declare global {
  var userStats: Map<string, UserStats> | undefined;
  var userNames: Map<string, string> | undefined;
}

if (!globalThis.userStats) globalThis.userStats = new Map();
if (!globalThis.userNames) globalThis.userNames = new Map();

// Демо данные для тестирования
const demoUsers = [
  { userId: 'demo-1', userName: 'Martin', messageCount: 1520, totalPoints: 850 },
  { userId: 'demo-2', userName: 'Александр', messageCount: 892, totalPoints: 420 },
  { userId: 'demo-3', userName: 'Мария', messageCount: 654, totalPoints: 380 },
  { userId: 'demo-4', userName: 'Дмитрий', messageCount: 445, totalPoints: 250 },
  { userId: 'demo-5', userName: 'Елена', messageCount: 321, totalPoints: 180 },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  // Собираем всех пользователей и их статистику
  const leaderboard: Array<{
    userId: string;
    userName: string;
    messageCount: number;
    totalPoints: number;
  }> = [];

  globalThis.userStats!.forEach((stats, userId) => {
    const userName = globalThis.userNames!.get(userId) || `User_${userId.slice(0, 4)}`;
    leaderboard.push({
      userId,
      userName,
      messageCount: stats.messageCount,
      totalPoints: stats.totalPoints,
    });
  });

  // Добавляем демо пользователей если мало реальных
  if (leaderboard.length < 5) {
    demoUsers.forEach(demo => {
      if (!leaderboard.find(u => u.userId === demo.userId)) {
        leaderboard.push(demo);
      }
    });
  }

  // Сортируем по количеству сообщений
  leaderboard.sort((a, b) => b.messageCount - a.messageCount);

  // Добавляем ранги
  const topWithRanks = leaderboard.slice(0, limit).map((user, index) => ({
    ...user,
    rank: index + 1,
    badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`,
  }));

  return NextResponse.json({
    success: true,
    leaderboard: topWithRanks,
    total: leaderboard.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName } = body;

    if (userId && userName) {
      globalThis.userNames!.set(userId, userName);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
