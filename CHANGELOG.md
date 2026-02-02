# MTFCCM Changelog

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
