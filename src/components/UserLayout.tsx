import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  LayoutDashboard,
  Trophy,
  Flame,
  Timer,
  MessageCircle,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';

const navItems = [
  { title: 'Dashboard', url: '/user', icon: LayoutDashboard },
  { title: 'Leaderboard', url: '/user/leaderboard', icon: Trophy },
  { title: 'Streaks', url: '/user/streaks', icon: Flame },
  { title: 'Study Timer', url: '/user/timer', icon: Timer },
];

interface UserLayoutProps {
  children: React.ReactNode;
  memberData: { id: string; name: string; email: string; profilePic?: string } | null;
  onOpenChat?: () => void;
  chatEnabled?: boolean;
}

const UserLayout = ({ children, memberData, onOpenChat, chatEnabled }: UserLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="p-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-sm font-bold text-sidebar-foreground truncate">
                  Shri Hanumant Library
                </h1>
                <p className="text-[10px] text-sidebar-foreground/60">Member Portal</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            {memberData && (
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden flex-shrink-0">
                  {memberData.profilePic ? (
                    <img src={memberData.profilePic} alt={memberData.name} className="w-full h-full object-cover" />
                  ) : (
                    memberData.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{memberData.name}</p>
                  <p className="text-[10px] text-sidebar-foreground/60 truncate">{memberData.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {onOpenChat && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => chatEnabled && onOpenChat()}
                  disabled={!chatEnabled}
                  className={!chatEnabled ? 'opacity-50 cursor-not-allowed' : ''}
                  title={chatEnabled ? 'Open Chat' : 'Chat is disabled by admin'}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              )}
              {memberData && <NotificationBell memberId={memberData.id} />}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default UserLayout;
