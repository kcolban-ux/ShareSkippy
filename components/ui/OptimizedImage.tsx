'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

// 1. Define the props interface
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number; // Optional because of 'fill'
  height?: number; // Optional because of 'fill'
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | 'blur-sm'; // Be more specific
  blurDataURL?: string;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  // Allow other valid ImageProps to be passed through
  [key: string]: any;
}

const VALID_PLACEHOLDERS = ['blur', 'empty'];

// 2. Apply the interface to React.memo
const OptimizedImage = React.memo<OptimizedImageProps>(
  ({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false,
    placeholder = 'blur-sm',
    blurDataURL,
    quality = 75,
    sizes,
    fill = false,
    ...props
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const finalPlaceholder = VALID_PLACEHOLDERS.includes(placeholder as string)
      ? (placeholder as 'blur' | 'empty')
      : 'blur';

    // Generate a simple blur placeholder if none provided
    const defaultBlurDataURL =
      blurDataURL ||
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    if (hasError) {
      return (
        <div
          // 3. Apply className to fallback for correct sizing
          className={`bg-gray-200 flex items-center justify-center ${className}`}
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        >
          <span className="text-gray-400 text-sm">Failed to load image</span>
        </div>
      );
    }

    return (
      <div
        // 4. This wrapper just handles sizing and position
        className="relative"
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        {isLoading && (
          <div
            // 5. Apply className to loading skeleton
            className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}

        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          // 6. Apply className to the Image itself
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`} // <-- FIX IS HERE
          priority={priority}
          placeholder={finalPlaceholder}
          blurDataURL={defaultBlurDataURL}
          quality={quality}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
