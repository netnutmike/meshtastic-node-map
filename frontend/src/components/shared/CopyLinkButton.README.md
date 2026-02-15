# CopyLinkButton Component

Reusable button component for copying shareable links with all current filter state to the clipboard.

## Requirements

Implements Requirements 44.12, 44.13, 44.14, 44.15:
- Copy current URL with all filters to clipboard
- Generate shareable URLs that exactly reproduce filter state
- Handle complex nested objects and arrays in URL parameters
- Work consistently across all pages (packets, nodes, map)

## Components

### CopyLinkButton

Full button with text and icon.

```tsx
import { CopyLinkButton } from '../components/shared';

// Basic usage
<CopyLinkButton />

// Custom styling
<CopyLinkButton 
  variant="primary"
  size="lg"
  text="Share This View"
  className="my-custom-class"
/>

// With callbacks
<CopyLinkButton 
  onCopy={(url) => console.log('Copied:', url)}
  onError={(error) => console.error('Failed:', error)}
/>

// Without icon
<CopyLinkButton showIcon={false} />
```

### CopyLinkIconButton

Icon-only button for compact layouts.

```tsx
import { CopyLinkIconButton } from '../components/shared';

// Basic usage
<CopyLinkIconButton />

// Custom styling
<CopyLinkIconButton 
  variant="secondary"
  size="sm"
  className="ms-2"
/>

// With callbacks
<CopyLinkIconButton 
  onCopy={(url) => console.log('Copied:', url)}
  onError={(error) => console.error('Failed:', error)}
/>
```

## Props

### CopyLinkButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline-primary' \| 'outline-secondary' \| 'link'` | `'outline-primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Button size |
| `text` | `string` | `'Copy Link'` | Button text |
| `showIcon` | `boolean` | `true` | Show icon in button |
| `className` | `string` | `''` | Additional CSS classes |
| `onCopy` | `(url: string) => void` | - | Callback when link is copied successfully |
| `onError` | `(error: Error) => void` | - | Callback when copy fails |

### CopyLinkIconButton Props

Same as CopyLinkButton except `text` and `showIcon` are not available (always icon-only).

## Features

- **Visual Feedback**: Shows "Copied!" message with success icon for 2 seconds
- **Loading State**: Shows "Copying..." state while operation is in progress
- **Error Handling**: Gracefully handles clipboard permission errors
- **Accessibility**: Proper ARIA labels, keyboard navigation, and title attributes
- **Debounce Protection**: Prevents multiple simultaneous copy operations
- **URL State Integration**: Automatically captures current URL with all filter parameters

## Usage Examples

### In a Filter Panel

```tsx
function FilterPanel() {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h5>Filters</h5>
      <CopyLinkButton 
        variant="outline-secondary"
        size="sm"
        onCopy={() => toast.success('Link copied to clipboard!')}
      />
    </div>
  );
}
```

### In a Toolbar

```tsx
function Toolbar() {
  return (
    <div className="btn-toolbar">
      <div className="btn-group me-2">
        <button className="btn btn-sm btn-outline-primary">
          <i className="bi bi-funnel" /> Filter
        </button>
        <button className="btn btn-sm btn-outline-primary">
          <i className="bi bi-download" /> Export
        </button>
      </div>
      <CopyLinkIconButton variant="outline-primary" size="sm" />
    </div>
  );
}
```

### In a Table Header

```tsx
function TableHeader() {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4>Packets</h4>
        <p className="text-muted">Showing 1,234 packets</p>
      </div>
      <div className="btn-group">
        <button className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-download" /> Export
        </button>
        <CopyLinkButton 
          variant="outline-secondary"
          size="sm"
          text="Share"
        />
      </div>
    </div>
  );
}
```

### With Custom Success Notification

```tsx
import { useState } from 'react';
import { CopyLinkButton } from '../components/shared';

function MyComponent() {
  const [showToast, setShowToast] = useState(false);

  return (
    <>
      <CopyLinkButton 
        onCopy={(url) => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }}
        onError={(error) => {
          alert('Failed to copy link. Please try again.');
        }}
      />
      
      {showToast && (
        <div className="toast show position-fixed bottom-0 end-0 m-3">
          <div className="toast-body">
            Link copied! Share it with others to show them this exact view.
          </div>
        </div>
      )}
    </>
  );
}
```

## Integration with URL State Manager

The CopyLinkButton automatically uses the `urlStateManager` singleton to capture the current URL with all filter parameters. Make sure your page is using the URL state management system:

```tsx
import { useUrlState } from '../utils/UrlStateManager';

function MyPage() {
  const [filters, updateFilters] = useUrlState({
    search: '',
    page: 1,
    active: false,
  });

  // Filters are automatically synced to URL
  // CopyLinkButton will capture the complete URL with all parameters
  
  return (
    <div>
      <input 
        value={filters.search}
        onChange={(e) => updateFilters({ search: e.target.value })}
      />
      <CopyLinkButton />
    </div>
  );
}
```

## Browser Compatibility

The component uses the modern Clipboard API (`navigator.clipboard.writeText`). It requires:
- HTTPS connection (or localhost for development)
- User permission for clipboard access
- Modern browser (Chrome 63+, Firefox 53+, Safari 13.1+, Edge 79+)

The component gracefully handles permission errors and provides feedback through the `onError` callback.

## Testing

The component is fully tested with:
- Unit tests for all props and functionality
- Accessibility tests for ARIA labels and keyboard navigation
- Error handling tests for clipboard failures
- Integration tests with URL state manager

See `__tests__/CopyLinkButton.test.tsx` for complete test coverage.
