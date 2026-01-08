'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/lib/supabase/hooks';
import { createClient } from '@/lib/supabase/client';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function EditDogPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthday: '',
    age_years: '',
    age_months: '',
    gender: 'male',
    size: 'medium',
    energy_level: 'moderate',
    neutered: false,
    leash_trained: false,
    house_trained: false,
    crate_trained: false,
    fully_vaccinated: false,
    dog_friendly: false,
    cat_friendly: false,
    kid_friendly: false,
    activities: [],
    description: '',
    temperament: [],
  });

  const activityOptions = [
    'Walking',
    'Running',
    'Swimming',
    'Fetch',
    'Tug of War',
    'Training',
    'Socializing',
    'Agility',
    'Hiking',
    'Dog Parks',
  ];

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

      // Convert null values to empty strings for form inputs
      const formattedData = {
        ...data,
        age_years: data.age_years || '',
        age_months: data.age_months || '',
        breed: data.breed || '',
        birthday: data.birthday || '',
        description: data.description || '',
        temperament: data.temperament || [],
        activities: data.activities || [],
      };

      setFormData(formattedData);
      setPhotoUrl(data.photo_url || '');
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleActivityChange = (activity) => {
    setFormData((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }));
  };

  const handleTemperamentChange = (trait) => {
    setFormData((prev) => ({
      ...prev,
      temperament: prev.temperament.includes(trait)
        ? prev.temperament.filter((t) => t !== trait)
        : [...prev.temperament, trait],
    }));
  };

  const handlePhotoUpload = (url) => {
    setPhotoUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !id) return;

    const supabase = createClient();

    try {
      setSaving(true);
      setError(null);

      // Convert empty strings to null for database
      const updateData = {
        ...formData,
        age_years: formData.age_years ? parseInt(formData.age_years) : null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        breed: formData.breed || null,
        birthday: formData.birthday || null,
        description: formData.description || null,
        photo_url: photoUrl || null,
        temperament: formData.temperament || [],
        activities: formData.activities || [],
        // Ensure boolean fields are properly set
        neutered: Boolean(formData.neutered),
        leash_trained: Boolean(formData.leash_trained),
        house_trained: Boolean(formData.house_trained),
        crate_trained: Boolean(formData.crate_trained),
        fully_vaccinated: Boolean(formData.fully_vaccinated),
        dog_friendly: Boolean(formData.dog_friendly),
        cat_friendly: Boolean(formData.cat_friendly),
        kid_friendly: Boolean(formData.kid_friendly),
      };

      console.log('Updating dog with data:', updateData);
      console.log('Dog ID:', id);
      console.log('User ID:', user.id);

      const { error } = await supabase
        .from('dogs')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error updating dog:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        setError(`Failed to update dog: ${error.message}`);
        return;
      }

      router.push(`/my-dogs/${id}`);
    } catch (error) {
      console.error('Error updating dog:', error);
      setError('Failed to update dog');
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/my-dogs/${id}`}
            className="text-blue-600 hover:text-blue-700 font-medium mb-2 inline-block"
          >
            ← Back to Dog Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit {formData.name}</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-xs border border-gray-200 p-8"
        >
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                <div>
                  <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
                    Breed
                  </label>
                  <input
                    type="text"
                    id="breed"
                    name="breed"
                    value={formData.breed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor="birthday"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Birthday
                  </label>
                  <input
                    type="date"
                    id="birthday"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="age_years"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      id="age_years"
                      name="age_years"
                      value={formData.age_years}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="age_months"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Age (Months)
                    </label>
                    <input
                      type="number"
                      id="age_months"
                      name="age_months"
                      value={formData.age_months}
                      onChange={handleInputChange}
                      min="0"
                      max="11"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="0-10">0-10 lbs</option>
                    <option value="11-25">11-25 lbs</option>
                    <option value="26-40">26-40 lbs</option>
                    <option value="41-70">41-70 lbs</option>
                    <option value="71-90">71-90 lbs</option>
                    <option value="91-110">91-110 lbs</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="energy_level"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Energy Level *
                  </label>
                  <select
                    id="energy_level"
                    name="energy_level"
                    value={formData.energy_level}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dog Photo</label>
                  <PhotoUpload
                    onPhotoUploaded={handlePhotoUpload}
                    initialPhotoUrl={photoUrl}
                    bucketName="dog-photos"
                  />
                </div>
              </div>
            </div>

            {/* Training & Health */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Training & Health</h2>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="neutered"
                    name="neutered"
                    checked={formData.neutered}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="neutered" className="ml-2 block text-sm text-gray-900">
                    Neutered/Spayed
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="leash_trained"
                    name="leash_trained"
                    checked={formData.leash_trained}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="leash_trained" className="ml-2 block text-sm text-gray-900">
                    Leash Trained
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="house_trained"
                    name="house_trained"
                    checked={formData.house_trained}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="house_trained" className="ml-2 block text-sm text-gray-900">
                    House Trained
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="crate_trained"
                    name="crate_trained"
                    checked={formData.crate_trained}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="crate_trained" className="ml-2 block text-sm text-gray-900">
                    Crate Trained
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="fully_vaccinated"
                    name="fully_vaccinated"
                    checked={formData.fully_vaccinated}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="fully_vaccinated" className="ml-2 block text-sm text-gray-900">
                    Fully Vaccinated
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="dog_friendly"
                    name="dog_friendly"
                    checked={formData.dog_friendly}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="dog_friendly" className="ml-2 block text-sm text-gray-900">
                    Dog Friendly
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cat_friendly"
                    name="cat_friendly"
                    checked={formData.cat_friendly}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="cat_friendly" className="ml-2 block text-sm text-gray-900">
                    Cat Friendly
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="kid_friendly"
                    name="kid_friendly"
                    checked={formData.kid_friendly}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label htmlFor="kid_friendly" className="ml-2 block text-sm text-gray-900">
                    Kid Friendly
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperament (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Friendly',
                      'Playful',
                      'Calm',
                      'Energetic',
                      'Shy',
                      'Confident',
                      'Curious',
                      'Loyal',
                    ].map((trait) => (
                      <div key={trait} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`temperament-${trait}`}
                          checked={formData.temperament.includes(trait)}
                          onChange={() => handleTemperamentChange(trait)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                        />
                        <label
                          htmlFor={`temperament-${trait}`}
                          className="ml-2 block text-sm text-gray-700"
                        >
                          {trait}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activities & Preferences</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activityOptions.map((activity) => (
                <div key={activity} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`activity-${activity}`}
                    checked={formData.activities.includes(activity)}
                    onChange={() => handleActivityChange(activity)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm"
                  />
                  <label
                    htmlFor={`activity-${activity}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {activity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe your dog..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="mt-8 pt-8 border-t border-gray-200 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/my-dogs/${id}`}
              className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
