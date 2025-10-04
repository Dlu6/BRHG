# Softphone Bar Resize Functionality

## Overview

The Chrome softphone extension now supports resizing the height of the softphone bar. Users can drag the top or bottom edges of the bar to adjust its height between 60px and 200px.

## Features

### Resize Handles

- **Top Edge**: Drag to resize from the top
- **Bottom Edge**: Drag to resize from the bottom
- **Visual Feedback**: Handles highlight on hover
- **Constraints**: Height limited between 60px and 200px

### Responsive Design

The softphone bar content automatically adjusts based on the height:

#### Font Sizes

- **Small (60-80px)**: Smaller fonts for compact display
- **Medium (80-100px)**: Standard font sizes
- **Large (100-200px)**: Larger fonts for better readability

#### Button Sizes

- **Small**: 40px minimum size
- **Medium**: 42px minimum size
- **Large**: 44px minimum size

#### Input Fields

- **Padding**: Adjusts based on height
- **Font Size**: Scales with height
- **Width**: Maintains 150px width

### Persistence

- Height preference is saved to localStorage
- Restored on next session
- Default height: 60px

## Technical Implementation

### App Component Changes

- Added `softphoneHeight` state (60-200px range)
- Added resize event handlers
- Global mouse event listeners during resize
- Height persistence in localStorage

### SoftphoneBar Component Changes

- Accepts `height` prop and `onResizeStart` callback
- Responsive styling based on height
- Resize handles at top and bottom edges
- Flexible layout with proper content scaling

### Resize Process

1. User clicks and drags resize handle
2. `handleResizeStart` captures initial position
3. Global mouse move listener updates height
4. Height constrained between 60-200px
5. Content automatically reflows
6. Height saved to localStorage on change

## Usage

### For Users

1. Hover over top or bottom edge of softphone bar
2. Cursor changes to resize indicator
3. Click and drag to resize
4. Release to set new height
5. Height preference is automatically saved

### For Developers

```jsx
<SoftphoneBar
  isAuthenticated={isAuthenticated}
  height={softphoneHeight}
  onResizeStart={handleResizeStart}
/>
```

## Responsive Breakpoints

| Height Range | Font Size | Button Size | Padding  |
| ------------ | --------- | ----------- | -------- |
| 60-80px      | Small     | 40px        | Compact  |
| 80-100px     | Medium    | 42px        | Standard |
| 100-200px    | Large     | 44px        | Spacious |

## Browser Compatibility

- Chrome 88+ (for backdrop-filter support)
- Firefox 76+ (for backdrop-filter support)
- Safari 14+ (for backdrop-filter support)

## Performance Considerations

- Resize events are throttled to prevent excessive re-renders
- Height changes are debounced for localStorage saves
- Smooth transitions for visual feedback
- Minimal DOM manipulation during resize

## Future Enhancements

- Width resizing capability
- Custom height presets
- Animation during resize
- Touch support for mobile devices
