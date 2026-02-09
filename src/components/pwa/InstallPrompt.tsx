 import { useState, useEffect } from 'react';
 import { X, Download, Smartphone } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { usePWA } from '@/hooks/usePWA';
 
 const InstallPrompt = () => {
   const { isInstallable, promptInstall } = usePWA();
   const [showBanner, setShowBanner] = useState(false);
   const [dismissed, setDismissed] = useState(false);
 
   useEffect(() => {
     // Check if user has dismissed before
     const wasDismissed = localStorage.getItem('pwa-install-dismissed');
     if (wasDismissed) {
       setDismissed(true);
       return;
     }
 
     // Show banner after a delay if installable
     if (isInstallable) {
       const timer = setTimeout(() => setShowBanner(true), 3000);
       return () => clearTimeout(timer);
     }
   }, [isInstallable]);
 
   const handleInstall = async () => {
     const installed = await promptInstall();
     if (installed) {
       setShowBanner(false);
     }
   };
 
   const handleDismiss = () => {
     setShowBanner(false);
     setDismissed(true);
     localStorage.setItem('pwa-install-dismissed', 'true');
   };
 
   if (!isInstallable || !showBanner || dismissed) return null;
 
   return (
     <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
       <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
         <div className="flex items-start gap-4">
           <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
             <Smartphone className="w-6 h-6 text-primary-foreground" />
           </div>
           <div className="flex-1 min-w-0">
             <h4 className="font-display font-semibold text-foreground">Install Library App</h4>
             <p className="text-sm text-muted-foreground mt-1">
               Add to your home screen for quick access and a better experience
             </p>
             <div className="flex gap-2 mt-3">
               <Button 
                 onClick={handleInstall}
                 size="sm"
                 className="btn-primary gap-2"
               >
                 <Download className="w-4 h-4" />
                 Install
               </Button>
               <Button 
                 onClick={handleDismiss}
                 variant="ghost"
                 size="sm"
               >
                 Not now
               </Button>
             </div>
           </div>
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 -mt-1 -mr-1"
             onClick={handleDismiss}
           >
             <X className="w-4 h-4" />
           </Button>
         </div>
       </div>
     </div>
   );
 };
 
 export default InstallPrompt;