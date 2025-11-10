'use client';
import { useState, useRef, useEffect } from 'react';

// --- Helper Function ---
/**
 * Safely parses a YYYY-MM-DD string into a local Date object.
 * This avoids timezone issues associated with new Date('YYYY-MM-DD').
 */
const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Months are 0-indexed in JavaScript Date
  return new Date(year, month - 1, day);
};

// --- Component ---
export default function DatePicker({
  selectedDate,
  onDateSelect,
  minDate,
  placeholder = 'Select date',
  maxDate,
}: Readonly<{
  selectedDate: string;
  // eslint-disable-next-line no-unused-vars
  onDateSelect: (date: string) => void;
  minDate?: string;
  placeholder?: string;
  maxDate?: string;
}>) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Initialize state from the selectedDate prop
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    if (selectedDate) {
      return parseDateString(selectedDate);
    }
    return null;
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected day when selectedDate prop changes from parent
  useEffect(() => {
    const newSelectedDay = selectedDate ? parseDateString(selectedDate) : null;

    // Helper function defined inside the effect scope (or globally)
    const isSameDate = (day1: Date | null, day2: Date | null) => {
      if (day1 === null && day2 === null) return true;
      if (day1 === null || day2 === null) return false;
      return day1.toDateString() === day2.toDateString();
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDay((currentSelectedDay) => {
      if (isSameDate(currentSelectedDay, newSelectedDay)) {
        return currentSelectedDay;
      }
      return newSelectedDay;
    });
  }, [selectedDate]);

  /** Formats a Date object for display */
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /** Generates an array of days (Date objects or null) for the current month grid */
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  /** Checks if a given date is disabled based on min/maxDate props */
  const isDisabled = (date: Date | null): boolean => {
    if (!date) return false;

    // Check against minDate (defaults to today)
    let minDateObj: Date;
    if (minDate) {
      minDateObj = parseDateString(minDate);
    } else {
      minDateObj = new Date(); // Default to today
    }
    minDateObj.setHours(0, 0, 0, 0); // Set to start of the day

    if (date < minDateObj) return true;

    // Check against maxDate
    if (maxDate) {
      const maxDateObj = parseDateString(maxDate);
      maxDateObj.setHours(23, 59, 59, 999); // Set to end of the day
      return date > maxDateObj;
    }

    return false;
  };

  /** Handles selecting a date from the calendar */
  const handleDateSelect = (date: Date | null): void => {
    // Do not select if null or disabled
    if (!date || isDisabled(date)) return;

    setSelectedDay(date);

    // Format to YYYY-MM-DD string for the parent
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    onDateSelect(`${year}-${month}-${day}`);
    setIsOpen(false);
  };

  const goToPreviousMonth = (): void => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = (): void => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDay) return false;
    return date.toDateString() === selectedDay.toDateString();
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames: string[] = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayNames: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
      >
        <span className={selectedDay ? 'text-gray-900' : 'text-gray-500'}>
          {selectedDay ? formatDate(selectedDay) : placeholder}
        </span>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <button
                key={date ? date.toISOString() : `empty-${index}`}
                type="button"
                onClick={() => handleDateSelect(date)}
                disabled={isDisabled(date)}
                className={`
                  w-8 h-8 text-sm rounded-md transition-colors
                  ${date ? '' : 'cursor-default'}
                  ${
                    isDisabled(date)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-blue-100 cursor-pointer'
                  }
                  ${
                    isToday(date) && !isSelected(date)
                      ? 'bg-blue-200 text-blue-800 font-semibold'
                      : 'text-gray-700'
                  }
                  ${
                    isSelected(date) ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' : ''
                  }
                `}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleDateSelect(today);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Select Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleDateSelect(tomorrow);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Select Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
