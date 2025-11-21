
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, DayLog, TIME_SLOTS, DogConfig } from './types';
import { saveSessionState, subscribeToSession, deleteSession, isFirebaseConfigured } from './services/storageService';
import { generateDailySummary } from './services/geminiService';
import { TaskGroup } from './components/TaskGroup';
import { PhotoUpload } from './components/PhotoUpload';
import { DogComments } from './components/DogComments';
import { Lobby } from './components/Lobby';
import { SessionWizard } from './components/SessionWizard';
import { InstallPrompt } from './components/InstallPrompt';
import { ChevronLeft, ChevronRight, Dog, Sparkles, Eye, Edit3, BellRing, X, Phone, ShieldAlert, LogOut, RefreshCw, Share2, CheckCircle, Copy, MessageCircle } from 'lucide-react';

// Helper to get local date string YYYY-MM-DD
const getLocalISODate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// Safe check for API Key presence using the replaced string
const hasApiKey = () => {
  return !!process.env.API_KEY;
};

const App: React.FC = () => {
  // View State: 'lobby' | 'wizard' | 'tracker'
  const [view, setView] = useState<'lobby' | 'wizard' | 'tracker'>('lobby');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Initialization Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      setSessionId(sid);
      setView('tracker');
    }
  }, []);

  const handleJoinSession = (id: string) => {
    setSessionId(id);
    setView('tracker');
    // Update URL without reloading
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('session', id);
      window.history.pushState({}, '', url);
    } catch (e) {
      // Ignore errors in preview environments where pushState might be blocked
      console.debug("URL update skipped in preview");
    }
  };

  const handleCreateComplete = (id: string) => {
    handleJoinSession(id);
  };

  const handleBackToLobby = () => {
    setSessionId(null);
    setView('lobby');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.pushState({}, '', url);
    } catch (e) {
      console.debug("URL update skipped in preview");
    }
  };

  if (!isFirebaseConfigured()) {
      return <div className="p-10 text-center text-red-500">Firebase configuration missing. Please configure storageService.ts</div>;
  }

  // Helper to determine which main view to render
  const renderContent = () => {
    if (view === 'wizard') {
      return <SessionWizard onComplete={handleCreateComplete} onCancel={() => setView('lobby')} />;
    }
  
    if (view === 'tracker' && sessionId) {
      return <SessionTracker sessionId={sessionId} onExit={handleBackToLobby} />;
    }
  
    return <Lobby onJoin={handleJoinSession} onCreate={() => setView('wizard')} />;
  };

  return (
    <>
      {/* Global Install Button (Visible on Mobile) */}
      <InstallPrompt />
      {renderContent()}
    </>
  );
};

// --- Sub-Component: The Main Tracker Logic ---

interface SessionTrackerProps {
  sessionId: string;
  onExit: () => void;
}

const SessionTracker: React.FC<SessionTrackerProps> = ({ sessionId, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [state, setState] = useState<AppState | null>(null);
  
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  const isRemoteUpdate = useRef(false);

  // Subscribe to Session Data
  useEffect(() => {
    const unsubscribe = subscribeToSession(
      sessionId,
      (newData) => {
        setState((current) => {
          // Avoid re-renders if identical
          if (JSON.stringify(current) === JSON.stringify(newData)) return current;
          
          isRemoteUpdate.current = true;
          if (current) {
             setShowToast(true);
             setTimeout(() => setShowToast(false), 3000);
          }
          return newData;
        });
        setLoading(false);
      },
      (error) => {
        setDbError(error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [sessionId]);

  // Auto-save
  useEffect(() => {
    if (!state) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const save = async () => {
      setSaving(true);
      try {
        await saveSessionState(sessionId, state);
      } catch(e) {
        console.error("Save failed", e);
      }
      setSaving(false);
    };

    const timeout = setTimeout(save, 1000);
    return () => clearTimeout(timeout);
  }, [state, sessionId]);

  const getCurrentDate = useCallback(() => {
    if (!state) return getLocalISODate();
    const [y, m, d] = state.startDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    start.setDate(start.getDate() + currentDayIndex);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [state, currentDayIndex]);

  const getShareUrl = () => {
    return `${window.location.origin}?session=${sessionId}`;
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const text = `Join my Pawsitive Petsitting session for ${state?.dogs.map(d => d.name).join(', ')}. Code: ${sessionId}`;
    
    // 1. Try Native Share (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pawsitive Petsitting',
          text: text,
          url: url
        });
        return;
      } catch (err) {
        // User cancelled or failed, fall through to modal
      }
    }

    // 2. Fallback to Modal
    setShowShareModal(true);
  };

  const copyToClipboard = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // ignore
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><RefreshCw className="animate-spin text-primary-500" /></div>;
  if (dbError === 'session_not_found') return <div className="p-10 text-center">Session not found or deleted. <button onClick={onExit} className="underline text-blue-500">Back to Lobby</button></div>;
  if (!state) return null;

  const currentDateStr = getCurrentDate();
  const currentLog = state.logs[currentDateStr] || {
    date: currentDateStr,
    tasks: {},
    taskTimestamps: {},
    comments: {},
    photos: []
  };

  const displayedPhotos = currentLog.photos || [];

  const updateLog = (updates: Partial<DayLog>) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [currentDateStr]: { ...currentLog, ...updates }
        }
      };
    });
  };

  const toggleTask = (taskId: string) => {
    const now = Date.now();
    const newCompleted = !currentLog.tasks[taskId];
    const newTasks = { ...currentLog.tasks, [taskId]: newCompleted };
    
    // Manage Timestamps
    const newTimestamps = { ...(currentLog.taskTimestamps || {}) };
    if (newCompleted) {
      newTimestamps[taskId] = now;
    } else {
      delete newTimestamps[taskId];
    }

    updateLog({ tasks: newTasks, taskTimestamps: newTimestamps });
  };

  const completeAllInSlot = (slotId: string) => {
    const now = Date.now();
    const slot = TIME_SLOTS.find(s => s.id === slotId);
    if (!slot) return;
    
    const newTasks = { ...currentLog.tasks };
    const newTimestamps = { ...(currentLog.taskTimestamps || {}) };

    state.dogs.forEach(dog => {
      slot.activities.forEach(act => {
        const taskId = `${currentDateStr}-${slot.id}-${dog.name}-${act}`;
        if (!newTasks[taskId]) {
          newTasks[taskId] = true;
          newTimestamps[taskId] = now;
        }
      });
    });
    updateLog({ tasks: newTasks, taskTimestamps: newTimestamps });
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    const summary = await generateDailySummary(currentLog, currentDateStr, state.sitterName, state.dogs);
    updateLog({ aiSummary: summary });
    setSummaryLoading(false);
  };

  const handleDeleteSession = async () => {
    await deleteSession(sessionId);
    onExit();
  };

  // Formatting Date
  const [displayY, displayM, displayD] = currentDateStr.split('-').map(Number);
  const dateObj = new Date(displayY, displayM - 1, displayD);
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Robust contact handling for legacy data support to prevent crashes
  const rawContacts = (state.emergencyContacts || {}) as any;
  const contacts = { 
    owner: rawContacts?.owner || rawContacts?.primary || { name: '', phone: '' }, 
    secondary: rawContacts?.secondary || { name: '', phone: '' }, 
    vet: rawContacts?.vet || { name: '', phone: '' } 
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      
      {/* Copied Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${showCopied ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>Link Copied!</span>
        </div>
      </div>

      {/* Toast - Added pointer-events logic to prevent blocking header buttons */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${showToast ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium">
          <BellRing size={14} className="text-primary-300" />
          <span>Update received</span>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
             <div className="bg-rose-500 px-6 py-4 flex items-center justify-between">
               <div className="flex items-center gap-2 text-white font-bold text-lg"><ShieldAlert size={24} /><h3>Emergency Contacts</h3></div>
               <button onClick={() => setShowEmergency(false)} className="text-white hover:bg-rose-600 p-1 rounded-lg"><X size={24} /></button>
             </div>
             <div className="p-6 space-y-4">
                {contacts.owner?.phone ? (
                  <a href={`tel:${contacts.owner.phone}`} className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-rose-50 group transition-colors">
                    <Phone className="text-rose-500 mr-4" />
                    <div className="font-bold text-slate-800">{contacts.owner.name} (Owner) <span className="block font-normal text-sm text-slate-500">{contacts.owner.phone}</span></div>
                  </a>
                ) : <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No Owner Contact</div>}

                {contacts.secondary?.phone && (
                  <a href={`tel:${contacts.secondary.phone}`} className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-rose-50 group transition-colors">
                    <Phone className="text-rose-500 mr-4" />
                    <div className="font-bold text-slate-800">{contacts.secondary.name} <span className="block font-normal text-sm text-slate-500">{contacts.secondary.phone}</span></div>
                  </a>
                )}
                
                {contacts.vet?.phone && (
                   <a href={`tel:${contacts.vet.phone}`} className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-rose-50 group transition-colors">
                    <ShieldAlert className="text-rose-500 mr-4" />
                    <div className="font-bold text-slate-800">{contacts.vet.name} <span className="block font-normal text-sm text-slate-500">{contacts.vet.phone}</span></div>
                  </a>
                )}
             </div>
          </div>
        </div>
      )}

       {/* Delete Confirm Modal */}
       {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
             <h3 className="text-lg font-bold text-rose-600 mb-2">End Sitting?</h3>
             <p className="text-slate-600 mb-6">This will delete the session and all data permanently. This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600">Cancel</button>
               <button onClick={handleDeleteSession} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors">Yes, Delete</button>
             </div>
          </div>
        </div>
      )}
      
      {/* Share Modal (Fallback if native share fails) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Share2 size={20} /> Share Session</h3>
               <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
             </div>
             
             <p className="text-sm text-slate-600 mb-4">Send this code or link to the owner/sitter to give them access.</p>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Access Code</div>
                <div className="text-2xl font-mono font-bold text-slate-900 tracking-wider">{sessionId}</div>
             </div>
             
             <button onClick={copyToClipboard} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-200">
                {showCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {showCopied ? 'Copied!' : 'Copy Join Link'}
             </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                 <button onClick={onExit} className="mr-2 p-2 hover:bg-slate-100 rounded-full touch-manipulation"><ChevronLeft size={20} className="text-slate-400" /></button>
                 
                 {/* Dynamic Dog Cluster */}
                 <div className="flex items-center -space-x-2 mr-1">
                    {state.dogs.slice(0,3).map((dog, i) => (
                       <div key={i} className={`p-1.5 rounded-full ring-2 ring-white z-${10-i} ${
                          dog.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          dog.color === 'pink' ? 'bg-pink-100 text-pink-700' :
                          dog.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                          dog.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                       }`}>
                          <Dog size={14} />
                       </div>
                    ))}
                 </div>
                 <div>
                   <h1 className="font-bold text-slate-800 leading-none">Pawsitive Petsitting</h1>
                   <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">Sitter: {state.sitterName}</p>
                      <button onClick={handleShare} className="flex items-center gap-1 text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded hover:bg-primary-100 transition-colors">
                        <Share2 size={10} /> Share
                      </button>
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isOwnerMode && (
                  <button onClick={() => setShowEmergency(true)} className="touch-manipulation flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all">
                     <Phone size={14} /> <span className="text-xs font-bold hidden sm:inline">Emergency</span>
                  </button>
                )}
                <button onClick={() => setIsOwnerMode(!isOwnerMode)} className={`touch-manipulation flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border active:scale-95 transition-all ${isOwnerMode ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {isOwnerMode ? <Eye size={14} /> : <Edit3 size={14} />}
                  {isOwnerMode ? 'Owner' : 'Sitter'}
                </button>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold ${saving ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                   <div className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                   {saving ? 'Sync' : 'Live'}
                </div>
                {isOwnerMode && (
                   <button onClick={() => setShowDeleteConfirm(true)} className="touch-manipulation bg-red-50 text-red-600 p-2 ml-2 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"><LogOut size={16} /></button>
                )}
              </div>
           </div>

           <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
              <button onClick={() => setCurrentDayIndex(i => Math.max(0, i - 1))} disabled={currentDayIndex === 0} className="p-3 sm:p-2 hover:bg-white rounded-lg disabled:opacity-30 touch-manipulation"><ChevronLeft size={20} /></button>
              <div className="text-center">
                <div className="text-xs font-bold text-primary-600 uppercase">Day {currentDayIndex + 1} of {state.totalDays}</div>
                <div className="font-semibold text-slate-800 text-sm">{formattedDate}</div>
              </div>
              <button onClick={() => setCurrentDayIndex(i => Math.min(state.totalDays - 1, i + 1))} disabled={currentDayIndex === state.totalDays - 1} className="p-3 sm:p-2 hover:bg-white rounded-lg disabled:opacity-30 touch-manipulation"><ChevronRight size={20} /></button>
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section>
          {TIME_SLOTS.map((slot) => (
            <TaskGroup 
              key={slot.id}
              slot={slot}
              dogs={state.dogs}
              dateStr={currentDateStr}
              completedTasks={currentLog.tasks}
              taskTimestamps={currentLog.taskTimestamps}
              onToggle={toggleTask}
              onCompleteAll={completeAllInSlot}
              isReadOnly={isOwnerMode}
              ownerPhone={contacts.owner.phone}
            />
          ))}
        </section>

        <section>
          <DogComments 
            dogs={state.dogs}
            comments={currentLog.comments} 
            onUpdate={(dogName, text) => updateLog({ comments: { ...currentLog.comments, [dogName]: text } })} 
            isReadOnly={isOwnerMode}
          />
        </section>

        <section>
           <PhotoUpload 
              label="End of Day Photos" 
              photos={displayedPhotos} 
              onUpdate={(newPhotos) => updateLog({ photos: newPhotos })} 
              isReadOnly={isOwnerMode}
           />
        </section>

        <section className="pt-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                 <Sparkles size={20} className="text-indigo-500" />
                 <h2>Daily Summary</h2>
               </div>
               {!isOwnerMode && hasApiKey() && (
                   <button onClick={handleGenerateSummary} disabled={summaryLoading} className="text-xs bg-white text-indigo-700 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 flex gap-2 items-center shadow-sm hover:bg-indigo-50 transition-colors">
                     {summaryLoading ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                     {currentLog.aiSummary ? 'Regenerate' : 'Generate'}
                   </button>
               )}
             </div>
             {currentLog.aiSummary ? (
               <div className="prose prose-sm text-slate-700 bg-white/60 p-4 rounded-xl border border-white/50 shadow-sm">{currentLog.aiSummary}</div>
             ) : (
               <div className="text-center py-6 text-slate-400 text-sm italic">No summary generated yet.</div>
             )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
