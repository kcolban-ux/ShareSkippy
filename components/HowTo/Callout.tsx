import React from 'react';
import { cn } from '@/libs/utils';

interface CalloutProps {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  title?: string;
  className?: string;
}

const toneClasses = {
  blue: 'bg-blue-50 border-blue-500',
  green: 'bg-green-50 border-green-500',
  yellow: 'bg-yellow-50 border-yellow-500',
  red: 'bg-red-50 border-red-500',
  purple: 'bg-purple-50 border-purple-500',
};

export default function Callout({ children, tone = 'blue', title, className }: CalloutProps) {
  return (
    <div className={cn('rounded-lg p-6 border-l-4', toneClasses[tone], className)}>
      {title && <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>}
      <div className="text-gray-700">{children}</div>
    </div>
  );
}
