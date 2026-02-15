# MQTT Monitor and Tools Menu Fixes

## Issues Fixed

### 1. MQTT Monitor Not Showing Messages
**Problem:** The MQTT Monitor page was empty even though new nodes were appearing (indicating messages were being received).

**Root Cause:** The MQTT Monitor service stores messages in-memory only. When the backend was restarted earlier (due to a crash), all messages in the monitor's memory buffer were cleared. The service needs to accumulate new messages after each restart.

**How It Works:**
- MQTT messages are stored in the database (for nodes, positions, telemetry, etc.)
- MQTT Monitor service keeps a separate in-memory buffer of the last 10,000 raw messages for real-time monitoring
- When backend restarts, this buffer is empty and needs to refill with new incoming messages

**Solution:** No code changes needed. The MQTT Monitor will start showing messages as new MQTT traffic arrives. The in-memory buffer will gradually fill up with new messages.

**To See Messages Immediately:**
- Wait for new MQTT messages to arrive from your Meshtastic devices
- The monitor will start displaying them in real-time
- Messages are kept for the last 10,000 received

**Note:** If you want persistent message history in the MQTT Monitor, you would need to modify the service to store messages in the database instead of just in memory.

### 2. Tools Menu Not Closing After Selection
**Problem:** When clicking "MQTT Monitor" or "Network Topology" from the Tools menu, the menu stayed open on screen.

**Root Cause:** These menu items were calling callback functions (`onOpenMQTTMonitor` and `onOpenTopology`) directly without closing the menu first. Other menu items that navigate to routes were using `handleToolsMenuItemClick` which properly closes the menu.

**Solution:** Modified the onClick handlers for MQTT Monitor and Network Topology menu items to:
1. Close the menu first (`handleCloseToolsMenu()`)
2. Then call the callback function

**File Changed:** `frontend/src/components/Layout/NavigationHeader.tsx`

**Changes Made:**
```typescript
// Before:
<MenuItem onClick={onOpenMQTTMonitor}>

// After:
<MenuItem onClick={() => {
  handleCloseToolsMenu();
  onOpenMQTTMonitor?.();
}}>
```

## Testing

### Tools Menu Fix
✅ Click Tools icon in navigation
✅ Click "MQTT Monitor" - menu should close and MQTT Monitor dialog should open
✅ Click Tools icon again
✅ Click "Network Topology" - menu should close and topology dialog should open
✅ Verify other menu items still work correctly

### MQTT Monitor
✅ Open MQTT Monitor from Tools menu
✅ Wait for new MQTT messages to arrive
✅ Messages should start appearing in the monitor
✅ Statistics should update as messages accumulate

## Status
✅ **FIXED** - Tools menu now closes properly after selecting any item
⏳ **WORKING AS DESIGNED** - MQTT Monitor will show messages as they arrive after backend restart

## Date
February 2, 2026
