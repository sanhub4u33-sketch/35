 import { useState, useEffect, useRef, useCallback } from 'react';
 import { X, Send, Users, MessageCircle, Smile, ArrowLeft, Image as ImageIcon } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useChat } from '@/hooks/useChatAndNotifications';
 import { Member } from '@/types/library';
 import { format, parseISO } from 'date-fns';
 import EmojiPicker from './EmojiPicker';
 import GifPicker from './GifPicker';
 
 interface ChatModuleProps {
   memberId: string;
   memberName: string;
   onClose: () => void;
 }
 
 const ChatModule = ({ memberId, memberName, onClose }: ChatModuleProps) => {
   const {
     groupMessages,
     privateMessages,
     members,
     sendGroupMessage,
     sendPrivateMessage,
     loadPrivateMessages,
     getPrivateRoomId
   } = useChat(memberId, memberName);
 
   const [activeTab, setActiveTab] = useState<'group' | 'private'>('group');
   const [selectedMember, setSelectedMember] = useState<Member | null>(null);
   const [message, setMessage] = useState('');
   const [showEmoji, setShowEmoji] = useState(false);
   const [showGif, setShowGif] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const textareaRef = useRef<HTMLTextAreaElement>(null);
 
   useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [groupMessages, privateMessages, selectedMember]);
 
   useEffect(() => {
     if (selectedMember) {
       const unsub = loadPrivateMessages(selectedMember.id);
       return () => unsub();
     }
   }, [selectedMember, loadPrivateMessages]);
 
   const handleSend = async () => {
     if (!message.trim()) return;
     
     if (activeTab === 'group') {
       await sendGroupMessage(message);
     } else if (selectedMember) {
       await sendPrivateMessage(selectedMember.id, message);
     }
     setMessage('');
     // Reset textarea height
     if (textareaRef.current) {
       textareaRef.current.style.height = 'auto';
     }
   };
 
   const handleEmojiSelect = (emoji: string) => {
     setMessage(prev => prev + emoji);
     setShowEmoji(false);
   };
 
   const handleGifSelect = async (gifUrl: string) => {
     if (activeTab === 'group') {
       await sendGroupMessage(gifUrl, 'gif');
     } else if (selectedMember) {
       await sendPrivateMessage(selectedMember.id, gifUrl, 'gif');
     }
     setShowGif(false);
   };
 
   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
   const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setMessage(e.target.value);
     // Auto-resize textarea
     const target = e.target;
     target.style.height = 'auto';
     target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
   };
 
   const currentMessages = activeTab === 'group' 
     ? groupMessages 
     : selectedMember 
       ? privateMessages[getPrivateRoomId(memberId, selectedMember.id)] || []
       : [];
 
   return (
     <div className="fixed inset-0 z-50 bg-background flex flex-col sm:inset-auto sm:right-4 sm:bottom-4 sm:w-[380px] sm:h-[520px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border animate-scale-in overflow-hidden">
       {/* Premium Header */}
       <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 via-secondary/50 to-primary/10 backdrop-blur-sm">
         <div className="flex items-center gap-2">
           {activeTab === 'private' && selectedMember && (
             <Button 
               variant="ghost" 
               size="icon" 
               className="h-8 w-8 rounded-lg hover:bg-secondary/80"
               onClick={() => setSelectedMember(null)}
             >
               <ArrowLeft className="w-4 h-4" />
             </Button>
           )}
           <div className="flex items-center gap-3">
             {activeTab === 'private' && selectedMember && (
               <div className="w-8 h-8 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-sm font-medium overflow-hidden">
                 {selectedMember.profilePic ? (
                   <img src={selectedMember.profilePic} alt={selectedMember.name} className="w-full h-full object-cover" />
                 ) : (
                   selectedMember.name.charAt(0).toUpperCase()
                 )}
               </div>
             )}
             <h3 className="font-display font-semibold text-foreground">
             {activeTab === 'group' 
               ? 'Group Chat' 
               : selectedMember 
                 ? selectedMember.name 
                 : 'Direct Messages'}
             </h3>
           </div>
         </div>
         <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-secondary/80">
           <X className="w-5 h-5" />
         </Button>
       </div>
 
       {/* Modern Tabs */}
       <div className="flex bg-secondary/30 px-2 py-1.5 gap-1">
         <button
           className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${
             activeTab === 'group' 
               ? 'bg-background text-foreground shadow-sm' 
               : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
           }`}
           onClick={() => { setActiveTab('group'); setSelectedMember(null); }}
         >
           <Users className="w-4 h-4" />
           Group
         </button>
         <button
           className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${
             activeTab === 'private' 
               ? 'bg-background text-foreground shadow-sm' 
               : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
           }`}
           onClick={() => setActiveTab('private')}
         >
           <MessageCircle className="w-4 h-4" />
           Direct
         </button>
       </div>
 
       {/* Content */}
       <div className="flex-1 overflow-hidden">
         {activeTab === 'private' && !selectedMember ? (
           // Premium member list for private chat
           <ScrollArea className="h-full">
             <div className="p-3 space-y-1">
               {members.length === 0 ? (
                 <div className="py-12 text-center">
                   <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                     <Users className="w-6 h-6 text-muted-foreground" />
                   </div>
                   <p className="text-muted-foreground text-sm font-medium">No other members yet</p>
                 </div>
               ) : (
                 members.map((m) => (
                   <button
                     key={m.id}
                     className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/70 transition-all duration-200 text-left group"
                     onClick={() => setSelectedMember(m)}
                   >
                     <div className="w-11 h-11 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-medium overflow-hidden ring-2 ring-background shadow-md group-hover:ring-primary/30 transition-all">
                       {m.profilePic ? (
                         <img src={m.profilePic} alt={m.name} className="w-full h-full rounded-full object-cover" />
                       ) : (
                         <span className="text-lg">{m.name.charAt(0).toUpperCase()}</span>
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-medium text-foreground truncate">{m.name}</p>
                       <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                     </div>
                     <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 ))
               )}
             </div>
           </ScrollArea>
         ) : (
           // Premium messages view
           <ScrollArea className="h-full">
             <div className="p-4 space-y-3">
               {currentMessages.length === 0 ? (
                 <div className="py-12 text-center">
                   <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                     <MessageCircle className="w-7 h-7 text-primary" />
                   </div>
                   <p className="text-foreground font-medium">No messages yet</p>
                   <p className="text-muted-foreground text-sm mt-1">Be the first to say hello! 👋</p>
                 </div>
               ) : (
                 currentMessages.map((msg) => {
                   const isOwn = msg.senderId === memberId;
                   return (
                     <div 
                       key={msg.id} 
                       className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                     >
                       <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                         {!isOwn && activeTab === 'group' && (
                           <p className="text-xs text-muted-foreground mb-1.5 font-medium ml-1">{msg.senderName}</p>
                         )}
                         <div className={`rounded-2xl px-4 py-2.5 ${
                           isOwn 
                             ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-md' 
                             : 'bg-secondary/80 text-foreground rounded-bl-md shadow-sm'
                         }`}>
                           {msg.type === 'gif' ? (
                             <img src={msg.content} alt="GIF" className="max-w-full rounded-xl" />
                           ) : (
                             <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                           )}
                         </div>
                         <p className={`text-[10px] text-muted-foreground/70 mt-1.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                           {format(parseISO(msg.timestamp), 'h:mm a')}
                         </p>
                       </div>
                     </div>
                   );
                 })
               )}
               <div ref={messagesEndRef} />
             </div>
           </ScrollArea>
         )}
       </div>
 
       {/* Premium Input area - only show if in group or selected private chat */}
       {(activeTab === 'group' || selectedMember) && (
         <div className="p-3 border-t border-border bg-secondary/20 relative">
           {showEmoji && (
             <div className="absolute bottom-full left-2 mb-2 z-10">
               <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
             </div>
           )}
           {showGif && (
             <div className="absolute bottom-full left-2 mb-2 z-10">
               <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />
             </div>
           )}
           <div className="flex items-end gap-2 bg-background rounded-2xl border border-border/80 p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
             {/* Action buttons */}
             <div className="flex items-center gap-0.5 pb-1">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className={`h-8 w-8 rounded-lg flex-shrink-0 transition-all ${showEmoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                 onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
               >
                 <Smile className="w-5 h-5" />
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className={`h-8 w-8 rounded-lg flex-shrink-0 transition-all ${showGif ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                 onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
               >
                 <ImageIcon className="w-5 h-5" />
               </Button>
             </div>
 
             {/* Text input */}
             <Textarea
               ref={textareaRef}
               placeholder="Type a message..."
               value={message}
               onChange={handleTextareaChange}
               onKeyDown={handleKeyDown}
               className="flex-1 min-h-[36px] max-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 text-[15px] placeholder:text-muted-foreground/60"
               rows={1}
             />
 
             {/* Send button */}
             <Button 
               size="icon" 
               className={`h-9 w-9 rounded-xl flex-shrink-0 transition-all duration-200 ${
                 message.trim() 
                   ? 'btn-primary scale-100' 
                   : 'bg-secondary text-muted-foreground scale-95 cursor-not-allowed'
               }`}
               onClick={handleSend}
               disabled={!message.trim()}
             >
               <Send className="w-4 h-4" />
             </Button>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default ChatModule;