"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import Header from "./Header";
import LoggedInNav from "./LoggedInNav";
import Footer from "./Footer";

const AppLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Don't show header/footer on auth pages
  const isAuthPage = pathname === "/signin" || pathname.startsWith("/signin");
  
  // Don't show footer on dashboard/profile pages (logged-in pages)
  const isLoggedInPage = pathname.startsWith("/dashboard") || 
                        pathname.startsWith("/community") ||
                        pathname.startsWith("/profile") || 
                        pathname.startsWith("/share-availability") ||
                        pathname.startsWith("/messages") ||
                        pathname.startsWith("/meetings") ||
                        pathname.startsWith("/my-dogs");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Show appropriate header based on authentication status */}
      {!isAuthPage && (
        user ? <LoggedInNav /> : <Header />
      )}
      
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Show footer only on public pages */}
      {!isAuthPage && !isLoggedInPage && <Footer />}
    </div>
  );
};

export default AppLayout;
