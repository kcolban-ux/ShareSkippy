'use client';

import { Crisp } from 'crisp-sdk-web';
import { usePathname } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';

// Crisp customer chat support:
// This component is separated from ClientLayout because it needs to be wrapped with <SessionProvider> to use useSession() hook
const CrispChat = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const [crispInitialized, setCrispInitialized] = useState(false);

  useEffect(() => {
    if (config?.crisp?.id && !crispInitialized) {
      // Set up Crisp only once
      Crisp.configure(config.crisp.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCrispInitialized(true);
    }
  }, [crispInitialized]);

  useEffect(() => {
    if (crispInitialized) {
      // (Optional) If onlyShowOnRoutes array is not empty in config.js file, Crisp will be hidden on the routes in the array.
      // Use <AppButtonSupport> instead to show it (user clicks on the button to show Crisp—it cleans the UI)
      if (config.crisp.onlyShowOnRoutes && !config.crisp.onlyShowOnRoutes?.includes(pathname)) {
        Crisp.chat.hide();
        Crisp.chat.onChatClosed(() => {
          Crisp.chat.hide();
        });
      }
    }
  }, [pathname, crispInitialized]);

  // Add User Unique ID to Crisp to easily identify users when reaching support (optional)
  useEffect(() => {
    if (user && crispInitialized) {
      Crisp.session.setData({ userId: user.id });

      // Set user data in Crisp for better support experience
      Crisp.user.setEmail(user.email);
      Crisp.user.setNickname(user.user_metadata?.full_name || user.email);
      Crisp.user.setAvatar(user.user_metadata?.avatar_url);

      // Set custom data
      Crisp.user.setData({
        id: user.id,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
      });
    }
  }, [user, crispInitialized]);

  return null;
};

// All the client wrappers are here (they can't be in server components)
// 1. NextTopLoader: Show a progress bar at the top when navigating between pages
// 2. Toaster: Show Success/Error messages anywhere from the app with toast()
// 3. Tooltip: Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content=""
// 4. CrispChat: Set Crisp customer chat support (see above)
const ClientLayout = ({ children }) => {
  return (
    <>
      {/* Show a progress bar at the top when navigating between pages */}
      <NextTopLoader color="light" showSpinner={false} />

      {/* Content inside app/page.js files  */}
      {children}

      {/* Show Success/Error messages anywhere from the app with toast() */}
      <Toaster
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content="" */}
      <Tooltip id="tooltip" className="z-60 opacity-100! max-w-sm shadow-lg" />

      {/* Set Crisp customer chat support */}
      <CrispChat />
    </>
  );
};

export default ClientLayout;
