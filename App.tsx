
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DogName, AppState, DayLog, TIME_SLOTS, DOGS } from './types';
import { saveToCloud, subscribeToStore, clearCloudData, isFirebaseConfigured } from './services/storageService';
import { generateDailySummary } from './services/geminiService';
import { TaskGroup } from './components/TaskGroup';
import { PhotoUpload } from './components/PhotoUpload';
import { DogComments } from './components/DogComments';
import { ChevronLeft, ChevronRight, Dog, Sparkles, User, LogOut, RefreshCw, Eye, Edit3, AlertTriangle, Database, BellRing, X, Calendar } from 'lucide-react';

// Helper to get local date string YYYY-MM-DD to prevent UTC shifts
const getLocalISODate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>({
    sitterName: '',
    startDate: getLocalISODate(),
    totalDays: 3,
    logs: {},
    initialized: false,
  });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Default to Sitter View (isOwnerMode = false)
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const blockAutoSave = useRef(false);
  
  // Local state for the onboarding date picker visual
  const [onboardingDate, setOnboardingDate] = useState(getLocalISODate());

  // This ref helps us distinguish between "I just typed this" and "The cloud sent me new data"
  // to prevent infinite loops of saving data we just received.
  const isRemoteUpdate = useRef(false);

  // Subscribe to Cloud Updates
  useEffect(() => {
    const unsubscribe = subscribeToStore(
      (newData) => {
        setState((current) => {
          // If we are forcing a reset, ignore incoming data momentarily until we are truly done
          if (blockAutoSave.current && newData.initialized) {
              return current;
          }

          // If cloud says initialized: false, we must respect that (reset happened)
          if (!newData.initialized && current.initialized) {
              blockAutoSave.current = false; // Release lock
              setIsResetting(false);
              setShowResetConfirm(false);
              // Reset local onboarding date too
              setOnboardingDate(getLocalISODate());
          }

          // Simple check to avoid unnecessary re-renders or effects
          if (JSON.stringify(current) === JSON.stringify(newData)) return current;
          
          isRemoteUpdate.current = true;
          // Trigger toast to show user data updated
          if (newData.initialized) {
             setShowToast(true);
             setTimeout(() => setShowToast(false), 3000);
          }
          
          return newData;
        });
        setLoading(false);
        setDbError(null); // Clear error if successful
      },
      (errorCode) => {
        setLoading(false);
        // Map specific error codes to UI states
        if (errorCode === 'firestore_permission_denied') {
           setDbError('firestore_permission_denied');
        } else if (errorCode === 'firestore_not_found') {
           setDbError('firestore_not_found');
        } else {
           console.error("Unknown subscription error:", errorCode);
           // Optional: set a generic error if needed, but usually better to let it retry silently first
        }
      }
    );

    // If firebase isn't configured, just stop loading so user sees the UI (and maybe an error)
    if (!isFirebaseConfigured()) {
        setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Auto-save effect
  useEffect(() => {
    // If not initialized or if this change came from the cloud, don't save back
    if (!state.initialized) return;
    if (blockAutoSave.current) return; // Don't save if we are resetting
    
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    
    const save = async () => {
      setSaving(true);
      try {
        await saveToCloud(state);
        setDbError(null);
      } catch (e: any) {
         // Handle save errors
         if (e.message === 'firestore_not_found') {
             setDbError('firestore_not_found');
         } else if (e.message === 'firestore_permission_denied') {
             setDbError('firestore_permission_denied');
         }
      }
      setSaving(false);
    };
    
    // Debounce save slightly
    const timeout = setTimeout(save, 1000);
    return () => clearTimeout(timeout);
  }, [state]);

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name') as string;
    const start = formData.get('start') as string;
    const days = parseInt(formData.get('days') as string, 10);

    const newState = {
      ...state,
      sitterName: name,
      startDate: start,
      totalDays: days,
      initialized: true,
    };
    // We set state immediately for UI responsiveness, effect will trigger save
    setState(newState);
  };

  const getCurrentDate = useCallback(() => {
    if (!state.startDate) return getLocalISODate();

    // FIX: Parse YYYY-MM-DD manually and construct date using local time arguments
    // This prevents 'new Date(string)' from assuming UTC and shifting the day back
    const [y, m, d] = state.startDate.split('-').map(Number);
    const start = new Date(y, m - 1, d); // Month is 0-indexed
    
    start.setDate(start.getDate() + currentDayIndex);
    
    // Format back to YYYY-MM-DD manually to preserve local date logic
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [state.startDate, currentDayIndex]);

  const currentDateStr = getCurrentDate();
  const currentLog = state.logs[currentDateStr] || {
    date: currentDateStr,
    tasks: {},
    comments: { [DogName.Duke]: '', [DogName.Lulu]: '', [DogName.Molly]: '' },
    photos: []
  };

  // MIGRATION HELPER:
  // If 'photos' is undefined but legacy 'eveningPhoto' exists, convert it to array
  const displayedPhotos = currentLog.photos || (currentLog.eveningPhoto ? [currentLog.eveningPhoto] : []);

  const updateLog = (updates: Partial<DayLog>) => {
    setState(prev => ({
      ...prev,
      logs: {
        ...prev.logs,
        [currentDateStr]: { ...currentLog, ...updates }
      }
    }));
  };

  const toggleTask = (taskId: string) => {
    const newTasks = { ...currentLog.tasks, [taskId]: !currentLog.tasks[taskId] };
    updateLog({ tasks: newTasks });
  };

  const completeAllInSlot = (slotId: string) => {
    const slot = TIME_SLOTS.find(s => s.id === slotId);
    if (!slot) return;

    const newTasks = { ...currentLog.tasks };
    
    DOGS.forEach(dog => {
      slot.activities.forEach(act => {
        const taskId = `${currentDateStr}-${slot.id}-${dog}-${act}`;
        newTasks[taskId] = true;
      });
    });

    updateLog({ tasks: newTasks });
  };

  const updateComment = (dog: DogName, text: string) => {
    const newComments = { ...currentLog.comments, [dog]: text };
    updateLog({ comments: newComments });
  };

  const performReset = async () => {
    setIsResetting(true);
    blockAutoSave.current = true; // Lock auto-saves immediately
    try {
      await clearCloudData();
      // No reload needed! The realtime subscription will detect the reset
      // and automatically update the state to 'initialized: false'
      // blockAutoSave will be released in the useEffect when it detects the empty state
    } catch (error) {
      console.error("Reset failed:", error);
      alert("Failed to reset the app. Please check your internet connection. If the issue persists, the database might be unreachable.");
      blockAutoSave.current = false; // Release lock on error
      setIsResetting(false);
    } finally {
      setShowResetConfirm(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!process.env.API_KEY) {
      alert("Please configure the API_KEY in the environment to use AI features.");
      return;
    }
    setSummaryLoading(true);
    const summary = await generateDailySummary(currentLog, currentDateStr, state.sitterName);
    updateLog({ aiSummary: summary });
    setSummaryLoading(false);
  };

  // --- Error Screens ---

  // Database Not Found (Project exists, but DB instance doesn't)
  if (dbError === 'firestore_not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-l-8 border-rose-500 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-4 text-rose-600 font-bold text-xl">
            <Database size={28} />
            <h2>Database Not Found</h2>
          </div>
          <p className="text-slate-700 mb-4 leading-relaxed">
            The app is trying to connect to the database named <strong>petdatabase</strong>, but it wasn't found.
          </p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
             <h3 className="font-semibold text-slate-800 mb-2">Troubleshooting:</h3>
             <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
               <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a></li>
               <li>Check <strong>Firestore Database</strong> section</li>
               <li>Ensure you have a database specifically named: <strong>petdatabase</strong></li>
               <li>If not, create it (Start in Test Mode)</li>
             </ol>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Permission Denied (DB exists, but rules block access)
  if (dbError === 'firestore_permission_denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-l-8 border-orange-500 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-4 text-orange-600 font-bold text-xl">
            <AlertTriangle size={28} />
            <h2>Access Denied</h2>
          </div>
          <p className="text-slate-700 mb-4">
            The app cannot read/write to the database. This usually means the security rules are too strict.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
             <h3 className="font-semibold text-slate-800 mb-2">Fix: Switch to Test Mode</h3>
             <p className="text-sm text-slate-600 mb-2">In Firebase Console {'>'} Firestore Database {'>'} Rules tab, paste this:</p>
             <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
             </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  // Config Warning
  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white p-6 rounded-2xl shadow-xl border-l-4 border-amber-500 max-w-md">
            <div className="flex items-center gap-3 mb-2 text-amber-600 font-bold text-lg">
               <AlertTriangle />
               Configuration Needed
            </div>
            <p className="text-slate-600 mb-4">To enable real-time cloud syncing, you must provide your Firebase Configuration.</p>
         </div>
      </div>
    )
  }

  // Onboarding Screen
  if (!state.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-white/50">
          {/* Dog Cluster Icon - Onboarding (Blue Prominent) */}
          <div className="flex justify-center items-end mb-6 -space-x-4">
            {/* Lulu (Pink) - Left, Background */}
            <div className="bg-pink-100 p-3 rounded-full ring-4 ring-white z-0 transform -rotate-12">
              <Dog size={32} className="text-pink-600" />
            </div>
             {/* Duke (Blue) - Center, Foreground, Largest */}
            <div className="bg-blue-100 p-4 rounded-full ring-4 ring-white z-10 mb-3">
              <Dog size={40} className="text-blue-600" />
            </div>
            {/* Molly (Purple) - Right, Background */}
            <div className="bg-purple-100 p-3 rounded-full ring-4 ring-white z-0 transform rotate-12">
              <Dog size={32} className="text-purple-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome to Pawsitive Petsitting</h1>
          <p className="text-center text-slate-500 mb-8">Let's set up the sitting schedule for Duke, Lulu, and Molly.</p>
          
          <form onSubmit={handleOnboarding} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pet Sitter Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required 
                  name="name" 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all bg-white text-slate-900" 
                  placeholder="e.g. Sarah" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <div className="relative w-full h-12">
                  {/* VISUAL LAYER: Displays the data prettily */}
                  <div className="absolute inset-0 w-full h-full border border-slate-200 rounded-xl bg-white flex items-center justify-between px-4 pointer-events-none z-0">
                     <span className="text-slate-900">
                        {onboardingDate.split('-').slice(1).join('/')}/{onboardingDate.split('-')[0]}
                     </span>
                     <Calendar size={20} className="text-slate-500" />
                  </div>
                  
                  {/* FUNCTIONAL LAYER: Invisible input that covers everything */}
                  <input 
                    required 
                    name="start" 
                    type="date" 
                    value={onboardingDate}
                    onChange={(e) => setOnboardingDate(e.target.value)}
                    onClick={(e) => {
                        // Backup trigger
                        try { e.currentTarget.showPicker() } catch(e) {}
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Days)</label>
                <input 
                  required 
                  name="days" 
                  type="number" 
                  min="1" 
                  max="30" 
                  defaultValue="3" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-all bg-white text-slate-900" 
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
              Create Schedule
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Dashboard
  // Parse current date string manually again for display to ensure local context consistency
  const [displayY, displayM, displayD] = currentDateStr.split('-').map(Number);
  const dateObj = new Date(displayY, displayM - 1, displayD);
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium">
          <BellRing size={14} className="text-primary-300" />
          <span>New update received!</span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3 text-rose-600 font-bold text-lg">
                 <AlertTriangle />
                 <h3>Reset Application?</h3>
               </div>
               <button onClick={() => setShowResetConfirm(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                 <X size={20} />
               </button>
             </div>
             
             <div className="text-slate-600 mb-6 space-y-2">
               <p>Are you sure you want to reset the app?</p>
               <p className="text-sm bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-100">
                 <strong>Warning:</strong> This will permanently delete ALL data, photos, and schedules for all users. This cannot be undone.
               </p>
             </div>

             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setShowResetConfirm(false)}
                 disabled={isResetting}
                 className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={performReset}
                 disabled={isResetting}
                 className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 transition-all flex justify-center items-center gap-2"
               >
                 {isResetting ? <RefreshCw className="animate-spin" size={18} /> : 'Yes, Reset Everything'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                 {/* Dog Cluster Icon - Header (Blue Prominent) */}
                 <div className="flex items-center -space-x-2 mr-1">
                    {/* Pink */}
                    <div className="bg-pink-100 p-1.5 rounded-full ring-2 ring-white z-0">
                       <Dog size={14} className="text-pink-700" />
                    </div>
                    {/* Blue - Center, Prominent */}
                    <div className="bg-blue-100 p-1.5 rounded-full ring-2 ring-white z-10 mb-1">
                       <Dog size={16} className="text-blue-700" />
                    </div>
                    {/* Purple */}
                    <div className="bg-purple-100 p-1.5 rounded-full ring-2 ring-white z-0">
                       <Dog size={14} className="text-purple-700" />
                    </div>
                 </div>
                 <div>
                   <h1 className="font-bold text-slate-800 leading-none">Pawsitive Petsitting</h1>
                   <p className="text-xs text-slate-500">Sitter: {state.sitterName}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Toggle View Mode */}
                <button 
                  onClick={() => setIsOwnerMode(!isOwnerMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                    ${isOwnerMode 
                      ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                >
                  {isOwnerMode ? <Eye size={14} /> : <Edit3 size={14} />}
                  {isOwnerMode ? 'Owner View' : 'Sitter View'}
                </button>

                {/* Status Indicator */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${saving ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                   <div className="relative w-2 h-2">
                      <div className={`absolute inset-0 rounded-full ${saving ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                      {!saving && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>}
                   </div>
                   {saving ? 'Syncing...' : 'Live'}
                </div>

                {/* Reset Button - Only visible in Owner Mode */}
                {isOwnerMode && (
                  <button 
                    type="button"
                    onClick={() => setShowResetConfirm(true)} 
                    disabled={isResetting}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1.5 ml-2 rounded-lg transition-colors flex items-center gap-1" 
                    title="Reset App & Wipe Data"
                  >
                    <LogOut size={16} />
                    <span className="text-xs font-bold">Reset App</span>
                  </button>
                )}
              </div>
           </div>

           {/* Date Navigation */}
           <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => setCurrentDayIndex(i => Math.max(0, i - 1))}
                disabled={currentDayIndex === 0}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-30 transition-colors text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <div className="text-xs font-bold text-primary-600 uppercase tracking-wide">Day {currentDayIndex + 1} of {state.totalDays}</div>
                <div className="font-semibold text-slate-800 text-sm">{formattedDate}</div>
              </div>
              <button 
                onClick={() => setCurrentDayIndex(i => Math.min(state.totalDays - 1, i + 1))}
                disabled={currentDayIndex === state.totalDays - 1}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-30 transition-colors text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Tasks */}
        <section>
          {TIME_SLOTS.map((slot) => (
            <TaskGroup 
              key={slot.id}
              slot={slot}
              dateStr={currentDateStr}
              completedTasks={currentLog.tasks}
              onToggle={toggleTask}
              onCompleteAll={completeAllInSlot}
              isReadOnly={isOwnerMode}
            />
          ))}
        </section>

        {/* Comments */}
        <section>
          <DogComments 
            comments={currentLog.comments} 
            onUpdate={updateComment} 
            isReadOnly={isOwnerMode}
          />
        </section>

        {/* Photos */}
        <section>
           <PhotoUpload 
              label="End of Day Photos" 
              photos={displayedPhotos} 
              onUpdate={(newPhotos) => updateLog({ photos: newPhotos })} 
              isReadOnly={isOwnerMode}
           />
        </section>

        {/* AI Summary */}
        <section className="pt-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                 <Sparkles size={20} className="text-indigo-500" />
                 <h2>Daily Summary</h2>
               </div>
               {!isOwnerMode && process.env.API_KEY && (
                   <button 
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                    className="text-xs bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
                   >
                     {summaryLoading ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                     {currentLog.aiSummary ? 'Regenerate' : 'Generate with AI'}
                   </button>
               )}
             </div>
             
             {currentLog.aiSummary ? (
               <div className="prose prose-sm prose-indigo text-slate-700 leading-relaxed bg-white/60 p-4 rounded-xl border border-indigo-50/50">
                 {currentLog.aiSummary}
               </div>
             ) : (
               <div className="text-center py-6 text-slate-400 text-sm italic">
                 {isOwnerMode 
                   ? "The sitter hasn't generated a summary for this day yet."
                   : "Complete the activities and comments above, then generate a summary for the owner!"
                 }
               </div>
             )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default App;
