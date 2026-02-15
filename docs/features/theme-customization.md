# Theme Customization Guide

## Overview

The Meshtastic Node Mapper includes a comprehensive theme system that supports light mode, dark mode, and automatic theme switching based on system preferences. The theme system is fully integrated across all components including maps, charts, and UI elements.

## Theme Modes

### Light Mode

Optimized for daytime use and bright environments:
- Light backgrounds with dark text
- High contrast for outdoor visibility
- Reduced eye strain in bright conditions
- Light map tiles (Carto Light)
- Bright chart colors

### Dark Mode

Optimized for nighttime use and low-light environments:
- Dark backgrounds with light text
- Reduced blue light emission
- Better for night vision preservation
- Dark map tiles (Carto Dark)
- Muted chart colors

### Auto Mode

Automatically switches between light and dark based on:
- System/OS theme preference
- Time of day (if configured)
- Ambient light sensor (on supported devices)
- User's operating system settings

## Changing Themes

### Using the Theme Toggle

1. **Locate the Theme Toggle**: Look for the theme icon in the navigation bar (top right)
2. **Click to Cycle**: Each click cycles through modes:
   - ☀️ Light Mode → 🌙 Dark Mode → ⚪ Auto Mode → ☀️ Light Mode

### Theme Icons

- **☀️ Sun Icon**: Currently in Light Mode
- **🌙 Moon Icon**: Currently in Dark Mode
- **⚪ Circle-Half Icon**: Currently in Auto Mode

### Keyboard Shortcut

Press `T` to quickly toggle between theme modes.

## Theme Persistence

Your theme preference is automatically saved and will be restored when you:
- Refresh the page
- Close and reopen the browser
- Access the application from a different tab
- Return after days or weeks

**Storage Location**: Browser's localStorage (`malla-theme-preference`)

## Auto Mode Behavior

### How Auto Mode Works

When set to Auto Mode, the application:

1. **Checks System Preference**: Reads your OS theme setting
2. **Applies Matching Theme**: Uses light or dark to match
3. **Monitors Changes**: Watches for system theme changes
4. **Updates Automatically**: Switches theme when system changes

### System Theme Detection

**macOS:**
- System Preferences → General → Appearance
- Light, Dark, or Auto (based on time)

**Windows 10/11:**
- Settings → Personalization → Colors
- Choose your color: Light, Dark, or Custom

**Linux (GNOME):**
- Settings → Appearance
- Style: Light or Dark

**iOS/iPadOS:**
- Settings → Display & Brightness
- Appearance: Light, Dark, or Automatic

**Android:**
- Settings → Display → Dark theme
- Toggle on/off or schedule

### Time-Based Auto Switching

Some operating systems support automatic switching based on time:
- Switches to dark mode at sunset
- Switches to light mode at sunrise
- Uses your location for accurate timing

When your OS does this, Auto Mode in the application will follow along automatically.

## Theme Integration

### Map Tiles

The map automatically switches tile layers based on theme:

**Light Mode:**
- Default: Carto Light
- Alternative: OpenStreetMap
- Satellite: Esri World Imagery

**Dark Mode:**
- Default: Carto Dark
- Alternative: Dark Matter
- Satellite: Esri World Imagery (same)

**Manual Override:**
You can manually select any tile layer regardless of theme in Map Options.

### Charts and Graphs

All charts automatically adapt to the current theme:

**Light Mode Charts:**
- Light backgrounds
- Dark text and labels
- Bright, saturated colors
- High contrast grid lines

**Dark Mode Charts:**
- Dark backgrounds
- Light text and labels
- Muted, desaturated colors
- Subtle grid lines

**Affected Charts:**
- Telemetry graphs (battery, voltage, etc.)
- Network statistics charts
- Dashboard analytics
- Signal quality plots
- Utilization heatmaps

### UI Components

**Buttons and Controls:**
- Background colors adapt to theme
- Border colors adjust for visibility
- Hover states maintain contrast
- Focus indicators remain visible

**Tables and Lists:**
- Row backgrounds alternate appropriately
- Header styling matches theme
- Hover highlights work in both modes
- Selected rows remain distinct

**Modals and Panels:**
- Background colors match theme
- Borders and shadows adjust
- Text remains readable
- Close buttons stay visible

**Forms and Inputs:**
- Input backgrounds contrast with page
- Placeholder text remains subtle
- Focus states are clearly visible
- Validation colors work in both themes

## Mobile Theme Support

### Mobile-Specific Behavior

**Meta Theme Color:**
The application updates the browser's theme color to match:
- Light Mode: Blue (#0d6efd)
- Dark Mode: Dark Gray (#212529)

This affects:
- Browser address bar color (Chrome, Safari)
- System UI elements
- Task switcher appearance
- Status bar color (on some devices)

**Touch-Friendly Controls:**
Theme toggle button maintains 44x44px minimum touch target size on mobile.

### Mobile OS Integration

**iOS/Safari:**
- Respects iOS appearance settings
- Updates status bar color
- Matches system UI theme

**Android/Chrome:**
- Respects Android theme settings
- Updates address bar color
- Matches Material Design theme

## Customizing Theme Colors

### For Administrators

Edit `frontend/src/styles/theme.css` to customize colors:

```css
/* Light Mode Colors */
[data-bs-theme="light"] {
  --bs-body-bg: #ffffff;
  --bs-body-color: #212529;
  --bs-primary: #0d6efd;
  --bs-success: #28a745;
  --bs-warning: #ffc107;
  --bs-danger: #dc3545;
  
  /* Map specific */
  --map-marker-online: #28a745;
  --map-marker-offline: #dc3545;
  --map-marker-disconnected: #0d6efd;
  
  /* Chart specific */
  --chart-grid-color: rgba(0, 0, 0, 0.1);
  --chart-text-color: #212529;
}

/* Dark Mode Colors */
[data-bs-theme="dark"] {
  --bs-body-bg: #212529;
  --bs-body-color: #dee2e6;
  --bs-primary: #0d6efd;
  --bs-success: #28a745;
  --bs-warning: #ffc107;
  --bs-danger: #dc3545;
  
  /* Map specific */
  --map-marker-online: #28a745;
  --map-marker-offline: #dc3545;
  --map-marker-disconnected: #0d6efd;
  
  /* Chart specific */
  --chart-grid-color: rgba(255, 255, 255, 0.1);
  --chart-text-color: #dee2e6;
}
```

### Custom Theme Creation

To create a custom theme:

1. **Copy Theme CSS**: Duplicate the theme.css file
2. **Modify Colors**: Change CSS custom properties
3. **Add Theme Option**: Update theme toggle to include your theme
4. **Test Thoroughly**: Verify all components look correct

### Brand Colors

Maintain your organization's brand colors:

```css
[data-bs-theme="light"],
[data-bs-theme="dark"] {
  --bs-primary: #your-brand-color;
  --bs-primary-rgb: r, g, b;  /* RGB values */
}
```

## Accessibility Considerations

### Contrast Ratios

Both themes maintain WCAG AA compliance:
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio

### Color Blindness Support

Theme colors are chosen to work with common color vision deficiencies:
- Red-green color blindness (deuteranopia, protanopia)
- Blue-yellow color blindness (tritanopia)
- Complete color blindness (achromatopsia)

**Status Indicators:**
- Use shapes in addition to colors
- Provide text labels
- Include icons for clarity

### High Contrast Mode

For users requiring higher contrast:

**Windows High Contrast:**
- Application respects Windows High Contrast settings
- Overrides theme colors when enabled
- Maintains functionality

**Browser Extensions:**
- Compatible with high contrast extensions
- Works with custom stylesheets
- Respects user preferences

## Performance Considerations

### Theme Switching Speed

Theme changes are instant:
- No page reload required
- Smooth transitions (0.3s)
- No flash of unstyled content
- Maintains scroll position

### Resource Usage

**Minimal Overhead:**
- CSS custom properties (no JavaScript for colors)
- Single stylesheet for both themes
- No duplicate resources
- Efficient DOM updates

**Optimizations:**
- Debounced system preference monitoring
- Cached theme preference
- Lazy-loaded theme-specific assets
- Optimized chart re-rendering

## Troubleshooting

### Theme Not Changing

**Check:**
1. JavaScript is enabled in browser
2. localStorage is not blocked
3. Browser supports CSS custom properties
4. No browser extensions interfering

**Solution:**
```javascript
// Clear theme preference and reload
localStorage.removeItem('malla-theme-preference');
location.reload();
```

### Auto Mode Not Working

**Check:**
1. Browser supports `prefers-color-scheme` media query
2. Operating system has theme preference set
3. Browser has permission to access system settings

**Test:**
```javascript
// Check if browser supports auto mode
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
console.log('Supports auto mode:', darkModeQuery.matches !== undefined);
console.log('System prefers dark:', darkModeQuery.matches);
```

### Charts Not Updating

**Check:**
1. Chart.js is loaded correctly
2. Theme change event is firing
3. Charts are registered for theme updates

**Solution:**
```javascript
// Manually trigger chart theme update
window.dispatchEvent(new CustomEvent('themeChanged', {
  detail: {
    preference: 'dark',
    effective: 'dark'
  }
}));
```

### Map Tiles Not Switching

**Check:**
1. Map is initialized
2. Tile layers are configured
3. Network connection is active

**Solution:**
1. Open Map Options
2. Manually select appropriate tile layer
3. Refresh the page

### Colors Look Wrong

**Possible Causes:**
1. Browser extension modifying colors
2. Operating system color filters active
3. Display calibration issues
4. Custom CSS overriding theme

**Solutions:**
1. Disable browser extensions temporarily
2. Check OS accessibility settings
3. Test in incognito/private mode
4. Clear browser cache

## Advanced Configuration

### Programmatic Theme Control

For developers integrating the application:

```javascript
// Get theme manager instance
const themeManager = window.darkModeToggle;

// Get current theme
const current = themeManager.getThemePreference();
console.log('Current theme:', current); // 'light', 'dark', or 'auto'

// Get effective theme (resolves 'auto')
const effective = themeManager.getEffectiveTheme();
console.log('Effective theme:', effective); // 'light' or 'dark'

// Set theme programmatically
themeManager.setTheme('dark');

// Cycle through themes
themeManager.cycleTheme();

// Listen for theme changes
window.addEventListener('themeChanged', (event) => {
  console.log('Theme changed:', event.detail);
  // { preference: 'dark', effective: 'dark' }
});
```

### Custom Theme Transitions

Modify transition speed in CSS:

```css
/* Faster transitions */
* {
  transition: background-color 0.1s ease, color 0.1s ease;
}

/* Slower transitions */
* {
  transition: background-color 0.5s ease, color 0.5s ease;
}

/* No transitions (instant) */
* {
  transition: none;
}
```

### Theme-Specific Content

Show/hide content based on theme:

```html
<!-- Show only in light mode -->
<div class="light-mode-only">
  This content only appears in light mode
</div>

<!-- Show only in dark mode -->
<div class="dark-mode-only">
  This content only appears in dark mode
</div>
```

```css
[data-bs-theme="light"] .dark-mode-only {
  display: none;
}

[data-bs-theme="dark"] .light-mode-only {
  display: none;
}
```

## Best Practices

### For Users

1. **Use Auto Mode**: Let the system choose based on environment
2. **Match Your OS**: Keep theme consistent across applications
3. **Consider Environment**: Use dark mode in low light, light mode in bright light
4. **Test Both Modes**: Ensure your workflows work in both themes

### For Administrators

1. **Test Both Themes**: Verify all custom content works in both modes
2. **Maintain Contrast**: Ensure text remains readable
3. **Use CSS Variables**: Don't hardcode colors
4. **Test Accessibility**: Verify with screen readers and contrast checkers

### For Developers

1. **Use Theme Variables**: Always use CSS custom properties
2. **Listen for Changes**: Update components when theme changes
3. **Test Transitions**: Ensure smooth theme switching
4. **Support All Modes**: Test light, dark, and auto modes

## Related Features

- **Mobile Optimization**: Theme integrates with mobile-specific features
- **Accessibility**: Theme supports high contrast and color blind modes
- **Performance**: Optimized for fast theme switching
- **Customization**: Extensive customization options available
- **[Implementation Guide](../implementation/RESPONSIVE_LAYOUT_IMPLEMENTATION.md)**: Technical details on responsive design

## Further Reading

- [Mobile Usage Guide](mobile-usage.md) - Mobile theme integration
- [Accessibility Guide](accessibility.md) - Accessibility features
- [Developer Guide](../developer/contributing.md) - Extending themes
- [UI/UX Best Practices](../UI_UX_BEST_PRACTICES.md) - Design guidelines

---

**Need Help?** Check the [Troubleshooting Guide](../troubleshooting.md) or ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions).
