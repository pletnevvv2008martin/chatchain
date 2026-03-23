import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================
// СООБЩЕНИЕ ЧАТА
// ============================================

export class ChatMessage extends Schema {
  @type("string") id: string = "";
  @type("string") userId: string = "";
  @type("string") userName: string = "";
  @type("string") userStatus: string = "guest";
  @type("string") content: string = "";
  @type("string") type: string = "text"; // text, gif, voice, system, action, roll
  @type("number") timestamp: number = Date.now();
  @type("boolean") deleted: boolean = false;
  @type("string") editedAt: string = "";
  
  // Для ответов
  @type("string") replyToId: string = "";
  @type("string") replyToContent: string = "";
  @type("string") replyToUser: string = "";
  
  // Для голосовых
  @type("string") voiceId: string = "";
  @type("number") voiceDuration: number = 0;
  
  // Реакции (JSON строка)
  @type("string") reactions: string = "[]";
  
  // Упоминания
  @type(["string"]) mentions: ArraySchema<string> = new ArraySchema<string>();
}

// ============================================
// ПОЛЬЗОВАТЕЛЬ В ЧАТЕ
// ============================================

export class ChatUser extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") nickname: string = "";
  @type("string") status: string = "guest"; // guest, registered, admin, moderator
  @type("boolean") isOnline: boolean = true;
  @type("boolean") isTyping: boolean = false;
  @type("number") lastActive: number = Date.now();
  @type("number") joinedAt: number = Date.now();
}

// ============================================
// КОМНАТА ЧАТА
// ============================================

export class ChatRoomState extends Schema {
  @type("string") roomId: string = "";
  @type("string") roomName: string = "Lobby";
  @type("boolean") isLobby: boolean = true;
  @type("string") password: string = "";
  @type("string") ownerId: string = "";
  
  @type({ map: ChatUser }) users = new MapSchema<ChatUser>();
  @type("number") userCount: number = 0;
  
  @type(["string"]) messages: ArraySchema<string> = new ArraySchema<string>();
  @type("number") messageCount: number = 0;
  
  @type("number") createdAt: number = Date.now();
}

// ============================================
// ТИПЫ СОБЫТИЙ
// ============================================

export interface ChatEvents {
  // От клиента
  send_message: {
    content: string;
    type: 'text' | 'gif' | 'voice';
    replyTo?: { messageId: string; content: string; user: string };
    voiceId?: string;
    voiceDuration?: number;
    mentions?: string[];
  };
  
  edit_message: {
    messageId: string;
    content: string;
  };
  
  delete_message: {
    messageId: string;
  };
  
  add_reaction: {
    messageId: string;
    emoji: string;
  };
  
  typing_start: Record<string, never>;
  typing_stop: Record<string, never>;
  
  // От сервера
  message_received: ChatMessage;
  message_edited: { messageId: string; content: string; editedAt: string };
  message_deleted: { messageId: string };
  reaction_added: { messageId: string; reactions: string };
  
  user_joined: { userId: string; userName: string };
  user_left: { userId: string; userName: string };
  user_typing: { userId: string; userName: string; isTyping: boolean };
  
  online_count: { count: number };
  
  error: { message: string };
}
