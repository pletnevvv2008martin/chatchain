import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Файлы для хранения данных
const GIFTS_FILE = path.join(process.cwd(), 'data', 'gifts.json');
const THANKS_FILE = path.join(process.cwd(), 'data', 'thanks.json');

// Типы
interface Gift {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  message?: string;
  giftType: 'hp' | 'item';
  itemName?: string;
  createdAt: number;
}

interface Thanks {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  messageId: string;
  amount: number;
  createdAt: number;
}

// Загрузка подарков
function loadGifts(): Gift[] {
  try {
    if (fs.existsSync(GIFTS_FILE)) {
      const data = fs.readFileSync(GIFTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading gifts:', error);
  }
  return [];
}

// Сохранение подарков
function saveGifts(gifts: Gift[]) {
  try {
    const dir = path.dirname(GIFTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(GIFTS_FILE, JSON.stringify(gifts, null, 2));
  } catch (error) {
    console.error('Error saving gifts:', error);
  }
}

// Загрузка благодарностей
function loadThanks(): Thanks[] {
  try {
    if (fs.existsSync(THANKS_FILE)) {
      const data = fs.readFileSync(THANKS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading thanks:', error);
  }
  return [];
}

// Сохранение благодарностей
function saveThanks(thanks: Thanks[]) {
  try {
    const dir = path.dirname(THANKS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(THANKS_FILE, JSON.stringify(thanks, null, 2));
  } catch (error) {
    console.error('Error saving thanks:', error);
  }
}

// Генерация ID
function generateId(): string {
  return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Путь к файлу пользователей
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Обновление HP пользователя
function updateUserHp(userId: string, hpChange: number): { success: boolean; newHp: number; error?: string } {
  try {
    // Читаем из localStorage через API не можем, используем файл
    const chatchainUserPath = path.join(process.cwd(), 'data', 'chatchain_users.json');

    let users: Record<string, any> = {};

    // Пробуем загрузить существующих пользователей
    if (fs.existsSync(chatchainUserPath)) {
      const data = fs.readFileSync(chatchainUserPath, 'utf-8');
      users = JSON.parse(data);
    }

    if (!users[userId]) {
      users[userId] = { xp: 0 };
    }

    const currentHp = users[userId].xp || 0;
    const newHp = Math.max(0, currentHp + hpChange);

    users[userId].xp = newHp;
    users[userId].lastUpdated = Date.now();

    // Сохраняем
    fs.writeFileSync(chatchainUserPath, JSON.stringify(users, null, 2));

    return { success: true, newHp };
  } catch (error) {
    console.error('Error updating user HP:', error);
    return { success: false, newHp: 0, error: 'Failed to update HP' };
  }
}

// Получение HP пользователя
function getUserHp(userId: string): number {
  try {
    const chatchainUserPath = path.join(process.cwd(), 'data', 'chatchain_users.json');

    if (fs.existsSync(chatchainUserPath)) {
      const data = fs.readFileSync(chatchainUserPath, 'utf-8');
      const users = JSON.parse(data);
      return users[userId]?.xp || 0;
    }
  } catch (error) {
    console.error('Error getting user HP:', error);
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');

  if (action === 'get_gifts') {
    // Получить подарки пользователя
    const gifts = loadGifts();
    const userGifts = gifts.filter(g =>
      g.toId === userId || g.fromId === userId
    ).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    return NextResponse.json({ gifts: userGifts });
  }

  if (action === 'get_thanks') {
    // Получить благодарности пользователя
    const thanks = loadThanks();
    const userThanks = thanks.filter(t =>
      t.toId === userId || t.fromId === userId
    ).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    // Считаем общее количество полученных благодарностей и HP
    const receivedThanks = thanks.filter(t => t.toId === userId);
    const totalThanks = receivedThanks.length;
    const totalHpReceived = receivedThanks.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      thanks: userThanks,
      stats: { totalThanks, totalHpReceived }
    });
  }

  if (action === 'get_balance') {
    // Получить баланс HP
    const hp = getUserHp(userId || '');
    return NextResponse.json({ hp });
  }

  if (action === 'leaderboard') {
    // Топ по полученным благодарностям
    const thanks = loadThanks();

    const thanksByUser: Record<string, { userId: string; userName: string; count: number; hp: number }> = {};

    thanks.forEach(t => {
      if (!thanksByUser[t.toId]) {
        thanksByUser[t.toId] = { userId: t.toId, userName: t.toName, count: 0, hp: 0 };
      }
      thanksByUser[t.toId].count++;
      thanksByUser[t.toId].hp += t.amount;
    });

    const leaderboard = Object.values(thanksByUser)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({ leaderboard });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // Отправить подарок HP
  if (action === 'send_gift') {
    const { fromId, fromName, toId, toName, amount, message } = body;

    if (!fromId || !toId || !amount || amount < 10) {
      return NextResponse.json({ error: 'Минимальный подарок: 10 HP' }, { status: 400 });
    }

    if (fromId === toId) {
      return NextResponse.json({ error: 'Нельзя подарить себе!' }, { status: 400 });
    }

    // Проверяем баланс отправителя
    const senderHp = getUserHp(fromId);
    if (senderHp < amount) {
      return NextResponse.json({ error: `Недостаточно HP. У вас: ${senderHp} HP` }, { status: 400 });
    }

    // Списываем HP у отправителя
    const senderResult = updateUserHp(fromId, -amount);
    if (!senderResult.success) {
      return NextResponse.json({ error: 'Ошибка списания HP' }, { status: 500 });
    }

    // Комиссия 5%
    const commission = Math.floor(amount * 0.05);
    const receivedAmount = amount - commission;

    // Начисляем HP получателю
    const receiverResult = updateUserHp(toId, receivedAmount);
    if (!receiverResult.success) {
      // Возвращаем отправителю если ошибка
      updateUserHp(fromId, amount);
      return NextResponse.json({ error: 'Ошибка начисления HP' }, { status: 500 });
    }

    // Сохраняем подарок
    const gifts = loadGifts();
    const newGift: Gift = {
      id: generateId(),
      fromId,
      fromName,
      toId,
      toName,
      amount,
      message,
      giftType: 'hp',
      createdAt: Date.now(),
    };

    gifts.push(newGift);
    saveGifts(gifts);

    return NextResponse.json({
      success: true,
      gift: newGift,
      senderNewHp: senderResult.newHp,
      receivedAmount,
      commission,
    });
  }

  // Поблагодарить за сообщение
  if (action === 'thank') {
    const { fromId, fromName, toId, toName, messageId, amount = 5 } = body;

    if (!fromId || !toId || !messageId) {
      return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
    }

    if (fromId === toId) {
      return NextResponse.json({ error: 'Нельзя благодарить себя!' }, { status: 400 });
    }

    // Проверяем, не благодарил ли уже
    const thanks = loadThanks();
    const existingThank = thanks.find(t =>
      t.fromId === fromId && t.messageId === messageId
    );

    if (existingThank) {
      return NextResponse.json({ error: 'Вы уже благодарили за это сообщение' }, { status: 400 });
    }

    // Проверяем баланс отправителя (благодарность бесплатна, но можно добавить HP сверху)
    // По умолчанию благодарность бесплатная и даёт +5 HP получателю от системы
    const thankAmount = Math.min(amount, 20); // Максимум 20 HP за благодарность

    // Начисляем HP получателю (от системы, не от отправителя)
    updateUserHp(toId, thankAmount);

    // Сохраняем благодарность
    const newThanks: Thanks = {
      id: generateId(),
      fromId,
      fromName,
      toId,
      toName,
      messageId,
      amount: thankAmount,
      createdAt: Date.now(),
    };

    thanks.push(newThanks);
    saveThanks(thanks);

    return NextResponse.json({
      success: true,
      thanks: newThanks,
    });
  }

  // Получить статистику пользователя
  if (action === 'stats') {
    const { userId } = body;

    const gifts = loadGifts();
    const thanks = loadThanks();

    const sentGifts = gifts.filter(g => g.fromId === userId);
    const receivedGifts = gifts.filter(g => g.toId === userId);
    const givenThanks = thanks.filter(t => t.fromId === userId);
    const receivedThanks = thanks.filter(t => t.toId === userId);

    const totalSent = sentGifts.reduce((sum, g) => sum + g.amount, 0);
    const totalReceived = receivedGifts.reduce((sum, g) => sum + g.amount, 0);
    const totalThanksReceived = receivedThanks.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      sentGifts: sentGifts.length,
      receivedGifts: receivedGifts.length,
      totalSentHp: totalSent,
      totalReceivedHp: totalReceived,
      givenThanks: givenThanks.length,
      receivedThanks: receivedThanks.length,
      totalThanksHp: totalThanksReceived,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
