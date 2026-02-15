# Traceroute Tab Debugging Guide

## Issue

Traceroute messages are visible in the MQTT Monitor but not showing up in the new Traceroutes tab.

## Changes Made to Fix

### 1. Removed Problematic isEmpty Check

**File: `backend/src/routes/links.ts`**

The original query used `isEmpty: false` which may not work reliably with Prisma array fields:

```typescript
// BEFORE (problematic)
where: {
  type: 'TRACEROUTE_APP',
  routingPath: {
    isEmpty: false  // This may not work as expected
  }
}

// AFTER (fixed)
where: {
  type: 'TRACEROUTE_APP'
  // Fetch all and filter in code
}
```

### 2. Added Post-Query Filtering

Filter empty routing paths after fetching from database:

```typescript
const validTraceroutes = traceroutes.filter((t: any) => {
  const path = t.routingPath || [];
  return path.length > 0;
});
```

### 3. Added Debug Logging

Added logging to track what's happening:

```typescript
logger.debug(`Fetching TRACEROUTE_APP messages since ${maxAgeDate.toISOString()}`);
logger.debug(`Found ${traceroutes.length} TRACEROUTE_APP messages, ${validTraceroutes.length} with valid paths`);
```

### 4. Enhanced Frontend Logging

Added detailed console logging in the frontend:

```typescript
console.log('NetworkInsightsPage: Traceroutes API response:', response);
console.log('NetworkInsightsPage: Traceroutes data:', response.data);
console.log('NetworkInsightsPage: Loaded traceroutes count:', tracerouteData.length);
```

### 5. Added Loading State

Added loading indicator to the Traceroutes tab.

## Debugging Steps

### Step 1: Check Database

Run the debug script to see what's in the database:

```bash
./scripts/debug-traceroutes.sh
```

This will show:
1. Total count of TRACEROUTE_APP messages
2. Recent messages (last 24 hours)
3. Messages with non-empty routing paths
4. Sample traceroute details
5. API endpoint response

### Step 2: Check Backend Logs

Watch the backend logs for debug messages:

```bash
docker-compose logs -f backend | grep -i traceroute
```

Look for:
- "Fetching TRACEROUTE_APP messages since..."
- "Found X TRACEROUTE_APP messages, Y with valid paths"
- Any error messages

### Step 3: Check Frontend Console

Open browser DevTools console and look for:
- "NetworkInsightsPage: Loading traceroutes..."
- "NetworkInsightsPage: Traceroutes API response:"
- "NetworkInsightsPage: Loaded traceroutes count:"
- Any error messages

### Step 4: Test API Directly

Test the API endpoint directly:

```bash
curl "http://localhost:3001/api/links/traceroutes?limit=10" | jq '.'
```

Expected response:
```json
{
  "traceroutes": [
    {
      "id": "...",
      "timestamp": "...",
      "fromNode": {...},
      "toNode": {...},
      "routingPath": ["!node1", "!node2", "!node3"],
      "hopCount": 3,
      "hops": [...]
    }
  ],
  "count": 1
}
```

### Step 5: Check Database Directly

Connect to the database and query:

```bash
docker-compose exec postgres psql -U postgres -d meshtastic_mapper
```

```sql
-- Check for TRACEROUTE_APP messages
SELECT COUNT(*) FROM messages WHERE type = 'TRACEROUTE_APP';

-- Check routing paths
SELECT 
    id,
    timestamp,
    "routingPath",
    array_length("routingPath", 1) as path_length
FROM messages 
WHERE type = 'TRACEROUTE_APP'
ORDER BY timestamp DESC
LIMIT 10;
```

## Common Issues

### Issue 1: No TRACEROUTE_APP Messages in Database

**Symptoms:**
- Database query returns 0 rows
- API returns empty array

**Possible Causes:**
- Traceroute messages not being received via MQTT
- Messages not being decoded properly
- Messages being filtered out during processing

**Solution:**
- Check MQTT Monitor to confirm messages are being received
- Check backend logs for decoding errors
- Verify protobuf decoder is handling TRACEROUTE_APP (portnum 70)

### Issue 2: Messages Have Empty Routing Paths

**Symptoms:**
- Database has TRACEROUTE_APP messages
- But `routingPath` array is empty `{}`

**Possible Causes:**
- Traceroute payload not being parsed correctly
- Routing path not included in the message
- Decoding error

**Solution:**
- Check the `content` field of messages to see raw data
- Verify protobuf decoder `parseTraceroute()` function
- Check for decoding errors in logs

### Issue 3: API Returns Data But Frontend Shows Nothing

**Symptoms:**
- API endpoint returns data
- Frontend console shows empty array

**Possible Causes:**
- Frontend not calling API
- API response format mismatch
- State not updating

**Solution:**
- Check browser console for API call
- Verify response structure matches expected format
- Check React state updates

### Issue 4: Prisma isEmpty Check Not Working

**Symptoms:**
- Database has messages with paths
- Query with `isEmpty: false` returns nothing

**Possible Causes:**
- Prisma array filtering not working as expected
- Database array representation issue

**Solution:**
- Remove `isEmpty` check from query (already done)
- Filter in application code instead
- Use `array_length("routingPath", 1) > 0` in raw SQL if needed

## Verification Checklist

After applying fixes, verify:

- [ ] Backend starts without errors
- [ ] API endpoint `/api/links/traceroutes` returns data
- [ ] Frontend loads without errors
- [ ] Traceroutes tab displays data
- [ ] Hop counts are color-coded
- [ ] Path visualization shows chips and arrows
- [ ] Signal quality indicators work
- [ ] Mobile view hides RSSI/SNR columns

## Testing with Sample Data

If you need to test with sample data, you can insert a test traceroute:

```sql
-- Insert a test traceroute message
INSERT INTO messages (
    "fromNodeId",
    "toNodeId",
    type,
    content,
    encrypted,
    "hopLimit",
    "hopStart",
    "wantAck",
    priority,
    channel,
    timestamp,
    "routingPath",
    rssi,
    snr
)
SELECT 
    (SELECT id FROM nodes LIMIT 1),
    (SELECT id FROM nodes OFFSET 1 LIMIT 1),
    'TRACEROUTE_APP',
    '{"route": ["!node1", "!node2", "!node3"], "hopCount": 3}'::jsonb,
    false,
    3,
    3,
    false,
    'DEFAULT',
    0,
    NOW(),
    ARRAY['!node1', '!node2', '!node3'],
    -75,
    8.5
WHERE EXISTS (SELECT 1 FROM nodes LIMIT 2);
```

## Next Steps

If issues persist:

1. **Check MQTT Messages**: Verify traceroute messages are actually being received
2. **Check Protobuf Decoding**: Ensure messages are being decoded correctly
3. **Check Database Schema**: Verify `routingPath` field exists and is correct type
4. **Check API Route**: Ensure route is registered in the main router
5. **Check Frontend API Call**: Verify the API service method is correct

## Files to Check

- `backend/src/routes/links.ts` - API endpoint
- `backend/src/services/protobuf-decoder.service.ts` - Message decoding
- `frontend/src/services/api.ts` - API client
- `frontend/src/pages/NetworkInsightsPage.tsx` - UI component
- `backend/prisma/schema.prisma` - Database schema

## Useful Commands

```bash
# Restart backend to apply changes
docker-compose restart backend

# Watch backend logs
docker-compose logs -f backend

# Test API endpoint
curl "http://localhost:3001/api/links/traceroutes" | jq '.'

# Check database
docker-compose exec postgres psql -U postgres -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages WHERE type = 'TRACEROUTE_APP';"

# Run debug script
./scripts/debug-traceroutes.sh
```
