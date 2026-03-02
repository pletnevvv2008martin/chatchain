import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface User {
  id: string;
  nickname: string;
  email?: string;
  password?: string;
  createdAt: number;
  role?: 'user' | 'admin';
  xp?: number;
  points?: number;
}

interface StoredUsers {
  users: User[];
}

// Путь к файлу сохранения
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const generateId = () => Math.random().toString(36).substr(2, 12);

// Предустановленные админы
const ADMIN_ACCOUNTS = [
  { nickname: 'Martin', password: 'admin123', role: 'admin' as const },
];

// Загрузка пользователей из файла
const loadUsers = (): StoredUsers => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return { users: [] };
};

// Сохранение пользователей в файл
const saveUsers = (data: StoredUsers) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Глобальное хранилище
let usersData: StoredUsers = { users: [] };
let isLoaded = false;

// Инициализация
const ensureLoaded = () => {
  if (!isLoaded) {
    usersData = loadUsers();
    isLoaded = true;
    
    // Создаём админов если их нет
    ADMIN_ACCOUNTS.forEach(admin => {
      const exists = usersData.users.find(
        u => u.nickname.toLowerCase() === admin.nickname.toLowerCase()
      );
      if (!exists) {
        usersData.users.push({
          id: `admin-${generateId()}`,
          nickname: admin.nickname,
          password: admin.password,
          createdAt: Date.now(),
          role: admin.role,
          xp: 10000,
          points: 5000,
        });
        console.log(`✅ Admin created: ${admin.nickname}`);
      }
    });
    
    saveUsers(usersData);
  }
};

export async function POST(request: NextRequest) {
  ensureLoaded();
  
  try {
    const body = await request.json();
    const { action, nickname, email, password } = body;

    if (action === 'register') {
      const existingUser = usersData.users.find(
        u => u.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Этот никнейм занят' },
          { status: 400 }
        );
      }

      if (email) {
        const existingEmail = usersData.users.find(
          u => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (existingEmail) {
          return NextResponse.json(
            { success: false, error: 'Этот email уже используется' },
            { status: 400 }
          );
        }
      }

      const newUser: User = {
        id: `user-${generateId()}`,
        nickname,
        email: email || undefined,
        password: password || undefined,
        createdAt: Date.now(),
        role: 'user',
        xp: 100,
        points: 0,
      };

      usersData.users.push(newUser);
      saveUsers(usersData);

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          nickname: newUser.nickname,
          email: newUser.email,
          role: newUser.role,
        },
      });
    }

    if (action === 'login') {
      const user = usersData.users.find(
        u => u.nickname.toLowerCase() === nickname.toLowerCase()
      );

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Пользователь не найден' },
          { status: 400 }
        );
      }

      // Проверка пароля
      if (user.password) {
        if (!password) {
          return NextResponse.json(
            { success: false, error: 'Введите пароль' },
            { status: 400 }
          );
        }
        if (user.password !== password) {
          return NextResponse.json(
            { success: false, error: 'Неверный пароль' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
          xp: user.xp,
          points: user.points,
        },
      });
    }

    if (action === 'check') {
      const { userId } = body;
      const user = usersData.users.find(u => u.id === userId);

      if (user) {
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
            role: user.role,
            xp: user.xp,
            points: user.points,
          },
        });
      }

      return NextResponse.json({ success: false });
    }

    // Обновить данные пользователя
    if (action === 'update') {
      const { userId, xp, points } = body;
      const user = usersData.users.find(u => u.id === userId);
      
      if (user) {
        if (xp !== undefined) user.xp = xp;
        if (points !== undefined) user.points = points;
        saveUsers(usersData);
        
        return NextResponse.json({ success: true });
      }
      
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function GET() {
  ensureLoaded();
  
  return NextResponse.json({
    usersCount: usersData.users.length,
    admins: ADMIN_ACCOUNTS.map(a => ({ nickname: a.nickname, password: a.password })),
  });
}
