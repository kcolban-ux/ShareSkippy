# Location Filters for Community Page

## Overview

This project adds location-based filtering to the Community page, allowing users to filter availability posts by geographic proximity. Users can either share their current location (showing posts within 10 miles) or enter a zip code or city name (showing posts within 1 mile of that location). This enhancement improves the user experience by helping users find relevant posts in their local area or areas they're interested in.

### Goals

- Add location filter UI component to community page with two options: share location button and zip code/city input field
- Implement geocoding functionality to convert zip codes and city names to coordinates using the existing Nominatim API pattern
- Filter availability posts (both dog availability and PetPal availability) based on location proximity using the existing distance calculation utility
- Show posts within 10 miles when user shares their current location
- Show posts within 1 mile when user enters a zip code or city name
- Maintain existing functionality when no location filter is applied
- Use existing distance calculation utility (`libs/distance.js`) and geocoding patterns from the codebase

### Constraints

- Must work within the existing Next.js/React application architecture
- Must use existing Supabase client patterns for data fetching
- Must follow existing UI/UX patterns and styling (Tailwind CSS, existing component structure)
- Must reuse existing distance calculation function (`calculateDistance` from `libs/distance.js`)
- Must use existing geocoding API pattern (Nominatim/OpenStreetMap) already used in `share-availability/page.js` and `profile/edit/page.js`
- Must handle location permissions gracefully with appropriate error messages
- Must work for both logged-in and logged-out users
- Must not break existing functionality when location filters are not used
- Must filter both dog availability posts and PetPal availability posts
- Location filtering should be optional - users should be able to view all posts if they don't apply a filter
- Must use existing database schema fields (`display_lat`, `display_lng`, `custom_location_lat`, `custom_location_lng`) from the `availability` table

### Non-Goals

- We will not add location-based filtering to the profiles list component (only to availability posts)
- We will not persist location filter preferences across page reloads (user must re-apply filters)
- We will not implement a map view or visual location display
- We will not add distance display to individual posts (only filter by distance)
- We will not implement location-based sorting (posts remain sorted by `created_at`)
- We will not add radius customization options beyond the two fixed distances (10 miles for shared location, 1 mile for zip/city)

## Preparation

### Information Gathering

- **Existing Distance Calculation**: The codebase has a `calculateDistance` function in `libs/distance.js` that uses the Haversine formula to calculate distance between two geographic coordinates in miles
- **Geocoding Pattern**: The codebase uses Nominatim (OpenStreetMap) API for geocoding, as seen in `share-availability/page.js` and `profile/edit/page.js`. This is a free API that doesn't require an API key
- **Location Storage**: Availability posts store location in two ways:
  - `display_lat`/`display_lng`: Used when `use_profile_location` is true (from owner's profile)
  - `custom_location_lat`/`custom_location_lng`: Used when `use_profile_location` is false (custom address)
- **Current Filtering**: The `fetchAvailabilityData` function in `community/page.js` currently fetches all active posts without location filtering
- **Browser Geolocation**: The browser's `navigator.geolocation` API can be used to get user's current location with permission

### Design Decisions

1. **Location Filter UI Component**: Create a new component (`LocationFilter.js`) that provides:
   - A "Share Location" button that requests browser geolocation permission
   - An input field for zip code or city name
   - A clear/remove filter button
   - Visual indication of active filter status

2. **Geocoding Function**: Create a utility function to geocode zip codes and city names using the existing Nominatim API pattern

3. **Filtering Logic**: Modify `fetchAvailabilityData` to:
   - Accept optional location filter parameters (latitude, longitude, radius in miles)
   - Fetch all posts as before
   - Filter posts client-side by calculating distance to each post's location (using either `display_lat`/`display_lng` or `custom_location_lat`/`custom_location_lng`)
   - Return only posts within the specified radius

4. **State Management**: Add state to `community/page.js` for:
   - Current filter type ('none', 'shared-location', 'zip-city')
   - Filter coordinates (lat, lng)
   - Filter radius (10 miles for shared location, 1 mile for zip/city)
   - Loading state for geocoding/geolocation

5. **User Experience**: 
   - Show loading state while getting location or geocoding
   - Display clear error messages if location permission is denied or geocoding fails
   - Show count of filtered posts vs total posts
   - Allow users to clear the filter to see all posts again

### Architecture

- **Component Structure**: Create `components/LocationFilter.js` as a reusable component
- **Utility Functions**: Add geocoding utility to `libs/utils.js` or create `libs/geocoding.js`
- **Integration**: Add location filter component above the availability posts grid in the community page
- **Filter Application**: Apply filtering after fetching posts but before displaying them

## Implementation Log

### Phase 1: Create Location Filter UI Component and Geocoding Utility

**Coding Tasks:**
- [ ] Create `components/LocationFilter.js` component with:
  - State management for filter type and values
  - "Share Location" button with geolocation API integration
  - Zip code/city input field with validation
  - Clear filter button
  - Loading and error states
  - Proper styling matching existing UI patterns
- [ ] Create `libs/geocoding.js` utility with:
  - Function to geocode zip code or city name using Nominatim API
  - Error handling for geocoding failures
  - Returns coordinates (lat, lng) or null on error
- [ ] Add geocoding function that handles both zip codes and city names
- [ ] Test geocoding utility with various inputs (zip codes, city names)

**QA Task:**
- **For kaia:** Test the LocationFilter component:
  - Click "Share Location" button and verify it requests permission and gets coordinates
  - Enter various zip codes (e.g., 78701, 90210) and verify geocoding works
  - Enter city names (e.g., "Austin, TX", "New York") and verify geocoding works
  - Test error handling with invalid inputs
  - Verify clear filter button works

### Phase 2: Integrate Location Filtering into Community Page

**Coding Tasks:**
- [ ] Add location filter state to `community/page.js`:
  - Filter type ('none', 'shared-location', 'zip-city')
  - Filter coordinates (lat, lng)
  - Filter radius (10 or 1 miles)
  - Loading states for geolocation and geocoding
- [ ] Integrate `LocationFilter` component into community page above the availability posts sections
- [ ] Modify `fetchAvailabilityData` function to accept location filter parameters
- [ ] Add post-filtering logic that:
  - Fetches all posts as before
  - Calculates distance from filter location to each post's location (using `display_lat`/`display_lng` or `custom_location_lat`/`custom_location_lng`)
  - Filters posts to only those within the specified radius
  - Handles posts that may not have location data (include or exclude based on requirement)
- [ ] Update both dog availability and PetPal availability post filtering
- [ ] Add visual indication showing how many posts are shown vs total (when filter is active)
- [ ] Ensure filter persists when switching between tabs (dog availability, PetPal availability, my availability)

**QA Task:**
- **For kaia:** Test location filtering functionality:
  - Share location and verify only posts within 10 miles are shown
  - Enter a zip code and verify only posts within 1 mile are shown
  - Enter a city name and verify only posts within 1 mile are shown
  - Clear filter and verify all posts are shown again
  - Switch between tabs and verify filter state persists
  - Test with posts that have custom locations vs profile locations
  - Verify posts without location data are handled appropriately
  - Test edge cases: no posts in radius, invalid locations, etc.

