'use client';

import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import Footer from './Footer';
import Header from './Header';
import LoggedInNav from './LoggedInNav';
import ReviewBanner from './ReviewBanner';
import ReviewModal from './ReviewModal';
import LoginToast from './LoginToast';

const AppLayout = ({ children }) => {
  const { user, loading } = useUser();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const pathname = usePathname();

  // Don't show header/footer on auth pages
  const isAuthPage = pathname === '/signin' || pathname.startsWith('/signin');

  const handleReviewClick = useCallback((review) => {
    setSelectedReview(review);
    setIsReviewModalOpen(true);
  }, []);

  const handleReviewSubmitted = useCallback((review) => {
    // The review submission will be handled by the specific page components
    // that use React Query to invalidate their caches
    console.log('Review submitted:', review);
  }, []);

  const handleCloseReviewModal = useCallback(() => {
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Show appropriate header based on authentication status */}
      {!isAuthPage && (user ? <LoggedInNav /> : <Header />)}

      {/* Main content */}
      <main className="flex-1 w-full bg-white">
        {/* Show review banner for logged-in users */}
        {user && !isAuthPage && (
          <div className="container mx-auto px-4 pt-4">
            <ReviewBanner onReviewClick={handleReviewClick} />
          </div>
        )}
        {children}
      </main>

      {/* Show footer on all pages except auth pages */}
      {!isAuthPage && <Footer />}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        pendingReview={selectedReview}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Login Toast for unread messages */}
      <LoginToast />
    </div>
  );
};

export default AppLayout;
