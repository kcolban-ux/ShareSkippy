'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/supabase/hooks';
import { createClient } from '@/lib/supabase/client';

export default function DogDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDog = useCallback(async () => {
    if (!user || !id) return;
    const supabase = createClient();

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching dog:', error);
        if (error.code === 'PGRST116') {
          setError('Dog not found');
        } else {
          setError('Failed to fetch dog details');
        }
        return;
      }

      setDog(data);
    } catch (error) {
      console.error('Error fetching dog:', error);
      setError('Failed to fetch dog details');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/signin');
      return;
    }

    fetchDog();
  }, [authLoading, id, router, user, fetchDog]);

  const deleteDog = async () => {
    if (
      !user ||
      !dog ||
      !confirm('Are you sure you want to delete this dog? This action cannot be undone.')
    )
      return;

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('dogs')
        .delete()
        .eq('id', dog.id)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error deleting dog:', error);
        setError('Failed to delete dog');
        return;
      }

      router.push('/my-dogs');
    } catch (error) {
      console.error('Error deleting dog:', error);
      setError('Failed to delete dog');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dog details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🐕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            href="/my-dogs"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
          >
            Back to My Dogs
          </Link>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🐕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dog not found</h2>
          <p className="text-gray-600 mb-8">
            The dog you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to
            view it.
          </p>
          <Link
            href="/my-dogs"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
          >
            Back to My Dogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href="/my-dogs"
              className="text-blue-600 hover:text-blue-700 font-medium mb-2 inline-block"
            >
              ← Back to My Dogs
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{dog.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/my-dogs/${dog.id}/edit`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Edit Dog
            </Link>
            <button
              onClick={deleteDog}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Delete Dog
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Dog Photo */}
          <div className="aspect-video bg-gray-100 relative">
            {dog.photo_url ? (
              <Image
                src={dog.photo_url}
                alt={dog.name}
                className="w-full h-full object-cover"
                height={400}
                width={400}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">🐕</div>
            )}
          </div>

          {/* Dog Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg text-gray-900">{dog.name}</p>
                  </div>

                  {dog.breed && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Breed</label>
                      <p className="text-lg text-gray-900">{dog.breed}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500">Age</label>
                    <p className="text-lg text-gray-900">
                      {dog.age_years > 0 &&
                        `${dog.age_years} year${dog.age_years !== 1 ? 's' : ''} `}
                      {dog.age_months > 0 &&
                        `${dog.age_months} month${dog.age_months !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-lg text-gray-900 capitalize">
                      {dog.gender}
                      {dog.neutered && ' (Neutered)'}
                    </p>
                  </div>

                  {dog.size && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Size</label>
                      <p className="text-lg text-gray-900 capitalize">
                        {dog.size.includes('-') ? `${dog.size} lbs` : dog.size.replace('_', ' ')}
                      </p>
                    </div>
                  )}

                  {dog.energy_level && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Energy Level</label>
                      <p className="text-lg text-gray-900 capitalize">{dog.energy_level}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Training & Health */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Training & Health</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Training Status</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dog.leash_trained && (
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          🦮 Leash Trained
                        </span>
                      )}
                      {dog.house_trained && (
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          🏠 House Trained
                        </span>
                      )}
                      {dog.crate_trained && (
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          📦 Crate Trained
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Health</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dog.fully_vaccinated && (
                        <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                          💉 Fully Vaccinated
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Friendliness</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dog.dog_friendly && (
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          🐕 Dog Friendly
                        </span>
                      )}
                      {dog.cat_friendly && (
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          🐱 Cat Friendly
                        </span>
                      )}
                      {dog.kid_friendly && (
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          👶 Kid Friendly
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activities */}
            {dog.activities && dog.activities.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Activities & Preferences
                </h2>
                <div className="flex flex-wrap gap-2">
                  {dog.activities.map((activity, index) => (
                    <span
                      key={index}
                      className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Temperament */}
            {dog.temperament && dog.temperament.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Temperament</h2>
                <div className="flex flex-wrap gap-2">
                  {dog.temperament.map((trait, index) => (
                    <span
                      key={index}
                      className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {dog.description && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{dog.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
