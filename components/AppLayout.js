"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import Header from "./Header";
import LoggedInNav from "./LoggedInNav";
import Footer from "./Footer";

const AppLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  
  // Memoize the supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) {
          setUser(user);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Don't show header/footer on auth pages
  const isAuthPage = pathname === "/signin" || pathname.startsWith("/signin");

  if (loading) {
    return <div className="min-h-screen w-full bg-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Show appropriate header based on authentication status */}
      {!isAuthPage && (
        user ? <LoggedInNav /> : <Header />
      )}
      
      {/* Main content */}
      <main className="flex-1 w-full bg-white">
        {children}
      </main>
      
      {/* Show footer on all pages except auth pages */}
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default AppLayout;
