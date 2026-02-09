 import { useState, useRef, useEffect } from 'react';
 import { Bell, X, Check } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useNotifications } from '@/hooks/useChatAndNotifications';
 import { format, parseISO } from 'date-fns';
 
 interface NotificationBellProps {
   memberId: string;
 }
 
 const NotificationBell = ({ memberId }: NotificationBellProps) => {
   const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(memberId);
   const [isOpen, setIsOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);
 
   // Close dropdown when clicking outside
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
         setIsOpen(false);
       }
     };
 
     if (isOpen) {
       document.addEventListener('mousedown', handleClickOutside);
     }
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [isOpen]);
 
   const handleToggle = () => {
     setIsOpen(!isOpen);
   };
 
   const handleNotificationClick = async (notificationId: string) => {
     await markAsRead(notificationId);
   };
 
   return (
     <div className="relative" ref={dropdownRef}>
       <Button 
         variant="ghost" 
         size="icon" 
         className="relative"
         onClick={handleToggle}
       >
         <Bell className="w-5 h-5" />
         {unreadCount > 0 && (
           <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
             {unreadCount > 9 ? '9+' : unreadCount}
           </span>
         )}
       </Button>
 
       {isOpen && (
         <>
           {/* Backdrop for mobile */}
           <div 
             className="fixed inset-0 z-40 sm:hidden" 
             onClick={() => setIsOpen(false)} 
           />
           
         {/* Dropdown - Positioned for proper alignment */}
         <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 top-16 sm:top-full sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-xl z-50 animate-scale-in overflow-hidden">
           {/* Header */}
           <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
             <h4 className="font-display font-semibold text-foreground text-base">Notifications</h4>
             <div className="flex items-center gap-1">
               {unreadCount > 0 && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="text-xs h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                   onClick={markAllAsRead}
                 >
                   <Check className="w-3.5 h-3.5 mr-1" />
                   Mark all
                 </Button>
               )}
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-8 w-8 rounded-lg hover:bg-secondary"
                 onClick={() => setIsOpen(false)}
               >
                 <X className="w-4 h-4" />
               </Button>
             </div>
           </div>
 
           {/* Notifications List */}
           <ScrollArea className="max-h-[60vh] sm:max-h-80">
             {notifications.length === 0 ? (
               <div className="py-12 px-6 text-center">
                 <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                   <Bell className="w-6 h-6 text-muted-foreground" />
                 </div>
                 <p className="text-muted-foreground text-sm font-medium">No notifications yet</p>
                 <p className="text-muted-foreground/70 text-xs mt-1">We'll notify you when something arrives</p>
               </div>
             ) : (
               <div className="py-1">
                 {notifications.map((notif, index) => {
                   const isUnread = !notif.readBy?.[memberId];
                   return (
                     <button
                       key={notif.id}
                       className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-all duration-200 ${
                         isUnread ? 'bg-primary/5' : ''
                       } ${index !== notifications.length - 1 ? 'border-b border-border/50' : ''}`}
                       onClick={() => handleNotificationClick(notif.id)}
                     >
                       <div className="flex items-start gap-3">
                         {isUnread && (
                           <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 animate-pulse" />
                         )}
                         <div className={`flex-1 min-w-0 ${!isUnread ? 'ml-5' : ''}`}>
                           <p className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                             {notif.title}
                           </p>
                           <p className="text-muted-foreground text-sm line-clamp-2 mt-0.5">{notif.message}</p>
                           <p className="text-xs text-muted-foreground/70 mt-1.5">
                             {format(parseISO(notif.createdAt), 'MMM d, h:mm a')}
                           </p>
                         </div>
                       </div>
                     </button>
                   );
                 })}
               </div>
             )}
           </ScrollArea>
         </div>
         </>
       )}
     </div>
   );
 };
 
 export default NotificationBell;