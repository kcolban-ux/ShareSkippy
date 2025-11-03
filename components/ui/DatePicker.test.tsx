import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from './DatePicker';

// Mocking crypto.randomUUID for tests
const mockRandomUUID = jest.fn();
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
});

describe('DatePicker', () => {
  beforeEach(() => {
    // Provide a consistent value for randomUUID
    let callCount = 0;
    mockRandomUUID.mockImplementation(() => `mock-uuid-${callCount++}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with a placeholder when no date is selected', () => {
    render(<DatePicker selectedDate={''} onDateSelect={() => {}} placeholder="Select a date" />);
    expect(screen.getByText('Select a date')).toBeInTheDocument();
  });

  it('opens the calendar when the button is clicked', () => {
    render(<DatePicker selectedDate={''} onDateSelect={() => {}} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument(); // Calendar header
  });

  it('calls onDateSelect with the correct format when a date is clicked', () => {
    const onDateSelectMock = jest.fn();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    render(<DatePicker selectedDate={''} onDateSelect={onDateSelectMock} />);
    fireEvent.click(screen.getByRole('button')); // Open calendar

    // In a real scenario, you might need a more robust way to select a specific day
    // For this test, we'll click the "Select Today" button for simplicity
    const todayButton = screen.getByText('Select Today');
    fireEvent.click(todayButton);

    expect(onDateSelectMock).toHaveBeenCalledWith(expectedDate);
  });

  it('displays the pre-selected date correctly', () => {
    const selectedDate = '2023-10-26';
    render(<DatePicker selectedDate={selectedDate} onDateSelect={() => {}} />);
    expect(screen.getByText('Oct 26, 2023')).toBeInTheDocument();
  });

  it('navigates to the next and previous months', () => {
    render(<DatePicker selectedDate={''} onDateSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button')); // Open calendar

    // Get current month name
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

    const navigationButtons = screen.getAllByRole('button');
    const prevButton = navigationButtons[1];
    const nextButton = navigationButtons[2];

    // Go to next month
    fireEvent.click(nextButton);
    const nextMonthName = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString(
      'default',
      { month: 'long' }
    );
    expect(screen.getByText(new RegExp(nextMonthName))).toBeInTheDocument();

    // Go back to previous month (from next month)
    fireEvent.click(prevButton);
    expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

    // Go to previous month (from current month)
    fireEvent.click(prevButton);
    const prevMonthName = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString(
      'default',
      { month: 'long' }
    );
    expect(screen.getByText(new RegExp(prevMonthName))).toBeInTheDocument();
  });

  it('disables dates before minDate', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    render(<DatePicker selectedDate={''} onDateSelect={() => {}} minDate={minDate} />);
    fireEvent.click(screen.getByRole('button'));

    // Today's date should be disabled
    const todayDateButton = screen.getByText(today.getDate());
    expect(todayDateButton).toBeDisabled();
  });

  it('disables dates after maxDate', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const maxDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    render(<DatePicker selectedDate={''} onDateSelect={() => {}} maxDate={maxDate} />);
    fireEvent.click(screen.getByRole('button'));

    // Today's date should be disabled
    const todayDateButton = screen.getByText(today.getDate());
    expect(todayDateButton).toBeDisabled();
  });

  it('closes the calendar when clicking outside', () => {
    render(
      <div>
        <DatePicker selectedDate={''} onDateSelect={() => {}} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    // Open calendar
    fireEvent.click(screen.getByRole('button'));
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText(new RegExp(currentMonthName))).not.toBeInTheDocument();
  });

  it('selects today when "Select Today" is clicked', () => {
    const onDateSelectMock = jest.fn();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    render(<DatePicker selectedDate={''} onDateSelect={onDateSelectMock} />);
    fireEvent.click(screen.getByRole('button')); // Open calendar
    fireEvent.click(screen.getByText('Select Today'));

    expect(onDateSelectMock).toHaveBeenCalledWith(expectedDate);
  });

  it('selects tomorrow when "Select Tomorrow" is clicked', () => {
    const onDateSelectMock = jest.fn();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    render(<DatePicker selectedDate={''} onDateSelect={onDateSelectMock} />);
    fireEvent.click(screen.getByRole('button')); // Open calendar
    fireEvent.click(screen.getByText('Select Tomorrow'));

    expect(onDateSelectMock).toHaveBeenCalledWith(expectedDate);
  });
});
