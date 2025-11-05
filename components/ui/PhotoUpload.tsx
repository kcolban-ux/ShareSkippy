'use client';
import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import OptimizedImage from './OptimizedImage';

/**
 * Compresses an image file to be under 100KB as a JPEG.
 * @param file The original image file.
 * @returns A Promise that resolves with the compressed File object.
 */
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return reject(new Error('Failed to get canvas context'));
    }

    const img = new Image();

    // Make the onload handler async to use await
    img.onload = async () => {
      // Calculate new dimensions to maintain aspect ratio
      const maxSize = 800; // Max width/height
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      let dataUrl: string;
      let base64Size = Infinity;
      const targetSize = 100000; // 100KB

      // Use a while loop instead of recursion
      while (base64Size > targetSize && quality > 0.1) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Approximate size in bytes
        base64Size = dataUrl.length * 0.75;

        if (base64Size > targetSize) {
          quality = Math.max(0.1, quality - 0.1);
        }
      }

      // Flatten the promise chain using async/await
      try {
        const res = await fetch(dataUrl!);
        const blob = await res.blob();
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      let errorMessage: string;

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Event) {
        // The 'err' in onerror is often a generic Event, not a detailed Error object
        errorMessage = 'Image load event error';
      } else {
        // Fallback for any other type
        errorMessage = String(err);
      }

      reject(new Error(`Failed to load image for compression: ${errorMessage}`));
    };

    img.src = URL.createObjectURL(file);
  });
};

interface PhotoUploadProps {
  /** Callback function triggered when a photo is successfully uploaded or removed. */
  // eslint-disable-next-line no-unused-vars
  onPhotoUploaded: (url: string) => void;
  /** The initial URL of the photo to display. */
  initialPhotoUrl: string | null;
  /** Whether the upload functionality should be disabled. */
  disabled?: boolean;
  /** The name of the Supabase storage bucket to use. */
  bucketName?: string;
}

const PhotoUpload = React.memo<PhotoUploadProps>(
  ({ onPhotoUploaded, initialPhotoUrl, disabled = false, bucketName = 'profile-photos' }) => {
    const [uploading, setUploading] = useState<boolean>(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    /**
     * Uploads the given file to Supabase storage.
     */
    const uploadToStorage = useCallback(
      async (file: File): Promise<string> => {
        try {
          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Generate unique filename
          const fileExt = file.name.split('.').pop();
          if (!fileExt) throw new Error('File has no extension');

          const fileName = `${user.id}/${Date.now()}.${fileExt}`;

          console.log('Uploading to bucket:', bucketName);
          console.log('File name:', fileName);
          console.log('File size:', file.size);

          // Upload to Supabase Storage
          const { error: uploadError, data } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          console.log('Upload successful:', data);

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(fileName);

          if (!publicUrl) {
            throw new Error('Failed to get public URL after upload.');
          }

          console.log('Public URL:', publicUrl);
          return publicUrl;
        } catch (error: unknown) {
          console.error('Error uploading to storage:', error);

          let message: string;

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'object' && error !== null && 'message' in error) {
            // Safely extract the message property, coercing it to a string.
            message = String((error as { message: unknown }).message);
          } else {
            // Fallback to converting the entire error value to a string.
            message = String(error);
          }

          if (message.startsWith('Upload failed:')) {
            throw new Error(message);
          }

          throw new Error(`Upload failed: ${message}`);
        }
      },
      [supabase, bucketName]
    );

    /**
     * Handles the file input change event.
     */
    const handleFileUpload = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
          setError('');
          setUploading(true);

          if (!event.target.files || event.target.files.length === 0) {
            setUploading(false);
            return;
          }

          const file = event.target.files[0];
          console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);

          // Validate file type
          if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            setUploading(false);
            return;
          }

          // Validate file size (original file should be reasonable)
          if (file.size > 10 * 1024 * 1024) {
            // 10MB limit
            setError('File size too large. Please select a smaller image.');
            setUploading(false);
            return;
          }

          // Compress the image
          console.log('Compressing image...');
          const compressedFile = await compressImage(file);
          console.log('Compressed file size:', compressedFile.size);

          // Upload to Supabase Storage
          console.log('Starting upload...');
          const uploadedUrl = await uploadToStorage(compressedFile);

          console.log('Upload completed successfully');
          setPhotoUrl(uploadedUrl);
          onPhotoUploaded(uploadedUrl);
          setUploading(false);
        } catch (error: unknown) {
          console.error('Error uploading photo:', error);

          let message: string;

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          } else {
            message = 'Unknown file upload error.';
          }

          setError(message);
          setUploading(false);
        }
      },
      [onPhotoUploaded, uploadToStorage]
    );

    /**
     * Removes the currently displayed photo from storage and state.
     */
    const removePhoto = useCallback(async () => {
      const isSupabaseUrl =
        photoUrl?.includes('.supabase.co') || photoUrl?.includes('supabase.mock');

      if (isSupabaseUrl) {
        try {
          if (!photoUrl) return; // Should not happen

          // Extract file path from URL
          const urlParts = photoUrl.split('/');
          const filePath = urlParts.slice(-2).join('/'); // Get last two parts

          // Delete from storage
          await supabase.storage.from(bucketName).remove([filePath]);
        } catch (error: unknown) {
          let errorMessage: string;

          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else {
            errorMessage = 'An unknown error occurred during photo removal.';
          }

          console.error('Error removing photo:', errorMessage);
        }
      }

      setPhotoUrl(null);
      onPhotoUploaded(''); // Notify parent that photo is removed
    }, [onPhotoUploaded, photoUrl, supabase, bucketName]);

    let buttonText: string;
    if (uploading) {
      buttonText = 'Uploading...';
    } else if (photoUrl) {
      buttonText = 'Change Photo';
    } else {
      buttonText = 'Upload Photo';
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          {photoUrl ? (
            <div className="relative">
              <OptimizedImage
                src={photoUrl}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                priority={true}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  &times;
                </button>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-xs text-center">No photo</span>
            </div>
          )}

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || disabled}
              className="hidden"
            />

            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonText}
              </button>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Upload a profile photo (will be compressed to 100KB)
            </p>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    );
  }
);

PhotoUpload.displayName = 'PhotoUpload';

export default PhotoUpload;
