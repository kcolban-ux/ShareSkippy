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
    fill = false,
    ...props
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const finalPlaceholder = VALID_PLACEHOLDERS.includes(placeholder) ? placeholder : 'blur';

    const defaultBlurDataURL =
      blurDataURL ||
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const styleProps = fill ? {} : { width, height };

    if (hasError) {
      return (
        <div
          className={`bg-gray-200 flex items-center justify-center rounded-full overflow-hidden ${className}`}
          style={styleProps}
        >
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      );
    }

    return (
      <div className={`relative rounded-full overflow-hidden ${className}`} style={styleProps}>
        {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>}

        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={`
            object-cover
            transition-opacity duration-300
            ${fill ? '' : 'w-full h-full block'}
            ${isLoading ? 'opacity-0' : 'opacity-100'}
          `}
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
