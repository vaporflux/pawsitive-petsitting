
import React from 'react';
import { TimeSlot, ActivityType, DogConfig } from '../types';
import { Check, Utensils, Droplets, CheckCircle2, MessageCircle } from 'lucide-react';

interface TaskGroupProps {
  slot: TimeSlot;
  completedTasks: Record<string, boolean>;
  taskTimestamps?: Record<string, number>;
  dateStr: string;
  dogs: DogConfig[];
  onToggle: (taskId: string) => void;
  onCompleteAll: (slotId: string) => void;
  isReadOnly: boolean;
  ownerPhone?: string;
}

export const TaskGroup: React.FC<TaskGroupProps> = ({ 
  slot, 
  completedTasks, 
  taskTimestamps,
  dateStr, 
  dogs,
  onToggle, 
  onCompleteAll,
  isReadOnly,
  ownerPhone
}) => {
  
  const getIcon = (activity: ActivityType) => {
    return activity === ActivityType.Feeding ? <Utensils size={14} /> : <Droplets size={14} />;
  };

  const getDogColorClasses = (color: string) => {
    switch(color) {
      case 'blue': return 'bg-blue-100 text-blue-700';
      case 'pink': return 'bg-pink-100 text-pink-700';
      case 'purple': return 'bg-purple-100 text-purple-700';
      case 'orange': return 'bg-orange-100 text-orange-700';
      case 'teal': return 'bg-teal-100 text-teal-700';
      case 'indigo': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleNotify = () => {
    if (!ownerPhone) return;
    
    // Create a cheerful message
    const text = `Pawsitive Update: The ${slot.label} is complete for ${dogs.map(d => d.name).join(', ')}! 🐾`;
    
    // Clean phone number (remove non-digits)
    const cleanPhone = ownerPhone.replace(/[^\d]/g, '');
    
    // Construct SMS link (works on iOS and Android)
    // Note: '&' is often safer for iOS to separate body, '?' is standard. 
    // Using the most compatible hybrid approach usually involves just window.open
    const url = `sms:${cleanPhone}?&body=${encodeURIComponent(text)}`;
    
    window.location.href = url;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
      <div className="bg-primary-50/50 px-4 py-3 border-b border-primary-100/50 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-primary-900">{slot.label}</h3>
          <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
            {slot.timeRange}
          </span>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            {ownerPhone && (
               <button 
                 onClick={handleNotify}
                 title="Text Owner"
                 className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:bg-primary-100/50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-primary-200"
               >
                 <MessageCircle size={14} />
                 <span className="hidden sm:inline">Notify</span>
               </button>
            )}
            <button 
              onClick={() => onCompleteAll(slot.id)}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:bg-primary-100/50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-primary-200"
            >
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">Check All</span>
              <span className="sm:hidden">All</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="p-2">
        {dogs.map((dog) => (
          <div key={dog.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase ${getDogColorClasses(dog.color)}`}>
                {dog.name[0]}
              </div>
              <span className="text-slate-700 font-medium text-sm">{dog.name}</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {slot.activities.map((activity) => {
                 const taskId = `${dateStr}-${slot.id}-${dog.name}-${activity}`;
                 const isDone = completedTasks[taskId];
                 const timestamp = taskTimestamps?.[taskId];

                 return (
                   <button
                    key={taskId}
                    onClick={() => !isReadOnly && onToggle(taskId)}
                    disabled={isReadOnly}
                    className={`
                      relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                      ${isDone 
                        ? 'bg-primary-500 border-primary-500 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-600'}
                      ${isReadOnly ? 'cursor-default opacity-90' : ''}
                    `}
                   >
                    {isDone && <Check size={12} className="animate-in zoom-in duration-200" />}
                    <span className="flex items-center gap-1">
                      {getIcon(activity)} {activity}
                      {isDone && timestamp && (
                        <span className="text-[10px] italic text-white/80 ml-1 font-normal border-l border-white/30 pl-1.5">
                          {formatTime(timestamp)}
                        </span>
                      )}
                    </span>
                   </button>
                 );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
