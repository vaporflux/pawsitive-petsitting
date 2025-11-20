
import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2, Plus } from 'lucide-react';

interface PhotoUploadProps {
  label: string;
  photos: string[];
  onUpdate: (photos: string[]) => void;
  isReadOnly: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ label, photos = [], onUpdate, isReadOnly }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // Compress image to ensure we can store multiple photos without hitting Firestore 1MB limit
  // Max Width 600px and Quality 0.6 should result in ~30-50KB per image.
  const compressImage = (base64Str: string, maxWidth: number = 600, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
            resolve(base64Str);
        }
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLoading(true);
      const newPhotos: string[] = [];
      let processedCount = 0;

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          try {
            const compressedBase64 = await compressImage(rawBase64);
            newPhotos.push(compressedBase64);
          } catch (err) {
            console.error("Compression error", err);
            newPhotos.push(rawBase64);
          } finally {
            processedCount++;
            if (processedCount === files.length) {
                // Append new photos to existing ones, limiting to 6 total
                const updatedList = [...photos, ...newPhotos].slice(0, 6);
                onUpdate(updatedList);
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemove = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const MAX_PHOTOS = 6;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Camera size={16} />
        {label} <span className="text-xs font-normal normal-case text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <div key={index} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-100">
            <img 
              src={photo} 
              alt={`Upload ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            {!isReadOnly && (
              <button 
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {/* Add Photo Button */}
        {!isReadOnly && photos.length < MAX_PHOTOS && (
           <div 
             onClick={() => fileInputRef.current?.click()}
             className="border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-primary-600"
           >
             {loading ? (
                <Loader2 className="animate-spin" size={24} />
             ) : (
                <>
                   <Plus size={24} className="mb-1" />
                   <span className="text-xs font-medium">Add Photo</span>
                </>
             )}
             <input 
               type="file" 
               accept="image/*" 
               multiple
               className="hidden" 
               ref={fileInputRef}
               onChange={handleFileChange}
             />
           </div>
        )}
        
        {/* Empty State Placeholder for Owner View if no photos */}
        {isReadOnly && photos.length === 0 && (
           <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
             No photos uploaded today.
           </div>
        )}
      </div>
    </div>
  );
};
