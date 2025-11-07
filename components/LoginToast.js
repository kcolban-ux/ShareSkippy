'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import toast from 'react-hot-toast';

export default function LoginToast() {
  const { user, loading } = useUser();
  const { unreadCount, loading: unreadLoading } = useUnreadMessages(user?.id);
  const router = useRouter();
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Only show toast once per session, when user first logs in with unread messages
    if (!loading && !unreadLoading && user && unreadCount > 0 && !hasShownToast.current) {
      hasShownToast.current = true;
      
      toast(
        (t) => (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  You have {unreadCount} unread {unreadCount === 1 ? 'conversation' : 'conversations'}
                </p>
                <p className="text-sm text-gray-600">Open Messages to reply</p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                router.push('/messages');
              }}
              className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Messages
            </button>
          </div>
        ),
        {
          duration: 6000,
          position: 'top-center',
          style: {
            minWidth: '400px',
            maxWidth: '500px',
          },
        }
      );
    }
  }, [user, loading, unreadCount, unreadLoading, router]);

  // Reset toast flag when user logs out
  useEffect(() => {
    if (!user) {
      hasShownToast.current = false;
    }
  }, [user]);

  return null;
}

