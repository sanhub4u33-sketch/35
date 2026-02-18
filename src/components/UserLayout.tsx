import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
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
import { cn } from '@/lib/utils';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                <img src="/icons/wisebrary-logo.png" alt="Wisebrary" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">Wisebrary</h1>
                <p className="text-xs text-sidebar-foreground/60">Member Portal</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "sidebar-nav-item",
                  location.pathname === item.url && "active"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* User info + Logout */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            {memberData && (
              <div className="flex items-center gap-3 px-2">
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
            <button
              onClick={handleLogout}
              className="sidebar-nav-item w-full text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
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
  );
};

export default UserLayout;
