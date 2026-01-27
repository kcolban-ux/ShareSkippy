'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import OptimizedImage from './OptimizedImage';

// #region Types
/**
 * @interface PhotoUploadProps
 * @description Props required for the PhotoUpload component.
 */
interface PhotoUploadProps {
  // eslint-disable-next-line no-unused-vars
  onPhotoUploaded: (url: string) => void;
  initialPhotoUrl: string;
  disabled?: boolean;
  bucketName?: string;
  id: string; // Added 'id' prop for accessibility/labeling
}

/**
 * @function toBlob
 * @description Helper function to convert Data URL to Blob, returning a Promise.
 * @param {string} dataUrl - Base64 encoded data URL.
 * @returns {Promise<Blob>}
 */
const toBlob = (dataUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    fetch(dataUrl)
      .then((res) => res.blob())
      .then(resolve)
      .catch(reject);
  });
};
// #endregion Types

// #region Logic: Image Compression
/**
 * @function compressImage
 * @description Resizes and compresses an image file to maintain quality under a 100KB target size.
 * Uses a synchronous loop for reliable quality reduction.
 * @param {File} file - The original image file.
 * @returns {Promise<File>} - A promise that resolves with the compressed image file (JPEG).
 */
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onerror = () => reject(new Error('Image failed to load.'));

    img.onload = async () => {
      // 1. Resize Calculation
      const maxSize = 800; // Max width/height
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx!.drawImage(img, 0, 0, width, height); // Used non-null assertion on ctx as canvas context is guaranteed

      // 2. Compression Loop (Synchronous fix)
      let quality = 0.9;
      let dataUrl: string;
      let blob: Blob;

      do {
        // toDataURL is synchronous! This is the key fix.
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        blob = await toBlob(dataUrl);

        // 100KB = 100,000 bytes
        if (blob.size > 100000 && quality > 0.1) {
          quality -= 0.1;
        } else {
          break; // Exit loop if size is acceptable or quality is too low
        }
      } while (quality > 0.1);

      // 3. Resolve with the final compressed File object
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpeg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Ensure the file name reflects the new JPEG format if it was PNG/HEIC etc.
      resolve(compressedFile);
    };

    img.src = URL.createObjectURL(file);
  });
};
// #endregion Logic: Image Compression

// #region Function based extraction
/**
 * @function getUploadButtonText
 * @description Determines the appropriate text for the photo upload button based on state.
 * @param {boolean} uploading - True if a file is currently being uploaded.
 * @param {string} photoUrl - The current URL of the uploaded photo.
 * @returns {string} The button text.
 */
const getUploadButtonText = (uploading: boolean, photoUrl: string): string => {
  if (uploading) {
    return 'Uploading...';
  }

  if (photoUrl) {
    return 'Change Photo';
  }

  return 'Upload Photo';
};
// #endregion Function based extraction

// #region Component Definition
const PhotoUpload = React.memo(
  ({
    onPhotoUploaded,
    initialPhotoUrl,
    disabled = false,
    bucketName = 'profile-photos',
    id,
  }: PhotoUploadProps) => {
    // #region State and Refs
    const [uploading, setUploading] = useState<boolean>(false);
    const [photoUrl, setPhotoUrl] = useState<string>(initialPhotoUrl);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    // #endregion State and Refs

    // #region Supabase Interaction Handlers
    /**
     * @function uploadToStorage
     * @description Handles the authentication check, path generation, and upload to Supabase storage.
     * @param {File} file - The compressed File object.
     * @returns {Promise<string>} - The public URL of the uploaded photo.
     */
    const uploadToStorage = useCallback(
      async (file: File): Promise<string> => {
        // Explicit return type
        try {
          // Get current user (type-safe access to user)
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user?.id) throw new Error('User not authenticated');

          // Use the correct file extension for the output JPEG file
          const fileName = `${user.id}/${Date.now()}.jpeg`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg', // Ensure content type is set correctly
            });

          if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw uploadError; // Throw the raw Supabase error object
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(fileName);

          return publicUrl;
        } catch (error: unknown) {
          // FIX: Use instanceof Error to safely extract the message property.
          console.error('Error uploading to storage:', error);

          let message: string;
          if (error instanceof Error) {
            message = error.message;
          } else {
            // This covers Supabase AuthError/StorageError objects which may not inherit from Error
            // but often have a message property, or cases where a string/object was thrown.
            message = (error as { message?: string })?.message || 'Unknown storage error';
          }

          // Throw a new, standard Error object to ensure the outer handler receives a safe type.
          throw new Error(`Upload failed: ${message}`);
        }
      },
      [bucketName, supabase]
    );

    /**
     * @function handleFileUpload
     * @description Orchestrates file validation, compression, and final upload.
     * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
     * @returns {Promise<void>}
     */
    const handleFileUpload = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        // Explicit event type
        try {
          setError('');
          setUploading(true);

          const file = event.target.files?.[0];
          if (!file) return;

          // 1. Validation
          if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            // 10MB limit
            setError('File size too large. Max allowed is 10MB before compression.');
            return;
          }

          // 2. Compression (using the fixed logic)
          const compressedFile = await compressImage(file);

          // 3. Upload
          const uploadedUrl = await uploadToStorage(compressedFile);

          setPhotoUrl(uploadedUrl);
          onPhotoUploaded(uploadedUrl);
        } catch (err: unknown) {
          // This outer catch now receives a standard Error object (from uploadToStorage)
          // or a native browser error (from fetch/compression).
          console.error('Error saving profile:', err);

          let errorMessage: string;

          if (err instanceof Error) {
            // Narrow the type to access properties safely
            errorMessage = err.message;
          } else {
            // Final fallback for completely unexpected errors
            errorMessage = `An unknown error occurred: ${String(err)}`;
          }

          setError(errorMessage);
        } finally {
          setUploading(false);
          // Reset file input value to allow re-uploading the same file immediately
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      [onPhotoUploaded, uploadToStorage]
    );

    /**
     * @function removePhoto
     * @description Removes the photo from state and attempts to delete it from Supabase storage.
     * @returns {Promise<void>}
     */
    const removePhoto = useCallback(async () => {
      if (photoUrl?.includes('supabase')) {
        try {
          // Path extraction remains simplified but functional for standard Supabase URLs
          const urlParts = photoUrl.split('/');
          const bucketIndex = urlParts.indexOf(bucketName);

          if (bucketIndex === -1) {
            // Handle cases where the URL structure is unexpected, but proceed with state update
            console.warn('Could not reliably extract file path from URL for deletion.');
          } else {
            // Correctly slice the path from the bucket name onwards
            const filePath = urlParts.slice(bucketIndex + 1).join('/');
            await supabase.storage.from(bucketName).remove([filePath]);
          }
        } catch (error: unknown) {
          console.error('Error removing photo from storage:', error);
          // Note: State/UI update proceeds even if storage deletion fails
        }
      }

      setPhotoUrl('');
      onPhotoUploaded('');
    }, [onPhotoUploaded, photoUrl, bucketName, supabase]);
    // #endregion Supabase Interaction Handlers

    // #region Render
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
                  aria-label="Remove profile photo"
                >
                  ×
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
              id={id} // Link input to label
            />

            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getUploadButtonText(uploading, photoUrl)}
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
// #endregion Component Definition
