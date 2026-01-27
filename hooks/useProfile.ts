import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { createClient } from '@/lib/supabase/client';

// #region Interfaces
/**
 * Interface for the 'profiles' database table data.
 */
export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  // Add other profile fields here
  [key: string]: unknown;
}

/**
 * Interface for the 'dogs' database table data.
 */
export interface UserDog {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  birthday: string | null;
  age_years: number;
  age_months: number;
  size: string | null;
  photo_url: string | null;
  gender: string | null;
  neutered: boolean;
  temperament: string[] | null;
  energy_level: string | null;
  dog_friendly: boolean;
  cat_friendly: boolean;
  kid_friendly: boolean;
  leash_trained: boolean;
  crate_trained: boolean;
  house_trained: boolean;
  fully_vaccinated: boolean;
  activities: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Defines the allowed data structure for updating a user profile.
 * Excludes non-updatable fields like 'id' and 'email'.
 */
export type UpdatableProfileData = Partial<Omit<UserProfile, 'id' | 'email'>>;

// #endregion Interfaces

// #region Hooks

// Fetch user profile
export const useUserProfile = () => {
  const { user } = useUser();
  const supabase = createClient();

  return useQuery<UserProfile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to fetch profile');
      }

      return data as UserProfile | null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch user's dogs
export const useUserDogs = () => {
  const { user } = useUser();
  const supabase = createClient();

  return useQuery<UserDog[], Error>({
    queryKey: ['dogs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch dogs');
      }

      return (data as UserDog[]) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update user profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const supabase = createClient();

  // Type parameters:
  // 1. Updated data structure (UserProfile)
  // 2. Error type (Error)
  // 3. Variables/Payload type (UpdatableProfileData)
  return useMutation<UserProfile, Error, UpdatableProfileData>({
    mutationFn: async (profileData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update profile');
      }

      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
};

// #endregion Hooks
