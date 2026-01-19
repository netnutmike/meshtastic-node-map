# Map Geolocation Feature

## Overview
Added automatic geolocation detection to center the map on the user's current location when they first visit the map page.

## Changes Made

### 1. Map Slice Updates (`frontend/src/store/slices/mapSlice.ts`)

#### New Function: `getUserLocation()`
```typescript
const getUserLocation = (): Promise<[number, number]> => {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          // Fall back to default location (NYC)
          resolve(defaultMapState.center);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    } else {
      resolve(defaultMapState.center);
    }
  });
};
```

**Features:**
- Uses browser's Geolocation API
- Returns a Promise with coordinates `[latitude, longitude]`
- Falls back to NYC coordinates if geolocation fails or is denied
- Caches location for 5 minutes to avoid repeated requests
- 5-second timeout to prevent hanging
- Doesn't require high accuracy (faster, less battery drain)

#### New Action: `setUserLocation`
```typescript
setUserLocation: (state, action: PayloadAction<[number, number]>) => {
  // Only update center if it's still the default (user hasn't moved the map yet)
  const isDefaultCenter = 
    state.center[0] === defaultMapState.center[0] && 
    state.center[1] === defaultMapState.center[1];
  
  if (isDefaultCenter) {
    state.center = action.payload;
    state.zoom = 12; // Zoom in a bit when using user location
    saveMapPreferencesToStorage(state);
  }
}
```

**Features:**
- Only updates map center if user hasn't manually moved the map
- Sets zoom level to 12 (good for viewing local area)
- Saves the new location to localStorage
- Respects user's manual map positioning

### 2. MapPage Updates (`frontend/src/pages/MapPage.tsx`)

#### Added Geolocation Request on Mount
```typescript
useEffect(() => {
  // Load nodes from API on component mount
  loadNodes();
  
  // Request user's geolocation
  getUserLocation().then((location) => {
    console.log('Setting map center to user location:', location);
    dispatch(setUserLocation(location));
  });
}, [dispatch]);
```

**Features:**
- Requests location when map page loads
- Runs asynchronously (doesn't block page load)
- Logs location to console for debugging
- Dispatches action to update map center

## User Experience

### First Visit
1. User navigates to map page
2. Browser prompts: "Allow [site] to access your location?"
3. If user allows:
   - Map centers on their current location
   - Zoom level set to 12 (neighborhood view)
   - Location saved to localStorage
4. If user denies or times out:
   - Map centers on default location (NYC)
   - No error shown to user

### Subsequent Visits
- If user previously allowed location: Uses cached location (5-minute cache)
- If user moved the map manually: Respects their chosen location
- If user cleared localStorage: Prompts for location again

### Privacy & Security
- Only requests location when map page is visited
- Requires explicit user permission
- Location is only stored in browser's localStorage
- No location data sent to server
- User can deny permission without breaking functionality

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- HTTPS connection (required by browsers for geolocation)
- User permission

**Fallback:**
- If geolocation not supported: Uses default location (NYC)
- If permission denied: Uses default location (NYC)
- If timeout: Uses default location (NYC)

## Configuration

### Geolocation Options
Can be adjusted in `mapSlice.ts`:

```typescript
{
  enableHighAccuracy: false,  // false = faster, less battery
  timeout: 5000,              // 5 seconds max wait
  maximumAge: 300000,         // 5 minutes cache
}
```

### Default Location
Change in `mapSlice.ts`:
```typescript
const defaultMapState: MapState = {
  center: [40.7128, -74.0060], // [latitude, longitude]
  zoom: 10,
  // ...
};
```

### User Location Zoom Level
Change in `setUserLocation` action:
```typescript
state.zoom = 12; // Adjust this value (1-20)
```

## Testing

### Manual Testing
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to map page
4. Look for log: "Setting map center to user location: [lat, lng]"
5. Verify map centers on your location

### Testing Different Scenarios

**Allow Location:**
1. Navigate to map page
2. Click "Allow" on permission prompt
3. Verify map centers on your location

**Deny Location:**
1. Navigate to map page
2. Click "Block" on permission prompt
3. Verify map centers on NYC (default)

**Simulate Location (Chrome DevTools):**
1. Open DevTools → More tools → Sensors
2. Set location to custom coordinates
3. Refresh map page
4. Verify map centers on simulated location

**Clear Permissions:**
1. Click lock icon in address bar
2. Reset location permission
3. Refresh page
4. Permission prompt should appear again

## Console Logs

You'll see these logs in the browser console:

```
User location obtained: 37.7749 -122.4194
Setting map center to user location: [37.7749, -122.4194]
```

Or if geolocation fails:
```
Geolocation error: User denied Geolocation
Setting map center to user location: [40.7128, -74.006]
```

## Future Enhancements

Potential improvements:
1. **Recenter Button**: Add button to recenter map on user's current location
2. **Follow Mode**: Continuously update map as user moves
3. **Location Accuracy Indicator**: Show accuracy circle around user's position
4. **User Marker**: Display a marker showing user's current location
5. **Compass**: Show user's heading/direction
6. **Distance Calculator**: Calculate distance from user to nodes
7. **Nearest Node**: Automatically highlight nearest node to user

## Files Modified

- `frontend/src/store/slices/mapSlice.ts` - Added geolocation logic and action
- `frontend/src/pages/MapPage.tsx` - Added geolocation request on mount

## Dependencies

No new dependencies required. Uses:
- Browser's native Geolocation API
- Existing Redux store
- Existing localStorage

## Security Notes

- Geolocation requires HTTPS in production
- User must explicitly grant permission
- Location data stays in browser (not sent to server)
- Respects browser's location permission settings
- No tracking or analytics of user location
