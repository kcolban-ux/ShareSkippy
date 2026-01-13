-- Comprehensive User Profiles Query
-- This query shows all user profiles with all their text/data fields

SELECT 
  -- Basic Info
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.role,
  
  -- Emergency Contact
  p.emergency_contact_name,
  p.emergency_contact_number,
  p.emergency_contact_email,
  
  -- Profile Content
  p.bio,
  p.profile_photo_url,
  
  -- Social Links
  p.facebook_url,
  p.instagram_url,
  p.linkedin_url,
  p.airbnb_url,
  p.other_social_url,
  
  -- Community Support
  p.community_support_badge,
  p.support_preferences,
  p.support_story,
  p.other_support_description,
  
  -- Location
  p.neighborhood,
  p.city,
  p.street_address,
  p.state,
  p.zip_code,
  p.display_lat,
  p.display_lng,
  
  -- Timestamps
  p.created_at,
  p.updated_at,
  
  -- Additional Info
  CASE 
    WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
    THEN p.first_name || ' ' || p.last_name
    ELSE p.email
  END as display_name,
  
  -- Count related data
  (SELECT COUNT(*) FROM dogs d WHERE d.owner_id = p.id) as dog_count,
  (SELECT COUNT(*) FROM availability a WHERE a.owner_id = p.id) as availability_posts,
  (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = p.id) as review_count,
  (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.reviewee_id = p.id) as average_rating

FROM profiles p
ORDER BY p.created_at DESC;

