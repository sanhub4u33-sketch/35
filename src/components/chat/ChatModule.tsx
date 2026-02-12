import { useState, useEffect, useRef, useCallback, TouchEvent as ReactTouchEvent } from 'react';
import { X, Send, Users, MessageCircle, Smile, Image as ImageIcon, Reply, Trash2, Loader2, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat, usePresence, usePresenceList, useTypingIndicator, useChatMeta } from '@/hooks/useChatAndNotifications';
import { ChatMessage, Member } from '@/types/library';
import { format, parseISO, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

interface ChatModuleProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
  visible?: boolean;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
const MESSAGES_PER_PAGE = 200;

const ChatModule = ({ memberId, memberName, onClose, visible = true }: ChatModuleProps) => {
  const {
    groupMessages,
    privateMessages,
    members,
    unreadCounts,
    sendGroupMessage,
    sendPrivateMessage,
    loadPrivateMessages,
    getPrivateRoomId,
    markRoomRead,
    addReaction,
    deleteMessage,
  } = useChat(memberId, memberName);

  usePresence(memberId);
  const presenceMap = usePresenceList();
  const { setTyping, clearTyping } = useTypingIndicator(memberId, memberName);
  const chatMeta = useChatMeta();

  const [activeTab, setActiveTab] = useState<'group' | 'private'>('group');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const selectedMemberRef = useRef<Member | null>(null);
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage['replyTo'] | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(MESSAGES_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [reactionDetail, setReactionDetail] = useState<{ msgId: string; emoji: string } | null>(null);
  

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; msgId: string; time: number } | null>(null);
  const [swipeState, setSwipeState] = useState<{ msgId: string; offset: number } | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;


  // Back button support for DM navigation
  useEffect(() => {
    const handlePopState = () => {
      if (selectedMemberRef.current) {
        setSelectedMember(null);
        selectedMemberRef.current = null;
      } else {
        onCloseRef.current();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectMember = useCallback((m: Member) => {
    setSelectedMember(m);
    selectedMemberRef.current = m;
    window.history.pushState({ chatDm: true }, '');
  }, []);


  // Lock body scroll and prevent background interaction — only when visible
  useEffect(() => {
    if (!visible) return;
    const orig = document.body.style.cssText;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.cssText = orig;
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  // Handle visual viewport resize (mobile keyboard)
  useEffect(() => {
    const handleResize = () => {
      const vv = window.visualViewport;
      if (vv) {
        const root = document.getElementById('chat-root');
        if (root) {
          root.style.height = `${vv.height}px`;
          root.style.top = `${vv.offsetTop}px`;
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Track previous message count to only scroll on new messages
  const prevMsgCountRef = useRef(0);

  // Scroll to bottom only when new messages arrive, not on every re-render
  useEffect(() => {
    const currentMessages = activeTab === 'group'
      ? groupMessages
      : selectedMember
        ? privateMessages[getPrivateRoomId(memberId, selectedMember.id)] || []
        : [];
    const count = currentMessages.length;

    if (count !== prevMsgCountRef.current) {
      prevMsgCountRef.current = count;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [groupMessages, privateMessages, selectedMember, activeTab, memberId, getPrivateRoomId]);

  // Reset count and scroll when switching views
  useEffect(() => {
    prevMsgCountRef.current = 0;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    });
  }, [selectedMember, activeTab]);

  useEffect(() => {
    if (selectedMember) {
      const unsub = loadPrivateMessages(selectedMember.id);
      return () => unsub();
    }
  }, [selectedMember, loadPrivateMessages]);

  useEffect(() => {
    const roomId =
      activeTab === 'group'
        ? 'group'
        : selectedMember
          ? getPrivateRoomId(memberId, selectedMember.id)
          : null;

    if (!roomId) return;

    // Only write when there's something to clear (avoids a write on every message render)
    if ((unreadCounts[roomId] || 0) > 0) {
      markRoomRead(roomId);
    }
  }, [activeTab, selectedMember, unreadCounts, markRoomRead, getPrivateRoomId, memberId]);

  useEffect(() => {
    setDisplayCount(MESSAGES_PER_PAGE);
  }, [activeTab, selectedMember]);

  const getCurrentRoomId = () => {
    if (activeTab === 'group') return 'group';
    if (selectedMember) return getPrivateRoomId(memberId, selectedMember.id);
    return '';
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;

    const currentReply = replyTo || undefined;

    setMessage('');
    setReplyTo(null);
    clearTyping();
    requestAnimationFrame(() => inputRef.current?.focus());

    const p =
      activeTab === 'group'
        ? sendGroupMessage(text, 'text', currentReply)
        : selectedMember
          ? sendPrivateMessage(selectedMember.id, text, 'text', currentReply)
          : Promise.resolve();

    void p.catch((err) => {
      console.error('Failed to send message', err);
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    const p =
      activeTab === 'group'
        ? sendGroupMessage(gifUrl, 'gif')
        : selectedMember
          ? sendPrivateMessage(selectedMember.id, gifUrl, 'gif')
          : Promise.resolve();

    setShowGif(false);

    void p.catch((err) => {
      console.error('Failed to send GIF', err);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    const roomId = getCurrentRoomId();
    if (roomId && e.target.value.trim()) {
      setTyping(roomId);
    } else {
      clearTyping();
    }
  };

  // Touch handling - only swipe the touched message
  const handleTouchStart = (e: ReactTouchEvent, msgId: string) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      msgId,
      time: Date.now(),
    };
    setSwipeState(null);
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMsg(msgId);
      if (navigator.vibrate) navigator.vibrate(50);
      touchStartRef.current = null;
    }, 600);
  };

  const handleTouchMove = (e: ReactTouchEvent, msgId: string) => {
    if (!touchStartRef.current || touchStartRef.current.msgId !== msgId) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (Math.abs(dx) > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
    if (dx > 0 && dy < 40) {
      const offset = Math.min(dx, 80);
      setSwipeState({ msgId, offset });
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent, msg: ChatMessage) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!touchStartRef.current) {
      setSwipeState(null);
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    if (dx > 60 && dy < 40 && touchStartRef.current.msgId === msg.id) {
      setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content.slice(0, 80) });
      inputRef.current?.focus();
      if (navigator.vibrate) navigator.vibrate(30);
    }
    setSwipeState(null);
    touchStartRef.current = null;
  };

  const handleDeleteForEveryone = async (msg: ChatMessage) => {
    const roomPath = activeTab === 'group'
      ? 'chat/group'
      : `chat/private/${getPrivateRoomId(memberId, selectedMember!.id)}`;
    await deleteMessage(msg.id, roomPath);
    setLongPressMsg(null);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const roomPath = activeTab === 'group'
      ? 'chat/group'
      : `chat/private/${getPrivateRoomId(memberId, selectedMember!.id)}`;
    addReaction(messageId, emoji, roomPath);
    setShowReactions(null);
  };

  const getTypingUsers = (): string[] => {
    const roomId = getCurrentRoomId();
    if (!roomId) return [];
    const typingUsers: string[] = [];
    const now = Date.now();
    for (const [uid, data] of Object.entries(presenceMap)) {
      if (uid === memberId) continue;
      if (data.typing && data.typing.roomId === roomId) {
        const typingTime = new Date(data.typing.timestamp).getTime();
        if (now - typingTime < 5000) {
          typingUsers.push((data.typing as any).name || 'Someone');
        }
      }
    }
    return typingUsers;
  };

  const getLastSeenText = (mid: string): string => {
    const p = presenceMap[mid];
    if (!p) return '';
    if (p.online) return 'online';
    if (p.lastSeen) {
      return `last seen ${formatDistanceToNow(parseISO(p.lastSeen), { addSuffix: true })}`;
    }
    return '';
  };

  const getMemberName = (uid: string): string => {
    if (uid === memberId) return 'You';
    const m = members.find(m => m.id === uid);
    return m?.name || uid;
  };

  const allMessages = activeTab === 'group'
    ? groupMessages
    : selectedMember
      ? privateMessages[getPrivateRoomId(memberId, selectedMember.id)] || []
      : [];

  const hasMore = allMessages.length > displayCount;
  const currentMessages = allMessages.slice(-displayCount);

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + MESSAGES_PER_PAGE);
      setLoadingMore(false);
    }, 300);
  };

  const typingUsers = getTypingUsers();

  // Group messages by date
  const getDateLabel = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM yyyy');
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = Object.values(presenceMap).filter(p => p.online).length;

  // Scroll to bottom when chat becomes visible
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [visible]);

  return (
    <>
      {/* Opaque backdrop to prevent dashboard bleed-through during re-renders */}
      <div className="fixed inset-0 z-[99] bg-background" aria-hidden="true" style={{ display: visible ? undefined : 'none' }} />
      <div
        id="chat-root"
        className="fixed inset-0 z-[100] flex flex-col bg-background sm:inset-auto sm:right-4 sm:bottom-4 sm:w-[420px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border overflow-hidden"
        style={{ height: '100dvh', contain: 'layout paint', isolation: 'isolate', display: visible ? undefined : 'none' }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
      >
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 bg-white text-foreground dark:bg-card dark:text-card-foreground border-b border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 min-h-[56px]">
          {activeTab === 'private' && selectedMember ? (
            <>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                  {selectedMember.profilePic ? (
                    <img src={selectedMember.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedMember.name.charAt(0).toUpperCase()
                  )}
                </div>
                {presenceMap[selectedMember.id]?.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-card" style={{ backgroundColor: 'hsl(var(--success))' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-sans font-semibold text-sm leading-tight truncate">{selectedMember.name}</h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {typingUsers.length > 0 ? (
                    <span className="text-primary animate-pulse">typing...</span>
                  ) : getLastSeenText(selectedMember.id)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                {activeTab === 'group' ? <Users className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-sans font-semibold text-sm leading-tight">
                  {activeTab === 'group' ? 'Group Chat' : 'Messages'}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {activeTab === 'group' ? (
                    typingUsers.length > 0 ? (
                      <span className="text-primary animate-pulse">
                        {typingUsers[0]} is typing...
                      </span>
                    ) : (
                      `${onlineCount} online`
                    )
                  ) : (
                    `${members.length} contacts`
                  )}
                </p>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground hover:bg-secondary flex-shrink-0"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        {!(activeTab === 'private' && selectedMember) && (
          <div className="flex bg-secondary/30">
            <button
              className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all relative ${
                activeTab === 'group'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setActiveTab('group'); setSelectedMember(null); selectedMemberRef.current = null; }}
            >
              <span className="flex items-center justify-center gap-1.5">
                Group
                {(unreadCounts['group'] || 0) > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCounts['group']}
                  </span>
                )}
              </span>
              {activeTab === 'group' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-full" />
              )}
            </button>
            <button
              className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all relative ${
                activeTab === 'private'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('private')}
            >
              <span className="flex items-center justify-center gap-1.5">
                Chats
              </span>
              {activeTab === 'private' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-primary rounded-full" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Long press overlay */}
      {longPressMsg && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm" onClick={() => setLongPressMsg(null)}>
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card border border-border rounded-2xl shadow-2xl p-1.5 min-w-[220px] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {allMessages.find(m => m.id === longPressMsg)?.senderId === memberId && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                onClick={() => {
                  const msg = allMessages.find(m => m.id === longPressMsg);
                  if (msg) handleDeleteForEveryone(msg);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete for everyone</span>
              </button>
            )}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
              onClick={() => {
                const msg = allMessages.find(m => m.id === longPressMsg);
                if (msg) {
                  setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content.slice(0, 80) });
                  inputRef.current?.focus();
                }
                setLongPressMsg(null);
              }}
            >
              <Reply className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium text-foreground">Reply</span>
            </button>
          </div>
        </div>
      )}

      {/* Reaction detail popup - shows who reacted */}
      {reactionDetail && (
        <div className="fixed inset-0 z-[115] flex items-end justify-center" onClick={() => setReactionDetail(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-card border border-border rounded-t-2xl shadow-2xl w-full max-w-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{reactionDetail.emoji}</span>
              <h4 className="text-sm font-semibold text-foreground">Reactions</h4>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {(() => {
                const msg = allMessages.find(m => m.id === reactionDetail.msgId);
                const userIds = msg?.reactions?.[reactionDetail.emoji] || [];
                return userIds.map((uid: string) => (
                  <div key={uid} className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                      {getMemberName(uid).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">{getMemberName(uid)}</span>
                  </div>
                ));
              })()}
            </div>
            <button
              className="mt-3 w-full py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium"
              onClick={() => setReactionDetail(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'private' && !selectedMember ? (
          /* === CONTACTS LIST === */
          <div className="h-full flex flex-col">
            {/* Search bar */}
            <div className="flex-shrink-0 px-3 py-2 bg-secondary/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background pl-9 pr-3 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="py-1">
                {filteredMembers.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">No contacts found</p>
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const roomId = getPrivateRoomId(memberId, m.id);
                    const meta = chatMeta[roomId];
                    const unread = unreadCounts[roomId] || 0;
                    const isOnline = presenceMap[m.id]?.online;

                    return (
                      <button
                        key={m.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary/70 transition-colors text-left"
                        onClick={() => { selectMember(m); setSearchQuery(''); }}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-primary-foreground font-semibold overflow-hidden">
                            {m.profilePic ? (
                              <img src={m.profilePic} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{m.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background" style={{ backgroundColor: 'hsl(var(--success))' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 border-b border-border/30 pb-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground truncate text-[15px]">{m.name}</p>
                            {meta?.lastMessageTime && (
                              <span className={`text-[11px] flex-shrink-0 ml-2 ${unread > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {format(parseISO(meta.lastMessageTime), 'h:mm a')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[13px] text-muted-foreground truncate pr-2">
                              {meta ? `${meta.lastSenderName === memberName ? 'You' : meta.lastSenderName}: ${meta.lastMessage}` : m.email}
                            </p>
                            {unread > 0 && (
                              <span className="min-w-[20px] h-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* === MESSAGES VIEW === */
          <div
            ref={messagesContainerRef}
            className="h-full overflow-y-auto overscroll-contain"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          >
            <div className="px-3 py-2 space-y-0.5 min-h-full flex flex-col justify-end">
              {/* Load more */}
              {hasMore && (
                <div className="text-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-xs text-muted-foreground hover:text-foreground rounded-full bg-secondary/60 h-7 px-4"
                  >
                    {loadingMore && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Load older messages
                  </Button>
                </div>
              )}

              {currentMessages.length === 0 ? (
                <div className="py-16 text-center flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-primary/60" />
                  </div>
                  <p className="text-foreground font-medium text-base">No messages yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Say hello! 👋</p>
                </div>
              ) : (
                <>
                  {currentMessages.map((msg, idx) => {
                    const isOwn = msg.senderId === memberId;
                    const offset = swipeState?.msgId === msg.id ? swipeState.offset : 0;
                    const isDeleted = msg.type === 'deleted' as any;
                    const prevMsg = idx > 0 ? currentMessages[idx - 1] : null;
                    const showDateSep = !prevMsg || getDateLabel(msg.timestamp) !== getDateLabel(prevMsg.timestamp);
                    const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId && !showDateSep;

                    return (
                      <div key={msg.id}>
                        {/* Date separator */}
                        {showDateSep && (
                          <div className="flex items-center justify-center py-3">
                            <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full font-medium shadow-sm">
                              {getDateLabel(msg.timestamp)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-0.5' : 'mt-2'} relative select-none`}
                          style={{
                            transform: `translateX(${offset}px)`,
                            transition: offset === 0 ? 'transform 0.2s ease-out' : 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none',
                          }}
                          onTouchStart={(e) => handleTouchStart(e, msg.id)}
                          onTouchMove={(e) => handleTouchMove(e, msg.id)}
                          onTouchEnd={(e) => handleTouchEnd(e, msg)}
                        >
                          {/* Swipe reply indicator */}
                          {offset > 20 && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center" style={{ opacity: Math.min(offset / 60, 1) }}>
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Reply className="w-4 h-4 text-primary" />
                              </div>
                            </div>
                          )}

                          <div className={`max-w-[80%] relative group`}>
                            {/* Sender name in group */}
                            {!isOwn && activeTab === 'group' && !isConsecutive && (
                              <p className="text-[11px] text-primary font-semibold mb-0.5 ml-1">{msg.senderName}</p>
                            )}

                            {/* Reply preview */}
                            {msg.replyTo && !isDeleted && (
                              <div className={`text-[11px] px-3 py-1.5 rounded-t-lg border-l-[3px] border-primary ${
                                isOwn ? 'bg-primary/30' : 'bg-secondary/80'
                              }`}>
                                <span className="font-semibold text-primary text-[10px]">{msg.replyTo.senderName}</span>
                                <p className="truncate text-foreground/70">{msg.replyTo.content}</p>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`px-3 py-1.5 relative ${
                                isDeleted
                                  ? 'bg-secondary/40 border border-dashed border-border rounded-xl'
                                  : isOwn
                                    ? `bg-primary text-primary-foreground shadow-sm ${
                                        msg.replyTo ? 'rounded-b-xl rounded-tr-xl' :
                                        isConsecutive ? 'rounded-xl rounded-tr-sm' : 'rounded-xl rounded-tr-sm'
                                      }`
                                    : `bg-card text-foreground shadow-sm border border-border/30 ${
                                        msg.replyTo ? 'rounded-b-xl rounded-tl-xl' :
                                        isConsecutive ? 'rounded-xl rounded-tl-sm' : 'rounded-xl rounded-tl-sm'
                                      }`
                              }`}
                              onDoubleClick={() => !isDeleted && setShowReactions(showReactions === msg.id ? null : msg.id)}
                            >
                              {isDeleted ? (
                                <p className="text-sm text-muted-foreground italic py-0.5">🚫 This message was deleted</p>
                              ) : msg.type === 'gif' ? (
                                <img src={msg.content} alt="GIF" className="max-w-full rounded-lg max-h-48 pointer-events-none" />
                              ) : (
                                <div className="flex items-end gap-2">
                                  <p className="text-[14.5px] leading-[1.35] whitespace-pre-wrap break-words flex-1">{msg.content}</p>
                                  <span className={`text-[10px] flex-shrink-0 translate-y-0.5 ${
                                    isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
                                  }`}>
                                    {format(parseISO(msg.timestamp), 'h:mm a')}
                                  </span>
                                </div>
                              )}
                              {(isDeleted || msg.type === 'gif') && (
                                <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground/70'}`}>
                                  {format(parseISO(msg.timestamp), 'h:mm a')}
                                </p>
                              )}
                            </div>

                            {/* Reactions - tap to see who reacted */}
                            {!isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                  if (!userIds || userIds.length === 0) return null;
                                  const hasReacted = userIds.includes(memberId);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => setReactionDetail({ msgId: msg.id, emoji })}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleReaction(msg.id, emoji);
                                      }}
                                      className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                        hasReacted
                                          ? 'bg-primary/15 border-primary/30'
                                          : 'bg-card border-border/50 hover:bg-secondary'
                                      }`}
                                    >
                                      {emoji} {userIds.length > 1 ? userIds.length : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Quick reactions popup */}
                            {showReactions === msg.id && (
                              <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-9 bg-card border border-border rounded-full shadow-xl px-1.5 py-1 flex gap-0.5 z-10 animate-scale-in`}>
                                {QUICK_REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="hover:scale-125 transition-transform text-base px-1 active:scale-90"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Reply on hover (desktop) */}
                            {!isDeleted && (
                              <button
                                className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-secondary`}
                                onClick={() => setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content.slice(0, 80) })}
                              >
                                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start mt-1">
                  <div className="bg-card border border-border/30 rounded-xl rounded-bl-sm px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      {activeTab === 'group' && (
                        <span className="text-[10px] text-primary font-medium mr-1">{typingUsers[0]}</span>
                      )}
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>
        )}
      </div>

      {/* ===== INPUT AREA ===== */}
      {(activeTab === 'group' || selectedMember) && (
        <div className="flex-shrink-0 bg-background border-t border-border/50">
          {/* Emoji/GIF pickers */}
          {showEmoji && (
            <div className="absolute bottom-16 left-2 z-10">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            </div>
          )}
          {showGif && (
            <div className="absolute bottom-16 left-2 z-10">
              <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />
            </div>
          )}

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center justify-between bg-secondary/60 px-3 py-2 border-l-[3px] border-primary mx-2 mt-2 rounded-r-lg">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-primary">{replyTo.senderName}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 hover:bg-secondary" onClick={() => setReplyTo(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-1.5 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full flex-shrink-0 ${showEmoji ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              >
                <Smile className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full flex-shrink-0 ${showGif ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
            </div>

            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message"
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 h-10 rounded-full bg-secondary/50 border border-border/50 px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:bg-secondary/70 transition-colors"
            />

            <Button
              size="icon"
              className={`h-10 w-10 rounded-full flex-shrink-0 transition-all duration-200 ${
                message.trim()
                  ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 scale-100'
                  : 'bg-primary/30 text-primary-foreground/50 cursor-not-allowed scale-95'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleSend}
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ChatModule;
