# MTFCM Development Roadmap & History

## 📊 Project Overview

**MTFCM** (Multi-Timeframe Candle Close Monitor) is a halal-compliant cryptocurrency trading analysis tool that monitors multiple timeframes simultaneously to generate confluence scores for spot trading decisions.

**Core Philosophy:** Community benefit over profit maximization, strict halal compliance.

---

## 📈 Complete Version History

### Version 1.x - Foundation Era

| Version | app.js | Coins | Key Features |
|---------|--------|-------|--------------|
| **v1.0** | 27KB (789 lines) | 7 | Basic TF monitoring, Confluence scoring, RSI/MACD, Dark theme |

**v1.0 Features:**
- 6 timeframes: 1m, 5m, 15m, 30m, 1h, 4h
- Basic confluence calculation
- RSI and MACD indicators
- Timer countdown to candle close
- Sound alerts

---

### Version 2.x - Chart & Pattern Era

| Version | app.js | Coins | Key Features |
|---------|--------|-------|--------------|
| **v2.0** | 62KB (1,760 lines) | 7 | Mini charts, **History chart**, Historical markers |
| **v2.1-3** | 38KB (1,081 lines) | 7 | Confluence markers, Main chart view |
| **v2.2** | 44KB (1,215 lines) | 7 | RSI/MACD arrays for charts |
| **v2.3** | 45KB (1,166 lines) | 23 | **Interactive charts** (pan/zoom), Coin filtering |
| **v2.4** | 46KB (1,194 lines) | 23 | **Collapsible sidebar**, Mobile navigation |
| **v2.5** | 54KB (1,417 lines) | 23 | **15+ Candlestick patterns** detection |
| **v2.6** | 54KB (1,418 lines) | 23 | Pattern refinements |
| **v2.7** | 60KB (1,558 lines) | 23 | UI improvements |
| **v2.8** | 62KB (1,628 lines) | 23 | More patterns, RSI enhancements |
| **v2.9** | 71KB (1,860 lines) | 35 | **Expanded to 35 coins**, Stability fixes |

**Key v2.x Features:**
- History chart showing confluence over time (v2.0)
- Confluence markers on charts (v2.1-3)
- Pan/zoom chart interaction (v2.3)
- 15+ candlestick pattern detection (v2.5):
  - Single: Doji, Hammer, Inverted Hammer, Hanging Man, Shooting Star, Marubozu, Spinning Top
  - Double: Bullish/Bearish Engulfing, Bullish/Bearish Harami, Piercing Line, Dark Cloud Cover, Tweezer Top/Bottom
  - Triple: Morning Star, Evening Star, Three White Soldiers, Three Black Crows

---

### Version 3.x - Modern Era

| Version | app.js | Coins | Key Features |
|---------|--------|-------|--------------|
| **v3.0** | 82KB (2,117 lines) | 46 | **Major UI overhaul**, 3 themes, Weight methods |
| **v3.0-Enhanced** | 45KB (1,298 lines) | 46 | HiDPI charts, Buy/Sell volume, VWAP, Pinch-zoom |
| **v3.1** | 84KB (2,146 lines) | 46 | Bug fixes |
| **v3.2** | 84KB (2,146 lines) | 46 | Performance improvements |
| **v3.3** | 92KB (2,361 lines) | 46 | **Watchlist** feature |
| **v3.5** | 108KB (2,737 lines) | 46 | **Quick Glance**, **Confluence History** tracking |
| **v3.6** | 112KB (2,826 lines) | 46 | View modes (Clear/Advanced), Candle info tabs |
| **v3.7** | 112KB (2,803 lines) | 46 | **OHLCV colors**, Per-TF price display |
| **v3.8** | 128KB (3,254 lines) | 48 | Multi-coin modal, Ad placements |
| **v3.8.1** | 128KB | 48 | Header cleanup, Ad placements |
| **v3.8.2** | 130KB | 48 | Per-TF High/Low fix, Volume style option |
| **v3.9** | ~140KB | 48 | **Pattern toggles**, **Side coin comparison**, Reorganized settings |

**Key v3.x Features:**

**v3.0 - Major Overhaul:**
- Modern UI design
- 3 themes: Dark, Light Simple, Light Colorful
- Weight methods: Equal, Linear, Exponential, Tiered

**v3.0-Enhanced - Visual Upgrade:**
- HiDPI/Retina chart rendering
- Buy/Sell volume split (green buy, red sell stacked)
- VWAP indicator
- H/L price labels on charts
- Pinch-to-zoom (mobile)
- 20% taller charts

**v3.3 - Watchlist:**
- Star/favorite coins
- Watchlist tab in sidebar
- Persistent storage

**v3.5 - Analysis Tools:**
- Quick Glance mode (minimalist view)
- Confluence History tracking
- Historical high-confluence moments

**v3.6 - Display Options:**
- Clear vs Advanced view modes
- Hover Tab vs Click Popup for candle info
- Per-chart info tabs

**v3.9 - Settings Reorganization (Current):**
- Pattern toggle checkboxes (select which patterns to show)
- Side-by-side coin comparison (up to 3 coins)
- All indicators moved to TF Settings
- Volume style option (Buy/Sell Split or Regular)

---

## 🔧 Technical Architecture

### File Structure (v3.9)
```
mtfccm-web/
├── index.html          - Main HTML structure (~400 lines)
├── styles.css          - All styling (~3,400 lines)
├── app.js              - Application logic (~3,600 lines)
├── coins.js            - Coin configs & settings (~480 lines)
├── README.md           - Documentation
├── CHANGELOG.md        - Version history
├── ROADMAP.md          - This file
└── HALAL_AD_POLICY.md  - Ad filtering rules
```

### Core Components
1. **State Management** - Central state object with all app data
2. **Data Fetching** - Binance API (REST + future WebSocket)
3. **Chart Rendering** - Canvas-based candlestick charts
4. **Indicator Calculation** - RSI, MACD, MA, EMA, VWAP
5. **Pattern Detection** - 19 candlestick patterns
6. **Confluence Engine** - Multi-TF scoring with weight methods
7. **Alert System** - Sound + visual alerts

### Data Sources
- **Binance API** - `/api/v3/klines` for candle data
- **Binance API** - `/api/v3/ticker/24hr` for price data

---

## 📜 Feature Reference

### Currently Available (v3.9)

| Category | Features |
|----------|----------|
| **Timeframes** | 1m, 5m, 15m, 30m, 1h, 4h |
| **Coins** | 48 cryptocurrencies |
| **Indicators** | RSI, MACD, MA, EMA, VWAP |
| **Patterns** | 19 candlestick patterns (toggleable) |
| **Display** | 3 themes, Clear/Advanced modes |
| **Interaction** | Pan, zoom, hover, click |
| **Organization** | Watchlist, Coin comparison |
| **Analysis** | Confluence scoring, History tracking |
| **Alerts** | Sound alerts, Visual badges |

### Pattern Detection (19 Total)

**Single Candle:**
- Doji, Hammer, Inverted Hammer, Hanging Man
- Shooting Star, Marubozu, Spinning Top

**Double Candle:**
- Bullish Engulfing, Bearish Engulfing
- Bullish Harami, Bearish Harami
- Piercing Line, Dark Cloud Cover
- Tweezer Top, Tweezer Bottom

**Triple Candle:**
- Morning Star, Evening Star
- Three White Soldiers, Three Black Crows

---

## 🗺️ Future Roadmap

### Short-term (Next Updates)
- [ ] Pinch-to-zoom refinements for mobile
- [ ] Historical markers review & refinement
- [ ] Confluence calculation verification
- [ ] History chart integration (from v2.0)

### Medium-term
- [ ] WebSocket real-time updates
- [ ] Price alerts (notify at target price)
- [ ] Chart drawings (trendlines, horizontals)
- [ ] More indicator options (Bollinger, Stochastic)

### Long-term
- [ ] PWA (Progressive Web App) for mobile
- [ ] More exchange support
- [ ] Custom alert conditions
- [ ] Session stats tracking
- [ ] Coin notes/journal

---

## 💰 Monetization

### Implemented
- [x] Google AdSense (halal-filtered) - Top & bottom banners
- [x] Donation/tip jar (BTC, ETH, USDT)

### Halal Ad Policy
See `HALAL_AD_POLICY.md` for complete filtering rules.

**Blocked:** Gambling, alcohol, tobacco, interest-based loans, conventional banks, adult content, music streaming

**Allowed:** Halal spot exchanges, Takaful (Islamic insurance), halal food, modest fashion

---

## 🤲 Halal Compliance

MTFCM is designed for **halal spot trading only**:
- ❌ No leverage trading features
- ❌ No futures/margin integration
- ❌ No short selling tools
- ❌ No interest-based instruments
- ✅ Spot trading analysis only
- ✅ Educational focus
- ✅ Halal-filtered advertising

---

## 📊 Growth Statistics

| Metric | v1.0 | v3.9 | Growth |
|--------|------|------|--------|
| app.js size | 27KB | ~140KB | +419% |
| Lines of code | 789 | ~3,600 | +356% |
| Coins supported | 7 | 48 | +586% |
| Patterns | 0 | 19 | New |
| Themes | 1 | 3 | +200% |
| Features | ~5 | 30+ | +500% |

---

## 📋 Version Archives

| Version | Files Available | Notable Features |
|---------|-----------------|------------------|
| v2.0 | MTFCM-Web-v2.zip | History Chart |
| v2.1-3 | MTFCM-Web-v2_1-3.zip | Confluence Markers |
| v2.5 | MTFCM-Web-v2_5.zip | Pattern Detection |
| v3.0 | MTFCM-Web-v3_0.zip | UI Overhaul |
| v3.0-Enhanced | MTFCM-Web-v3_0-Enhanced.zip | HiDPI, VWAP, Buy/Sell Vol |
| v3.6 | mtfccm-web-v3_6.zip | View Modes |
| v3.9 | MTFCM-Web-v3.9.zip | Current |

---

*Document updated: February 2025*
*Current Version: v3.9*
