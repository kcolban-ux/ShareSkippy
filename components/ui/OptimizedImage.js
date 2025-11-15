'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const VALID_PLACEHOLDERS = ['blur', 'empty'];

const OptimizedImage = React.memo(
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
    // We default to fill: true for simplicity and better handling of cropping/sizing
    fill = true, 
    ...props
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const finalPlaceholder = VALID_PLACEHOLDERS.includes(placeholder) ? placeholder : 'blur';

    // Generate a simple blur placeholder if none provided
    const defaultBlurDataURL =
      blurDataURL ||
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxin0CdABmX/9k=';

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    // Filter out 'object-cover' from the container's className, 
    // as it must be explicitly applied to the inner Image tag.
    const containerClasses = className.split(' ')
        .filter(c => c !== 'object-cover')
        .join(' ');

    // The wrapper must have the size and shape for the inner image to render correctly.
    // The wrapper needs 'overflow-hidden' to clip the image to 'rounded-full'.
    const wrapperStyle = !fill ? { width, height } : {};

    if (hasError) {
      return (
        <div
          className={`bg-gray-200 flex items-center justify-center ${containerClasses} overflow-hidden`}
          style={wrapperStyle}
        >
          <span className="text-gray-400 text-sm">Failed to load image</span>
        </div>
      );
  	}

  	return (
    	// 1. Wrapper gets 'relative', sizing (e.g., w-10 h-10), shape (rounded-full), and 'overflow-hidden'.
    	<div className={`relative ${containerClasses} overflow-hidden`} style={wrapperStyle}>
        {isLoading && (
          // 2. Loading state also inherits the container's size and shape.
          <div
            className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${containerClasses} overflow-hidden`}
            style={wrapperStyle}
          >
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}

        <Image
          src={src}
          alt={alt}
          // When fill is true, Next.js requires width/height to be undefined or removed.
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          // 3. The Image tag only gets 'object-cover' (for correct cropping) and transition styles.
          className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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