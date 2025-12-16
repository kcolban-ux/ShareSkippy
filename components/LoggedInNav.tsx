'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import logo from '@/public/icon.png';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';

const navigationItems = [
  {
    href: '/community',
    label: 'Community',
  },
  {
    href: '/share-availability',
    label: 'Share Availability',
  },
  {
    href: '/messages',
    label: 'Messages',
  },
  {
    href: '/meetings',
    label: 'Meetings',
  },
  {
    href: '/my-dogs',
    label: 'My Dogs',
  },
  {
    href: '/profile',
    label: 'Profile',
  },
];

const LoggedInNav = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useUser();

  const handleNavigation = useCallback((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    setIsOpen(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [searchParams]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-indigo-600 text-white">
      <nav
        className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 mx-auto"
        aria-label="Global"
      >
        {/* Logo - responsive sizing */}
        <div className="flex xl:flex-1">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title={`${config.appName} home`}
          >
            <Image
              src={logo}
              alt={`${config.appName} logo`}
              className="w-6 sm:w-8"
              placeholder="blur"
              priority={true}
              width={32}
              height={32}
              unoptimized
            />
            <span className="font-extrabold text-base sm:text-lg text-white">{config.appName}</span>
          </Link>
        </div>

        {/* Burger button to open menu on small and medium screens */}
        <div className="flex xl:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
            onClick={() => setIsOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>

        {/* Navigation items on extra large screens */}
        <div className="hidden xl:flex xl:justify-center xl:gap-6 xl:items-center flex-1">
          {navigationItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={`px-2 py-2 rounded-lg transition-colors text-white hover:text-indigo-100 text-sm whitespace-nowrap ${
                pathname === item.href ? 'bg-white/20 text-white' : ''
              }`}
              title={item.label}
              onClick={handleNavigation}
              data-testid={item.href === '/profile' ? 'nav-profile-link' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Sign out button on extra large screens */}
        <div className="hidden xl:flex xl:justify-end xl:flex-1">
          <button
            onClick={handleSignOut}
            className="btn btn-outline btn-sm text-white border-white hover:bg-white hover:text-indigo-600"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? '' : 'hidden'}`}>
        <div
          className={`fixed inset-y-0 right-0 z-10 w-full px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto bg-indigo-600 sm:max-w-sm sm:ring-1 sm:ring-neutral/10 transform origin-right transition ease-in-out duration-300`}
        >
          {/* Logo on small screens */}
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-2 shrink-0"
              title={`${config.appName} home`}
              href="/"
            >
              <Image
                src={logo}
                alt={`${config.appName} logo`}
                className="w-6 sm:w-8"
                placeholder="blur"
                priority={true}
                width={32}
                height={32}
                unoptimized
              />
              <span className="font-extrabold text-base sm:text-lg text-white">
                {config.appName}
              </span>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation items on small screens */}
          <div className="flow-root mt-6">
            <div className="py-4">
              <div className="flex flex-col gap-y-4 items-start">
                {navigationItems.map((item) => (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`w-full px-3 py-2 rounded-lg transition-colors text-white hover:text-indigo-100 ${
                      pathname === item.href ? 'bg-white/20 text-white' : ''
                    }`}
                    title={item.label}
                    onClick={handleNavigation}
                    data-testid={item.href === '/profile' ? 'nav-profile-link-mobile' : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="divider"></div>
            {/* Sign out button on small screens */}
            <div className="flex flex-col">
              <button
                onClick={handleSignOut}
                className="btn btn-outline btn-sm w-full text-white border-white hover:bg-white hover:text-indigo-600"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LoggedInNav;
