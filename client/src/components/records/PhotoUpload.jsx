import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, Upload, MapPin, Eye, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { watermarkImage } from '../../utils/watermark';
import { getPhotoUrl } from '../../utils/api';

export default function PhotoUpload({
  photos = [],
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 4,
  location = null,
  ghanaPostAddress = null,
  collectorName = null,
  moduleType = 'property',
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [processing, setProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [previewModalPhoto, setPreviewModalPhoto] = useState(null);

  const hasLocation = location?.latitude != null && location?.longitude != null;

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setProcessing(true);
    setProcessingCount(filesToProcess.length);

    try {
      for (const file of filesToProcess) {
        // Automatically burn real-time GPS coordinates, GhanaPost address,
        // and collector identity onto the image canvas
        const stampedPhoto = await watermarkImage(file, {
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy,
          ghanaPostAddress,
          collectorName,
          moduleType,
          capturedAt: new Date(),
        });

        onAddPhoto(stampedPhoto);
      }
    } catch (err) {
      console.error('Error auto-geotagging photo:', err);
      alert('Photo was uploaded, but auto-geotagging encountered an issue: ' + (err.message || ''));
      // Fallback: load raw file if watermarking fails
      for (const file of filesToProcess) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onAddPhoto({
            file,
            previewUrl: e.target.result,
            name: file.name,
            size: file.size,
            geotagged: false,
          });
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setProcessing(false);
      setProcessingCount(0);
      // Reset input values so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const isFull = photos.length >= maxPhotos;

  return (
    <div className="space-y-3">
      {/* Header with Geotag Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">Property / Signboard Photographs</span>
          {hasLocation ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title={`Coordinates (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}) will be auto-burned onto pictures`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Auto-Geotag Active</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
              title="Capture GPS above first so photos are stamped with exact coordinates"
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>GPS Pending</span>
            </span>
          )}
        </div>

        <span className="text-gray-500 font-medium">
          {photos.length} of {maxPhotos} photos attached
        </span>
      </div>

      {/* Helpful hint banner if GPS is not yet captured */}
      {!hasLocation && photos.length === 0 && (
        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Recommended:</strong> Capture device GPS or pin location on the map above first. Any picture taken will be automatically stamped with the exact coordinates and GSMA verification watermark.
          </span>
        </div>
      )}

      {/* Grid of photo thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo, idx) => {
          const imgSrc = photo.previewUrl || getPhotoUrl(photo.thumbnail_path) || getPhotoUrl(photo.file_path);
          return (
            <div
              key={idx}
              className="group relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm cursor-pointer"
              onClick={() => setPreviewModalPhoto(photo)}
              title="Click to view full photo and watermark"
            >
              <img
                src={imgSrc}
                alt={`Capture ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  if (photo.file_path && e.target.src !== getPhotoUrl(photo.file_path)) {
                    e.target.src = getPhotoUrl(photo.file_path);
                  } else {
                    e.target.onerror = null;
                    e.target.src =
                      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=300&q=80';
                  }
                }}
              />

              {/* Geotagged badge overlay */}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/75 backdrop-blur-xs rounded text-[9px] font-semibold text-white flex items-center gap-1 shadow-sm">
                <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                <span>Geotagged</span>
              </div>

              {/* Hover overlay with Preview icon */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Eye className="w-5 h-5 text-white drop-shadow" />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePhoto(idx);
                }}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-90 transition-colors z-10"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Processing Spinner Box */}
        {processing && (
          <div className="aspect-video sm:aspect-square rounded-xl border-2 border-primary-300 bg-primary-50/50 flex flex-col items-center justify-center p-3 gap-2 text-center animate-pulse">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            <span className="text-[11px] font-semibold text-primary-800">
              Burning GPS Geotag...
            </span>
          </div>
        )}

        {/* Upload Buttons */}
        {!isFull && !processing && (
          <div className="aspect-video sm:aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-500 flex flex-col items-center justify-center p-3 gap-2 bg-gray-50/50 hover:bg-gray-50 transition-colors text-center">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-2.5 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors shadow-xs"
                title="Take Photo with Camera"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors shadow-xs"
                title="Choose from Gallery"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[11px] text-gray-700 font-semibold">Take / Add Photo</span>
              <span className="block text-[10px] text-gray-400">Auto-stamped with GPS</span>
            </div>

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

      {/* Lightbox / Full Photo Modal */}
      {previewModalPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewModalPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-gray-950 flex items-center justify-between text-white border-b border-gray-800 text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Geotagged Photo Preview (Official Verification Watermark)
              </span>
              <button
                onClick={() => setPreviewModalPhoto(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto p-2 flex items-center justify-center bg-black/60">
              <img
                src={previewModalPhoto.previewUrl || getPhotoUrl(previewModalPhoto.file_path)}
                alt="Full Geotagged View"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
