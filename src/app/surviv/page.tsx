'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Crosshair, Heart, Shield, Bullet, Package, 
  MapPin, Users, Trophy, Skull, Timer, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================
// ТИПЫ
// ============================================

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  armor: number;
  weapon: Weapon;
  ammo: number;
  kills: number;
  isAlive: boolean;
  color: string;
}

interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  ammoMax: number;
  spread: number;
  emoji: string;
}

interface Loot {
  id: string;
  x: number;
  y: number;
  type: 'weapon' | 'ammo' | 'health' | 'armor';
  weapon?: Weapon;
  amount?: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerId: string;
}

interface GameZone {
  currentRadius: number;
  targetRadius: number;
  centerX: number;
  centerY: number;
  nextShrink: number;
}

// ============================================
// КОНСТАНТЫ
// ============================================

const MAP_SIZE = 2000;
const PLAYER_SIZE = 30;
const BULLET_SPEED = 15;
const PLAYER_SPEED = 4;

const WEAPONS: Record<string, Weapon> = {
  pistol: { id: 'pistol', name: 'Пистолет', damage: 15, fireRate: 300, range: 400, ammoMax: 12, spread: 0.1, emoji: '🔫' },
  smg: { id: 'smg', name: 'SMG', damage: 12, fireRate: 100, range: 300, ammoMax: 30, spread: 0.2, emoji: '🔫' },
  shotgun: { id: 'shotgun', name: 'Дробовик', damage: 8, fireRate: 800, range: 200, ammoMax: 6, spread: 0.4, emoji: '🔫' },
  rifle: { id: 'rifle', name: 'Винтовка', damage: 35, fireRate: 600, range: 600, ammoMax: 5, spread: 0.05, emoji: '🎯' },
  sniper: { id: 'sniper', name: 'Снайперка', damage: 80, fireRate: 1500, range: 1000, ammoMax: 5, spread: 0.02, emoji: '🎯' },
};

const LOOT_TYPES = [
  { type: 'weapon' as const, weapon: WEAPONS.smg, weight: 20 },
  { type: 'weapon' as const, weapon: WEAPONS.shotgun, weight: 15 },
  { type: 'weapon' as const, weapon: WEAPONS.rifle, weight: 10 },
  { type: 'weapon' as const, weapon: WEAPONS.sniper, weight: 5 },
  { type: 'ammo' as const, amount: 30, weight: 30 },
  { type: 'health' as const, amount: 50, weight: 15 },
  { type: 'armor' as const, amount: 50, weight: 10 },
];

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

export default function SurvivPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastShotRef = useRef<number>(0);
  
  // Пользователь
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Игра
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [aliveCount, setAliveCount] = useState(0);
  
  // Игровые данные
  const playerRef = useRef<Player | null>(null);
  const botsRef = useRef<Player[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const lootsRef = useRef<Loot[]>([]);
  const zoneRef = useRef<GameZone>({
    currentRadius: MAP_SIZE,
    targetRadius: MAP_SIZE * 0.8,
    centerX: MAP_SIZE / 2,
    centerY: MAP_SIZE / 2,
    nextShrink: Date.now() + 30000
  });
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0 });
  const shootingRef = useRef(false);
  const cameraRef = useRef({ x: 0, y: 0 });
  const renderRef = useRef<((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null>(null);
  
  // UI state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerAmmo, setPlayerAmmo] = useState(12);
  const [playerKills, setPlayerKills] = useState(0);
  const [playerWeapon, setPlayerWeapon] = useState(WEAPONS.pistol);

  // Проверка регистрации
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedUser = localStorage.getItem('chatchain_user');
    const registered = localStorage.getItem('chatchain_registered') === 'true';
    
    if (!storedUser || !registered) {
      setLoading(false);
      return;
    }
    
    const user = JSON.parse(storedUser);
    setUserId(user.id);
    setUserName(user.nickname);
    setIsRegistered(true);
    setLoading(false);
  }, []);

  // Обновление UI (перемещено выше startGame)
  const updateUI = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    
    setPlayerHealth(player.health);
    setPlayerArmor(player.armor);
    setPlayerAmmo(player.ammo);
    setPlayerKills(player.kills);
    setPlayerWeapon(player.weapon);
    setAliveCount(botsRef.current.filter(b => b.isAlive).length + (player.isAlive ? 1 : 0));
  }, []);

  // Инициализация игры
  const startGame = useCallback(() => {
    const player: Player = {
      id: userId,
      name: userName,
      x: MAP_SIZE / 2 + (Math.random() - 0.5) * 500,
      y: MAP_SIZE / 2 + (Math.random() - 0.5) * 500,
      angle: 0,
      health: 100,
      maxHealth: 100,
      armor: 0,
      weapon: WEAPONS.pistol,
      ammo: WEAPONS.pistol.ammoMax,
      kills: 0,
      isAlive: true,
      color: '#4ade80'
    };
    
    playerRef.current = player;
    
    // Создаём ботов
    const bots: Player[] = [];
    const botNames = ['Викинг', 'Рейдер', 'Снайпер', 'Танк', 'Призрак', 'Хищник', 'Ястреб', 'Волк', 'Орёл', 'Лиса', 'Медведь', 'Тигр', 'Лев', 'Акула'];
    for (let i = 0; i < 15; i++) {
      bots.push({
        id: `bot_${i}`,
        name: botNames[i % botNames.length],
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        angle: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        armor: 0,
        weapon: Object.values(WEAPONS)[Math.floor(Math.random() * 3)],
        ammo: 30,
        kills: 0,
        isAlive: true,
        color: '#ef4444'
      });
    }
    botsRef.current = bots;
    
    // Создаём лут
    const loots: Loot[] = [];
    for (let i = 0; i < 50; i++) {
      const lootType = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
      loots.push({
        id: `loot_${i}`,
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        ...lootType
      });
    }
    lootsRef.current = loots;
    
    // Сбрасываем зону
    zoneRef.current = {
      currentRadius: MAP_SIZE,
      targetRadius: MAP_SIZE * 0.8,
      centerX: MAP_SIZE / 2,
      centerY: MAP_SIZE / 2,
      nextShrink: Date.now() + 30000
    };
    
    bulletsRef.current = [];
    setGameStarted(true);
    setGameOver(false);
    setGameWon(false);
    setAliveCount(bots.length + 1);
    updateUI();
  }, [userId, userName, updateUI]);

  // Игровой цикл
  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const gameLoop = () => {
      const player = playerRef.current;
      if (!player || !player.isAlive) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Движение игрока
      let dx = 0, dy = 0;
      if (keysRef.current.has('w') || keysRef.current.has('ц')) dy -= 1;
      if (keysRef.current.has('s') || keysRef.current.has('ы')) dy += 1;
      if (keysRef.current.has('a') || keysRef.current.has('ф')) dx -= 1;
      if (keysRef.current.has('d') || keysRef.current.has('в')) dx += 1;
      
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        player.x += (dx / len) * PLAYER_SPEED;
        player.y += (dy / len) * PLAYER_SPEED;
        player.x = Math.max(PLAYER_SIZE, Math.min(MAP_SIZE - PLAYER_SIZE, player.x));
        player.y = Math.max(PLAYER_SIZE, Math.min(MAP_SIZE - PLAYER_SIZE, player.y));
      }
      
      // Угол к мыши
      const screenX = player.x - cameraRef.current.x + canvas.width / 2;
      const screenY = player.y - cameraRef.current.y + canvas.height / 2;
      player.angle = Math.atan2(mouseRef.current.y - screenY, mouseRef.current.x - screenX);
      
      // Стрельба
      if (shootingRef.current && player.ammo > 0) {
        const now = Date.now();
        if (now - lastShotRef.current > player.weapon.fireRate) {
          lastShotRef.current = now;
          const spread = (Math.random() - 0.5) * player.weapon.spread;
          const angle = player.angle + spread;
          
          bulletsRef.current.push({
            id: `bullet_${Date.now()}_${Math.random()}`,
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            damage: player.weapon.damage,
            ownerId: player.id
          });
          player.ammo--;
        }
      }
      
      // Обновление пуль
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Попадание в ботов
        for (const bot of botsRef.current) {
          if (!bot.isAlive) continue;
          const dist = Math.sqrt((bullet.x - bot.x) ** 2 + (bullet.y - bot.y) ** 2);
          if (dist < PLAYER_SIZE) {
            const damage = Math.max(0, bullet.damage - bot.armor * 0.5);
            bot.health -= damage;
            bot.armor = Math.max(0, bot.armor - damage * 0.3);
            if (bot.health <= 0) {
              bot.isAlive = false;
              if (bullet.ownerId === player.id) player.kills++;
            }
            return false;
          }
        }
        
        // Попадание в игрока
        if (bullet.ownerId !== player.id) {
          const dist = Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2);
          if (dist < PLAYER_SIZE) {
            const damage = Math.max(0, bullet.damage - player.armor * 0.5);
            player.health -= damage;
            player.armor = Math.max(0, player.armor - damage * 0.3);
            if (player.health <= 0) {
              player.isAlive = false;
              setGameOver(true);
            }
            return false;
          }
        }
        
        return bullet.x > 0 && bullet.x < MAP_SIZE && bullet.y > 0 && bullet.y < MAP_SIZE;
      });
      
      // AI ботов
      for (const bot of botsRef.current) {
        if (!bot.isAlive) continue;
        
        const zone = zoneRef.current;
        const distToCenter = Math.sqrt((bot.x - zone.centerX) ** 2 + (bot.y - zone.centerY) ** 2);
        
        if (distToCenter > zone.currentRadius - 100) {
          const angle = Math.atan2(zone.centerY - bot.y, zone.centerX - bot.x);
          bot.x += Math.cos(angle) * PLAYER_SPEED * 0.7;
          bot.y += Math.sin(angle) * PLAYER_SPEED * 0.7;
        } else {
          if (Math.random() < 0.02) bot.angle = Math.random() * Math.PI * 2;
          bot.x += Math.cos(bot.angle) * PLAYER_SPEED * 0.5;
          bot.y += Math.sin(bot.angle) * PLAYER_SPEED * 0.5;
        }
        
        bot.x = Math.max(PLAYER_SIZE, Math.min(MAP_SIZE - PLAYER_SIZE, bot.x));
        bot.y = Math.max(PLAYER_SIZE, Math.min(MAP_SIZE - PLAYER_SIZE, bot.y));
        
        // Стрельба в игрока
        const distToPlayer = Math.sqrt((bot.x - player.x) ** 2 + (bot.y - player.y) ** 2);
        if (distToPlayer < bot.weapon.range && Math.random() < 0.03) {
          const angle = Math.atan2(player.y - bot.y, player.x - bot.x);
          const spread = (Math.random() - 0.5) * bot.weapon.spread;
          bulletsRef.current.push({
            id: `bullet_${Date.now()}_${Math.random()}`,
            x: bot.x + Math.cos(angle) * 20,
            y: bot.y + Math.sin(angle) * 20,
            vx: Math.cos(angle + spread) * BULLET_SPEED,
            vy: Math.sin(angle + spread) * BULLET_SPEED,
            damage: bot.weapon.damage,
            ownerId: bot.id
          });
        }
      }
      
      // Зона сжатия
      const zone = zoneRef.current;
      if (Date.now() > zone.nextShrink && zone.targetRadius > 100) {
        zone.targetRadius *= 0.7;
        zone.nextShrink = Date.now() + 30000;
      }
      if (zone.currentRadius > zone.targetRadius) zone.currentRadius -= 0.5;
      
      // Урон от зоны
      const playerDistToCenter = Math.sqrt((player.x - zone.centerX) ** 2 + (player.y - zone.centerY) ** 2);
      if (playerDistToCenter > zone.currentRadius) {
        player.health -= 0.5;
        if (player.health <= 0) {
          player.isAlive = false;
          setGameOver(true);
        }
      }
      
      // Подбор лута
      lootsRef.current = lootsRef.current.filter(loot => {
        const dist = Math.sqrt((player.x - loot.x) ** 2 + (player.y - loot.y) ** 2);
        if (dist < PLAYER_SIZE * 2) {
          if (loot.type === 'weapon' && loot.weapon) {
            player.weapon = loot.weapon;
            player.ammo = loot.weapon.ammoMax;
          } else if (loot.type === 'ammo') {
            player.ammo = Math.min(player.weapon.ammoMax, player.ammo + (loot.amount || 15));
          } else if (loot.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + (loot.amount || 25));
          } else if (loot.type === 'armor') {
            player.armor = Math.min(100, player.armor + (loot.amount || 25));
          }
          return false;
        }
        return true;
      });
      
      // Проверка победы
      const aliveBots = botsRef.current.filter(b => b.isAlive).length;
      if (aliveBots === 0 && player.isAlive) {
        setGameWon(true);
        setGameOver(true);
      }
      
      cameraRef.current.x = player.x;
      cameraRef.current.y = player.y;
      
      // Рендер
      if (renderRef.current) {
        renderRef.current(ctx, canvas.width, canvas.height);
      }
      updateUI();
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, updateUI]);

  // Рендер
  const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const player = playerRef.current;
    const zone = zoneRef.current;
    const cam = cameraRef.current;
    
    // Фон
    ctx.fillStyle = '#1a2e1a';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offsetX = -cam.x % gridSize + width / 2;
    const offsetY = -cam.y % gridSize + height / 2;
    
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Зона
    const zoneScreenX = zone.centerX - cam.x + width / 2;
    const zoneScreenY = zone.centerY - cam.y + height / 2;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(zoneScreenX, zoneScreenY, zone.currentRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(zoneScreenX, zoneScreenY, zone.currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(zoneScreenX, zoneScreenY, zone.targetRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    
    // Лут
    for (const loot of lootsRef.current) {
      const sx = loot.x - cam.x + width / 2;
      const sy = loot.y - cam.y + height / 2;
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
      
      ctx.beginPath();
      ctx.arc(sx, sy, 15, 0, Math.PI * 2);
      ctx.fillStyle = loot.type === 'weapon' ? '#fbbf24' : loot.type === 'ammo' ? '#f97316' : loot.type === 'health' ? '#ef4444' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const emoji = loot.type === 'weapon' ? (loot.weapon?.emoji || '🔫') : loot.type === 'ammo' ? '📦' : loot.type === 'health' ? '❤️' : '🛡️';
      ctx.fillText(emoji, sx, sy);
    }
    
    // Пули
    ctx.fillStyle = '#fbbf24';
    for (const bullet of bulletsRef.current) {
      const sx = bullet.x - cam.x + width / 2;
      const sy = bullet.y - cam.y + height / 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Боты
    for (const bot of botsRef.current) {
      if (!bot.isAlive) continue;
      const sx = bot.x - cam.x + width / 2;
      const sy = bot.y - cam.y + height / 2;
      if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;
      
      ctx.beginPath();
      ctx.arc(sx, sy, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = bot.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(bot.angle);
      ctx.fillStyle = '#333';
      ctx.fillRect(15, -4, 25, 8);
      ctx.restore();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(bot.name, sx, sy - 40);
      
      const hpWidth = 50;
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - hpWidth / 2, sy - 35, hpWidth, 6);
      ctx.fillStyle = bot.health > 50 ? '#22c55e' : bot.health > 25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(sx - hpWidth / 2, sy - 35, hpWidth * (bot.health / bot.maxHealth), 6);
    }
    
    // Игрок
    if (player && player.isAlive) {
      const sx = width / 2;
      const sy = height / 2;
      
      ctx.beginPath();
      ctx.arc(sx, sy, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(player.angle);
      ctx.fillStyle = '#333';
      ctx.fillRect(15, -5, 30, 10);
      ctx.restore();
      
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouseRef.current.x - 10, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x + 10, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 10);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 10);
      ctx.stroke();
    }
    
    // Мини-карта
    const mapSize = 120;
    const mapX = width - mapSize - 10;
    const mapY = 10;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    const miniZoneX = mapX + (zone.centerX / MAP_SIZE) * mapSize;
    const miniZoneY = mapY + (zone.centerY / MAP_SIZE) * mapSize;
    const miniZoneR = (zone.currentRadius / MAP_SIZE) * mapSize;
    
    ctx.beginPath();
    ctx.arc(miniZoneX, miniZoneY, miniZoneR, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    for (const bot of botsRef.current) {
      if (!bot.isAlive) continue;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(mapX + (bot.x / MAP_SIZE) * mapSize - 2, mapY + (bot.y / MAP_SIZE) * mapSize - 2, 4, 4);
    }
    
    if (player && player.isAlive) {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(mapX + (player.x / MAP_SIZE) * mapSize - 3, mapY + (player.y / MAP_SIZE) * mapSize - 3, 6, 6);
    }
  };

  // Сохраняем render в ref
  renderRef.current = render;

  // Обработчики событий
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const handleMouseMove = (e: MouseEvent) => mouseRef.current = { x: e.clientX, y: e.clientY };
    const handleMouseDown = () => shootingRef.current = true;
    const handleMouseUp = () => shootingRef.current = false;
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Загрузка
  if (loading) {
    return (
      <div className="surviv-page loading">
        <div className="loading-content">
          <Crosshair className="w-16 h-16 animate-pulse text-red-500" />
          <p>Загрузка...</p>
        </div>
        <Styles />
      </div>
    );
  }

  // Не зарегистрирован
  if (!isRegistered) {
    return (
      <div className="surviv-page not-registered">
        <div className="lock-content">
          <Shield className="w-20 h-20 text-yellow-500 mb-4" />
          <h1>🔒 Только для зарегистрированных</h1>
          <p>Battle Royale доступен только зарегистрированным игрокам!</p>
          <div className="lock-buttons">
            <Button onClick={() => router.push('/')} className="back-btn"><ArrowLeft size={16} /> На главную</Button>
            <Button onClick={() => router.push('/')} className="register-btn">Зарегистрироваться</Button>
          </div>
        </div>
        <Styles />
      </div>
    );
  }

  // Игра окончена
  if (gameOver) {
    return (
      <div className="surviv-page game-over">
        <div className="game-over-content">
          {gameWon ? (
            <>
              <Trophy className="w-24 h-24 text-yellow-500 mb-4" />
              <h1>🏆 ПОБЕДА!</h1>
              <p className="stats">Убийств: {playerKills}</p>
              <p className="stats">Вы последний выживший!</p>
            </>
          ) : (
            <>
              <Skull className="w-24 h-24 text-red-500 mb-4" />
              <h1>💀 ПОРАЖЕНИЕ</h1>
              <p className="stats">Убийств: {playerKills}</p>
              <p className="stats">Выживших: {aliveCount}</p>
            </>
          )}
          <div className="game-over-buttons">
            <Button onClick={startGame} className="retry-btn">🔄 Играть снова</Button>
            <Button onClick={() => router.push('/')} className="exit-btn"><ArrowLeft size={16} /> Выйти</Button>
          </div>
        </div>
        <Styles />
      </div>
    );
  }

  // Ожидание начала
  if (!gameStarted) {
    return (
      <div className="surviv-page lobby">
        <div className="lobby-content">
          <h1>⚔️ SURVIV.IO</h1>
          <h2>Battle Royale</h2>
          <div className="lobby-info">
            <div className="info-card"><Users size={24} /><span>15 противников</span></div>
            <div className="info-card"><MapPin size={24} /><span>Сужающаяся зона</span></div>
            <div className="info-card"><Package size={24} /><span>Лут по карте</span></div>
          </div>
          <div className="controls-info">
            <h3>Управление:</h3>
            <p>WASD - движение</p>
            <p>Мышь - прицеливание</p>
            <p>ЛКМ - стрельба</p>
          </div>
          <Button onClick={startGame} className="start-btn">🎮 Начать игру</Button>
          <Link href="/" className="back-link"><ArrowLeft size={16} /> На главную</Link>
        </div>
        <Styles />
      </div>
    );
  }

  // Игра
  return (
    <div className="surviv-page game">
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="game-hud">
        <div className="hud-top-left">
          <div className="alive-count"><Users size={16} /><span>Живых: {aliveCount}</span></div>
          <div className="kills-count"><Skull size={16} /><span>Убийств: {playerKills}</span></div>
        </div>
        
        <div className="hud-top-right">
          <div className="zone-timer"><Timer size={16} /><span>Зона сужается...</span></div>
        </div>
        
        <div className="hud-bottom-left">
          <div className="health-bar">
            <Heart size={16} className="text-red-500" />
            <div className="bar-container"><div className="bar-fill health" style={{ width: `${playerHealth}%` }}></div></div>
            <span>{Math.round(playerHealth)}</span>
          </div>
          <div className="armor-bar">
            <Shield size={16} className="text-blue-500" />
            <div className="bar-container"><div className="bar-fill armor" style={{ width: `${playerArmor}%` }}></div></div>
            <span>{Math.round(playerArmor)}</span>
          </div>
        </div>
        
        <div className="hud-bottom-right">
          <div className="weapon-info">
            <span className="weapon-emoji">{playerWeapon.emoji}</span>
            <span className="weapon-name">{playerWeapon.name}</span>
          </div>
          <div className="ammo-info">
            <Bullet size={16} />
            <span>{playerAmmo} / {playerWeapon.ammoMax}</span>
          </div>
        </div>
      </div>
      
      <Styles />
    </div>
  );
}

// ============================================
// СТИЛИ
// ============================================

function Styles() {
  return (
    <style jsx global>{`
      .surviv-page {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #1a2e1a;
        color: white;
        font-family: 'Segoe UI', sans-serif;
      }

      .surviv-page.loading, .surviv-page.not-registered, .surviv-page.lobby, .surviv-page.game-over {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loading-content, .lock-content, .lobby-content, .game-over-content {
        text-align: center;
        padding: 40px;
      }

      .lock-content h1 { font-size: 32px; margin: 16px 0; color: #fbbf24; }
      .lock-content p { color: #888; margin-bottom: 24px; }
      .lock-buttons { display: flex; gap: 16px; justify-content: center; }
      .back-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
      .register-btn { background: linear-gradient(135deg, #22c55e, #16a34a); border: none; }

      .lobby-content h1 {
        font-size: 64px;
        margin: 0;
        background: linear-gradient(135deg, #ef4444, #f97316);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .lobby-content h2 { font-size: 24px; color: #888; margin: 8px 0 32px; }
      .lobby-info { display: flex; gap: 24px; justify-content: center; margin-bottom: 32px; flex-wrap: wrap; }
      
      .info-card {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
      }

      .controls-info { background: rgba(0,0,0,0.3); padding: 16px 24px; border-radius: 12px; margin-bottom: 24px; }
      .controls-info h3 { margin: 0 0 12px; color: #fbbf24; }
      .controls-info p { margin: 4px 0; color: #aaa; font-size: 14px; }

      .start-btn {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border: none;
        padding: 16px 48px;
        font-size: 18px;
        font-weight: bold;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .start-btn:hover { transform: scale(1.05); }

      .back-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; color: #888; text-decoration: none; }

      .game-over-content h1 { font-size: 48px; margin: 0; }
      .game-over-content .stats { font-size: 18px; color: #aaa; margin: 8px 0; }
      .game-over-buttons { display: flex; gap: 16px; justify-content: center; margin-top: 24px; }
      .retry-btn { background: linear-gradient(135deg, #22c55e, #16a34a); border: none; padding: 12px 32px; }
      .exit-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }

      .game-canvas { display: block; cursor: crosshair; }
      .game-hud { position: fixed; pointer-events: none; }

      .hud-top-left { position: fixed; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px; }
      .hud-top-left > div {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(0,0,0,0.6);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
      }

      .hud-top-right { position: fixed; top: 16px; right: 140px; }
      .zone-timer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255,0,0,0.3);
        border: 1px solid #ff4444;
        border-radius: 8px;
        font-size: 14px;
      }

      .hud-bottom-left { position: fixed; bottom: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px; width: 200px; }
      .health-bar, .armor-bar { display: flex; align-items: center; gap: 8px; }
      .bar-container { flex: 1; height: 16px; background: rgba(0,0,0,0.5); border-radius: 8px; overflow: hidden; }
      .bar-fill { height: 100%; border-radius: 8px; transition: width 0.2s; }
      .bar-fill.health { background: linear-gradient(90deg, #dc2626, #ef4444); }
      .bar-fill.armor { background: linear-gradient(90deg, #2563eb, #3b82f6); }

      .hud-bottom-right { position: fixed; bottom: 16px; right: 16px; text-align: right; }
      .weapon-info {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        background: rgba(0,0,0,0.6);
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .weapon-emoji { font-size: 24px; }
      .weapon-name { font-weight: bold; }
      .ammo-info { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-size: 18px; font-weight: bold; color: #fbbf24; }

      @media (max-width: 768px) {
        .lobby-info { flex-direction: column; align-items: center; }
        .lobby-content h1 { font-size: 48px; }
        .hud-bottom-left { width: 150px; }
        .hud-top-right { right: 130px; }
      }
    `}</style>
  );
}
