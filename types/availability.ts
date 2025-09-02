export interface AvailabilityPost {
  id: string;
  owner_id: string;
  dog_id?: string;
  post_type: 'dog_available' | 'petpal_available';
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_recurring?: boolean;
  recurring_days?: string[];
  flexibility_level?: string;
  availability_notes?: string;
  special_instructions?: string;
  is_urgent?: boolean;
  urgency_notes?: string;
  display_lat?: number;
  display_lng?: number;
  city_label?: string;
  can_pick_up_drop_off?: boolean;
  preferred_meeting_location?: string;
  status: 'active' | 'inactive' | 'completed';
  community_support_enabled?: boolean;
  support_preferences?: string[];
  flexible_scheduling_needed?: boolean;
  support_story?: string;
  enabled_days?: any[];
  day_schedules?: Record<string, { enabled: boolean; start_time: string; end_time: string }>;
  need_extra_help?: boolean;
  help_reason_elderly?: boolean;
  help_reason_sick?: boolean;
  help_reason_low_income?: boolean;
  help_reason_disability?: boolean;
  help_reason_single_parent?: boolean;
  help_context?: string;
  open_to_helping_others?: boolean;
  can_help_elderly?: boolean;
  can_help_sick?: boolean;
  can_help_low_income?: boolean;
  can_help_disability?: boolean;
  can_help_single_parent?: boolean;
  helping_others_context?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined data
  owner?: {
    id: string;
    name?: string;
    email: string;
    profile_photo_url?: string;
  };
  dog?: {
    id: string;
    name: string;
    breed?: string;
    photo_url?: string;
  };
}
