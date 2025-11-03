'use client';

import React from 'react';
import { cn } from '@/libs/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'danger'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'gradient'
    | 'checkout'
    | 'lead'
    | 'support'
    | 'account'
    | 'signin'
    | 'popover';
  size?: 'sm' | 'md' | 'lg' | 'wide';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

const Button = React.memo(
  ({
    children,
    variant = 'primary',
    size = 'md',
    onClick = () => {},
    disabled = false,
    className = '',
    type = 'button',
    href,
    ...props
  }: ButtonProps) => {
    const baseClasses =
      'btn font-medium transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-offset-2';

    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      link: 'btn-link',
      gradient: 'btn-gradient animate-shimmer',
      checkout:
        'bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors',
      lead: 'bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors',
      support:
        'bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors',
      account:
        'bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-colors',
      signin:
        'bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors',
      popover:
        'bg-base-100 hover:bg-base-200 text-base-content px-4 py-2 rounded-lg font-medium transition-colors border border-base-300',
    };

    // Define the variant classes based on the existing test file
    const variantClasses = {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-200 text-gray-800',
      danger: 'bg-red-500 text-white',
      // Add other variants if they exist in your design system
    };

    const sizes = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
      wide: 'btn-wide',
    };

    const buttonClasses = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      variantClasses[variant],
      className
    );

    if (href) {
      return (
        <a href={href} className={buttonClasses} {...props}>
          {children}
        </a>
      );
    }

    return (
      <button
        type={type}
        className={buttonClasses}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
