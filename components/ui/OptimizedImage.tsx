// #region Imports
'use client';

import React, { useState, FC, memo } from 'react';
import Image, { ImageProps } from 'next/image';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
// #endregion Imports

// #region Types and Constants
/**
 * @typedef {('blur' | 'empty')} NextImagePlaceholder
 * @description Valid string values for the Next.js Image component's `placeholder` prop.
 */
type NextImagePlaceholder = 'blur' | 'empty';

/**
 * @constant
 * @type {ReadonlySet<NextImagePlaceholder>}
 * @description A Set containing valid Next.js Image placeholders for quick lookup.
 */
const VALID_PLACEHOLDERS: ReadonlySet<NextImagePlaceholder> = new Set(['blur', 'empty'] as const);

/**
 * @interface OptimizedImageProps
 * @description Props for the OptimizedImage component, extending Next.js ImageProps and adding custom behavior.
 * NOTE: The '...props' spread requires extending properties not strictly covered by the main named props.
 */
interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  // Required Next.js props
  src: string | StaticImport;
  alt: string;

  // Optional props
  width: number | `${number}` | undefined; // Accepts number or string, matching Next.js ImageProps
  height: number | `${number}` | undefined;
  className?: string;
  priority?: boolean;
  quality?: number | `${number}`;
  sizes?: string;
  fill?: boolean;

  // Custom placeholder handling: allows for flexibile input but defaults to Next.js's 'blur'
  placeholder?: string;
}

/**
 * @constant
 * @type {string}
 * @description Default base64 tiny image for the 'blur' placeholder effect.
 */
const DEFAULT_BLUR_DATA_URL: string =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
// #endregion Types and Constants

// #region Component Definition
/**
 * @component
 * @description A wrapper around Next.js Image component that adds loading skeleton/pulse effects,
 * error handling UI, and standardized placeholder logic for predictable performance.
 * @param {OptimizedImageProps} props - The props for the image component.
 * @returns {JSX.Element}
 */
const OptimizedImageComponent: FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  quality = 75,
  sizes,
  fill = false,
  ...props
}) => {
  // #region State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  // #endregion State

  // #region Logic
  /**
   * @constant finalPlaceholder
   * @description Determines the actual Next.js placeholder value based on input validation.
   * @type {NextImagePlaceholder}
   */
  const finalPlaceholder: NextImagePlaceholder = VALID_PLACEHOLDERS.has(
    placeholder as NextImagePlaceholder
  )
    ? (placeholder as NextImagePlaceholder)
    : 'blur';

  /**
   * @constant finalBlurDataURL
   * @description Uses provided blurDataURL or the safe default base64 image.
   * @type {string}
   */
  const finalBlurDataURL: string = blurDataURL || DEFAULT_BLUR_DATA_URL;

  /**
   * @function handleLoad
   * @description Sets loading state to false once the image successfully loads.
   * @returns {void}
   */
  const handleLoad = (): void => {
    setIsLoading(false);
  };

  /**
   * @function handleError
   * @description Sets error state to true and stops loading upon image load failure.
   * @returns {void}
   */
  const handleError = (): void => {
    setHasError(true);
    setIsLoading(false);
  };
  // #endregion Logic

  // #region Render: Error State
  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        // Type safety: style object expects dimensions to be string or number, handled by width/height properties
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        <span className="text-gray-400 text-sm">⚠️ Failed to load image</span>
      </div>
    );
  }
  // #endregion Render: Error State

  // #region Render: Image with Loading State
  return (
    // The outer div needs to ensure it respects the dimensions defined by width/height or 'fill' mode
    <div className={`relative ${className}`}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10"
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        >
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}

      {/* Next.js Image Component */}
      <Image
        src={src}
        alt={alt}
        // Conditional dimensions: required for non-fill images, undefined for fill
        width={fill ? undefined : (width as number | undefined)}
        height={fill ? undefined : (height as number | undefined)}
        fill={fill}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        priority={priority}
        placeholder={finalPlaceholder}
        blurDataURL={finalBlurDataURL}
        quality={quality}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        {...(props as Record<string, unknown>)} // Spread props safely
      />
    </div>
  );
  // #endregion Render: Image with Loading State
};

// Apply memoization
OptimizedImageComponent.displayName = 'OptimizedImage';

// Export the optimized component
export default memo(OptimizedImageComponent);
