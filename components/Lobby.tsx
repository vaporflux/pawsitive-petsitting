
import React, { useState, useEffect } from 'react';
import { listSessions, deleteSession } from '../services/storageService';
import { SessionMeta } from '../types';
import { Plus, Dog, Calendar, Trash2, ChevronRight, Loader2, AlertTriangle, Search, ArrowRight } from 'lucide-react';

interface LobbyProps {
  onJoin: (sessionId: string) => void;
  onCreate: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, onCreate }) => {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [mode, setMode] = useState<'main' | 'enter_code'>('main');
  const [code, setCode] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);
  
  // State for the custom delete modal
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    const list = await listSessions();
    // Sort by creation date descending
    list.sort((a, b) => b.createdAt - a.createdAt);
    setSessions(list);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleJoinCode = () => {
    if (code.trim().length > 0) {
      onJoin(code.trim().toUpperCase());
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Stop the click from bubbling to the card (Join)
    setSessionToDelete(id);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSession(sessionToDelete);
      await loadSessions();
    } catch (error) {
      console.error("Failed to delete session", error);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const activeSessions = sessions.filter(s => {
     const start = new Date(s.startDate);
     const end = new Date(start);
     end.setDate(end.getDate() + s.totalDays);
     // Keep showing sessions until the end of the last day
     return new Date().setHours(0,0,0,0) <= end.getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 relative flex flex-col items-center">
      
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setSessionToDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex items-center gap-3 text-rose-600 mb-4">
               <div className="bg-rose-100 p-2 rounded-full"><AlertTriangle size={24} /></div>
               <h3 className="text-lg font-bold">Delete Session?</h3>
             </div>
             <p className="text-slate-600 mb-6 text-sm leading-relaxed">
               Are you sure you want to delete this sitting history? This action cannot be undone.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setSessionToDelete(null)} 
                 disabled={isDeleting}
                 className="flex-1 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmDelete} 
                 disabled={isDeleting}
                 className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition-all"
               >
                 {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Delete'}
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8 pt-10">
           <div className="flex items-center -space-x-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full ring-4 ring-slate-50 z-10"><Dog className="text-blue-600" size={32} /></div>
              <div className="bg-pink-100 p-3 rounded-full ring-4 ring-slate-50 z-0"><Dog className="text-pink-600" size={32} /></div>
           </div>
           <h1 className="text-2xl font-bold text-slate-800">Pawsitive Petsitting</h1>
           <p className="text-sm text-slate-500 italic mt-2 text-center">Stay close to your fur-babies, even from afar.</p>
        </div>

        {mode === 'main' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <button 
               onClick={onCreate}
               className="w-full bg-white hover:bg-primary-50 border-2 border-dashed border-primary-200 hover:border-primary-400 text-primary-700 p-6 rounded-2xl flex items-center justify-between group shadow-sm transition-all"
             >
                <div className="flex items-center gap-4">
                   <div className="bg-primary-100 p-3 rounded-full text-primary-600 group-hover:scale-110 transition-transform">
                     <Plus size={24} />
                   </div>
                   <div className="text-left">
                      <div className="font-bold text-lg">Start New Sitting</div>
                      <div className="text-xs text-primary-600/70">Create schedule & get code</div>
                   </div>
                </div>
                <ChevronRight className="text-primary-300" />
             </button>

             <button 
               onClick={() => setMode('enter_code')}
               className="w-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 p-6 rounded-2xl flex items-center justify-between group shadow-sm transition-all"
             >
                <div className="flex items-center gap-4">
                   <div className="bg-slate-100 p-3 rounded-full text-slate-500 group-hover:scale-110 transition-transform">
                     <Search size={24} />
                   </div>
                   <div className="text-left">
                      <div className="font-bold text-lg">Enter Access Code</div>
                      <div className="text-xs text-slate-400">Join an existing session</div>
                   </div>
                </div>
                <ChevronRight className="text-slate-300" />
             </button>
          </div>
        )}

        {mode === 'enter_code' && (
          <div className="animate-in slide-in-from-right-8">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
               <h2 className="text-center font-bold text-slate-800 mb-6">Enter Code</h2>
               <input 
                 autoFocus
                 value={code}
                 onChange={(e) => setCode(e.target.value.toUpperCase())}
                 placeholder="SARAH-42"
                 className="w-full text-center text-2xl font-mono tracking-widest p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-primary-500 focus:bg-white outline-none uppercase transition-all mb-6 text-slate-900"
               />
               <button 
                 onClick={handleJoinCode}
                 disabled={code.length < 3}
                 className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-200 flex items-center justify-center gap-2 transition-all"
               >
                 View Activities <ArrowRight size={18} />
               </button>
               <button 
                 onClick={() => setMode('main')}
                 className="w-full mt-4 text-slate-400 hover:text-slate-600 text-sm font-medium"
               >
                 Cancel
               </button>
            </div>
          </div>
        )}

        <div className="mt-12 text-center w-full">
           <button 
             onClick={() => setShowBrowse(!showBrowse)}
             className="text-xs font-medium text-slate-400 hover:text-primary-600 transition-colors underline decoration-slate-200 hover:decoration-primary-300 underline-offset-4"
           >
             {showBrowse ? 'Hide Active List' : 'Forgot code? Browse active sittings'}
           </button>

           {showBrowse && (
             <div className="mt-6 space-y-3 text-left animate-in fade-in duration-500">
                {loading ? (
                   <div className="text-center"><Loader2 className="animate-spin text-slate-300 inline" /></div>
                ) : activeSessions.length === 0 ? (
                   <div className="text-center text-slate-400 text-xs italic">No active sittings.</div>
                ) : (
                   activeSessions.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => onJoin(session.id)}
                      className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-primary-300 cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary-50 text-primary-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex-shrink-0">
                          {session.id}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 text-sm truncate">{session.sitterName}</div>
                          <div className="text-xs text-slate-500 truncate">
                             <span className="font-medium text-slate-700">{session.dogs.length} Dogs:</span> {session.dogs.map(d => d.name).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                         <button 
                           onClick={(e) => handleDeleteClick(e, session.id)}
                           className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                         >
                           <Trash2 size={14} />
                         </button>
                         <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-400" />
                      </div>
                    </div>
                   ))
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
