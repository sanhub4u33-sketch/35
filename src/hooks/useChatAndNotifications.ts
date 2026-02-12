import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ref,
  push,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  set,
  update,
  onDisconnect,
  remove,
  runTransaction,
  query,
  limitToLast,
  get,
} from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { database, firestore } from '@/lib/firebase';
import { ChatMessage, Notification, Member, PresenceData } from '@/types/library';

// Keep chat fast on first load by limiting RTDB payload.
const GROUP_MESSAGES_LIMIT = 1200;
const PRIVATE_MESSAGES_LIMIT = 600;

// Prevent large "fan-out" unread updates from blocking the UI thread.
const UNREAD_CHUNK_SIZE = 25;
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const scheduleRaf = (handleRef: React.MutableRefObject<number | null>, fn: () => void) => {
  if (handleRef.current != null) return;
  handleRef.current = requestAnimationFrame(() => {
    handleRef.current = null;
    fn();
  });
};

// Presence hook - handles online/offline/lastSeen + cleanup on background/close
export const usePresence = (memberId: string) => {
  useEffect(() => {
    if (!memberId) return;

    const presenceRef = ref(database, `presence/${memberId}`);
    const connectedRef = ref(database, '.info/connected');

    const setOnline = () => {
      set(presenceRef, {
        online: true,
        lastSeen: new Date().toISOString(),
        typing: null,
      });
      onDisconnect(presenceRef).set({
        online: false,
        lastSeen: new Date().toISOString(),
        typing: null,
      });
    };

    const setOffline = () => {
      set(presenceRef, {
        online: false,
        lastSeen: new Date().toISOString(),
        typing: null,
      });
    };

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        setOnline();
      }
    });

    // Go offline on visibility change (background) and page hide
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setOffline();
      } else {
        setOnline();
      }
    };
    const handleBeforeUnload = () => setOffline();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubConnected();
      setOffline();
    };
  }, [memberId]);
};

// Typing indicator hook (throttled to avoid RTDB write spam / UI jank on mobile)
export const useTypingIndicator = (memberId: string, memberName: string) => {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingWriteRef = useRef(0);
  const TYPING_THROTTLE_MS = 450;

  const setTyping = useCallback((roomId: string) => {
    if (!memberId) return;

    const presenceRef = ref(database, `presence/${memberId}/typing`);

    const now = Date.now();
    if (now - lastTypingWriteRef.current >= TYPING_THROTTLE_MS) {
      lastTypingWriteRef.current = now;
      set(presenceRef, {
        roomId,
        name: memberName,
        timestamp: new Date().toISOString(),
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      set(presenceRef, null);
    }, 3000);
  }, [memberId, memberName]);

  const clearTyping = useCallback(() => {
    if (!memberId) return;
    const presenceRef = ref(database, `presence/${memberId}/typing`);
    set(presenceRef, null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [memberId]);

  return { setTyping, clearTyping };
};

// Watch presence of all members (incremental + batched to reduce re-render frequency)
export const usePresenceList = () => {
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceData>>({});
  const bufRef = useRef<Record<string, PresenceData>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const presenceRef = ref(database, 'presence');
    let cancelled = false;

    const flush = () => {
      setPresenceMap({ ...bufRef.current });
    };

    void get(presenceRef).then((snapshot) => {
      if (cancelled) return;
      bufRef.current = (snapshot.val() || {}) as Record<string, PresenceData>;
      scheduleRaf(rafRef, flush);
    });

    const unsubAdded = onChildAdded(presenceRef, (snap) => {
      if (cancelled) return;
      const id = snap.key as string;
      bufRef.current[id] = snap.val() as PresenceData;
      scheduleRaf(rafRef, flush);
    });

    const unsubChanged = onChildChanged(presenceRef, (snap) => {
      if (cancelled) return;
      const id = snap.key as string;
      bufRef.current[id] = snap.val() as PresenceData;
      scheduleRaf(rafRef, flush);
    });

    const unsubRemoved = onChildRemoved(presenceRef, (snap) => {
      if (cancelled) return;
      const id = snap.key as string;
      delete bufRef.current[id];
      scheduleRaf(rafRef, flush);
    });

    return () => {
      cancelled = true;
      unsubAdded();
      unsubChanged();
      unsubRemoved();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return presenceMap;
};

export const useChat = (currentMemberId: string, currentMemberName: string) => {
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<{ [roomId: string]: ChatMessage[] }>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    // Group messages: initial load once, then incremental updates.
    // This avoids rebuilding and diffing large arrays on every new message.
    const groupRef = ref(database, 'chat/group');
    const groupWindowQuery = query(groupRef, limitToLast(GROUP_MESSAGES_LIMIT));
    const groupLastOneQuery = query(groupRef, limitToLast(1));

    const upsertGroup = (id: string, data: any) => {
      const nextMsg = { id, ...(data as any) } as ChatMessage;

      setGroupMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          const next = [...prev, nextMsg];
          return next.length > GROUP_MESSAGES_LIMIT ? next.slice(-GROUP_MESSAGES_LIMIT) : next;
        }
        const next = prev.slice();
        next[idx] = { ...prev[idx], ...nextMsg };
        return next;
      });
    };

    // Use a flag to skip onChildAdded events until initial get() resolves,
    // preventing duplicate/race-condition renders that cause screen flicker.
    let initialLoadDone = false;

    void get(groupWindowQuery).then((snapshot) => {
      if (cancelled) return;
      if (!snapshot.exists()) {
        setGroupMessages([]);
      } else {
        const messages: ChatMessage[] = [];
        snapshot.forEach((child) => {
          const id = child.key as string;
          messages.push({ id, ...(child.val() as any) });
        });
        setGroupMessages(messages);
      }
      initialLoadDone = true;
    });

    const unsubGroupAdded = onChildAdded(groupLastOneQuery, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      // Skip initial seed event — get() already loaded the full window
      if (!initialLoadDone) return;
      upsertGroup(snap.key as string, snap.val());
    });

    const unsubGroupChanged = onChildChanged(groupWindowQuery, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      upsertGroup(snap.key as string, snap.val());
    });

    // Listen to members from Firestore
    const membersCol = collection(firestore, 'members');
    const unsubMembers = onSnapshot(membersCol, (snapshot) => {
      const memberList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];
      setMembers(memberList);
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

    // Listen to unread counts
    if (currentMemberId) {
      const unreadRef = ref(database, `unread/${currentMemberId}`);
      const unsubUnread = onValue(unreadRef, (snapshot) => {
        if (snapshot.exists()) {
          setUnreadCounts(snapshot.val());
        } else {
          setUnreadCounts({});
        }
      });

      return () => {
        cancelled = true;
        unsubGroupAdded();
        unsubGroupChanged();
        unsubMembers();
        unsubSettings();
        unsubUnread();
      };
    }

    return () => {
      cancelled = true;
      unsubGroupAdded();
      unsubGroupChanged();
      unsubMembers();
      unsubSettings();
    };
  }, [currentMemberId]);

  const getPrivateRoomId = (memberId1: string, memberId2: string) => {
    return [memberId1, memberId2].sort().join('_');
  };

  const loadPrivateMessages = useCallback((otherMemberId: string) => {
    const roomId = getPrivateRoomId(currentMemberId, otherMemberId);
    const roomRef = ref(database, `chat/private/${roomId}`);

    const windowQuery = query(roomRef, limitToLast(PRIVATE_MESSAGES_LIMIT));
    const lastOneQuery = query(roomRef, limitToLast(1));

    let cancelled = false;

    const upsertPrivate = (id: string, data: any) => {
      const nextMsg = { id, ...(data as any) } as ChatMessage;

      setPrivateMessages((prev) => {
        const room = prev[roomId] || [];
        const idx = room.findIndex((m) => m.id === id);

        let nextRoom: ChatMessage[];
        if (idx === -1) {
          const appended = [...room, nextMsg];
          nextRoom = appended.length > PRIVATE_MESSAGES_LIMIT ? appended.slice(-PRIVATE_MESSAGES_LIMIT) : appended;
        } else {
          nextRoom = room.slice();
          nextRoom[idx] = { ...room[idx], ...nextMsg };
        }

        return { ...prev, [roomId]: nextRoom };
      });
    };

    let pmInitialLoadDone = false;

    void get(windowQuery).then((snapshot) => {
      if (cancelled) return;
      if (!snapshot.exists()) {
        setPrivateMessages((prev) => ({ ...prev, [roomId]: [] }));
      } else {
        const messages: ChatMessage[] = [];
        snapshot.forEach((child) => {
          const id = child.key as string;
          messages.push({ id, ...(child.val() as any) });
        });
        setPrivateMessages((prev) => ({ ...prev, [roomId]: messages }));
      }
      pmInitialLoadDone = true;
    });

    const unsubAdded = onChildAdded(lastOneQuery, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      if (!pmInitialLoadDone) return;
      upsertPrivate(snap.key as string, snap.val());
    });

    const unsubChanged = onChildChanged(windowQuery, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      upsertPrivate(snap.key as string, snap.val());
    });

    return () => {
      cancelled = true;
      unsubAdded();
      unsubChanged();
    };
  }, [currentMemberId]);

  const markRoomRead = useCallback((roomId: string) => {
    if (!currentMemberId) return;
    const unreadRef = ref(database, `unread/${currentMemberId}/${roomId}`);
    remove(unreadRef);
  }, [currentMemberId]);

  const incrementUnread = useCallback(async (roomId: string, recipientIds: string[]) => {
    const targets = recipientIds.filter((rid) => rid !== currentMemberId);

    for (let i = 0; i < targets.length; i += UNREAD_CHUNK_SIZE) {
      const chunk = targets.slice(i, i + UNREAD_CHUNK_SIZE);
      await Promise.all(
        chunk.map((rid) => {
          const unreadRef = ref(database, `unread/${rid}/${roomId}`);
          return runTransaction(unreadRef, (current) => (current || 0) + 1);
        }),
      );

      // Let the UI breathe between chunks (important on first send / cold start)
      if (i + UNREAD_CHUNK_SIZE < targets.length) {
        await yieldToMain();
      }
    }
  }, [currentMemberId]);

  const sendGroupMessage = async (content: string, type: 'text' | 'emoji' | 'gif' = 'text', replyTo?: ChatMessage['replyTo']) => {
    if (!currentMemberId || !content.trim()) return;

    // 1) Write the message first (fast path)
    const groupRef = ref(database, 'chat/group');
    const msgData: any = {
      senderId: currentMemberId,
      senderName: currentMemberName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      type,
      roomId: 'group',
    };
    if (replyTo) msgData.replyTo = replyTo;

    await push(groupRef, msgData);

    // 2) Do metadata + unread fanout in the background so send never "lags"
    const lastMessage = type === 'gif' ? '📎 GIF' : content.trim().slice(0, 50);

    void (async () => {
      try {
        await set(ref(database, 'chatMeta/group'), {
          lastMessage,
          lastMessageTime: new Date().toISOString(),
          lastSenderId: currentMemberId,
          lastSenderName: currentMemberName,
        });
      } catch (err) {
        console.error('Failed to update chat meta (group)', err);
      }
    })();

    const otherIds = members.filter((m) => m.id !== currentMemberId).map((m) => m.id);
    void incrementUnread('group', otherIds).catch((err) => {
      console.error('Failed to increment unread (group)', err);
    });
  };

  const sendPrivateMessage = async (otherMemberId: string, content: string, type: 'text' | 'emoji' | 'gif' = 'text', replyTo?: ChatMessage['replyTo']) => {
    if (!currentMemberId || !content.trim()) return;

    const roomId = getPrivateRoomId(currentMemberId, otherMemberId);

    // 1) Write the message first (fast path)
    const privateRef = ref(database, `chat/private/${roomId}`);
    const msgData: any = {
      senderId: currentMemberId,
      senderName: currentMemberName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      type,
      roomId,
    };
    if (replyTo) msgData.replyTo = replyTo;

    await push(privateRef, msgData);

    // 2) Background updates
    const lastMessage = type === 'gif' ? '📎 GIF' : content.trim().slice(0, 50);

    void (async () => {
      try {
        await set(ref(database, `chatMeta/${roomId}`), {
          lastMessage,
          lastMessageTime: new Date().toISOString(),
          lastSenderId: currentMemberId,
          lastSenderName: currentMemberName,
        });
      } catch (err) {
        console.error('Failed to update chat meta (private)', err);
      }
    })();

    void incrementUnread(roomId, [otherMemberId]).catch((err) => {
      console.error('Failed to increment unread (private)', err);
    });
  };

  const addReaction = async (messageId: string, emoji: string, roomPath: string) => {
    const reactionRef = ref(database, `${roomPath}/${messageId}/reactions/${emoji}`);
    await runTransaction(reactionRef, (current: string[] | null) => {
      const list = current || [];
      if (list.includes(currentMemberId)) {
        return list.filter(id => id !== currentMemberId);
      } else {
        return [...list, currentMemberId];
      }
    });
  };

  const deleteMessage = async (messageId: string, roomPath: string) => {
    const msgRef = ref(database, `${roomPath}/${messageId}`);
    await update(msgRef, {
      content: '',
      type: 'deleted',
      reactions: null,
      replyTo: null,
    });
  };

  return {
    groupMessages,
    privateMessages,
    members: members.filter(m => m.id !== currentMemberId),
    chatEnabled,
    unreadCounts,
    sendGroupMessage,
    sendPrivateMessage,
    loadPrivateMessages,
    getPrivateRoomId,
    markRoomRead,
    addReaction,
    deleteMessage,
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

        const myNotifs = allNotifs.filter(n =>
          n.recipientId === 'all' || n.recipientId === memberId
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(myNotifs);
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
      recipientId,
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

// Chat metadata hook for last messages (incremental + batched)
export const useChatMeta = () => {
  const [meta, setMeta] = useState<Record<string, any>>({});
  const bufRef = useRef<Record<string, any>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const metaRef = ref(database, 'chatMeta');
    let cancelled = false;

    const flush = () => {
      setMeta({ ...bufRef.current });
    };

    void get(metaRef).then((snapshot) => {
      if (cancelled) return;
      bufRef.current = (snapshot.val() || {}) as Record<string, any>;
      scheduleRaf(rafRef, flush);
    });

    const upsert = (roomId: string, value: any) => {
      bufRef.current[roomId] = value;
      scheduleRaf(rafRef, flush);
    };

    const unsubAdded = onChildAdded(metaRef, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      upsert(snap.key as string, snap.val());
    });

    const unsubChanged = onChildChanged(metaRef, (snap) => {
      if (cancelled) return;
      if (!snap.exists()) return;
      upsert(snap.key as string, snap.val());
    });

    const unsubRemoved = onChildRemoved(metaRef, (snap) => {
      if (cancelled) return;
      const id = snap.key as string;
      delete bufRef.current[id];
      scheduleRaf(rafRef, flush);
    });

    return () => {
      cancelled = true;
      unsubAdded();
      unsubChanged();
      unsubRemoved();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return meta;
};
