"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/libs/supabase/client";
import logo from "@/app/icon.png";
import config from "@/config";

const navigationItems = [
  {
    href: "/community",
    label: "Community",
  },
  {
    href: "/share-availability",
    label: "Share Availability",
  },
  {
    href: "/messages",
    label: "Messages",
  },
  {
    href: "/meetings",
    label: "Meetings",
  },
  {
    href: "/my-dogs",
    label: "My Dogs",
  },
  {
    href: "/profile",
    label: "Profile",
  },
];

const LoggedInNav = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Memoize the supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="bg-base-200">
      <nav
        className="container flex items-center justify-between px-8 py-4 mx-auto"
        aria-label="Global"
      >
        {/* Logo on large screens */}
        <div className="flex lg:flex-1">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title={`${config.appName} home`}
          >
            <Image
              src={logo}
              alt={`${config.appName} logo`}
              className="w-8"
              placeholder="blur"
              priority={true}
              width={32}
              height={32}
            />
            <span className="font-extrabold text-lg">{config.appName}</span>
          </Link>
        </div>

        {/* Burger button to open menu on mobile */}
        <div className="flex lg:hidden">
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
              className="w-6 h-6 text-base-content"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>

        {/* Navigation items on large screens */}
        <div className="hidden lg:flex lg:justify-center lg:gap-8 lg:items-center">
          {navigationItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={`link link-hover px-3 py-2 rounded-lg transition-colors ${
                pathname === item.href ? "bg-primary text-primary-content" : ""
              }`}
              title={item.label}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Sign out button on large screens */}
        <div className="hidden lg:flex lg:justify-end lg:flex-1">
          <button
            onClick={handleSignOut}
            className="btn btn-outline btn-sm"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div
          className={`fixed inset-y-0 right-0 z-10 w-full px-8 py-4 overflow-y-auto bg-base-200 sm:max-w-sm sm:ring-1 sm:ring-neutral/10 transform origin-right transition ease-in-out duration-300`}
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
                className="w-8"
                placeholder="blur"
                priority={true}
                width={32}
                height={32}
              />
              <span className="font-extrabold text-lg">{config.appName}</span>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
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
                    className={`link link-hover w-full px-3 py-2 rounded-lg transition-colors ${
                      pathname === item.href ? "bg-primary text-primary-content" : ""
                    }`}
                    title={item.label}
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
                className="btn btn-outline btn-sm w-full"
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
