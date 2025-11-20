import React from 'react';
import { TimeSlot, DOGS, ActivityType, DogName } from '../types';
import { Check, Utensils, Droplets, CheckCircle2 } from 'lucide-react';

interface TaskGroupProps {
  slot: TimeSlot;
  completedTasks: Record<string, boolean>;
  dateStr: string;
  onToggle: (taskId: string) => void;
  onCompleteAll: (slotId: string) => void;
  isReadOnly: boolean;
}

export const TaskGroup: React.FC<TaskGroupProps> = ({ 
  slot, 
  completedTasks, 
  dateStr, 
  onToggle, 
  onCompleteAll,
  isReadOnly 
}) => {
  
  const getIcon = (activity: ActivityType) => {
    return activity === ActivityType.Feeding ? <Utensils size={14} /> : <Droplets size={14} />;
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
          <button 
            onClick={() => onCompleteAll(slot.id)}
            className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:bg-primary-100/50 px-2 py-1 rounded-lg transition-colors"
          >
            <CheckCircle2 size={14} />
            Check All
          </button>
        )}
      </div>
      
      <div className="p-2">
        {DOGS.map((dog) => (
          <div key={dog} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold 
                ${dog === DogName.Duke ? 'bg-blue-100 text-blue-700' : 
                  dog === DogName.Lulu ? 'bg-pink-100 text-pink-700' : 
                  'bg-purple-100 text-purple-700'}`}>
                {dog[0]}
              </div>
              <span className="text-slate-700 font-medium text-sm">{dog}</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {slot.activities.map((activity) => {
                 const taskId = `${dateStr}-${slot.id}-${dog}-${activity}`;
                 const isDone = completedTasks[taskId];

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