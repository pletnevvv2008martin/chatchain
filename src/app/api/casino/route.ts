import { NextRequest, NextResponse } from 'next/server';

interface CasinoSession {
  userId: string;
  balance: number;
  totalBet: number;
  totalWin: number;
  gamesPlayed: number;
}

declare global {
  var casinoSessions: Map<string, CasinoSession> | undefined;
}

if (!globalThis.casinoSessions) globalThis.casinoSessions = new Map();

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];

const spinSlots = (): { symbols: string[]; multiplier: number; result: string } => {
  const symbols = [
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
  ];

  const symbolStr = symbols.join('');

  if (symbolStr === '7️⃣7️⃣7️⃣') return { symbols, multiplier: 10, result: 'ДЖЕКПОТ! 7️⃣7️⃣7️⃣' };
  if (symbolStr === '💎💎💎') return { symbols, multiplier: 7, result: 'Супер выигрыш! 💎💎💎' };
  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    return { symbols, multiplier: 5, result: `Три ${symbols[0]}! Отлично!` };
  }

  if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
    return { symbols, multiplier: 1.5, result: 'Два совпали! Маленький выигрыш' };
  }

  return { symbols, multiplier: 0, result: 'Не повезло...' };
};

const flipCoin = (choice: 'heads' | 'tails'): { win: boolean; result: string } => {
  const isHeads = Math.random() > 0.5;
  const result = isHeads ? 'heads' : 'tails';
  const win = result === choice;

  return {
    win,
    result: win
      ? `Выпал ${isHeads ? 'Орёл 🦅' : 'Решка 🪙'}! Вы выиграли!`
      : `Выпал ${isHeads ? 'Орёл 🦅' : 'Решка 🪙'}! Вы проиграли...`
  };
};

const rollDice = (): { dice: number[]; sum: number; multiplier: number; result: string } => {
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  const sum = dice[0] + dice[1];

  let multiplier = 0;
  let resultText = '';

  if (dice[0] === dice[1]) {
    if (dice[0] === 6) {
      multiplier = 5;
      resultText = `🎰 ${dice[0]}-${dice[1]}! Дубли шестёрок!`;
    } else {
      multiplier = 2;
      resultText = `🎯 ${dice[0]}-${dice[1]}! Дубль!`;
    }
  } else if (sum === 7) {
    multiplier = 1.5;
    resultText = `🍀 ${dice[0]}+${dice[1]}=7! Счастливая семёрка!`;
  } else {
    multiplier = 0;
    resultText = `${dice[0]} + ${dice[1]} = ${sum}. Не выиграл`;
  }

  return { dice, sum, multiplier, result: resultText };
};

const spinWheel = (): { segment: number; multiplier: number; result: string } => {
  const segments = [
    { multiplier: 0, label: '💀 Пусто' },
    { multiplier: 0.5, label: '🔸 x0.5' },
    { multiplier: 1, label: '🔹 x1' },
    { multiplier: 1.5, label: '🔷 x1.5' },
    { multiplier: 2, label: '💎 x2' },
    { multiplier: 3, label: '🌟 x3' },
    { multiplier: 5, label: '👑 x5' },
    { multiplier: 10, label: '🎰 x10 ДЖЕКПОТ' },
  ];

  const weights = [30, 25, 20, 12, 8, 3, 1.5, 0.5];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  let selectedIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const segment = segments[selectedIndex];
  return {
    segment: selectedIndex,
    multiplier: segment.multiplier,
    result: `Колесо: ${segment.label}`
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, bet, choice } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    let session = globalThis.casinoSessions!.get(userId);
    if (!session) {
      session = {
        userId,
        balance: 100,
        totalBet: 0,
        totalWin: 0,
        gamesPlayed: 0,
      };
      globalThis.casinoSessions!.set(userId, session);
    }

    switch (action) {
      case 'get_balance':
        return NextResponse.json({
          success: true,
          balance: session.balance,
          stats: {
            totalBet: session.totalBet,
            totalWin: session.totalWin,
            gamesPlayed: session.gamesPlayed,
          }
        });

      case 'slots': {
        if (bet <= 0 || bet > session.balance) {
          return NextResponse.json({ success: false, error: 'Недостаточно XP' });
        }

        session.balance -= bet;
        session.totalBet += bet;
        session.gamesPlayed++;

        const spin = spinSlots();
        const winAmount = Math.floor(bet * spin.multiplier);

        if (winAmount > 0) {
          session.balance += winAmount;
          session.totalWin += winAmount;
        }

        globalThis.casinoSessions!.set(userId, session);

        return NextResponse.json({
          success: true,
          game: 'slots',
          bet,
          win: winAmount,
          symbols: spin.symbols,
          result: spin.result,
          multiplier: spin.multiplier,
          newBalance: session.balance,
        });
      }

      case 'coinflip': {
        if (bet <= 0 || bet > session.balance) {
          return NextResponse.json({ success: false, error: 'Недостаточно XP' });
        }

        if (choice !== 'heads' && choice !== 'tails') {
          return NextResponse.json({ success: false, error: 'Выберите орёл или решку' });
        }

        session.balance -= bet;
        session.totalBet += bet;
        session.gamesPlayed++;

        const flip = flipCoin(choice);
        const winAmount = flip.win ? bet * 2 : 0;

        if (winAmount > 0) {
          session.balance += winAmount;
          session.totalWin += winAmount;
        }

        globalThis.casinoSessions!.set(userId, session);

        return NextResponse.json({
          success: true,
          game: 'coinflip',
          bet,
          win: winAmount,
          result: flip.result,
          newBalance: session.balance,
        });
      }

      case 'dice': {
        if (bet <= 0 || bet > session.balance) {
          return NextResponse.json({ success: false, error: 'Недостаточно XP' });
        }

        session.balance -= bet;
        session.totalBet += bet;
        session.gamesPlayed++;

        const roll = rollDice();
        const winAmount = Math.floor(bet * roll.multiplier);

        if (winAmount > 0) {
          session.balance += winAmount;
          session.totalWin += winAmount;
        }

        globalThis.casinoSessions!.set(userId, session);

        return NextResponse.json({
          success: true,
          game: 'dice',
          bet,
          win: winAmount,
          dice: roll.dice,
          sum: roll.sum,
          result: roll.result,
          multiplier: roll.multiplier,
          newBalance: session.balance,
        });
      }

      case 'wheel': {
        if (bet <= 0 || bet > session.balance) {
          return NextResponse.json({ success: false, error: 'Недостаточно XP' });
        }

        session.balance -= bet;
        session.totalBet += bet;
        session.gamesPlayed++;

        const wheel = spinWheel();
        const winAmount = Math.floor(bet * wheel.multiplier);

        if (winAmount > 0) {
          session.balance += winAmount;
          session.totalWin += winAmount;
        }

        globalThis.casinoSessions!.set(userId, session);

        return NextResponse.json({
          success: true,
          game: 'wheel',
          bet,
          win: winAmount,
          segment: wheel.segment,
          result: wheel.result,
          multiplier: wheel.multiplier,
          newBalance: session.balance,
        });
      }

      case 'add_balance': {
        const amount = body.amount || 50;
        session.balance += amount;
        globalThis.casinoSessions!.set(userId, session);
        return NextResponse.json({ success: true, newBalance: session.balance });
      }

      default:
        return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
