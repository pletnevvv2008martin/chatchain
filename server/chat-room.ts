import { Room, Client } from "colyseus";
import { ChatRoomState, ChatUser, ChatMessage, ChatEvents } from "./chat-schema";

// ============================================
// CHAT ROOM - Комната чата
// ============================================

export class ChatRoom extends Room<ChatRoomState> {
  maxClients = 100;
  messageHistory: ChatMessage[] = [];
  maxHistorySize = 200;

  onCreate(options: any) {
    console.log(`💬 ChatRoom created: ${options.roomName || 'Lobby'}`);
    
    this.setState(new ChatRoomState());
    
    this.state.roomId = this.roomId;
    this.state.roomName = options.roomName || "Lobby";
    this.state.isLobby = options.isLobby !== false;
    this.state.password = options.password || "";
    this.state.ownerId = options.ownerId || "";
    
    // Обработчики сообщений
    
    // Отправка сообщения
    this.onMessage("send_message", (client, data: ChatEvents['send_message']) => {
      this.handleSendMessage(client, data);
    });
    
    // Редактирование
    this.onMessage("edit_message", (client, data: ChatEvents['edit_message']) => {
      this.handleEditMessage(client, data);
    });
    
    // Удаление
    this.onMessage("delete_message", (client, data: ChatEvents['delete_message']) => {
      this.handleDeleteMessage(client, data);
    });
    
    // Реакция
    this.onMessage("add_reaction", (client, data: ChatEvents['add_reaction']) => {
      this.handleReaction(client, data);
    });
    
    // Печатает
    this.onMessage("typing_start", (client) => {
      this.handleTyping(client, true);
    });
    
    this.onMessage("typing_stop", (client) => {
      this.handleTyping(client, false);
    });
  }

  onJoin(client: Client, options: any) {
    const userId = options.userId || client.sessionId;
    const userName = options.userName || `Guest_${Math.floor(Math.random() * 1000)}`;
    const userStatus = options.userStatus || "guest";
    
    console.log(`👋 User joined chat: ${userName}`);
    
    // Проверяем, нет ли уже такого пользователя
    let existingUser: ChatUser | undefined;
    this.state.users.forEach((user) => {
      if (user.id === userId) {
        existingUser = user;
      }
    });
    
    if (existingUser) {
      // Обновляем сессию
      existingUser.sessionId = client.sessionId;
      existingUser.isOnline = true;
      existingUser.lastActive = Date.now();
    } else {
      // Создаём нового
      const user = new ChatUser();
      user.id = userId;
      user.sessionId = client.sessionId;
      user.nickname = userName;
      user.status = userStatus;
      user.isOnline = true;
      user.joinedAt = Date.now();
      user.lastActive = Date.now();
      
      this.state.users.set(client.sessionId, user);
    }
    
    this.state.userCount = this.countOnlineUsers();
    
    // Отправляем историю сообщений новому пользователю
    client.send("message_history", this.messageHistory.slice(-50).map(m => m.toJSON()));
    
    // Уведомляем всех о новом пользователе
    this.broadcast("user_joined", { 
      userId, 
      userName 
    }, { except: client });
    
    // Отправляем текущее количество онлайн
    this.broadcast("online_count", { count: this.state.userCount });
  }

  onLeave(client: Client, consented?: boolean) {
    const user = this.state.users.get(client.sessionId);
    if (user) {
      console.log(`👋 User left chat: ${user.nickname}`);
      
      user.isOnline = false;
      user.lastActive = Date.now();
      
      // Уведомляем всех
      this.broadcast("user_left", { 
        userId: user.id, 
        userName: user.nickname 
      });
      
      // Удаляем через 30 секунд если не вернулся
      setTimeout(() => {
        const u = this.state.users.get(client.sessionId);
        if (u && !u.isOnline) {
          this.state.users.delete(client.sessionId);
          this.state.userCount = this.countOnlineUsers();
          this.broadcast("online_count", { count: this.state.userCount });
        }
      }, 30000);
    }
    
    this.state.userCount = this.countOnlineUsers();
    this.broadcast("online_count", { count: this.state.userCount });
  }

  onDispose() {
    console.log(`💬 ChatRoom disposed: ${this.state.roomName}`);
  }

  // ============================================
  // ОБРАБОТЧИКИ
  // ============================================

  handleSendMessage(client: Client, data: ChatEvents['send_message']) {
    const user = this.state.users.get(client.sessionId);
    if (!user) return;
    
    if (!data.content || !data.content.trim()) {
      client.send("error", { message: "Сообщение не может быть пустым" });
      return;
    }
    
    // Ограничение длины
    let content = data.content.trim();
    if (content.length > 5000) {
      content = content.substring(0, 5000);
    }
    
    const message = new ChatMessage();
    message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    message.userId = user.id;
    message.userName = user.nickname;
    message.userStatus = user.status;
    message.content = content;
    message.type = data.type || "text";
    message.timestamp = Date.now();
    
    // Ответ на сообщение
    if (data.replyTo) {
      message.replyToId = data.replyTo.messageId;
      message.replyToContent = data.replyTo.content;
      message.replyToUser = data.replyTo.user;
    }
    
    // Голосовое
    if (data.voiceId) {
      message.voiceId = data.voiceId;
      message.voiceDuration = data.voiceDuration || 0;
    }
    
    // Упоминания
    if (data.mentions && data.mentions.length > 0) {
      data.mentions.forEach(m => message.mentions.push(m));
    }
    
    // Добавляем в историю
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
    
    // Сохраняем ID в state
    this.state.messages.push(message.id);
    this.state.messageCount = this.messageHistory.length;
    
    // Обновляем активность пользователя
    user.lastActive = Date.now();
    user.isTyping = false;
    
    // Рассылаем всем
    this.broadcast("message_received", message.toJSON());
  }

  handleEditMessage(client: Client, data: ChatEvents['edit_message']) {
    const user = this.state.users.get(client.sessionId);
    if (!user) return;
    
    // Ищем сообщение
    const message = this.messageHistory.find(m => m.id === data.messageId);
    if (!message) {
      client.send("error", { message: "Сообщение не найдено" });
      return;
    }
    
    // Проверяем владельца
    if (message.userId !== user.id) {
      client.send("error", { message: "Можно редактировать только свои сообщения" });
      return;
    }
    
    // Редактируем
    message.content = data.content.trim();
    message.editedAt = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Уведомляем всех
    this.broadcast("message_edited", {
      messageId: message.id,
      content: message.content,
      editedAt: message.editedAt
    });
  }

  handleDeleteMessage(client: Client, data: ChatEvents['delete_message']) {
    const user = this.state.users.get(client.sessionId);
    if (!user) return;
    
    const message = this.messageHistory.find(m => m.id === data.messageId);
    if (!message) {
      client.send("error", { message: "Сообщение не найдено" });
      return;
    }
    
    // Проверяем права (владелец или админ)
    const isAdmin = user.status === 'admin' || user.status === 'moderator';
    if (message.userId !== user.id && !isAdmin) {
      client.send("error", { message: "Нет прав на удаление" });
      return;
    }
    
    // Помечаем как удалённое
    message.deleted = true;
    message.content = "Сообщение удалено";
    
    // Уведомляем
    this.broadcast("message_deleted", { messageId: message.id });
  }

  handleReaction(client: Client, data: ChatEvents['add_reaction']) {
    const user = this.state.users.get(client.sessionId);
    if (!user) return;
    
    const message = this.messageHistory.find(m => m.id === data.messageId);
    if (!message) return;
    
    // Парсим реакции
    let reactions: Array<{ emoji: string; users: string[] }> = [];
    try {
      reactions = JSON.parse(message.reactions);
    } catch {
      reactions = [];
    }
    
    // Ищем реакцию
    let reaction = reactions.find(r => r.emoji === data.emoji);
    
    if (reaction) {
      const userIndex = reaction.users.indexOf(user.id);
      if (userIndex >= 0) {
        // Убираем реакцию
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          reactions = reactions.filter(r => r.emoji !== data.emoji);
        }
      } else {
        // Добавляем реакцию
        reaction.users.push(user.id);
      }
    } else {
      // Новая реакция
      reactions.push({ emoji: data.emoji, users: [user.id] });
    }
    
    message.reactions = JSON.stringify(reactions);
    
    // Уведомляем
    this.broadcast("reaction_added", {
      messageId: message.id,
      reactions: message.reactions
    });
  }

  handleTyping(client: Client, isTyping: boolean) {
    const user = this.state.users.get(client.sessionId);
    if (!user) return;
    
    user.isTyping = isTyping;
    user.lastActive = Date.now();
    
    // Уведомляем всех кроме отправителя
    this.broadcast("user_typing", {
      userId: user.id,
      userName: user.nickname,
      isTyping
    }, { except: client });
  }

  countOnlineUsers(): number {
    let count = 0;
    this.state.users.forEach(user => {
      if (user.isOnline) count++;
    });
    return count;
  }
}
