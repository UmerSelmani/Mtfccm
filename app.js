/**
 * MTFCM - Multi-Timeframe Confluence Monitor
 * Main Application Logic v4.3.1 - H/L at-candle labels, custom dropdown, vibrant themes
 */

const APP_VERSION = "4.3.0";

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    currentCoin: null,
    coins: [],
    coinData: {}, // Stores price/volume/change data for sorting
    currentSort: 'default',
    timeframes: [],
    settings: {},
    data: {},
    candles: {},
    patterns: {}, // Detected patterns per TF
    chartStates: {},
    globalZoom: 1,
    confluenceHistory: [], // Historical high confluence moments
    lastRecordedPrice: null, // For tracking price movement after confluence
    hintTimeout: null, // For keyboard hint display
    intervals: {
        price: null,
        candles: null,
        timer: null
    }
};

// Number of candles to fetch per timeframe
const CANDLE_LIMIT = 200;

// ============================================
// CANDLESTICK PATTERN DEFINITIONS
// ============================================

const PATTERNS = {
    // Single candle patterns
    doji: { name: 'Doji', emoji: '✚', type: 'neutral', spans: 1 },
    hammer: { name: 'Hammer', emoji: '🔨', type: 'bullish', spans: 1 },
    invertedHammer: { name: 'Inv Hammer', emoji: '⚒️', type: 'bullish', spans: 1 },
    hangingMan: { name: 'Hanging Man', emoji: '🧍', type: 'bearish', spans: 1 },
    shootingStar: { name: 'Shoot Star', emoji: '💫', type: 'bearish', spans: 1 },
    marubozu: { name: 'Marubozu', emoji: '▮', type: 'neutral', spans: 1 },
    spinningTop: { name: 'Spin Top', emoji: '🔄', type: 'neutral', spans: 1 },
    
    // Two candle patterns
    bullishEngulfing: { name: 'Bull Engulf', emoji: '🟢⬆️', type: 'bullish', spans: 2 },
    bearishEngulfing: { name: 'Bear Engulf', emoji: '🔴⬇️', type: 'bearish', spans: 2 },
    bullishHarami: { name: 'Bull Harami', emoji: '🟢🤰', type: 'bullish', spans: 2 },
    bearishHarami: { name: 'Bear Harami', emoji: '🔴🤰', type: 'bearish', spans: 2 },
    piercingLine: { name: 'Piercing', emoji: '🗡️', type: 'bullish', spans: 2 },
    darkCloudCover: { name: 'Dark Cloud', emoji: '☁️', type: 'bearish', spans: 2 },
    tweezerTop: { name: 'Tweez Top', emoji: '🔝🔝', type: 'bearish', spans: 2 },
    tweezerBottom: { name: 'Tweez Bot', emoji: '🔻🔻', type: 'bullish', spans: 2 },
    
    // Three candle patterns
    morningStar: { name: 'Morning ⭐', emoji: '🌅', type: 'bullish', spans: 3 },
    eveningStar: { name: 'Evening ⭐', emoji: '🌆', type: 'bearish', spans: 3 },
    threeWhiteSoldiers: { name: '3 Soldiers', emoji: '💂💂💂', type: 'bullish', spans: 3 },
    threeBlackCrows: { name: '3 Crows', emoji: '🐦‍⬛🐦‍⬛🐦‍⬛', type: 'bearish', spans: 3 }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadSettings();
    applyTheme(state.settings.theme);
    
    state.coins = COINS_CONFIG;
    state.timeframes = TIMEFRAMES_CONFIG;
    
    renderCoinsSidebar();
    populateMainCoinSwap();
    setupMainCoinDropdown();
    renderTFTogglesWithTimers();
    loadChartOptions();
    
    // Fetch data for all coins (for sorting)
    fetchAllCoinsData();
    
    // Load last selected coin or default to first
    const lastCoin = state.settings.lastCoin;
    const coinToSelect = lastCoin && state.coins.find(c => c.symbol === lastCoin) 
        ? lastCoin 
        : state.coins[0]?.symbol;
    
    if (coinToSelect) {
        selectCoin(coinToSelect);
    }
    
    setupEventListeners();
    setupSortListener();
    startTimerLoop();
    
    // Refresh coin data periodically
    setInterval(fetchAllCoinsData, 30000);
}

function setupSortListener() {
    const sortSelect = document.getElementById('coinSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value;
            renderCoinsSidebar();
        });
    }
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================

function loadSettings() {
    const saved = localStorage.getItem('mtfcm_settings');
    state.settings = saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
    
    // Migrate from old MTFCCM key
    if (!saved) {
        const oldSaved = localStorage.getItem('mtfccm_settings');
        if (oldSaved) {
            state.settings = JSON.parse(oldSaved);
            localStorage.setItem('mtfcm_settings', oldSaved);
            localStorage.removeItem('mtfccm_settings');
        }
    }
    
    // Ensure patterns setting exists
    if (state.settings.showPatterns === undefined) {
        state.settings.showPatterns = true;
    }
    
    // Migrate old theme name
    if (state.settings.theme === 'light-colorful') {
        state.settings.theme = 'colorful';
        saveSettings();
    }
    
    // Migrate old advancedMode to new viewMode
    if (state.settings.advancedMode !== undefined && state.settings.viewMode === undefined) {
        state.settings.viewMode = state.settings.advancedMode ? 'advanced' : 'clear';
        delete state.settings.advancedMode;
    }
    
    // Ensure viewMode exists
    if (!state.settings.viewMode) {
        state.settings.viewMode = 'advanced';
    }
    
    // Ensure candlePopupType exists
    if (!state.settings.candlePopupType) {
        state.settings.candlePopupType = 'hover-tab';
    }
    
    const tfStates = localStorage.getItem('mtfcm_timeframes');
    if (tfStates) {
        const parsed = JSON.parse(tfStates);
        state.timeframes.forEach(tf => {
            if (parsed[tf.id] !== undefined) {
                tf.enabled = parsed[tf.id];
            }
        });
    }
    
    // Apply view mode (clear shows less, advanced shows everything)
    if (state.settings.viewMode === 'clear') {
        document.body.classList.add('clear-mode');
    } else {
        document.body.classList.remove('clear-mode');
    }
    
    // Load inline form values
    loadInlineSettings();
}

function loadInlineSettings() {
    // Alert settings
    const alertSecondsEl = document.getElementById('alertSeconds');
    const minConfluenceEl = document.getElementById('minConfluence');
    const enableSoundEl = document.getElementById('enableSound');
    
    if (alertSecondsEl) alertSecondsEl.value = state.settings.alertSeconds || 30;
    if (minConfluenceEl) minConfluenceEl.value = state.settings.minConfluence || 2;
    if (enableSoundEl) enableSoundEl.checked = state.settings.enableSound !== false;
    
    // Confluence settings
    const weightMethodEl = document.getElementById('weightMethod');
    const useStrengthModEl = document.getElementById('useStrengthMod');
    const useVolumeModEl = document.getElementById('useVolumeMod');
    const useIndicatorModEl = document.getElementById('useIndicatorMod');
    
    if (weightMethodEl) weightMethodEl.value = state.settings.weightMethod || 'linear';
    if (useStrengthModEl) useStrengthModEl.checked = state.settings.useStrengthMod !== false;
    if (useVolumeModEl) useVolumeModEl.checked = state.settings.useVolumeMod !== false;
    if (useIndicatorModEl) useIndicatorModEl.checked = state.settings.useIndicatorMod !== false;
    
    // Display settings
    const themeSelectEl = document.getElementById('themeSelect');
    const viewModeSelectEl = document.getElementById('viewModeSelect');
    const candlePopupTypeEl = document.getElementById('candlePopupType');
    const showRSIEl = document.getElementById('showRSI');
    const showMACDEl = document.getElementById('showMACD');
    const showVolumeEl = document.getElementById('showVolume');
    
    if (themeSelectEl) themeSelectEl.value = state.settings.theme || 'dark';
    if (viewModeSelectEl) viewModeSelectEl.value = state.settings.viewMode || 'advanced';
    if (candlePopupTypeEl) candlePopupTypeEl.value = state.settings.candlePopupType || 'hover-tab';
    if (showRSIEl) showRSIEl.checked = state.settings.showRSI !== false;
    if (showMACDEl) showMACDEl.checked = state.settings.showMACD !== false;
    if (showVolumeEl) showVolumeEl.checked = state.settings.showVolume !== false;
    
    // Display Options (from TF Settings)
    const showPriceInfoEl = document.getElementById('showPriceInfo');
    const showTimersEl = document.getElementById('showTimers');
    const showIndicatorBadgesEl = document.getElementById('showIndicatorBadges');
    const showConfluenceBarEl = document.getElementById('showConfluenceBar');
    const showPriceScaleEl = document.getElementById('showPriceScale');
    
    if (showPriceInfoEl) showPriceInfoEl.checked = state.settings.showPriceInfo !== false;
    if (showTimersEl) showTimersEl.checked = state.settings.showTimers !== false;
    if (showIndicatorBadgesEl) showIndicatorBadgesEl.checked = state.settings.showIndicatorBadges !== false;
    if (showConfluenceBarEl) showConfluenceBarEl.checked = state.settings.showConfluenceBar !== false;
    if (showPriceScaleEl) showPriceScaleEl.checked = !!state.settings.showPriceScale;
}

function saveSettings() {
    // Save current coin
    if (state.currentCoin) {
        state.settings.lastCoin = state.currentCoin.symbol;
    }
    
    localStorage.setItem('mtfcm_settings', JSON.stringify(state.settings));
    
    const tfStates = {};
    state.timeframes.forEach(tf => {
        tfStates[tf.id] = tf.enabled;
    });
    localStorage.setItem('mtfcm_timeframes', JSON.stringify(tfStates));
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        if (theme === 'dark') themeBtn.textContent = '☀️';
        else if (theme === 'light-simple') themeBtn.textContent = '🎨';
        else if (theme === 'colorful') themeBtn.textContent = '🌙';
        else themeBtn.textContent = '🌙';
    }
}

function cycleTheme() {
    const themes = ['dark', 'light-simple', 'colorful'];
    const currentIndex = themes.indexOf(state.settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    state.settings.theme = themes[nextIndex];
    applyTheme(state.settings.theme);
    saveSettings();
    
    // Wait for CSS to apply before redrawing charts
    requestAnimationFrame(() => {
        renderTimeframeRows();
        redrawAddedCoinCharts();
    });
    
    const themeNames = { 'dark': 'Dark', 'light-simple': 'Light', 'colorful': 'Colorful' };
    showKeyboardHint(`Theme: ${themeNames[themes[nextIndex]]}`);
}

// Redraw all added coin charts (for theme changes, resize, etc.)
function redrawAddedCoinCharts() {
    if (!state.addedCoinCandles) return;
    Object.entries(state.addedCoinCandles).forEach(([key, data]) => {
        const parts = key.split('-');
        const tfId = parts[parts.length - 1];
        const symbol = parts.slice(0, -1).join('-');
        const canvasId = `chart-${symbol}-${tfId}`;
        const canvas = document.getElementById(canvasId);
        if (canvas && data.candles && data.coin) {
            drawAddedCoinChart(canvas, data.candles, data.coin);
        }
    });
}

function showKeyboardHint(message) {
    // Create or get hint element
    let hint = document.getElementById('keyboard-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'keyboard-hint';
        hint.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            border: 1px solid var(--accent-color);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(hint);
    }
    
    hint.textContent = message;
    hint.style.opacity = '1';
    
    clearTimeout(state.hintTimeout);
    state.hintTimeout = setTimeout(() => {
        hint.style.opacity = '0';
    }, 1500);
}

function loadChartOptions() {
    const rsiEl = document.getElementById('showChartRSI');
    const macdEl = document.getElementById('showChartMACD');
    const volumeEl = document.getElementById('showChartVolume');
    const patternsEl = document.getElementById('showChartPatterns');
    const maEl = document.getElementById('showChartMA');
    const emaEl = document.getElementById('showChartEMA');
    const vwapEl = document.getElementById('showChartVWAP');
    
    if (rsiEl) rsiEl.checked = state.settings.showChartRSI || false;
    if (macdEl) macdEl.checked = state.settings.showChartMACD || false;
    if (volumeEl) volumeEl.checked = state.settings.showChartVolume !== false;
    if (patternsEl) patternsEl.checked = state.settings.showPatterns !== false;
    if (maEl) maEl.checked = state.settings.showChartMA || false;
    if (emaEl) emaEl.checked = state.settings.showChartEMA !== false;
    if (vwapEl) vwapEl.checked = state.settings.showChartVWAP || false;
}

// ============================================
// COINS SIDEBAR
// ============================================

function renderCoinsSidebar() {
    const container = document.getElementById('coinsList');
    const watchlist = getWatchlist();
    
    // Get sorted coins based on current sort method
    let sortedCoins = getSortedCoins();
    
    container.innerHTML = sortedCoins.map(coin => {
        const coinInfo = state.coinData[coin.symbol] || {};
        const change = coinInfo.change || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changeText = coinInfo.change !== undefined ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '';
        const isWatched = watchlist.includes(coin.symbol);
        const confluenceScore = coinInfo.confluenceScore || 50;
        const biasClass = confluenceScore >= 60 ? 'bull' : confluenceScore <= 40 ? 'bear' : 'neutral';
        
        return `
        <div class="coin-item" data-symbol="${coin.symbol}">
            <img src="${coin.icon}" alt="${coin.name}" onerror="this.style.display='none'">
            <div class="coin-item-info">
                <div class="coin-item-name">${coin.shortName}</div>
                <div class="coin-item-full-name">${coin.name}</div>
                <div class="coin-item-quick-badge">
                    <div class="quick-confluence-mini">
                        <div class="quick-confluence-mini-fill ${biasClass}" style="width: ${confluenceScore}%"></div>
                    </div>
                    <span class="quick-bias-dot ${biasClass}"></span>
                </div>
            </div>
            ${changeText ? `<span class="coin-item-change ${changeClass}">${changeText}</span>` : ''}
            <button class="star-btn ${isWatched ? 'active' : ''}" data-symbol="${coin.symbol}">⭐</button>
        </div>
    `}).join('');
    
    container.querySelectorAll('.coin-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't select coin if clicking on star
            if (e.target.classList.contains('star-btn')) return;
            selectCoin(item.dataset.symbol);
            closeSidebar();
        });
    });
    
    // Star button handlers
    container.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWatchlist(btn.dataset.symbol);
        });
    });
    
    // Mark active coin
    if (state.currentCoin) {
        const activeItem = container.querySelector(`[data-symbol="${state.currentCoin.symbol}"]`);
        if (activeItem) activeItem.classList.add('active');
    }
}

function getSortedCoins() {
    let coins = [...state.coins];
    
    switch (state.currentSort) {
        case 'alpha':
            coins.sort((a, b) => a.shortName.localeCompare(b.shortName));
            break;
        case 'alpha-desc':
            coins.sort((a, b) => b.shortName.localeCompare(a.shortName));
            break;
        case 'volume':
            coins.sort((a, b) => {
                const volA = state.coinData[a.symbol]?.volume || 0;
                const volB = state.coinData[b.symbol]?.volume || 0;
                return volB - volA;
            });
            break;
        case 'change':
            coins.sort((a, b) => {
                const changeA = state.coinData[a.symbol]?.change || 0;
                const changeB = state.coinData[b.symbol]?.change || 0;
                return changeB - changeA;
            });
            break;
        case 'change-asc':
            coins.sort((a, b) => {
                const changeA = state.coinData[a.symbol]?.change || 0;
                const changeB = state.coinData[b.symbol]?.change || 0;
                return changeA - changeB;
            });
            break;
        default:
            // Keep default order
            break;
    }
    
    return coins;
}

async function fetchAllCoinsData() {
    // Fetch 24h ticker data for all coins for sorting purposes
    try {
        const symbols = state.coins.map(c => c.symbol);
        const promises = symbols.map(symbol => 
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );
        
        const results = await Promise.all(promises);
        
        results.forEach((data, i) => {
            if (data) {
                state.coinData[symbols[i]] = {
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChangePercent),
                    volume: parseFloat(data.quoteVolume),
                    high: parseFloat(data.highPrice),
                    low: parseFloat(data.lowPrice)
                };
            }
        });
        
        // Re-render if sorted by volume or change
        if (['volume', 'change', 'change-asc'].includes(state.currentSort)) {
            renderCoinsSidebar();
        }
    } catch (e) {
        console.error('Failed to fetch coins data:', e);
    }
}

function closeSidebar() {
    document.getElementById('coinsSidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
}

function openSidebar() {
    document.getElementById('coinsSidebar')?.classList.add('open');
    document.getElementById('sidebarOverlay')?.classList.add('active');
}

function filterCoins(query) {
    const items = document.querySelectorAll('.coin-item');
    const q = query.toLowerCase();
    
    items.forEach(item => {
        const symbol = item.dataset.symbol.toLowerCase();
        const name = item.querySelector('.coin-item-name')?.textContent.toLowerCase() || '';
        const fullName = item.querySelector('.coin-item-full-name')?.textContent.toLowerCase() || '';
        const match = symbol.includes(q) || name.includes(q) || fullName.includes(q);
        item.style.display = match ? '' : 'none';
    });
}

function selectCoin(symbol) {
    state.currentCoin = state.coins.find(c => c.symbol === symbol);
    state.candles = {};
    state.patterns = {};
    state.chartStates = {};
    
    document.querySelectorAll('.coin-item').forEach(item => {
        item.classList.toggle('active', item.dataset.symbol === symbol);
    });
    
    if (state.currentCoin) {
        const iconEl = document.getElementById('selectedCoinIcon');
        const nameEl = document.getElementById('selectedCoinName');
        const starBtn = document.getElementById('headerStarBtn');
        const mainTfBlock = document.getElementById('mainTfBlock');
        
        if (iconEl) {
            iconEl.src = state.currentCoin.icon;
            iconEl.style.display = 'block';
            iconEl.onerror = () => iconEl.style.display = 'none';
        }
        if (nameEl) {
            nameEl.textContent = state.currentCoin.shortName;
        }
        if (mainTfBlock) {
            mainTfBlock.dataset.symbol = symbol;
        }
        // Update star button state
        if (starBtn) {
            const watchlist = getWatchlist();
            const isStarred = watchlist.includes(symbol);
            starBtn.textContent = isStarred ? '★' : '☆';
            starBtn.classList.toggle('starred', isStarred);
        }
        
        // Sync custom coin dropdown trigger
        const ddIcon = document.getElementById('mainDDIcon');
        const ddName = document.getElementById('mainDDName');
        if (ddIcon) { ddIcon.src = state.currentCoin.icon; ddIcon.style.display = 'inline'; ddIcon.onerror = () => ddIcon.style.display = 'none'; }
        if (ddName) ddName.textContent = state.currentCoin.shortName;
        
        // Re-populate dropdown to update active/disabled states
        populateMainCoinSwap();
        
        // Update main block logo
        const mainLogo = document.getElementById('mainBlockLogo');
        if (mainLogo) {
            mainLogo.src = state.currentCoin.icon;
            mainLogo.style.display = 'block';
            mainLogo.onerror = () => mainLogo.style.display = 'none';
        }
    }
    
    clearInterval(state.intervals.price);
    clearInterval(state.intervals.candles);
    
    // Load confluence history for this coin
    loadConfluenceHistory();
    
    fetchPriceData();
    fetchAllCandleData();
    
    state.intervals.price = setInterval(fetchPriceData, 2000);
    state.intervals.candles = setInterval(fetchAllCandleData, 10000);
}

// Populate the main coin custom dropdown with icons
function populateMainCoinSwap() {
    const list = document.getElementById('mainCoinDDList');
    const trigger = document.getElementById('mainCoinTrigger');
    if (!list) return;
    
    const currentSymbol = state.currentCoin?.symbol;
    const currentCoin = state.currentCoin;
    
    // Update trigger display
    if (currentCoin && trigger) {
        const icon = document.getElementById('mainDDIcon');
        const name = document.getElementById('mainDDName');
        if (icon) { icon.src = currentCoin.icon; icon.style.display = 'inline'; icon.onerror = () => icon.style.display = 'none'; }
        if (name) name.textContent = currentCoin.shortName;
    }
    
    // Build dropdown items
    list.innerHTML = state.coins.map(coin => {
        const isAdded = state.addedCoins.includes(coin.symbol);
        const isActive = coin.symbol === currentSymbol;
        return `<div class="coin-dropdown-item ${isActive ? 'active' : ''} ${isAdded ? 'disabled' : ''}" data-symbol="${coin.symbol}">
            <img class="coin-item-icon" src="${coin.icon}" onerror="this.style.visibility='hidden'">
            <span class="coin-item-name">${coin.shortName}</span>
            <span class="coin-item-full">${coin.name}</span>
        </div>`;
    }).join('');
}

// Setup main coin dropdown interactions
function setupMainCoinDropdown() {
    const dropdown = document.getElementById('mainCoinDropdown');
    const trigger = document.getElementById('mainCoinTrigger');
    const menu = document.getElementById('mainCoinMenu');
    const search = document.getElementById('mainCoinDDSearch');
    const list = document.getElementById('mainCoinDDList');
    if (!dropdown || !trigger) return;
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        if (dropdown.classList.contains('open') && search) {
            search.value = '';
            filterMainCoinDD('');
            setTimeout(() => search.focus(), 50);
        }
    });
    
    // Search filter
    if (search) {
        search.addEventListener('input', (e) => filterMainCoinDD(e.target.value));
        search.addEventListener('click', (e) => e.stopPropagation());
    }
    
    // Item click
    if (list) {
        list.addEventListener('click', (e) => {
            const item = e.target.closest('.coin-dropdown-item');
            if (!item || item.classList.contains('disabled')) return;
            const symbol = item.dataset.symbol;
            if (symbol && symbol !== state.currentCoin?.symbol) {
                selectCoin(symbol);
            }
            dropdown.classList.remove('open');
        });
    }
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

function filterMainCoinDD(query) {
    const list = document.getElementById('mainCoinDDList');
    if (!list) return;
    const items = list.querySelectorAll('.coin-dropdown-item');
    const q = query.toLowerCase().trim();
    items.forEach(item => {
        const symbol = item.dataset.symbol.toLowerCase();
        const name = item.querySelector('.coin-item-full')?.textContent.toLowerCase() || '';
        item.style.display = (!q || symbol.includes(q) || name.includes(q)) ? 'flex' : 'none';
    });
}

// ============================================
// BINANCE API
// ============================================

const BINANCE_API = 'https://api.binance.com/api/v3';

async function fetchPriceData() {
    if (!state.currentCoin) return;
    
    const dot = document.getElementById('connectionDot');
    try {
        if (dot) dot.className = 'connection-dot loading';
        const response = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${state.currentCoin.symbol}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        updatePriceDisplay(data);
        if (dot) { dot.className = 'connection-dot'; dot.title = 'Connected'; }
    } catch (error) {
        console.error('Error fetching price:', error);
        if (dot) { dot.className = 'connection-dot error'; dot.title = 'Connection error'; }
    }
}

async function fetchCandleData(timeframe) {
    if (!state.currentCoin) return null;
    
    try {
        // Fetch most recent candles
        const response = await fetch(
            `${BINANCE_API}/klines?symbol=${state.currentCoin.symbol}&interval=${timeframe}&limit=${CANDLE_LIMIT}`
        );
        const data = await response.json();
        
        return data.map(candle => ({
            openTime: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            closeTime: candle[6]
        }));
    } catch (error) {
        console.error(`Error fetching ${timeframe} candles:`, error);
        return null;
    }
}

async function fetchAllCandleData() {
    const enabledTFs = state.timeframes.filter(tf => tf.enabled);
    
    // Fetch all timeframes in parallel for faster loading
    const results = await Promise.allSettled(
        enabledTFs.map(async (tf) => {
            const candles = await fetchCandleData(tf.id);
            return { tf, candles };
        })
    );
    
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.candles?.length > 0) {
            const { tf, candles } = result.value;
            state.candles[tf.id] = candles;
            state.patterns[tf.id] = detectAllPatterns(candles);
            state.data[tf.id] = analyzeCandles(candles, tf.id);
        }
    });
    
    renderTimeframeRows();
    calculateConfluence();
}

// ============================================
// CANDLESTICK PATTERN DETECTION
// ============================================

function detectAllPatterns(candles) {
    const patterns = [];
    
    for (let i = 0; i < candles.length; i++) {
        // Single candle patterns
        const single = detectSinglePatterns(candles, i);
        if (single) patterns.push({ index: i, ...single });
        
        // Two candle patterns (need at least 2 candles)
        if (i >= 1) {
            const double = detectDoublePatterns(candles, i);
            if (double) patterns.push({ index: i, ...double });
        }
        
        // Three candle patterns (need at least 3 candles)
        if (i >= 2) {
            const triple = detectTriplePatterns(candles, i);
            if (triple) patterns.push({ index: i, ...triple });
        }
    }
    
    return patterns;
}

function detectSinglePatterns(candles, i) {
    const c = candles[i];
    const range = c.high - c.low;
    if (range === 0) return null;
    
    const body = Math.abs(c.close - c.open);
    const bodyPct = body / range;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const upperWickPct = upperWick / range;
    const lowerWickPct = lowerWick / range;
    const isBullish = c.close > c.open;
    
    // Doji: Very small body
    if (bodyPct < 0.1) {
        return { pattern: 'doji', ...PATTERNS.doji };
    }
    
    // Marubozu: Full body, almost no wicks
    if (bodyPct > 0.9 && upperWickPct < 0.05 && lowerWickPct < 0.05) {
        return { pattern: 'marubozu', ...PATTERNS.marubozu, type: isBullish ? 'bullish' : 'bearish' };
    }
    
    // Spinning Top: Small body with wicks on both sides
    if (bodyPct < 0.3 && upperWickPct > 0.25 && lowerWickPct > 0.25) {
        return { pattern: 'spinningTop', ...PATTERNS.spinningTop };
    }
    
    // Check trend for hammer/shooting star patterns
    const trend = getTrend(candles, i, 5);
    
    // Hammer / Hanging Man: Small body at top, long lower wick
    if (bodyPct < 0.35 && lowerWickPct > 0.6 && upperWickPct < 0.1) {
        if (trend === 'down') {
            return { pattern: 'hammer', ...PATTERNS.hammer };
        } else if (trend === 'up') {
            return { pattern: 'hangingMan', ...PATTERNS.hangingMan };
        }
    }
    
    // Inverted Hammer / Shooting Star: Small body at bottom, long upper wick
    if (bodyPct < 0.35 && upperWickPct > 0.6 && lowerWickPct < 0.1) {
        if (trend === 'down') {
            return { pattern: 'invertedHammer', ...PATTERNS.invertedHammer };
        } else if (trend === 'up') {
            return { pattern: 'shootingStar', ...PATTERNS.shootingStar };
        }
    }
    
    return null;
}

function detectDoublePatterns(candles, i) {
    const curr = candles[i];
    const prev = candles[i - 1];
    
    const currBody = Math.abs(curr.close - curr.open);
    const prevBody = Math.abs(prev.close - prev.open);
    const currBullish = curr.close > curr.open;
    const prevBullish = prev.close > prev.open;
    
    // Bullish Engulfing
    if (!prevBullish && currBullish && 
        curr.open < prev.close && curr.close > prev.open &&
        currBody > prevBody) {
        return { pattern: 'bullishEngulfing', ...PATTERNS.bullishEngulfing };
    }
    
    // Bearish Engulfing
    if (prevBullish && !currBullish && 
        curr.open > prev.close && curr.close < prev.open &&
        currBody > prevBody) {
        return { pattern: 'bearishEngulfing', ...PATTERNS.bearishEngulfing };
    }
    
    // Bullish Harami
    if (!prevBullish && currBullish &&
        curr.open > prev.close && curr.close < prev.open &&
        currBody < prevBody * 0.5) {
        return { pattern: 'bullishHarami', ...PATTERNS.bullishHarami };
    }
    
    // Bearish Harami
    if (prevBullish && !currBullish &&
        curr.open < prev.close && curr.close > prev.open &&
        currBody < prevBody * 0.5) {
        return { pattern: 'bearishHarami', ...PATTERNS.bearishHarami };
    }
    
    // Piercing Line
    if (!prevBullish && currBullish &&
        curr.open < prev.low &&
        curr.close > (prev.open + prev.close) / 2 &&
        curr.close < prev.open) {
        return { pattern: 'piercingLine', ...PATTERNS.piercingLine };
    }
    
    // Dark Cloud Cover
    if (prevBullish && !currBullish &&
        curr.open > prev.high &&
        curr.close < (prev.open + prev.close) / 2 &&
        curr.close > prev.open) {
        return { pattern: 'darkCloudCover', ...PATTERNS.darkCloudCover };
    }
    
    // Tweezer Top
    if (Math.abs(curr.high - prev.high) / prev.high < 0.001 &&
        prevBullish && !currBullish) {
        return { pattern: 'tweezerTop', ...PATTERNS.tweezerTop };
    }
    
    // Tweezer Bottom
    if (Math.abs(curr.low - prev.low) / prev.low < 0.001 &&
        !prevBullish && currBullish) {
        return { pattern: 'tweezerBottom', ...PATTERNS.tweezerBottom };
    }
    
    return null;
}

function detectTriplePatterns(candles, i) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];
    
    const c1Bullish = c1.close > c1.open;
    const c2Bullish = c2.close > c2.open;
    const c3Bullish = c3.close > c3.open;
    
    const c1Body = Math.abs(c1.close - c1.open);
    const c2Body = Math.abs(c2.close - c2.open);
    const c3Body = Math.abs(c3.close - c3.open);
    const c1Range = c1.high - c1.low;
    const c2Range = c2.high - c2.low;
    
    // Morning Star
    if (!c1Bullish && c3Bullish &&
        c2Body < c1Body * 0.3 &&
        c2.close < c1.close && c2.close < c3.open &&
        c3.close > (c1.open + c1.close) / 2) {
        return { pattern: 'morningStar', ...PATTERNS.morningStar };
    }
    
    // Evening Star
    if (c1Bullish && !c3Bullish &&
        c2Body < c1Body * 0.3 &&
        c2.close > c1.close && c2.close > c3.open &&
        c3.close < (c1.open + c1.close) / 2) {
        return { pattern: 'eveningStar', ...PATTERNS.eveningStar };
    }
    
    // Three White Soldiers
    if (c1Bullish && c2Bullish && c3Bullish &&
        c2.open > c1.open && c2.close > c1.close &&
        c3.open > c2.open && c3.close > c2.close &&
        c1Body > c1Range * 0.6 && c2Body > c2Range * 0.6) {
        return { pattern: 'threeWhiteSoldiers', ...PATTERNS.threeWhiteSoldiers };
    }
    
    // Three Black Crows
    if (!c1Bullish && !c2Bullish && !c3Bullish &&
        c2.open < c1.open && c2.close < c1.close &&
        c3.open < c2.open && c3.close < c2.close &&
        c1Body > c1Range * 0.6 && c2Body > c2Range * 0.6) {
        return { pattern: 'threeBlackCrows', ...PATTERNS.threeBlackCrows };
    }
    
    return null;
}

function getTrend(candles, currentIndex, lookback) {
    if (currentIndex < lookback) return 'neutral';
    
    let upCount = 0, downCount = 0;
    for (let i = currentIndex - lookback; i < currentIndex; i++) {
        if (candles[i].close > candles[i].open) upCount++;
        else downCount++;
    }
    
    if (upCount > downCount + 1) return 'up';
    if (downCount > upCount + 1) return 'down';
    return 'neutral';
}

// ============================================
// TECHNICAL ANALYSIS
// ============================================

function analyzeCandles(candles, tfId) {
    if (!candles || candles.length < 2) return null;
    
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    const isBullish = current.close > current.open;
    const range = current.high - current.low;
    const bodySize = Math.abs(current.close - current.open);
    const bodyPct = range > 0 ? (bodySize / range) * 100 : 0;
    
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWickPct = range > 0 ? (upperWick / range) * 100 : 0;
    const lowerWickPct = range > 0 ? (lowerWick / range) * 100 : 0;
    
    const changePct = current.open !== 0 ? ((current.close - current.open) / current.open) * 100 : 0;
    
    const volumes = candles.slice(-VOLUME_CONFIG.avgPeriod).map(c => c.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeRatio = avgVolume > 0 ? current.volume / avgVolume : 1;
    
    const closePosition = range > 0 ? (current.close - current.low) / range : 0.5;
    const buyPct = closePosition * 100;
    const sellPct = (1 - closePosition) * 100;
    
    const rsi = calculateRSI(candles, RSI_CONFIG.period);
    const rsiArray = calculateRSIArray(candles, RSI_CONFIG.period);
    const macd = calculateMACD(candles);
    const macdArray = calculateMACDArray(candles);
    
    const alerts = generateAlerts(rsi, macd, volumeRatio, bodyPct, upperWickPct, lowerWickPct);
    
    return {
        tfId,
        current,
        previous,
        candles,
        isBullish,
        bodyPct,
        upperWickPct,
        lowerWickPct,
        changePct,
        volumeRatio,
        buyPct,
        sellPct,
        rsi,
        rsiArray,
        macd,
        macdArray,
        alerts
    };
}

function generateAlerts(rsi, macd, volumeRatio, bodyPct, upperWickPct, lowerWickPct) {
    return {
        overbought: rsi >= RSI_CONFIG.overbought,
        extremeOB: rsi >= RSI_CONFIG.extremeOverbought,
        oversold: rsi <= RSI_CONFIG.oversold,
        extremeOS: rsi <= RSI_CONFIG.extremeOversold,
        highVol: volumeRatio >= VOLUME_CONFIG.highThreshold && volumeRatio < VOLUME_CONFIG.spikeThreshold,
        volSpike: volumeRatio >= VOLUME_CONFIG.spikeThreshold,
        lowVol: volumeRatio <= VOLUME_CONFIG.lowThreshold,
        indecision: bodyPct <= 20,
        rejectHigh: upperWickPct >= 50,
        rejectLow: lowerWickPct >= 50,
        macdBull: macd.isBullish,
        macdBear: !macd.isBullish,
        macdCrossUp: macd.crossedUp,
        macdCrossDown: macd.crossedDown
    };
}

function calculateRSI(candles, period = 14) {
    if (candles.length < period + 1) return 50;
    
    const closes = candles.map(c => c.close);
    let gains = 0, losses = 0;
    
    for (let i = 1; i <= period; i++) {
        const change = closes[closes.length - period - 1 + i] - closes[closes.length - period - 2 + i];
        if (change >= 0) gains += change;
        else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateRSIArray(candles, period = 14) {
    const result = [];
    const closes = candles.map(c => c.close);
    
    for (let i = period; i < closes.length; i++) {
        let gains = 0, losses = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const change = closes[j] - closes[j - 1];
            if (change >= 0) gains += change;
            else losses += Math.abs(change);
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }
    return result;
}

function calculateMACD(candles) {
    const closes = candles.map(c => c.close);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;
    const signalLine = calculateEMA([...Array(closes.length - 26).fill(0), macdLine], 9);
    const histogram = macdLine - signalLine;
    
    const prevCloses = closes.slice(0, -1);
    const prevEma12 = calculateEMA(prevCloses, 12);
    const prevEma26 = calculateEMA(prevCloses, 26);
    const prevMacdLine = prevEma12 - prevEma26;
    const prevHistogram = prevMacdLine - calculateEMA([...Array(prevCloses.length - 26).fill(0), prevMacdLine], 9);
    
    return {
        macdLine, signalLine, histogram, prevHistogram,
        isBullish: histogram > prevHistogram,
        crossedUp: histogram > 0 && prevHistogram <= 0,
        crossedDown: histogram < 0 && prevHistogram >= 0
    };
}

// Calculate body percentage of candle (body / total range)
function calculateBodyPercentage(candle) {
    const range = candle.high - candle.low;
    if (range === 0) return 0;
    const body = Math.abs(candle.close - candle.open);
    return (body / range) * 100;
}

// Calculate volume ratio compared to average
function calculateVolumeRatio(candles, period = 20) {
    if (candles.length < 2) return 1;
    const latestVol = candles[candles.length - 1].volume;
    const avgPeriod = Math.min(period, candles.length - 1);
    const avgVol = candles.slice(-avgPeriod - 1, -1).reduce((sum, c) => sum + c.volume, 0) / avgPeriod;
    if (avgVol === 0) return 1;
    return latestVol / avgVol;
}

function calculateMACDArray(candles) {
    const closes = candles.map(c => c.close);
    const result = [];
    
    for (let i = 26; i < closes.length; i++) {
        const slice = closes.slice(0, i + 1);
        const ema12 = calculateEMA(slice, 12);
        const ema26 = calculateEMA(slice, 26);
        result.push({ macdLine: ema12 - ema26, index: i });
    }
    
    const macdValues = result.map(r => r.macdLine);
    for (let i = 8; i < macdValues.length; i++) {
        const signal = calculateEMA(macdValues.slice(0, i + 1), 9);
        result[i].signal = signal;
        result[i].histogram = macdValues[i] - signal;
    }
    
    return result.filter(r => r.histogram !== undefined);
}

function calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1] || 0;
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
}

// ============================================
// CONFLUENCE CALCULATION
// ============================================

function calculateConfluence() {
    const enabledTFs = state.timeframes.filter(tf => tf.enabled);
    let bullScore = 0, bearScore = 0, bullCount = 0, bearCount = 0;
    const weights = WEIGHT_METHODS[state.settings.weightMethod] || WEIGHT_METHODS.linear;
    const tfWeights = [];
    
    enabledTFs.forEach(tf => {
        const data = state.data[tf.id];
        if (!data) return;
        
        let baseWeight = weights[tf.id] || 1;
        let modifiers = [];
        let finalWeight = baseWeight;
        
        if (state.settings.useStrengthMod) {
            if (data.bodyPct >= BODY_CONFIG.strongThreshold) {
                finalWeight *= 1.5;
                modifiers.push('Body×1.5');
            } else if (data.bodyPct < BODY_CONFIG.weakThreshold) {
                finalWeight *= 0.5;
                modifiers.push('Body×0.5');
            }
        }
        
        if (state.settings.useVolumeMod) {
            if (data.volumeRatio >= VOLUME_CONFIG.highThreshold) {
                finalWeight *= 1.3;
                modifiers.push('Vol×1.3');
            } else if (data.volumeRatio <= VOLUME_CONFIG.lowThreshold) {
                finalWeight *= 0.7;
                modifiers.push('Vol×0.7');
            }
        }
        
        if (state.settings.useIndicatorMod && data.rsi && data.macd) {
            const rsiConfirms = data.isBullish ? data.rsi < RSI_CONFIG.overbought : data.rsi > RSI_CONFIG.oversold;
            const macdConfirms = data.isBullish === data.macd.isBullish;
            
            if (rsiConfirms && macdConfirms) {
                finalWeight *= 1.4;
                modifiers.push('Ind×1.4');
            } else if (rsiConfirms || macdConfirms) {
                finalWeight *= 1.2;
                modifiers.push('Ind×1.2');
            } else {
                finalWeight *= 0.8;
                modifiers.push('Ind×0.8');
            }
        }
        
        tfWeights.push({
            tf: tf.label,
            base: baseWeight,
            final: finalWeight.toFixed(2),
            mods: modifiers.join(' '),
            dir: data.isBullish ? '🟢' : '🔴'
        });
        
        if (data.isBullish) {
            bullScore += finalWeight;
            bullCount++;
        } else {
            bearScore += finalWeight;
            bearCount++;
        }
    });
    
    const totalScore = bullScore + bearScore;
    const confluencePct = totalScore > 0 ? (bullScore / totalScore) * 100 : 50;
    
    // Store in state for chart markers
    state.confluenceScore = confluencePct;
    
    // Track high confluence moments (>= 70% or <= 30%)
    trackConfluenceHistory(confluencePct, bullCount > bearCount ? 'BULL' : 'BEAR');
    
    updateConfluenceDisplay(confluencePct, bullCount, bearCount, tfWeights);
}

// ============================================
// INTERACTIVE CHART DRAWING
// ============================================

function initChartState(tfId) {
    if (!state.chartStates[tfId]) {
        state.chartStates[tfId] = { panX: 0, zoom: 1, isDragging: false, lastX: 0 };
    }
    return state.chartStates[tfId];
}

function drawInteractiveChart(canvasId, data, tfId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || !data.candles || data.candles.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // HiDPI support for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    const chartState = initChartState(tfId);
    const zoom = chartState.zoom * state.globalZoom;
    const panX = chartState.panX;
    
    // Calculate visible candles based on zoom
    const baseVisibleCandles = 50;
    const visibleCandles = Math.max(20, Math.floor(baseVisibleCandles / zoom));
    
    const showRSI = state.settings.showChartRSI;
    const showMACD = state.settings.showChartMACD;
    const showVolume = state.settings.showChartVolume !== false;
    const showPatterns = state.settings.showPatterns !== false;
    const showMA = state.settings.showChartMA;
    const showEMA = state.settings.showChartEMA;
    const showVWAP = state.settings.showChartVWAP;
    const showPriceScale = state.settings.showPriceScale;
    
    const padding = { top: 20, right: showPriceScale ? 55 : 5, bottom: 5, left: 5 };
    let mainChartHeight = height - padding.top - padding.bottom;
    let volumeHeight = 0, rsiHeight = 0, macdHeight = 0;
    
    if (showVolume) { volumeHeight = mainChartHeight * 0.18; mainChartHeight -= volumeHeight; }
    if (showRSI) { rsiHeight = mainChartHeight * 0.1; mainChartHeight -= rsiHeight; }
    if (showMACD) { macdHeight = mainChartHeight * 0.1; mainChartHeight -= macdHeight; }
    
    const chartWidth = width - padding.left - padding.right;
    
    // Calculate visible range with pan
    const totalCandles = data.candles.length;
    const maxPan = Math.max(0, totalCandles - visibleCandles);
    const startIdx = Math.max(0, Math.min(maxPan, totalCandles - visibleCandles + Math.floor(panX)));
    const endIdx = Math.min(totalCandles, startIdx + visibleCandles);
    const displayCandles = data.candles.slice(startIdx, endIdx);
    
    if (displayCandles.length === 0) return;
    
    const prices = displayCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const scaleY = (price) => padding.top + mainChartHeight - ((price - minPrice) / priceRange) * mainChartHeight;
    
    const candleWidth = Math.max(2, (chartWidth / displayCandles.length) * 0.7);
    const candleSpacing = chartWidth / displayCandles.length;
    
    // Theme-aware colors
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    const isLightColorful = theme === 'colorful';
    
    let bgColor, bullColor, bearColor, gridColor, textColor, maColor, emaColor, vwapColor;
    
    if (isDark) {
        bgColor = '#1e1e42';
        bullColor = '#34d399';
        bearColor = '#fb7185';
        gridColor = '#2e2e52';
        textColor = '#b8b8d0';
        maColor = '#60a5fa';
        emaColor = '#fbbf24';
        vwapColor = '#c084fc';
    } else if (isLightColorful) {
        bgColor = '#faf5ff';
        bullColor = '#059669';
        bearColor = '#e11d48';
        gridColor = '#ddd6fe';
        textColor = '#4338ca';
        maColor = '#2563eb';
        emaColor = '#ea580c';
        vwapColor = '#d946ef';
    } else {
        // light-simple
        bgColor = '#f8f9fa';
        bullColor = '#16a34a';
        bearColor = '#dc2626';
        gridColor = '#e5e7eb';
        textColor = '#4a4a5a';
        maColor = '#3b82f6';
        emaColor = '#f59e0b';
        vwapColor = '#a855f7';
    }
    
    const neutralColor = '#f59e0b';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw price scale on right side (like Binance)
    if (showPriceScale) {
        const decimals = state.currentCoin?.decimals || 2;
        const scaleX = width - padding.right + 3;
        const numTicks = Math.min(6, Math.max(3, Math.floor(mainChartHeight / 30)));
        
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        
        // Separator line
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(width - padding.right, padding.top);
        ctx.lineTo(width - padding.right, padding.top + mainChartHeight);
        ctx.stroke();
        
        for (let i = 0; i <= numTicks; i++) {
            const ratio = i / numTicks;
            const price = maxPrice - ratio * priceRange;
            const y = padding.top + ratio * mainChartHeight;
            
            // Grid line
            ctx.strokeStyle = gridColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            // Tick mark
            ctx.strokeStyle = textColor;
            ctx.beginPath();
            ctx.moveTo(width - padding.right, y);
            ctx.lineTo(width - padding.right + 3, y);
            ctx.stroke();
            
            // Price label
            ctx.fillStyle = textColor;
            ctx.fillText(price.toFixed(decimals), scaleX + 2, y + 3);
        }
        
        // Current price indicator on the scale
        const lastCandle = displayCandles[displayCandles.length - 1];
        if (lastCandle) {
            const curY = scaleY(lastCandle.close);
            const isBull = lastCandle.close >= lastCandle.open;
            const curColor = isBull ? bullColor : bearColor;
            
            // Price tag background
            ctx.fillStyle = curColor;
            const priceText = lastCandle.close.toFixed(decimals);
            const tagW = ctx.measureText(priceText).width + 8;
            ctx.fillRect(width - padding.right, curY - 6, padding.right, 12);
            
            // Arrow
            ctx.beginPath();
            ctx.moveTo(width - padding.right, curY - 5);
            ctx.lineTo(width - padding.right - 4, curY);
            ctx.lineTo(width - padding.right, curY + 5);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(priceText, width - padding.right + 3, curY + 3);
        }
    }
    
    // Clear pattern data for tooltip
    canvas.patternData = [];
    
    // Find which candle has the highest high and lowest low
    let maxPriceIdx = 0, minPriceIdx = 0;
    displayCandles.forEach((c, idx) => {
        if (c.high === maxPrice) maxPriceIdx = idx;
        if (c.low === minPrice) minPriceIdx = idx;
    });
    
    // Calculate X positions for high/low labels (will draw after candles)
    
    // Get patterns for visible range and filter by user settings
    const tfPatterns = state.patterns[tfId] || [];
    const patternSettings = state.settings.patterns || {};
    
    // Map pattern names to settings keys
    const patternNameToKey = {
        'Doji': 'doji',
        'Hammer': 'hammer',
        'Inv Hammer': 'invHammer',
        'Hanging Man': 'hangingMan',
        'Shoot Star': 'shootStar',
        'Marubozu': 'marubozu',
        'Spin Top': 'spinTop',
        'Bull Engulf': 'bullEngulf',
        'Bear Engulf': 'bearEngulf',
        'Bull Harami': 'bullHarami',
        'Bear Harami': 'bearHarami',
        'Piercing': 'piercing',
        'Dark Cloud': 'darkCloud',
        'Tweez Top': 'tweezTop',
        'Tweez Bot': 'tweezBot',
        'Morning ⭐': 'morningStar',
        'Evening ⭐': 'eveningStar',
        '3 Soldiers': 'threeSoldiers',
        '3 Crows': 'threeCrows'
    };
    
    const visiblePatterns = tfPatterns.filter(p => {
        if (p.index < startIdx || p.index >= endIdx) return false;
        const key = patternNameToKey[p.name];
        return key ? (patternSettings[key] !== false) : true;
    });
    
    // Get MA/EMA line configs from settings
    const maLines = state.settings.maLines || [20];
    const emaLines = state.settings.emaLines || [21];
    
    // MA colors for multiple lines
    const maColors = ['#3b82f6', '#06b6d4', '#0ea5e9', '#14b8a6'];
    // EMA colors for multiple lines  
    const emaColors = ['#f59e0b', '#f97316', '#ef4444', '#ec4899'];
    
    // Calculate and draw MA lines
    if (showMA && data.candles.length > 0) {
        const allCandles = data.candles;
        maLines.forEach((period, lineIdx) => {
            if (allCandles.length >= period) {
                const maData = [];
                for (let i = startIdx; i < endIdx; i++) {
                    if (i >= period - 1) {
                        let sum = 0;
                        for (let j = i - period + 1; j <= i; j++) {
                            sum += allCandles[j].close;
                        }
                        maData.push(sum / period);
                    } else {
                        maData.push(null);
                    }
                }
                
                // Draw this MA line
                if (maData.length > 0) {
                    ctx.strokeStyle = maColors[lineIdx % maColors.length];
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    let started = false;
                    maData.forEach((val, i) => {
                        if (val !== null) {
                            const x = padding.left + i * candleSpacing + candleSpacing / 2;
                            const y = scaleY(val);
                            if (!started) { ctx.moveTo(x, y); started = true; }
                            else ctx.lineTo(x, y);
                        }
                    });
                    ctx.stroke();
                }
            }
        });
    }
    
    // Calculate and draw EMA lines
    if (showEMA && data.candles.length > 0) {
        const allCandles = data.candles;
        emaLines.forEach((period, lineIdx) => {
            if (allCandles.length >= period) {
                const mult = 2 / (period + 1);
                let ema = allCandles[0].close;
                const fullEma = [];
                for (let i = 0; i < allCandles.length; i++) {
                    ema = (allCandles[i].close - ema) * mult + ema;
                    fullEma.push(ema);
                }
                const emaData = fullEma.slice(startIdx, endIdx);
                
                // Draw this EMA line
                if (emaData.length > 0) {
                    ctx.strokeStyle = emaColors[lineIdx % emaColors.length];
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    emaData.forEach((val, i) => {
                        const x = padding.left + i * candleSpacing + candleSpacing / 2;
                        const y = scaleY(val);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                }
            }
        });
    }
    
    // VWAP
    if (showVWAP && data.candles.length > 0) {
        const allCandles = data.candles;
        let cumVolPrice = 0, cumVol = 0;
        const fullVwap = [];
        for (let i = 0; i < allCandles.length; i++) {
            const typical = (allCandles[i].high + allCandles[i].low + allCandles[i].close) / 3;
            cumVolPrice += typical * allCandles[i].volume;
            cumVol += allCandles[i].volume;
            fullVwap.push(cumVol > 0 ? cumVolPrice / cumVol : typical);
        }
        const vwapData = fullVwap.slice(startIdx, endIdx);
        
        if (vwapData.length > 0) {
            ctx.strokeStyle = vwapColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            vwapData.forEach((val, i) => {
                const x = padding.left + i * candleSpacing + candleSpacing / 2;
                const y = scaleY(val);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Draw candles with H/L labels
    // Store candle positions for click detection
    canvas.candleData = [];
    
    // Draw hovered candle highlight column (behind candles)
    if (typeof canvas.hoveredCandleIdx === 'number' && canvas.hoveredCandleIdx >= 0 && canvas.hoveredCandleIdx < displayCandles.length) {
        const hx = padding.left + canvas.hoveredCandleIdx * candleSpacing;
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(hx, padding.top, candleSpacing, mainChartHeight + volumeHeight);
        
        // Crosshair horizontal line at current price
        const hCandle = displayCandles[canvas.hoveredCandleIdx];
        if (hCandle) {
            const crossY = scaleY(hCandle.close);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(padding.left, crossY);
            ctx.lineTo(width - padding.right, crossY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // If price scale is on, show highlighted price on the scale
            if (showPriceScale) {
                const decimals = state.currentCoin?.decimals || 2;
                const priceText = hCandle.close.toFixed(decimals);
                const tagW = ctx.measureText(priceText).width + 8;
                ctx.fillStyle = isDark ? 'rgba(100,116,139,0.9)' : 'rgba(71,85,105,0.9)';
                ctx.fillRect(width - padding.right, crossY - 6, padding.right, 12);
                ctx.fillStyle = '#fff';
                ctx.font = '8px JetBrains Mono, monospace';
                ctx.textAlign = 'left';
                ctx.fillText(priceText, width - padding.right + 3, crossY + 3);
            }
        }
    }
    
    displayCandles.forEach((candle, i) => {
        const x = padding.left + i * candleSpacing + candleSpacing / 2;
        const isBull = candle.close >= candle.open;
        const openY = scaleY(candle.open);
        const closeY = scaleY(candle.close);
        const highY = scaleY(candle.high);
        const lowY = scaleY(candle.low);
        
        // Calculate candle metrics
        const range = candle.high - candle.low;
        const bodySize = Math.abs(candle.close - candle.open);
        const bodyPct = range > 0 ? (bodySize / range * 100) : 0;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const upperWickPct = range > 0 ? (upperWick / range * 100) : 0;
        const lowerWickPct = range > 0 ? (lowerWick / range * 100) : 0;
        const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5;
        const buyPct = closePosition * 100;
        const sellPct = (1 - closePosition) * 100;
        
        // Store candle data for click detection
        canvas.candleData.push({
            x: x - candleWidth / 2,
            y: highY,
            width: candleWidth,
            height: lowY - highY,
            candle: candle,
            isBull: isBull,
            bodyPct: bodyPct,
            upperWickPct: upperWickPct,
            lowerWickPct: lowerWickPct,
            buyPct: buyPct,
            sellPct: sellPct
        });
        
        // Wick
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        // Body
        ctx.fillStyle = isBull ? bullColor : bearColor;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
    
    // Draw pattern labels FIRST (so price labels appear on top) - INITIALS only, 35% opacity
    // Hide patterns when zoomed out too far (more than 50 candles visible)
    const showPatternsNow = showPatterns && displayCandles.length <= 50;
    
    if (showPatternsNow) {
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        visiblePatterns.forEach(p => {
            const displayIdx = p.index - startIdx;
            if (displayIdx < 0 || displayIdx >= displayCandles.length) return;
            
            const candle = displayCandles[displayIdx];
            const x = padding.left + displayIdx * candleSpacing + candleSpacing / 2;
            const y = scaleY(candle.low) + 10; // Below the candle
            
            // Get initials from pattern name (e.g., "Bull Harami" -> "BH", "Tweez Top" -> "TT")
            const initials = p.name.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
            
            // Background - 35% opacity
            const labelWidth = ctx.measureText(initials).width + 4;
            let labelColor;
            if (p.type === 'bullish') labelColor = 'rgba(16, 185, 129, 0.35)';
            else if (p.type === 'bearish') labelColor = 'rgba(239, 68, 68, 0.35)';
            else labelColor = 'rgba(245, 158, 11, 0.35)';
            
            ctx.fillStyle = labelColor;
            ctx.fillRect(x - labelWidth / 2, y - 7, labelWidth, 10);
            
            // Text - initials with 50% opacity for readability
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(initials, x, y);
            
            // Store pattern info for tooltip (attach to canvas data)
            if (!canvas.patternData) canvas.patternData = [];
            canvas.patternData.push({
                x: x - labelWidth / 2,
                y: y - 7,
                width: labelWidth,
                height: 10,
                name: p.name,
                type: p.type
            });
        });
    }
    
    // Draw High/Low price labels at actual candle positions (like Binance)
    const hlDecimals = state.currentCoin?.decimals || 2;
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    
    // HIGH label - positioned at the highest candle
    const highCandleX = padding.left + maxPriceIdx * candleSpacing + candleSpacing / 2;
    const highCandleY = scaleY(maxPrice);
    const highText = `← ${maxPrice.toFixed(hlDecimals)}`;
    const highTextW = ctx.measureText(highText).width + 6;
    
    // Decide label side: if candle is in right half, put label on left
    const highOnRight = highCandleX < (width - padding.right) / 2;
    const highLabelX = highOnRight ? highCandleX + candleSpacing * 0.6 : highCandleX - highTextW - candleSpacing * 0.3;
    const highLabelText = highOnRight ? `← ${maxPrice.toFixed(hlDecimals)}` : `${maxPrice.toFixed(hlDecimals)} →`;
    const highLW = ctx.measureText(highLabelText).width + 8;
    const highLX = highOnRight ? highCandleX + candleSpacing * 0.6 : highCandleX - highLW - candleSpacing * 0.3;
    
    // Dashed line from candle to label
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(highCandleX, highCandleY);
    ctx.lineTo(highOnRight ? highLX : highLX + highLW, highCandleY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // High badge at candle position
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.fillRect(highLX, highCandleY - 6, highLW, 13);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(highLabelText, highLX + 4, highCandleY + 4);
    
    // LOW label - positioned at the lowest candle
    const lowCandleX = padding.left + minPriceIdx * candleSpacing + candleSpacing / 2;
    const lowCandleY = scaleY(minPrice);
    const lowOnRight = lowCandleX < (width - padding.right) / 2;
    const lowLabelText = lowOnRight ? `← ${minPrice.toFixed(hlDecimals)}` : `${minPrice.toFixed(hlDecimals)} →`;
    const lowLW = ctx.measureText(lowLabelText).width + 8;
    const lowLX = lowOnRight ? lowCandleX + candleSpacing * 0.6 : lowCandleX - lowLW - candleSpacing * 0.3;
    
    // Dashed line from candle to label
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(lowCandleX, lowCandleY);
    ctx.lineTo(lowOnRight ? lowLX : lowLX + lowLW, lowCandleY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Low badge at candle position
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(lowLX, lowCandleY - 6, lowLW, 13);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(lowLabelText, lowLX + 4, lowCandleY + 4);
    
    // Volume bars - supports regular or buy/sell split
    if (showVolume) {
        const volTop = padding.top + mainChartHeight + 2;
        const volumes = displayCandles.map(c => c.volume);
        const maxVol = Math.max(...volumes);
        const volumeType = state.settings.volumeType || 'buysell';
        
        displayCandles.forEach((candle, i) => {
            const x = padding.left + i * candleSpacing + candleSpacing / 2;
            const totalVolHeight = (candle.volume / maxVol) * (volumeHeight - 4);
            const isBull = candle.close >= candle.open;
            
            if (volumeType === 'regular') {
                // Regular volume - single color based on candle direction
                ctx.fillStyle = (isBull ? bullColor : bearColor) + 'AA';
                ctx.fillRect(x - candleWidth / 2, volTop + volumeHeight - 2 - totalVolHeight, candleWidth, totalVolHeight);
            } else {
                // Buy/Sell split volume
                // Estimate buy/sell ratio based on candle position
                // Close position within the range determines buy pressure
                const range = candle.high - candle.low;
                const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5;
                const buyPct = closePosition;
                const sellPct = 1 - closePosition;
                
                const buyHeight = totalVolHeight * buyPct;
                const sellHeight = totalVolHeight * sellPct;
                
                // Draw sell volume (red, bottom)
                ctx.fillStyle = bearColor + 'AA';
                ctx.fillRect(x - candleWidth / 2, volTop + volumeHeight - 2 - sellHeight, candleWidth, sellHeight);
                
                // Draw buy volume (green, stacked on top)
                ctx.fillStyle = bullColor + 'AA';
                ctx.fillRect(x - candleWidth / 2, volTop + volumeHeight - 2 - sellHeight - buyHeight, candleWidth, buyHeight);
            }
        });
        
        // Separator line
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, volTop);
        ctx.lineTo(width - padding.right, volTop);
        ctx.stroke();
        
        // Volume label
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';
        ctx.fillText('VOL', width - padding.right - 2, volTop + 8);
    }
    
    // RSI
    if (showRSI && data.rsiArray && data.rsiArray.length > 0) {
        const rsiTop = padding.top + mainChartHeight + (showVolume ? volumeHeight : 0) + 2;
        const rsiStartIdx = Math.max(0, startIdx - 14);
        const rsiData = data.rsiArray.slice(rsiStartIdx, rsiStartIdx + displayCandles.length);
        
        // Overbought/Oversold zones
        ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(padding.left, rsiTop, chartWidth, rsiHeight * 0.3);
        ctx.fillRect(padding.left, rsiTop + rsiHeight * 0.7, chartWidth, rsiHeight * 0.3);
        
        if (rsiData.length > 1) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            rsiData.forEach((rsi, i) => {
                const x = padding.left + (i / (rsiData.length - 1)) * chartWidth;
                const y = rsiTop + rsiHeight - (rsi / 100) * rsiHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            // RSI value label
            const currentRSI = rsiData[rsiData.length - 1];
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.fillStyle = currentRSI >= 70 ? bearColor : currentRSI <= 30 ? bullColor : '#a855f7';
            ctx.textAlign = 'right';
            ctx.fillText(`RSI: ${currentRSI.toFixed(0)}`, canvas.width - padding.right - 2, rsiTop + 10);
        }
    }
    
    // MACD
    if (showMACD && data.macdArray && data.macdArray.length > 0) {
        const macdTop = padding.top + mainChartHeight + (showVolume ? volumeHeight : 0) + (showRSI ? rsiHeight : 0) + 2;
        const macdData = data.macdArray.slice(-(displayCandles.length));
        
        if (macdData.length > 0) {
            const histValues = macdData.map(m => m.histogram);
            const maxHist = Math.max(...histValues.map(Math.abs)) || 1;
            
            macdData.forEach((m, i) => {
                const x = padding.left + (i / macdData.length) * chartWidth;
                const barHeight = (Math.abs(m.histogram) / maxHist) * (macdHeight * 0.8);
                const y = macdTop + macdHeight / 2;
                ctx.fillStyle = m.histogram >= 0 ? bullColor + '70' : bearColor + '70';
                if (m.histogram >= 0) ctx.fillRect(x, y - barHeight, chartWidth / macdData.length * 0.6, barHeight);
                else ctx.fillRect(x, y, chartWidth / macdData.length * 0.6, barHeight);
            });
            
            // MACD value label
            const currentMACD = macdData[macdData.length - 1];
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.fillStyle = currentMACD.histogram >= 0 ? bullColor : bearColor;
            ctx.textAlign = 'right';
            const macdLabel = currentMACD.histogram >= 0 ? 'MACD↑' : 'MACD↓';
            ctx.fillText(macdLabel, canvas.width - padding.right - 2, macdTop + 10);
        }
    }
    
    // Current candle highlight
    const lastX = padding.left + (displayCandles.length - 1) * candleSpacing + candleSpacing / 2;
    ctx.strokeStyle = data.isBullish ? bullColor : bearColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(lastX - candleWidth / 2 - 2, padding.top, candleWidth + 4, mainChartHeight);
    
    // Draw confluence marker (arrow) on current candle if confluence is high
    const showMarkers = state.settings.showChartMarkers !== false;
    const confluenceScore = state.confluenceScore || 50;
    if (showMarkers && (confluenceScore >= 65 || confluenceScore <= 35)) {
        const lastCandle = displayCandles[displayCandles.length - 1];
        const markerX = lastX;
        const isBullishConfluence = confluenceScore >= 65;
        
        ctx.save();
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        
        if (isBullishConfluence) {
            // Green up arrow below the candle
            const markerY = scaleY(lastCandle.low) + 18;
            ctx.fillStyle = bullColor;
            ctx.fillText('▲', markerX, markerY);
            // Small label
            ctx.font = 'bold 7px Inter, sans-serif';
            ctx.fillText(`${confluenceScore.toFixed(0)}%`, markerX, markerY + 8);
        } else {
            // Red down arrow above the candle
            const markerY = scaleY(lastCandle.high) - 8;
            ctx.fillStyle = bearColor;
            ctx.fillText('▼', markerX, markerY);
            // Small label
            ctx.font = 'bold 7px Inter, sans-serif';
            ctx.fillText(`${confluenceScore.toFixed(0)}%`, markerX, markerY - 8);
        }
        ctx.restore();
    }
    
    // Draw indicator legend in top-right corner
    // (maColors and emaColors already defined above)
    
    if (showMA || showEMA || showVWAP) {
        ctx.font = 'bold 7px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        let legendY = padding.top + 8;
        const legendX = width - padding.right - 3;
        
        if (showMA) {
            const maLines = state.settings.maLines || [20];
            maLines.forEach((period, idx) => {
                ctx.fillStyle = maColors[idx % maColors.length];
                ctx.fillText(`MA${period}`, legendX, legendY);
                legendY += 8;
            });
        }
        if (showEMA) {
            const emaLines = state.settings.emaLines || [21];
            emaLines.forEach((period, idx) => {
                ctx.fillStyle = emaColors[idx % emaColors.length];
                ctx.fillText(`E${period}`, legendX, legendY);
                legendY += 8;
            });
        }
        if (showVWAP) {
            ctx.fillStyle = vwapColor;
            ctx.fillText('VW', legendX, legendY);
        }
    }
}

function setupChartInteraction(canvasId, tfId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const chartState = initChartState(tfId);
    const data = state.data[tfId];
    if (!data) return;
    
    // Create tooltip element if not exists
    let tooltip = document.getElementById('pattern-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'pattern-tooltip';
        tooltip.className = 'pattern-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }
    
    // Create candle popup element if not exists
    let candlePopup = document.getElementById('candle-popup');
    if (!candlePopup) {
        candlePopup = document.createElement('div');
        candlePopup.id = 'candle-popup';
        candlePopup.className = 'candle-popup';
        candlePopup.style.display = 'none';
        document.body.appendChild(candlePopup);
    }
    
    // Helper to show candle popup
    function showCandlePopup(candleInfo, x, y) {
        const decimals = state.currentCoin?.decimals || 4;
        const vol = candleInfo.candle.volume;
        const buyVol = vol * (candleInfo.buyPct / 100);
        const sellVol = vol * (candleInfo.sellPct / 100);
        
        candlePopup.innerHTML = `
            <div class="candle-popup-header">
                <span>${candleInfo.isBull ? '🟢 Bull' : '🔴 Bear'}</span>
                <span class="candle-popup-close" onclick="document.getElementById('candle-popup').style.display='none'">✕</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">O:</span>
                <span class="candle-popup-value">${candleInfo.candle.open.toFixed(decimals)}</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">H:</span>
                <span class="candle-popup-value">${candleInfo.candle.high.toFixed(decimals)}</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">L:</span>
                <span class="candle-popup-value">${candleInfo.candle.low.toFixed(decimals)}</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">C:</span>
                <span class="candle-popup-value">${candleInfo.candle.close.toFixed(decimals)}</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Volume:</span>
                <span class="candle-popup-value">${formatVolume(vol)}</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Buy:</span>
                <span class="candle-popup-value bull">${candleInfo.buyPct.toFixed(1)}%</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Sell:</span>
                <span class="candle-popup-value bear">${candleInfo.sellPct.toFixed(1)}%</span>
            </div>
            <div class="candle-popup-bar">
                <div class="candle-popup-bar-buy" style="width:${candleInfo.buyPct}%"></div>
                <div class="candle-popup-bar-sell" style="width:${candleInfo.sellPct}%"></div>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Body:</span>
                <span class="candle-popup-value">${candleInfo.bodyPct.toFixed(1)}%</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Upper Wick:</span>
                <span class="candle-popup-value">${candleInfo.upperWickPct.toFixed(1)}%</span>
            </div>
            <div class="candle-popup-row">
                <span class="candle-popup-label">Lower Wick:</span>
                <span class="candle-popup-value">${candleInfo.lowerWickPct.toFixed(1)}%</span>
            </div>
        `;
        
        // Position popup
        candlePopup.style.display = 'block';
        const popupRect = candlePopup.getBoundingClientRect();
        let popupX = x + 10;
        let popupY = y - 50;
        
        // Keep within viewport
        if (popupX + popupRect.width > window.innerWidth) {
            popupX = x - popupRect.width - 10;
        }
        if (popupY < 0) popupY = 10;
        if (popupY + popupRect.height > window.innerHeight) {
            popupY = window.innerHeight - popupRect.height - 10;
        }
        
        candlePopup.style.left = popupX + 'px';
        candlePopup.style.top = popupY + 'px';
    }
    
    // Update the candle info tab above each chart
    function updateCandleInfoTab(canvas, data, tfId, x) {
        if (!canvas.candleData || canvas.candleData.length === 0) return;
        
        // Find the candle at the X position
        let closestCandle = null;
        let closestDist = Infinity;
        
        for (const cd of canvas.candleData) {
            const candleCenterX = cd.x + cd.width / 2;
            const dist = Math.abs(x - candleCenterX);
            if (dist < closestDist) {
                closestDist = dist;
                closestCandle = cd;
            }
        }
        
        if (closestCandle) {
            const tabEl = document.getElementById(`candleInfoTab-${tfId}`);
            const oEl = document.getElementById(`candleO-${tfId}`);
            const hEl = document.getElementById(`candleH-${tfId}`);
            const lEl = document.getElementById(`candleL-${tfId}`);
            const cEl = document.getElementById(`candleC-${tfId}`);
            const vEl = document.getElementById(`candleV-${tfId}`);
            const timeEl = document.getElementById(`candleTime-${tfId}`);
            
            const decimals = state.currentCoin?.decimals || 2;
            
            if (tabEl) tabEl.style.display = 'block';
            if (oEl) oEl.textContent = '$' + closestCandle.candle.open.toFixed(decimals);
            if (hEl) hEl.textContent = '$' + closestCandle.candle.high.toFixed(decimals);
            if (lEl) lEl.textContent = '$' + closestCandle.candle.low.toFixed(decimals);
            if (cEl) cEl.textContent = '$' + closestCandle.candle.close.toFixed(decimals);
            if (vEl) vEl.textContent = formatVolume(closestCandle.candle.volume);
            if (timeEl) {
                const date = new Date(closestCandle.candle.openTime);
                timeEl.textContent = date.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        }
    }
    
    // Helper to find candle at position
    function findCandleAt(x, y) {
        if (!canvas.candleData) return null;
        const dpr = window.devicePixelRatio || 1;
        const scaledX = x;
        const scaledY = y;
        
        for (const cd of canvas.candleData) {
            // Expand hit area for easier selection
            const hitPadding = 5;
            if (scaledX >= cd.x - hitPadding && 
                scaledX <= cd.x + cd.width + hitPadding && 
                scaledY >= cd.y - hitPadding && 
                scaledY <= cd.y + cd.height + hitPadding) {
                return cd;
            }
        }
        return null;
    }
    
    // Long press timer for mobile
    let longPressTimer = null;
    let longPressTriggered = false;
    
    // Mouse events - click on candle shows popup
    canvas.addEventListener('mousedown', (e) => {
        chartState.isDragging = true;
        chartState.lastX = e.clientX;
        canvas.style.cursor = 'grabbing';
    });
    
    // Double click to show candle popup on desktop
    canvas.addEventListener('click', (e) => {
        // Only show popup on click if in click-popup mode
        if (state.settings.candlePopupType !== 'click-popup') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const candleInfo = findCandleAt(x, y);
        if (candleInfo) {
            showCandlePopup(candleInfo, e.clientX, e.clientY);
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Calculate hovered candle index for highlight column
        if (!chartState.isDragging && canvas.candleData && canvas.candleData.length > 0) {
            let closestIdx = -1;
            let closestDist = Infinity;
            for (let i = 0; i < canvas.candleData.length; i++) {
                const cd = canvas.candleData[i];
                const cx = cd.x + cd.width / 2;
                const dist = Math.abs(x - cx);
                if (dist < closestDist) { closestDist = dist; closestIdx = i; }
            }
            if (closestIdx !== canvas.hoveredCandleIdx) {
                canvas.hoveredCandleIdx = closestIdx;
                drawInteractiveChart(canvasId, data, tfId);
            }
        }
        
        // Update candle info tab only if in hover-tab mode
        if (state.settings.candlePopupType === 'hover-tab') {
            updateCandleInfoTab(canvas, data, tfId, x);
        }
        
        // Pattern tooltip on hover
        if (canvas.patternData && canvas.patternData.length > 0 && !chartState.isDragging) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            let foundPattern = null;
            for (const p of canvas.patternData) {
                if (x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
                    foundPattern = p;
                    break;
                }
            }
            
            if (foundPattern) {
                tooltip.textContent = `${foundPattern.name} (${foundPattern.type})`;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY - 20) + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        }
        
        if (!chartState.isDragging) return;
        const dx = e.clientX - chartState.lastX;
        chartState.panX += dx * 0.2;
        chartState.lastX = e.clientX;
        drawInteractiveChart(canvasId, data, tfId);
    });
    
    canvas.addEventListener('mouseup', () => {
        chartState.isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        chartState.isDragging = false;
        canvas.style.cursor = 'grab';
        tooltip.style.display = 'none';
        // Clear hover highlight
        if (canvas.hoveredCandleIdx !== -1) {
            canvas.hoveredCandleIdx = -1;
            drawInteractiveChart(canvasId, data, tfId);
        }
        // Hide the candle info tab for this chart
        const tabEl = document.getElementById(`candleInfoTab-${tfId}`);
        if (tabEl) tabEl.style.display = 'none';
    });
    
    // Scroll to zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        chartState.zoom = Math.max(0.3, Math.min(5, chartState.zoom * delta));
        drawInteractiveChart(canvasId, data, tfId);
    });
    
    // Touch events with pinch-to-zoom and long press
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchDistance = 0;
    let isTouchZooming = false;
    let touchMoved = false;
    
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Pinch zoom start
            isTouchZooming = true;
            longPressTriggered = false;
            clearTimeout(longPressTimer);
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        } else if (e.touches.length === 1) {
            isTouchZooming = false;
            touchMoved = false;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            
            // Start long press timer
            longPressTimer = setTimeout(() => {
                if (!touchMoved) {
                    const rect = canvas.getBoundingClientRect();
                    const x = touchStartX - rect.left;
                    const y = touchStartY - rect.top;
                    
                    const candleInfo = findCandleAt(x, y);
                    if (candleInfo) {
                        longPressTriggered = true;
                        showCandlePopup(candleInfo, touchStartX, touchStartY);
                        // Vibrate if supported
                        if (navigator.vibrate) navigator.vibrate(50);
                    }
                }
            }, 500); // 500ms long press
        }
    }, { passive: true });
    
    canvas.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        
        // Update candle info tab on touch move
        if (e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            updateCandleInfoTab(canvas, data, tfId, x);
        }
        
        // If moved more than 10px, cancel long press
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            touchMoved = true;
            clearTimeout(longPressTimer);
        }
        
        if (longPressTriggered) {
            e.preventDefault();
            return;
        }
        
        e.preventDefault();
        
        if (e.touches.length === 2 && isTouchZooming) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (lastTouchDistance > 0) {
                const scale = distance / lastTouchDistance;
                chartState.zoom = Math.max(0.3, Math.min(5, chartState.zoom * scale));
                drawInteractiveChart(canvasId, data, tfId);
            }
            lastTouchDistance = distance;
        } else if (e.touches.length === 1 && !isTouchZooming && touchMoved) {
            // Pan
            const dx = e.touches[0].clientX - touchStartX;
            chartState.panX += dx * 0.2;
            touchStartX = e.touches[0].clientX;
            drawInteractiveChart(canvasId, data, tfId);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);
        if (e.touches.length < 2) {
            isTouchZooming = false;
            lastTouchDistance = 0;
        }
        longPressTriggered = false;
    }, { passive: true });
    
    // Close popup when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (candlePopup && candlePopup.style.display !== 'none') {
            if (!candlePopup.contains(e.target) && e.target !== canvas) {
                candlePopup.style.display = 'none';
            }
        }
    });
}

// ============================================
// TIMER MANAGEMENT
// ============================================

function startTimerLoop() {
    state.intervals.timer = setInterval(updateTimers, 1000);
    updateTimers();
}

function getSecondsToClose(tf) {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    if (tf.minutes === 240) {
        const currentHour = now.getHours();
        const hourIn4h = currentHour % 4;
        const remainingHours = 3 - hourIn4h;
        return remainingHours * 3600 + (59 - currentMinute) * 60 + (60 - currentSecond);
    } else {
        const currentTotalSeconds = currentMinute * 60 + currentSecond;
        const tfSeconds = tf.minutes * 60;
        return tfSeconds - (currentTotalSeconds % tfSeconds);
    }
}

function updateTimers() {
    let alertingCount = 0;
    
    state.timeframes.forEach(tf => {
        const secondsToClose = getSecondsToClose(tf);
        const timeStr = formatTime(secondsToClose);
        const isAlert = tf.enabled && secondsToClose <= state.settings.alertSeconds;
        
        const btnEl = document.querySelector(`.tf-toggle-btn[data-tf="${tf.id}"]`);
        const btnTimerEl = document.getElementById(`tf-btn-timer-${tf.id}`);
        
        if (btnEl && btnTimerEl) {
            btnTimerEl.textContent = timeStr;
            btnEl.classList.toggle('alert', isAlert);
        }
        
        const tfTimerEl = document.getElementById(`tf-timer-${tf.id}`);
        if (tfTimerEl) {
            tfTimerEl.textContent = timeStr;
            tfTimerEl.classList.toggle('alert', isAlert);
        }
        
        if (isAlert) alertingCount++;
    });
    
    const alertBadge = document.getElementById('alertBadge');
    const alertCount = document.getElementById('alertCount');
    
    if (alertingCount >= state.settings.minConfluence) {
        alertBadge.style.display = 'flex';
        alertCount.textContent = alertingCount;
        if (state.settings.enableSound && !state.alertPlayed) {
            playAlertSound();
            state.alertPlayed = true;
        }
    } else {
        alertBadge.style.display = 'none';
        state.alertPlayed = false;
    }
}

function formatTime(seconds) {
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function playAlertSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {}
}

// ============================================
// UI RENDERING
// ============================================

function renderTFTogglesWithTimers() {
    const container = document.getElementById('mainBlockToggles');
    if (!container) return;
    
    container.innerHTML = state.timeframes.map(tf => {
        const secondsToClose = getSecondsToClose(tf);
        const isAlert = tf.enabled && secondsToClose <= state.settings.alertSeconds;
        
        return `
            <div class="tf-toggle-btn ${tf.enabled ? 'active' : ''} ${isAlert ? 'alert' : ''}" data-tf="${tf.id}">
                <span class="tf-toggle-label">${tf.label}</span>
                <span class="tf-toggle-timer" id="tf-btn-timer-${tf.id}">${formatTime(secondsToClose)}</span>
            </div>
        `;
    }).join('');
    
    container.querySelectorAll('.tf-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleTimeframe(btn.dataset.tf));
    });
}

function toggleTimeframe(tfId) {
    const tf = state.timeframes.find(t => t.id === tfId);
    if (tf) {
        tf.enabled = !tf.enabled;
        saveSettings();
        renderTFTogglesWithTimers();
        fetchAllCandleData();
    }
}

function renderTimeframeRows() {
    const container = document.getElementById('timeframesList');
    if (!container) return;
    
    const enabledTFs = state.timeframes.filter(tf => tf.enabled);
    
    if (enabledTFs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Select timeframes above</p>';
        return;
    }
    
    container.innerHTML = enabledTFs.map(tf => {
        const data = state.data[tf.id];
        const canvasId = `chart-${tf.id}`;
        const secondsToClose = getSecondsToClose(tf);
        const timerAlert = secondsToClose <= state.settings.alertSeconds;
        
        if (!data) {
            return `
                <div class="tf-row" data-tf="${tf.id}">
                    <div class="tf-info">
                        <div class="tf-info-row tf-info-primary">
                            <span class="tf-name">${tf.label}</span>
                            <span class="tf-direction">⏳</span>
                            <div class="tf-timer" id="tf-timer-${tf.id}">--:--</div>
                        </div>
                    </div>
                    <div class="tf-chart-wrapper">
                        <div class="candle-info-tab" id="candleInfoTab-${tf.id}" style="display:none;">
                            <div class="candle-info-tf">${tf.label}</div>
                            <div class="candle-info-data">
                                <span class="candle-info-item"><b class="label-open">O:</b> <span id="candleO-${tf.id}" class="price-open">--</span></span>
                                <span class="candle-info-item"><b class="label-high">H:</b> <span id="candleH-${tf.id}" class="price-high">--</span></span>
                                <span class="candle-info-item"><b class="label-low">L:</b> <span id="candleL-${tf.id}" class="price-low">--</span></span>
                                <span class="candle-info-item"><b class="label-close">C:</b> <span id="candleC-${tf.id}" class="price-close">--</span></span>
                                <span class="candle-info-item"><b class="label-volume">V:</b> <span id="candleV-${tf.id}" class="price-volume">--</span></span>
                                <span class="candle-info-item candle-info-time"><span id="candleTime-${tf.id}">--</span></span>
                            </div>
                        </div>
                        <div class="tf-chart-container">
                            <canvas id="${canvasId}" class="tf-chart-canvas"></canvas>
                            <span class="chart-help">Drag • Scroll zoom</span>
                        </div>
                    </div>
                    <div class="tf-alerts"><span style="color:var(--text-muted)">Loading...</span></div>
                </div>
            `;
        }
        
        const dirClass = data.isBullish ? 'bullish' : 'bearish';
        const dirEmoji = data.isBullish ? '🟢' : '🔴';
        const alerts = data.alerts;
        
        // Build grouped alerts - only show active ones
        const activeAlerts = [];
        
        // RSI group
        if (alerts.extremeOB) activeAlerts.push({ label: 'ExtOB', class: 'rsi-ob', priority: 1 });
        else if (alerts.overbought) activeAlerts.push({ label: 'OB', class: 'rsi-ob', priority: 2 });
        if (alerts.extremeOS) activeAlerts.push({ label: 'ExtOS', class: 'rsi-os', priority: 1 });
        else if (alerts.oversold) activeAlerts.push({ label: 'OS', class: 'rsi-os', priority: 2 });
        
        // Volume group
        if (alerts.volSpike) activeAlerts.push({ label: 'VolSpike', class: 'vol-high', priority: 1 });
        else if (alerts.highVol) activeAlerts.push({ label: 'HighVol', class: 'vol-high', priority: 3 });
        if (alerts.lowVol) activeAlerts.push({ label: 'LowVol', class: 'vol-low', priority: 4 });
        
        // MACD group
        if (alerts.macdBull) activeAlerts.push({ label: 'MACD↑', class: 'macd-bull', priority: 3 });
        if (alerts.macdBear) activeAlerts.push({ label: 'MACD↓', class: 'macd-bear', priority: 3 });
        
        // Candle structure
        if (alerts.indecision) activeAlerts.push({ label: 'Indeci', class: 'neutral', priority: 5 });
        if (alerts.rejectHigh) activeAlerts.push({ label: 'RejHi', class: 'rsi-ob', priority: 4 });
        if (alerts.rejectLow) activeAlerts.push({ label: 'RejLo', class: 'rsi-os', priority: 4 });
        
        // Sort by priority and take top 3
        activeAlerts.sort((a, b) => a.priority - b.priority);
        const topAlerts = activeAlerts.slice(0, 3);
        const moreCount = activeAlerts.length - 3;
        
        const alertsHtml = topAlerts.length > 0 
            ? topAlerts.map(a => `<span class="alert-group ${a.class}">${a.label}</span>`).join('') +
              (moreCount > 0 ? `<span class="alerts-more" title="${activeAlerts.slice(3).map(a => a.label).join(', ')}">+${moreCount}</span>` : '')
            : '<span class="alert-group dim">No alerts</span>';
        
        // Get current price data for this coin (market price)
        const coinData = state.coinData[state.currentCoin?.symbol] || {};
        const currentPrice = coinData.price || data.current?.close || 0;
        const decimals = state.currentCoin?.decimals || 2;
        
        // Get THIS TIMEFRAME's candle data (not 24h data)
        const tfOpen = data.current?.open || 0;
        const tfHigh = data.current?.high || 0;
        const tfLow = data.current?.low || 0;
        const tfClose = data.current?.close || 0;
        const tfChangePct = data.changePct || 0;
        
        // Display Options settings
        const showPriceInfo = state.settings.showPriceInfo !== false;
        const showTimers = state.settings.showTimers !== false;
        const showIndicatorBadges = state.settings.showIndicatorBadges !== false;
        
        const timerHtml = showTimers ? `<span class="tf-timer ${timerAlert ? 'alert' : ''}" id="tf-timer-${tf.id}">${formatTime(secondsToClose)}</span>` : '';
        
        return `
            <div class="tf-row ${dirClass}" data-tf="${tf.id}">
                <div class="tf-info">
                    <div class="tf-info-row tf-info-primary">
                        <span class="tf-name">${tf.label}</span>
                        <span class="tf-direction">${dirEmoji}</span>
                        ${timerHtml}
                        ${showPriceInfo ? `<span class="tf-price-value" id="tf-price-${tf.id}">$${currentPrice.toFixed(decimals)}</span>
                        <span class="tf-price-change ${tfChangePct >= 0 ? 'positive' : 'negative'}" id="tf-change-${tf.id}">${tfChangePct >= 0 ? '+' : ''}${tfChangePct.toFixed(2)}%</span>` : ''}
                    </div>
                    ${showPriceInfo ? `<div class="tf-info-row tf-info-secondary">
                        <span class="tf-price-hl" id="tf-high-${tf.id}">H:$${tfHigh.toFixed(decimals)}</span>
                        <span class="tf-price-hl" id="tf-low-${tf.id}">L:$${tfLow.toFixed(decimals)}</span>
                        ${showIndicatorBadges ? `<span class="tf-stat-mini">B${data.bodyPct.toFixed(0)}%</span>
                        <span class="tf-stat-mini">V${data.volumeRatio.toFixed(1)}x</span>
                        <span class="tf-stat-mini">RSI${data.rsi.toFixed(0)}</span>` : ''}
                    </div>` : ''}
                </div>
                <div class="tf-chart-wrapper">
                    <div class="candle-info-tab" id="candleInfoTab-${tf.id}" style="display:none;">
                        <div class="candle-info-tf">${tf.label}</div>
                        <div class="candle-info-data">
                            <span class="candle-info-item"><b class="label-open">O:</b> <span id="candleO-${tf.id}" class="price-open">--</span></span>
                            <span class="candle-info-item"><b class="label-high">H:</b> <span id="candleH-${tf.id}" class="price-high">--</span></span>
                            <span class="candle-info-item"><b class="label-low">L:</b> <span id="candleL-${tf.id}" class="price-low">--</span></span>
                            <span class="candle-info-item"><b class="label-close">C:</b> <span id="candleC-${tf.id}" class="price-close">--</span></span>
                            <span class="candle-info-item"><b class="label-volume">V:</b> <span id="candleV-${tf.id}" class="price-volume">--</span></span>
                            <span class="candle-info-item candle-info-time"><span id="candleTime-${tf.id}">--</span></span>
                        </div>
                    </div>
                    <div class="tf-chart-container">
                        <canvas id="${canvasId}" class="tf-chart-canvas"></canvas>
                        <span class="chart-help">Drag • Scroll zoom</span>
                    </div>
                </div>
                <div class="tf-bottom">
                    <div class="tf-bottom-alerts">${alertsHtml}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Draw charts and setup interactions
    setTimeout(() => {
        enabledTFs.forEach(tf => {
            const data = state.data[tf.id];
            if (data) {
                const canvasId = `chart-${tf.id}`;
                drawInteractiveChart(canvasId, data, tf.id);
                setupChartInteraction(canvasId, tf.id);
            }
        });
    }, 50);
}

function updatePriceDisplay(data) {
    // Update coin data state (used by TF price info display)
    if (state.currentCoin) {
        const price = parseFloat(data.lastPrice);
        const change = parseFloat(data.priceChangePercent);
        const high = parseFloat(data.highPrice);
        const low = parseFloat(data.lowPrice);
        const volume = parseFloat(data.quoteVolume);
        
        state.coinData[state.currentCoin.symbol] = {
            price,
            change,
            high,
            low,
            volume
        };
        
        // Targeted price update - don't rebuild entire DOM
        const decimals = state.currentCoin.decimals || 2;
        const enabledTFs = state.timeframes.filter(tf => tf.enabled);
        
        enabledTFs.forEach(tf => {
            const priceEl = document.getElementById(`tf-price-${tf.id}`);
            if (priceEl) priceEl.textContent = `$${price.toFixed(decimals)}`;
        });
    }
}

function updateConfluenceDisplay(pct, bullCount, bearCount, tfWeights) {
    const fill = document.getElementById('confluenceFill');
    const scoreEl = document.getElementById('confluenceScore');
    const bullEl = document.getElementById('bullCount');
    const bearEl = document.getElementById('bearCount');
    const biasEl = document.getElementById('biasIndicator');
    const methodName = document.getElementById('methodName');
    const methodFormula = document.getElementById('methodFormula');
    const methodWeights = document.getElementById('methodWeights');
    
    fill.style.left = `${pct}%`;
    
    scoreEl.querySelector('.stat-value').textContent = `${pct.toFixed(1)}%`;
    scoreEl.querySelector('.stat-value').className = `stat-value ${pct >= 60 ? 'text-bull' : pct <= 40 ? 'text-bear' : 'text-neutral'}`;
    
    bullEl.querySelector('.stat-value').textContent = bullCount;
    bearEl.querySelector('.stat-value').textContent = bearCount;
    
    let bias = '—', biasClass = '';
    if (pct >= 70) { bias = '🟢 BULL'; biasClass = 'text-bull'; }
    else if (pct <= 30) { bias = '🔴 BEAR'; biasClass = 'text-bear'; }
    else { bias = '🟡 MIXED'; biasClass = 'text-neutral'; }
    
    biasEl.querySelector('.stat-value').textContent = bias;
    biasEl.querySelector('.stat-value').className = `stat-value ${biasClass}`;
    
    const method = state.settings.weightMethod || 'linear';
    const methodData = WEIGHT_METHODS[method];
    
    if (methodName && methodData) {
        methodName.textContent = method.charAt(0).toUpperCase() + method.slice(1);
    }
    
    if (methodFormula && methodData) {
        let formula = methodData.description || '';
        const mods = [];
        if (state.settings.useStrengthMod) mods.push('Body(×0.5-1.5)');
        if (state.settings.useVolumeMod) mods.push('Vol(×0.7-1.3)');
        if (state.settings.useIndicatorMod) mods.push('Ind(×0.8-1.4)');
        if (mods.length > 0) formula += `\nModifiers: ${mods.join(', ')}`;
        methodFormula.textContent = formula;
    }
    
    if (methodWeights && tfWeights.length > 0) {
        methodWeights.innerHTML = tfWeights.map(w => 
            `<div>${w.dir} ${w.tf}: ${w.base}→${w.final} ${w.mods ? `(${w.mods})` : ''}</div>`
        ).join('');
    }
}

function formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return vol.toFixed(2);
}

// ============================================
// CONFLUENCE HISTORY TRACKING
// ============================================

function trackConfluenceHistory(pct, bias) {
    // Only track high confluence (>= 70% bullish or <= 30% bearish)
    if (pct < 70 && pct > 30) return;
    
    const now = new Date();
    const currentPrice = state.coinData[state.currentCoin?.symbol]?.price || 0;
    
    // Don't record too frequently (min 5 minutes between records)
    const lastRecord = state.confluenceHistory[0];
    if (lastRecord) {
        const timeDiff = now - new Date(lastRecord.time);
        if (timeDiff < 5 * 60 * 1000) return; // Less than 5 minutes
    }
    
    // Update results for previous records (price movement since then)
    updateHistoryResults(currentPrice);
    
    // Add new record
    const record = {
        time: now.toISOString(),
        timeDisplay: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        confluence: pct,
        bias: bias,
        price: currentPrice,
        coin: state.currentCoin?.symbol,
        result: null // Will be updated later
    };
    
    state.confluenceHistory.unshift(record);
    
    // Keep only last 20 records
    if (state.confluenceHistory.length > 20) {
        state.confluenceHistory = state.confluenceHistory.slice(0, 20);
    }
    
    // Save to localStorage
    saveConfluenceHistory();
    renderConfluenceHistory();
}

function updateHistoryResults(currentPrice) {
    state.confluenceHistory.forEach(record => {
        if (record.coin === state.currentCoin?.symbol && record.price && !record.resultLocked) {
            const priceDiff = currentPrice - record.price;
            const pctChange = (priceDiff / record.price) * 100;
            record.result = pctChange;
            
            // Lock result after 30 minutes
            const recordTime = new Date(record.time);
            const now = new Date();
            if (now - recordTime > 30 * 60 * 1000) {
                record.resultLocked = true;
            }
        }
    });
}

function saveConfluenceHistory() {
    const key = `mtfcm_history_${state.currentCoin?.symbol}`;
    localStorage.setItem(key, JSON.stringify(state.confluenceHistory.filter(r => r.coin === state.currentCoin?.symbol).slice(0, 10)));
}

function loadConfluenceHistory() {
    if (!state.currentCoin) return;
    const key = `mtfcm_history_${state.currentCoin.symbol}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            // Merge with existing history, keeping unique times
            const existing = state.confluenceHistory.filter(r => r.coin !== state.currentCoin.symbol);
            state.confluenceHistory = [...loaded, ...existing];
        } catch (e) {
            console.error('Error loading confluence history:', e);
        }
    }
    renderConfluenceHistory();
}

function renderConfluenceHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const coinHistory = state.confluenceHistory.filter(r => r.coin === state.currentCoin?.symbol);
    
    if (coinHistory.length === 0) {
        container.innerHTML = '<div class="history-empty">No high confluence moments recorded yet</div>';
        return;
    }
    
    container.innerHTML = coinHistory.slice(0, 10).map(record => {
        const biasClass = record.bias === 'BULL' ? 'bull' : 'bear';
        const confClass = record.confluence >= 50 ? 'bull' : 'bear';
        const resultClass = record.result > 0 ? 'positive' : record.result < 0 ? 'negative' : '';
        const resultText = record.result !== null ? `${record.result >= 0 ? '+' : ''}${record.result.toFixed(2)}%` : '--';
        
        return `
            <div class="history-item">
                <span class="history-time">${record.timeDisplay}</span>
                <span class="history-conf ${confClass}">${record.confluence.toFixed(0)}%</span>
                <span class="history-bias ${biasClass}">${record.bias}</span>
                <span class="history-result ${resultClass}">${resultText}</span>
            </div>
        `;
    }).join('');
}

// ============================================
// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Main TF Block settings button
    document.getElementById('mainBlockSettingsBtn')?.addEventListener('click', () => {
        const settings = document.getElementById('mainBlockSettings');
        if (settings) {
            settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', openSidebar);
    document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
    
    // Coin search
    const coinSearch = document.getElementById('coinSearch');
    if (coinSearch) {
        coinSearch.addEventListener('input', (e) => filterCoins(e.target.value));
    }
    
    // Chart options - indicator toggles in TF settings
    ['showChartVolume', 'showChartMA', 'showChartEMA', 'showChartVWAP'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', (e) => {
            state.settings[id] = e.target.checked;
            saveSettings();
            renderTimeframeRows();
        });
    });
    
    // Volume type selector in TF settings
    document.getElementById('volumeTypeSelect')?.addEventListener('change', (e) => {
        state.settings.volumeType = e.target.value;
        saveSettings();
        renderTimeframeRows();
    });
    
    // MA/EMA period inputs in TF settings
    document.getElementById('maLinesInputTF')?.addEventListener('change', (e) => {
        const maLines = e.target.value.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n > 0 && n <= 500);
        state.settings.maLines = maLines.length > 0 ? maLines : [20];
        saveSettings();
        renderTimeframeRows();
    });
    
    document.getElementById('emaLinesInputTF')?.addEventListener('change', (e) => {
        const emaLines = e.target.value.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n > 0 && n <= 500);
        state.settings.emaLines = emaLines.length > 0 ? emaLines : [21];
        saveSettings();
        renderTimeframeRows();
    });
    
    // Pattern toggle checkboxes
    const patternMap = {
        'patternDoji': 'doji',
        'patternHammer': 'hammer',
        'patternInvHammer': 'invHammer',
        'patternHangingMan': 'hangingMan',
        'patternShootStar': 'shootStar',
        'patternMarubozu': 'marubozu',
        'patternSpinTop': 'spinTop',
        'patternBullEngulf': 'bullEngulf',
        'patternBearEngulf': 'bearEngulf',
        'patternBullHarami': 'bullHarami',
        'patternBearHarami': 'bearHarami',
        'patternPiercing': 'piercing',
        'patternDarkCloud': 'darkCloud',
        'patternTweezTop': 'tweezTop',
        'patternTweezBot': 'tweezBot',
        'patternMorningStar': 'morningStar',
        'patternEveningStar': 'eveningStar',
        'pattern3Soldiers': 'threeSoldiers',
        'pattern3Crows': 'threeCrows'
    };
    
    // Ensure patterns object exists
    if (!state.settings.patterns) state.settings.patterns = {};
    
    Object.entries(patternMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el) {
            // Load saved setting
            el.checked = state.settings.patterns[key] !== false;
            // Add change listener
            el.addEventListener('change', (e) => {
                state.settings.patterns[key] = e.target.checked;
                saveSettings();
                renderTimeframeRows();
            });
        }
    });
    
    // Select all / Deselect all patterns
    document.getElementById('selectAllPatterns')?.addEventListener('click', () => {
        Object.values(patternMap).forEach(key => {
            state.settings.patterns[key] = true;
        });
        Object.keys(patternMap).forEach(elId => {
            const el = document.getElementById(elId);
            if (el) el.checked = true;
        });
        saveSettings();
        renderTimeframeRows();
    });
    
    document.getElementById('deselectAllPatterns')?.addEventListener('click', () => {
        Object.values(patternMap).forEach(key => {
            state.settings.patterns[key] = false;
        });
        Object.keys(patternMap).forEach(elId => {
            const el = document.getElementById(elId);
            if (el) el.checked = false;
        });
        saveSettings();
        renderTimeframeRows();
    });
    
    // Coin comparison slots
    initCoinComparisonPanel();
    
    // TF Settings toggle (inline settings in TF card)
    document.getElementById('tfSettingsBtn')?.addEventListener('click', () => {
        const tfSettings = document.getElementById('tfSettings');
        if (tfSettings) {
            tfSettings.style.display = tfSettings.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Confluence settings toggle (inline settings in confluence card)
    document.getElementById('confluenceSettingsBtn')?.addEventListener('click', () => {
        const confSettings = document.getElementById('confluenceSettings');
        if (confSettings) {
            confSettings.style.display = confSettings.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Inline settings - auto-save on change
    // Alert settings
    document.getElementById('alertSeconds')?.addEventListener('change', (e) => {
        state.settings.alertSeconds = parseInt(e.target.value);
        saveSettings();
    });
    
    document.getElementById('minConfluence')?.addEventListener('change', (e) => {
        state.settings.minConfluence = parseInt(e.target.value);
        saveSettings();
    });
    
    document.getElementById('enableSound')?.addEventListener('change', (e) => {
        state.settings.enableSound = e.target.checked;
        saveSettings();
    });
    
    // Confluence settings
    document.getElementById('weightMethod')?.addEventListener('change', (e) => {
        state.settings.weightMethod = e.target.value;
        saveSettings();
        calculateConfluence();
    });
    
    ['useStrengthMod', 'useVolumeMod', 'useIndicatorMod'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            state.settings[id] = e.target.checked;
            saveSettings();
            calculateConfluence();
        });
    });
    
    // Display settings
    ['showRSI', 'showMACD', 'showVolume'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            state.settings[id] = e.target.checked;
            saveSettings();
            renderTimeframeRows();
        });
    });
    
    // Display Options (from TF Settings)
    ['showPriceInfo', 'showTimers', 'showIndicatorBadges', 'showConfluenceBar', 'showPriceScale'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            state.settings[id] = e.target.checked;
            saveSettings();
            renderTimeframeRows();
            redrawAddedCoinCharts();
        });
    });
    
    // Tip Jar modal
    document.getElementById('tipJarBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('tipJarModal').classList.add('active');
    });
    
    document.getElementById('closeTipJar')?.addEventListener('click', () => {
        document.getElementById('tipJarModal').classList.remove('active');
    });
    
    document.getElementById('tipJarModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tipJarModal') {
            document.getElementById('tipJarModal').classList.remove('active');
        }
    });
    
    // Copy crypto address buttons
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.copy;
            const code = document.getElementById(targetId);
            if (code) {
                navigator.clipboard.writeText(code.textContent);
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = '📋', 2000);
            }
        });
    });
    
    // Sidebar tabs (All Coins / Watchlist)
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabId === 'watchlist') {
                document.getElementById('coinsList').style.display = 'none';
                document.getElementById('watchlistList').style.display = 'block';
                renderWatchlist();
            } else {
                document.getElementById('coinsList').style.display = 'block';
                document.getElementById('watchlistList').style.display = 'none';
            }
        });
    });
    
    // Header star button (watchlist toggle)
    document.getElementById('headerStarBtn')?.addEventListener('click', () => {
        if (state.currentCoin) {
            toggleWatchlist(state.currentCoin.symbol);
            // Update star button state
            const starBtn = document.getElementById('headerStarBtn');
            const watchlist = getWatchlist();
            const isStarred = watchlist.includes(state.currentCoin.symbol);
            starBtn.textContent = isStarred ? '★' : '☆';
            starBtn.classList.toggle('starred', isStarred);
        }
    });
    
    // Confluence history toggle
    document.getElementById('historyToggle')?.addEventListener('click', () => {
        const historySection = document.getElementById('confluenceHistory');
        historySection?.classList.toggle('collapsed');
    });
    
    // Card settings button toggle visual state
    document.getElementById('tfSettingsBtn')?.addEventListener('click', function() {
        this.classList.toggle('active');
    });
    
    document.getElementById('confluenceSettingsBtn')?.addEventListener('click', function() {
        this.classList.toggle('active');
    });
    
    // View mode select (clear/advanced)
    document.getElementById('viewModeSelect')?.addEventListener('change', (e) => {
        state.settings.viewMode = e.target.value;
        if (e.target.value === 'clear') {
            document.body.classList.add('clear-mode');
        } else {
            document.body.classList.remove('clear-mode');
        }
        saveSettings();
        renderTimeframeRows();
    });
    
    // Candle popup type select (hover-tab/click-popup)
    document.getElementById('candlePopupType')?.addEventListener('change', (e) => {
        state.settings.candlePopupType = e.target.value;
        saveSettings();
    });
    
    // Theme select in settings
    document.getElementById('themeSelect')?.addEventListener('change', (e) => {
        state.settings.theme = e.target.value;
        applyTheme(state.settings.theme);
        saveSettings();
        renderTimeframeRows();
        redrawAddedCoinCharts();
    });
    
    // Multi-coin view toggle
    document.getElementById('multiCoinBtn')?.addEventListener('click', () => {
        toggleMultiCoinView();
    });
    
    document.getElementById('addCoinPanel')?.addEventListener('click', () => {
        addCoinPanel();
    });
    
    document.getElementById('closeMultiView')?.addEventListener('click', () => {
        closeMultiCoinView();
    });
    
    // Theme toggle button in header
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        cycleTheme();
    });
    
    // Window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderTimeframeRows();
            if (state.multiCoinMode) {
                updateMultiCoinPanels();
            }
            redrawAddedCoinCharts();
        }, 200);
    });
}

// Watchlist functions
function getWatchlist() {
    const saved = localStorage.getItem('mtfcm_watchlist');
    return saved ? JSON.parse(saved) : [];
}

function saveWatchlist(watchlist) {
    localStorage.setItem('mtfcm_watchlist', JSON.stringify(watchlist));
}

function toggleWatchlist(symbol) {
    let watchlist = getWatchlist();
    if (watchlist.includes(symbol)) {
        watchlist = watchlist.filter(s => s !== symbol);
    } else {
        watchlist.push(symbol);
    }
    saveWatchlist(watchlist);
    renderCoinsSidebar();
    renderWatchlist();
}

function renderWatchlist() {
    const container = document.getElementById('watchlistList');
    const watchlist = getWatchlist();
    
    if (watchlist.length === 0) {
        container.innerHTML = `
            <div class="watchlist-empty">
                <p>No coins in watchlist</p>
                <small>Click ⭐ on any coin to add</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = watchlist.map(symbol => {
        const coin = state.coins.find(c => c.symbol === symbol);
        if (!coin) return '';
        
        const data = state.coinData[symbol] || {};
        const confluenceScore = data.confluenceScore || 50;
        const bias = confluenceScore >= 60 ? '🟢' : confluenceScore <= 40 ? '🔴' : '🟡';
        
        return `
            <div class="watchlist-item" data-symbol="${symbol}">
                <img src="${coin.icon}" alt="${coin.shortName}" width="24" height="24" onerror="this.style.display='none'">
                <div class="watchlist-item-info">
                    <div class="watchlist-item-name">${coin.shortName}</div>
                    <div class="watchlist-item-price">$${(data.price || 0).toFixed(coin.decimals || 2)}</div>
                </div>
                <div class="watchlist-confluence">
                    <div class="watchlist-confluence-marker" style="left: ${confluenceScore}%"></div>
                </div>
                <span class="watchlist-bias">${bias}</span>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.watchlist-item').forEach(item => {
        item.addEventListener('click', () => {
            selectCoin(item.dataset.symbol);
            closeSidebar();
        });
    });
}

function loadSettingsToForm() {
    // Alert settings
    const alertSeconds = document.getElementById('alertSeconds');
    const minConfluence = document.getElementById('minConfluence');
    const enableSound = document.getElementById('enableSound');
    
    if (alertSeconds) alertSeconds.value = state.settings.alertSeconds;
    if (minConfluence) minConfluence.value = state.settings.minConfluence;
    if (enableSound) enableSound.checked = state.settings.enableSound;
    
    // Confluence settings
    const weightMethod = document.getElementById('weightMethod');
    const useStrengthMod = document.getElementById('useStrengthMod');
    const useVolumeMod = document.getElementById('useVolumeMod');
    const useIndicatorMod = document.getElementById('useIndicatorMod');
    
    if (weightMethod) weightMethod.value = state.settings.weightMethod;
    if (useStrengthMod) useStrengthMod.checked = state.settings.useStrengthMod;
    if (useVolumeMod) useVolumeMod.checked = state.settings.useVolumeMod;
    if (useIndicatorMod) useIndicatorMod.checked = state.settings.useIndicatorMod;
    
    // Display settings
    const showRSI = document.getElementById('showRSI');
    const showMACD = document.getElementById('showMACD');
    const showVolume = document.getElementById('showVolume');
    const showWarnings = document.getElementById('showWarnings');
    
    if (showRSI) showRSI.checked = state.settings.showRSI;
    if (showMACD) showMACD.checked = state.settings.showMACD;
    if (showVolume) showVolume.checked = state.settings.showVolume;
    if (showWarnings) showWarnings.checked = state.settings.showWarnings;
    
    // Theme select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = state.settings.theme || 'dark';
    
    // View mode toggle
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (viewModeToggle) viewModeToggle.checked = state.settings.advancedMode !== false;
}

function saveSettingsFromForm() {
    state.settings.alertSeconds = parseInt(document.getElementById('alertSeconds').value);
    state.settings.minConfluence = parseInt(document.getElementById('minConfluence').value);
    state.settings.enableSound = document.getElementById('enableSound').checked;
    state.settings.weightMethod = document.getElementById('weightMethod').value;
    state.settings.useStrengthMod = document.getElementById('useStrengthMod').checked;
    state.settings.useVolumeMod = document.getElementById('useVolumeMod').checked;
    state.settings.useIndicatorMod = document.getElementById('useIndicatorMod').checked;
    state.settings.showRSI = document.getElementById('showRSI').checked;
    state.settings.showMACD = document.getElementById('showMACD').checked;
    state.settings.showVolume = document.getElementById('showVolume').checked;
    state.settings.showWarnings = document.getElementById('showWarnings').checked;
    
    saveSettings();
}

function loadIndicatorsToForm() {
    const maLinesInput = document.getElementById('maLinesInput');
    const emaLinesInput = document.getElementById('emaLinesInput');
    const rsiLinesInput = document.getElementById('rsiLinesInput');
    
    if (maLinesInput) maLinesInput.value = (state.settings.maLines || [20]).join(', ');
    if (emaLinesInput) emaLinesInput.value = (state.settings.emaLines || [21]).join(', ');
    if (rsiLinesInput) rsiLinesInput.value = (state.settings.rsiLines || [14]).join(', ');
    
    // Checkboxes
    const showVWAP = document.getElementById('showChartVWAPModal');
    const showMACD = document.getElementById('showChartMACDModal');
    const showPatterns = document.getElementById('showChartPatternsModal');
    const showMarkers = document.getElementById('showChartMarkersModal');
    const showVolume = document.getElementById('showChartVolumeModal');
    const volumeType = document.getElementById('volumeTypeModal');
    
    if (showVWAP) showVWAP.checked = state.settings.showChartVWAP;
    if (showMACD) showMACD.checked = state.settings.showChartMACD;
    if (showPatterns) showPatterns.checked = state.settings.showChartPatterns !== false;
    if (showMarkers) showMarkers.checked = state.settings.showChartMarkers !== false;
    if (showVolume) showVolume.checked = state.settings.showChartVolume !== false;
    if (volumeType) volumeType.value = state.settings.volumeType || 'buysell';
}

function saveIndicatorsFromForm() {
    const maLinesInput = document.getElementById('maLinesInput');
    const emaLinesInput = document.getElementById('emaLinesInput');
    const rsiLinesInput = document.getElementById('rsiLinesInput');
    
    if (maLinesInput) {
        const maLines = maLinesInput.value.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n > 0 && n <= 500);
        state.settings.maLines = maLines.length > 0 ? maLines : [20];
    }
    
    if (emaLinesInput) {
        const emaLines = emaLinesInput.value.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n > 0 && n <= 500);
        state.settings.emaLines = emaLines.length > 0 ? emaLines : [21];
    }
    
    if (rsiLinesInput) {
        const rsiLines = rsiLinesInput.value.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n > 0 && n <= 100);
        state.settings.rsiLines = rsiLines.length > 0 ? rsiLines : [14];
    }
    
    // Checkboxes
    const showVWAP = document.getElementById('showChartVWAPModal');
    const showMACD = document.getElementById('showChartMACDModal');
    const showPatterns = document.getElementById('showChartPatternsModal');
    const showMarkers = document.getElementById('showChartMarkersModal');
    const showVolume = document.getElementById('showChartVolumeModal');
    const volumeType = document.getElementById('volumeTypeModal');
    
    if (showVWAP) state.settings.showChartVWAP = showVWAP.checked;
    if (showMACD) state.settings.showChartMACD = showMACD.checked;
    if (showPatterns) state.settings.showChartPatterns = showPatterns.checked;
    if (showMarkers) state.settings.showChartMarkers = showMarkers.checked;
    if (showVolume) state.settings.showChartVolume = showVolume.checked;
    if (volumeType) state.settings.volumeType = volumeType.value;
    
    saveSettings();
}

// ============================================
// MULTI-COIN VIEW
// ============================================

state.multiCoinMode = false;
state.coinPanels = []; // Array of { id, symbol, timeframes, data }

function toggleMultiCoinView() {
    state.multiCoinMode = !state.multiCoinMode;
    
    const multiContainer = document.getElementById('multiCoinContainer');
    const singleView = document.getElementById('singleCoinView');
    const btn = document.getElementById('multiCoinBtn');
    
    if (state.multiCoinMode) {
        multiContainer.style.display = 'flex';
        singleView.style.display = 'none';
        btn.classList.add('active');
        
        // Initialize with current coin if no panels exist
        if (state.coinPanels.length === 0 && state.currentCoin) {
            addCoinPanel(state.currentCoin.symbol);
        }
        
        renderMultiCoinPanels();
    } else {
        closeMultiCoinView();
    }
}

function closeMultiCoinView() {
    state.multiCoinMode = false;
    
    const multiContainer = document.getElementById('multiCoinContainer');
    const singleView = document.getElementById('singleCoinView');
    const btn = document.getElementById('multiCoinBtn');
    
    multiContainer.style.display = 'none';
    singleView.style.display = 'block';
    btn.classList.remove('active');
}

function addCoinPanel(symbol = null) {
    if (state.coinPanels.length >= 3) {
        showKeyboardHint('Maximum 4 coins');
        return;
    }
    
    const panelId = 'panel-' + Date.now();
    const coinSymbol = symbol || (state.coins[0]?.symbol);
    
    // Get default enabled timeframes
    const enabledTFs = state.timeframes.filter(tf => tf.enabled).map(tf => tf.id);
    
    state.coinPanels.push({
        id: panelId,
        symbol: coinSymbol,
        timeframes: enabledTFs.length > 0 ? enabledTFs : ['5m', '15m', '1h'],
        data: {},
        candles: {}
    });
    
    renderMultiCoinPanels();
    fetchPanelData(panelId);
}

function removeCoinPanel(panelId) {
    state.coinPanels = state.coinPanels.filter(p => p.id !== panelId);
    
    if (state.coinPanels.length === 0) {
        closeMultiCoinView();
    } else {
        renderMultiCoinPanels();
    }
}

function renderMultiCoinPanels() {
    const container = document.getElementById('multiCoinPanels');
    const panelCount = state.coinPanels.length;
    
    // Set grid class
    container.className = `multi-coin-panels panels-${panelCount}`;
    
    container.innerHTML = state.coinPanels.map(panel => {
        const coin = state.coins.find(c => c.symbol === panel.symbol);
        const coinData = state.coinData[panel.symbol] || {};
        const change = coinData.change || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        
        // Build coin selector options
        const coinOptions = state.coins.map(c => 
            `<option value="${c.symbol}" ${c.symbol === panel.symbol ? 'selected' : ''}>${c.shortName}</option>`
        ).join('');
        
        // Build timeframe toggles
        const tfToggles = state.timeframes.map(tf => {
            const isActive = panel.timeframes.includes(tf.id);
            const tfData = panel.data[tf.id];
            const dirClass = tfData ? (tfData.isBullish ? 'bullish' : 'bearish') : '';
            return `<button class="coin-panel-tf-btn ${isActive ? 'active' : ''} ${dirClass}" 
                            data-panel="${panel.id}" data-tf="${tf.id}">${tf.label}</button>`;
        }).join('');
        
        // Calculate panel confluence
        let panelConfluence = 50;
        let bullCount = 0, bearCount = 0;
        panel.timeframes.forEach(tfId => {
            const tfData = panel.data[tfId];
            if (tfData) {
                if (tfData.isBullish) bullCount++;
                else bearCount++;
            }
        });
        if (bullCount + bearCount > 0) {
            panelConfluence = (bullCount / (bullCount + bearCount)) * 100;
        }
        
        // Build mini charts
        const chartsHtml = panel.timeframes.map(tfId => {
            const tf = state.timeframes.find(t => t.id === tfId);
            const secondsToClose = getSecondsToClose(tf);
            return `
                <div class="coin-panel-chart-row">
                    <div class="coin-panel-chart-header">
                        <span class="coin-panel-chart-tf">${tf.label}</span>
                        <span class="coin-panel-chart-timer">${formatTime(secondsToClose)}</span>
                    </div>
                    <canvas class="coin-panel-chart-canvas" id="panel-chart-${panel.id}-${tfId}"></canvas>
                </div>
            `;
        }).join('');
        
        return `
            <div class="coin-panel" id="${panel.id}">
                <div class="coin-panel-header">
                    <div class="coin-panel-select">
                        <img src="${coin?.icon || ''}" alt="" onerror="this.style.display='none'">
                        <select data-panel="${panel.id}" class="panel-coin-select">
                            ${coinOptions}
                        </select>
                        <span class="coin-panel-price">$${(coinData.price || 0).toFixed(coin?.decimals || 2)}</span>
                        <span class="coin-panel-change ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
                    </div>
                    <div class="coin-panel-actions">
                        <button onclick="removeCoinPanel('${panel.id}')" title="Remove">✕</button>
                    </div>
                </div>
                <div class="coin-panel-body">
                    <div class="coin-panel-confluence">
                        <div class="coin-panel-confluence-bar">
                            <div class="coin-panel-confluence-marker" style="left: ${panelConfluence}%"></div>
                        </div>
                        <span class="coin-panel-confluence-value" style="color: ${panelConfluence >= 60 ? 'var(--bull-color)' : panelConfluence <= 40 ? 'var(--bear-color)' : 'var(--neutral-color)'}">
                            ${panelConfluence.toFixed(0)}%
                        </span>
                    </div>
                    <div class="coin-panel-tf-toggles">
                        ${tfToggles}
                    </div>
                    <div class="coin-panel-charts">
                        ${chartsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for coin selects
    container.querySelectorAll('.panel-coin-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const panelId = e.target.dataset.panel;
            const newSymbol = e.target.value;
            changePanelCoin(panelId, newSymbol);
        });
    });
    
    // Add event listeners for TF toggles
    container.querySelectorAll('.coin-panel-tf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panelId = e.target.dataset.panel;
            const tfId = e.target.dataset.tf;
            togglePanelTimeframe(panelId, tfId);
        });
    });
    
    // Draw charts after a small delay
    setTimeout(() => {
        state.coinPanels.forEach(panel => {
            panel.timeframes.forEach(tfId => {
                drawPanelChart(panel.id, tfId);
            });
        });
    }, 50);
}

function changePanelCoin(panelId, newSymbol) {
    const panel = state.coinPanels.find(p => p.id === panelId);
    if (panel) {
        panel.symbol = newSymbol;
        panel.data = {};
        panel.candles = {};
        fetchPanelData(panelId);
        renderMultiCoinPanels();
    }
}

function togglePanelTimeframe(panelId, tfId) {
    const panel = state.coinPanels.find(p => p.id === panelId);
    if (!panel) return;
    
    if (panel.timeframes.includes(tfId)) {
        // Remove if more than 1 timeframe
        if (panel.timeframes.length > 1) {
            panel.timeframes = panel.timeframes.filter(t => t !== tfId);
        }
    } else {
        panel.timeframes.push(tfId);
        // Fetch data for new timeframe
        fetchPanelTimeframeData(panelId, tfId);
    }
    
    renderMultiCoinPanels();
}

async function fetchPanelData(panelId) {
    const panel = state.coinPanels.find(p => p.id === panelId);
    if (!panel) return;
    
    for (const tfId of panel.timeframes) {
        await fetchPanelTimeframeData(panelId, tfId);
    }
    
    renderMultiCoinPanels();
}

async function fetchPanelTimeframeData(panelId, tfId) {
    const panel = state.coinPanels.find(p => p.id === panelId);
    if (!panel) return;
    
    try {
        const response = await fetch(
            `${BINANCE_API}/klines?symbol=${panel.symbol}&interval=${tfId}&limit=${CANDLE_LIMIT}`
        );
        const data = await response.json();
        
        const candles = data.map(candle => ({
            openTime: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            closeTime: candle[6]
        }));
        
        panel.candles[tfId] = candles;
        panel.data[tfId] = analyzeCandles(candles, tfId);
        
    } catch (e) {
        console.error(`Error fetching panel data for ${panel.symbol} ${tfId}:`, e);
    }
}

function drawPanelChart(panelId, tfId) {
    const panel = state.coinPanels.find(p => p.id === panelId);
    if (!panel || !panel.candles[tfId]) return;
    
    const canvasId = `panel-chart-${panelId}-${tfId}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 60 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '60px';
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = 60;
    
    const candles = panel.candles[tfId];
    const displayCandles = candles.slice(-30); // Show last 30 candles
    
    if (displayCandles.length === 0) return;
    
    const prices = displayCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const padding = { top: 2, right: 2, bottom: 2, left: 2 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const scaleY = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    
    const candleSpacing = chartWidth / displayCandles.length;
    const candleWidth = Math.max(1, candleSpacing * 0.7);
    
    // Theme colors
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    const isColorful = theme === 'colorful';
    const bgColor = isDark ? '#1e1e42' : (isColorful ? '#faf5ff' : '#fafbfc');
    const bullColor = isDark ? '#34d399' : '#059669';
    const bearColor = isDark ? '#fb7185' : '#e11d48';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw candles
    displayCandles.forEach((candle, i) => {
        const x = padding.left + i * candleSpacing + candleSpacing / 2;
        const isBull = candle.close >= candle.open;
        const openY = scaleY(candle.open);
        const closeY = scaleY(candle.close);
        const highY = scaleY(candle.high);
        const lowY = scaleY(candle.low);
        
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        ctx.fillStyle = isBull ? bullColor : bearColor;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
}

function updateMultiCoinPanels() {
    if (!state.multiCoinMode) return;
    
    // Redraw all panel charts
    state.coinPanels.forEach(panel => {
        panel.timeframes.forEach(tfId => {
            drawPanelChart(panel.id, tfId);
        });
    });
}

// Update multi-coin panels periodically
setInterval(() => {
    if (state.multiCoinMode) {
        state.coinPanels.forEach(panel => {
            fetchPanelData(panel.id);
        });
    }
}, 10000);

// ============================================
// ADD COIN PANEL (Simple + Button Design)
// ============================================

state.addedCoins = []; // Array of added coin symbols (max 3)

function initCoinComparisonPanel() {
    const addBtn = document.getElementById('addCoinBtn');
    const dropdown = document.getElementById('addCoinDropdown');
    const dropdownList = document.getElementById('coinDropdownList');
    const searchInput = document.getElementById('coinDropdownSearch');
    
    if (!addBtn || !dropdown) return;
    
    // Toggle dropdown on button click
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            populateCoinDropdown();
            searchInput?.focus();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== addBtn) {
            dropdown.style.display = 'none';
        }
    });
    
    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCoinDropdown(e.target.value);
        });
    }
    
    // Load saved added coins
    if (state.settings.comparisonCoins && state.settings.comparisonCoins.length > 0) {
        state.addedCoins = [...state.settings.comparisonCoins].slice(0, 4);
        renderAddedCoins();
    }
    
    // Update + button visibility based on coin count
    updateAddButtonVisibility();
}

function populateCoinDropdown() {
    const dropdownList = document.getElementById('coinDropdownList');
    if (!dropdownList) return;
    
    const currentSymbol = state.currentCoin?.symbol;
    
    dropdownList.innerHTML = state.coins.map(coin => {
        const isCurrentCoin = coin.symbol === currentSymbol;
        const isAlreadyAdded = state.addedCoins.includes(coin.symbol);
        const isDisabled = isCurrentCoin || isAlreadyAdded;
        
        // Get logo URL - try multiple sources with fallback
        const baseSymbol = coin.symbol.replace('USDT', '').toLowerCase();
        const logoUrl = getCoinLogoUrl(baseSymbol);
        
        return `
            <div class="coin-dropdown-item ${isDisabled ? 'disabled' : ''}" 
                 data-symbol="${coin.symbol}" 
                 ${isDisabled ? '' : 'onclick="addCoinToComparison(\'' + coin.symbol + '\')"'}>
                <img class="coin-dropdown-logo" src="${logoUrl}" onerror="this.onerror=null;this.src=getDefaultCoinLogo();">
                <span class="coin-dropdown-name">${coin.name}</span>
                <span class="coin-dropdown-symbol">${baseSymbol.toUpperCase()}</span>
            </div>
        `;
    }).join('');
}

// Get coin logo URL with multiple fallback sources
function getCoinLogoUrl(symbol) {
    // Use CryptoCompare as primary source (better coverage)
    return `https://www.cryptocompare.com/media/37746238/${symbol}.png`;
}

// Get default coin logo (gray circle with coin initial)
function getDefaultCoinLogo() {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="12" fill="#4a5568"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-family="Arial">$</text></svg>');
}

function filterCoinDropdown(query) {
    const dropdownList = document.getElementById('coinDropdownList');
    if (!dropdownList) return;
    
    const items = dropdownList.querySelectorAll('.coin-dropdown-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.coin-dropdown-name')?.textContent.toLowerCase() || '';
        const symbol = item.dataset.symbol?.toLowerCase() || '';
        const matches = name.includes(lowerQuery) || symbol.includes(lowerQuery);
        item.style.display = matches ? 'flex' : 'none';
    });
}

function addCoinToComparison(symbol) {
    if (state.addedCoins.length >= 3) {
        showKeyboardHint('Maximum 4 coins');
        return;
    }
    
    if (state.addedCoins.includes(symbol)) return;
    if (symbol === state.currentCoin?.symbol) return;
    
    state.addedCoins.push(symbol);
    
    // Save to settings
    state.settings.comparisonCoins = [...state.addedCoins];
    saveSettings();
    
    // Close dropdown
    const dropdown = document.getElementById('addCoinDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    // Render added coins
    renderAddedCoins();
    updateAddButtonVisibility();
}

function removeAddedCoin(symbol) {
    state.addedCoins = state.addedCoins.filter(s => s !== symbol);
    
    // Clean up state
    if (state.addedCoinTfState) delete state.addedCoinTfState[symbol];
    if (state.addedCoinData) delete state.addedCoinData[symbol];
    if (state.addedCoinCandles) {
        Object.keys(state.addedCoinCandles).forEach(key => {
            if (key.startsWith(symbol)) delete state.addedCoinCandles[key];
        });
    }
    
    // Save to settings
    state.settings.comparisonCoins = [...state.addedCoins];
    saveSettings();
    
    // Re-render
    renderAddedCoins();
    updateAddButtonVisibility();
}

function swapAddedCoin(oldSymbol, newSymbol) {
    // Debounce rapid switches
    if (state._swapDebounce) clearTimeout(state._swapDebounce);
    state._swapDebounce = setTimeout(() => {
        _doSwapAddedCoin(oldSymbol, newSymbol);
    }, 300);
}

function _doSwapAddedCoin(oldSymbol, newSymbol) {
    // Replace in addedCoins array
    const idx = state.addedCoins.indexOf(oldSymbol);
    if (idx === -1) return;
    
    state.addedCoins[idx] = newSymbol;
    
    // Clean up old coin state
    if (state.addedCoinTfState) delete state.addedCoinTfState[oldSymbol];
    if (state.addedCoinData) delete state.addedCoinData[oldSymbol];
    if (state.addedCoinCandles) {
        Object.keys(state.addedCoinCandles).forEach(key => {
            if (key.startsWith(oldSymbol)) delete state.addedCoinCandles[key];
        });
    }
    
    // Save to settings
    state.settings.comparisonCoins = [...state.addedCoins];
    saveSettings();
    
    // Re-render all added coins
    renderAddedCoins();
    updateAddButtonVisibility();
}

function updateAddButtonVisibility() {
    const addBox = document.getElementById('addCoinBox');
    if (addBox) {
        addBox.style.display = state.addedCoins.length >= 3 ? 'none' : 'block';
    }
}

function renderAddedCoins() {
    const container = document.getElementById('addedTfBlocks');
    if (!container) return;
    
    // Remove existing added blocks
    container.innerHTML = '';
    
    state.addedCoins.forEach(symbol => {
        const coin = state.coins.find(c => c.symbol === symbol);
        if (!coin) return;
        
        const baseSymbol = symbol.replace('USDT', '');
        const logoUrl = getCoinLogoUrl(baseSymbol.toLowerCase());
        
        // Initialize added coin's TF state if not exists
        if (!state.addedCoinTfState) state.addedCoinTfState = {};
        if (!state.addedCoinTfState[symbol]) {
            // Copy from main coin's enabled TFs
            state.addedCoinTfState[symbol] = state.timeframes.map(tf => ({
                id: tf.id,
                label: tf.label,
                enabled: tf.enabled
            }));
        }
        
        // Build TF toggle buttons HTML using this coin's TF state
        const tfTogglesHtml = state.addedCoinTfState[symbol].map(tf => {
            const mainTf = state.timeframes.find(t => t.id === tf.id);
            const secondsToClose = getSecondsToClose(mainTf);
            return `
                <div class="tf-toggle-btn ${tf.enabled ? 'active' : ''}" data-tf="${tf.id}" data-symbol="${symbol}">
                    <span class="tf-toggle-label">${tf.label}</span>
                    <span class="tf-toggle-timer">${formatTime(secondsToClose)}</span>
                </div>
            `;
        }).join('');
        
        // Create full TF block with ALL settings (clone of main)
        const block = document.createElement('div');
        block.className = 'tf-block added-tf-block';
        block.dataset.symbol = symbol;
        
        block.innerHTML = `
            <div class="tf-block-header">
                <span class="tf-block-title">
                    <img class="coin-logo" src="${logoUrl}" onerror="this.style.display='none';" id="blockLogo-${symbol}">
                    <div class="coin-swap-wrapper">
                        <select class="coin-swap-select" id="coinSwap-${symbol}" data-current="${symbol}">
                            ${state.coins.map(c => {
                                const isMain = c.symbol === state.currentCoin?.symbol;
                                const isOtherAdded = state.addedCoins.includes(c.symbol) && c.symbol !== symbol;
                                const disabled = isMain || isOtherAdded;
                                return `<option value="${c.symbol}" ${c.symbol === symbol ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${c.shortName} - ${c.name}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <span class="coin-price" id="blockPrice-${symbol}">Loading...</span>
                </span>
                <div>
                    <button class="btn btn-sm btn-card-settings" data-symbol="${symbol}" title="Settings">⚙️</button>
                    <button class="tf-block-remove" onclick="removeAddedCoin('${symbol}')" title="Remove">✕</button>
                </div>
            </div>
            <!-- FULL Settings (COMPLETE clone of main block) -->
            <div class="tf-block-settings" id="blockSettings-${symbol}" style="display: none;">
                <div class="card-settings-section">
                    <span class="settings-section-label">🎨 Display</span>
                    <div class="card-settings-row">
                        <label>Display Mode</label>
                        <select id="viewMode-${symbol}" class="input-sm">
                            <option value="clear">Clear</option>
                            <option value="advanced" selected>Advanced</option>
                        </select>
                    </div>
                    <div class="card-settings-row">
                        <label>Show in cards</label>
                        <div class="modifier-toggles">
                            <label class="mini-toggle"><input type="checkbox" id="showRSI-${symbol}" checked><span>RSI</span></label>
                            <label class="mini-toggle"><input type="checkbox" id="showMACD-${symbol}" checked><span>MACD</span></label>
                            <label class="mini-toggle"><input type="checkbox" id="showVolume-${symbol}" checked><span>Vol</span></label>
                        </div>
                    </div>
                </div>
                <div class="card-settings-section">
                    <span class="settings-section-label">📊 Chart Indicators</span>
                    <div class="card-settings-row">
                        <label>Show on chart</label>
                        <div class="modifier-toggles">
                            <label class="mini-toggle"><input type="checkbox" id="showChartVolume-${symbol}" checked><span>Vol</span></label>
                            <label class="mini-toggle"><input type="checkbox" id="showChartMA-${symbol}"><span>MA</span></label>
                            <label class="mini-toggle"><input type="checkbox" id="showChartEMA-${symbol}" checked><span>EMA</span></label>
                            <label class="mini-toggle"><input type="checkbox" id="showChartVWAP-${symbol}"><span>VWAP</span></label>
                        </div>
                    </div>
                    <div class="card-settings-row">
                        <label>Volume Style</label>
                        <select id="volumeType-${symbol}" class="input-sm">
                            <option value="buysell">Buy/Sell</option>
                            <option value="regular">Regular</option>
                        </select>
                    </div>
                    <div class="card-settings-row">
                        <label>MA Periods</label>
                        <input type="text" id="maLines-${symbol}" value="20" class="input-sm">
                    </div>
                    <div class="card-settings-row">
                        <label>EMA Periods</label>
                        <input type="text" id="emaLines-${symbol}" value="21" class="input-sm">
                    </div>
                </div>
                <div class="card-settings-section">
                    <span class="settings-section-label">🕯️ Candle Patterns</span>
                    <div class="patterns-grid">
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-Doji" checked><span>Doji</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-Hammer" checked><span>Hammer</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-InvHammer" checked><span>Inv Ham</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-HangingMan" checked><span>Hang Man</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-ShootStar" checked><span>Shoot Star</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-Marubozu" checked><span>Marubozu</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-SpinTop" checked><span>Spin Top</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-BullEngulf" checked><span>Bull Eng</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-BearEngulf" checked><span>Bear Eng</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-BullHarami" checked><span>Bull Har</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-BearHarami" checked><span>Bear Har</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-Piercing" checked><span>Piercing</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-DarkCloud" checked><span>Dark Cloud</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-TweezTop" checked><span>Tweez Top</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-TweezBot" checked><span>Tweez Bot</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-MorningStar" checked><span>Morning ⭐</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-EveningStar" checked><span>Evening ⭐</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-3Soldiers" checked><span>3 Soldiers</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="pattern-${symbol}-3Crows" checked><span>3 Crows</span></label>
                    </div>
                </div>
                <div class="card-settings-section">
                    <span class="settings-section-label">👁️ Display Options</span>
                    <div class="display-toggles">
                        <label class="mini-toggle"><input type="checkbox" id="showPriceInfo-${symbol}" checked><span>Price Info</span></label>
                        <label class="mini-toggle"><input type="checkbox" id="showTimers-${symbol}" checked><span>Timers</span></label>
                        <label class="mini-toggle"><input type="checkbox" id="showIndicatorBadges-${symbol}" checked><span>Indicator Badges</span></label>
                    </div>
                </div>
                <div class="card-settings-section">
                    <span class="settings-section-label">🏷️ Badge Alerts</span>
                    <div class="patterns-grid">
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-LowVol" checked><span>LowVol</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-HighVol" checked><span>HighVol</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-MACDUp" checked><span>MACD↑</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-MACDDown" checked><span>MACD↓</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-RejHi" checked><span>RejHi</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-RejLo" checked><span>RejLo</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-OB" checked><span>OB</span></label>
                        <label class="pattern-toggle"><input type="checkbox" id="badge-${symbol}-OS" checked><span>OS</span></label>
                    </div>
                </div>
            </div>
            <!-- TF Toggles -->
            <div class="tf-block-toggles" id="blockToggles-${symbol}">
                ${tfTogglesHtml}
            </div>
            <div class="chart-options">
                <span class="chart-help">Scroll/Pinch to zoom • Drag to pan</span>
            </div>
            <!-- Charts -->
            <div class="tf-block-charts" id="blockCharts-${symbol}">
                <div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.75rem;">Loading...</div>
            </div>
        `;
        container.appendChild(block);
        
        // Add TF toggle click handlers for this coin
        block.querySelectorAll('.tf-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tfId = btn.dataset.tf;
                const coinSymbol = btn.dataset.symbol;
                toggleAddedCoinTf(coinSymbol, tfId);
            });
        });
        
        // Add settings button handler
        const settingsBtn = block.querySelector('.btn-card-settings');
        settingsBtn?.addEventListener('click', () => {
            const settings = document.getElementById(`blockSettings-${symbol}`);
            if (settings) {
                settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        // Add coin swap dropdown handler
        const swapSelect = document.getElementById(`coinSwap-${symbol}`);
        if (swapSelect) {
            swapSelect.addEventListener('change', (e) => {
                const newSymbol = e.target.value;
                const oldSymbol = e.target.dataset.current;
                if (newSymbol && newSymbol !== oldSymbol) {
                    swapAddedCoin(oldSymbol, newSymbol);
                }
            });
        }
        
        // Initialize data storage for this coin
        if (!state.addedCoinData) state.addedCoinData = {};
        state.addedCoinData[symbol] = {
            price: null,
            change: null,
            data: {},
            candles: {}
        };
        
        // Fetch price and render timeframes
        fetchAddedCoinFullData(symbol, coin);
    });
    
    // Sync main coin dropdown (disable already-added coins)
    populateMainCoinSwap();
}

// Toggle TF for added coin (independent from main)
function toggleAddedCoinTf(symbol, tfId) {
    if (!state.addedCoinTfState || !state.addedCoinTfState[symbol]) return;
    
    const tf = state.addedCoinTfState[symbol].find(t => t.id === tfId);
    if (tf) {
        tf.enabled = !tf.enabled;
        
        // Update UI
        const btn = document.querySelector(`.tf-toggle-btn[data-tf="${tfId}"][data-symbol="${symbol}"]`);
        if (btn) {
            btn.classList.toggle('active', tf.enabled);
        }
        
        // Re-render this coin's charts
        const coin = state.coins.find(c => c.symbol === symbol);
        if (coin) {
            fetchAddedCoinFullData(symbol, coin);
        }
    }
}

async function fetchAddedCoinFullData(symbol, coin) {
    try {
        // Fetch current price
        const priceRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        const priceData = await priceRes.json();
        
        const price = parseFloat(priceData.lastPrice);
        const change = parseFloat(priceData.priceChangePercent);
        
        // Update price display in block header
        const priceEl = document.getElementById(`blockPrice-${symbol}`);
        if (priceEl) {
            priceEl.innerHTML = `
                <span class="price-value">$${price.toFixed(coin.decimals)}</span>
                <span class="price-change ${change >= 0 ? 'bull' : 'bear'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
            `;
        }
        
        // Store data
        if (state.addedCoinData[symbol]) {
            state.addedCoinData[symbol].price = price;
            state.addedCoinData[symbol].change = change;
        }
        
        // Clear charts container first
        const chartsContainer = document.getElementById(`blockCharts-${symbol}`);
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
        
        // Use this coin's TF state (independent from main)
        const coinTfState = state.addedCoinTfState?.[symbol] || [];
        const enabledTFs = coinTfState.filter(tf => tf.enabled);
        
        if (enabledTFs.length === 0) {
            if (chartsContainer) {
                chartsContainer.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:0.75rem;">Select timeframes above</div>';
            }
            return;
        }
        
        // Fetch all enabled TFs in parallel for faster loading
        const tfPromises = enabledTFs.map(tf => {
            const mainTf = state.timeframes.find(t => t.id === tf.id);
            return mainTf ? fetchAddedCoinTimeframe(symbol, coin, mainTf) : null;
        }).filter(Boolean);
        
        await Promise.allSettled(tfPromises);
        
    } catch (err) {
        console.error(`Error fetching data for ${symbol}:`, err);
    }
}

async function fetchAddedCoinTimeframe(symbol, coin, tf) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf.id}&limit=${CANDLE_LIMIT}`);
        const klines = await response.json();
        
        const candles = klines.map(k => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
        }));
        
        // Store candles
        if (state.addedCoinData[symbol]) {
            state.addedCoinData[symbol].candles[tf.id] = candles;
        }
        
        // Render timeframe row
        renderAddedCoinTimeframeRow(symbol, coin, tf, candles);
        
    } catch (err) {
        console.error(`Error fetching ${tf.id} for ${symbol}:`, err);
    }
}

function renderAddedCoinTimeframeRow(symbol, coin, tf, candles) {
    const chartsContainer = document.getElementById(`blockCharts-${symbol}`);
    if (!chartsContainer) return;
    
    // Remove loading text if present
    const loadingEl = chartsContainer.querySelector('div[style*="Loading"]');
    if (loadingEl) loadingEl.remove();
    
    // Check if row already exists
    let row = chartsContainer.querySelector(`[data-tf="${tf.id}"]`);
    if (!row) {
        row = document.createElement('div');
        row.className = 'tf-row';
        row.dataset.tf = tf.id;
        chartsContainer.appendChild(row);
    }
    
    // Determine direction
    const latestCandle = candles[candles.length - 1];
    const direction = latestCandle.close >= latestCandle.open ? 'bull' : 'bear';
    const directionIcon = direction === 'bull' ? '🟢' : '🔴';
    const dirClass = direction === 'bull' ? 'bullish' : 'bearish';
    
    // Calculate change % from first candle
    const firstCandle = candles[0];
    const changePct = ((latestCandle.close - firstCandle.open) / firstCandle.open * 100);
    
    // Calculate indicators
    const rsi = calculateRSI(candles, 14);
    const bodyPct = calculateBodyPercentage(latestCandle);
    const volumeRatio = calculateVolumeRatio(candles);
    const macdData = calculateMACD(candles);
    
    // Build alerts
    const alerts = [];
    
    // RSI alerts
    if (rsi >= 80) alerts.push({ label: 'ExtOB', class: 'rsi-ob' });
    else if (rsi >= 70) alerts.push({ label: 'OB', class: 'rsi-ob' });
    if (rsi <= 20) alerts.push({ label: 'ExtOS', class: 'rsi-os' });
    else if (rsi <= 30) alerts.push({ label: 'OS', class: 'rsi-os' });
    
    // Volume alerts
    if (volumeRatio >= 2) alerts.push({ label: 'HighVol', class: 'vol-high' });
    if (volumeRatio <= 0.5) alerts.push({ label: 'LowVol', class: 'vol-low' });
    
    // MACD alerts
    if (macdData && macdData.histogram > 0 && macdData.prevHistogram <= 0) {
        alerts.push({ label: 'MACD↑', class: 'macd-bull' });
    }
    if (macdData && macdData.histogram < 0 && macdData.prevHistogram >= 0) {
        alerts.push({ label: 'MACD↓', class: 'macd-bear' });
    }
    
    // Rejection alerts (wick analysis)
    const range = latestCandle.high - latestCandle.low;
    const upperWick = latestCandle.high - Math.max(latestCandle.open, latestCandle.close);
    const lowerWick = Math.min(latestCandle.open, latestCandle.close) - latestCandle.low;
    if (range > 0) {
        if (upperWick / range > 0.6) alerts.push({ label: 'RejHi', class: 'rsi-ob' });
        if (lowerWick / range > 0.6) alerts.push({ label: 'RejLo', class: 'rsi-os' });
    }
    
    const alertsHtml = alerts.length > 0
        ? alerts.slice(0, 3).map(a => `<span class="alert-group ${a.class}">${a.label}</span>`).join('')
        : '<span class="alert-group dim">--</span>';
    
    // Get timer
    const secondsToClose = getSecondsToClose(tf);
    
    const canvasId = `chart-${symbol}-${tf.id}`;
    const tabId = `candleInfoTab-${symbol}-${tf.id}`;
    
    row.className = `tf-row ${dirClass}`;
    row.innerHTML = `
        <div class="tf-info">
            <div class="tf-info-row tf-info-primary">
                <span class="tf-name">${tf.label}</span>
                <span class="tf-direction">${directionIcon}</span>
                <span class="tf-timer">${formatTime(secondsToClose)}</span>
                <span class="tf-price-value">$${latestCandle.close.toFixed(coin.decimals)}</span>
                <span class="tf-price-change ${changePct >= 0 ? 'positive' : 'negative'}">${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%</span>
            </div>
            <div class="tf-info-row tf-info-secondary">
                <span class="tf-price-hl">H:$${latestCandle.high.toFixed(coin.decimals)}</span>
                <span class="tf-price-hl">L:$${latestCandle.low.toFixed(coin.decimals)}</span>
                <span class="tf-stat-mini">B${bodyPct.toFixed(0)}%</span>
                <span class="tf-stat-mini">V${volumeRatio.toFixed(1)}x</span>
                <span class="tf-stat-mini">RSI${rsi.toFixed(0)}</span>
            </div>
        </div>
        <div class="tf-chart-wrapper">
            <div class="candle-info-tab" id="${tabId}" style="display:none;">
                <div class="candle-info-tf">${tf.label}</div>
                <div class="candle-info-data">
                    <span class="candle-info-item"><b class="label-open">O:</b> <span id="candleO-${symbol}-${tf.id}" class="price-open">--</span></span>
                    <span class="candle-info-item"><b class="label-high">H:</b> <span id="candleH-${symbol}-${tf.id}" class="price-high">--</span></span>
                    <span class="candle-info-item"><b class="label-low">L:</b> <span id="candleL-${symbol}-${tf.id}" class="price-low">--</span></span>
                    <span class="candle-info-item"><b class="label-close">C:</b> <span id="candleC-${symbol}-${tf.id}" class="price-close">--</span></span>
                    <span class="candle-info-item"><b class="label-volume">V:</b> <span id="candleV-${symbol}-${tf.id}" class="price-volume">--</span></span>
                </div>
            </div>
            <div class="tf-chart-container">
                <canvas class="tf-chart-canvas" id="${canvasId}"></canvas>
            </div>
        </div>
        <div class="tf-bottom">
            <div class="tf-bottom-alerts">${alertsHtml}</div>
        </div>
    `;
    
    // Store candles for interaction
    if (!state.addedCoinCandles) state.addedCoinCandles = {};
    state.addedCoinCandles[`${symbol}-${tf.id}`] = { candles, coin };
    
    // Draw chart and setup interaction (with retry for layout timing)
    const drawChart = (attempt = 0) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        if ((rect.width < 10 || rect.height < 10) && attempt < 10) {
            // Canvas not laid out yet, retry with increasing delay
            requestAnimationFrame(() => setTimeout(() => drawChart(attempt + 1), 50 * (attempt + 1)));
            return;
        }
        
        drawAddedCoinChart(canvas, candles, coin);
        setupAddedCoinChartInteraction(canvasId, symbol, tf.id, coin);
    };
    requestAnimationFrame(() => setTimeout(drawChart, 50));
}

function drawAddedCoinChart(canvas, candles, coin) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Guard against zero dimensions
    if (width < 10 || height < 10) return;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    if (!candles || candles.length === 0) return;
    
    // Use last 50 candles for display
    const displayCandles = candles.slice(-50);
    const decimals = coin.decimals || 2;
    
    const prices = displayCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    // Show volume from settings
    const showVolume = state.settings.showChartVolume !== false;
    const showEMA = state.settings.showChartEMA;
    const showMA = state.settings.showChartMA;
    const showPriceScale = state.settings.showPriceScale;
    
    const padding = { top: 18, right: showPriceScale ? 55 : 5, bottom: 5, left: 5 };
    let mainChartHeight = height - padding.top - padding.bottom;
    let volumeHeight = 0;
    
    if (showVolume) { volumeHeight = mainChartHeight * 0.18; mainChartHeight -= volumeHeight; }
    
    const chartWidth = width - padding.left - padding.right;
    
    const scaleY = (price) => padding.top + mainChartHeight - ((price - minPrice) / priceRange) * mainChartHeight;
    
    const candleSpacing = chartWidth / displayCandles.length;
    const candleWidth = Math.max(2, candleSpacing * 0.7);
    
    // Theme colors
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    const isLightColorful = theme === 'colorful';
    
    let bgColor, bullColor, bearColor, gridColor, textColor, emaColor, maColor;
    if (isDark) {
        bgColor = '#1e1e42'; bullColor = '#34d399'; bearColor = '#fb7185';
        gridColor = '#2e2e52'; textColor = '#b8b8d0';
        emaColor = '#fbbf24'; maColor = '#60a5fa';
    } else if (isLightColorful) {
        bgColor = '#faf5ff'; bullColor = '#059669'; bearColor = '#e11d48';
        gridColor = '#ddd6fe'; textColor = '#4338ca';
        emaColor = '#ea580c'; maColor = '#2563eb';
    } else {
        bgColor = '#fafbfc'; bullColor = '#16a34a'; bearColor = '#dc2626';
        gridColor = '#f0f0f0'; textColor = '#9ca3af';
        emaColor = '#d97706'; maColor = '#2563eb';
    }
    
    // Clear background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    const gridLines = 4;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (mainChartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw price scale on right side
    if (showPriceScale) {
        const scaleX = width - padding.right + 3;
        const numTicks = Math.min(5, Math.max(3, Math.floor(mainChartHeight / 30)));
        
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        
        // Separator line
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(width - padding.right, padding.top);
        ctx.lineTo(width - padding.right, padding.top + mainChartHeight);
        ctx.stroke();
        
        for (let i = 0; i <= numTicks; i++) {
            const ratio = i / numTicks;
            const price = maxPrice - ratio * priceRange;
            const y = padding.top + ratio * mainChartHeight;
            
            ctx.strokeStyle = textColor;
            ctx.beginPath();
            ctx.moveTo(width - padding.right, y);
            ctx.lineTo(width - padding.right + 3, y);
            ctx.stroke();
            
            ctx.fillStyle = textColor;
            ctx.fillText(price.toFixed(decimals), scaleX + 2, y + 3);
        }
        
        // Current price indicator
        const lastCandle = displayCandles[displayCandles.length - 1];
        if (lastCandle) {
            const curY = scaleY(lastCandle.close);
            const isBull = lastCandle.close >= lastCandle.open;
            const curColor = isBull ? bullColor : bearColor;
            
            ctx.fillStyle = curColor;
            ctx.fillRect(width - padding.right, curY - 6, padding.right, 12);
            ctx.beginPath();
            ctx.moveTo(width - padding.right, curY - 5);
            ctx.lineTo(width - padding.right - 4, curY);
            ctx.lineTo(width - padding.right, curY + 5);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(lastCandle.close.toFixed(decimals), width - padding.right + 3, curY + 3);
        }
    }
    
    // Draw volume bars
    if (showVolume && displayCandles.length > 0) {
        const maxVol = Math.max(...displayCandles.map(c => c.volume));
        const volBaseY = padding.top + mainChartHeight + volumeHeight;
        
        displayCandles.forEach((candle, i) => {
            const x = padding.left + i * candleSpacing + candleSpacing / 2;
            const isBull = candle.close >= candle.open;
            const volH = maxVol > 0 ? (candle.volume / maxVol) * volumeHeight : 0;
            
            ctx.fillStyle = isBull ? `${bullColor}40` : `${bearColor}40`;
            ctx.fillRect(x - candleWidth / 2, volBaseY - volH, candleWidth, volH);
        });
    }
    
    // Draw EMA line
    if (showEMA && displayCandles.length >= 21) {
        const period = (state.settings.emaLines && state.settings.emaLines[0]) || 21;
        const allCandles = candles.slice(-(50 + period));
        const closes = allCandles.map(c => c.close);
        
        // Calculate EMA
        const multiplier = 2 / (period + 1);
        let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const emaValues = [];
        for (let i = period; i < closes.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
            emaValues.push(ema);
        }
        
        // Draw only the last displayCandles.length values
        const startOffset = Math.max(0, emaValues.length - displayCandles.length);
        ctx.strokeStyle = emaColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = startOffset; i < emaValues.length; i++) {
            const x = padding.left + (i - startOffset) * candleSpacing + candleSpacing / 2;
            const y = scaleY(emaValues[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Draw MA line
    if (showMA && displayCandles.length >= 20) {
        const period = (state.settings.maLines && state.settings.maLines[0]) || 20;
        const allCandles = candles.slice(-(50 + period));
        const closes = allCandles.map(c => c.close);
        const maValues = [];
        for (let i = period - 1; i < closes.length; i++) {
            const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            maValues.push(sum / period);
        }
        
        const startOffset = Math.max(0, maValues.length - displayCandles.length);
        ctx.strokeStyle = maColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = startOffset; i < maValues.length; i++) {
            const x = padding.left + (i - startOffset) * candleSpacing + candleSpacing / 2;
            const y = scaleY(maValues[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Draw hovered candle highlight
    if (typeof canvas.hoveredCandleIdx === 'number' && canvas.hoveredCandleIdx >= 0 && canvas.hoveredCandleIdx < displayCandles.length) {
        const hx = padding.left + canvas.hoveredCandleIdx * candleSpacing;
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(hx, padding.top, candleSpacing, mainChartHeight + volumeHeight);
    }
    
    // Draw candles
    displayCandles.forEach((candle, i) => {
        const x = padding.left + i * candleSpacing + candleSpacing / 2;
        const isBull = candle.close >= candle.open;
        const openY = scaleY(candle.open);
        const closeY = scaleY(candle.close);
        const highY = scaleY(candle.high);
        const lowY = scaleY(candle.low);
        
        // Wick
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        // Body
        ctx.fillStyle = isBull ? bullColor : bearColor;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
    
    // Draw H/L price labels at actual candle positions (like Binance)
    let highIdx = 0, lowIdx = 0;
    displayCandles.forEach((c, i) => {
        if (c.high > displayCandles[highIdx].high) highIdx = i;
        if (c.low < displayCandles[lowIdx].low) lowIdx = i;
    });
    
    const fontSize = Math.max(7, Math.min(9, width * 0.02));
    ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
    
    // HIGH label at actual candle
    const highX = padding.left + highIdx * candleSpacing + candleSpacing / 2;
    const highY = scaleY(displayCandles[highIdx].high);
    const hOnRight = highX < (width - padding.right) / 2;
    const hText = hOnRight ? `← ${displayCandles[highIdx].high.toFixed(decimals)}` : `${displayCandles[highIdx].high.toFixed(decimals)} →`;
    const hW = ctx.measureText(hText).width + 6;
    const hLX = hOnRight ? highX + candleSpacing * 0.5 : highX - hW - candleSpacing * 0.3;
    
    ctx.strokeStyle = `${bullColor}80`;
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(highX, highY);
    ctx.lineTo(hOnRight ? hLX : hLX + hW, highY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = `${bullColor}e6`;
    ctx.fillRect(hLX, highY - 5, hW, 11);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(hText, hLX + 3, highY + 3);
    
    // LOW label at actual candle
    const lowX = padding.left + lowIdx * candleSpacing + candleSpacing / 2;
    const lowY = scaleY(displayCandles[lowIdx].low);
    const lOnRight = lowX < (width - padding.right) / 2;
    const lText = lOnRight ? `← ${displayCandles[lowIdx].low.toFixed(decimals)}` : `${displayCandles[lowIdx].low.toFixed(decimals)} →`;
    const lW = ctx.measureText(lText).width + 6;
    const lLX = lOnRight ? lowX + candleSpacing * 0.5 : lowX - lW - candleSpacing * 0.3;
    
    ctx.strokeStyle = `${bearColor}80`;
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(lowX, lowY);
    ctx.lineTo(lOnRight ? lLX : lLX + lW, lowY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = `${bearColor}e6`;
    ctx.fillRect(lLX, lowY - 5, lW, 11);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(lText, lLX + 3, lowY + 3);
}

// Setup chart interaction for added coins (hover to show prices)
function setupAddedCoinChartInteraction(canvasId, symbol, tfId, coin) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const tabId = `candleInfoTab-${symbol}-${tfId}`;
    const dataKey = `${symbol}-${tfId}`;
    
    const handleMove = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        
        const data = state.addedCoinCandles?.[dataKey];
        if (!data || !data.candles) return;
        
        const candles = data.candles.slice(-50);
        const candleWidth = rect.width / candles.length;
        const candleIndex = Math.floor(x / candleWidth);
        
        if (candleIndex >= 0 && candleIndex < candles.length) {
            // Set hover index and redraw for visual highlight
            if (candleIndex !== canvas.hoveredCandleIdx) {
                canvas.hoveredCandleIdx = candleIndex;
                drawAddedCoinChart(canvas, data.candles, data.coin);
            }
            
            const candle = candles[candleIndex];
            const decimals = coin.decimals || 2;
            
            // Update info tab
            const tabEl = document.getElementById(tabId);
            if (tabEl) {
                tabEl.style.display = 'block';
                
                document.getElementById(`candleO-${symbol}-${tfId}`).textContent = `$${candle.open.toFixed(decimals)}`;
                document.getElementById(`candleH-${symbol}-${tfId}`).textContent = `$${candle.high.toFixed(decimals)}`;
                document.getElementById(`candleL-${symbol}-${tfId}`).textContent = `$${candle.low.toFixed(decimals)}`;
                document.getElementById(`candleC-${symbol}-${tfId}`).textContent = `$${candle.close.toFixed(decimals)}`;
                document.getElementById(`candleV-${symbol}-${tfId}`).textContent = formatVolume(candle.volume);
            }
        }
    };
    
    const handleLeave = () => {
        canvas.hoveredCandleIdx = -1;
        const data = state.addedCoinCandles?.[dataKey];
        if (data && data.candles && data.coin) {
            drawAddedCoinChart(canvas, data.candles, data.coin);
        }
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.style.display = 'none';
    };
    
    // Mouse events
    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', handleLeave);
    
    // Touch events
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    });
    canvas.addEventListener('touchend', handleLeave);
}

function drawMiniCoinChart(canvas, klines) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const candles = klines.map(k => ({
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4])
    }));
    
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const scaleY = (price) => padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    
    const candleSpacing = chartWidth / candles.length;
    const candleWidth = Math.max(1, candleSpacing * 0.6);
    
    // Theme
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    const isColorful = theme === 'colorful';
    const bgColor = isDark ? '#161630' : (isColorful ? '#ede9fe' : '#fafbfc');
    const bullColor = isDark ? '#34d399' : '#059669';
    const bearColor = isDark ? '#fb7185' : '#e11d48';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    candles.forEach((candle, i) => {
        const x = padding + i * candleSpacing + candleSpacing / 2;
        const isBull = candle.close >= candle.open;
        const openY = scaleY(candle.open);
        const closeY = scaleY(candle.close);
        const highY = scaleY(candle.high);
        const lowY = scaleY(candle.low);
        
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        ctx.fillStyle = isBull ? bullColor : bearColor;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
}

// Refresh added coins periodically
setInterval(() => {
    state.addedCoins.forEach(symbol => {
        const coin = state.coins.find(c => c.symbol === symbol);
        if (coin) {
            fetchAddedCoinFullData(symbol, coin);
        }
    });
}, 30000);

