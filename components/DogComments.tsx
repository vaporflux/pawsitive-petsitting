
import React from 'react';
import { DogConfig } from '../types';
import { MessageSquare } from 'lucide-react';

interface DogCommentsProps {
  dogs: DogConfig[];
  comments: Record<string, string>;
  onUpdate: (dogName: string, text: string) => void;
  isReadOnly: boolean;
}

export const DogComments: React.FC<DogCommentsProps> = ({ dogs, comments, onUpdate, isReadOnly }) => {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
         <MessageSquare size={20} className="text-primary-500" />
         <h2>Daily Notes & Stories</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {dogs.map((dog) => (
          <div key={dog.name} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes for <span className="text-primary-600">{dog.name}</span>
            </label>
            <textarea
              disabled={isReadOnly}
              value={comments[dog.name] || ''}
              onChange={(e) => onUpdate(dog.name, e.target.value)}
              placeholder={isReadOnly ? "No notes added." : `How was ${dog.name} today? Any funny stories?`}
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
