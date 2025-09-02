"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { createClient } from '@/libs/supabase/client';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function AddDogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthday: '',
    size: '26-40',
    gender: 'male',
    neutered: false,
    temperament: [],
    energy_level: 'moderate',
    dog_friendly: true,
    cat_friendly: false,
    kid_friendly: false,
    leash_trained: false,
    crate_trained: false,
    house_trained: false,
    fully_vaccinated: false,
    activities: [],
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemperamentChange = (trait) => {
    setFormData(prev => ({
      ...prev,
      temperament: prev.temperament.includes(trait)
        ? prev.temperament.filter(t => t !== trait)
        : [...prev.temperament, trait]
    }));
  };

  const handleActivityChange = (activity) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const handlePhotoUpload = (url) => {
    setPhotoUrl(url);
  };

  const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    
    return { years, months };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const age = calculateAge(formData.birthday);

      // Debug: Log user info
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      
      const dogData = {
        ...formData,
        age_years: age.years,
        age_months: age.months,
        photo_url: photoUrl,
        owner_id: user.id
      };
      
      console.log('Dog data to insert:', dogData);

      // Create a new client instance to ensure proper auth context
      const supabase = createClient();
      
      // Verify the user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('User not authenticated. Please sign in again.');
        return;
      }

      console.log('Session user ID:', session.user.id);
      console.log('Session access token exists:', !!session.access_token);

      // Ensure the owner_id matches the authenticated user
      const dogDataWithAuth = {
        ...dogData,
        owner_id: session.user.id
      };

      const { error } = await supabase
        .from('dogs')
        .insert(dogDataWithAuth);

      if (error) {
        console.error('Error creating dog:', error);
        setError(`Failed to create dog profile: ${error.message}`);
        return;
      }

      router.push('/my-dogs');
    } catch (error) {
      console.error('Error creating dog:', error);
      setError(error.message || 'Failed to create dog profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🐕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign in to add dogs</h2>
          <p className="text-gray-600 mb-8">
            You need to be signed in to add dog profiles.
          </p>
          <Link 
            href="/signin" 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/my-dogs"
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
          >
            ← Back to My Dogs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Dog</h1>
          <p className="text-gray-600 mt-2">Tell us about your furry friend</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Dog's Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your dog&apos;s name"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Golden Retriever, Mixed Breed"
              />
            </div>

            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
                Birthday *
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.birthday && (
                <p className="text-sm text-gray-500 mt-1">
                  Age: {calculateAge(formData.birthday).years} years, {calculateAge(formData.birthday).months} months
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="neutered"
                name="neutered"
                checked={formData.neutered}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="neutered" className="ml-2 block text-sm text-gray-700">
                Neutered/Spayed
              </label>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dog Photo
            </label>
            <PhotoUpload
              onPhotoUploaded={handlePhotoUpload}
              initialPhotoUrl={photoUrl}
              bucketName="dog-photos"
            />
          </div>

          {/* Energy Level */}
          <div>
            <label htmlFor="energy_level" className="block text-sm font-medium text-gray-700 mb-1">
              Energy Level
            </label>
            <select
              id="energy_level"
              name="energy_level"
              value={formData.energy_level}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Friendliness */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Friendliness</h2>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="dog_friendly"
                  name="dog_friendly"
                  checked={formData.dog_friendly}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="dog_friendly" className="ml-2 block text-sm text-gray-700">
                  Dog friendly
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cat_friendly"
                  name="cat_friendly"
                  checked={formData.cat_friendly}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="cat_friendly" className="ml-2 block text-sm text-gray-700">
                  Cat friendly
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="kid_friendly"
                  name="kid_friendly"
                  checked={formData.kid_friendly}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="kid_friendly" className="ml-2 block text-sm text-gray-700">
                  Kid friendly
                </label>
              </div>
            </div>
          </div>

          {/* Training & Health */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Training & Health</h2>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="leash_trained"
                  name="leash_trained"
                  checked={formData.leash_trained}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="leash_trained" className="ml-2 block text-sm text-gray-700">
                  Leash trained
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="crate_trained"
                  name="crate_trained"
                  checked={formData.crate_trained}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="crate_trained" className="ml-2 block text-sm text-gray-700">
                  Crate trained
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="house_trained"
                  name="house_trained"
                  checked={formData.house_trained}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="house_trained" className="ml-2 block text-sm text-gray-700">
                  House trained
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fully_vaccinated"
                  name="fully_vaccinated"
                  checked={formData.fully_vaccinated}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="fully_vaccinated" className="ml-2 block text-sm text-gray-700">
                  Fully vaccinated
                </label>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Activities My Dog Loves</h2>
            <p className="text-sm text-gray-600">Select all the activities your dog enjoys</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                'Cuddling', 'Hiking', 'Dog Parks', 'Running', 'Sleepovers',
                'Camping', 'Playing Fetch', 'Swimming', 'Walking'
              ].map((activity) => (
                <div key={activity} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`activity-${activity}`}
                    checked={formData.activities.includes(activity)}
                    onChange={() => handleActivityChange(activity)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`activity-${activity}`} className="ml-2 block text-sm text-gray-700">
                    {activity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Temperament */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperament (select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Friendly', 'Playful', 'Calm', 'Energetic', 'Shy', 'Confident', 'Curious', 'Loyal'].map((trait) => (
                <div key={trait} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`temperament-${trait}`}
                    checked={formData.temperament.includes(trait)}
                    onChange={() => handleTemperamentChange(trait)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`temperament-${trait}`} className="ml-2 block text-sm text-gray-700">
                    {trait}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us more about your dog's personality, likes, dislikes, special needs, etc."
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/my-dogs"
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Dog Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
