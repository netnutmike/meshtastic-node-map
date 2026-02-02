# Responsive Layout System

This document describes the responsive layout system implemented for the Meshtastic Node Mapper application.

## Overview

The responsive layout system provides a mobile-first, accessible design that adapts to different screen sizes and devices. It implements requirements 36.1, 36.4, 36.5, 36.6, 36.7, and 36.13.

## Breakpoints

The system uses the following responsive breakpoints:

| Breakpoint | Min Width | Description |
|------------|-----------|-------------|
| xs         | 0px       | Extra small devices (phones) |
| sm         | 576px     | Small devices (large phones) |
| md         | 768px     | Medium devices (tablets) |
| lg         | 992px     | Large devices (desktops) |
| xl         | 1200px    | Extra large devices (large desktops) |
| xxl        | 1400px    | Extra extra large devices |

## Font Scaling

The system implements mobile-first font scaling:

- **Mobile (< 768px)**: 0.9rem base font size
- **Tablet (768px - 1199px)**: 1rem base font size
- **Desktop (≥ 1200px)**: 1.05rem base font size

## Touch Targets

All interactive elements have a minimum touch target size of **44x44 pixels** to ensure accessibility and ease of use on touch devices.

## Components

### ResponsiveSidebar

A responsive sidebar component that adapts its behavior based on viewport size:

**Desktop (> 768px)**:
- Fixed position on the right side
- Slides horizontally (translateX) when toggled
- Width: 320px

**Mobile (≤ 768px)**:
- Bottom sheet positioned at the bottom of the screen
- Slides vertically (translateY) when toggled
- Max height: 60vh
- Supports swipe-down gesture to close

#### Usage

```tsx
import { ResponsiveSidebar } from './components/Layout';

function MyComponent() {
  return (
    <ResponsiveSidebar
      defaultCollapsed={false}
      onToggle={(collapsed) => console.log('Sidebar collapsed:', collapsed)}
    >
      <div>Your sidebar content here</div>
    </ResponsiveSidebar>
  );
}
```

#### Props

- `children`: React.ReactNode - Content to display in the sidebar
- `defaultCollapsed`: boolean (optional) - Initial collapsed state
- `onToggle`: (collapsed: boolean) => void (optional) - Callback when sidebar is toggled

## Hooks

### useBreakpoint()

Returns the current breakpoint name based on viewport width.

```tsx
import { useBreakpoint } from './utils/useBreakpoint';

function MyComponent() {
  const breakpoint = useBreakpoint();
  // breakpoint will be 'xs', 'sm', 'md', 'lg', 'xl', or 'xxl'
}
```

### useIsMobile()

Returns true if the viewport is mobile-sized (≤ 768px).

```tsx
import { useIsMobile } from './utils/useBreakpoint';

function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

### useMediaQuery(minBreakpoint)

Returns true if the viewport matches or exceeds the specified breakpoint.

```tsx
import { useMediaQuery } from './utils/useBreakpoint';

function MyComponent() {
  const isLargeScreen = useMediaQuery('lg');
  
  return (
    <div>
      {isLargeScreen && <AdditionalContent />}
    </div>
  );
}
```

### useViewportSize()

Returns the current viewport dimensions.

```tsx
import { useViewportSize } from './utils/useBreakpoint';

function MyComponent() {
  const { width, height } = useViewportSize();
  
  return <div>Viewport: {width}x{height}</div>;
}
```

## CSS Classes

### Layout Classes

- `.responsive-sidebar` - Main sidebar container
- `.responsive-sidebar.collapsed` - Collapsed state
- `.responsive-sidebar-header` - Mobile sidebar header (mobile only)
- `.responsive-sidebar-content` - Sidebar content wrapper
- `.responsive-sidebar-toggle` - Toggle button

### Button Classes

- `.btn-icon` - Icon-only button with 44x44px minimum size
- `.btn-group-actions` - Group of action buttons

### Table Classes

- `.responsive-table` - Responsive table wrapper
- `.responsive-table .hide-mobile` - Hide column on mobile
- `.responsive-table .actions-column` - Sticky actions column

### Form Classes

- `.responsive-form` - Responsive form container
- `.responsive-form .form-control` - Form inputs with proper sizing

### Utility Classes

- `.mobile-only` - Show only on mobile
- `.desktop-only` - Show only on desktop
- `.mobile-full-width` - Full width on mobile
- `.mobile-flex-column` - Column layout on mobile
- `.mobile-text-center` - Center text on mobile
- `.responsive-spacing` - Responsive padding
- `.responsive-chart` - Responsive chart container

## Accessibility Features

### Touch Targets

All interactive elements meet the minimum 44x44px touch target size requirement.

### Focus Styles

Visible focus indicators for keyboard navigation:

```css
.btn-icon:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}
```

### ARIA Attributes

Components include proper ARIA attributes:
- `aria-label` for icon buttons
- `aria-expanded` for toggle buttons
- `aria-hidden` for decorative elements

### Reduced Motion

Respects user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .responsive-sidebar {
    transition: none !important;
  }
}
```

## Dark Mode Support

All components support dark mode through Bootstrap's theme system:

```css
[data-bs-theme="dark"] .responsive-sidebar {
  background: var(--bs-dark);
  border-color: var(--bs-border-color);
}
```

## Safe Area Support

Supports devices with notches and safe areas:

```css
@supports (padding: max(0px)) {
  .responsive-nav {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
}
```

## Performance Optimizations

### Hardware Acceleration

```css
.responsive-sidebar {
  will-change: transform;
  backface-visibility: hidden;
}
```

### Smooth Scrolling

```css
.responsive-sidebar-content {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
```

## Testing

The responsive layout system includes comprehensive unit tests covering:

- Breakpoint detection and changes
- Sidebar positioning on different screen sizes
- Touch target sizing
- Mobile vs desktop behavior
- Accessibility features

Run tests with:

```bash
npm test -- responsive-layout.test.tsx
```

## Browser Support

The responsive layout system supports:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 12+
- Android Chrome 80+
- Progressive Web Apps (PWA)

## Examples

### Responsive Navigation

```tsx
<nav className="responsive-nav">
  <img src="/logo.png" alt="Logo" className="logo" />
  <span className="site-name">Meshtastic Node Mapper</span>
  <div className="nav-icons">
    <button className="btn-icon" aria-label="Settings">
      <i className="bi bi-gear"></i>
    </button>
  </div>
</nav>
```

### Responsive Table

```tsx
<div className="responsive-table">
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th className="hide-mobile">Hardware</th>
        <th className="hide-mobile">Last Seen</th>
        <th className="actions-column">Actions</th>
      </tr>
    </thead>
    <tbody>
      {/* table rows */}
    </tbody>
  </table>
</div>
```

### Responsive Form

```tsx
<form className="responsive-form">
  <div className="form-group">
    <label>Node Name</label>
    <input type="text" className="form-control" />
  </div>
  <button type="submit" className="btn btn-primary">
    Submit
  </button>
</form>
```

## Migration Guide

To migrate existing components to use the responsive layout system:

1. Import the responsive layout CSS in your main CSS file:
   ```css
   @import './styles/responsive-layout.css';
   ```

2. Replace fixed sidebars with `ResponsiveSidebar` component

3. Add responsive classes to tables:
   ```tsx
   <div className="responsive-table">
     {/* existing table */}
   </div>
   ```

4. Use breakpoint hooks for conditional rendering:
   ```tsx
   const isMobile = useIsMobile();
   ```

5. Ensure all buttons meet minimum touch target size:
   ```tsx
   <button className="btn-icon">
     <i className="bi bi-icon"></i>
   </button>
   ```

## Future Enhancements

Potential improvements for future versions:

- Gesture support for sidebar (swipe to open/close)
- Customizable breakpoints
- Animation preferences
- Additional responsive components (modals, dropdowns)
- Responsive image loading
- Container queries support

## References

- [Bootstrap 5 Breakpoints](https://getbootstrap.com/docs/5.3/layout/breakpoints/)
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [WCAG 2.1 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [MDN - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
