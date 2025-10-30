import React from 'react';

interface SectionHeadingProps {
  id: string;
  children: React.ReactNode;
}

export default function SectionHeading({ id, children }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-2 group">
      <h2 id={id} className="text-3xl font-bold text-gray-900 scroll-mt-24">
        {children}
      </h2>
      <a
        href={`#${id}`}
        aria-label="Permalink to this section"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 text-xl"
      >
        #
      </a>
    </div>
  );
}
