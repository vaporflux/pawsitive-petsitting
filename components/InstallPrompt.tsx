
import React, { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';

export const InstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if already in "App Mode" (Standalone)
    // @ts-ignore - navigator.standalone is non-standard iOS property
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
    if (isStandalone) {
      return;
    }

    // 2. Detect iOS (iPhone, iPod, iPad)
    // Note: Modern iPads often report as "Macintosh" but have touch points
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (userAgent.includes('mac') && 'ontouchend' in document);

    setIsIOS(isIosDevice);

    // 3. Handle Android (Native Prompt)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 4. Handle iOS (Always show button if not standalone)
    if (isIosDevice) {
      setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      // Android Native Prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS / Fallback Instructions
      setShowInstructions(true);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* 
        The Small Floating Button 
        - Positioned at bottom-24 to sit ABOVE the Safari Bottom Toolbar 
        - z-[1000] to ensure it is on top of everything
      */}
      <button
        onClick={handleClick}
        className="fixed bottom-24 right-4 z-[1000] bg-white/95 backdrop-blur-md border border-primary-200 text-primary-700 shadow-xl shadow-primary-900/20 rounded-full px-4 py-3 text-xs font-bold flex items-center gap-2 hover:bg-primary-50 hover:scale-105 transition-all transform"
      >
        <Download size={18} />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Instruction Modal for iOS/Manual */}
      {showInstructions && (
        <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInstructions(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl mb-4 sm:mb-0 relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 p-1"><X size={20}/></button>
             
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary-100 p-2.5 rounded-xl text-primary-600"><Smartphone size={24} /></div>
                <h3 className="text-lg font-bold text-slate-800">Install Pawsitively</h3>
             </div>
             
             {isIOS ? (
               <div className="space-y-4 text-slate-600 text-sm">
                 <p>To install this app on your iPhone/iPad:</p>
                 <ol className="space-y-3">
                   <li className="flex items-start gap-3">
                     <span className="bg-slate-100 text-slate-500 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
                     <span>Tap the <Share size={16} className="inline mx-1 text-blue-500" /> <strong>Share</strong> button in your browser menu bar.</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="bg-slate-100 text-slate-500 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
                     <span>Scroll down and tap <span className="font-bold">Add to Home Screen</span>.</span>
                   </li>
                 </ol>
               </div>
             ) : (
               <div className="text-slate-600 text-sm space-y-2">
                 <p>To install this app:</p>
                 <p>Tap the browser menu (three dots) and select <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span>.</p>
               </div>
             )}
             
             <button onClick={() => setShowInstructions(false)} className="w-full mt-6 py-3 rounded-xl bg-primary-50 text-primary-700 font-bold text-sm hover:bg-primary-100 transition-colors">
               Got it
             </button>
          </div>
        </div>
      )}
    </>
  );
};
