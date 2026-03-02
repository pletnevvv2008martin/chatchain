import { NextRequest, NextResponse } from 'next/server';

interface Reaction {
  emoji: string;
  users: string[];
}

interface ChatMessage {
  id: string;
  userId: string;
  user: string;
  content: string;
  time: string;
  type: 'text' | 'gif' | 'system' | 'action' | 'roll' | 'sticker' | 'voice' | 'image';
  userStatus?: string;
  roomId: string;
  reactions?: Reaction[]; // Array of reactions
  messageCount?: number; // for user level calculation
  mentions?: string[]; // mentioned users
  replyTo?: { messageId: string; content: string; user: string } | null;
  editedAt?: string;
  deleted?: boolean;
  voiceDuration?: number;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface ChatRoom {
  id: string;
  messages: ChatMessage[];
  users: Map<string, { id: string; name: string; lastSeen: number }>;
  typingUsers: Map<string, TypingUser>;
}

interface UserStats {
  messageCount: number;
  lastRewardTime: number | null;
  totalPoints: number;
}

declare global {
  var chatRooms: Map<string, ChatRoom> | undefined;
  var userStats: Map<string, UserStats> | undefined;
}

if (!globalThis.chatRooms) globalThis.chatRooms = new Map();
if (!globalThis.userStats) globalThis.userStats = new Map();

const getOrCreateRoom = (roomId: string): ChatRoom => {
  if (!globalThis.chatRooms!.has(roomId)) {
    globalThis.chatRooms!.set(roomId, {
      id: roomId,
      messages: [],
      users: new Map(),
      typingUsers: new Map()
    });
  }
  return globalThis.chatRooms!.get(roomId)!;
};

const cleanInactiveUsers = (room: ChatRoom) => {
  const now = Date.now();
  for (const [userId, userData] of room.users) {
    if (now - userData.lastSeen > 30000) room.users.delete(userId);
  }
  // Clean typing users after 3 seconds
  for (const [userId, typingUser] of room.typingUsers) {
    if (now - typingUser.timestamp > 3000) room.typingUsers.delete(userId);
  }
};

// Get user level based on message count
const getUserLevel = (messageCount: number): { level: string; emoji: string; color: string } => {
  if (messageCount >= 500) return { level: 'Легенда', emoji: '🏆', color: '#ec4899' };
  if (messageCount >= 201) return { level: 'Завсегдатай', emoji: '⭐', color: '#f59e0b' };
  if (messageCount >= 51) return { level: 'Активный', emoji: '🔥', color: '#10b981' };
  return { level: 'Новичок', emoji: '🌱', color: '#64748b' };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') || 'lobby';
  const userId = searchParams.get('userId');
  
  const room = getOrCreateRoom(roomId);
  cleanInactiveUsers(room);
  
  // Get typing users
  const typingUsers = Array.from(room.typingUsers.values())
    .filter(t => Date.now() - t.timestamp < 3000 && t.userId !== userId)
    .map(t => t.userName);
  
  return NextResponse.json({
    success: true,
    messages: room.messages.slice(-100),
    userCount: room.users.size,
    typingUsers
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, userId, userName, content, type, userStatus, reaction, messageId, replyTo, voiceDuration } = body;
    const room = getOrCreateRoom(roomId || 'lobby');

    switch (action) {
      case 'send_message':
        // Update user message count for level system
        const currentStats = globalThis.userStats!.get(userId) || { messageCount: 0, lastRewardTime: null, totalPoints: 0 };
        currentStats.messageCount += 1;
        globalThis.userStats!.set(userId, currentStats);

        const message: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          user: userName || 'Anonymous',
          content,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          type: type || 'text',
          userStatus,
          roomId: room.id,
          reactions: [],
          messageCount: currentStats.messageCount,
          replyTo: replyTo || null,
          voiceDuration: voiceDuration || undefined,
        };
        room.messages.push(message);
        if (room.messages.length > 200) room.messages = room.messages.slice(-200);
        if (room.users.has(userId)) room.users.get(userId)!.lastSeen = Date.now();
        return NextResponse.json({ success: true, message, userLevel: getUserLevel(currentStats.messageCount) });

      case 'edit_message':
        const editMsg = room.messages.find(m => m.id === messageId);
        if (!editMsg) {
          return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }
        if (editMsg.userId !== userId) {
          return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
        }
        editMsg.content = content;
        editMsg.editedAt = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return NextResponse.json({ success: true, message: editMsg });

      case 'delete_message':
        const deleteMsg = room.messages.find(m => m.id === messageId);
        if (!deleteMsg) {
          return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }
        if (deleteMsg.userId !== userId) {
          return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
        }
        deleteMsg.content = 'Сообщение удалено';
        deleteMsg.deleted = true;
        return NextResponse.json({ success: true });

      case 'add_reaction':
      case 'remove_reaction':
        const targetMsg = room.messages.find(m => m.id === messageId);
        if (!targetMsg) {
          return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }
        
        if (!Array.isArray(targetMsg.reactions)) targetMsg.reactions = [];
        
        const existingReaction = targetMsg.reactions.find(r => r.emoji === reaction);
        
        if (action === 'add_reaction') {
          if (existingReaction) {
            if (!existingReaction.users.includes(userId)) {
              existingReaction.users.push(userId);
            }
          } else {
            targetMsg.reactions.push({ emoji: reaction, users: [userId] });
          }
        } else {
          if (existingReaction) {
            existingReaction.users = existingReaction.users.filter(id => id !== userId);
            if (existingReaction.users.length === 0) {
              targetMsg.reactions = targetMsg.reactions.filter(r => r.emoji !== reaction);
            }
          }
        }
        
        return NextResponse.json({ success: true, reactions: targetMsg.reactions });

      case 'typing':
        room.typingUsers.set(userId, {
          userId,
          userName: userName || 'Anonymous',
          timestamp: Date.now()
        });
        return NextResponse.json({ success: true });

      case 'join_room':
        room.users.set(userId, { id: userId, name: userName, lastSeen: Date.now() });
        return NextResponse.json({ success: true, messages: room.messages.slice(-50), userCount: room.users.size });

      case 'ping':
        if (room.users.has(userId)) room.users.get(userId)!.lastSeen = Date.now();
        return NextResponse.json({ success: true, userCount: room.users.size });

      case 'get_user_level':
        const stats = globalThis.userStats!.get(userId) || { messageCount: 0, lastRewardTime: null, totalPoints: 0 };
        return NextResponse.json({ success: true, level: getUserLevel(stats.messageCount), messageCount: stats.messageCount });

      case 'claim_daily_reward':
        const userStats = globalThis.userStats!.get(userId) || { messageCount: 0, lastRewardTime: null, totalPoints: 0 };
        const now = Date.now();
        const lastReward = userStats.lastRewardTime || 0;
        const hoursSinceLastReward = (now - lastReward) / (1000 * 60 * 60);
        
        if (hoursSinceLastReward < 24) {
          const hoursLeft = Math.ceil(24 - hoursSinceLastReward);
          return NextResponse.json({ 
            success: false, 
            error: `Подождите ещё ${hoursLeft} ч.`,
            hoursLeft
          });
        }
        
        userStats.totalPoints += 10;
        userStats.lastRewardTime = now;
        globalThis.userStats!.set(userId, userStats);
        
        return NextResponse.json({ 
          success: true, 
          points: 10,
          totalPoints: userStats.totalPoints,
          nextRewardIn: 24
        });

      case 'get_reward_status':
        const rewardStats = globalThis.userStats!.get(userId) || { messageCount: 0, lastRewardTime: null, totalPoints: 0 };
        const lastRewardTime = rewardStats.lastRewardTime || 0;
        const hoursSinceReward = (Date.now() - lastRewardTime) / (1000 * 60 * 60);
        const canClaim = hoursSinceReward >= 24;
        
        return NextResponse.json({
          success: true,
          canClaim,
          totalPoints: rewardStats.totalPoints,
          hoursLeft: canClaim ? 0 : Math.ceil(24 - hoursSinceReward)
        });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
