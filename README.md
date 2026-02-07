# MTFCM - Multi-Timeframe Confluence Monitor

## 🚀 Quick Start

1. Download all files to a folder
2. Open `index.html` in any web browser
3. That's it! No server needed.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Main web page |
| `styles.css` | Visual styling (3 themes) |
| `app.js` | Application logic |
| `coins.js` | **Edit this to add coins!** |

---

## ➕ How to Add More Coins

Open `coins.js` and add to the `COINS_CONFIG` array:

```javascript
const COINS_CONFIG = [
    {
        symbol: "BTCUSDT",       // Binance trading pair
        name: "Bitcoin",          // Full name
        shortName: "BTC",         // Short display name
        icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
        decimals: 2               // Price decimal places
    },
    // ADD NEW COINS HERE
];
```

### Finding Coin Icons

Use CoinGecko for icons — search your coin, right-click the image, copy address. Use the `small` version.

---

## ⚙️ Features

- ⏱️ **Countdown Timers** — Time until each TF closes
- 📊 **Confluence Scoring** — Weighted analysis across 6 timeframes (1m to 4h)
- 📈 **Technical Indicators** — RSI, MACD, EMA, MA, VWAP
- 🕯️ **Interactive Charts** — Pan, zoom, hover for OHLCV
- 🔢 **Price Scale** — Toggle Binance-style price axis
- 🕯️ **Candle Patterns** — 19 patterns (doji, engulfing, hammer, etc.)
- ➕ **Multi-Coin Compare** — Up to 3 coins side-by-side
- 🔔 **Alerts** — Sound + badge for confluence and indicators
- 🌙 **3 Themes** — Dark, Light Simple, Light Colorful
- ⭐ **Watchlist** — Star coins for quick access
- 📱 **Mobile Friendly** — Responsive for all devices
- ☪️ **Halal Compliant** — Spot only, no leverage/shorts

---

## 🔧 Settings

Click ⚙️ to configure alerts, weighting method, chart indicators, display options, and pattern toggles.

---

## 🌐 Hosting (Free)

- **GitHub Pages** — Upload to repo, enable Pages
- **Netlify** — Drag and drop folder
- **Vercel** — Import and deploy
- **Local** — Just open `index.html`

---

## 🔗 API

- **Binance Public API** (free, no key needed)
- Price updates every 2s, candle data every 10s

---

## ⚠️ Disclaimer

For informational purposes only. Not financial advice. Trade at your own risk.

---

**MTFCM Web v4.3.0** | Made with ❤️ for halal crypto trading
