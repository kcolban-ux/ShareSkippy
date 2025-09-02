"use client";

import React from "react";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  onClick = () => {},
  disabled = false,
  className = "",
  type = "button",
  href,
  ...props
}) => {
  const baseClasses = "btn font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    outline: "btn-outline",
    ghost: "btn-ghost",
    link: "btn-link",
    gradient: "btn-gradient animate-shimmer",
    checkout: "bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors",
    lead: "bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors",
    support: "bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors",
    account: "bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-colors",
    signin: "bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors",
    popover: "bg-base-100 hover:bg-base-200 text-base-content px-4 py-2 rounded-lg font-medium transition-colors border border-base-300"
  };
  
  const sizes = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
    wide: "btn-wide"
  };

  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

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
};

export default Button;
