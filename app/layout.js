import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import AppLayout from '@/components/AppLayout';
import ClientLayout from '@/components/LayoutClient';
import { SupabaseUserProvider } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';
import { QueryProvider } from '@/contexts/QueryProvider';
import { getSEOTags } from '@/libs/seo';
import { createClient as getServerClient } from '@/libs/supabase/server';
import './globals.css';

const font = Inter({ subsets: ['latin'] });

export const viewport = {
  themeColor: config.colors.main,
  width: 'device-width',
  initialScale: 1,
};

export const metadata = getSEOTags();

export default async function RootLayout({ children }) {
  const supabase = getServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" data-theme={config.colors.theme} className={font.className}>
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
