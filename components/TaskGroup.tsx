
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
    return activity === ActivityType.Feeding ? <Utensils size={18} /> : <Droplets size={18} />;
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
      
      <div className="divide-y divide-slate-50">
        {dogs.map((dog) => (
          <div key={dog.name} className="flex flex-col p-3 gap-3">
            {/* Dog Header */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase ${getDogColorClasses(dog.color)}`}>
                {dog.name[0]}
              </div>
              <span className="text-slate-700 font-bold text-sm">{dog.name}</span>
            </div>
            
            {/* Activity Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
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
                      relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.98] touch-manipulation
                      ${isDone 
                        ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-200' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-slate-50'}
                      ${isReadOnly ? 'cursor-default opacity-90' : ''}
                    `}
                   >
                    {isDone && <Check size={18} className="animate-in zoom-in duration-200" />}
                    <div className="flex flex-col items-center leading-none gap-1">
                      <span className="flex items-center gap-2">
                        {getIcon(activity)} {activity}
                      </span>
                      {isDone && timestamp && (
                        <span className="text-[10px] font-medium opacity-90">
                          {formatTime(timestamp)}
                        </span>
                      )}
                    </div>
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