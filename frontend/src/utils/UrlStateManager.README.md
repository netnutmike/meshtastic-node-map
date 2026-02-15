# UrlStateManager

A utility for syncing application filter state to URL parameters with automatic debouncing, validation, and support for complex data types.

## Features

- **Automatic URL Synchronization**: Updates URL parameters without page reload
- **Debounced Updates**: 300ms debounce to avoid cluttering browser history
- **Array Support**: Handle multiple values for the same parameter
- **Type Preservation**: Automatically parse numbers and booleans
- **Validation & Sanitization**: Built-in XSS protection and custom validators
- **Browser Navigation**: Support for back/forward buttons
- **Shareable Links**: Copy current URL with all filters to clipboard

## Requirements Implemented

- **44.1**: Update URL parameters using URLSearchParams without page reload
- **44.2**: Use history.replaceState() to avoid cluttering browser history
- **44.3**: Restore filter state from URL on page load
- **44.4**: Remove null/empty parameters from URL
- **44.5**: Add or update parameters when filter values are set
- **44.6**: Debounce URL updates by 300ms
- **44.7**: Support array parameters with multiple values
- **44.8**: Validate and sanitize URL parameters
- **44.9**: Properly encode special characters
- **44.10**: Support bookmarking filtered views
- **44.11**: Maintain filter state with browser back/forward
- **44.12**: Copy current URL to clipboard
- **44.13**: Ensure exact reproduction of filter state from URL

## Basic Usage

```typescript
import { UrlStateManager } from './utils/UrlStateManager';

// Create an instance
const urlManager = new UrlStateManager();

// Update URL with state
urlManager.updateUrl({
  search: 'test query',
  page: 2,
  active: true,
  tags: ['tag1', 'tag2']
});

// Read state from URL
const state = urlManager.getStateFromUrl();
console.log(state); // { search: 'test query', page: 2, active: true, tags: ['tag1', 'tag2'] }

// Sync with default state
const defaultState = { search: '', page: 1, active: false };
const syncedState = urlManager.syncFromUrl(defaultState);

// Copy URL to clipboard
await urlManager.copyUrlToClipboard();

// Listen for browser navigation
const cleanup = urlManager.onPopState((state) => {
  console.log('URL changed:', state);
});

// Cleanup
cleanup();
urlManager.destroy();
```

## React Hook Usage

```typescript
import { useUrlState } from './utils/UrlStateManager';

function MyComponent() {
  const [filters, updateFilters, urlManager] = useUrlState({
    search: '',
    page: 1,
    active: false,
    tags: []
  });

  const handleSearchChange = (search: string) => {
    updateFilters({ search });
  };

  const handleCopyLink = async () => {
    const success = await urlManager.copyUrlToClipboard();
    if (success) {
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div>
      <input 
        value={filters.search} 
        onChange={(e) => handleSearchChange(e.target.value)} 
      />
      <button onClick={handleCopyLink}>Copy Link</button>
    </div>
  );
}
```

## Custom Validation & Sanitization

```typescript
const urlManager = new UrlStateManager({
  // Custom validator
  validator: (key, value) => {
    // Only allow specific keys
    const allowedKeys = ['search', 'page', 'limit'];
    return allowedKeys.includes(key) && value !== null && value !== '';
  },
  
  // Custom sanitizer
  sanitizer: (key, value) => {
    if (key === 'search' && typeof value === 'string') {
      // Remove all HTML tags
      return value.replace(/<[^>]*>/g, '');
    }
    return value;
  },
  
  // Custom debounce delay
  debounceMs: 500,
  
  // Use pushState instead of replaceState
  useReplaceState: false
});
```

## Integration with FilterStore

```typescript
import { FilterStore } from './FilterStore';
import { UrlStateManager } from './UrlStateManager';

const filterStore = new FilterStore({ search: '', page: 1 });
const urlManager = new UrlStateManager();

// Subscribe to filter changes and update URL
filterStore.subscribe((state) => {
  urlManager.updateUrl(state);
});

// Initialize filters from URL
const urlState = urlManager.getStateFromUrl();
filterStore.setState(urlState);
```

## URL Parameter Format

### Single Values
```
?search=test&page=2&active=true
```

### Array Values
```
?tags=tag1&tags=tag2&tags=tag3
```

### Mixed Types
```
?search=test&page=2&active=true&tags=tag1&tags=tag2&limit=50
```

## Type Parsing

The utility automatically parses URL parameter values:

- **Numbers**: `"123"` → `123`
- **Booleans**: `"true"` → `true`, `"false"` → `false`
- **Strings**: Everything else remains a string

## Security

Built-in sanitization removes potentially dangerous characters:
- `<` and `>` (HTML tags)
- `'` and `"` (quotes)

Custom sanitizers can be provided for additional security.

## Browser Compatibility

- Modern browsers with URLSearchParams support
- History API (pushState/replaceState)
- Clipboard API for copy functionality

## Testing

Comprehensive test suite with 33 tests covering:
- URL parameter encoding/decoding
- Debouncing behavior
- Array parameter handling
- Null/empty parameter handling
- Validation and sanitization
- History management
- State synchronization
- Browser navigation
- Complex state scenarios

Run tests:
```bash
npm test -- UrlStateManager.test.ts
```
