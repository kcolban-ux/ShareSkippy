import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import Header from './Header';

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
  default: ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    priority, // Must be defined to be excluded from props
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
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

const mockedUseSearchParams = useSearchParams as jest.Mock;
const initialSearchParams = new URLSearchParams();

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSearchParams.mockReturnValue(initialSearchParams);
  });

  it('renders the app name, logo, and sign-in button', () => {
    render(<Header />);

    // Use getAllByText due to rendering multiple versions (desktop/mobile)
    expect(screen.getAllByText('Test App').length).toBeGreaterThan(0);

    // Use getAllByAltText due to rendering multiple versions
    expect(screen.getAllByAltText('Test App logo').length).toBeGreaterThan(0);

    expect(screen.getAllByRole('button', { name: 'Sign In' }).length).toBeGreaterThan(0);
  });

  it('opens and closes the mobile menu on click', () => {
    render(<Header />);

    // Find the mobile menu container by finding the 'Close menu' button
    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    const mobileMenuContainer = closeButton.closest('.relative.z-50');

    // Assert menu is initially hidden (has 'hidden' class)
    expect(mobileMenuContainer).toHaveClass('hidden');

    const openButton = screen.getByRole('button', { name: 'Open main menu' });
    fireEvent.click(openButton);

    // Assert menu is open (lacks 'hidden' class)
    expect(mobileMenuContainer).not.toHaveClass('hidden');

    fireEvent.click(closeButton);

    // Assert menu is closed again
    expect(mobileMenuContainer).toHaveClass('hidden');
  });

  it('closes the mobile menu when search parameters change', () => {
    const { rerender } = render(<Header />);

    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    const mobileMenuContainer = closeButton.closest('.relative.z-50');

    // 1. Open the menu
    const openButton = screen.getByRole('button', { name: 'Open main menu' });
    fireEvent.click(openButton);

    expect(mobileMenuContainer).not.toHaveClass('hidden');

    // 2. Simulate a navigation by changing the searchParams hook's return value
    const newSearchParams = new URLSearchParams('?page=2');
    mockedUseSearchParams.mockReturnValue(newSearchParams);

    // 3. Re-render to trigger the useEffect hook, simulating route change
    rerender(<Header />);

    // 4. Verify the menu is now closed (has 'hidden' class)
    expect(mobileMenuContainer).toHaveClass('hidden');
  });
});
