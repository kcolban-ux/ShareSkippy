import React, { ReactNode, AnchorHTMLAttributes } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoggedInNav from './LoggedInNav';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useSearchParams, usePathname } from 'next/navigation';
import config from '@/config';

interface MockImageProps {
  src: {
    src: string;
  };
  alt: string;
  [key: string]: string | number | undefined | null | object | ReactNode;
}

interface MockLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  // The href prop is what's critical here. Next.js Link accepts string or an object (Route).
  // For a mock, string is usually sufficient.
  href: string;
}

// 1. Mock Next.js and external dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
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
    function Image({ src, alt, ...props }: MockImageProps) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src.src} alt={alt} {...props} />;
    }
);

// Mock next/link
jest.mock(
  'next/link',
  () =>
    function Link({ href, children, ...props }: React.PropsWithChildren<MockLinkProps>) {
      return (
        // The HTMLAnchorElement now correctly expects string for href
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
    mockedSignOut = jest.fn().mockResolvedValue({ error: null });
    mockedUseUser.mockReturnValue({ signOut: mockedSignOut });
    mockedUsePathname.mockReturnValue('/');
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    originalLocation = globalThis.location;
    delete (globalThis as { location: Location | undefined }).location;
    (globalThis as { location: { href: string } }).location = { href: 'http://localhost/' };
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    globalThis.location = originalLocation;
  });

  test('renders correctly and mobile menu is hidden', () => {
    render(<LoggedInNav />);

    expect(
      screen.getAllByRole('link', { name: /ShareSkippy logo ShareSkippy/i })[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText(config.appName)[0]).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Open main menu/i })).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Close menu/i }).closest('div.relative.z-50')
    ).toHaveClass('hidden');
  });

  test('opens and closes the mobile menu on click', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // --- Open Menu ---
    expect(mobileMenu).toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));

    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // --- Close Menu ---
    await user.click(screen.getByRole('button', { name: /Close menu/i }));

    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  test('closes mobile menu on route change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // Open the menu
    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // Simulate a navigation
    mockedUseSearchParams.mockReturnValue(new URLSearchParams('page=2'));
    rerender(<LoggedInNav />);

    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  test('highlights the active link based on pathname', () => {
    // Set pathname to '/meetings'
    mockedUsePathname.mockReturnValue('/meetings');
    render(<LoggedInNav />);

    const activeLinks = screen.getAllByRole('link', { name: 'Meetings' });
    const inactiveLinks = screen.getAllByRole('link', { name: 'Profile' });

    expect(activeLinks[0]).toHaveClass('bg-white/20');
    expect(activeLinks[1]).toHaveClass('bg-white/20');

    expect(inactiveLinks[0]).not.toHaveClass('bg-white/20');
    expect(inactiveLinks[1]).not.toHaveClass('bg-white/20');
  });

  test('handles successful sign out and redirects', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.location.href).toBe('http://localhost/');
  });

  test('handles successful sign out from mobile menu', async () => {
    const user = userEvent.setup();
    render(<LoggedInNav />);

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await screen.findByRole('button', { name: /Close menu/i });

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[1]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });
    expect(globalThis.location.href).toBe('http://localhost/');
  });

  test('handles failed sign out and logs an error', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Sign out failed');
    mockedSignOut.mockResolvedValue({ error: mockError });

    render(<LoggedInNav />);

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', mockError);
    expect(globalThis.location.href).toBe('http://localhost/');
  });
});
