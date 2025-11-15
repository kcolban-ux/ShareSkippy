'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Section {
  id: string;
  label: string;
}

interface ScrollSpyTocProps {
  sections: Section[];
}

/**
 * Renders a sticky table of contents that highlights the section in view.
 *
 * @param props.sections - Ordered list of headings to include in the TOC.
 */
export default function ScrollSpyToc({ sections }: ScrollSpyTocProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        // Find the entry with the highest intersection ratio
        let maxRatio = 0;
        let maxEntry: IntersectionObserverEntry | null = null;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxEntry = entry;
          }
        });

        if (maxEntry && (maxEntry as IntersectionObserverEntry).intersectionRatio > 0.1) {
          const targetEl = (maxEntry as IntersectionObserverEntry).target as Element;
          setActiveId(targetEl.id);
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    // Observe all sections
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  const handleLinkClick = (id: string) => {
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
    <div className="hidden md:block md:sticky md:top-6 bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Table of Contents</h3>
      <nav aria-label="Table of contents">
        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                prefetch={false}
                onClick={() => handleLinkClick(section.id)}
                className={`block py-1 px-2 rounded-md transition-colors text-sm ${
                  activeId === section.id
                    ? 'text-purple-700 font-semibold bg-purple-50'
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                }`}
              >
                {index + 1}. {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
