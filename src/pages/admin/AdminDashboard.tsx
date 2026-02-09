import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  IndianRupee, 
  TrendingUp,
  Clock,
  UserCheck,
  AlertCircle,
  ArrowRight,
  LogIn,
  LogOut as LogOutIcon,
  Bell,
  MessageSquare,
  Send
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useMembers, useAttendance, useDues, useActivities } from '@/hooks/useFirebaseData';
import { useAdminNotifications, useChatSettings } from '@/hooks/useChatAndNotifications';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { members } = useMembers();
  const { getTodayAttendance } = useAttendance();
  const { dues } = useDues();
  const { activities } = useActivities();
  const { members: allMembers, sendNotification } = useAdminNotifications();
  const { chatEnabled, toggleChat } = useChatSettings();

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifRecipient, setNotifRecipient] = useState('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  const todayAttendance = getTodayAttendance();
  const presentToday = todayAttendance.filter(a => !a.exitTime).length;
  
  // Calculate this month's payments
  const currentMonth = new Date().toISOString().substring(0, 7);
  const thisMonthPayments = dues.filter(d => d.paidDate?.substring(0, 7) === currentMonth);
  const totalThisMonth = thisMonthPayments.reduce((sum, due) => sum + due.amount, 0);
  const recentActivities = activities.slice(0, 10);

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Please enter title and message');
      return;
    }

    setSendingNotif(true);
    try {
      await sendNotification(notifTitle, notifMessage, notifRecipient);
      const recipientName = notifRecipient === 'all' 
        ? 'all members' 
        : allMembers.find(m => m.id === notifRecipient)?.name || 'member';
      toast.success(`Notification sent to ${recipientName}`);
      setNotifTitle('');
      setNotifMessage('');
      setNotifRecipient('all');
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const stats = [
    {
      icon: Users,
      label: 'Total Members',
      value: members.length,
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: UserCheck,
      label: 'Present Today',
      value: presentToday,
      color: 'bg-success/10 text-success',
    },
    {
      icon: IndianRupee,
      label: 'This Month',
      value: `₹${totalThisMonth.toLocaleString()}`,
      color: 'bg-warning/10 text-warning',
    },
    {
      icon: TrendingUp,
      label: 'Total Payments',
      value: dues.length,
      color: 'bg-accent/10 text-accent-foreground',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'entry': return <LogIn className="w-4 h-4 text-success" />;
      case 'exit': return <LogOutIcon className="w-4 h-4 text-muted-foreground" />;
      case 'payment': return <IndianRupee className="w-4 h-4 text-primary" />;
      case 'member_added': return <Users className="w-4 h-4 text-accent" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Today's Attendance */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Today's Attendance</h2>
            <Link to="/admin/attendance" className="text-primary hover:underline text-sm flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {todayAttendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance recorded today</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {todayAttendance.slice(0, 8).map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${record.exitTime ? 'bg-muted-foreground' : 'bg-success'}`} />
                    <div>
                      <p className="font-medium text-foreground">{record.memberName}</p>
                      <p className="text-sm text-muted-foreground">
                        Entry: {record.entryTime}
                        {record.exitTime && ` • Exit: ${record.exitTime}`}
                      </p>
                    </div>
                  </div>
                  {record.duration && (
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(record.duration / 60)}h {record.duration % 60}m
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Recent Activity</h2>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Recent Payments</h2>
            <Link to="/admin/dues" className="text-primary hover:underline text-sm flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {dues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
            {dues.slice(0, 5).map((due) => (
                <div 
                  key={due.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div>
                    <p className="font-medium text-foreground">{due.memberName}</p>
                    <p className="text-sm text-muted-foreground">
                      {due.periodStart && due.periodEnd 
                        ? `${format(parseISO(due.periodStart), 'dd MMM')} - ${format(parseISO(due.periodEnd), 'dd MMM')}`
                        : 'Period not set'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">₹{due.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {due.paidDate ? format(parseISO(due.paidDate), 'dd MMM') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card-elevated p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Link 
              to="/admin/members"
              className="p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-center"
            >
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground">Add Member</p>
            </Link>
            
            <Link 
              to="/admin/attendance"
              className="p-4 rounded-xl bg-success/10 hover:bg-success/20 transition-colors text-center"
            >
              <Calendar className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="font-medium text-foreground">Attendance</p>
            </Link>
            
            <Link 
              to="/admin/dues"
              className="p-4 rounded-xl bg-warning/10 hover:bg-warning/20 transition-colors text-center"
            >
              <IndianRupee className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="font-medium text-foreground">Manage Dues</p>
            </Link>
            
            <Link 
              to="/admin/receipts"
              className="p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-colors text-center"
            >
              <Clock className="w-8 h-8 text-accent-foreground mx-auto mb-2" />
              <p className="font-medium text-foreground">Receipts</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Chat & Notifications Section */}
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        {/* Chat Toggle */}
        <div className="card-elevated p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat Settings
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Enable Member Chat</p>
              <p className="text-sm text-muted-foreground">
                {chatEnabled ? 'Members can chat with each other' : 'Chat is disabled for all members'}
              </p>
            </div>
            <Switch 
              checked={chatEnabled} 
              onCheckedChange={toggleChat}
            />
          </div>
        </div>

        {/* Send Notification */}
        <div className="card-elevated p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Send Notification
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select value={notifRecipient} onValueChange={setNotifRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {allMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Notification title"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSendNotification} 
              disabled={sendingNotif}
              className="w-full btn-primary gap-2"
            >
              <Send className="w-4 h-4" />
              {sendingNotif ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
