# MTFCM Changelog

## v4.3.1 (Feb 2026)

### H/L Labels - Binance Style
- **At-candle positioning**: H/L price labels now float next to the actual highest/lowest candles on the chart (like Binance), instead of fixed badges in the upper-left corner.
- **Dashed connector lines**: Subtle dashed lines connect the label to the candle for visual clarity.
- **Smart positioning**: Labels auto-position left or right of the candle depending on chart position to avoid clipping.

### Custom Coin Dropdown
- **Icon-rich dropdown**: Main coin selector replaced with a custom dropdown showing coin icons, short names, and full names for each option.
- **Built-in search**: Type to filter coins directly in the dropdown.
- **Active/disabled states**: Current coin highlighted in accent color; coins already in comparison shown as disabled.
- **Slide-in animation**: Smooth open/close with arrow rotation.

### Theme Overhaul
- **"Light Colorful" → "Colorful"**: Renamed and completely reworked with much more vibrant purple/pink/green gradients.
- **Dark theme enhanced**: Richer accent colors — bull green (#34d399), bear pink (#fb7185), accent indigo (#818cf8), chart background deeper blue.
- **Colorful UI accents**: Header, cards, footer, buttons, and chart blocks all get gradient treatments in colorful mode.
- **Theme migration**: Users with old "light-colorful" setting automatically migrated.

### Ad Container Fix
- **Reduced height**: Ad banners reduced from 90px to 70px to be less intrusive.
- **Flex containment**: Added `flex-grow: 0` to prevent ads from expanding beyond their allocated space.

### Bug Fixes
- Updated all chart canvas color palettes to match new theme variables.
- Mini charts (sidebar, TF toggles) now use theme-appropriate colors for all 3 themes.

## v4.3.0 (Feb 2026)

### UX Overhaul
- **Main coin dropdown**: Replaced sidebar-based coin selection with a dropdown in the header area. Primary coin switching is now instant without opening a panel.
- **Sidebar → overlay**: Sidebar converted from sticky 180px panel to slide-in overlay on all screen sizes. Saves horizontal space for charts. Toggle via ☰ button in header.
- **Disabled duplicates**: Coins already added to comparison are disabled in the main dropdown to prevent conflicts.

### Visual Improvements
- **Candle hover highlight**: Increased highlight opacity from 0.06→0.14 (dark) / 0.05→0.10 (light) for much better visibility. Added hover highlight to added coin charts (previously main chart only).
- **Add button redesign**: Transformed from subtle dashed-border button to vibrant gradient button (accent→purple) with white text, shadow, and scale-up hover effect.
- **Price scale toggle wired**: The "Show Price Scale" checkbox now actually works — toggle shows/hides Binance-style price axis on right side of all charts with tick marks, current price indicator, and hover price highlight.

### Bug Fixes
- **Ad overlay fix**: Fixed main content height calculation that caused ad banners to overlap chart area. Changed from fixed `calc()` to flex-based `height: 100%`.
- **Theme change delay**: Wrapped chart redraws in `requestAnimationFrame()` so CSS variables apply before canvas reads theme colors. Added coins no longer flash wrong colors on theme switch.
- **Sidebar close button**: Removed conflicting CSS rules for `.sidebar-close` display.

### Misc
- **Name update**: "Multi-Timeframe Candle Close Monitor" → "Multi-Timeframe Confluence Monitor"
- **Meta description**: Added SEO meta description tag
- **Font preconnect**: Added `crossorigin` attribute to font preconnect links for better performance

## v4.2.0 (Feb 2026)

### 🔴 Critical Bug Fix
- **Fixed added coin refresh**: Periodic 30s refresh was calling a non-existent function (`fetchAddedCoinData`), meaning added coins NEVER updated after initial load. Now correctly calls `fetchAddedCoinFullData`.

### Layout Fixes
- **Horizontal bottom alerts**: Added CSS for `tf-bottom`, `tf-bottom-stats`, `tf-bottom-alerts` — badges (MACD↑, LowVol, RejLo) now display horizontally instead of stacking vertically.
- **Consistent row structure**: Added coins now use the same `tf-bottom` layout as the main coin for stats + alerts at bottom of each chart.
- **LowVol badge styling**: Added missing `.alert-group.vol-low` color class — LowVol badges were showing unstyled.
- **Fixed tablet alerts width**: Removed old fixed-width constraint (`95px`) on tablet breakpoint that was causing vertical stacking.

### Added Coin Improvements
- **Coin swap dropdown**: Added styled dropdown in each added coin block header to switch coins without remove/re-add workflow. Includes debounce protection against rapid switching.
- **Enhanced charts**: Added coin charts now render with full features — volume bars, EMA/MA lines, grid lines, H/L price labels (previously plain candlesticks only).
- **Chart rendering reliability**: Added zero-dimension guards, requestAnimationFrame-based retry logic with progressive backoff for canvas rendering. Charts no longer show broken image icons.
- **Parallel TF loading**: Added coin timeframes now fetch in parallel instead of sequential, dramatically faster initial render.

### Performance & Quality
- **Debounced resize handler**: Window resize now properly debounced (200ms) and includes added coin chart redraw.
- **Removed duplicate CSS**: Cleaned up 3 duplicate `.main-content` declarations and duplicate `.tf-stat-mini` rules.
- **Stale comment cleanup**: Removed references to old January 2025 data fetch approach.

---

## v4.1.0 (Feb 2026)

### 🔴 Critical Bug Fix
- **Fixed stale chart data**: Charts were showing historical data from Jan-Jun 2025 instead of current real-time candles. The `startTime` parameter was anchoring data to January 1, 2025, causing H/L prices to not match the current ticker price. Now fetches the most recent 200 candles per timeframe.

### Performance Improvements
- **Eliminated chart flickering**: Price updates (every 2s) no longer rebuild the entire DOM. Targeted price element updates replace full `renderTimeframeRows()` calls.
- **Parallel data fetching**: All timeframe candle data now loads simultaneously instead of sequentially, significantly reducing initial load time.

### New Features
- **Connection status indicator**: Green dot in header shows API connection health (green = connected, yellow = loading, red = error).

### Housekeeping
- **Naming consistency**: Updated all remaining MTFCCM references to MTFCM.
- **localStorage migration**: Automatic migration from old `mtfccm_*` storage keys to new `mtfcm_*` keys.
- **Standardized candle limit**: All API fetch calls now use consistent `CANDLE_LIMIT` constant (200 candles).

---

## v3.9.1 (Feb 2025)

### UI/UX Changes
- **Add Coin button** moved to TF controls row (after timeframe buttons)
- **Multi-coin panels:** Side-by-side layout with main coin having its own panel header
- **Coin panel header:** Shows logo, name, price, change%, watchlist star
- **Background decoration:** Crypto symbols (₿ Ξ ◎ ⬡ ▲) in all themes

### Bug Fixes
- **Coin logos:** Improved logo source (CryptoCompare CDN) with better fallback
- **VWAP:** Verified working - toggle in TF Settings → Chart Indicators

### About Eye Icon (👁️)
The eye button next to Coins is **Quick Glance Mode** - a minimalist view showing only price and confluence bar. Can be removed if not needed.

---

## v3.9 (Feb 2025)

### Major Changes
- **Pattern Toggles:** Individual checkboxes for each of 19 patterns in TF Settings
  - Select All / Deselect All buttons
  - Settings persist
- **Coin Comparison Panel:** Side-by-side coin comparison (replaces modal)
  - Up to 3 additional coins
  - Mini charts with 24h candles
  - Real-time price updates
- **Settings Reorganization:**
  - Moved all chart indicators to TF Settings
  - Volume, MA, EMA, VWAP toggles in one place
  - MA/EMA period inputs in TF Settings
  - Volume style selector (Buy/Sell Split or Regular)
- **Removed:** Old multi-coin modal, Indicators modal button

### UI Changes
- Removed 📊 Multi-Coin button from header
- Primary coin area on left, comparison panel on right
- Mobile: Stacks vertically

---

## v3.8.2 (Feb 2025)

### Bug Fix
- **FIXED:** High/Low now shows per-timeframe candle data (not 24h data)
  - Previously: All TFs showed same H/L (24h high/low)
  - Now: Each TF shows its current candle's high/low

### New Features
- **Volume Style Option:** Choose between two volume display types in Indicators modal:
  - **Buy/Sell Split** (default) - Green buy stacked on red sell
  - **Regular** - Single color based on candle direction

### Confirmed Existing Features ✅
These features were already present:
- Buy/Sell volume split visualization
- VWAP indicator (purple line - enable in Indicators)
- High/Low price labels on chart candles (green H: / red L:)
- Hover to see OHLCV for any candle
- Pinch-to-zoom (partial - needs refinement later)
- 20% taller charts

---

## v3.8.1 (Feb 2025)

### Changes
- Removed price, % change, high/low from top header bar (now shown in each TF row)
- Added ad placement areas (top banner + bottom banner)
- Ad containers styled and ready for AdSense integration
- Simplified header to show only coin name + star button

---

## v3.8 (Feb 2025)

### Updates
- Version numbering standardized across all files
- Prepared ad integration framework (halal-filtered)
- Added donation/tip section support

### Halal Ad Compliance
- Configured category blocking for haram content
- Only halal-compliant spot exchanges allowed
- Islamic insurance (Takaful) permitted

---

## v3.7 (Feb 2025)

### New Features
- **Multi-Coin View** - Watch up to 4 coins side by side with individual timeframe controls
- **Price Info Per Timeframe** - Price, % change, 24h high/low now displayed in each TF row (after timer)
- **OHLCV Colors** - Open=Blue, High=Green, Low=Red, Close=Yellow, Volume=Purple
- **Theme Button Moved** - Theme toggle now in top-right header corner, 30% larger

### UI Changes
- Removed theme selector from Settings (use header button instead)
- Added 📊 multi-coin button next to theme toggle
- Each timeframe row now shows live price data

### New Coins
- AXL/USDT (Axelar)
- KAIA/USDT (Kaia)

### Bug Fixes
- Fixed missing high/low data in coin price display
- Improved price data fetching consistency

---

## v3.6 (Dec 2024)

### New Features
- **Simple/Advanced Mode** - Clear vs detailed interface
- **Candle Info Tab** - Hover shows OHLCV above each chart
- **Hover Tab vs Click Popup** - Choose your price info style
- **Watchlist** - Star your favorite coins
- **Quick Glance Mode** - Minimalist view
- **Confluence History** - Track high confluence moments
- **15+ Candlestick Patterns** - Auto-detected on charts

### Keyboard Shortcuts
- `1-6` = Toggle timeframes
- `↑↓` = Navigate coins
- `S` = Toggle sidebar
- `T` = Cycle themes
- `?` = Show all shortcuts

---

## v3.5 and Earlier

- Initial release with core features
- Multi-timeframe analysis
- Confluence scoring
- RSI, MACD, Volume indicators
- 3 theme options (Dark, Light, Colorful)
- 40+ cryptocurrency pairs
- Mobile responsive design
