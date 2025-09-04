"use client";

import { createClient } from "@/libs/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Crisp } from "crisp-sdk-web";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import config from "@/config";

// Crisp customer chat support:
// This component is separated from ClientLayout because it needs to be wrapped with <SessionProvider> to use useSession() hook
const CrispChat = () => {
  const pathname = usePathname();
  const [data, setData] = useState(null);
  const [crispInitialized, setCrispInitialized] = useState(false);

  // Memoize the supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  // This is used to get the user data from Supabase Auth (if logged in) => user ID is used to identify users in Crisp
  useEffect(() => {
    let mounted = true;
    
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted && user) {
          setData({ user });
        }
      } catch (error) {
        console.error('Error getting user for Crisp:', error);
      }
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setData(session?.user ? { user: session.user } : null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (config?.crisp?.id && !crispInitialized) {
      // Set up Crisp only once
      Crisp.configure(config.crisp.id);
      setCrispInitialized(true);
    }
  }, [crispInitialized]);

  useEffect(() => {
    if (crispInitialized) {
      // (Optional) If onlyShowOnRoutes array is not empty in config.js file, Crisp will be hidden on the routes in the array.
      // Use <AppButtonSupport> instead to show it (user clicks on the button to show Crisp—it cleans the UI)
      if (
        config.crisp.onlyShowOnRoutes &&
        !config.crisp.onlyShowOnRoutes?.includes(pathname)
      ) {
        Crisp.chat.hide();
        Crisp.chat.onChatClosed(() => {
          Crisp.chat.hide();
        });
      }
    }
  }, [pathname, crispInitialized]);

  // Add User Unique ID to Crisp to easily identify users when reaching support (optional)
  useEffect(() => {
    if (data?.user && crispInitialized) {
      Crisp.session.setData({ userId: data.user?.id });
    }
  }, [data, crispInitialized]);

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
      <NextTopLoader color={config.colors.main} showSpinner={false} />

      {/* Content inside app/page.js files  */}
      {children}

      {/* Show Success/Error messages anywhere from the app with toast() */}
      <Toaster
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* Show tooltips if any JSX elements has these 2 attributes: data-tooltip-id="tooltip" data-tooltip-content="" */}
      <Tooltip
        id="tooltip"
        className="z-[60] !opacity-100 max-w-sm shadow-lg"
      />

      {/* Set Crisp customer chat support */}
      <CrispChat />
    </>
  );
};

export default ClientLayout;
