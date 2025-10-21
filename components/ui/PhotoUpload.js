'use client';
import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import OptimizedImage from './OptimizedImage';

const PhotoUpload = React.memo(
  ({ onPhotoUploaded, initialPhotoUrl, disabled = false, bucketName = 'profile-photos' }) => {
    const [uploading, setUploading] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const supabase = createClient();

    // Compress image to 100KB
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions to maintain aspect ratio
          const maxSize = 800; // Max width/height
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Start with high quality and reduce until under 100KB
          let quality = 0.9;
          let dataUrl;

          const compress = () => {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64Size = dataUrl.length * 0.75; // Approximate size in bytes

            if (base64Size > 100000 && quality > 0.1) {
              // 100KB = 100,000 bytes
              quality -= 0.1;
              compress();
            } else {
              // Convert data URL to blob
              fetch(dataUrl)
                .then((res) => res.blob())
                .then((blob) => {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                });
            }
          };

          compress();
        };

        img.src = URL.createObjectURL(file);
      });
    };

    const uploadToStorage = async (file) => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
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

        console.log('Public URL:', publicUrl);
        return publicUrl;
      } catch (error) {
        console.error('Error uploading to storage:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
    };

    const handleFileUpload = useCallback(
      async (event) => {
        try {
          setError('');
          setUploading(true);

          const file = event.target.files[0];
          if (!file) return;

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
        } catch (error) {
          console.error('Error uploading photo:', error);
          setError(`Upload failed: ${error.message || 'Unknown error'}`);
          setUploading(false);
        }
      },
      [onPhotoUploaded, uploadToStorage]
    );

    const removePhoto = useCallback(async () => {
      if (photoUrl && photoUrl.includes('supabase')) {
        try {
          // Extract file path from URL
          const urlParts = photoUrl.split('/');
          const filePath = urlParts.slice(-2).join('/'); // Get last two parts

          // Delete from storage
          await supabase.storage.from(bucketName).remove([filePath]);
        } catch (error) {
          console.error('Error removing photo:', error);
        }
      }

      setPhotoUrl('');
      onPhotoUploaded('');
    }, [onPhotoUploaded, photoUrl]);

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
            />

            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
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
