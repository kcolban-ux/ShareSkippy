import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { createClient } from '@/libs/supabase/client';

// Fetch user profile
export const useUserProfile = () => {
  const { user } = useUser();
  const supabase = createClient();
  
  return useQuery({
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
      
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch user's dogs
export const useUserDogs = () => {
  const { user } = useUser();
  const supabase = createClient();
  
  return useQuery({
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
      
      return data || [];
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
  
  return useMutation({
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
      
      return data;
    },
    onSuccess: () => {
      // Invalidate profile data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
};
