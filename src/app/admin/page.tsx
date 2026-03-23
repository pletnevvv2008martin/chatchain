'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Shield,
  Music,
  Settings,
  TrendingUp,
  AlertTriangle,
  Ban,
  VolumeX,
  CheckCircle,
  Search,
  RefreshCw,
  Activity,
  Clock,
  UserCheck,
  Lock,
} from 'lucide-react';

// Types
interface AdminUser {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'banned' | 'muted';
  role: 'user' | 'moderator' | 'admin';
  lastSeen: number;
  warnings: number;
  joinTime: number;
  messageCount?: number;
}

interface ModAction {
  id: string;
  type: string;
  userId: string;
  userName: string;
  modId: string;
  modName: string;
  reason: string;
  timestamp: number;
  duration?: string;
}

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  totalMessages: number;
  bannedUsers: number;
  mutedUsers: number;
  todayMessages: number;
}

interface CurrentUser {
  id: string;
  nickname: string;
  role: 'user' | 'moderator' | 'admin';
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actions, setActions] = useState<ModAction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    bannedUsers: 0,
    mutedUsers: 0,
    todayMessages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState('24h');

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('chatchain_user');
        if (stored) {
          const user = JSON.parse(stored);
          // Проверяем, админ ли это
          // Админ по: ID с 'admin', статус 'legend', инвестировано >= 10000, или никнейм 'Martin'
          const isAdmin = 
            user.id?.startsWith('admin') || 
            user.status === 'legend' || 
            user.investedAmount >= 10000 ||
            user.nickname === 'Martin';
          const role = isAdmin ? 'admin' : 'user';
          
          setCurrentUser({
            id: user.id,
            nickname: user.nickname,
            role: role,
          });
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Проверка прав доступа
  const hasAccess = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

  // Load data
  const loadData = useCallback(async () => {
    if (!hasAccess) return;
    
    try {
      const usersRes = await fetch('/api/moderation?action=get_users');
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
        const online = usersData.users.filter((u: AdminUser) => u.status === 'online').length;
        const banned = usersData.users.filter((u: AdminUser) => u.status === 'banned').length;
        const muted = usersData.users.filter((u: AdminUser) => u.status === 'muted').length;
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.users.length,
          onlineUsers: online,
          bannedUsers: banned,
          mutedUsers: muted,
        }));
      }

      const logsRes = await fetch('/api/moderation?action=get_logs');
      const logsData = await logsRes.json();
      if (logsData.success) setActions(logsData.logs);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [hasAccess]);

  // Initial data load and polling
  useEffect(() => {
    if (!hasAccess) return;
    
    let mounted = true;
    
    const fetchData = async () => {
      if (!mounted) return;
      await loadData();
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [hasAccess, loadData]);

  // Actions
  const performAction = async (type: string, user: AdminUser, reason?: string) => {
    if (!reason && (type === 'ban' || type === 'mute')) {
      alert('Укажите причину');
      return;
    }
    try {
      await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type,
          targetUserId: user.id,
          targetUserName: user.name,
          modId: currentUser?.id,
          modName: currentUser?.nickname,
          reason: reason || '',
          duration: banDuration,
        }),
      });
      await loadData();
      setSelectedUser(null);
      setActionReason('');
    } catch (e) {
      console.error('Action failed:', e);
    }
  };

  const changeRole = async (userId: string, newRole: 'user' | 'moderator') => {
    try {
      await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_role',
          targetUserId: userId,
          modId: currentUser?.id,
          modName: currentUser?.nickname,
          newRole,
        }),
      });
      await loadData();
    } catch (e) {
      console.error('Role change failed:', e);
    }
  };

  // Helpers
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      offline: 'bg-gray-500',
      banned: 'bg-red-500',
      muted: 'bg-yellow-500',
    };
    return colors[s] || 'bg-gray-500';
  };

  const getRoleBadge = (r: string) => {
    const roles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      admin: { label: 'Админ', variant: 'destructive' },
      moderator: { label: 'Модер', variant: 'default' },
      user: { label: 'Пользователь', variant: 'secondary' },
    };
    return roles[r] || roles.user;
  };

  const getActionIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      ban: <Ban className="h-4 w-4 text-red-500" />,
      unban: <CheckCircle className="h-4 w-4 text-green-500" />,
      mute: <VolumeX className="h-4 w-4 text-yellow-500" />,
      unmute: <VolumeX className="h-4 w-4 text-green-500" />,
      warn: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    };
    return icons[type] || <Shield className="h-4 w-4" />;
  };

  // Загрузка
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Нет доступа
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Доступ запрещён</CardTitle>
            <CardDescription>
              У вас нет прав для просмотра этой страницы
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Для доступа к админ-панели необходимо быть администратором или модератором.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться в чат
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Главная</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeSection === 'dashboard'}
                    onClick={() => setActiveSection('dashboard')}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Дашборд</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Управление</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeSection === 'users'}
                    onClick={() => setActiveSection('users')}
                  >
                    <Users className="h-4 w-4" />
                    <span>Пользователи</span>
                    <Badge variant="secondary" className="ml-auto">
                      {users.length}
                    </Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeSection === 'moderation'}
                    onClick={() => setActiveSection('moderation')}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Модерация</span>
                    {actions.length > 0 && (
                      <Badge variant="outline" className="ml-auto">
                        {actions.length}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeSection === 'music'}
                    onClick={() => setActiveSection('music')}
                  >
                    <Music className="h-4 w-4" />
                    <span>Музыка</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Настройки</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeSection === 'settings'}
                    onClick={() => setActiveSection('settings')}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Настройки</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4" />
                <span>Вернуться в чат</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">
            {activeSection === 'dashboard' && 'Дашборд'}
            {activeSection === 'users' && 'Пользователи'}
            {activeSection === 'moderation' && 'Модерация'}
            {activeSection === 'music' && 'Музыка'}
            {activeSection === 'settings' && 'Настройки'}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Всего пользователей
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.onlineUsers} онлайн сейчас
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Забанено
                    </CardTitle>
                    <Ban className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {stats.bannedUsers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Заблокированных пользователей
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Заглушено
                    </CardTitle>
                    <VolumeX className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {stats.mutedUsers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Без права голоса
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Активность
                    </CardTitle>
                    <Activity className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {Math.round((stats.onlineUsers / Math.max(stats.totalUsers, 1)) * 100)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Пользователей активно
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Последние действия
                    </CardTitle>
                    <CardDescription>
                      Последние 5 действий модерации
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {actions.slice(0, 5).map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center gap-4 rounded-lg border p-3"
                        >
                          {getActionIcon(action.type)}
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {action.modName} → {action.userName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {action.reason || action.type}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(action.timestamp)}
                          </div>
                        </div>
                      ))}
                      {actions.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Нет действий
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Быстрые действия
                    </CardTitle>
                    <CardDescription>
                      Часто используемые операции
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveSection('users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Управление пользователями
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveSection('moderation')}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Журнал модерации
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setActiveSection('music')}
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Управление музыкой
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Online Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Пользователи онлайн
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {users
                      .filter((u) => u.status === 'online')
                      .slice(0, 20)
                      .map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveSection('users');
                          }}
                        >
                          {user.name}
                        </Badge>
                      ))}
                    {users.filter((u) => u.status === 'online').length === 0 && (
                      <p className="text-muted-foreground">Нет пользователей онлайн</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={undefined}
                  onValueChange={(value) => setSearchQuery(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Фильтр по статусу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="online">Онлайн</SelectItem>
                    <SelectItem value="offline">Офлайн</SelectItem>
                    <SelectItem value="banned">Забанены</SelectItem>
                    <SelectItem value="muted">Заглушены</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Предупреждения</TableHead>
                        <TableHead>Последняя активность</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {user.name[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {user.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${getStatusColor(
                                  user.status
                                )}`}
                              />
                              <span className="capitalize">{user.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadge(user.role).variant}>
                              {getRoleBadge(user.role).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.warnings > 0 ? (
                              <Badge variant="outline" className="text-orange-500">
                                {user.warnings} ⚠️
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(user.lastSeen)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.role !== 'admin' && (
                              <div className="flex justify-end gap-2">
                                {user.status !== 'banned' && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setSelectedUser(user)}
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Забанить {user.name}?
                                        </DialogTitle>
                                        <DialogDescription>
                                          Пользователь не сможет входить в чат.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Причина</Label>
                                          <Textarea
                                            value={actionReason}
                                            onChange={(e) =>
                                              setActionReason(e.target.value)
                                            }
                                            placeholder="Укажите причину..."
                                          />
                                        </div>
                                        <div>
                                          <Label>Срок</Label>
                                          <Select
                                            value={banDuration}
                                            onValueChange={setBanDuration}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1h">
                                                1 час
                                              </SelectItem>
                                              <SelectItem value="24h">
                                                24 часа
                                              </SelectItem>
                                              <SelectItem value="7d">
                                                7 дней
                                              </SelectItem>
                                              <SelectItem value="permanent">
                                                Навсегда
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="destructive"
                                          onClick={() =>
                                            performAction('ban', user, actionReason)
                                          }
                                          disabled={!actionReason.trim()}
                                        >
                                          Забанить
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {user.status === 'banned' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      performAction('unban', user, 'Разбан')
                                    }
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                {user.status !== 'muted' &&
                                  user.status !== 'banned' && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        performAction('mute', user, 'Нарушение')
                                      }
                                    >
                                      <VolumeX className="h-4 w-4" />
                                    </Button>
                                  )}
                                {user.status === 'muted' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      performAction('unmute', user, 'Размут')
                                    }
                                  >
                                    <VolumeX className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => performAction('warn', user)}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                                {user.role === 'user' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => changeRole(user.id, 'moderator')}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Пользователи не найдены
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Moderation Section */}
          {activeSection === 'moderation' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Журнал модерации</CardTitle>
                  <CardDescription>
                    История всех действий модераторов
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Действие</TableHead>
                        <TableHead>Модератор</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Причина</TableHead>
                        <TableHead>Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actions.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(action.type)}
                              <span className="capitalize">{action.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{action.modName}</TableCell>
                          <TableCell>{action.userName}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {action.reason || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(action.timestamp)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {actions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Нет записей
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Music Section */}
          {activeSection === 'music' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Управление музыкой
                  </CardTitle>
                  <CardDescription>
                    Контроль музыкального плеера
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Button variant="outline">
                      <Music className="h-4 w-4 mr-2" />
                      Пауза/Играть
                    </Button>
                    <Button variant="outline">
                      <Music className="h-4 w-4 mr-2" />
                      Следующий трек
                    </Button>
                    <Button variant="destructive">
                      <Music className="h-4 w-4 mr-2" />
                      Очистить очередь
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки чата</CardTitle>
                  <CardDescription>
                    Основные настройки чат-приложения
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Максимальное количество пользователей в комнате</Label>
                    <Input type="number" defaultValue="100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Время кулдауна между сообщениями (мс)</Label>
                    <Input type="number" defaultValue="1000" />
                  </div>
                  <Button>Сохранить настройки</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
