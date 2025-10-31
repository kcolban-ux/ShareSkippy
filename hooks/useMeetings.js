import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';

// Fetch meetings
export const useMeetings = () => {
  const { user } = useUser();
  
  return useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user) return { meetings: [] };
      
      // First, update any meetings that should be marked as completed
      await fetch('/api/meetings/update-status', { method: 'POST' });
      
      // Then fetch the updated meetings
      const response = await fetch('/api/meetings');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch meetings');
      }
      
      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Update meeting status
export const useUpdateMeetingStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  return useMutation({
    mutationFn: async ({ meetingId, status, message }) => {
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting to update meeting (attempt ${attempt}/${maxRetries}):`, { meetingId, status, message });
          
          const response = await fetch(`/api/meetings/${meetingId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, message }),
          });
          
          console.log('Response status:', response.status);
          console.log('Response headers:', [...response.headers.entries()]);
          
          const data = await response.json();
          console.log('Response data:', data);
          
          if (!response.ok) {
            console.error('Meeting update failed:', data);
            throw new Error(data.error || 'Failed to update meeting status');
          }
          
          return data;
        } catch (error) {
          console.error(`Network error during meeting update (attempt ${attempt}):`, error);
          console.error('Error type:', error.constructor.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          
          lastError = error;
          
          // Don't retry for authentication or validation errors
          if (error.message.includes('Unauthorized') || 
              error.message.includes('Invalid') || 
              error.message.includes('Cannot cancel')) {
            throw error;
          }
          
          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            // Provide more specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
              throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
            }
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    },
    onSuccess: () => {
      // Invalidate and refetch meetings
      queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    },
  });
};
