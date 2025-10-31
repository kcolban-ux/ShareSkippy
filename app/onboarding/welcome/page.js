'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { formatDistance } from '@/libs/distance';
import { createClient } from '@/libs/supabase/client';

export default function WelcomePage() {
  const { user } = useUser();
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});
  const [currentProfile, setCurrentProfile] = useState(null);

  // 1. Wrap functions that use external state/router in useCallback to stabilize the dependency array
  const fetchCurrentProfile = useCallback(async () => {
    // Check for user existence inside the function in case of initial null state
    if (!user) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentProfile(data);
    } catch (error) {
      console.error('Error fetching current profile:', error);
    }
  }, [user]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch('/api/matches?limit=4');
      const data = await response.json();

      if (data.error) {
        if (data.needsLocation) {
          toast.error('Please complete your profile with location information');
          router.push('/profile/edit');
          return;
        }
        throw new Error(data.error);
      }

      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const sendInterest = async (matchUserId, _matchName) => {
    // 2. Renamed matchName to _matchName to fix unused var error
    setSending((prev) => ({ ...prev, [matchUserId]: true }));

    try {
      const supabase = createClient();

      // Get current user's first name
      const firstName = currentProfile?.first_name || 'Someone';

      // Check if conversation already exists
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${matchUserId}),and(participant1_id.eq.${matchUserId},participant2_id.eq.${user.id})`
        )
        .maybeSingle();

      let conversationId = existingConvo?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: matchUserId,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (convoError) {
          console.error('Error creating conversation:', convoError);
          throw convoError;
        }
        conversationId = newConvo.id;
      }

      // Send the interest message
      const messageText = `Hi! I saw your profile on ShareSkippy and would love to connect. I'm ${firstName}. Please let me know if you'd like to chat more!`;

      const { error: messageError } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: matchUserId,
        conversation_id: conversationId,
        content: messageText,
        is_read: false,
      });

      if (messageError) {
        console.error('Error sending message:', messageError);
        throw messageError;
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      setSent((prev) => ({ ...prev, [matchUserId]: true }));

      // Show success message and redirect to share availability
      toast.success(`Your interest was successfully sent! Share your availability now.`, {
        duration: 3000,
      });

      // Redirect after a brief delay
      setTimeout(() => {
        router.push('/share-availability');
      }, 1500);
    } catch (error) {
      console.error('Error sending interest:', error);
      toast.error('Failed to send interest. Please try again.');
    } finally {
      setSending((prev) => ({ ...prev, [matchUserId]: false }));
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }
    fetchCurrentProfile();
    fetchMatches();
  }, [user, router, fetchCurrentProfile, fetchMatches]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding matches near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 Welcome to ShareSkippy!</h1>
          <p className="text-lg text-gray-600">
            {matches.length > 0
              ? 'Here are a few people near you. Reach out now!'
              : 'Looking for matches in your area...'}
          </p>
        </div>

        {/* Matches List */}
        {matches.length > 0 ? (
          <div className="space-y-4 mb-8">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  {/* Profile Photo */}
                  <Image
                    src={match.profile_photo_url || '/default-avatar.png'}
                    alt={match.first_name}
                    className="w-20 h-20 rounded-full object-cover shrink-0"
                  />

                  {/* Profile Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {match.first_name} {match.last_name || ''}
                        </h3>
                        <p className="text-sm text-gray-500">
                          📍 {formatDistance(match.distance)}
                          {(match.neighborhood || match.city) && (
                            <>
                              {' '}
                              • {match.neighborhood || match.city}
                              {match.neighborhood && match.city && match.neighborhood !== match.city
                                ? `, ${match.city}`
                                : ''}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="mb-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          match.role === 'dog_owner'
                            ? 'bg-blue-100 text-blue-800'
                            : match.role === 'petpal'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {match.role === 'dog_owner'
                          ? '🐕 Dog Owner'
                          : match.role === 'petpal'
                            ? '👤 PetPal'
                            : '🐕👤 Both'}
                      </span>
                    </div>

                    {/* Dogs Info */}
                    {match.dogs && match.dogs.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">
                            {match.dogs.length === 1
                              ? 'Has 1 dog:'
                              : `Has ${match.dogs.length} dogs:`}
                          </span>{' '}
                          {match.dogs.map((dog, idx) => (
                            <span key={dog.name}>
                              {dog.name}
                              {dog.breed && ` (${dog.breed})`}
                              {idx < match.dogs.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}

                    {/* Bio */}
                    {match.bio && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{match.bio}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => sendInterest(match.id, match.first_name)}
                        disabled={sending[match.id] || sent[match.id]}
                        className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                          sent[match.id]
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {sending[match.id] ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⏳</span>
                            Sending...
                          </>
                        ) : sent[match.id] ? (
                          '✓ Interest Sent'
                        ) : (
                          '💬 Send Interest'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center mb-8">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found yet</h3>
            <p className="text-gray-600 mb-4">
              More people are joining ShareSkippy every day! Check back soon or browse the
              community.
            </p>
            <button
              onClick={() => router.push('/community')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Community
            </button>
          </div>
        )}

        {/* Availability Upsell */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🌟 Want Even More Matches?</h3>
          <p className="text-gray-700 mb-4">
            Share your availability to help people know when you&apos;re free. You&apos;ll show up
            in more searches and get more messages!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push('/share-availability')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Share My Availability →
            </button>
            <button
              onClick={() => router.push('/community')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {matches.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            💡 Tip: The more you engage, the more visible you become in the community!
          </div>
        )}
      </div>
    </div>
  );
}
