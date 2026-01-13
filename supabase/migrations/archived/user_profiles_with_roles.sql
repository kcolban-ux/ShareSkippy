-- User Profiles Query with Role Information
-- This shows all users with their profile type (dog_owner, petpal, etc.)

SELECT 
  -- Basic Info
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,  -- This shows: dog_owner, petpal, or other
  p.phone_number,
  
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
  
  -- Timestamps
  p.created_at,
  p.updated_at,
  
  -- Activity by Role
  CASE 
    WHEN p.role = 'dog_owner' THEN (SELECT COUNT(*) FROM dogs d WHERE d.owner_id = p.id)
    ELSE 0
  END as dogs_registered,
  
  (SELECT COUNT(*) FROM availability a WHERE a.owner_id = p.id) as availability_posts,
  (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = p.id) as review_count,
  (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.reviewee_id = p.id) as average_rating

FROM profiles p
ORDER BY p.role, p.created_at DESC;
