import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../lib/api';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  onRemove: () => void;
}

export function ImageUpload({ currentImageUrl, onImageChange, onRemove }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Vérifications
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const { url } = await api.uploadImage(file);
      onImageChange(url);
    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };



  // Pour mobile: input dédié à la capture photo
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  // Correction : handleClick doit être défini ici
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Image de l'article
      </label>

      {currentImageUrl ? (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="Article"
            className="w-full h-48 object-contain rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragging 
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }
              ${isUploading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {isDragging ? (
                  <Upload className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isDragging 
                    ? 'Déposez l\'image ici' 
                    : 'Glissez-déposez une image ou cliquez pour sélectionner'
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF jusqu'à 5MB
                </p>
              </div>
            )}
          </div>

          {/* Bouton prendre une photo sur mobile uniquement */}
          <div className="mt-2 flex justify-center">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={handleCameraClick}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors block sm:hidden"
              style={{ display: 'block' }}
            >
              Prendre une photo
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
