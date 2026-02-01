# MTFCCM v3.7 Changelog

## 🚀 New Features

### Real-Time WebSocket Connection
- **Binance WebSocket** for instant price updates (no more 2-second delay!)
- Connection status indicator (🟢 connected, 🟡 connecting, 🔴 disconnected)
- Automatic reconnection with exponential backoff
- Falls back to HTTP polling if WebSocket fails

### PWA Support (Install on Android/iOS)
- Full Progressive Web App support
- "Add to Home Screen" functionality
- Offline support with Service Worker
- Install prompt banner for first-time visitors
- Works like a native app on mobile

### Keyboard Shortcuts
- `1-6` - Toggle timeframes on/off
- `↑/↓` - Navigate coins list
- `Enter` - Select highlighted coin
- `S` - Toggle sidebar
- `T` - Cycle themes (Dark → Light Simple → Light Colorful)
- `Esc` - Close popups/sidebar
- `?` - Show all shortcuts

### Different Alert Sounds
- Timer alerts: Standard sine wave
- Overbought: Square wave (higher pitch)
- Oversold: Square wave (lower pitch)  
- Volume spike: Sawtooth wave (urgent)
- MACD cross: Triangle wave
- High confluence: Long sine wave
- Connection: Short confirmation beep

### Theme Toggle in Header
- Quick theme switch button 🌙/☀️/🎨 in header
- No need to open settings anymore
- Cycles through: Dark → Light Simple → Light Colorful

### Data Caching
- Candle data cached in localStorage
- Instant display when switching back to a coin
- 5-minute cache expiry for fresh data
- Significantly faster coin switching

### Loading Skeleton
- Shows animated placeholder UI while loading
- Better perceived performance
- No more "Loading..." text

### Remember Last Coin
- Automatically selects the last coin you were viewing
- Persists across page refreshes and sessions

## 🐛 Bug Fixes

- Fixed footer version (was stuck at v3.5)
- Improved sidebar update throttling for WebSocket data

## 📱 Mobile Improvements

- PWA install banner appears after 3 seconds
- Can dismiss and won't show again
- App icon and splash screen support
- Standalone mode (no browser chrome)

## 🔧 Technical Changes

- Added `manifest.json` for PWA
- Added `sw.js` service worker
- Added `icons/` folder (needs icon files)
- WebSocket connection management
- Cache management functions
- Keyboard event handling

## 📝 Files Changed

- `index.html` - PWA meta tags, manifest link, SW registration, install banner
- `styles.css` - Loading skeleton, WS status, keyboard hints, PWA banner
- `app.js` - WebSocket, caching, keyboard shortcuts, alert sounds
- `manifest.json` - NEW: PWA manifest
- `sw.js` - NEW: Service worker
- `icons/README.md` - NEW: Instructions for creating icons

## 🎯 Next Steps

1. Create PWA icons (see `icons/README.md`)
2. Deploy to Cloudflare Pages for better bandwidth
3. Test on Android/iOS devices
4. Consider adding push notifications for alerts
