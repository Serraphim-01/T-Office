# Feature Dependency System

This document explains the implementation of the feature dependency system, where sub-features are automatically disabled when their parent pages are deactivated.

## Overview

The feature dependency system ensures that when a main page is deactivated, all of its sub-features are automatically disabled and become non-selectable in the Admin Features interface. This provides a consistent user experience and prevents configuration errors.

## Implementation

The dependency system is implemented in the Admin Features page (`/app/admin/features/page.tsx`) through:

1. **State Variables** - Tracking the enabled status of each main page
2. **UI Controls** - Disabling checkboxes and dimming labels for dependent features
3. **Visual Indicators** - Showing dependency information to administrators

## Dependency Rules

### Chat Features
- **Depends on**: `chat` page
- **Affected Features**: 
  - `chat/moderator`
  - `chat/pause`
  - `chat/summarizer`
  - `chat/clear`

### Clock Features
- **Depends on**: `clock` page
- **Affected Features**: 
  - `clock/manage-locations`
  - `clock/delete-locations`

### HR Features

#### HR Onboarding Features
- **Depends on**: `hr/onboarding` page
- **Affected Features**: 
  - `hr/onboarding/create-user`
  - `hr/onboarding/schedule-inductions`

#### HR Queries Features
- **Depends on**: `hr/queries` page
- **Affected Features**: 
  - `hr/queries/send-query`

#### HR Users Features
- **Depends on**: `hr/users` page
- **Affected Features**: 
  - `hr/users/view-details`

### Wiki Features
- **Depends on**: `resources/wiki` page (for create-topic)
- **Affected Features**: 
  - `resources/wiki/create-topic` (depends on `resources/wiki/create`)

### Inventory Features

#### Inbound Features
- **Depends on**: `inventory/inbound` page
- **Affected Features**: 
  - `inventory/inbound/export-csv`
  - `inventory/inbound/add-transaction`
  - `inventory/inbound/edit-transaction`
  - `inventory/inbound/delete-transaction`
  - `inventory/inbound/mark-as-stored`

#### Store Features
- **Depends on**: `inventory/store` page
- **Affected Features**: 
  - `inventory/store/export-csv`
  - `inventory/store/create-outbound`

#### Outbound Features
- **Depends on**: `inventory/outbound` page
- **Affected Features**: 
  - `inventory/outbound/export-csv`
  - `inventory/outbound/mark-as-dispatched`
  - `inventory/outbound/mark-as-delivered`
  - `inventory/outbound/delete-transaction`

#### Products Features
- **Depends on**: `inventory/products` page
- **Affected Features**: 
  - `inventory/products/import-csv`
  - `inventory/products/import-all-data`
  - `inventory/products/export-csv`
  - `inventory/products/add-product`
  - `inventory/products/view-details`
  - `inventory/products/edit-product`
  - `inventory/products/delete-product`

## Technical Implementation

### State Management
```typescript
// Check if main pages are enabled for current department
const isChatPageEnabled = selectedPages.includes('chat');
const isClockPageEnabled = selectedPages.includes('clock');
const isHRonboardingPageEnabled = selectedPages.includes('hr/onboarding');
const isHRqueriesPageEnabled = selectedPages.includes('hr/queries');
const isHRusersPageEnabled = selectedPages.includes('hr/users');
const isCreateWikiPageEnabled = selectedPages.includes('resources/wiki/create');
const isInboundPageEnabled = selectedPages.includes('inventory/inbound');
const isOutboundPageEnabled = selectedPages.includes('inventory/outbound');
const isStorePageEnabled = selectedPages.includes('inventory/store');
const isProductsPageEnabled = selectedPages.includes('inventory/products');
```

### UI Controls
```tsx
<Checkbox
  id={page.name}
  checked={selectedPages.includes(page.name)}
  onCheckedChange={() => handlePageToggle(page.name)}
  disabled={
    (page.name.startsWith('chat/') && !isChatPageEnabled) ||
    (page.name.startsWith('clock/') && !isClockPageEnabled) ||
    (page.name.startsWith('hr/onboarding/') && !isHRonboardingPageEnabled) ||
    (page.name.startsWith('hr/queries/') && !isHRqueriesPageEnabled) ||
    (page.name.startsWith('hr/users/') && !isHRusersPageEnabled) ||
    (page.name.startsWith('resources/wiki/create-topic') && !isCreateWikiPageEnabled) ||
    (page.name.startsWith('inventory/inbound/') && !isInboundPageEnabled) ||
    (page.name.startsWith('inventory/outbound/') && !isOutboundPageEnabled) ||
    (page.name.startsWith('inventory/store/') && !isStorePageEnabled) ||
    (page.name.startsWith('inventory/products/') && !isProductsPageEnabled)
  }
/>
```

### Visual Indicators
```tsx
<label
  htmlFor={page.name}
  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
    (page.name.startsWith('chat/') && !isChatPageEnabled) ||
    (page.name.startsWith('clock/') && !isClockPageEnabled) ||
    // ... other conditions
      ? 'text-muted-foreground opacity-50' 
      : ''
  }`}
>
  {page.title}
  {page.name.startsWith('chat/') && !isChatPageEnabled && (
    <span className="text-xs text-muted-foreground block">
      Requires main Chat page access
    </span>
  )}
  {/* ... other dependency messages */}
</label>
```

## Benefits

1. **Prevents Configuration Errors** - Administrators cannot enable sub-features without enabling the parent page
2. **Improves UX** - Clear visual indication of dependencies
3. **Maintains Consistency** - All features follow the same dependency pattern
4. **Reduces Support Requests** - Fewer configuration-related issues

## Testing

The dependency system has been tested with:
- All main pages disabled, verifying sub-features are disabled
- Individual main pages enabled, verifying sub-features become selectable
- Mixed configurations to ensure proper dependency tracking