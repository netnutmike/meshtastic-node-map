# Icon Button Components

This document describes the icon button components that implement Requirements 36.2, 36.3, 36.11, and 36.12 for mobile-responsive action buttons.

## Components

### IconButtonWithTooltip

A touch-friendly icon button with tooltip support that ensures minimum 44x44px touch target size.

**Requirements:**
- 36.2: Icon-only buttons with tooltips instead of text labels
- 36.3: Minimum 44x44px touch target size for accessibility

**Usage:**

```tsx
import { IconButtonWithTooltip } from '../components/shared';
import { Visibility as VisibilityIcon } from '@mui/icons-material';

<IconButtonWithTooltip
  tooltip="View details"
  icon={<VisibilityIcon />}
  onClick={handleViewDetails}
  color="primary"
/>
```

**Props:**
- `tooltip` (required): Tooltip text to display on hover
- `icon` (required): Icon element to display
- `onClick` (required): Click handler function
- `size`: Button size ('small' | 'medium' | 'large'), defaults to 'medium'
- `color`: Color variant ('default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning')
- `disabled`: Whether the button is disabled
- `ariaLabel`: Custom aria-label (defaults to tooltip text)
- `sx`: Custom Material-UI sx prop for styling

**Features:**
- Automatically ensures 44x44px minimum touch target size
- Handles disabled state properly with tooltip wrapper
- Accessible with proper ARIA labels
- Keyboard navigable

### ActionButtonGroup

Groups multiple action buttons together with optional overflow menu for >3-4 actions.

**Requirements:**
- 36.11: Button groups for multiple actions
- 36.12: Dropdown menu for >3-4 actions

**Usage:**

```tsx
import { ActionButtonGroup, ActionButton } from '../components/shared';
import {
  Visibility as VisibilityIcon,
  MyLocation as MyLocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const actions: ActionButton[] = [
  {
    id: 'view',
    tooltip: 'View details',
    icon: <VisibilityIcon />,
    onClick: handleView,
    color: 'primary',
  },
  {
    id: 'center',
    tooltip: 'Center map',
    icon: <MyLocationIcon />,
    onClick: handleCenter,
    color: 'secondary',
  },
  {
    id: 'edit',
    tooltip: 'Edit node',
    icon: <EditIcon />,
    onClick: handleEdit,
  },
  {
    id: 'delete',
    tooltip: 'Delete node',
    icon: <DeleteIcon />,
    onClick: handleDelete,
    color: 'error',
    disabled: !canDelete,
  },
];

<ActionButtonGroup
  actions={actions}
  maxVisible={3}
  size="medium"
/>
```

**Props:**
- `actions` (required): Array of ActionButton objects
- `maxVisible`: Maximum number of buttons to show before using dropdown (default: 3)
- `size`: Size of all buttons ('small' | 'medium' | 'large')

**ActionButton Interface:**
```typescript
interface ActionButton {
  id: string;              // Unique identifier
  tooltip: string;         // Tooltip text
  icon: React.ReactNode;   // Icon element
  onClick: () => void;     // Click handler
  disabled?: boolean;      // Whether disabled
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}
```

**Features:**
- Automatically creates overflow menu when actions > maxVisible
- All buttons maintain 44x44px minimum touch target size
- Menu items also have 44px minimum height for touch-friendliness
- Accessible with proper ARIA labels
- Keyboard navigable

## Migration Guide

### Converting Text Buttons to Icon Buttons

**Before:**
```tsx
<Button variant="contained" onClick={handleView}>
  View Details
</Button>
<Button variant="outlined" onClick={handleCenter}>
  Center Map
</Button>
```

**After:**
```tsx
<ActionButtonGroup
  actions={[
    {
      id: 'view',
      tooltip: 'View details',
      icon: <VisibilityIcon />,
      onClick: handleView,
      color: 'primary',
    },
    {
      id: 'center',
      tooltip: 'Center map',
      icon: <MyLocationIcon />,
      onClick: handleCenter,
      color: 'secondary',
    },
  ]}
/>
```

### Benefits of Icon Buttons

1. **Space Efficiency**: Icon buttons take up less horizontal space, especially important on mobile
2. **Touch-Friendly**: Guaranteed 44x44px minimum size for easy tapping
3. **Consistent UI**: All action buttons have the same visual weight
4. **Scalable**: Overflow menu automatically handles many actions
5. **Accessible**: Tooltips provide context, ARIA labels for screen readers

## Best Practices

1. **Use Clear Icons**: Choose icons that clearly represent the action
2. **Provide Descriptive Tooltips**: Tooltips should clearly explain what the button does
3. **Limit Visible Actions**: Show 3-4 most important actions, put rest in overflow menu
4. **Group Related Actions**: Use ActionButtonGroup for related actions in the same context
5. **Consider Color**: Use color to indicate action importance (primary, secondary, error)
6. **Handle Disabled State**: Disable buttons when actions aren't available

## Examples

### Nodes Table Actions

```tsx
<ActionButtonGroup
  actions={[
    {
      id: 'view',
      tooltip: 'View details',
      icon: <VisibilityIcon />,
      onClick: () => handleViewNode(node.id),
      color: 'primary',
    },
    {
      id: 'center',
      tooltip: 'Center map on node',
      icon: <MyLocationIcon />,
      onClick: () => handleCenterMap(node),
      color: 'secondary',
      disabled: !node.position,
    },
  ]}
  maxVisible={2}
/>
```

### Form Actions

```tsx
<ActionButtonGroup
  actions={[
    {
      id: 'save',
      tooltip: 'Save changes',
      icon: <SaveIcon />,
      onClick: handleSave,
      color: 'primary',
      disabled: !isDirty,
    },
    {
      id: 'cancel',
      tooltip: 'Cancel',
      icon: <CancelIcon />,
      onClick: handleCancel,
    },
    {
      id: 'reset',
      tooltip: 'Reset to defaults',
      icon: <RestoreIcon />,
      onClick: handleReset,
      disabled: !isDirty,
    },
  ]}
/>
```

## Testing

Both components have comprehensive unit tests covering:
- Button rendering and tooltip display
- Touch target sizing (44x44px minimum)
- Click event handling
- Disabled state
- Color variants
- Accessibility (ARIA labels, keyboard navigation)
- Dropdown menu functionality (ActionButtonGroup)

Run tests:
```bash
npm test -- IconButton.test.tsx ActionButtonGroup.test.tsx
```

## Related Files

- `frontend/src/components/shared/IconButton.tsx` - IconButtonWithTooltip component
- `frontend/src/components/shared/ActionButtonGroup.tsx` - ActionButtonGroup component
- `frontend/src/components/shared/__tests__/IconButton.test.tsx` - Unit tests
- `frontend/src/components/shared/__tests__/ActionButtonGroup.test.tsx` - Unit tests
- `frontend/src/styles/responsive-layout.css` - Responsive CSS styles
