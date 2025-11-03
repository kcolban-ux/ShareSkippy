# Investigation: Zip Code Filter Not Working

## Problem Statement
- Share location works (10 mile radius)
- Zip code search shows "no availability posts yet" (1 mile radius)
- Suspected issue: zip code geocoding not matching OSM coordinates or how locations are saved

## Root Cause Analysis

### Issue 1: Missing Owner Location Fields in Query
**Problem**: When fetching posts, the owner profile selection does NOT include `display_lat` and `display_lng`:

```javascript
owner:profiles!availability_owner_id_fkey (
  id,
  first_name,
  last_name,
  profile_photo_url,
  neighborhood,
  city
  // ❌ Missing: display_lat, display_lng
)
```

**Impact**: When `use_profile_location=true`, the filtering function tries:
```javascript
postLat = post.owner?.display_lat || post.display_lat;
```

But `post.owner.display_lat` is undefined, so it falls back to `post.display_lat` from the availability table.

### Issue 2: Availability Table Location Fields
From `share-availability/page.js`, when creating a post:
- If `use_profile_location=true`: sets `display_lat: userProfile?.display_lat` in availability table
- If `use_profile_location=false`: sets `display_lat: formData.custom_location_lat` in availability table

So the availability table SHOULD have `display_lat`/`display_lng` populated via the `*` selector.

### Issue 3: Potential Coordinate Precision/Format Issues
Nominatim might return coordinates with different precision than stored coordinates, or there could be formatting differences.

### Issue 4: 1 Mile Radius Too Small?
1 mile radius is very small - if geocoded coordinates are slightly off from stored coordinates, posts might be filtered out even if they're close.

## Potential Solutions

### Solution 1: Add Owner Location Fields to Query (Quick Fix)
**Pros**: 
- Fast to implement
- Ensures we have owner coordinates when needed
- Minimal code changes

**Cons**:
- Adds extra data to query (slight performance impact)
- Still relies on availability table having correct coordinates

**Implementation**: Add `display_lat, display_lng` to owner profile selection in both queries

### Solution 2: Use Availability Table Fields Only (Simpler)
**Pros**:
- Simpler logic - always use availability table's `display_lat`/`display_lng`
- No need to fetch owner location
- Faster queries (less data)

**Cons**:
- Assumes availability table always has correct coordinates
- Doesn't work if availability table coordinates are missing

**Implementation**: Update filtering to always use `post.display_lat`/`post.display_lng` first, then fall back to custom_location_lat/lng

### Solution 3: Increase Zip Code Radius (Quick Fix)
**Pros**:
- Very fast to implement
- Accounts for geocoding inaccuracies
- Simple one-line change

**Cons**:
- Not fixing root cause
- Might show posts further than intended
- User expectation might be 1 mile

**Implementation**: Change radius from 1 to 2-3 miles for zip code searches

### Solution 4: Improve Geocoding Query Format (Better Geocoding)
**Pros**:
- More accurate geocoding results
- Better matching with stored locations
- Handles zip codes and cities better

**Cons**:
- Requires Nominatim API knowledge
- Might need different query formats for zip vs city

**Implementation**: 
- For zip codes: Use `postcode` parameter or add country/US
- For cities: Include state if available
- Add country code to improve US-specific results

### Solution 5: Add Debugging/Validation (Diagnostic)
**Pros**:
- Helps identify exact issue
- Can see what coordinates are being compared
- Useful for future debugging

**Cons**:
- Doesn't fix the issue directly
- Adds console logging (should be removed later)

**Implementation**: Add console.log to show:
- Geocoded coordinates
- Post coordinates
- Calculated distances
- Filtering results

## Recommended Solution: Hybrid Approach

**Phase 1: Quick Fix (Solution 1 + 3)**
1. Add `display_lat, display_lng` to owner profile selection
2. Increase zip code radius to 2 miles (accounts for geocoding inaccuracies)
3. Add basic debugging to verify coordinates are being fetched

**Phase 2: Better Geocoding (Solution 4)**
1. Improve geocoding query format for zip codes
2. Add country code (US) for better accuracy
3. Handle zip codes specifically (postcode parameter)

**Phase 3: Simplify Logic (Solution 2)**
1. Update filtering to prioritize availability table fields
2. Remove dependency on owner location fields
3. Ensure availability table always has correct coordinates

## Performance Considerations

- **Solution 1**: Adds ~2 fields per post (minimal impact)
- **Solution 2**: Simplifies queries (positive impact)
- **Solution 3**: No performance impact
- **Solution 4**: Might add slight delay to geocoding (one-time per search)
- **Solution 5**: No performance impact (debugging only)

## Testing Plan

1. Test with posts that have `use_profile_location=true`
2. Test with posts that have `use_profile_location=false`
3. Test with various zip codes (78701, 90210, 10001)
4. Test with city names (Austin, TX vs Austin)
5. Verify coordinates are being fetched correctly
6. Verify distances are calculated correctly
7. Check console for any errors

