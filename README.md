# MTFCM — Multi-Timeframe Confluence Monitor

**v4.7.4** | ☪️ Halal Spot-Only Crypto Trading Tool

---

## What is MTFCM?

MTFCM is a real-time cryptocurrency analysis application built for the Muslim trading community. It monitors multiple timeframes simultaneously, calculates confluence scores from technical indicators, and generates actionable buy/sell signals — all while strictly adhering to halal trading principles.

**Core principle:** Spot trading only. No leverage, no shorting, no interest-based instruments.

---

## Features

### 📊 Main Application (`index.html`)

- **Multi-timeframe analysis** across 1m, 5m, 15m, 30m, 1h, 4h
- **Real-time Binance data** with 2-second price updates and 5-second candle refreshes
- **Confluence scoring engine** with 4 weighting methods (Equal, Linear, Exponential, Tiered)
- **48+ cryptocurrency pairs** pre-configured with icons and proper decimal formatting
- **Interactive candlestick charts** with zoom, pan, and multiple overlays (EMA, SMA, VWAP, RSI, MACD, Volume, S/R levels)
- **19 candlestick pattern detection** — Doji, Hammer, Engulfing, Harami, Stars, Marubozu, and more
- **Market signal alerts** — Volume spikes, MACD crossovers, RSI extremes, wick rejections
- **Multi-coin view** — monitor several coins side by side
- **Watchlist** with favorites saved to localStorage
- **Dark/Light theme** toggle
- **Mobile responsive** design

### 🧪 Strategy Tester (`backtest.html`)

- **Dual calculation engine:**
  - **Classic mode** — Direction (60%) + Momentum (40%) formula with Body/Volume/Indicator modifiers
  - **Modular mode** — Individual component selection with full control
- **Flexible Moving Average system** — choose EMA, SMA, VWAP (or any combination) with periods 7, 9, 12, 21, 50, 100, 200
- **Price ≥ MA** — checks price against all selected Type × Period combos
- **MA Alignment** — detects bullish/bearish MA stacking order
- **19 individually selectable candle patterns** grouped by 1-candle, 2-candle, and 3-candle formations
- **Market signal integration** — Volume, MACD, RSI, Wick, and Candle signals as scoring components
- **4 trailing stop options** — None, Breakeven, Trailing %, Step trailing
- **Historical backtesting** with equity curves and trade logs
- **Live paper trading** mode with real-time signals
- **All Combinations Matrix** — tests 32 (Classic) or 24 (Modular) parameter combinations to find optimal settings
- **Hover tooltips** on every component explaining what it measures and how it scores

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Main application — multi-timeframe monitor |
| `app.js` | Core application logic — data fetching, indicators, charts, patterns |
| `styles.css` | All styling — responsive, dark/light themes |
| `coins.js` | Coin configuration — symbols, names, icons, decimals |
| `backtest.html` | Strategy tester — backtesting, live paper trading, combination matrix |
| `logo.svg` | MTFCM logo |
| `README.md` | This file |
| `HALAL_AD_POLICY.md` | Halal advertising guidelines for ad integration |

---

## Setup

1. Download or clone the project
2. Open `index.html` in any modern browser
3. No build step, no server, no dependencies — it runs entirely client-side
4. Data comes from the public Binance API (no API key required)

---

## Halal Compliance

MTFCM is designed from the ground up for halal trading:

- **Spot only** — buy the asset, sell the asset. No leverage, no margin, no futures
- **No short selling** — the strategy tester only opens long positions
- **No interest** — no borrowing, no lending, no yield-farming features
- **Halal ad policy** — see `HALAL_AD_POLICY.md` for advertising guidelines that block gambling, alcohol, interest-based products, and other haram categories
- **Community over profit** — the tool is educational and focused on helping traders make informed decisions

---

## Technical Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks, no build tools)
- **Data:** Binance REST API (public endpoints, no authentication)
- **Charts:** Custom canvas-based candlestick rendering
- **Storage:** localStorage for user preferences, watchlist, and settings
- **Indicators:** RSI, MACD, EMA, SMA, VWAP calculated locally from raw candle data

---

## Strategy Tester — How It Works

### Classic Mode
Each timeframe gets a score from Direction (60%) and Momentum (40%). Optional modifiers (Body strength, Volume, Indicators) adjust the weight of each TF. The weighted scores combine into a 0-100% confluence score.

### Modular Mode
You pick exactly which components contribute to the score. Each enabled component returns a value between −1 and +1 per timeframe. The average across all enabled components becomes the TF score, which is then weighted by the selected method.

**Components available:**
- 🕯️ Candle: Direction, Close Position
- 📊 Moving Averages: Price ≥ MA, MA Alignment (configurable type and periods)
- 📈 Momentum: RSI Zone, RSI Direction, MACD Histogram, MACD Cross
- ⚡ Confirmation: Body Size, Volume Ratio
- 🕯️ 19 Candle Patterns: individually toggleable
- 📡 Market Signals: Volume, MACD, RSI, Wick Rejections, Candle Signals

---

## Limitations

- Uses close prices for entry — real execution may differ
- Stop loss and take profit evaluated against candle high/low
- Historical results do not guarantee future performance
- VWAP calculation uses session candles (not intraday reset)
- Educational tool — not financial advice

---

## Support

If MTFCM helps your trading, consider supporting development:
- BTC / ETH / USDT donations (addresses in the app footer)
- Feedback and bug reports welcome

**JazakAllahu Khayran** 🤲

---

*v4.7.4 — February 2026*
