import { createClient } from '@/libs/supabase/server';

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('availability')
      .select(
        `
        *,
        owner:profiles!availability_owner_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url,
          neighborhood,
          city,
          bio,
          role,
          community_support_badge,
          support_preferences,
          support_story,
          other_support_description,
          facebook_url,
          instagram_url,
          linkedin_url,
          airbnb_url,
          other_social_url
        ),
        dog:dogs!availability_dog_id_fkey (
          id,
          name,
          breed,
          photo_url,
          size,
          birthday,
          age_years,
          age_months,
          gender,
          neutered,
          temperament,
          energy_level,
          dog_friendly,
          cat_friendly,
          kid_friendly,
          leash_trained,
          crate_trained,
          house_trained,
          fully_vaccinated,
          activities,
          description
        )
      `
      )
      .eq('id', params.id)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching availability:', error);
      return Response.json({ error: 'Availability not found' }, { status: 404 });
    }

    if (!data) {
      return Response.json({ error: 'Availability not found' }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
