import React from 'react';
import { DogName } from '../types';
import { MessageSquare } from 'lucide-react';

interface DogCommentsProps {
  comments: Record<DogName, string>;
  onUpdate: (dog: DogName, text: string) => void;
  isReadOnly: boolean;
}

export const DogComments: React.FC<DogCommentsProps> = ({ comments, onUpdate, isReadOnly }) => {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
         <MessageSquare size={20} className="text-primary-500" />
         <h2>Daily Notes & Stories</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {Object.values(DogName).map((dog) => (
          <div key={dog} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes for <span className="text-primary-600">{dog}</span>
            </label>
            <textarea
              disabled={isReadOnly}
              value={comments[dog] || ''}
              onChange={(e) => onUpdate(dog, e.target.value)}
              placeholder={isReadOnly ? "No notes added." : `How was ${dog} today? Any funny stories?`}
              className={`w-full p-3 rounded-xl border border-slate-200 outline-none transition-all text-sm min-h-[80px] bg-white text-slate-900
                ${isReadOnly 
                  ? 'bg-slate-50 text-slate-600 border-slate-100 resize-none' 
                  : 'focus:border-primary-400 focus:ring focus:ring-primary-100'
                }
              `}
            />
          </div>
        ))}
      </div>
    </div>
  );
};