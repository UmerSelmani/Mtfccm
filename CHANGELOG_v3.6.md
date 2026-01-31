# MTFCCM v3.6 Changelog

## Bug Fixes (v3.6 FIXED)

### Critical Fix: Duplicate DEFAULT_SETTINGS
- **Issue**: App was not loading - showed "Select a..." and "Loading..." indefinitely
- **Cause**: Duplicate `DEFAULT_SETTINGS` constant (one in app.js, one in coins.js) causing configuration conflict
- **Fix**: Removed duplicate from app.js and updated the one in coins.js to include new v3.6 settings
- **Added to coins.js**: `viewMode` and `candlePopupType` settings

## Major Changes

### 1. Display Mode System Overhaul
- **Renamed "Simple Mode" → "Clear Mode"**
  - Clear Mode now shows what was previously Advanced Mode (shows basic info with some elements hidden)
  - Advanced Mode now shows EVERYTHING with nothing hidden
  - Changed from toggle checkbox to dropdown select for better UX

### 2. Price Information Display System
- **Two Display Options:**
  - **Hover Tab**: Shows price info (OHLCV) in a tab above the chart when hovering over candles
  - **Click Popup**: Shows detailed candle info in a popup when clicking on candles
  
- **Position Changes:**
  - Removed global candle info tab from top of page
  - Each chart now has its own individual candle info tab
  - Info tabs appear directly above the chart being hovered (not at page top)
  - Tab automatically hides when mouse leaves the chart

### 3. User Preferences
- Added "Display Mode" dropdown: Clear / Advanced
- Added "Price Info Style" dropdown: Hover Tab / Click Popup
- Settings are saved and persist across sessions
- Automatic migration from old `advancedMode` boolean to new `viewMode` system

## Technical Implementation

### HTML Changes
- Removed global `#candleInfoTab` element
- Added individual candle info tabs per chart: `#candleInfoTab-{tfId}`
- Wrapped charts in `.tf-chart-wrapper` div
- Updated settings section with new dropdown controls

### JavaScript Changes
- Added `DEFAULT_SETTINGS` constant with all default values
- Updated `viewMode` setting: 'clear' or 'advanced'
- Added `candlePopupType` setting: 'hover-tab' or 'click-popup'
- Modified `updateCandleInfoTab()` to work with per-chart tabs using tfId
- Updated event handlers:
  - `mousemove`: Only shows tab if in hover-tab mode
  - `click`: Only shows popup if in click-popup mode (changed from double-click)
  - `mouseleave`: Hides the chart-specific info tab
- Settings migration logic for backward compatibility

### CSS Changes
- Renamed `.simple-mode` to `.clear-mode`
- Added `.tf-chart-wrapper` flex container
- Updated `.candle-info-tab` to be hidden by default
- Tab shows with `display: flex` when toggled visible
- Maintained responsive design for mobile

## User Experience Improvements

1. **More Control**: Users can choose exactly how they want to see price information
2. **Better Context**: Info appears above the specific chart being analyzed
3. **Cleaner Interface**: No more persistent global tab at the top
4. **Flexible Modes**: Clear mode for quick overview, Advanced mode for detailed analysis
5. **Intuitive Settings**: Dropdown selects are clearer than toggle switches for multiple options

## Compatibility
- Automatically migrates old `advancedMode` settings to new `viewMode`
- All previous functionality maintained with new features added
- Settings persist in localStorage

## Version
- Version: 3.6
- Date: December 2024
- Previous Version: 3.5
