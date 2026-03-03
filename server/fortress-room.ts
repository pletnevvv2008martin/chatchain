import { Room, Client } from "colyseus";
import fs from 'fs';
import path from 'path';
import {
  FortressState, Player, Hero, Army, MapNode, Resources, GameStats,
  CastleTerritory, GameMap, Teleport,
  RACE_COLORS, RACE_BONUSES, RACE_EMOJIS, NODE_CONFIG,
  RaceId, NodeType
} from "./fortress-schema";
import { FANTASY_MAPS, getMapTemplate, MapTemplate } from "./fortress-maps";

// ============================================
// СООБЩЕНИЯ
// ============================================

interface MoveHeroMessage { heroId: string; targetNodeId: string; }
interface AttackNodeMessage { heroId: string; targetNodeId: string; }
interface CaptureNodeMessage { heroId: string; targetNodeId: string; }
interface RecruitMessage { unitType: string; count: number; }
interface UseTeleportMessage { heroId: string; teleportId: string; }
interface ChangeMapMessage { obeliskId: string; targetMapId: string; }

// ============================================
// ИГРОВАЯ КОМНАТА
// ============================================

export class FortressRoom extends Room<FortressState> {
  maxClients = 500; // Общий лимит
  autoDispose = false;
  
  // Лимиты на каждую карту
  mapLimits: Record<string, number> = {};
  
  resourceInterval?: ReturnType<typeof setInterval>;
  saveInterval?: ReturnType<typeof setInterval>;
  turnInterval?: ReturnType<typeof setInterval>;

  async onCreate() {
    console.log("🏰 Fortress Room created!");
    
    this.setState(new FortressState());
    
    // Инициализируем лимиты карт
    FANTASY_MAPS.forEach(map => {
      this.mapLimits[map.id] = 50; // 50 игроков на карту
    });
    
    // Генерируем все 10 карт
    await this.generateAllMaps();
    
    this.state.gamePhase = "playing";
    
    // Загружаем существующих игроков
    await this.loadPlayers();
    
    // ============================================
    // ОБРАБОТЧИКИ СООБЩЕНИЙ
    // ============================================
    
    this.onMessage("select_race", (client, raceId: RaceId) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !RACE_COLORS[raceId]) return;
      
      player.race = raceId;
      player.color = RACE_COLORS[raceId];
      
      const bonus = RACE_BONUSES[raceId];
      player.resources.gold = Math.floor(player.resources.gold * bonus.economy);
      
      this.broadcastSystemMessage(`👤 ${player.name} выбрал расу ${RACE_EMOJIS[raceId]} ${raceId}`);
    });
    
    this.onMessage("move_hero", (client, msg: MoveHeroMessage) => {
      this.handleMoveHero(client, msg);
    });
    
    this.onMessage("attack_node", (client, msg: AttackNodeMessage) => {
      this.handleAttackNode(client, msg);
    });
    
    this.onMessage("capture_node", (client, msg: CaptureNodeMessage) => {
      this.handleCaptureNode(client, msg);
    });
    
    this.onMessage("recruit", (client, msg: RecruitMessage) => {
      this.handleRecruit(client, msg);
    });
    
    this.onMessage("build", (client, msg: { buildingType: string }) => {
      this.handleBuild(client, msg.buildingType);
    });
    
    this.onMessage("use_teleport", (client, msg: UseTeleportMessage) => {
      this.handleUseTeleport(client, msg);
    });
    
    this.onMessage("change_map", (client, msg: ChangeMapMessage) => {
      this.handleChangeMap(client, msg);
    });
    
    this.onMessage("end_turn", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      player.heroes.forEach(hero => {
        hero.movementPoints = hero.maxMovement;
      });
      
      this.broadcastSystemMessage(`⏭️ ${player.name} закончил ход`);
    });
    
    this.onMessage("chat", (client, msg: { content: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !msg.content.trim()) return;
      
      this.broadcastSystemMessage(`💬 ${player.name}: ${msg.content}`);
    });
    
    // ============================================
    // ПЕРИОДИЧЕСКИЕ ЗАДАЧИ
    // ============================================
    
    this.resourceInterval = setInterval(() => this.updateResources(), 10000);
    this.saveInterval = setInterval(() => this.savePlayers(), 30000);
    this.turnInterval = setInterval(() => {
      this.state.turn++;
      this.state.lastUpdate = Date.now();
      
      this.state.players.forEach(player => {
        player.heroes.forEach(hero => {
          hero.movementPoints = hero.maxMovement;
        });
        player.stats.fortress.totalGames++;
        player.stats.fortress.playTime += 1;
      });
      
      this.broadcastSystemMessage(`🔄 Ход ${this.state.turn} начался!`);
    }, 60000);
  }

  // ============================================
  // ГЕНЕРАЦИЯ КАРТ
  // ============================================
  
  async generateAllMaps() {
    for (const mapTemplate of FANTASY_MAPS) {
      const gameMap = new GameMap();
      gameMap.id = mapTemplate.id;
      gameMap.name = mapTemplate.name;
      gameMap.theme = mapTemplate.theme;
      gameMap.maxPlayers = 50;
      
      // Генерируем узлы карты
      const nodes = this.generateMapNodes(mapTemplate);
      nodes.forEach(node => gameMap.nodes.set(node.id, node));
      
      // Добавляем телепорты и обелиски
      this.addTeleportsAndObelisks(gameMap, mapTemplate);
      
      this.state.maps.set(mapTemplate.id, gameMap);
      console.log(`🗺️ Карта "${mapTemplate.name}" создана: ${nodes.length} узлов`);
    }
  }
  
  generateMapNodes(mapTemplate: MapTemplate): MapNode[] {
    const nodes: MapNode[] = [];
    const gridSize = 8; // 8x8 = 64 узла
    const spacing = 100;
    let nodeId = 0;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const id = `${mapTemplate.id}_node_${nodeId}`;
        const x = 80 + col * spacing + (row % 2) * (spacing / 2);
        const y = 80 + row * (spacing * 0.866);
        
        // Определяем тип узла
        let type: NodeType;
        const rand = Math.random();
        
        if (rand < 0.15) type = 'gold_mine';
        else if (rand < 0.22) type = 'monster_lair';
        else if (rand < 0.30) type = 'town';
        else if (rand < 0.42) type = 'village';
        else if (rand < 0.52) type = 'lumber_mill';
        else if (rand < 0.62) type = 'stone_quarry';
        else if (rand < 0.72) type = 'farm';
        else if (rand < 0.82) type = 'iron_mine';
        else type = 'mana_well';
        
        const config = NODE_CONFIG[type];
        
        const node = new MapNode();
        node.id = id;
        node.type = type;
        node.name = config.name;
        node.x = x;
        node.y = y;
        node.defense = config.baseDefense;
        node.goldReward = config.goldReward || 0;
        node.monsterPower = config.monsterPower ? 
          Math.floor(config.monsterPower * mapTemplate.resources.gold || 1) : 0;
        node.terrain = mapTemplate.terrain[Math.floor(Math.random() * mapTemplate.terrain.length)];
        
        nodes.push(node);
        nodeId++;
      }
    }
    
    // Создаём связи между узлами
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      // Связь справа
      if (col < gridSize - 1) {
        const rightIdx = i + 1;
        node.connections.push(nodes[rightIdx].id);
        nodes[rightIdx].connections.push(node.id);
      }
      
      // Диагональные связи
      if (row < gridSize - 1) {
        if (row % 2 === 0) {
          if (col > 0) {
            const downLeftIdx = i + gridSize - 1;
            node.connections.push(nodes[downLeftIdx].id);
            nodes[downLeftIdx].connections.push(node.id);
          }
          const downRightIdx = i + gridSize;
          node.connections.push(nodes[downRightIdx].id);
          nodes[downRightIdx].connections.push(node.id);
        } else {
          const downLeftIdx = i + gridSize;
          node.connections.push(nodes[downLeftIdx].id);
          nodes[downLeftIdx].connections.push(node.id);
          
          if (col < gridSize - 1) {
            const downRightIdx = i + gridSize + 1;
            node.connections.push(nodes[downRightIdx].id);
            nodes[downRightIdx].connections.push(node.id);
          }
        }
      }
    }
    
    return nodes;
  }
  
  addTeleportsAndObelisks(gameMap: GameMap, mapTemplate: MapTemplate) {
    // Добавляем 2-3 телепорта на карту
    const nodeCount = gameMap.nodes.size;
    const teleportCount = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < teleportCount; i++) {
      const teleport = new Teleport();
      teleport.id = `${gameMap.id}_teleport_${i}`;
      teleport.name = `🌀 Телепорт ${i + 1}`;
      teleport.type = "teleport";
      teleport.x = 100 + Math.random() * 600;
      teleport.y = 100 + Math.random() * 400;
      teleport.cost = 50 + Math.floor(Math.random() * 100);
      
      gameMap.teleports.set(teleport.id, teleport);
    }
    
    // Добавляем 1 обелиск для перехода между картами
    const obelisk = new Teleport();
    obelisk.id = `${gameMap.id}_obelisk`;
    obelisk.name = "🗼 Обелиск Перемещения";
    obelisk.type = "obelisk";
    obelisk.x = 400;
    obelisk.y = 300;
    obelisk.cost = 100; // 100 маны для перехода
    
    gameMap.teleports.set(obelisk.id, obelisk);
  }

  // ============================================
  // ПОДКЛЮЧЕНИЕ ИГРОКА
  // ============================================
  
  async onJoin(client: Client, options: any) {
    const safeOptions = options || {};
    const userName = safeOptions.name || `Player_${client.sessionId.slice(0, 4)}`;
    const userId = safeOptions.userId || client.sessionId;
    const isRegistered = safeOptions.isRegistered || false;
    
    // Гости могут только наблюдать
    if (!isRegistered) {
      console.log(`👁️ Гость ${userName} присоединился (только наблюдение)`);
      client.send("error", { message: "Гости могут только наблюдать. Зарегистрируйтесь для игры!" });
      return;
    }
    
    // Проверяем лимит на выбранную карту
    const preferredMap = safeOptions.mapId || "green_valley";
    const currentPlayers = this.getMapPlayerCount(preferredMap);
    if (currentPlayers >= this.mapLimits[preferredMap]) {
      // Ищем свободную карту
      const freeMap = this.findFreeMap();
      if (!freeMap) {
        client.send("error", { message: "Все карты заполнены! Попробуйте позже." });
        return;
      }
      client.send("redirect_map", { mapId: freeMap });
    }
    
    let player = this.state.players.get(client.sessionId);
    
    if (player) {
      player.online = true;
      player.lastActive = Date.now();
      console.log(`✅ Player ${userName} reconnected`);
    } else {
      player = this.createPlayer(userId, userName, client.sessionId, preferredMap);
      this.state.players.set(client.sessionId, player);
      console.log(`✅ New player ${userName} created on map ${preferredMap}`);
    }

    client.send("state_sync", {
      playerId: client.sessionId,
      turn: this.state.turn,
      gamePhase: this.state.gamePhase,
      currentMap: player.currentMapId
    });

    this.broadcastSystemMessage(`👤 ${userName} присоединился к игре`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.online = false;
      player.lastActive = Date.now();
      this.broadcastSystemMessage(`👤 ${player.name} покинул игру`);
    }
  }

  onDispose() {
    console.log("🏰 Fortress Room disposed");
    this.savePlayers();
    if (this.resourceInterval) clearInterval(this.resourceInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    if (this.turnInterval) clearInterval(this.turnInterval);
  }

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================
  
  getMapPlayerCount(mapId: string): number {
    let count = 0;
    this.state.players.forEach(player => {
      if (player.currentMapId === mapId && player.online) count++;
    });
    return count;
  }
  
  findFreeMap(): string | null {
    for (const mapId of Object.keys(this.mapLimits)) {
      if (this.getMapPlayerCount(mapId) < this.mapLimits[mapId]) {
        return mapId;
      }
    }
    return null;
  }
  
  createPlayer(userId: string, userName: string, sessionId: string, mapId: string): Player {
    const player = new Player();
    player.id = userId;
    player.name = userName;
    player.race = 'human';
    player.color = RACE_COLORS.human;
    player.online = true;
    player.lastActive = Date.now();
    player.isRegistered = true;
    player.currentMapId = mapId;
    
    // Находим случайное место на карте для замка
    const gameMap = this.state.maps.get(mapId);
    if (gameMap) {
      const freeNode = this.findFreeNodeForCastle(gameMap);
      if (freeNode) {
        freeNode.type = 'castle';
        freeNode.name = `${userName}'s Castle`;
        freeNode.ownerId = sessionId;
        freeNode.ownerName = userName;
        freeNode.garrison = 50;
        freeNode.defense = NODE_CONFIG.castle.baseDefense;
        
        player.castleNodeId = freeNode.id;
        player.territory.centerX = freeNode.x;
        player.territory.centerY = freeNode.y;
        player.territory.radius = 50;
        
        // Добавляем соседние узлы в территорию
        freeNode.connections.forEach(connId => {
          const connNode = gameMap.nodes.get(connId);
          if (connNode) {
            connNode.isTerritory = true;
            player.territory.ownedNodes.push(connId);
          }
        });
      }
    }
    
    // Создаём героя
    const hero = new Hero();
    hero.id = `hero_${sessionId}_1`;
    hero.name = `${userName}'s Hero`;
    hero.currentNodeId = player.castleNodeId;
    hero.x = player.territory.centerX;
    hero.y = player.territory.centerY;
    hero.army = new Army();
    
    player.heroes.set(hero.id, hero);
    
    return player;
  }
  
  findFreeNodeForCastle(gameMap: GameMap): MapNode | null {
    const edgeNodes: MapNode[] = [];
    
    gameMap.nodes.forEach(node => {
      if (node.type === 'village' && !node.ownerId && node.connections.length <= 3) {
        edgeNodes.push(node);
      }
    });
    
    if (edgeNodes.length > 0) {
      return edgeNodes[Math.floor(Math.random() * edgeNodes.length)];
    }
    
    // Fallback: любой свободный узел
    const freeNodes: MapNode[] = [];
    gameMap.nodes.forEach(node => {
      if (!node.ownerId && node.type !== 'castle' && node.type !== 'monster_lair') {
        freeNodes.push(node);
      }
    });
    
    return freeNodes.length > 0 ? freeNodes[Math.floor(Math.random() * freeNodes.length)] : null;
  }

  // ============================================
  // ОБРАБОТКА ДЕЙСТВИЙ
  // ============================================
  
  handleMoveHero(client: Client, msg: MoveHeroMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    const hero = player.heroes.get(msg.heroId);
    if (!hero || hero.movementPoints <= 0) return;
    
    const gameMap = this.state.maps.get(player.currentMapId);
    if (!gameMap) return;
    
    const currentNode = gameMap.nodes.get(hero.currentNodeId);
    const targetNode = gameMap.nodes.get(msg.targetNodeId);
    
    if (!currentNode || !targetNode) return;
    
    if (!currentNode.connections.includes(msg.targetNodeId)) {
      client.send("error", { message: "Узлы не связаны!" });
      return;
    }
    
    if (targetNode.ownerId && targetNode.ownerId !== client.sessionId && targetNode.garrison > 0) {
      client.send("error", { message: "Узел занят врагом! Сначала атакуйте." });
      return;
    }
    
    if (targetNode.monsterPower > 0) {
      client.send("error", { message: "В узле монстры! Сначала атакуйте." });
      return;
    }
    
    hero.currentNodeId = msg.targetNodeId;
    hero.x = targetNode.x;
    hero.y = targetNode.y;
    hero.movementPoints--;
    
    this.broadcastSystemMessage(`🚶 ${player.name} переместился к "${targetNode.name}"`);
  }
  
  handleAttackNode(client: Client, msg: AttackNodeMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    const hero = player.heroes.get(msg.heroId);
    if (!hero) return;
    
    const gameMap = this.state.maps.get(player.currentMapId);
    if (!gameMap) return;
    
    const targetNode = gameMap.nodes.get(msg.targetNodeId);
    if (!targetNode) return;
    
    const mapTemplate = getMapTemplate(player.currentMapId);
    const resourceBonus = mapTemplate?.resources.gold || 1;
    
    // Атака монстров
    if (targetNode.monsterPower > 0) {
      const heroPower = hero.army.totalPower * (1 + hero.level * 0.1);
      const winChance = heroPower / (heroPower + targetNode.monsterPower);
      const won = Math.random() < winChance;
      
      if (won) {
        const losses = Math.floor(hero.army.totalPower * 0.15);
        hero.army.totalPower = Math.max(50, hero.army.totalPower - losses);
        hero.experience += targetNode.monsterPower;
        hero.level = Math.floor(hero.experience / 100) + 1;
        
        const goldReward = Math.floor((targetNode.goldReward || 100) * resourceBonus);
        player.resources.gold += goldReward;
        player.score += goldReward;
        player.stats.fortress.wins++;
        player.stats.fortress.score += goldReward;
        
        targetNode.monsterPower = 0;
        targetNode.goldReward = 0;
        targetNode.type = 'village';
        
        this.broadcastSystemMessage(`⚔️ ${player.name} победил монстров! +${goldReward}💰`);
      } else {
        hero.army.totalPower = Math.max(50, hero.army.totalPower * 0.6);
        player.stats.fortress.losses++;
        this.broadcastSystemMessage(`💀 ${player.name} проиграл монстрам!`);
      }
      return;
    }
    
    // PvP атака
    if (targetNode.ownerId && targetNode.ownerId !== client.sessionId) {
      const defender = this.state.players.get(targetNode.ownerId);
      const defensePower = (targetNode.garrison + targetNode.defense) * 2;
      const heroPower = hero.army.totalPower * (1 + hero.level * 0.1);
      const winChance = heroPower / (heroPower + defensePower);
      const won = Math.random() < winChance;
      
      if (won) {
        hero.army.totalPower = Math.max(50, hero.army.totalPower * 0.75);
        hero.experience += defensePower;
        hero.level = Math.floor(hero.experience / 100) + 1;
        
        targetNode.garrison = 0;
        targetNode.ownerId = '';
        targetNode.ownerName = '';
        targetNode.isTerritory = false;
        
        player.score += 200;
        player.stats.fortress.wins++;
        player.battlesWon++;
        
        if (defender) {
          defender.battlesLost++;
          defender.stats.fortress.losses++;
        }
        
        this.broadcastSystemMessage(`⚔️ ${player.name} захватил "${targetNode.name}"!`);
      } else {
        hero.army.totalPower = Math.max(50, hero.army.totalPower * 0.5);
        player.stats.fortress.losses++;
        this.broadcastSystemMessage(`🛡️ ${player.name} не смог захватить "${targetNode.name}"!`);
      }
    }
  }
  
  handleCaptureNode(client: Client, msg: CaptureNodeMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isRegistered) return;
    
    const hero = player.heroes.get(msg.heroId);
    if (!hero) return;
    
    const gameMap = this.state.maps.get(player.currentMapId);
    if (!gameMap) return;
    
    const targetNode = gameMap.nodes.get(msg.targetNodeId);
    if (!targetNode) return;
    
    if (hero.currentNodeId !== msg.targetNodeId) {
      client.send("error", { message: "Герой должен быть в этом узле!" });
      return;
    }
    
    if (targetNode.ownerId) {
      client.send("error", { message: "Узел уже захвачен!" });
      return;
    }
    
    targetNode.ownerId = client.sessionId;
    targetNode.ownerName = player.name;
    targetNode.garrison = 10;
    targetNode.isTerritory = true;
    
    player.territory.ownedNodes.push(msg.targetNodeId);
    player.score += 50;
    
    this.broadcastSystemMessage(`🏴 ${player.name} захватил "${targetNode.name}"!`);
  }
  
  handleUseTeleport(client: Client, msg: UseTeleportMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isRegistered) return;
    
    const hero = player.heroes.get(msg.heroId);
    if (!hero) return;
    
    const gameMap = this.state.maps.get(player.currentMapId);
    if (!gameMap) return;
    
    const teleport = gameMap.teleports.get(msg.teleportId);
    if (!teleport) return;
    
    // Проверяем ресурсы
    if (player.resources.gold < teleport.cost) {
      client.send("error", { message: "Недостаточно золота!" });
      return;
    }
    
    // Списываем стоимость
    player.resources.gold -= teleport.cost;
    
    // Телепортируем героя
    if (teleport.type === "teleport") {
      // Найти другой телепорт на этой карте
      const otherTeleports = Array.from(gameMap.teleports.values())
        .filter(t => t.id !== teleport.id && t.type === "teleport");
      
      if (otherTeleports.length > 0) {
        const target = otherTeleports[Math.floor(Math.random() * otherTeleports.length)];
        hero.x = target.x;
        hero.y = target.y;
        this.broadcastSystemMessage(`🌀 ${player.name} использовал телепорт!`);
      }
    }
  }
  
  handleChangeMap(client: Client, msg: ChangeMapMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isRegistered) return;
    
    const hero = player.heroes.values().next().value;
    if (!hero) return;
    
    // Проверяем лимит на целевой карте
    if (this.getMapPlayerCount(msg.targetMapId) >= this.mapLimits[msg.targetMapId]) {
      client.send("error", { message: "Карта заполнена!" });
      return;
    }
    
    // Проверяем ману
    if (player.resources.mana < 100) {
      client.send("error", { message: "Недостаточно маны для перехода!" });
      return;
    }
    
    player.resources.mana -= 100;
    player.currentMapId = msg.targetMapId;
    
    // Находим новое место для замка на новой карте
    const newMap = this.state.maps.get(msg.targetMapId);
    if (newMap) {
      const freeNode = this.findFreeNodeForCastle(newMap);
      if (freeNode) {
        freeNode.type = 'castle';
        freeNode.name = `${player.name}'s Castle`;
        freeNode.ownerId = client.sessionId;
        freeNode.ownerName = player.name;
        
        player.castleNodeId = freeNode.id;
        hero.currentNodeId = freeNode.id;
        hero.x = freeNode.x;
        hero.y = freeNode.y;
      }
    }
    
    this.broadcastSystemMessage(`🗼 ${player.name} переместился на другую карту!`);
    client.send("map_changed", { mapId: msg.targetMapId });
  }
  
  handleRecruit(client: Client, msg: RecruitMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isRegistered || msg.count <= 0) return;
    
    const costs: Record<string, { cost: Record<string, number>; power: number }> = {
      warriors: { cost: { gold: 50, food: 20 }, power: 10 },
      archers: { cost: { gold: 75, wood: 30, food: 25 }, power: 15 },
      cavalry: { cost: { gold: 150, food: 50, iron: 20 }, power: 30 },
      mages: { cost: { gold: 200, mana: 30 }, power: 25 },
    };
    
    const unit = costs[msg.unitType];
    if (!unit) return;
    
    for (const [res, amount] of Object.entries(unit.cost)) {
      if ((player.resources as any)[res] < amount * msg.count) {
        client.send("error", { message: `Недостаточно ${res}!` });
        return;
      }
    }
    
    for (const [res, amount] of Object.entries(unit.cost)) {
      (player.resources as any)[res] -= amount * msg.count;
    }
    
    const hero = player.heroes.values().next().value;
    if (hero) {
      (hero.army as any)[msg.unitType] = ((hero.army as any)[msg.unitType] || 0) + msg.count;
      hero.army.totalPower += unit.power * msg.count;
    }
    
    this.broadcastSystemMessage(`⚔️ ${player.name} нанял ${msg.count} ${msg.unitType}`);
  }
  
  handleBuild(client: Client, buildingType: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isRegistered) return;
    
    const buildingCosts: Record<string, { gold: number; stone: number; wood: number }> = {
      barracks: { gold: 200, stone: 100, wood: 50 },
      archery: { gold: 250, stone: 50, wood: 150 },
      stable: { gold: 400, stone: 100, wood: 200 },
      mage_tower: { gold: 500, stone: 300, wood: 100 },
    };
    
    const cost = buildingCosts[buildingType];
    if (!cost) return;
    
    const currentLevel = player.buildings.get(buildingType)?.level || 0;
    const multiplier = currentLevel + 1;
    
    if (player.resources.gold < cost.gold * multiplier ||
        player.resources.stone < cost.stone * multiplier ||
        player.resources.wood < cost.wood * multiplier) {
      client.send("error", { message: "Недостаточно ресурсов!" });
      return;
    }
    
    player.resources.gold -= cost.gold * multiplier;
    player.resources.stone -= cost.stone * multiplier;
    player.resources.wood -= cost.wood * multiplier;
    
    player.buildings.set(buildingType, { level: multiplier } as any);
    player.score += 50 * multiplier;
    
    this.broadcastSystemMessage(`🏗️ ${player.name} построил ${buildingType} ур.${multiplier}!`);
  }

  // ============================================
  // РЕСУРСЫ И СОХРАНЕНИЕ
  // ============================================
  
  updateResources() {
    const mapTemplate = getMapTemplate(this.state.activeMapId);
    
    this.state.players.forEach(player => {
      if (!player.online || !player.isRegistered) return;
      
      const bonus = RACE_BONUSES[player.race].economy;
      
      player.resources.gold += Math.floor(10 * bonus * (mapTemplate?.resources.gold || 1));
      player.resources.food += Math.floor(5 * bonus * (mapTemplate?.resources.food || 1));
      
      const gameMap = this.state.maps.get(player.currentMapId);
      if (gameMap) {
        gameMap.nodes.forEach(node => {
          if (node.ownerId === player.id) {
            const config = NODE_CONFIG[node.type];
            if (config?.production) {
              const { resource, amount } = config.production;
              (player.resources as any)[resource] = 
                ((player.resources as any)[resource] || 0) + Math.floor(amount * bonus * 0.1);
            }
          }
        });
      }
    });
  }
  
  broadcastSystemMessage(content: string) {
    const msg = `system:System:${content}:${Date.now()}:system`;
    if ((this.state.chat as any).push) {
      (this.state.chat as any).push(msg);
    }
    if (this.state.chat.length > 100) {
      (this.state.chat as any).shift();
    }
    this.broadcast("system_message", { content });
  }

  async savePlayers() {
    try {
      const dir = path.join(process.cwd(), 'data', 'fortress');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const data: any = { players: {}, maps: {} };
      
      this.state.players.forEach((p, id) => {
        data.players[id] = {
          id: p.id, name: p.name, race: p.race, color: p.color,
          isRegistered: p.isRegistered,
          currentMapId: p.currentMapId,
          resources: {
            gold: p.resources.gold, stone: p.resources.stone,
            wood: p.resources.wood, iron: p.resources.iron,
            food: p.resources.food, mana: p.resources.mana,
            gems: p.resources.gems, teleportScrolls: p.resources.teleportScrolls
          },
          castleNodeId: p.castleNodeId,
          score: p.score,
          battlesWon: p.battlesWon,
          battlesLost: p.battlesLost,
          stats: {
            fortress: p.stats.fortress,
            mafia: p.stats.mafia,
            duel: p.stats.duel,
            chain: p.stats.chain,
            poker: p.stats.poker
          }
        };
      });
      
      fs.writeFileSync(path.join(dir, 'game_state.json'), JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Save error:', e);
    }
  }
  
  async loadPlayers() {
    const file = path.join(process.cwd(), 'data', 'fortress', 'game_state.json');
    if (!fs.existsSync(file)) return;
    
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      console.log(`🏰 Loaded ${Object.keys(data.players || {}).length} players`);
    } catch (e) {
      console.error('Load error:', e);
    }
  }
}

