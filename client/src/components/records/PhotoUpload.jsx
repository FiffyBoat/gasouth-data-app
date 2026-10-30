import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X, Upload } from 'lucide-react';

export default function PhotoUpload({ photos = [], onAddPhoto, onRemovePhoto, maxPhotos = 4 }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      // Create local preview and object
      const reader = new FileReader();
      reader.onload = (e) => {
        onAddPhoto({
          file,
          previewUrl: e.target.result,
          name: file.name,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const isFull = photos.length >= maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-700">Property / Signboard Photographs</span>
        <span>
          {photos.length} of {maxPhotos} max photos
        </span>
      </div>

      {/* Grid of photo thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo, idx) => {
          const imgSrc = photo.previewUrl || photo.thumbnail_path || photo.file_path;
          return (
            <div
              key={idx}
              className="group relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm"
            >
              <img
                src={imgSrc}
                alt={`Capture ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (photo.file_path && e.target.src !== photo.file_path) {
                    e.target.src = photo.file_path;
                  } else {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=300&q=80';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-90 transition-opacity"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Upload Buttons */}
        {!isFull && (
          <div className="aspect-video sm:aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-500 flex flex-col items-center justify-center p-3 gap-2 bg-gray-50/50 hover:bg-gray-50 transition-colors text-center">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                title="Take Photo with Camera"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="Choose from Gallery"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Add Photo</span>

            {/* Hidden native inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
