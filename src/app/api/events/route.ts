import { NextRequest, NextResponse } from 'next/server';

interface ActiveEvent {
  id: string;
  type: 'coin_rain' | 'xp_bonus' | 'lucky_user' | 'jackpot';
  title: string;
  description: string;
  reward: number;
  endTime: number;
  claimedUsers: string[];
}

declare global {
  var activeEvents: ActiveEvent[] | undefined;
  var eventHistory: { type: string; timestamp: number }[] | undefined;
}

if (!globalThis.activeEvents) globalThis.activeEvents = [];
if (!globalThis.eventHistory) globalThis.eventHistory = [];

const EVENTS = [
  { type: 'coin_rain', title: '💰 Дождь монет!', description: 'Каждый получает +5 XP!', reward: 5, duration: 15000 },
  { type: 'xp_bonus', title: '⭐ Бонус XP!', description: 'Все получают +10 XP!', reward: 10, duration: 20000 },
  { type: 'lucky_user', title: '🍀 Счастливчик!', description: 'Быстрее всех кликни!', reward: 20, duration: 10000 },
  { type: 'jackpot', title: '🎰 ДЖЕКПОТ!', description: 'Огромный бонус первому!', reward: 50, duration: 8000 },
];

export async function GET() {
  const now = Date.now();

  // Очищаем истекшие события
  globalThis.activeEvents = globalThis.activeEvents!.filter(e => e.endTime > now);

  return NextResponse.json({
    success: true,
    events: globalThis.activeEvents,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, eventId } = body;

    switch (action) {
      case 'trigger': {
        // Запускаем случайное событие (не чаще чем раз в 30 секунд)
        const now = Date.now();
        const recentEvents = globalThis.eventHistory!.filter(e => now - e.timestamp < 30000);

        if (recentEvents.length > 0) {
          return NextResponse.json({ success: false, error: 'Слишком рано для нового события' });
        }

        const eventTemplate = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const newEvent: ActiveEvent = {
          id: `event-${now}`,
          type: eventTemplate.type as 'coin_rain' | 'xp_bonus' | 'lucky_user' | 'jackpot',
          title: eventTemplate.title,
          description: eventTemplate.description,
          reward: eventTemplate.reward,
          endTime: now + eventTemplate.duration,
          claimedUsers: [],
        };

        globalThis.activeEvents!.push(newEvent);
        globalThis.eventHistory!.push({ type: newEvent.type, timestamp: now });

        return NextResponse.json({
          success: true,
          event: newEvent,
        });
      }

      case 'claim': {
        if (!userId || !eventId) {
          return NextResponse.json({ success: false, error: 'userId и eventId обязательны' }, { status: 400 });
        }

        const event = globalThis.activeEvents!.find(e => e.id === eventId);

        if (!event) {
          return NextResponse.json({ success: false, error: 'Событие не найдено' });
        }

        if (event.endTime < Date.now()) {
          return NextResponse.json({ success: false, error: 'Событие уже закончилось' });
        }

        if (event.claimedUsers.includes(userId)) {
          return NextResponse.json({ success: false, error: 'Вы уже забрали награду' });
        }

        event.claimedUsers.push(userId);

        return NextResponse.json({
          success: true,
          reward: event.reward,
          message: `Вы получили +${event.reward} XP!`,
        });
      }

      case 'force_trigger': {
        // Для тестирования - принудительный запуск события
        const now = Date.now();
        const eventTemplate = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const newEvent: ActiveEvent = {
          id: `event-${now}`,
          type: eventTemplate.type as 'coin_rain' | 'xp_bonus' | 'lucky_user' | 'jackpot',
          title: eventTemplate.title,
          description: eventTemplate.description,
          reward: eventTemplate.reward,
          endTime: now + eventTemplate.duration,
          claimedUsers: [],
        };

        globalThis.activeEvents!.push(newEvent);

        return NextResponse.json({
          success: true,
          event: newEvent,
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
