import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoggedInNav from './LoggedInNav';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useSearchParams, usePathname } from 'next/navigation';
import config from '@/config';

// 1. Mock Next.js and external dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/app/icon.png', () => ({
  default: {
    src: '/mock-icon.png',
    height: 32,
    width: 32,
    blurDataURL:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  },
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/config', () => ({
  appName: 'ShareSkippy',
}));

// Mock next/image
jest.mock(
  'next/image',
  () =>
    function Image({ src, alt, ...props }: any) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src.src} alt={alt} {...props} />;
    }
);

// Mock next/link
jest.mock(
  'next/link',
  () =>
    function Link({ href, children, ...props }: any) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    }
);

// 2. Type-safe mock variables
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseSearchParams = useSearchParams as jest.Mock;
const mockedUseUser = useUser as jest.Mock;

describe('LoggedInNav', () => {
  let mockedSignOut: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let originalLocation: Location;

  beforeEach(() => {
    // Mock return values
    mockedSignOut = jest.fn().mockResolvedValue({ error: null });
    mockedUseUser.mockReturnValue({ signOut: mockedSignOut });
    mockedUsePathname.mockReturnValue('/'); // Default pathname
    mockedUseSearchParams.mockReturnValue(new URLSearchParams()); // Default params

    // Mock console.error to avoid test noise
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location.href
    // We store the original and restore it after
    originalLocation = globalThis.location;
    delete (globalThis as any).location;
    (globalThis as any).location = { href: 'http://localhost/' };
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    globalThis.location = originalLocation;
  });

  // Test 1: Initial Render
  test('renders correctly and mobile menu is hidden', () => {
    render(<LoggedInNav />);

    // Check for logo and app name
    // Use getAllByRole because two logos are rendered (desktop + mobile)
    expect(
      screen.getAllByRole('link', { name: /ShareSkippy logo ShareSkippy/i })[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText(config.appName)[0]).toBeInTheDocument();

    // Check for mobile menu burger button
    expect(screen.getByRole('button', { name: /Open main menu/i })).toBeInTheDocument();

    // Check that the mobile menu's PARENT div has the 'hidden' class
    expect(
      screen.getByRole('button', { name: /Close menu/i }).closest('div.relative.z-50')
    ).toHaveClass('hidden');
  });

  // Test 2: Mobile Menu Open/Close
  test('opens and closes the mobile menu on click', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // --- Open Menu ---
    // Mobile menu should be hidden
    expect(mobileMenu).toHaveClass('hidden');

    // Click the burger button
    await user.click(screen.getByRole('button', { name: /Open main menu/i }));

    // Mobile menu (and close button) should now be visible
    // We just need to wait for the class to be removed
    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // --- Close Menu ---
    // Click the close button
    await user.click(screen.getByRole('button', { name: /Close menu/i }));

    // Wait for the menu to disappear
    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  // Test 3: useEffect - Mobile menu closes on navigation
  test('closes mobile menu on route change', async () => {
    const user = userEvent.setup();
    // Use rerender to simulate prop/context changes
    const { rerender } = render(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // Open the menu
    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    // Wait for menu to open
    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // Simulate a navigation by changing the searchParams
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('page=2'));
    rerender(<LoggedInNav />);

    // Wait for the menu to disappear
    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  // Test 4: Active Link Highlighting
  test('highlights the active link based on pathname', () => {
    // Set pathname to '/meetings'
    mockedUsePathname.mockReturnValue('/meetings');
    render(<LoggedInNav />);

    // Find all links (desktop and mobile)
    const activeLinks = screen.getAllByRole('link', { name: 'Meetings' });
    const inactiveLinks = screen.getAllByRole('link', { name: 'Profile' });

    // Active links should have the active class
    expect(activeLinks[0]).toHaveClass('bg-white/20');
    expect(activeLinks[1]).toHaveClass('bg-white/20');

    // Inactive links should not
    expect(inactiveLinks[0]).not.toHaveClass('bg-white/20');
    expect(inactiveLinks[1]).not.toHaveClass('bg-white/20');
  });

  // Test 5: Successful Sign Out (Desktop)
  test('handles successful sign out and redirects', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);

    // Find all "Sign out" buttons
    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    // Click the first one (desktop)
    await user.click(signOutButtons[0]);

    // Wait for async handler
    await waitFor(() => {
      // Check that signOut was called
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    // Check for redirect (JSDOM resolves '/' to the full base URL)
    expect(globalThis.location.href).toBe('http://localhost/');
  });

  // Test 6: Successful Sign Out (Mobile)
  test('handles successful sign out from mobile menu', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);

    // Open mobile menu
    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await screen.findByRole('button', { name: /Close menu/i });

    // Find all "Sign out" buttons
    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    // Click the second one (mobile)
    await user.click(signOutButtons[1]);

    // Wait for async handler
    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });
    // Check for redirect (JSDOM resolves '/' to the full base URL)
    expect(globalThis.location.href).toBe('http://localhost/');
  });

  // Test 7: Failed Sign Out
  test('handles failed sign out and logs an error', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Sign out failed');
    mockedSignOut.mockResolvedValue({ error: mockError });

    render(<LoggedInNav />);

    // Find and click any sign out button
    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[0]);

    // Wait for async handler
    await waitFor(() => {
      // Check that signOut was called
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    // Check that error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', mockError);
    // Check that redirect did NOT happen
    expect(globalThis.location.href).toBe('http://localhost/');
  });
});
