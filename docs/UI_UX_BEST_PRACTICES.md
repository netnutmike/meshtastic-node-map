# UI/UX Best Practices - Theme Support & Mobile Responsiveness

## Overview

This document outlines best practices for implementing dark/light theme support, mobile responsiveness, and optimal UI patterns based on Malla's implementation.

---

## Theme Support (Dark/Light Mode)

### Implementation Strategy

Malla uses **Bootstrap 5.3's native theme system** (`data-bs-theme` attribute) which provides:
- Automatic CSS variable switching
- System preference detection
- Persistent user preference
- Smooth transitions

### Theme Toggle Implementation

**Location:** `dark-mode-toggle.js`

**Features:**
1. **Three-state toggle**: Light → Dark → Auto → Light
2. **Persistent storage**: Uses localStorage
3. **System preference detection**: Respects `prefers-color-scheme`
4. **Custom events**: Dispatches `themeChanged` event for components
5. **Mobile meta theme-color**: Updates for mobile browsers

**Code Structure:**
```javascript
class DarkModeToggle {
    constructor() {
        this.storageKey = 'malla-theme-preference';
        this.init();
    }

    // Get preference: 'light', 'dark', or 'auto'
    getThemePreference() {
        const saved = localStorage.getItem(this.storageKey);
        return saved || 'auto';
    }

    // Get effective theme (resolves 'auto')
    getEffectiveTheme() {
        const preference = this.getThemePreference();
        if (preference === 'auto') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches 
                ? 'dark' : 'light';
        }
        return preference;
    }

    // Apply theme to document
    applyTheme(theme) {
        const effectiveTheme = theme === 'auto'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;

        document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
        this.updateMetaThemeColor(effectiveTheme);
    }

    // Cycle through themes
    cycleTheme() {
        const current = this.getThemePreference();
        const next = {
            'light': 'dark',
            'dark': 'auto',
            'auto': 'light'
        }[current];
        this.setTheme(next);
    }

    // Dispatch event for other components
    setTheme(theme) {
        localStorage.setItem(this.storageKey, theme);
        this.applyTheme(theme);
        
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: {
                preference: theme,
                effective: this.getEffectiveTheme()
            }
        }));
    }
}
```

### Theme-Aware Components

**Charts (Chart.js):**
```javascript
function getChartColors() {
    const computedStyle = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    return {
        textColor: computedStyle.getPropertyValue('--bs-body-color').trim(),
        gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        primary: computedStyle.getPropertyValue('--bs-primary').trim(),
        // ... more colors
    };
}

// Listen for theme changes
window.addEventListener('themeChanged', function(event) {
    updateChartsForTheme();
});

function updateChartsForTheme() {
    // Destroy and recreate all charts with new colors
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};
    
    // Recreate charts
    createAllCharts();
}
```

**Maps (Leaflet):**
```javascript
// Create both light and dark tile layers
let lightTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO' }
);

let darkTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO' }
);

// Switch based on theme
function updateMapTheme() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const newTileLayer = isDark ? darkTileLayer : lightTileLayer;
    
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
    newTileLayer.addTo(map);
    currentTileLayer = newTileLayer;
}

// Listen for theme changes
window.addEventListener('themeChanged', updateMapTheme);
```

### CSS Theme Variables

**Using Bootstrap's CSS Variables:**
```css
/* Automatically switches based on data-bs-theme */
.card {
    background: var(--bs-body-bg);
    color: var(--bs-body-color);
    border: 1px solid var(--bs-border-color);
}

/* Dark mode specific overrides */
[data-bs-theme=dark] .modern-table-container {
    background: var(--bs-tertiary-bg);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

[data-bs-theme=dark] .modern-table tbody tr:nth-of-type(odd) {
    background-color: rgba(255, 255, 255, 0.03);
}

[data-bs-theme=dark] .modern-table tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.08);
}
```

### Mobile Meta Theme Color

**Update for mobile browsers:**
```javascript
updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
    }
    
    // Match Bootstrap colors
    metaThemeColor.content = theme === 'dark' ? '#212529' : '#0d6efd';
}
```

---

## Mobile Responsiveness

### Responsive Breakpoints

**Bootstrap 5 Breakpoints:**
- xs: <576px (phones)
- sm: ≥576px (phones landscape)
- md: ≥768px (tablets)
- lg: ≥992px (desktops)
- xl: ≥1200px (large desktops)
- xxl: ≥1400px (extra large)

### Mobile-First CSS

**Typography Scaling:**
```css
/* Base size for mobile */
html {
    font-size: 0.9rem;
}

/* Scale up for tablets */
@media (min-width: 768px) {
    html {
        font-size: 1rem;
    }
}

/* Scale up for desktops */
@media (min-width: 1200px) {
    html {
        font-size: 1.05rem;
    }
}
```

**Table Responsiveness:**
```css
/* Mobile tables */
@media (max-width: 768px) {
    .modern-table {
        font-size: 0.8rem;
    }

    .modern-table thead th,
    .modern-table tbody td {
        padding: 0.4rem 0.3rem; /* Compact padding */
    }
    
    /* Hide less important columns on mobile */
    .modern-table .hide-mobile {
        display: none;
    }
}
```

**Sidebar Behavior:**
```css
/* Desktop: sidebar on side */
@media (min-width: 769px) {
    .table-sidebar {
        position: fixed;
        right: 0;
        top: 56px;
        width: 320px;
        height: calc(100vh - 56px);
        overflow-y: auto;
    }
    
    .table-sidebar.collapsed {
        transform: translateX(100%);
    }
}

/* Mobile: sidebar as overlay */
@media (max-width: 768px) {
    .table-sidebar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 60vh;
        overflow-y: auto;
        z-index: 1050;
    }
    
    .table-sidebar.collapsed {
        transform: translateY(100%);
    }
}
```

### Touch-Friendly Controls

**Button Sizing:**
```css
/* Minimum touch target: 44x44px (Apple HIG) */
.btn-sm {
    min-height: 44px;
    min-width: 44px;
    padding: 0.5rem 1rem;
}

/* Icon-only buttons */
.btn-icon {
    width: 44px;
    height: 44px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
```

**Spacing:**
```css
/* Increase spacing on mobile for easier tapping */
@media (max-width: 768px) {
    .btn-group .btn {
        margin: 0 2px;
    }
    
    .form-control {
        font-size: 16px; /* Prevents zoom on iOS */
    }
}
```

---

## Node Actions - Best Practices

### Problem: Horizontal Scrolling

**Current Issue:**
- Actions column requires horizontal scroll on mobile
- Poor UX when actions are hidden off-screen

### Malla's Solution: Icon-Only Button Group

**Implementation:**
```javascript
{
    key: 'node_id',
    title: 'Actions',
    sortable: false,
    render: (value, row) => {
        return `
            <div class="btn-group" role="group">
                <a href="/node/${value}"
                   class="btn btn-sm btn-outline-primary" 
                   title="View node details"
                   data-bs-toggle="tooltip">
                    <i class="bi bi-info-circle"></i>
                </a>
                <a href="/packets?from_node=${value}"
                   class="btn btn-sm btn-outline-secondary" 
                   title="View packets"
                   data-bs-toggle="tooltip">
                    <i class="bi bi-envelope"></i>
                </a>
                <a href="/traceroute?from_node=${value}"
                   class="btn btn-sm btn-outline-info" 
                   title="View traceroutes"
                   data-bs-toggle="tooltip">
                    <i class="bi bi-diagram-3"></i>
                </a>
            </div>`;
    }
}
```

**Benefits:**
1. **Compact**: Icons take less space than text
2. **Tooltips**: Hover shows full action description
3. **Touch-friendly**: Buttons are properly sized
4. **No scrolling**: Fits in visible area
5. **Consistent**: Same pattern across all rows

### Alternative: Dropdown Menu

**For more actions:**
```javascript
{
    key: 'node_id',
    title: 'Actions',
    sortable: false,
    render: (value, row) => {
        return `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                        type="button" 
                        data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                        <a class="dropdown-item" href="/node/${value}">
                            <i class="bi bi-info-circle"></i> View Details
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="/packets?from_node=${value}">
                            <i class="bi bi-envelope"></i> View Packets
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="/traceroute?from_node=${value}">
                            <i class="bi bi-diagram-3"></i> View Traceroutes
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" href="/map?highlight=${value}">
                            <i class="bi bi-map"></i> View on Map
                        </a>
                    </li>
                </ul>
            </div>`;
    }
}
```

**Benefits:**
1. **Minimal space**: Single button
2. **Scalable**: Can add many actions
3. **Organized**: Group related actions
4. **Mobile-friendly**: Dropdown works well on touch

### Recommended Approach

**Use icon buttons for 2-4 common actions:**
- View Details
- View Packets
- View Traceroutes

**Use dropdown for additional actions:**
- View on Map
- Line of Sight
- Direct Receptions
- Relay Analysis
- Export Data

**Combined Example:**
```javascript
{
    key: 'node_id',
    title: 'Actions',
    sortable: false,
    render: (value, row) => {
        return `
            <div class="d-flex gap-1">
                <!-- Primary action -->
                <a href="/node/${value}"
                   class="btn btn-sm btn-primary" 
                   title="View details"
                   data-bs-toggle="tooltip">
                    <i class="bi bi-info-circle"></i>
                </a>
                
                <!-- More actions dropdown -->
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                            type="button" 
                            data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item" href="/packets?from_node=${value}">
                                <i class="bi bi-envelope"></i> Packets
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="/traceroute?from_node=${value}">
                                <i class="bi bi-diagram-3"></i> Traceroutes
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="/map?highlight=${value}">
                                <i class="bi bi-map"></i> View on Map
                            </a>
                        </li>
                    </ul>
                </div>
            </div>`;
    }
}
```

---

## Responsive Table Patterns

### Pattern 1: Hide Columns on Mobile

**CSS Approach:**
```css
@media (max-width: 768px) {
    .table .hide-mobile {
        display: none;
    }
}
```

**HTML:**
```html
<th class="hide-mobile">Hardware</th>
<th class="hide-mobile">Channel</th>
```

### Pattern 2: Stack Information

**Mobile Card Layout:**
```javascript
// Detect mobile
const isMobile = window.innerWidth <= 768;

if (isMobile) {
    // Render as cards instead of table rows
    return `
        <div class="node-card">
            <div class="node-card-header">
                <strong>${row.node_name}</strong>
                <span class="badge ${roleClass}">${row.role}</span>
            </div>
            <div class="node-card-body">
                <div>ID: ${row.hex_id}</div>
                <div>Hardware: ${row.hw_model}</div>
                <div>Last Seen: ${row.last_packet_str}</div>
            </div>
            <div class="node-card-actions">
                <!-- Actions here -->
            </div>
        </div>`;
}
```

### Pattern 3: Horizontal Scroll with Fixed Column

**Keep actions visible:**
```css
.table-responsive {
    overflow-x: auto;
}

.table .actions-column {
    position: sticky;
    right: 0;
    background: var(--bs-body-bg);
    box-shadow: -2px 0 4px rgba(0,0,0,0.1);
}
```

---

## Mobile Navigation

### Collapsible Sidebar

**Toggle Button:**
```html
<button id="toggleSidebar" class="btn btn-primary">
    <i class="bi bi-layout-sidebar-inset-reverse"></i>
</button>
```

**Responsive Behavior:**
```javascript
function toggleSidebar() {
    const sidebar = document.querySelector('.table-sidebar');
    const icon = document.querySelector('#toggleSidebar i');
    const isMobile = window.innerWidth <= 768;
    
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        icon.className = isMobile ? 'bi bi-chevron-up' : 'bi bi-chevron-left';
    } else {
        icon.className = isMobile ? 'bi bi-chevron-down' : 'bi bi-chevron-right';
    }
}

// Update icon on resize
window.addEventListener('resize', updateToggleIcon);
```

### Bottom Sheet on Mobile

**CSS:**
```css
@media (max-width: 768px) {
    .filters-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 70vh;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
        transform: translateY(100%);
        transition: transform 0.3s ease;
    }
    
    .filters-panel.show {
        transform: translateY(0);
    }
}
```

---

## Performance Considerations

### Lazy Loading

**Images:**
```html
<img src="placeholder.jpg" 
     data-src="actual-image.jpg" 
     loading="lazy" 
     alt="Description">
```

**Charts:**
```javascript
// Load charts only when visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadChart(entry.target);
            observer.unobserve(entry.target);
        }
    });
});

document.querySelectorAll('.chart-container').forEach(el => {
    observer.observe(el);
});
```

### Debouncing

**Search Input:**
```javascript
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
    }, 300);
});
```

---

## Accessibility

### ARIA Labels

```html
<button id="theme-toggle" 
        aria-label="Toggle theme mode"
        aria-pressed="false">
    <i class="bi bi-circle-half"></i>
</button>
```

### Keyboard Navigation

```javascript
// Trap focus in modal
modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
```

### Focus Management

```css
/* Visible focus indicators */
:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
    outline: none;
}
```

---

## Implementation Checklist

### Theme Support
- [ ] Implement DarkModeToggle class
- [ ] Add theme toggle button to navbar
- [ ] Update all charts to support theme changes
- [ ] Update map tile layers for dark/light
- [ ] Add CSS variables for theme-aware components
- [ ] Test theme persistence across page loads
- [ ] Add meta theme-color for mobile

### Mobile Responsiveness
- [ ] Use Bootstrap responsive grid
- [ ] Add mobile-specific CSS breakpoints
- [ ] Implement collapsible sidebar
- [ ] Make tables responsive (hide columns or card layout)
- [ ] Ensure touch targets are 44x44px minimum
- [ ] Test on actual mobile devices
- [ ] Add viewport meta tag

### Node Actions
- [ ] Replace text buttons with icon buttons
- [ ] Add tooltips to icon buttons
- [ ] Implement dropdown for additional actions
- [ ] Ensure actions fit without horizontal scroll
- [ ] Test on mobile devices

### Performance
- [ ] Lazy load charts
- [ ] Debounce search inputs
- [ ] Optimize images
- [ ] Minimize JavaScript bundle size
- [ ] Use CSS animations instead of JS where possible

---

## References

- **Dark Mode Toggle**: `malla-main/src/malla/static/js/dark-mode-toggle.js`
- **Responsive CSS**: `malla-main/src/malla/static/css/malla.css`
- **Nodes Table**: `malla-main/src/malla/templates/nodes.html`
- **Bootstrap 5 Theming**: https://getbootstrap.com/docs/5.3/customize/color-modes/

---

*Last Updated: January 2026*
*Based on Malla implementation and Bootstrap 5.3 best practices*
