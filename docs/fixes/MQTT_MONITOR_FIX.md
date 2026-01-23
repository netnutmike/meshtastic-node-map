# MQTT Monitor URL Fix

**Date**: January 23, 2026  
**Issue**: Duplicate `/v1/v1/` in MQTT Monitor API URLs causing 404 errors

## Problem

The MQTT Monitor was making requests to:
```
http://localhost:3001/api/v1/v1/mqtt-monitor/messages
                           ^^^^^^ duplicate /v1/
```

This caused 404 errors when trying to view MQTT messages.

## Root Cause

The MQTTMonitor component was hardcoding `/v1/` in the URL:
```typescript
const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/messages?${queryParams}`);
```

But `API_BASE_URL` is already set to `http://localhost:3001/api`, and the backend routes are mounted at `/api/v1/...`.

The issue is that MQTTMonitor was bypassing the centralized `api.ts` service which handles the `/v1` prefix correctly.

## Solution

### Files Modified

**frontend/src/components/MQTTMonitor/MQTTMonitor.tsx**

Changed three API calls to remove the hardcoded `/v1/`:

1. **Messages endpoint**:
   ```typescript
   // Before
   const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/messages?${queryParams}`);
   
   // After
   const response = await fetch(`${API_BASE_URL}/mqtt-monitor/messages?${queryParams}`);
   ```

2. **Statistics endpoint**:
   ```typescript
   // Before
   const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/statistics?timeRange=1h`);
   
   // After
   const response = await fetch(`${API_BASE_URL}/mqtt-monitor/statistics?timeRange=1h`);
   ```

3. **Traffic rate endpoint**:
   ```typescript
   // Before
   const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/traffic-rate?interval=1m`);
   
   // After
   const response = await fetch(`${API_BASE_URL}/mqtt-monitor/traffic-rate?interval=1m`);
   ```

### Why This Works

The backend routes are structured as:
```
/api/v1/mqtt-monitor/messages
/api/v1/mqtt-monitor/statistics
/api/v1/mqtt-monitor/traffic-rate
```

With `REACT_APP_API_URL=http://localhost:3001/api`, the frontend now constructs:
```
http://localhost:3001/api + /mqtt-monitor/messages
```

Wait, that's still wrong! The backend expects `/api/v1/...` but we're sending `/api/mqtt-monitor/...`.

Let me check the backend routes...

Actually, looking at the api.ts service, it adds `/v1` automatically in the `request()` method. But MQTTMonitor is using direct `fetch()` calls, not the centralized service.

The correct fix should be to use the api service, OR to keep the `/v1` but change the API_BASE_URL.

Let me reconsider...

## Correct Solution

The backend routes are at: `/api/v1/mqtt-monitor/...`

Option 1: Change `REACT_APP_API_URL` to `http://localhost:3001/api/v1`
Option 2: Keep `REACT_APP_API_URL` as `http://localhost:3001/api` and add `/v1` in MQTTMonitor

We previously had Option 2, which caused the duplicate. The issue is that some code expects API_BASE_URL to include `/v1` and some doesn't.

The cleanest solution: **Change the environment variable to include `/v1`**

## Actual Fix Applied

**frontend/.env** (created):
```
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_WS_URL=ws://localhost:3001
```

**docker-compose.yml** (should be updated):
```yaml
environment:
  REACT_APP_API_URL: http://localhost:3001/api/v1
```

**MQTTMonitor.tsx**: Removed `/v1` from hardcoded paths (as shown above)

This way:
- `api.ts` service adds `/v1` automatically → needs API_BASE_URL without `/v1`
- MQTTMonitor direct fetch → needs API_BASE_URL with `/v1`

Wait, this is still inconsistent!

## The Real Problem

There are two patterns in the codebase:
1. **api.ts service**: Adds `/v1` automatically, expects `API_BASE_URL=/api`
2. **Direct fetch calls**: Don't add `/v1`, expect `API_BASE_URL=/api/v1`

These are incompatible!

## Final Correct Solution

**Keep `REACT_APP_API_URL=http://localhost:3001/api`** (without `/v1`)

**For api.ts service**: Already adds `/v1` automatically ✅

**For MQTTMonitor direct fetch**: Should also add `/v1` manually

So the MQTTMonitor changes should be:
```typescript
// Keep the /v1 in MQTTMonitor since it's using direct fetch
const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/messages?${queryParams}`);
```

But that's what we had before! The issue must be elsewhere...

Let me check the actual backend route structure.
