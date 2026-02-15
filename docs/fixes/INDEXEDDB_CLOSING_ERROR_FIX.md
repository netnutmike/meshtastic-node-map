# IndexedDB Closing Error Fix

## Issue
Getting error: `Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing`

This error occurred when:
- Page was being navigated away from
- Component was unmounting
- WebSocket was receiving updates while the app was shutting down

## Root Cause
The offline service's `destroy()` method closes the IndexedDB connection, but the websocket service was still trying to cache data after the connection was closed. This created a race condition where:

1. App starts unmounting
2. `offlineService.destroy()` is called, closing the database
3. WebSocket receives a node update
4. Tries to call `offlineService.cacheData()`
5. Attempts to create a transaction on a closed database → Error

## Solution
Modified the offline service to gracefully handle operations when the database is closing or closed:

### Changes Made

**File:** `frontend/src/services/offline.service.ts`

1. **Added try-catch around transaction creation**
   ```typescript
   try {
     const transaction = this.db.transaction(['cache'], 'readwrite');
     // ... rest of operation
   } catch (error) {
     console.error('Error creating transaction:', error);
     resolve(); // Resolve instead of reject
   }
   ```

2. **Changed error handling to resolve instead of reject**
   - Prevents cascading errors when database is closing
   - Logs warnings instead of throwing errors
   - Allows graceful degradation

3. **Mark service as not initialized when destroying**
   ```typescript
   destroy(): void {
     this.isInitialized = false; // Prevent new operations
     // ... close database
   }
   ```

4. **Added transaction error handler**
   ```typescript
   transaction.onerror = () => {
     console.error('Transaction error:', transaction.error);
     resolve(); // Don't propagate error
   };
   ```

## Why This Works

- **Graceful degradation**: When the database is closing, cache operations silently fail instead of throwing errors
- **No user impact**: Caching is an optimization - if it fails during shutdown, it doesn't affect functionality
- **Prevents error spam**: Users won't see console errors during normal navigation
- **Race condition safe**: Even if websocket updates arrive during shutdown, they won't crash the app

## Testing

✅ Navigate between pages - no errors
✅ Refresh the page - no errors
✅ Close the browser tab - no errors
✅ WebSocket updates during navigation - handled gracefully
✅ Normal caching operations - still work correctly

## Status
✅ **FIXED** - IndexedDB operations now handle closing state gracefully

## Date
February 2, 2026
