 import { useState, useMemo } from 'react';
 import { X, Search } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 
 interface EmojiPickerProps {
   onSelect: (emoji: string) => void;
   onClose: () => void;
 }
 
 // Categorized emoji list with keywords for search
 const EMOJI_DATA = [
   { emoji: '😀', keywords: ['grinning', 'smile', 'happy'] },
   { emoji: '😁', keywords: ['grin', 'happy', 'smile'] },
   { emoji: '😂', keywords: ['joy', 'laugh', 'tears', 'funny'] },
   { emoji: '🤣', keywords: ['rofl', 'laugh', 'funny'] },
   { emoji: '😃', keywords: ['smile', 'happy', 'joy'] },
   { emoji: '😄', keywords: ['smile', 'happy', 'grin'] },
   { emoji: '😅', keywords: ['sweat', 'smile', 'nervous'] },
   { emoji: '😆', keywords: ['laugh', 'satisfied'] },
   { emoji: '😉', keywords: ['wink', 'flirt'] },
   { emoji: '😊', keywords: ['blush', 'smile', 'happy'] },
   { emoji: '😋', keywords: ['yummy', 'delicious', 'tongue'] },
   { emoji: '😎', keywords: ['cool', 'sunglasses'] },
   { emoji: '😍', keywords: ['love', 'heart', 'eyes'] },
   { emoji: '😘', keywords: ['kiss', 'love', 'heart'] },
   { emoji: '🥰', keywords: ['love', 'hearts', 'adore'] },
   { emoji: '😗', keywords: ['kiss', 'whistle'] },
   { emoji: '😙', keywords: ['kiss', 'smile'] },
   { emoji: '🥲', keywords: ['happy', 'tear', 'proud'] },
   { emoji: '😚', keywords: ['kiss', 'blush'] },
   { emoji: '🙂', keywords: ['smile', 'slight'] },
   { emoji: '🤗', keywords: ['hug', 'hugging'] },
   { emoji: '🤩', keywords: ['star', 'eyes', 'excited'] },
   { emoji: '🤔', keywords: ['think', 'thinking', 'hmm'] },
   { emoji: '🤨', keywords: ['eyebrow', 'skeptical'] },
   { emoji: '😐', keywords: ['neutral', 'meh'] },
   { emoji: '😑', keywords: ['expressionless'] },
   { emoji: '😶', keywords: ['silent', 'mute', 'quiet'] },
   { emoji: '🙄', keywords: ['eye', 'roll', 'annoyed'] },
   { emoji: '😏', keywords: ['smirk', 'smug'] },
   { emoji: '😣', keywords: ['persevere', 'struggle'] },
   { emoji: '😥', keywords: ['sad', 'disappointed', 'relieved'] },
   { emoji: '😮', keywords: ['wow', 'open', 'mouth'] },
   { emoji: '🤐', keywords: ['quiet', 'zip', 'mouth'] },
   { emoji: '😯', keywords: ['hushed', 'surprised'] },
   { emoji: '😪', keywords: ['sleepy', 'tired'] },
   { emoji: '😫', keywords: ['tired', 'exhausted'] },
   { emoji: '🥱', keywords: ['yawn', 'tired', 'sleepy'] },
   { emoji: '😴', keywords: ['sleep', 'zzz', 'tired'] },
   { emoji: '😌', keywords: ['relieved', 'calm', 'peaceful'] },
   { emoji: '😛', keywords: ['tongue', 'playful'] },
   { emoji: '😜', keywords: ['wink', 'tongue', 'crazy'] },
   { emoji: '😝', keywords: ['tongue', 'taste', 'squint'] },
   { emoji: '🤤', keywords: ['drool', 'hungry', 'yummy'] },
   { emoji: '😒', keywords: ['unamused', 'meh', 'bored'] },
   { emoji: '😓', keywords: ['sweat', 'downcast'] },
   { emoji: '😔', keywords: ['sad', 'pensive', 'down'] },
   { emoji: '😕', keywords: ['confused', 'unsure'] },
   { emoji: '🙃', keywords: ['upside', 'silly', 'sarcasm'] },
   { emoji: '🤑', keywords: ['money', 'rich', 'dollar'] },
   { emoji: '😲', keywords: ['astonished', 'shocked', 'wow'] },
   { emoji: '😢', keywords: ['cry', 'sad', 'tear'] },
   { emoji: '😭', keywords: ['crying', 'sob', 'sad'] },
   { emoji: '😱', keywords: ['scream', 'fear', 'scared'] },
   { emoji: '😡', keywords: ['angry', 'mad', 'rage'] },
   { emoji: '🥺', keywords: ['pleading', 'puppy', 'cute'] },
   { emoji: '👍', keywords: ['thumbs', 'up', 'yes', 'good', 'like'] },
   { emoji: '👎', keywords: ['thumbs', 'down', 'no', 'bad', 'dislike'] },
   { emoji: '👏', keywords: ['clap', 'applause', 'bravo'] },
   { emoji: '🙌', keywords: ['hands', 'celebration', 'hooray'] },
   { emoji: '🤝', keywords: ['handshake', 'deal', 'agree'] },
   { emoji: '🙏', keywords: ['pray', 'thanks', 'please', 'namaste'] },
   { emoji: '💪', keywords: ['muscle', 'strong', 'flex', 'power'] },
   { emoji: '✌️', keywords: ['peace', 'victory', 'two'] },
   { emoji: '👋', keywords: ['wave', 'hello', 'hi', 'bye'] },
   { emoji: '🤟', keywords: ['love', 'you', 'rock'] },
   { emoji: '❤️', keywords: ['heart', 'love', 'red'] },
   { emoji: '🧡', keywords: ['heart', 'orange', 'love'] },
   { emoji: '💛', keywords: ['heart', 'yellow', 'love'] },
   { emoji: '💚', keywords: ['heart', 'green', 'love'] },
   { emoji: '💙', keywords: ['heart', 'blue', 'love'] },
   { emoji: '💜', keywords: ['heart', 'purple', 'love'] },
   { emoji: '🖤', keywords: ['heart', 'black', 'love'] },
   { emoji: '🤍', keywords: ['heart', 'white', 'love'] },
   { emoji: '💔', keywords: ['broken', 'heart', 'sad'] },
   { emoji: '💯', keywords: ['hundred', 'perfect', 'score'] },
   { emoji: '✨', keywords: ['sparkles', 'magic', 'shine'] },
   { emoji: '🔥', keywords: ['fire', 'hot', 'lit'] },
   { emoji: '🎉', keywords: ['party', 'celebration', 'tada'] },
   { emoji: '🎊', keywords: ['confetti', 'celebration', 'party'] },
   { emoji: '🎁', keywords: ['gift', 'present', 'birthday'] },
   { emoji: '🏆', keywords: ['trophy', 'winner', 'champion'] },
   { emoji: '📚', keywords: ['books', 'study', 'library', 'read'] },
   { emoji: '📖', keywords: ['book', 'open', 'read'] },
   { emoji: '✏️', keywords: ['pencil', 'write', 'edit'] },
   { emoji: '📝', keywords: ['memo', 'note', 'write'] },
   { emoji: '💡', keywords: ['idea', 'bulb', 'light', 'bright'] },
   { emoji: '⭐', keywords: ['star', 'favorite', 'rate'] },
   { emoji: '🌟', keywords: ['star', 'glow', 'shine'] },
   { emoji: '✅', keywords: ['check', 'done', 'yes', 'complete'] },
   { emoji: '❌', keywords: ['cross', 'no', 'wrong', 'delete'] },
   { emoji: '⏰', keywords: ['alarm', 'clock', 'time'] },
   { emoji: '☕', keywords: ['coffee', 'drink', 'morning'] },
   { emoji: '🍕', keywords: ['pizza', 'food'] },
   { emoji: '🍔', keywords: ['burger', 'food', 'fast'] },
   { emoji: '🎵', keywords: ['music', 'note', 'song'] },
   { emoji: '🎮', keywords: ['game', 'controller', 'play'] },
   { emoji: '💻', keywords: ['laptop', 'computer', 'work'] },
   { emoji: '📱', keywords: ['phone', 'mobile', 'cell'] },
   { emoji: '🌈', keywords: ['rainbow', 'colors'] },
   { emoji: '☀️', keywords: ['sun', 'sunny', 'bright'] },
   { emoji: '🌙', keywords: ['moon', 'night', 'sleep'] },
 ];
 
 const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
   const [search, setSearch] = useState('');
 
   const filteredEmojis = useMemo(() => {
     if (!search.trim()) return EMOJI_DATA.map(e => e.emoji);
     const query = search.toLowerCase();
     return EMOJI_DATA
       .filter(e => e.keywords.some(k => k.includes(query)))
       .map(e => e.emoji);
   }, [search]);
 
   return (
     <div className="bg-card border border-border rounded-2xl shadow-xl w-80 overflow-hidden animate-scale-in">
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
         <span className="font-medium text-foreground">Emojis</span>
         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary" onClick={onClose}>
           <X className="w-4 h-4" />
         </Button>
       </div>
 
       {/* Search Input */}
       <div className="px-3 py-2 border-b border-border/50">
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input
             placeholder="Search emojis..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-9 h-9 bg-secondary/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50"
           />
         </div>
       </div>
 
       {/* Emoji Grid */}
       <ScrollArea className="h-56">
         <div className="grid grid-cols-8 gap-0.5 p-2">
           {filteredEmojis.length === 0 ? (
             <div className="col-span-8 py-8 text-center text-muted-foreground text-sm">
               No emojis found
             </div>
           ) : (
             filteredEmojis.map((emoji, i) => (
               <button
                 key={i}
                 className="w-9 h-9 flex items-center justify-center text-xl hover:bg-secondary rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                 onClick={() => onSelect(emoji)}
               >
                 {emoji}
               </button>
             ))
           )}
         </div>
       </ScrollArea>
     </div>
   );
 };
 
 export default EmojiPicker;