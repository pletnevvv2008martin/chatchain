import { NextRequest, NextResponse } from 'next/server';

interface ModUser {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'banned' | 'muted';
  role: 'user' | 'moderator' | 'admin';
  lastSeen: number;
  warnings: number;
  joinTime: number;
}

interface ModAction {
  id: string;
  type: 'ban' | 'unban' | 'mute' | 'unmute' | 'kick' | 'warn' | 'delete_message' | 'change_role';
  userId: string;
  userName: string;
  modId: string;
  modName: string;
  reason: string;
  timestamp: number;
  duration?: string;
}

declare global {
  var modActions: ModAction[] | undefined;
  var modUsers: Map<string, ModUser> | undefined;
  var bannedUsers: Set<string> | undefined;
  var mutedUsers: Map<string, number> | undefined;
}

if (!globalThis.modActions) globalThis.modActions = [];
if (!globalThis.modUsers) globalThis.modUsers = new Map();
if (!globalThis.bannedUsers) globalThis.bannedUsers = new Set();
if (!globalThis.mutedUsers) globalThis.mutedUsers = new Map();

const ADMIN_IDS = ['user-1'];
const ADMIN_NAMES = ['Гость_8000'];

const isModOrAdmin = (userId: string): boolean => {
  if (ADMIN_IDS.includes(userId)) return true;
  const user = globalThis.modUsers?.get(userId);
  if (user?.role === 'admin' || user?.role === 'moderator') return true;
  if (user && ADMIN_NAMES.includes(user.name)) return true;
  return false;
};

const isAdmin = (userId: string): boolean => {
  if (ADMIN_IDS.includes(userId)) return true;
  const user = globalThis.modUsers?.get(userId);
  if (user?.role === 'admin') return true;
  if (user && ADMIN_NAMES.includes(user.name)) return true;
  return false;
};

const getOrCreateUser = (userId: string, userName: string): ModUser => {
  if (!globalThis.modUsers!.has(userId)) {
    const isAdminUser = ADMIN_IDS.includes(userId) || ADMIN_NAMES.includes(userName);
    globalThis.modUsers!.set(userId, {
      id: userId, name: userName, status: 'online',
      role: isAdminUser ? 'admin' : 'user',
      lastSeen: Date.now(), warnings: 0, joinTime: Date.now(),
    });
  }
  const user = globalThis.modUsers!.get(userId)!;
  user.lastSeen = Date.now();
  if ((ADMIN_IDS.includes(userId) || ADMIN_NAMES.includes(userName)) && user.role !== 'admin') {
    user.role = 'admin';
  }
  return user;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');

  if (action === 'get_users') {
    return NextResponse.json({ success: true, users: Array.from(globalThis.modUsers!.values()) });
  }

  if (action === 'get_logs') {
    return NextResponse.json({ success: true, logs: globalThis.modActions?.slice(-100).reverse() || [] });
  }

  if (action === 'check_status' && userId) {
    const isBanned = globalThis.bannedUsers!.has(userId);
    const mutedUntil = globalThis.mutedUsers!.get(userId);
    const isMuted = mutedUntil && mutedUntil > Date.now();
    const user = globalThis.modUsers!.get(userId);
    let role = user?.role || 'user';
    if (user && ADMIN_NAMES.includes(user.name) && role !== 'admin') {
      role = 'admin';
      user.role = 'admin';
    }
    return NextResponse.json({ success: true, isBanned, isMuted: !!isMuted, mutedUntil: isMuted ? mutedUntil : null, role, warnings: user?.warnings || 0 });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetUserId, targetUserName, modId, modName, reason, duration, newRole, userId, userName } = body;

    if (action === 'register') {
      const user = getOrCreateUser(userId, userName);
      return NextResponse.json({ success: true, user });
    }

    if (!isModOrAdmin(modId)) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 });
    }

    const modAction: ModAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: action, userId: targetUserId, userName: targetUserName,
      modId, modName, reason: reason || '', timestamp: Date.now(), duration,
    };

    switch (action) {
      case 'ban':
        globalThis.bannedUsers!.add(targetUserId);
        const banUser = globalThis.modUsers!.get(targetUserId);
        if (banUser) banUser.status = 'banned';
        break;
      case 'unban':
        globalThis.bannedUsers!.delete(targetUserId);
        const unbanUser = globalThis.modUsers!.get(targetUserId);
        if (unbanUser) unbanUser.status = 'online';
        break;
      case 'mute':
        const muteDuration = duration === '1h' ? 3600000 : duration === '24h' ? 86400000 : duration === '7d' ? 604800000 : 86400000;
        globalThis.mutedUsers!.set(targetUserId, Date.now() + muteDuration);
        const muteUser = globalThis.modUsers!.get(targetUserId);
        if (muteUser) muteUser.status = 'muted';
        break;
      case 'unmute':
        globalThis.mutedUsers!.delete(targetUserId);
        const unmuteUser = globalThis.modUsers!.get(targetUserId);
        if (unmuteUser) unmuteUser.status = 'online';
        break;
      case 'warn':
        const warnUser = globalThis.modUsers!.get(targetUserId);
        if (warnUser) {
          warnUser.warnings++;
          if (warnUser.warnings >= 3) {
            globalThis.bannedUsers!.add(targetUserId);
            warnUser.status = 'banned';
          }
        }
        break;
      case 'change_role':
        if (!isAdmin(modId)) return NextResponse.json({ success: false, error: 'Только админ' }, { status: 403 });
        const roleUser = globalThis.modUsers!.get(targetUserId);
        if (roleUser && (newRole === 'user' || newRole === 'moderator')) roleUser.role = newRole;
        break;
    }

    globalThis.modActions!.push(modAction);
    return NextResponse.json({ success: true, action: modAction });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
