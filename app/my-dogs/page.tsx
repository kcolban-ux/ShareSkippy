'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, ReactElement } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute'; // <-- Added
import { useUserDogs, UserDog } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';

// #region Component
export default function MyDogsPage(): ReactElement {
  // #region State & Hooks
  /**
   * @description Handles user authentication and redirection for the page.
   * `authLoading` is true while the user's session is being verified.
   * The hook redirects to the login page if the user is not authenticated.
   */
  const { user, isLoading: authLoading } = useProtectedRoute();

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useUserDogs();
  // #endregion

  // #region Handlers
  /**
   * @description Deletes a dog from the database and invalidates the query cache.
   * @param dogId The ID of the dog to delete.
   */
  const deleteDog = async (dogId: string): Promise<void> => {
    // The `!user` check is kept as a type guard for TypeScript,
    // although `useProtectedRoute` ensures `user` is present.
    if (!user || !confirm('Are you sure you want to delete this dog?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('dogs')
        .delete()
        .eq('id', dogId)
        .eq('owner_id', user.id);

      if (deleteError) {
        console.error('Error deleting dog:', deleteError);
        setError('Failed to delete dog. ' + deleteError.message);
        return;
      }

      // Invalidate and refetch dogs data
      queryClient.invalidateQueries({ queryKey: ['userDogs', user?.id] });
    } catch (err: unknown) {
      console.error('Client error deleting dog:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };
  // #endregion

  // #region Render Logic
  /**
   * @description This loading state now waits for *both* auth verification
   * and the fetching of user dogs to complete.
   */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dogs...</p>
        </div>
      </div>
    );
  }

  const dogs: UserDog[] = data || [];

  /**
   * @description This `if (!user)` block is no longer needed.
   * The `useProtectedRoute` hook handles redirection automatically
   * if the user is not authenticated. If the code reaches this point,
   * `user` is guaranteed to be present.
   */
  // if (!user) { ... } // <-- This block is now removed.
  // #endregion

  // #region JSX
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dogs</h1>
            <p className="text-gray-600 mt-2">Manage your furry friends</p>
          </div>
          <Link
            href="/my-dogs/add"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>+</span>
            <span>Add New Dog</span>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Dogs Grid */}
        {dogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🐕</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No dogs yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Add your first dog to start finding walkers and connecting with the pet care community
              in your area!
            </p>
            <Link
              href="/my-dogs/add"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
            >
              Add Your First Dog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dogs.map((dog: UserDog) => (
              <div
                key={dog.id}
                className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Dog Photo */}
                <div className="aspect-square bg-gray-100 relative group">
                  {dog.photo_url ? (
                    <Image
                      src={dog.photo_url}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      width={400}
                      height={400}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🐕
                    </div>
                  )}

                  {/* Overlay with quick actions */}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 pointer-events-auto">
                      {' '}
                      <Link
                        href={`/my-dogs/${dog.id}/edit`}
                        className="bg-white text-gray-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteDog(dog.id)}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {/* Dog Info */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{dog.name}</h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    {dog.breed && <p className="font-medium">{dog.breed}</p>}

                    <p>
                      {dog.age_years > 0 &&
                        `${dog.age_years} year${dog.age_years === 1 ? '' : 's'} `}
                      {dog.age_months > 0 &&
                        `${dog.age_months} month${dog.age_months === 1 ? '' : 's'}`}
                    </p>

                    <p className="capitalize">
                      {dog.size?.includes('-') ? `${dog.size} lbs` : dog.size?.replace('_', ' ')} •{' '}
                      {dog.gender}
                      {dog.neutered && ' (Neutered)'}
                    </p>

                    {dog.energy_level && <p className="capitalize">Energy: {dog.energy_level}</p>}
                  </div>

                  {/* Friendliness Icons */}
                  <div className="flex gap-2 mt-4">
                    {dog.dog_friendly && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        🐕 Dog Friendly
                      </span>
                    )}
                    {dog.cat_friendly && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        🐱 Cat Friendly
                      </span>
                    )}
                    {dog.kid_friendly && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        👶 Kid Friendly
                      </span>
                    )}
                  </div>

                  {/* Training & Health Icons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dog.leash_trained && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        🦮 Leash Trained
                      </span>
                    )}
                    {dog.house_trained && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        🏠 House Trained
                      </span>
                    )}
                    {dog.fully_vaccinated && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        💉 Vaccinated
                      </span>
                    )}
                  </div>

                  {/* Activities */}
                  {dog.activities && dog.activities.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Loves:</p>
                      <div className="flex flex-wrap gap-1">
                        {dog.activities.slice(0, 3).map((activity: string, index: number) => (
                          <span
                            key={`${dog.id}-${activity}-${index}`} // Use a more unique key
                            className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
                          >
                            {activity}
                          </span>
                        ))}
                        {dog.activities.length > 3 && (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                            +{dog.activities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-6">
                    <Link
                      href={`/my-dogs/${dog.id}`}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-center hover:bg-blue-700 transition-colors font-medium"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/my-dogs/${dog.id}/edit`}
                      className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg text-center hover:bg-gray-700 transition-colors font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  // #endregion
}
// #endregion
