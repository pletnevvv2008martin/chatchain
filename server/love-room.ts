import { Room, Client } from "colyseus";
import { LoveRoomState, LovePlayer, LoveMessage, LoveVote, RoundResult, ROUND_CONFIG, RoundType } from "./love-schema";

// ============================================
// LOVE ROOM - Комната игры Любовь
// ============================================

export class LoveRoom extends Room<LoveRoomState> {
  maxClients = 12;
  roundTimer: NodeJS.Timeout | null = null;
  resultsTimer: NodeJS.Timeout | null = null;

  onCreate(options: any) {
    console.log(`💕 LoveRoom created: ${options.roomName || 'Знакомства'}`);
    
    this.setState(new LoveRoomState());
    
    // Настройки комнаты
    this.state.roomId = this.roomId;
    this.state.roomName = options.roomName || "Знакомства";
    this.state.isSandbox = options.isSandbox || false;
    this.state.maxPlayers = options.maxPlayers || 12;
    
    // Обработчики сообщений
    
    // Чат сообщение
    this.onMessage("chat", (client, data: { text: string }) => {
      this.handleChatMessage(client, data.text);
    });
    
    // Голос в раунде
    this.onMessage("vote", (client, data: { targetId: string; action: string }) => {
      this.handleVote(client, data.targetId, data.action);
    });
    
    // Начать раунд
    this.onMessage("start_round", (client) => {
      this.startRound();
    });
    
    // Подарок
    this.onMessage("gift", (client, data: { targetId: string; giftId: string }) => {
      this.handleGift(client, data.targetId, data.giftId);
    });
    
    // Пропустить раунд
    this.onMessage("skip_round", (client) => {
      this.skipRound(client);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`👋 Player joined LoveRoom: ${options.name}`);
    
    const player = new LovePlayer();
    player.id = options.id || client.sessionId;
    player.sessionId = client.sessionId;
    player.name = options.name || "Гость";
    player.age = options.age || 25;
    player.city = options.city || "Москва";
    player.gender = options.gender || "male";
    player.avatar = options.avatar || "👤";
    player.bio = options.bio || "";
    player.rating = options.rating || 1000;
    player.level = options.level || 1;
    player.exp = options.exp || 0;
    player.isVerified = options.isVerified || false;
    player.isRegistered = options.isRegistered || false;
    player.isOnline = true;
    player.joinedAt = Date.now();
    player.lastActive = Date.now();
    
    this.state.players.set(client.sessionId, player);
    this.state.playerCount = this.state.players.size;
    
    // Системное сообщение
    this.addSystemMessage(`${player.name} присоединился к комнате!`);
    
    // Отправляем приветствие клиенту
    client.send("welcome", {
      roomId: this.state.roomId,
      roomName: this.state.roomName,
      playerCount: this.state.playerCount
    });
  }

  onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`👋 Player left LoveRoom: ${player.name}`);
      this.addSystemMessage(`${player.name} покинул комнату`);
      this.state.players.delete(client.sessionId);
      this.state.playerCount = this.state.players.size;
    }
  }

  onDispose() {
    console.log(`💔 LoveRoom disposed: ${this.state.roomName}`);
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
  }

  // ============================================
  // ЧАТ
  // ============================================

  handleChatMessage(client: Client, text: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !text.trim()) return;
    
    player.lastActive = Date.now();
    
    const message = new LoveMessage();
    message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    message.playerId = player.id;
    message.playerName = player.name;
    message.playerAvatar = player.avatar;
    message.text = text.trim();
    message.timestamp = Date.now();
    
    // Сохраняем как JSON строку
    this.state.messages.push(JSON.stringify(message.toJSON()));
    
    // Ограничиваем историю чата
    if (this.state.messages.length > 100) {
      this.state.messages.shift();
    }
    
    // Рассылаем всем
    this.broadcast("message", message.toJSON());
  }

  addSystemMessage(text: string) {
    const message = new LoveMessage();
    message.id = `sys_${Date.now()}`;
    message.playerId = "system";
    message.playerName = "Система";
    message.playerAvatar = "🤖";
    message.text = text;
    message.timestamp = Date.now();
    message.isSystem = true;
    
    this.state.messages.push(JSON.stringify(message.toJSON()));
    this.broadcast("message", message.toJSON());
  }

  // ============================================
  // РАУНДЫ
  // ============================================

  startRound() {
    if (this.state.roundActive || this.state.players.size < 2) {
      this.broadcast("error", { message: "Нужно минимум 2 игрока для раунда" });
      return;
    }
    
    // Выбираем случайный тип раунда
    const roundTypes = ['kiss', 'choose_pair', 'who_likes'];
    const randomType = roundTypes[Math.floor(Math.random() * roundTypes.length)];
    const config = ROUND_CONFIG[randomType as RoundType];
    
    this.state.roundType = randomType as RoundType;
    this.state.roundNumber++;
    this.state.roundDuration = config.duration;
    this.state.roundTimer = config.duration;
    this.state.roundActive = true;
    this.state.showResults = false;
    this.state.votes.clear();
    this.state.voteCount = 0;
    
    this.addSystemMessage(`🎭 Начинается раунд: ${config.icon} ${config.name}!`);
    
    // Запускаем таймер
    this.broadcast("round_start", {
      type: randomType,
      icon: config.icon,
      name: config.name,
      duration: config.duration,
      roundNumber: this.state.roundNumber
    });
    
    this.startRoundTimer();
  }

  startRoundTimer() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    
    this.roundTimer = setInterval(() => {
      this.state.roundTimer--;
      this.broadcast("round_tick", { timer: this.state.roundTimer });
      
      if (this.state.roundTimer <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  endRound() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    
    this.state.roundActive = false;
    
    // Подсчитываем результаты
    const results = this.calculateResults();
    this.state.lastResult = results;
    this.state.showResults = true;
    this.state.totalRounds++;
    
    this.broadcast("round_end", results.toJSON());
    
    // Через 5 секунд скрываем результаты
    this.resultsTimer = setTimeout(() => {
      this.state.showResults = false;
      this.state.roundType = 'waiting';
      this.broadcast("round_reset");
    }, 5000);
  }

  calculateResults(): RoundResult {
    const result = new RoundResult();
    result.type = this.state.roundType;
    result.timestamp = Date.now();
    
    const players = Array.from(this.state.players.values());
    const votes = Array.from(this.state.votes.values());
    
    switch (this.state.roundType) {
      case 'kiss': {
        result.icon = '💋';
        result.title = 'Результаты раунда поцелуя';
        
        const pairs: any[] = [];
        for (let i = 0; i < Math.min(4, players.length - 1); i++) {
          const p1 = players[i];
          const p2 = players[(i + 1) % players.length];
          const playerVotes = votes.filter(v => v.voterId === p1.sessionId && v.targetId === p2.sessionId);
          const action = playerVotes.length > 0 ? playerVotes[0].action : 'skip';
          
          pairs.push({
            player1: { id: p1.id, name: p1.name, avatar: p1.avatar },
            player2: { id: p2.id, name: p2.name, avatar: p2.avatar },
            action: action
          });
          
          // Обновляем статистику
          if (action === 'kiss') {
            p2.kissCount++;
            this.state.totalKisses++;
          } else if (action === 'wink') {
            p2.winkCount++;
            this.state.totalWinks++;
          }
        }
        
        result.data = JSON.stringify({ pairs });
        break;
      }
        
      case 'choose_pair': {
        result.icon = '💑';
        result.title = 'Выбранная пара';
        
        // Подсчитываем голоса за пары
        const pairVotes: Record<string, number> = {};
        votes.forEach(v => {
          const key = v.targetId;
          pairVotes[key] = (pairVotes[key] || 0) + 1;
        });
        
        // Находим победителя
        let maxVotes = 0;
        let winnerId = players[0]?.sessionId || '';
        Object.entries(pairVotes).forEach(([id, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            winnerId = id;
          }
        });
        
        const winner = this.state.players.get(winnerId);
        const partner = players.find(p => p.sessionId !== winnerId);
        
        result.data = JSON.stringify({
          pair: {
            player1: { id: winner?.id, name: winner?.name, avatar: winner?.avatar },
            player2: { id: partner?.id, name: partner?.name, avatar: partner?.avatar }
          },
          votes: maxVotes
        });
        break;
      }
        
      case 'who_likes': {
        result.icon = '❤️';
        result.title = 'Кто больше нравится';
        
        // Подсчитываем лайки
        const likeCount: Record<string, number> = {};
        votes.forEach(v => {
          if (v.action === 'like') {
            likeCount[v.targetId] = (likeCount[v.targetId] || 0) + 1;
          }
        });
        
        // Находим победителя
        let maxLikes = 0;
        let winnerId = players[0]?.sessionId || '';
        Object.entries(likeCount).forEach(([id, count]) => {
          if (count > maxLikes) {
            maxLikes = count;
            winnerId = id;
          }
        });
        
        const winner = this.state.players.get(winnerId);
        if (winner) {
          winner.likeCount += maxLikes;
          this.state.totalLikes += maxLikes;
        }
        
        result.data = JSON.stringify({
          winner: { id: winner?.id, name: winner?.name, avatar: winner?.avatar },
          likes: maxLikes
        });
        break;
      }
    }
    
    return result;
  }

  // ============================================
  // ГОЛОСОВАНИЕ
  // ============================================

  handleVote(client: Client, targetId: string, action: string) {
    if (!this.state.roundActive) return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    player.lastActive = Date.now();
    
    // Создаём или обновляем голос
    const vote = new LoveVote();
    vote.voterId = client.sessionId;
    vote.targetId = targetId;
    vote.action = action;
    vote.timestamp = Date.now();
    
    this.state.votes.set(client.sessionId, vote);
    this.state.voteCount = this.state.votes.size;
    
    // Подтверждение игроку
    client.send("vote_confirmed", { targetId, action });
    
    // Если все проголосовали - завершаем раунд раньше
    if (this.state.voteCount >= this.state.players.size) {
      setTimeout(() => this.endRound(), 1000);
    }
  }

  skipRound(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Пропустить раунд (получить меньше HP)
    client.send("round_skipped", { hpEarned: 1 });
  }

  // ============================================
  // ПОДАРКИ
  // ============================================

  handleGift(client: Client, targetId: string, giftId: string) {
    const sender = this.state.players.get(client.sessionId);
    if (!sender) return;
    
    // Находим получателя
    let target: LovePlayer | undefined;
    this.state.players.forEach((p: LovePlayer) => {
      if (p.id === targetId || p.sessionId === targetId) {
        target = p;
      }
    });
    
    if (!target) return;
    
    // Находим подарок
    const gift = {
      id: giftId,
      emoji: '🎁',
      name: 'Подарок',
      fromId: sender.id,
      fromName: sender.name
    };
    
    // Добавляем подарок игроку
    target.gifts.push(JSON.stringify(gift));
    
    // Уведомляем всех
    this.addSystemMessage(`🎁 ${sender.name} подарил ${gift.emoji} игроку ${target.name}!`);
    
    // Подтверждение отправителю
    client.send("gift_sent", { targetId, giftId });
    
    // Уведомление получателю
    this.clients.forEach(c => {
      const p = this.state.players.get(c.sessionId);
      if (p && (p.id === targetId || p.sessionId === targetId)) {
        c.send("gift_received", { 
          from: sender.name, 
          gift: gift 
        });
      }
    });
  }
}
