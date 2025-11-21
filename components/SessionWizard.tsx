
import React, { useState } from 'react';
import { DogConfig, DogColor, EmergencyContacts } from '../types';
import { createSession, checkSessionExists } from '../services/storageService';
import { ChevronLeft, Dog, Check, Loader2, Calendar, User, ChevronRight, Phone, ShieldAlert } from 'lucide-react';

interface SessionWizardProps {
  onComplete: (sessionId: string) => void;
  onCancel: () => void;
}

export const SessionWizard: React.FC<SessionWizardProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic Info
  const [sitterName, setSitterName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalDays, setTotalDays] = useState(3);
  
  // Step 2: Dogs
  const [numDogs, setNumDogs] = useState(1);
  const [dogs, setDogs] = useState<DogConfig[]>([{ name: '', color: 'blue' }]);

  // Step 3: Emergency Contacts
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');

  const COLORS: {id: DogColor, hex: string}[] = [
    { id: 'blue', hex: 'bg-blue-500' },
    { id: 'pink', hex: 'bg-pink-500' },
    { id: 'purple', hex: 'bg-purple-500' },
    { id: 'orange', hex: 'bg-orange-500' },
    { id: 'teal', hex: 'bg-teal-500' },
    { id: 'indigo', hex: 'bg-indigo-500' },
  ];

  // Helper to format phone numbers as (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleDogCountChange = (count: number) => {
    setNumDogs(count);
    const newDogs = [...dogs];
    if (count > newDogs.length) {
       for (let i = newDogs.length; i < count; i++) {
          newDogs.push({ name: '', color: COLORS[i % COLORS.length].id });
       }
    } else {
       newDogs.splice(count);
    }
    setDogs(newDogs);
  };

  const updateDog = (index: number, field: keyof DogConfig, value: any) => {
    const newDogs = [...dogs];
    newDogs[index] = { ...newDogs[index], [field]: value };
    setDogs(newDogs);
  };

  // Generate a Friendly Code: SITTER-NUMBER (e.g., SARAH-42)
  const generateFriendlyCode = () => {
    // 1. Sitter First Name (Cleaned, only letters)
    const sitterPart = (sitterName.split(' ')[0] || 'SITTER')
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 10)
      .toUpperCase();

    // 2. Random 2-digit number (10-99)
    const num = Math.floor(Math.random() * 90 + 10);

    return `${sitterPart}-${num}`;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
       // Collision Detection Loop
       let id = generateFriendlyCode();
       let isUnique = false;
       let attempts = 0;

       // Try up to 5 times to get a unique friendly ID
       while (!isUnique && attempts < 5) {
          const exists = await checkSessionExists(id);
          if (exists) {
             // Code taken! Roll the dice again with a new random number
             console.log(`Code ${id} taken, retrying...`);
             id = generateFriendlyCode();
             attempts++;
          } else {
             isUnique = true;
          }
       }

       // Fallback: If Sarah is extremely popular and we failed 5 times, add a 3rd digit to ensure uniqueness
       if (!isUnique) {
          id = `${id}-${Math.floor(Math.random() * 9)}`;
       }
       
       const emergencyContacts: EmergencyContacts = {
         primary: { name: primaryName || 'Primary', phone: primaryPhone },
         secondary: { name: secondaryName || 'Secondary', phone: secondaryPhone },
         vet: { name: vetName || 'Vet', phone: vetPhone }
       };

       await createSession({
         id,
         sitterName,
         startDate,
         totalDays,
         dogs: dogs.map(d => ({ ...d, name: d.name || `Dog ${dogs.indexOf(d) + 1}` })),
         emergencyContacts,
         createdAt: Date.now()
       });
       onComplete(id);
    } catch (e) {
       alert("Error creating session. Please check connection.");
       console.error(e);
       setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        <div className="bg-primary-600 p-6 text-white">
          <button onClick={onCancel} className="flex items-center gap-1 text-primary-100 hover:text-white mb-4">
             <ChevronLeft size={18} /> Back
          </button>
          <h2 className="text-2xl font-bold">Setup New Sitting</h2>
          <div className="flex gap-2 mt-4">
             <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-primary-500'}`} />
             <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-primary-500'}`} />
             <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-white' : 'bg-primary-500'}`} />
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Sitter Name</label>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={sitterName}
                      onChange={e => setSitterName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary-500 transition-all bg-white text-slate-900"
                      placeholder="e.g. Sarah"
                    />
                 </div>
               </div>
               <div className="grid grid-cols-[2fr_1fr] gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                   <input 
                     type="date"
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary-500 transition-all bg-white text-slate-900"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
                   <input 
                     type="number"
                     min="1" max="30"
                     value={totalDays}
                     onChange={e => setTotalDays(parseInt(e.target.value))}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary-500 transition-all bg-white text-slate-900"
                   />
                 </div>
               </div>
               <button 
                 disabled={!sitterName}
                 onClick={() => setStep(2)}
                 className="w-full bg-primary-600 disabled:opacity-50 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
               >
                 Next <ChevronRight size={18} />
               </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">How many dogs?</label>
                 <div className="bg-white p-3 rounded-xl border border-slate-200">
                   <input 
                     type="range"
                     min="1" max="5"
                     value={numDogs}
                     onChange={e => handleDogCountChange(parseInt(e.target.value))}
                     className="w-full accent-primary-600 cursor-pointer"
                   />
                   <div className="text-center font-bold text-primary-600 text-lg mt-1">{numDogs} Dogs</div>
                 </div>
               </div>

               <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                 {dogs.map((dog, idx) => (
                   <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-shrink-0">
                        <div className="text-xs text-slate-400 mb-1 text-center">Color</div>
                        <div className="grid grid-cols-2 gap-1">
                           {COLORS.slice(0, 6).map(c => (
                             <button 
                               key={c.id}
                               onClick={() => updateDog(idx, 'color', c.id)}
                               className={`w-5 h-5 rounded-full ${c.hex} ${dog.color === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-50 hover:opacity-80'}`}
                             />
                           ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 font-medium uppercase mb-1 block">Dog {idx + 1} Name</label>
                        <input 
                          value={dog.name}
                          onChange={e => updateDog(idx, 'name', e.target.value)}
                          placeholder={`e.g. ${['Buster', 'Bella', 'Max', 'Luna', 'Charlie'][idx] || 'Spot'}`}
                          className="w-full p-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400 transition-colors"
                        />
                      </div>
                   </div>
                 ))}
               </div>

               <button 
                 onClick={() => setStep(3)}
                 disabled={dogs.some(d => !d.name)}
                 className="w-full bg-primary-600 disabled:opacity-50 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
               >
                 Next <ChevronRight size={18} />
               </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="font-bold text-slate-800">Emergency Contacts</h3>
                <p className="text-xs text-slate-500">Who should be called in an emergency?</p>
              </div>

              <div className="space-y-4">
                 {/* Primary */}
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-primary-700 uppercase mb-2">
                      <User size={14} /> Primary Contact
                    </label>
                    <input 
                      value={primaryName}
                      onChange={e => setPrimaryName(e.target.value)}
                      placeholder="Name (e.g. Robert)"
                      className="w-full p-2 mb-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400"
                    />
                    <input 
                      value={primaryPhone}
                      onChange={e => setPrimaryPhone(formatPhoneNumber(e.target.value))}
                      maxLength={14}
                      placeholder="(555) 555-5555"
                      type="tel"
                      className="w-full p-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400"
                    />
                 </div>

                 {/* Secondary */}
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                      <User size={14} /> Secondary Contact
                    </label>
                    <input 
                      value={secondaryName}
                      onChange={e => setSecondaryName(e.target.value)}
                      placeholder="Name (e.g. Patty)"
                      className="w-full p-2 mb-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400"
                    />
                    <input 
                      value={secondaryPhone}
                      onChange={e => setSecondaryPhone(formatPhoneNumber(e.target.value))}
                      maxLength={14}
                      placeholder="(555) 555-5555"
                      type="tel"
                      className="w-full p-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400"
                    />
                 </div>

                 {/* Vet */}
                 <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase mb-2">
                      <ShieldAlert size={14} /> Veterinarian
                    </label>
                    <input 
                      value={vetName}
                      onChange={e => setVetName(e.target.value)}
                      placeholder="Clinic Name"
                      className="w-full p-2 mb-2 bg-white text-slate-900 border border-rose-200 rounded-lg text-sm outline-none focus:border-rose-400"
                    />
                    <input 
                      value={vetPhone}
                      onChange={e => setVetPhone(formatPhoneNumber(e.target.value))}
                      maxLength={14}
                      placeholder="(555) 555-5555"
                      type="tel"
                      className="w-full p-2 bg-white text-slate-900 border border-rose-200 rounded-lg text-sm outline-none focus:border-rose-400"
                    />
                 </div>
              </div>

              <button 
                 onClick={handleSubmit}
                 disabled={loading}
                 className="w-full bg-primary-600 disabled:opacity-50 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Create & Get Code</>}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
