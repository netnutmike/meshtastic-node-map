# Mobile Usage Guide

## Overview

The Meshtastic Node Mapper is fully optimized for mobile devices, providing a responsive interface that adapts to phones and tablets. This guide covers mobile-specific features, gestures, and best practices for using the application on mobile devices.

## Mobile-Optimized Interface

### Responsive Layout

The application automatically adapts to your device:

**Phone (< 768px):**
- Single-column layout
- Bottom sheet navigation
- Collapsible panels
- Touch-optimized controls
- Larger tap targets (44x44px minimum)

**Tablet (768px - 1024px):**
- Two-column layout where appropriate
- Side panel navigation
- Expanded controls
- Optimized for both portrait and landscape

**Desktop (> 1024px):**
- Full multi-column layout
- Persistent sidebars
- Advanced controls visible
- Maximum information density

### Adaptive Font Sizing

Text automatically scales for readability:

**Mobile (< 768px):**
- Base font: 0.9rem (14.4px)
- Optimized for small screens
- Prevents iOS zoom on input focus

**Tablet (768px - 1200px):**
- Base font: 1rem (16px)
- Standard web sizing
- Comfortable reading

**Desktop (> 1200px):**
- Base font: 1.05rem (16.8px)
- Enhanced readability
- Reduced eye strain

## Touch Gestures

### Map Gestures

**Pan/Scroll:**
- Single finger drag to move map
- Smooth momentum scrolling
- Inertia for natural feel

**Zoom:**
- Pinch to zoom in/out
- Double-tap to zoom in
- Two-finger tap to zoom out
- Zoom buttons always available

**Rotate (if enabled):**
- Two-finger rotate gesture
- Compass button to reset north

**Tilt (if enabled):**
- Two-finger drag up/down
- 3D perspective view

### List Gestures

**Scroll:**
- Single finger drag to scroll
- Momentum scrolling
- Pull-to-refresh (where supported)

**Swipe Actions:**
- Swipe left on node: Quick actions
- Swipe right on node: Details
- Long press: Context menu

### Panel Gestures

**Bottom Sheet (Mobile):**
- Drag handle to expand/collapse
- Swipe down to dismiss
- Tap outside to close

**Side Panel (Tablet):**
- Swipe from edge to open
- Swipe to edge to close
- Tap outside to close

## Mobile Navigation

### Bottom Navigation Bar

On mobile devices, the main navigation moves to the bottom:

**Layout:**
```
┌─────────────────────────┐
│                         │
│      Content Area       │
│                         │
├─────────────────────────┤
│ 🗺️  📋  📊  ⚙️  ☰     │
└─────────────────────────┘
```

**Icons:**
- 🗺️ **Map**: Main map view
- 📋 **Nodes**: Node list
- 📊 **Insights**: Network analytics
- ⚙️ **Settings**: Configuration
- ☰ **More**: Additional options

### Hamburger Menu

Access additional features:

**Menu Items:**
- MQTT Monitor
- Line of Sight
- Gateway Comparison
- Data Export
- About
- Help

### Quick Actions

**Floating Action Button (FAB):**
- Primary action for current page
- Map: Center on location
- Nodes: Add filter
- Insights: Refresh data

## Mobile-Specific Features

### Location Services

**Enable Location:**
1. Browser will prompt for location permission
2. Tap "Allow" to enable GPS features
3. Your location appears as blue dot on map

**Location Features:**
- **Center on Me**: Quickly find your position
- **Distance to Nodes**: See how far away nodes are
- **Nearby Nodes**: Filter nodes by proximity
- **Track Movement**: Record your path (optional)

**Privacy:**
- Location data stays on your device
- Not sent to server unless you explicitly share
- Can be disabled anytime in settings

### Offline Mode

Use the application without internet:

**Enabling Offline Mode:**
1. Go to Settings → Offline Mode
2. Toggle "Enable Offline Mode"
3. Select data to cache:
   - Map tiles for your area
   - Recent node data (last 24 hours)
   - Message history
4. Tap "Download for Offline Use"
5. Wait for download to complete

**Offline Capabilities:**
- View cached map tiles
- See last known node positions
- Access downloaded message history
- View telemetry data
- Use search and filters

**Limitations:**
- No real-time updates
- Can't send messages
- Limited to cached area
- Data syncs when online

**Storage Usage:**
- Map tiles: ~50-200 MB per region
- Node data: ~1-5 MB
- Messages: ~5-20 MB
- Total: ~60-225 MB typical

### Battery Optimization

**Battery Saver Mode:**
1. Go to Settings → Performance
2. Enable "Battery Saver Mode"
3. Features adjusted:
   - Reduced update frequency
   - Disabled animations
   - Lower map quality
   - Paused background sync

**Manual Optimizations:**
- Reduce screen brightness
- Use dark mode (saves OLED battery)
- Disable location when not needed
- Close unused tabs
- Enable airplane mode + WiFi only

### Data Usage

**Monitor Data Usage:**
- Settings → Data Usage
- View current session usage
- See historical usage
- Set data limits

**Reduce Data Usage:**
1. Enable "Data Saver Mode"
2. Reduces:
   - Map tile quality
   - Update frequency
   - Image loading
   - Background sync

**Typical Usage:**
- Light use: ~5-10 MB/hour
- Moderate use: ~10-20 MB/hour
- Heavy use: ~20-50 MB/hour
- Offline mode: ~0 MB/hour

## Mobile Map Features

### Touch-Friendly Controls

**Larger Tap Targets:**
- All buttons: 44x44px minimum
- Node markers: 24x24px (easy to tap)
- Cluster markers: 30-40px
- Control buttons: 48x48px

**Spacing:**
- Adequate spacing between controls
- No accidental taps
- Easy one-handed use

### Map Controls Position

**Mobile Layout:**
```
┌─────────────────────────┐
│ ⚙️                    🧭 │  Top: Options, Compass
│                         │
│                         │
│         Map             │
│                         │
│                         │
│ 📍                    ➕ │  Bottom: Location, Zoom
│                       ➖ │
└─────────────────────────┘
```

**Control Functions:**
- ⚙️ **Map Options**: Layers, overlays, filters
- 🧭 **Compass**: Reset map rotation
- 📍 **My Location**: Center on GPS position
- ➕ **Zoom In**: Increase zoom level
- ➖ **Zoom Out**: Decrease zoom level

### Node Popups

**Mobile-Optimized Popups:**
- Larger text for readability
- Touch-friendly buttons
- Scrollable content
- Easy to dismiss

**Popup Actions:**
- **View Details**: Full node information
- **Center Map**: Focus on this node
- **Show Neighbors**: Visualize connections
- **Get Directions**: Navigate to node (if location enabled)
- **Share**: Share node link

### Cluster Interaction

**Tap Cluster:**
- Shows node count
- Lists nodes in cluster
- Tap to zoom in
- Or tap node to view directly

**Cluster Sizes:**
- Small (2-10 nodes): 30px
- Medium (11-50 nodes): 36px
- Large (51+ nodes): 42px

## Mobile Tables and Lists

### Responsive Tables

**Mobile Table Optimization:**
- Hide less important columns
- Horizontal scroll for full data
- Sticky action column
- Larger row height (48px minimum)

**Hidden Columns on Mobile:**
- Latitude/Longitude (use map instead)
- Detailed timestamps (show relative time)
- Technical IDs (show in details)
- Less critical metrics

**Always Visible:**
- Node name
- Status indicator
- Primary metric (battery, signal, etc.)
- Actions button

### Card Layout Alternative

For very small screens, tables convert to cards:

```
┌─────────────────────────┐
│ 🟢 NODE01              │
│ TBEAM Router           │
│ Battery: 85% | -65 dBm │
│ [View Details]         │
└─────────────────────────┘
```

**Card Benefits:**
- Better use of vertical space
- More readable on small screens
- Touch-friendly
- Scrollable list

### Pull to Refresh

**Supported Lists:**
- Nodes list
- Messages list
- Telemetry data
- Network insights

**How to Use:**
1. Scroll to top of list
2. Pull down beyond top
3. Release to refresh
4. Wait for update

## Mobile Forms and Inputs

### Input Optimization

**Prevent iOS Zoom:**
- All inputs: 16px minimum font size
- Prevents automatic zoom on focus
- Maintains page layout

**Keyboard Types:**
- Number inputs: Numeric keyboard
- Email inputs: Email keyboard
- URL inputs: URL keyboard
- Search inputs: Search keyboard

### Autocomplete and Pickers

**Node Picker:**
- Touch-friendly dropdown
- Large tap targets
- Search with mobile keyboard
- Recent selections at top

**Date/Time Picker:**
- Native mobile pickers
- Touch-optimized
- Locale-aware
- Easy date selection

**Dropdown Menus:**
- Large touch targets
- Scrollable if many options
- Search/filter capability
- Clear selection button

## Mobile Performance

### Optimizations

**Automatic Adjustments:**
- Reduced animation complexity
- Lower map tile resolution
- Fewer simultaneous updates
- Simplified visualizations

**Manual Performance Settings:**
1. Settings → Performance
2. Adjust:
   - Update interval (default: 60s)
   - Max visible nodes (default: 500)
   - Animation quality (high/medium/low)
   - Map tile quality (high/medium/low)

### Loading States

**Progressive Loading:**
- Critical content loads first
- Images load on demand
- Charts render when visible
- Background data loads last

**Loading Indicators:**
- Skeleton screens for content
- Progress bars for data
- Spinners for actions
- Pull-to-refresh indicator

## Orientation Support

### Portrait Mode

**Optimized For:**
- Browsing node lists
- Reading details
- Viewing charts
- Form input

**Layout:**
- Single column
- Vertical scrolling
- Bottom navigation
- Stacked panels

### Landscape Mode

**Optimized For:**
- Map viewing
- Data visualization
- Comparison views
- Multi-panel layouts

**Layout:**
- Two columns where possible
- Side navigation
- Split panels
- Horizontal scrolling

**Auto-Rotation:**
- Application adapts automatically
- Maintains scroll position
- Preserves state
- Smooth transitions

## Mobile Notifications

### Push Notifications (if enabled)

**Notification Types:**
- New node detected
- Node offline alert
- Low battery warning
- Message received
- Network issue

**Managing Notifications:**
1. Settings → Notifications
2. Toggle notification types
3. Set quiet hours
4. Configure priority

**Notification Actions:**
- Tap to open relevant page
- Swipe to dismiss
- Long press for options

### In-App Notifications

**Toast Messages:**
- Brief notifications
- Auto-dismiss after 3-5 seconds
- Swipe to dismiss
- Non-intrusive

**Banner Notifications:**
- Important alerts
- Require acknowledgment
- Action buttons
- Persistent until dismissed

## Accessibility on Mobile

### Screen Reader Support

**VoiceOver (iOS):**
- All controls labeled
- Logical navigation order
- Descriptive announcements
- Gesture support

**TalkBack (Android):**
- Complete screen reader support
- Touch exploration
- Gesture navigation
- Descriptive labels

### Accessibility Features

**Text Scaling:**
- Respects system text size
- Scales up to 200%
- Maintains layout
- Readable at all sizes

**High Contrast:**
- Respects system settings
- Enhanced contrast mode
- Clear focus indicators
- Visible boundaries

**Reduced Motion:**
- Respects system preference
- Disables animations
- Instant transitions
- Maintains functionality

## Troubleshooting Mobile Issues

### App Not Loading

**Check:**
1. Internet connection active
2. Browser is up to date
3. Sufficient storage space
4. Clear browser cache

**Solution:**
```
Settings → Safari/Chrome → Clear History and Website Data
```

### Map Not Responding

**Check:**
1. Touch gestures enabled
2. JavaScript enabled
3. Sufficient memory available
4. No conflicting gestures

**Solution:**
1. Close other tabs
2. Restart browser
3. Restart device if needed

### Location Not Working

**Check:**
1. Location services enabled (device settings)
2. Browser has location permission
3. GPS signal available
4. Not in airplane mode

**Solution:**
```
iOS: Settings → Privacy → Location Services → Safari → While Using
Android: Settings → Apps → Chrome → Permissions → Location → Allow
```

### Slow Performance

**Check:**
1. Device storage not full
2. Background apps closed
3. Battery saver not limiting performance
4. Network connection stable

**Solutions:**
1. Enable Battery Saver Mode in app
2. Reduce update frequency
3. Disable animations
4. Clear cached data

### Touch Not Registering

**Check:**
1. Screen protector not interfering
2. Screen is clean
3. Touch sensitivity settings
4. No water on screen

**Solution:**
1. Remove screen protector temporarily
2. Clean screen
3. Adjust touch sensitivity in device settings

## Best Practices for Mobile

### Daily Use

1. **Enable Auto-Lock**: Prevent accidental touches
2. **Use Dark Mode**: Save battery on OLED screens
3. **Enable Offline Mode**: For areas with poor coverage
4. **Set Data Limits**: Prevent excessive usage
5. **Regular Updates**: Keep app and browser updated

### Field Use

1. **Download Offline Maps**: Before leaving coverage
2. **Enable Location**: For distance calculations
3. **Bring Power Bank**: Extended use drains battery
4. **Use Landscape**: Better for map viewing
5. **Adjust Brightness**: Balance visibility and battery

### Network Monitoring

1. **Use Quick Actions**: Faster than menu navigation
2. **Enable Notifications**: Stay informed of issues
3. **Bookmark Favorites**: Quick access to important nodes
4. **Use Filters**: Reduce clutter on small screen
5. **Share Links**: Collaborate with team

## Mobile-Specific Shortcuts

### Gestures

- **Double-tap status bar**: Scroll to top
- **Swipe from left edge**: Back navigation
- **Swipe from right edge**: Forward navigation
- **Long press link**: Preview/copy link
- **3D Touch** (iOS): Quick actions

### Quick Actions

**Home Screen (if installed as PWA):**
- View Map
- Check Nodes
- MQTT Monitor
- Settings

## Progressive Web App (PWA)

### Installing as App

**iOS (Safari):**
1. Tap Share button
2. Tap "Add to Home Screen"
3. Name the app
4. Tap "Add"

**Android (Chrome):**
1. Tap menu (⋮)
2. Tap "Add to Home Screen"
3. Name the app
4. Tap "Add"

### PWA Benefits

**Advantages:**
- App-like experience
- Faster loading
- Offline capability
- Home screen icon
- Full-screen mode
- Push notifications

**Features:**
- Works offline
- Background sync
- Install prompts
- App-like navigation
- Native feel

## Related Features

- [Theme Customization](theme-customization.md) - Mobile theme support
- [Offline Mode](offline-mode.md) - Detailed offline guide
- [Location Services](location-services.md) - GPS features
- [Performance Optimization](performance.md) - Speed improvements
- [Implementation Guide](../implementation/RESPONSIVE_LAYOUT_IMPLEMENTATION.md) - Technical implementation details

## Further Reading

- [Responsive Layout Implementation](../implementation/RESPONSIVE_LAYOUT_IMPLEMENTATION.md) - Technical details
- [Mobile Testing Guide](../developer/mobile-testing.md) - For developers
- [Accessibility Guide](accessibility.md) - Accessibility features
- [Troubleshooting Guide](../troubleshooting.md) - Common issues

---

**Need Help?** Check the [Troubleshooting Guide](../troubleshooting.md) or ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions).
