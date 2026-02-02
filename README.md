# MTFCCM - Multi-Timeframe Candle Close Monitor

## 🚀 Quick Start

1. Download all files to a folder
2. Open `index.html` in any web browser
3. That's it! No server needed.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Main web page |
| `styles.css` | Visual styling (dark/light theme) |
| `app.js` | Application logic |
| `coins.js` | **Edit this to add coins!** |

---

## ➕ How to Add More Coins

Open `coins.js` and add to the `COINS_CONFIG` array:

```javascript
const COINS_CONFIG = [
    {
        symbol: "BTCUSDT",
        name: "Bitcoin",
        shortName: "BTC",
        icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
        decimals: 2
    },
    {
        symbol: "ETHUSDT",
        name: "Ethereum",
        shortName: "ETH",
        icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
        decimals: 2
    },
    // ADD NEW COINS HERE 👇
    {
        symbol: "SOLUSDT",      // Binance trading pair
        name: "Solana",          // Full name
        shortName: "SOL",        // Short name for tabs
        icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
        decimals: 2              // Price decimal places
    }
];
```

### Finding Coin Icons

Use CoinGecko's API for icons:
- Go to: https://www.coingecko.com/
- Search for your coin
- Right-click the coin image → Copy image address
- Use the `small` version for best performance

### Common Coin Symbols (Binance)

| Coin | Symbol |
|------|--------|
| Bitcoin | BTCUSDT |
| Ethereum | ETHUSDT |
| Solana | SOLUSDT |
| XRP | XRPUSDT |
| BNB | BNBUSDT |
| Cardano | ADAUSDT |
| Dogecoin | DOGEUSDT |
| Polygon | MATICUSDT |
| Polkadot | DOTUSDT |
| Avalanche | AVAXUSDT |
| Chainlink | LINKUSDT |
| Litecoin | LTCUSDT |

---

## 🌐 Hosting Options (All Free!)

### Option 1: GitHub Pages
1. Create a GitHub repository
2. Upload all files
3. Go to Settings → Pages → Enable
4. Your site: `https://yourusername.github.io/repo-name`

### Option 2: Netlify
1. Go to https://netlify.com
2. Drag and drop your folder
3. Get instant URL

### Option 3: Vercel
1. Go to https://vercel.com
2. Import from GitHub or upload
3. Automatic deployment

### Option 4: Local Only
Just open `index.html` in your browser. Works offline after first load!

---

## ⚙️ Features

- ⏱️ **Countdown Timers** - See time until each timeframe closes
- 📊 **Confluence Scoring** - Weighted analysis across timeframes
- 📈 **RSI & MACD** - Technical indicators per timeframe
- 🔔 **Alerts** - Sound when multiple timeframes close together
- 🌙 **Dark/Light Theme** - Easy on the eyes
- 📱 **Mobile Friendly** - Works on phones and tablets
- ☪️ **Halal Compliant** - Spot trading focus only

---

## 🔧 Settings

Click the ⚙️ icon to configure:

| Setting | Description |
|---------|-------------|
| Alert before close | Seconds before candle close to alert |
| Minimum confluence | How many TFs must close together for alert |
| Weighting method | Equal, Linear, Exponential, or Tiered |
| Weight modifiers | Candle strength, volume, RSI/MACD confirmation |
| Display options | Toggle RSI, MACD, Volume, Warnings |

---

## 📱 Mobile Usage

The website is fully responsive. Just open it in your phone's browser and add to home screen for app-like experience.

---

## 🔗 API Used

- **Binance Public API** (Free, no API key needed)
- Real-time price updates every 2 seconds
- Candle data updates every 5 seconds

---

## ⚠️ Disclaimer

This tool is for informational purposes only. Not financial advice. Always do your own research before trading. Trade at your own risk.

---

## 📝 Version

**MTFCCM Web v3.8.2**

Made with ❤️ for halal crypto trading
