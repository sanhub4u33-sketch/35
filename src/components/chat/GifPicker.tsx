 import { useState, useMemo } from 'react';
 import { X, Search, Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { ScrollArea } from '@/components/ui/scroll-area';
 
 interface GifPickerProps {
   onSelect: (gifUrl: string) => void;
   onClose: () => void;
 }
 
 // Static GIF collection with keywords for search
 const GIF_DATA = [
   { url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', keywords: ['thumbs up', 'yes', 'good', 'ok', 'approve'] },
   { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', keywords: ['clap', 'applause', 'bravo', 'well done'] },
   { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', keywords: ['party', 'celebrate', 'dance', 'fun'] },
   { url: 'https://media.giphy.com/media/l4q8cJzGdR9J8w3hS/giphy.gif', keywords: ['celebration', 'yay', 'happy', 'excited'] },
   { url: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif', keywords: ['laugh', 'lol', 'funny', 'haha'] },
   { url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', keywords: ['hello', 'hi', 'wave', 'greeting'] },
   { url: 'https://media.giphy.com/media/3oEdv6sy3ulljPMGdy/giphy.gif', keywords: ['think', 'thinking', 'hmm', 'wonder'] },
   { url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', keywords: ['wow', 'amazing', 'surprised', 'shocked'] },
   { url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', keywords: ['thank', 'thanks', 'grateful', 'appreciate'] },
   { url: 'https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/giphy.gif', keywords: ['bye', 'goodbye', 'see you', 'later'] },
   { url: 'https://media.giphy.com/media/l2JhrYYxAD6N5gble/giphy.gif', keywords: ['study', 'studying', 'learn', 'book', 'read'] },
   { url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', keywords: ['read', 'reading', 'book', 'library'] },
   { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', keywords: ['sad', 'cry', 'crying', 'upset'] },
   { url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', keywords: ['love', 'heart', 'adore', 'crush'] },
   { url: 'https://media.giphy.com/media/26xBwdIuRCiYhsg8iI/giphy.gif', keywords: ['fire', 'lit', 'hot', 'awesome'] },
   { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', keywords: ['cool', 'sunglasses', 'chill', 'smooth'] },
   { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', keywords: ['coffee', 'morning', 'tired', 'wake up'] },
   { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', keywords: ['work', 'working', 'busy', 'focus'] },
   { url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', keywords: ['sleep', 'sleepy', 'tired', 'zzz', 'nap'] },
   { url: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif', keywords: ['no', 'nope', 'disagree', 'refuse'] },
 ];
 
 const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
   const [search, setSearch] = useState('');
   const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
 
   const filteredGifs = useMemo(() => {
     if (!search.trim()) return GIF_DATA.map(g => g.url);
     const query = search.toLowerCase();
     return GIF_DATA
       .filter(g => g.keywords.some(k => k.includes(query)))
       .map(g => g.url);
   }, [search]);
 
   const handleImageLoad = (index: number) => {
     setLoadingImages(prev => ({ ...prev, [index]: false }));
   };
 
   return (
     <div className="bg-card border border-border rounded-2xl shadow-xl w-80 overflow-hidden animate-scale-in">
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
         <span className="font-medium text-foreground">GIFs</span>
         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-secondary" onClick={onClose}>
           <X className="w-4 h-4" />
         </Button>
       </div>
 
       {/* Search Input */}
       <div className="px-3 py-2 border-b border-border/50">
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input
             placeholder="Search GIFs..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-9 h-9 bg-secondary/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50"
           />
         </div>
       </div>
 
       {/* GIF Grid */}
       <ScrollArea className="h-56">
         <div className="grid grid-cols-2 gap-1.5 p-2">
           {filteredGifs.length === 0 ? (
             <div className="col-span-2 py-8 text-center text-muted-foreground text-sm">
               No GIFs found
             </div>
           ) : (
             filteredGifs.map((gif, i) => (
               <button
                 key={i}
                 className="relative aspect-square rounded-xl overflow-hidden hover:ring-2 ring-primary transition-all duration-150 hover:scale-[1.02] active:scale-95 bg-secondary/50"
                 onClick={() => onSelect(gif)}
               >
                 {loadingImages[i] !== false && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                   </div>
                 )}
                 <img 
                   src={gif} 
                   alt="GIF" 
                   className={`w-full h-full object-cover transition-opacity duration-200 ${loadingImages[i] !== false ? 'opacity-0' : 'opacity-100'}`}
                   onLoad={() => handleImageLoad(i)}
                 />
               </button>
             ))
           )}
         </div>
       </ScrollArea>
     </div>
   );
 };
 
 export default GifPicker;