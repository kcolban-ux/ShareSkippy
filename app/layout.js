import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import Script from 'next/script';
import AppLayout from '@/components/AppLayout';
import ClientLayout from '@/components/LayoutClient';
import { SupabaseUserProvider } from '@/components/providers/SupabaseUserProvider';
import { QueryProvider } from '@/contexts/QueryProvider';
import { createClient } from '@/libs/supabase/server';
import { getSEOTags } from '@/libs/seo';
import './globals.css';

const font = Inter({ subsets: ['latin'] });

export const viewport = {
  // Will use the primary color of your theme to show a nice theme color in the URL bar of supported browsers
  themeColor: 'light',
  width: 'device-width',
  initialScale: 1,
};

export const metadata = getSEOTags();

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    console.debug(`[Root Layout] Server found a session. User: ${session.user.id}`);
  } else {
    console.warn('[Root Layout] Server found NO session. Passing null to provider.');
  }

  return (
    <html lang="en" data-theme={viewport.themeColor} className={font.className}>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TGM53SZZX1"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', 'G-TGM53SZZX1');
					`}
        </Script>

        <QueryProvider>
          <SupabaseUserProvider initialSession={session}>
            <ClientLayout>
              <AppLayout>{children}</AppLayout>
            </ClientLayout>
          </SupabaseUserProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
