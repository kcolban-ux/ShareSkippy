import { Metadata } from 'next';

/**
 * Page metadata for the How-To Use guide.
 */
export const metadata: Metadata = {
  title: 'How to Use ShareSkippy - Complete User Guide',
  description:
    'Learn how to use ShareSkippy to connect with fellow dog lovers in your community. Complete guide covering profiles, availability posts, messaging, meetings, and reviews.',
  keywords: [
    'ShareSkippy',
    'dog sharing',
    'dog walking',
    'pet care',
    'community',
    'how to use',
    'user guide',
    'tutorial',
    'dog lovers',
    'neighborhood',
  ],
  authors: [{ name: 'ShareSkippy Team' }],
  creator: 'ShareSkippy',
  publisher: 'ShareSkippy',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://shareskippy.com'),
  alternates: {
    canonical: '/how-to-use',
  },
  openGraph: {
    title: 'How to Use ShareSkippy - Complete User Guide',
    description:
      'Learn how to use ShareSkippy to connect with fellow dog lovers in your community. Complete guide covering profiles, availability posts, messaging, meetings, and reviews.',
    url: '/how-to-use',
    siteName: 'ShareSkippy',
    images: [
      {
        url: '/og-image-how-to-use.png',
        width: 1200,
        height: 630,
        alt: 'How to Use ShareSkippy - Complete User Guide',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Use ShareSkippy - Complete User Guide',
    description:
      'Learn how to use ShareSkippy to connect with fellow dog lovers in your community.',
    images: ['/og-image-how-to-use.png'],
    creator: '@shareskippy',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};
