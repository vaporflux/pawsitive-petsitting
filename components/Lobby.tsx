
import React, { useState, useEffect } from 'react';
import { listSessions, deleteSession } from '../services/storageService';
import { SessionMeta } from '../types';
import { Plus, Dog, Calendar, Trash2, ChevronRight, Loader2, AlertTriangle, X } from 'lucide-react';

interface LobbyProps {
  onJoin: (sessionId: string) => void;
  onCreate: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, onCreate }) => {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  
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

  const getStatus = (session: SessionMeta) => {
    const start = new Date(session.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + session.totalDays);
    const now = new Date();
    
    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'active';
  };

  const activeSessions = sessions.filter(s => getStatus(s) !== 'past');
  const pastSessions = sessions.filter(s => getStatus(s) === 'past');

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 relative">
      
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setSessionToDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex items-center gap-3 text-rose-600 mb-4">
               <div className="bg-rose-100 p-2 rounded-full"><AlertTriangle size={24} /></div>
               <h3 className="text-lg font-bold">Delete Session?</h3>
             </div>
             <p className="text-slate-600 mb-6 text-sm leading-relaxed">
               Are you sure you want to delete this sitting history? This action cannot be undone and all photos/logs will be lost.
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

      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center mb-10 pt-10">
           <div className="flex items-center -space-x-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full ring-4 ring-slate-50 z-10"><Dog className="text-blue-600" size={32} /></div>
              <div className="bg-pink-100 p-3 rounded-full ring-4 ring-slate-50 z-0"><Dog className="text-pink-600" size={32} /></div>
           </div>
           <h1 className="text-2xl font-bold text-slate-800">Pawsitive Petsitting</h1>
           <p className="text-slate-500">Select a sitting session to begin</p>
        </div>

        <button 
          onClick={onCreate}
          className="w-full bg-white hover:bg-primary-50 border-2 border-dashed border-primary-200 hover:border-primary-400 text-primary-600 font-semibold p-6 rounded-2xl mb-8 flex flex-col items-center transition-all group shadow-sm"
        >
           <div className="bg-primary-100 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
             <Plus size={24} />
           </div>
           <span>Start New Sitting</span>
        </button>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Active Sittings</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm italic bg-white rounded-xl border border-slate-100">No active sittings found.</div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map(session => (
                  <SessionCard key={session.id} session={session} onClick={() => onJoin(session.id)} onDelete={(e) => handleDeleteClick(e, session.id)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <button 
               onClick={() => setShowPast(!showPast)}
               className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 mb-3 flex items-center gap-1 transition-colors"
            >
               {showPast ? 'Hide' : 'Show'} Past Sittings ({pastSessions.length})
            </button>
            
            {showPast && (
              <div className="space-y-3 opacity-75">
                {pastSessions.map(session => (
                  <SessionCard key={session.id} session={session} onClick={() => onJoin(session.id)} onDelete={(e) => handleDeleteClick(e, session.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionCard = ({ session, onClick, onDelete }: { session: SessionMeta, onClick: () => void, onDelete: (e: React.MouseEvent) => void }) => (
  <div 
    onClick={onClick}
    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
  >
    <div className="flex items-center gap-4 relative z-10">
       <div className="bg-slate-50 p-3 rounded-lg text-slate-400">
         <Calendar size={20} />
       </div>
       <div>
         <h3 className="font-bold text-slate-800">{session.sitterName}'s Sitting</h3>
         <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-medium">{session.dogs.length} Dogs:</span>
            <span>{session.dogs.map(d => d.name).join(', ')}</span>
         </div>
         <div className="text-xs text-slate-400 mt-0.5">
            {session.totalDays} Days • Started {new Date(session.startDate).toLocaleDateString()}
         </div>
       </div>
    </div>
    <div className="flex items-center gap-2 relative z-20">
       <button 
         onClick={onDelete}
         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
         title="Delete Session"
       >
         <Trash2 size={18} />
       </button>
       <ChevronRight size={20} className="text-slate-300 group-hover:text-primary-400" />
    </div>
  </div>
);
