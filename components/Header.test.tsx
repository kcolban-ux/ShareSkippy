import { render, screen, fireEvent } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import Header from './Header';

// --- Mocks ---

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Stub next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Stub child components
jest.mock('./ui/OptimizedImage', () => ({
  __esModule: true,
  // Fix for 'priority' warning: Destructure and omit 'priority'
  default: ({
    priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} />,
}));

jest.mock('./ButtonSignin', () => ({
  __esModule: true,
  default: () => <button>Sign In</button>,
}));

// Mock config
jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    appName: 'Test App',
  },
}));

// Mock static asset import
jest.mock('@/app/icon.png', () => ({
  __esModule: true,
  default: 'test-logo.png',
}));

// --- Setup ---

const mockedUseSearchParams = useSearchParams as jest.Mock;
const initialSearchParams = new URLSearchParams();

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSearchParams.mockReturnValue(initialSearchParams);
  });

  // --- Tests ---

  it('renders the app name, logo, and sign-in button', () => {
    render(<Header />);

    // Fix for 'multiple elements': Use getAllByText
    expect(screen.getAllByText('Test App').length).toBeGreaterThan(0);

    // Check for logo (by alt text) - getAllByAltText for same reason
    expect(screen.getAllByAltText('Test App logo').length).toBeGreaterThan(0);

    // Check for the sign-in button
    expect(screen.getAllByRole('button', { name: 'Sign In' }).length).toBeGreaterThan(0);
  });

  it('opens and closes the mobile menu on click', () => {
    render(<Header />);

    // Find the mobile menu container by finding the 'Close menu' button
    // and then its parent container which has the 'hidden' class.
    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    const mobileMenuContainer = closeButton.closest('.relative.z-50');

    // 1. Fix for 'toBeInTheDocument': Check for the 'hidden' class
    expect(mobileMenuContainer).toHaveClass('hidden');

    // 2. Find and click the open button (burger menu)
    const openButton = screen.getByRole('button', { name: 'Open main menu' });
    fireEvent.click(openButton);

    // 3. Verify the 'hidden' class is gone
    expect(mobileMenuContainer).not.toHaveClass('hidden');

    // 4. Click the close button
    fireEvent.click(closeButton);

    // 5. Verify the 'hidden' class is back
    expect(mobileMenuContainer).toHaveClass('hidden');
  });

  it('closes the mobile menu when search parameters change', () => {
    const { rerender } = render(<Header />);

    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    const mobileMenuContainer = closeButton.closest('.relative.z-50');

    // 1. Open the menu
    const openButton = screen.getByRole('button', { name: 'Open main menu' });
    fireEvent.click(openButton);

    // 2. Verify it's open (no 'hidden' class)
    expect(mobileMenuContainer).not.toHaveClass('hidden');

    // 3. Simulate a navigation by changing the searchParams hook's return value
    const newSearchParams = new URLSearchParams('?page=2');
    mockedUseSearchParams.mockReturnValue(newSearchParams);

    // 4. Re-render to trigger the useEffect hook
    rerender(<Header />);

    // 5. Fix for 'toBeInTheDocument': Verify the menu is now closed (has 'hidden' class)
    expect(mobileMenuContainer).toHaveClass('hidden');
  });
});
