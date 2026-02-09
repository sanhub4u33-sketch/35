 import { useState, useEffect, useCallback } from 'react';
 import { ref, push, onValue, query, orderByChild, set, get, update } from 'firebase/database';
 import { database } from '@/lib/firebase';
 import { ChatMessage, Notification, LibrarySettings, Member } from '@/types/library';
 
 export const useChat = (currentMemberId: string, currentMemberName: string) => {
   const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
   const [privateMessages, setPrivateMessages] = useState<{ [roomId: string]: ChatMessage[] }>({});
   const [members, setMembers] = useState<Member[]>([]);
   const [chatEnabled, setChatEnabled] = useState(true);
 
   useEffect(() => {
     // Listen to group messages
     const groupRef = ref(database, 'chat/group');
     const unsubGroup = onValue(groupRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const messages = Object.entries(data).map(([id, msg]: [string, any]) => ({
           id,
           ...msg
         })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
         setGroupMessages(messages);
       } else {
         setGroupMessages([]);
       }
     });
 
     // Listen to members for private chat list
     const membersRef = ref(database, 'members');
     const unsubMembers = onValue(membersRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const memberList = Object.entries(data).map(([id, m]: [string, any]) => ({
           id,
           ...m
         }));
         setMembers(memberList);
       }
     });
 
     // Listen to chat enabled setting
     const settingsRef = ref(database, 'settings');
     const unsubSettings = onValue(settingsRef, (snapshot) => {
       if (snapshot.exists()) {
         const settings = snapshot.val();
         setChatEnabled(settings.chatEnabled !== false);
       } else {
         setChatEnabled(true);
       }
     });
 
     return () => {
       unsubGroup();
       unsubMembers();
       unsubSettings();
     };
   }, []);
 
   const getPrivateRoomId = (memberId1: string, memberId2: string) => {
     return [memberId1, memberId2].sort().join('_');
   };
 
   const loadPrivateMessages = useCallback((otherMemberId: string) => {
     const roomId = getPrivateRoomId(currentMemberId, otherMemberId);
     const privateRef = ref(database, `chat/private/${roomId}`);
     
     const unsub = onValue(privateRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const messages = Object.entries(data).map(([id, msg]: [string, any]) => ({
           id,
           ...msg
         })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
         setPrivateMessages(prev => ({ ...prev, [roomId]: messages }));
       } else {
         setPrivateMessages(prev => ({ ...prev, [roomId]: [] }));
       }
     });
 
     return unsub;
   }, [currentMemberId]);
 
   const sendGroupMessage = async (content: string, type: 'text' | 'emoji' | 'gif' = 'text') => {
     if (!currentMemberId || !content.trim()) return;
     
     const groupRef = ref(database, 'chat/group');
     await push(groupRef, {
       senderId: currentMemberId,
       senderName: currentMemberName,
       content: content.trim(),
       timestamp: new Date().toISOString(),
       type,
       roomId: 'group'
     });
   };
 
   const sendPrivateMessage = async (otherMemberId: string, content: string, type: 'text' | 'emoji' | 'gif' = 'text') => {
     if (!currentMemberId || !content.trim()) return;
     
     const roomId = getPrivateRoomId(currentMemberId, otherMemberId);
     const privateRef = ref(database, `chat/private/${roomId}`);
     await push(privateRef, {
       senderId: currentMemberId,
       senderName: currentMemberName,
       content: content.trim(),
       timestamp: new Date().toISOString(),
       type,
       roomId
     });
   };
 
   return {
     groupMessages,
     privateMessages,
     members: members.filter(m => m.id !== currentMemberId),
     chatEnabled,
     sendGroupMessage,
     sendPrivateMessage,
     loadPrivateMessages,
     getPrivateRoomId
   };
 };
 
 export const useNotifications = (memberId: string) => {
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
 
   useEffect(() => {
     if (!memberId) return;
 
     const notifRef = ref(database, 'notifications');
     const unsub = onValue(notifRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const allNotifs = Object.entries(data).map(([id, n]: [string, any]) => ({
           id,
           ...n
         }));
         
         // Filter: all broadcasts + notifications for this specific member
         const myNotifs = allNotifs.filter(n => 
           n.recipientId === 'all' || n.recipientId === memberId
         ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
         
         setNotifications(myNotifs);
         
         // Count unread
         const unread = myNotifs.filter(n => !n.readBy?.[memberId]).length;
         setUnreadCount(unread);
       } else {
         setNotifications([]);
         setUnreadCount(0);
       }
     });
 
     return () => unsub();
   }, [memberId]);
 
   const markAsRead = async (notificationId: string) => {
     if (!memberId) return;
     const notifRef = ref(database, `notifications/${notificationId}/readBy/${memberId}`);
     await set(notifRef, true);
   };
 
   const markAllAsRead = async () => {
     if (!memberId) return;
     for (const notif of notifications) {
       if (!notif.readBy?.[memberId]) {
         await markAsRead(notif.id);
       }
     }
   };
 
   return { notifications, unreadCount, markAsRead, markAllAsRead };
 };
 
 export const useAdminNotifications = () => {
   const [members, setMembers] = useState<Member[]>([]);
 
   useEffect(() => {
     const membersRef = ref(database, 'members');
     const unsub = onValue(membersRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const memberList = Object.entries(data).map(([id, m]: [string, any]) => ({
           id,
           ...m
         }));
         setMembers(memberList);
       }
     });
 
     return () => unsub();
   }, []);
 
   const sendNotification = async (title: string, message: string, recipientId: string) => {
     const notifRef = ref(database, 'notifications');
     await push(notifRef, {
       title,
       message,
       recipientId, // 'all' or specific memberId
       createdAt: new Date().toISOString(),
       readBy: {}
     });
   };
 
   return { members, sendNotification };
 };
 
 export const useChatSettings = () => {
   const [chatEnabled, setChatEnabled] = useState(true);
 
   useEffect(() => {
     const settingsRef = ref(database, 'settings');
     const unsub = onValue(settingsRef, (snapshot) => {
       if (snapshot.exists()) {
         const settings = snapshot.val();
         setChatEnabled(settings.chatEnabled !== false);
       } else {
         setChatEnabled(true);
       }
     });
 
     return () => unsub();
   }, []);
 
   const toggleChat = async (enabled: boolean) => {
     const settingsRef = ref(database, 'settings');
     await update(settingsRef, { chatEnabled: enabled });
     setChatEnabled(enabled);
   };
 
   return { chatEnabled, toggleChat };
 };