# Traceroute API Error Fix

## Error

```
TypeError: Cannot read properties of undefined (reading 'traceroutes')
at loadTraceroutes (NetworkInsightsPage.tsx:204:1)
```

## Root Cause

The API response structure is not what the frontend expects. Either:
1. The backend hasn't been restarted after adding the new endpoint
2. The API is returning an error (500)
3. The response format is different than expected

## Solution

### Step 1: Restart Backend

The new `/api/links/traceroutes` endpoint was added but the backend needs to be restarted:

```bash
docker-compose restart backend
```

Or rebuild if needed:

```bash
docker-compose up -d --build backend
```

### Step 2: Verify Backend is Running

Check backend logs for errors:

```bash
docker-compose logs backend | tail -50
```

Look for:
- Startup errors
- Route registration errors
- Database connection errors

### Step 3: Test API Endpoint

Test the endpoint directly:

```bash
./scripts/test-traceroutes-api.sh
```

Or manually:

```bash
curl "http://localhost:3001/api/links/traceroutes?limit=5"
```

Expected response:
```json
{
  "traceroutes": [...],
  "count": 0,
  "filters": {
    "maxAgeHours": 24,
    "limit": 5
  }
}
```

### Step 4: Check Frontend Error Handling

The frontend has been updated with better error handling:

```typescript
if (response && response.data) {
  const tracerouteData = response.data.traceroutes || [];
  setTraceroutes(tracerouteData);
} else {
  console.warn('No data in response:', response);
  setTraceroutes([]);
}
```

## Verification Steps

### 1. Check Backend Logs

```bash
docker-compose logs -f backend | grep -i traceroute
```

Should see:
```
[App] debug: Fetching TRACEROUTE_APP messages since 2026-02-01T...
[App] debug: Found X TRACEROUTE_APP messages, Y with valid paths
[App] debug: Fetched Y traceroutes
```

### 2. Check Frontend Console

Open browser DevTools console and look for:
```
NetworkInsightsPage: Loading traceroutes...
NetworkInsightsPage: Traceroutes API response: {...}
NetworkInsightsPage: Loaded traceroutes count: X
```

### 3. Check Network Tab

In browser DevTools Network tab:
- Look for request to `/api/links/traceroutes`
- Check response status (should be 200)
- Check response body structure

## Common Issues

### Issue 1: 404 Not Found

**Symptom:** API returns 404

**Cause:** Backend not restarted or route not registered

**Solution:**
```bash
docker-compose restart backend
```

### Issue 2: 500 Internal Server Error

**Symptom:** API returns 500

**Cause:** Database error or code error

**Solution:**
1. Check backend logs for error details
2. Verify database is running
3. Check for syntax errors in code

### Issue 3: Empty Response

**Symptom:** API returns `{}`

**Cause:** Response not being sent properly

**Solution:**
1. Check the return statement in the endpoint
2. Verify the response structure matches expected format

### Issue 4: CORS Error

**Symptom:** Browser console shows CORS error

**Cause:** Frontend and backend on different ports

**Solution:**
- Verify backend CORS configuration
- Check API_URL in frontend config

## Files Changed

### Backend
- `backend/src/routes/links.ts` - New `/traceroutes` endpoint

### Frontend
- `frontend/src/services/api.ts` - New `getTraceroutes()` method
- `frontend/src/pages/NetworkInsightsPage.tsx` - Better error handling

### Scripts
- `scripts/test-traceroutes-api.sh` - API testing script
- `scripts/debug-traceroutes.sh` - Database debugging script

## Quick Fix Commands

```bash
# 1. Restart backend
docker-compose restart backend

# 2. Wait for backend to start (check logs)
docker-compose logs -f backend

# 3. Test API
curl "http://localhost:3001/api/links/traceroutes?limit=5" | jq '.'

# 4. Refresh browser
# Press Ctrl+Shift+R (hard refresh)

# 5. Check console
# Open DevTools and look for logs
```

## Expected Behavior After Fix

1. ✅ Backend starts without errors
2. ✅ API endpoint returns 200 status
3. ✅ Response has correct structure:
   ```json
   {
     "traceroutes": [],
     "count": 0,
     "filters": {...}
   }
   ```
4. ✅ Frontend loads without errors
5. ✅ Traceroutes tab shows data (or "No traceroute data available")

## If Still Not Working

### Check Backend Compilation

```bash
cd backend
npm run build
```

Look for TypeScript errors.

### Check Route Registration

Verify in `backend/src/routes/index.ts`:
```typescript
import { linksRoutes } from './links';
router.use(`${API_VERSION}/links`, linksRoutes);
```

### Check Database Connection

```bash
docker-compose exec postgres psql -U postgres -d meshtastic_mapper -c "SELECT 1;"
```

### Check for Port Conflicts

```bash
lsof -i :3001  # Check if backend port is in use
lsof -i :3000  # Check if frontend port is in use
```

## Debug Output

When the fix is working, you should see:

**Backend logs:**
```
[App] debug: Fetching TRACEROUTE_APP messages since 2026-02-01T10:00:00.000Z
[App] debug: Found 5 TRACEROUTE_APP messages, 3 with valid paths
[App] debug: Fetched 3 traceroutes
```

**Frontend console:**
```
NetworkInsightsPage: Loading traceroutes...
NetworkInsightsPage: Traceroutes API response: {data: {...}}
NetworkInsightsPage: Traceroutes data: {traceroutes: [...], count: 3}
NetworkInsightsPage: Loaded traceroutes count: 3
```

**API response:**
```json
{
  "traceroutes": [
    {
      "id": "...",
      "timestamp": "2026-02-02T10:30:00.000Z",
      "fromNode": {...},
      "toNode": {...},
      "routingPath": ["!node1", "!node2"],
      "hopCount": 2,
      "hops": [...]
    }
  ],
  "count": 1
}
```
