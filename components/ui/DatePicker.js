'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// Helper function to safely parse the YYYY-MM-DD string into a Date object
const parseDateString = (dateString) => {
  if (!dateString) return null;
  // Use map(Number) to get numbers, which avoids timezone issues with new Date(string)
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed, so we subtract 1
  return new Date(year, month - 1, day);
};

export default function DatePicker({
  selectedDate,
  onDateSelect,
  minDate,
  placeholder = 'Select date',
  maxDate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Initialize state using the helper function
  const [selectedDay, setSelectedDay] = useState(() => parseDateString(selectedDate));
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize internal selectedDay state when the external selectedDate prop changes.
  useEffect(() => {
    const newDay = parseDateString(selectedDate);

    // Only update if the parsed date is genuinely different from the current state
    if (
      (newDay && (!selectedDay || newDay.toDateString() !== selectedDay.toDateString())) ||
      (!newDay && selectedDay) // Case where selectedDate becomes null/empty
    ) {
      setSelectedDay(newDay);
    }
  }, [selectedDate, selectedDay]);

  const formatDate = useCallback((date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

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

  const handleDateSelect = useCallback(
    (date) => {
      if (!date) return;

      const minDateObj = minDate ? parseDateString(minDate) : new Date();
      // Ensure comparison is at the start of the day
      minDateObj.setHours(0, 0, 0, 0);

      if (date < minDateObj) return;

      setSelectedDay(date);
      // Format the date back to YYYY-MM-DD string format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onDateSelect(`${year}-${month}-${day}`);
      setIsOpen(false);
    },
    [minDate, onDateSelect]
  );

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = useCallback((date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isSelected = useCallback(
    (date) => {
      if (!date || !selectedDay) return false;
      return date.toDateString() === selectedDay.toDateString();
    },
    [selectedDay]
  );

  const isDisabled = useCallback(
    (date) => {
      if (!date) return false;

      // Parse minDate safely and compare
      let minDateObj;
      if (minDate) {
        minDateObj = parseDateString(minDate);
      } else {
        minDateObj = new Date();
      }
      minDateObj.setHours(0, 0, 0, 0);

      if (date < minDateObj) return true;

      if (maxDate) {
        // Parse maxDate safely and compare
        const maxDateObj = parseDateString(maxDate);
        maxDateObj.setHours(23, 59, 59, 999);
        return date > maxDateObj;
      }

      return false;
    },
    [minDate, maxDate]
  );

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
      >
        <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
          {selectedDate ? formatDate(parseDateString(selectedDate)) : placeholder}
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

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4 min-w-[300px]">
          {/* Calendar Header */}
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

          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDateSelect(date)}
                disabled={isDisabled(date)}
                className={`
                  w-8 h-8 text-sm rounded-md transition-colors
                  ${!date ? 'cursor-default' : ''}
                  ${
                    isDisabled(date)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-blue-100 cursor-pointer'
                  }
                  ${isToday(date) ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'}
                  ${
                    isSelected(date) ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' : ''
                  }
                `}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
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
