import React from "react";

const Icon = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center";
  
  const variants = {
    default: "",
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
    info: "text-info",
    rounded: "rounded-full bg-primary/20 text-primary",
    outlined: "border-2 border-current rounded-lg"
  };
  
  const sizes = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const iconClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <div className={iconClasses} {...props}>
      {children}
    </div>
  );
};

export default Icon;
