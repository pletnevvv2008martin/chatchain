'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Castle, Swords, Shield, Coins, TreeDeciduous, Mountain, Cog, Drumstick, Zap,
  Crown, Lock, X, ArrowLeft, RefreshCw, Volume2, VolumeX,
  Crosshair, Flag, Eye, Move, ZoomIn, ZoomOut, Heart, Skull, Chest,
  Sparkles, Flame, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Константы карты
const MAP_WIDTH = 30;
const MAP_HEIGHT = 20;
const HEX_SIZE = 50;

// Типы клеток
type CellType = 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'snow' | 'swamp' | 'lava' | 'void';

// Типы объектов
interface MapObject {
  id: string;
  type: 'castle' | 'resource' | 'monster' | 'treasure' | 'portal' | 'dungeon' | 'town';
  x: number;
  y: number;
  owner?: string;
  data?: any;
}

interface MapCell {
  type: CellType;
  object?: MapObject;
  visible: boolean;
  explored: boolean;
}

interface Player {
  id: string;
  name: string;
  race: string;
  raceEmoji: string;
  x: number;
  y: number;
  armyPower: number;
  color: string;
  resources: Record<string, number>;
  movementPoints: number;
  maxMovement: number;
  lastUpdate: string;
}

interface ResourceNode {
  id: string;
  type: 'gold_mine' | 'stone_quarry' | 'lumber_mill' | 'iron_mine' | 'farm' | 'mana_well';
  x: number;
  y: number;
  owner?: string;
  production: Record<string, number>;
}

interface Monster {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  power: number;
  reward: { gold: number; xp: number; };
}

interface BattleResult {
  won: boolean;
  losses: number;
  loot: Record<string, number>;
  message: string;
}

// Цвета рас
const RACE_COLORS: Record<string, string> = {
  human: '#4a90d9', elf: '#4ade80', dwarf: '#f59e0b', darkElf: '#a855f7',
  undead: '#2dd4bf', werewolf: '#78716c', orc: '#84cc16', mage: '#3b82f6',
  vampire: '#dc2626', dragonborn: '#f97316'
};

const RACE_EMOJIS: Record<string, string> = {
  human: '👤', elf: '🧝', dwarf: '🪓', darkElf: '🦇', undead: '🦴',
  werewolf: '🐺', orc: '🧌', mage: '🧙', vampire: '🧛', dragonborn: '🐲'
};

// Эмодзи для типов клеток
const CELL_EMOJI: Record<CellType, string> = {
  grass: '🌿', forest: '🌲', mountain: '⛰️', water: '🌊',
  desert: '🏜️', snow: '❄️', swamp: '🍄', lava: '🔥', void: '🌑'
};

// Цвета клеток
const CELL_COLORS: Record<CellType, string> = {
  grass: '#2d5a3d', forest: '#1a472a', mountain: '#4a5568', water: '#1e40af',
  desert: '#b45309', snow: '#e2e8f0', swamp: '#4a5568', lava: '#7f1d1d', void: '#1a1a1a'
};

// Типы ресурсов
const RESOURCE_TYPES = {
  gold_mine: { emoji: '💰', production: { gold: 100 }, name: 'Золотая шахта' },
  stone_quarry: { emoji: '🪨', production: { stone: 80 }, name: 'Каменоломня' },
  lumber_mill: { emoji: '🪵', production: { wood: 60 }, name: 'Лесопилка' },
  iron_mine: { emoji: '⚙️', production: { iron: 40 }, name: 'Железный рудник' },
  farm: { emoji: '🌾', production: { food: 100 }, name: 'Ферма' },
  mana_well: { emoji: '🔮', production: { mana: 30 }, name: 'Источник маны' },
};

// Монстры
const MONSTER_TYPES = [
  { name: 'Гоблины', emoji: '👺', powerBase: 50, rewardBase: 200 },
  { name: 'Орки', emoji: '👹', powerBase: 100, rewardBase: 400 },
  { name: 'Дракон', emoji: '🐉', powerBase: 300, rewardBase: 1500 },
  { name: 'Некромант', emoji: '💀', powerBase: 200, rewardBase: 800 },
  { name: 'Демон', emoji: '😈', powerBase: 250, rewardBase: 1000 },
  { name: 'Титан', emoji: '🗿', powerBase: 500, rewardBase: 3000 },
];

// Генерация карты
function generateMap(): MapCell[][] {
  const map: MapCell[][] = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Определяем тип клетки
      let type: CellType = 'grass';
      const rand = Math.random();
      
      if (rand < 0.15) type = 'forest';
      else if (rand < 0.25) type = 'mountain';
      else if (rand < 0.32) type = 'water';
      else if (rand < 0.37) type = 'desert';
      else if (rand < 0.42) type = 'snow';
      else if (rand < 0.45) type = 'swamp';
      
      map[y][x] = { type, visible: false, explored: false };
    }
  }
  
  return map;
}

// Генерация ресурсов
function generateResources(): ResourceNode[] {
  const resources: ResourceNode[] = [];
  const types = Object.keys(RESOURCE_TYPES) as Array<keyof typeof RESOURCE_TYPES>;
  
  for (let i = 0; i < 30; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    resources.push({
      id: `res-${i}`,
      type,
      x: Math.floor(Math.random() * MAP_WIDTH),
      y: Math.floor(Math.random() * MAP_HEIGHT),
      production: RESOURCE_TYPES[type].production,
    });
  }
  
  return resources;
}

// Генерация монстров
function generateMonsters(): Monster[] {
  const monsters: Monster[] = [];
  
  for (let i = 0; i < 20; i++) {
    const type = MONSTER_TYPES[Math.floor(Math.random() * MONSTER_TYPES.length)];
    const multiplier = 0.5 + Math.random();
    
    monsters.push({
      id: `mob-${i}`,
      name: type.name,
      emoji: type.emoji,
      x: Math.floor(Math.random() * MAP_WIDTH),
      y: Math.floor(Math.random() * MAP_HEIGHT),
      power: Math.floor(type.powerBase * multiplier),
      reward: {
        gold: Math.floor(type.rewardBase * multiplier),
        xp: Math.floor(type.rewardBase * multiplier * 0.5),
      },
    });
  }
  
  return monsters;
}

// Открытие области карты
const revealArea = (mapData: MapCell[][], cx: number, cy: number, radius: number) => {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        mapData[y][x].visible = true;
        mapData[y][x].explored = true;
      } else if (mapData[y][x].explored) {
        mapData[y][x].visible = false;
      }
    }
  }
};

// Компонент гекса
function HexCell({ 
  cell, x, y, size, isPlayerHere, isEnemyHere, playerColor, 
  resource, monster, isSelected, onClick 
}: {
  cell: MapCell;
  x: number;
  y: number;
  size: number;
  isPlayerHere: boolean;
  isEnemyHere: boolean;
  playerColor?: string;
  resource?: ResourceNode;
  monster?: Monster;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hexWidth = size * 1.73;
  const hexHeight = size * 2;
  const offsetX = (y % 2) * (hexWidth / 2);
  
  // Координаты центра гекса
  const centerX = x * hexWidth + offsetX + hexWidth / 2;
  const centerY = y * (hexHeight * 0.75) + hexHeight / 2;
  
  // Точки гекса
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push([
      centerX + size * Math.cos(angle),
      centerY + size * Math.sin(angle),
    ]);
  }
  const pointsStr = points.map(p => p.join(',')).join(' ');
  
  const isWalkable = cell.type !== 'water' && cell.type !== 'mountain' && cell.type !== 'lava';
  
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Гекс */}
      <polygon
        points={pointsStr}
        fill={CELL_COLORS[cell.type]}
        stroke={isSelected ? '#ffd700' : cell.explored ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)'}
        strokeWidth={isSelected ? 3 : 1}
        opacity={cell.explored ? 1 : 0.3}
      />
      
      {/* Иконка клетки */}
      {cell.explored && !isPlayerHere && !isEnemyHere && !resource && !monster && (
        <text
          x={centerX}
          y={centerY + 5}
          textAnchor="middle"
          fontSize={size * 0.4}
          opacity={0.5}
        >
          {CELL_EMOJI[cell.type]}
        </text>
      )}
      
      {/* Ресурс */}
      {resource && (
        <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize={size * 0.5}>
          {RESOURCE_TYPES[resource.type].emoji}
        </text>
      )}
      
      {/* Монстр */}
      {monster && (
        <g>
          <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize={size * 0.5}>
            {monster.emoji}
          </text>
          <text x={centerX} y={centerY + size * 0.6} textAnchor="middle" fontSize={size * 0.2} fill="#ef4444">
            ⚔️{monster.power}
          </text>
        </g>
      )}
      
      {/* Игрок */}
      {isPlayerHere && (
        <g>
          <circle cx={centerX} cy={centerY} r={size * 0.35} fill={playerColor} opacity={0.8} />
          <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize={size * 0.5}>
            🏰
          </text>
        </g>
      )}
      
      {/* Враг */}
      {isEnemyHere && (
        <g>
          <circle cx={centerX} cy={centerY} r={size * 0.3} fill="#dc2626" opacity={0.6} />
          <text x={centerX} y={centerY + 4} textAnchor="middle" fontSize={size * 0.4}>
            👤
          </text>
        </g>
      )}
    </g>
  );
}

// Музыка
function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const toggleMusic = useCallback(() => {
    if (!isPlaying) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      [130.81, 164.81, 196.00, 246.94].forEach((freq) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.012;
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        oscillatorsRef.current.push(osc);
      });
      setIsPlaying(true);
    } else {
      oscillatorsRef.current.forEach(osc => { try { osc.stop(); } catch {} });
      oscillatorsRef.current = [];
      audioContextRef.current?.close();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  return (
    <button className="music-btn" onClick={toggleMusic}>
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}

export default function FortressPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Карта
  const [map, setMap] = useState<MapCell[][]>([]);
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  
  // UI
  const [activeTab, setActiveTab] = useState('map');
  const [selectedCell, setSelectedCell] = useState<{x: number, y: number} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Модальные окна
  const [showBattle, setShowBattle] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Monster | ResourceNode | Player | null>(null);

  // Загрузка пользователя
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('chatchain_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(user.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserName(user.nickname);
    } else {
      router.push('/');
    }
  }, [router]);

  // Инициализация карты
  useEffect(() => {
    if (!userId || !userName) return;
    
    // Генерируем карту
    const newMap = generateMap();
    const newResources = generateResources();
    const newMonsters = generateMonsters();
    
    // Создаём игрока
    const startX = Math.floor(MAP_WIDTH / 2);
    const startY = Math.floor(MAP_HEIGHT / 2);
    
    const player: Player = {
      id: userId,
      name: userName,
      race: 'human',
      raceEmoji: '👤',
      x: startX,
      y: startY,
      armyPower: 100,
      color: RACE_COLORS.human,
      resources: { gold: 500, stone: 200, wood: 200, iron: 100, food: 300, mana: 50 },
      movementPoints: 10,
      maxMovement: 10,
      lastUpdate: new Date().toISOString(),
    };
    
    // Открываем область вокруг игрока
    revealArea(newMap, startX, startY, 3);
    newMap[startY][startX].explored = true;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMap(newMap);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResources(newResources);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonsters(newMonsters);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPlayer(player);
    setLoading(false);
  }, [userId, userName]);

  // Движение игрока
  const movePlayer = (targetX: number, targetY: number) => {
    if (!currentPlayer || currentPlayer.movementPoints <= 0) return;
    
    const cell = map[targetY]?.[targetX];
    if (!cell || cell.type === 'water' || cell.type === 'mountain') return;
    
    const distance = Math.sqrt((targetX - currentPlayer.x) ** 2 + (targetY - currentPlayer.y) ** 2);
    if (distance > 3) return; // Максимальная дальность хода
    
    const newMovement = currentPlayer.movementPoints - 1;
    
    setCurrentPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, x: targetX, y: targetY, movementPoints: newMovement };
    });
    
    // Открываем новую область
    setMap(prev => {
      const newMap = prev.map(row => row.map(cell => ({ ...cell })));
      revealArea(newMap, targetX, targetY, 3);
      return newMap;
    });
    
    setSelectedCell({ x: targetX, y: targetY });
  };

  // Атака монстра
  const attackMonster = (monster: Monster) => {
    if (!currentPlayer) return;
    
    const won = currentPlayer.armyPower > monster.power * (0.7 + Math.random() * 0.3);
    const losses = won ? Math.floor(currentPlayer.armyPower * 0.1 * Math.random()) : Math.floor(currentPlayer.armyPower * 0.5);
    
    if (won) {
      setCurrentPlayer(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          armyPower: prev.armyPower - losses,
          resources: {
            ...prev.resources,
            gold: prev.resources.gold + monster.reward.gold,
          },
        };
      });
      setMonsters(prev => prev.filter(m => m.id !== monster.id));
    } else {
      setCurrentPlayer(prev => {
        if (!prev) return prev;
        return { ...prev, armyPower: Math.max(10, prev.armyPower - losses) };
      });
    }
    
    setBattleResult({
      won,
      losses,
      loot: won ? { gold: monster.reward.gold } : {},
      message: won ? `Победа над ${monster.name}!` : `${monster.name} победил...`,
    });
    setShowBattle(true);
    setSelectedTarget(null);
  };

  // Захват ресурса
  const captureResource = (resource: ResourceNode) => {
    if (!currentPlayer) return;
    
    setResources(prev => prev.map(r => 
      r.id === resource.id ? { ...r, owner: userId } : r
    ));
    setSelectedTarget(null);
  };

  // Следующий ход
  const nextTurn = () => {
    if (!currentPlayer) return;
    
    // Восстанавливаем очки движения
    setCurrentPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, movementPoints: prev.maxMovement };
    });
    
    // Начисляем ресурсы с захваченных точек
    resources.filter(r => r.owner === userId).forEach(resource => {
      setCurrentPlayer(prev => {
        if (!prev) return prev;
        const newResources = { ...prev.resources };
        Object.entries(resource.production).forEach(([key, value]) => {
          newResources[key] = (newResources[key] || 0) + value;
        });
        return { ...prev, resources: newResources };
      });
    });
  };

  // Форматирование чисел
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  // Проверка выбора расы
  const [showRaceSelect, setShowRaceSelect] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const storedRace = localStorage.getItem('chatchain_fortress_race');
    if (storedRace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRace(storedRace);
    } else {
      setShowRaceSelect(true);
    }
  }, [userId]);

  const selectRace = (raceId: string) => {
    setRace(raceId);
    localStorage.setItem('chatchain_fortress_race', raceId);
    setShowRaceSelect(false);
  };

  // Выбор расы
  if (showRaceSelect) {
    return (
      <div className="fortress-page race-select">
        <h1>🏰 Выберите расу</h1>
        <div className="race-grid">
          {Object.entries(RACE_EMOJIS).map(([id, emoji]) => (
            <div key={id} className="race-card" onClick={() => selectRace(id)}>
              <span className="race-emoji">{emoji}</span>
              <span className="race-name">{id.charAt(0).toUpperCase() + id.slice(1)}</span>
            </div>
          ))}
        </div>
        <Styles />
      </div>
    );
  }

  // Загрузка
  if (loading || !currentPlayer) {
    return (
      <div className="fortress-page loading">
        <Castle className="w-16 h-16 animate-pulse" style={{ color: RACE_COLORS[race] || '#4a90d9' }} />
        <p>Загрузка мира...</p>
        <Styles />
      </div>
    );
  }

  const playerColor = RACE_COLORS[race] || RACE_COLORS.human;

  // Получаем объекты на выбранной клетке
  const getCellObjects = (x: number, y: number) => {
    const resource = resources.find(r => r.x === x && r.y === y);
    const monster = monsters.find(m => m.x === x && m.y === y);
    return { resource, monster };
  };

  return (
    <div className="fortress-page">
      <BackgroundMusic />
      
      {/* Шапка */}
      <header className="fortress-header">
        <div className="header-left">
          <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft size={16} /> Чат</Button></Link>
          <div className="player-info">
            <span className="race-icon">{RACE_EMOJIS[race]}</span>
            <div>
              <h1>{userName}</h1>
              <span>⚔️ {formatNumber(currentPlayer.armyPower)} • 👣 {currentPlayer.movementPoints}/{currentPlayer.maxMovement}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <Button size="sm" onClick={nextTurn} style={{ background: '#22c55e' }}>
            ⏭️ След. ход
          </Button>
        </div>
      </header>

      {/* Ресурсы */}
      <div className="resources-bar">
        {['gold', 'stone', 'wood', 'iron', 'food', 'mana'].map(res => (
          <div key={res} className="resource-item">
            <span>{res === 'gold' ? '💰' : res === 'stone' ? '🪨' : res === 'wood' ? '🪵' : res === 'iron' ? '⚙️' : res === 'food' ? '🍖' : '🔮'}</span>
            <span>{formatNumber(currentPlayer.resources[res] || 0)}</span>
          </div>
        ))}
      </div>

      {/* Контент */}
      <div className="main-content">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="main-tabs">
            <TabsTrigger value="map">🗺️ Карта</TabsTrigger>
            <TabsTrigger value="castle">🏰 Замок</TabsTrigger>
            <TabsTrigger value="stats">📊 Стата</TabsTrigger>
          </TabsList>

          {/* Карта */}
          <TabsContent value="map">
            <div className="map-container">
              {/* Панель инструментов */}
              <div className="map-toolbar">
                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
                  <ZoomIn size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
                  <ZoomOut size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
                  <Move size={16} />
                </Button>
              </div>

              {/* SVG карта */}
              <div 
                className="map-viewport"
                onMouseDown={e => { setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }}
                onMouseMove={e => { if (isDragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                <svg 
                  width="100%" 
                  height="100%"
                  style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  {map.map((row, y) => 
                    row.map((cell, x) => {
                      const { resource, monster } = getCellObjects(x, y);
                      const isPlayerHere = currentPlayer.x === x && currentPlayer.y === y;
                      const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                      
                      return (
                        <HexCell
                          key={`${x}-${y}`}
                          cell={cell}
                          x={x}
                          y={y}
                          size={HEX_SIZE}
                          isPlayerHere={isPlayerHere}
                          isEnemyHere={false}
                          playerColor={playerColor}
                          resource={resource}
                          monster={monster}
                          isSelected={isSelected}
                          onClick={() => {
                            if (!isPlayerHere) {
                              movePlayer(x, y);
                            }
                            if (monster && Math.abs(x - currentPlayer.x) <= 1 && Math.abs(y - currentPlayer.y) <= 1) {
                              setSelectedTarget(monster);
                            }
                            if (resource && Math.abs(x - currentPlayer.x) <= 1 && Math.abs(y - currentPlayer.y) <= 1) {
                              setSelectedTarget(resource);
                            }
                          }}
                        />
                      );
                    })
                  )}
                </svg>
              </div>

              {/* Мини-карта */}
              <div className="minimap">
                {map.map((row, y) => (
                  <div key={y} className="minimap-row">
                    {row.map((cell, x) => (
                      <div
                        key={x}
                        className={`minimap-cell ${currentPlayer.x === x && currentPlayer.y === y ? 'player' : ''}`}
                        style={{ background: cell.explored ? CELL_COLORS[cell.type] : '#1a1a1a' }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Замок */}
          <TabsContent value="castle">
            <div className="castle-content">
              <h2>🏰 Ваш замок</h2>
              <p>Уровень: 1</p>
              <p>Армия: ⚔️ {formatNumber(currentPlayer.armyPower)}</p>
              <div className="building-list">
                <div className="building-card">
                  <span className="building-icon">⚔️</span>
                  <span>Казарма</span>
                  <Badge>Ур. 1</Badge>
                </div>
                <div className="building-card">
                  <span className="building-icon">🌾</span>
                  <span>Ферма</span>
                  <Badge>Ур. 1</Badge>
                </div>
                <div className="building-card">
                  <span className="building-icon">⛏️</span>
                  <span>Шахта</span>
                  <Badge>Ур. 1</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Стата */}
          <TabsContent value="stats">
            <div className="stats-content">
              <div className="stat-card">
                <h3>⚔️ Армия</h3>
                <p>Сила: {formatNumber(currentPlayer.armyPower)}</p>
                <p>Побед: 0</p>
                <p>Поражений: 0</p>
              </div>
              <div className="stat-card">
                <h3>🗺️ Исследование</h3>
                <p>Открыто клеток: {map.flat().filter(c => c.explored).length}</p>
                <p>Захвачено ресурсов: {resources.filter(r => r.owner === userId).length}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Диалог цели */}
      {selectedTarget && (
        <div className="target-modal" onClick={() => setSelectedTarget(null)}>
          <div className="target-content" onClick={e => e.stopPropagation()}>
            {'power' in selectedTarget ? (
              <>
                <h3>{selectedTarget.emoji} {selectedTarget.name}</h3>
                <p>Сила: ⚔️ {selectedTarget.power}</p>
                <p>Награда: 💰 {selectedTarget.reward.gold} | ✨ {selectedTarget.reward.xp} XP</p>
                <div className="target-actions">
                  <Button variant="outline" onClick={() => setSelectedTarget(null)}>Отмена</Button>
                  <Button style={{ background: '#dc2626' }} onClick={() => attackMonster(selectedTarget as Monster)}>
                    ⚔️ Атаковать!
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3>{RESOURCE_TYPES[(selectedTarget as ResourceNode).type].emoji} {RESOURCE_TYPES[(selectedTarget as ResourceNode).type].name}</h3>
                <p>Производство:</p>
                {Object.entries((selectedTarget as ResourceNode).production).map(([res, val]) => (
                  <p key={res}>+{val} {res}/ход</p>
                ))}
                <div className="target-actions">
                  <Button variant="outline" onClick={() => setSelectedTarget(null)}>Отмена</Button>
                  <Button style={{ background: '#22c55e' }} onClick={() => captureResource(selectedTarget as ResourceNode)}>
                    🏴 Захватить!
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Результат боя */}
      {showBattle && battleResult && (
        <div className="battle-result" onClick={() => { setShowBattle(false); setBattleResult(null); }}>
          <div className="result-content">
            <div className={`result-icon ${battleResult.won ? 'win' : 'lose'}`}>
              {battleResult.won ? '🏆' : '💀'}
            </div>
            <h3>{battleResult.message}</h3>
            {battleResult.won && (
              <p className="loot">+{formatNumber(battleResult.loot.gold || 0)} 💰</p>
            )}
            <p>Потери: -{battleResult.losses} ⚔️</p>
            <Button onClick={() => { setShowBattle(false); setBattleResult(null); }}>Продолжить</Button>
          </div>
        </div>
      )}

      <Styles />
    </div>
  );
}

// Стили
function Styles() {
  return (
    <style jsx global>{`
      .fortress-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
        color: #ffffff;
      }

      .fortress-page.loading, .fortress-page.race-select {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .race-select h1 {
        font-size: 32px;
        margin-bottom: 20px;
      }

      .race-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        max-width: 600px;
      }

      .race-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }

      .race-card:hover {
        transform: translateY(-5px);
        border-color: #4a90d9;
      }

      .race-emoji {
        font-size: 36px;
        display: block;
        margin-bottom: 8px;
      }

      .race-name {
        font-size: 14px;
        text-transform: capitalize;
      }

      /* Header */
      .fortress-header {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .player-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .race-icon {
        font-size: 28px;
      }

      .player-info h1 {
        font-size: 14px;
        font-weight: 700;
      }

      .player-info span {
        font-size: 11px;
        opacity: 0.7;
      }

      /* Resources */
      .resources-bar {
        background: rgba(0, 0, 0, 0.4);
        padding: 8px 16px;
        display: flex;
        justify-content: center;
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .resource-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }

      /* Main Content */
      .main-content {
        height: calc(100vh - 120px);
        overflow: hidden;
      }

      .main-tabs {
        background: rgba(255, 255, 255, 0.05);
        margin: 8px;
        border-radius: 8px;
      }

      .main-tabs button {
        color: rgba(255, 255, 255, 0.6);
      }

      .main-tabs button[data-state="active"] {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* Map Container */
      .map-container {
        position: relative;
        height: calc(100vh - 200px);
        background: #0a0a0a;
        overflow: hidden;
      }

      .map-toolbar {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
        display: flex;
        gap: 8px;
      }

      .map-viewport {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .map-viewport svg {
        width: 100%;
        height: 100%;
      }

      /* Minimap */
      .minimap {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px;
        z-index: 10;
      }

      .minimap-row {
        display: flex;
        gap: 1px;
      }

      .minimap-cell {
        width: 6px;
        height: 6px;
        border-radius: 1px;
      }

      .minimap-cell.player {
        background: #4a90d9 !important;
      }

      /* Castle & Stats */
      .castle-content, .stats-content {
        padding: 20px;
      }

      .building-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .building-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }

      .building-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .stat-card h3 {
        margin-bottom: 12px;
      }

      /* Modals */
      .target-modal, .battle-result {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }

      .target-content, .result-content {
        background: #1a1a2e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px;
        min-width: 280px;
        text-align: center;
      }

      .target-content h3, .result-content h3 {
        font-size: 20px;
        margin-bottom: 16px;
      }

      .target-content p {
        margin-bottom: 8px;
      }

      .target-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;
      }

      .result-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      .result-icon.win {
        animation: bounce 0.5s ease;
      }

      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }

      .loot {
        font-size: 18px;
        color: #fbbf24;
        margin-bottom: 8px;
      }

      /* Music Button */
      .music-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .race-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .resources-bar {
          flex-wrap: wrap;
          gap: 8px;
        }

        .minimap {
          display: none;
        }
      }
    `}</style>
  );
}
