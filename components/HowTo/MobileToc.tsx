'use client';

import { useRef } from 'react';
import Link from 'next/link';

interface Section {
  id: string;
  label: string;
}

interface MobileTocProps {
  sections: Section[];
}

/**
 * Shows a collapsible table of contents for mobile layouts with analytics hooks.
 *
 * @param props.sections - Section anchors to display.
 */
export default function MobileToc({ sections }: MobileTocProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const handleLinkClick = (id: string) => {
    // Close the details element after clicking a link
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }

    // Dispatch analytics event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('analytics', {
          detail: { event: 'toc_click', id },
        })
      );
    }
  };

  return (
    <details ref={detailsRef} className="md:hidden mb-6 bg-white rounded-xl shadow-lg p-4">
      <summary className="cursor-pointer font-semibold text-gray-900 hover:text-blue-600 transition-colors">
        📋 Jump to Section
      </summary>
      <nav aria-label="Table of contents" className="mt-4">
        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                prefetch={false}
                onClick={() => handleLinkClick(section.id)}
                className="block py-2 px-3 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors text-sm"
              >
                {index + 1}. {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
