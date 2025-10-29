import Link from 'next/link';
import { LEGAL } from '@/lib/legal';

// Footer component matching the ShareSkippy design - updated
const Footer = () => {
  return (
    <footer className="bg-indigo-600 text-white">
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Top section with three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Brand Information */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-4 text-white">ShareSkippy</h3>
            <p className="text-sm mb-4 text-white">
              Connecting dog lovers with dog owners for free, community-based dog sharing
              experiences.
            </p>
            <p className="text-sm text-white">© 2025 ShareSkippy. All rights reserved.</p>
          </div>

          {/* Middle Column - Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4 text-white">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-white hover:text-gray-300 transition-colors">
                Home
              </Link>
              <Link href="/community" className="text-white hover:text-gray-300 transition-colors">
                Community
              </Link>
              <Link href="/our-story" className="text-white hover:text-gray-300 transition-colors">
                Our Story
              </Link>
              <Link href="/profile" className="text-white hover:text-gray-300 transition-colors">
                My Profile
              </Link>
              <Link href="/messages" className="text-white hover:text-gray-300 transition-colors">
                Messages
              </Link>
              <Link href="/how-to-use" className="text-white hover:text-gray-300 transition-colors">
                User Guide
              </Link>
            </div>
          </div>

          {/* Right Column - Legal */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4 text-white">Legal</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/tos" className="text-white hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/community-guidelines"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Community Guidelines
              </Link>
              <Link href="/safety" className="text-white hover:text-gray-300 transition-colors">
                Safety Guidelines
              </Link>
              <Link href="/faq" className="text-white hover:text-gray-300 transition-colors">
                Help & FAQ
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom section with divider */}
        <div className="border-t border-white/30 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="text-center md:text-left">
              <p className="text-white mb-2">
                ShareSkippy is a free marketplace platform. Users are responsible for their own
                safety and interactions.
              </p>
              <p className="text-xs text-white/80">{LEGAL.getCurrentDisclosure()}</p>
            </div>
            <p className="text-white">Made with ❤️ for dog lovers</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
