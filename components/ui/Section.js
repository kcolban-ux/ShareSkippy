import React from "react";

const Section = ({
  children,
  variant = "default",
  className = "",
  container = true,
  ...props
}) => {
  const variants = {
    default: "py-16 md:py-24",
    small: "py-8 md:py-16",
    large: "py-24 md:py-32",
    hero: "py-16 md:py-32",
    narrow: "py-12 md:py-20"
  };

  const sectionClasses = `${variants[variant]} ${className}`;

  if (container) {
    return (
      <section className={sectionClasses} {...props}>
        <div className="max-w-7xl mx-auto px-8">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClasses} {...props}>
      {children}
    </section>
  );
};

export default Section;
