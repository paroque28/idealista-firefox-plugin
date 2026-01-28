# Data Storage Guide

Comprehensive guide for storing and managing data in the Idealista Helper Firefox extension.

## 📊 Overview

Firefox extensions can store data using the Browser Storage API. This guide covers how to store viewed listings, user preferences, cached property data, and more.

## 🗄️ Storage APIs Available

### 1. **browser.storage.local** (Recommended for most data)
- **Size**: Up to 10MB per extension
- **Persistence**: Survives browser restarts
- **Sync**: Local only (not synced across devices)
- **Speed**: Fast
- **Use for**: Large datasets, cached data, viewed listings

### 2. **browser.storage.sync**
- **Size**: Up to 100KB per extension
- **Persistence**: Synced across Firefox installations (same account)
- **Speed**: Slower (network sync)
- **Use for**: User preferences, settings, API keys

### 3. **localStorage** (Not recommended)
- Limited to 5-10MB
- Only accessible from content scripts
- Synchronous (can block UI)
- Better to use browser.storage

### 4. **IndexedDB** (For very large datasets)
- **Size**: Hundreds of MB to GB
- **Complexity**: More complex API
- **Use for**: Extensive historical data, large caches

---

## 📝 Data Structure Design

### 1. Storing Viewed Listings

#### Data Schema
```javascript
{
  "viewedListings": {
    "property_12345": {
      "id": "12345",
      "url": "https://www.idealista.com/inmueble/12345/",
      "title": "Piso en alquiler en Madrid",
      "price": 1200,
      "viewedAt": "2026-01-28T10:30:00.000Z",
      "viewCount": 3,
      "lastViewedAt": "2026-01-28T15:45:00.000Z",
      "energyRating": "B",
      "size": 75,
      "rooms": 2,
      "neighborhood": "Malasaña",
      "thumbnail": "https://...",
      "notes": "Nice balcony, close to metro",
      "flagged": false,
      "favorite": false
    }
  }
}
```

#### Implementation Example
```javascript
// lib/storage.js

class StorageManager {
  
  // Add a viewed listing
  async addViewedListing(propertyData) {
    const listingId = `property_${propertyData.id}`;
    const timestamp = new Date().toISOString();
    
    // Get existing data
    const result = await browser.storage.local.get('viewedListings');
    const viewedListings = result.viewedListings || {};
    
    // Check if already exists
    const existing = viewedListings[listingId];
    
    viewedListings[listingId] = {
      id: propertyData.id,
      url: propertyData.url,
      title: propertyData.title,
      price: propertyData.price,
      viewedAt: existing?.viewedAt || timestamp,
      viewCount: (existing?.viewCount || 0) + 1,
      lastViewedAt: timestamp,
      energyRating: propertyData.energyRating,
      size: propertyData.size,
      rooms: propertyData.rooms,
      neighborhood: propertyData.neighborhood,
      thumbnail: propertyData.thumbnail,
      notes: existing?.notes || '',
      flagged: existing?.flagged || false,
      favorite: existing?.favorite || false
    };
    
    // Save back
    await browser.storage.local.set({ viewedListings });
    
    return viewedListings[listingId];
  }
  
  // Get all viewed listings
  async getViewedListings() {
    const result = await browser.storage.local.get('viewedListings');
    return result.viewedListings || {};
  }
  
  // Get specific listing
  async getViewedListing(propertyId) {
    const listings = await this.getViewedListings();
    return listings[`property_${propertyId}`];
  }
  
  // Check if listing was viewed
  async isListingViewed(propertyId) {
    const listing = await this.getViewedListing(propertyId);
    return !!listing;
  }
  
  // Get recently viewed (last N days)
  async getRecentlyViewed(days = 7) {
    const listings = await this.getViewedListings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Object.values(listings).filter(listing => 
      new Date(listing.lastViewedAt) > cutoffDate
    ).sort((a, b) => 
      new Date(b.lastViewedAt) - new Date(a.lastViewedAt)
    );
  }
  
  // Clear old viewed listings (older than X days)
  async clearOldListings(days = 90) {
    const listings = await this.getViewedListings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = Object.fromEntries(
      Object.entries(listings).filter(([_, listing]) => 
        new Date(listing.lastViewedAt) > cutoffDate
      )
    );
    
    await browser.storage.local.set({ viewedListings: filtered });
  }
}

// Export singleton instance
export const storage = new StorageManager();
```

#### Usage in Content Script
```javascript
// content.js

import { storage } from './lib/storage.js';

// Detect when user views a property
async function detectPropertyView() {
  // Check if on property detail page
  const propertyId = extractPropertyId(window.location.href);
  
  if (propertyId) {
    const propertyData = scrapePropertyData();
    await storage.addViewedListing(propertyData);
    console.log('Property view recorded:', propertyId);
    
    // Mark as viewed in UI
    markAsViewedInSearchResults(propertyId);
  }
}

// Extract property ID from URL
function extractPropertyId(url) {
  const match = url.match(/inmueble\/(\d+)/);
  return match ? match[1] : null;
}

// Run on page load
detectPropertyView();
```

---

### 2. Storing Price History

#### Data Schema
```javascript
{
  "priceHistory": {
    "property_12345": [
      {
        "price": 1300,
        "recordedAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "price": 1250,
        "recordedAt": "2026-01-22T14:30:00.000Z"
      },
      {
        "price": 1200,
        "recordedAt": "2026-01-28T09:15:00.000Z"
      }
    ]
  }
}
```

#### Implementation
```javascript
class StorageManager {
  
  async trackPriceChange(propertyId, currentPrice) {
    const key = `property_${propertyId}`;
    const result = await browser.storage.local.get('priceHistory');
    const priceHistory = result.priceHistory || {};
    
    if (!priceHistory[key]) {
      priceHistory[key] = [];
    }
    
    // Only add if price changed
    const lastEntry = priceHistory[key][priceHistory[key].length - 1];
    if (!lastEntry || lastEntry.price !== currentPrice) {
      priceHistory[key].push({
        price: currentPrice,
        recordedAt: new Date().toISOString()
      });
      
      await browser.storage.local.set({ priceHistory });
      return true; // Price changed
    }
    
    return false; // No change
  }
  
  async getPriceHistory(propertyId) {
    const key = `property_${propertyId}`;
    const result = await browser.storage.local.get('priceHistory');
    return result.priceHistory?.[key] || [];
  }
  
  async getPriceDrops(minDropPercentage = 5) {
    const result = await browser.storage.local.get('priceHistory');
    const priceHistory = result.priceHistory || {};
    const drops = [];
    
    for (const [propertyId, history] of Object.entries(priceHistory)) {
      if (history.length < 2) continue;
      
      const firstPrice = history[0].price;
      const lastPrice = history[history.length - 1].price;
      const dropPercentage = ((firstPrice - lastPrice) / firstPrice) * 100;
      
      if (dropPercentage >= minDropPercentage) {
        drops.push({
          propertyId: propertyId.replace('property_', ''),
          originalPrice: firstPrice,
          currentPrice: lastPrice,
          dropPercentage: dropPercentage.toFixed(1),
          history: history
        });
      }
    }
    
    return drops;
  }
}
```

---

### 3. Storing User Preferences

#### Data Schema
```javascript
{
  "userPreferences": {
    "filters": {
      "minEnergyRating": "C",
      "maxCommuteTime": 30,
      "hideViewedListings": false,
      "showRedFlags": true,
      "autoFilterScams": true
    },
    "notifications": {
      "enabled": true,
      "newListings": true,
      "priceDrops": true,
      "savedSearches": false
    },
    "display": {
      "darkMode": false,
      "compactView": false,
      "showPriceHistory": true
    },
    "ai": {
      "provider": "openai",
      "apiKey": "sk-...",
      "autoRespond": false,
      "language": "es"
    },
    "locations": {
      "workAddress": "Calle Gran Vía, 1, Madrid",
      "preferredNeighborhoods": ["Malasaña", "Chueca", "Lavapiés"]
    }
  }
}
```

#### Implementation
```javascript
class StorageManager {
  
  // Get all preferences
  async getPreferences() {
    const result = await browser.storage.sync.get('userPreferences');
    return result.userPreferences || this.getDefaultPreferences();
  }
  
  // Get default preferences
  getDefaultPreferences() {
    return {
      filters: {
        minEnergyRating: null,
        maxCommuteTime: null,
        hideViewedListings: false,
        showRedFlags: true,
        autoFilterScams: true
      },
      notifications: {
        enabled: true,
        newListings: true,
        priceDrops: true,
        savedSearches: false
      },
      display: {
        darkMode: false,
        compactView: false,
        showPriceHistory: true
      },
      ai: {
        provider: 'openai',
        apiKey: '',
        autoRespond: false,
        language: 'es'
      },
      locations: {
        workAddress: '',
        preferredNeighborhoods: []
      }
    };
  }
  
  // Update specific preference
  async updatePreference(path, value) {
    const prefs = await this.getPreferences();
    
    // Navigate to nested property (e.g., "filters.minEnergyRating")
    const keys = path.split('.');
    let current = prefs;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    await browser.storage.sync.set({ userPreferences: prefs });
  }
}
```

---

### 4. Storing Saved Searches

#### Data Schema
```javascript
{
  "savedSearches": [
    {
      "id": "search_001",
      "name": "Budget apartments in Malasaña",
      "url": "https://www.idealista.com/...",
      "filters": {
        "location": ["Malasaña", "Chueca"],
        "maxPrice": 1200,
        "minRooms": 2,
        "energyRating": "B"
      },
      "notifications": true,
      "lastChecked": "2026-01-28T10:00:00.000Z",
      "newListingsCount": 3,
      "createdAt": "2026-01-20T12:00:00.000Z"
    }
  ]
}
```

---

### 5. Storing Favorites & Bookmarks

#### Data Schema
```javascript
{
  "favorites": {
    "property_12345": {
      "id": "12345",
      "addedAt": "2026-01-28T10:00:00.000Z",
      "notes": "Perfect location!",
      "tags": ["top-choice", "good-price"],
      "rating": 5,
      "pros": ["Great location", "Modern", "Affordable"],
      "cons": ["Small kitchen", "No parking"]
    }
  }
}
```

---

### 6. Storing Red Flags & Warnings

#### Data Schema
```javascript
{
  "redFlags": {
    "property_12345": {
      "flags": [
        {
          "type": "suspicious_price",
          "severity": "high",
          "message": "Price is 40% below area average",
          "detectedAt": "2026-01-28T10:00:00.000Z"
        },
        {
          "type": "missing_info",
          "severity": "medium",
          "message": "No energy rating provided",
          "detectedAt": "2026-01-28T10:00:00.000Z"
        }
      ],
      "dismissed": false,
      "userVerified": false
    }
  }
}
```

---

## 🔧 Complete Storage Manager Implementation

```javascript
// lib/storage.js

class StorageManager {
  
  constructor() {
    this.LOCAL_STORAGE_KEYS = [
      'viewedListings',
      'priceHistory',
      'favorites',
      'redFlags',
      'cachedProperties',
      'searchHistory'
    ];
    
    this.SYNC_STORAGE_KEYS = [
      'userPreferences',
      'savedSearches',
      'apiKeys'
    ];
  }
  
  // ===== Generic Storage Methods =====
  
  async get(key, useSync = false) {
    const storage = useSync ? browser.storage.sync : browser.storage.local;
    const result = await storage.get(key);
    return result[key];
  }
  
  async set(key, value, useSync = false) {
    const storage = useSync ? browser.storage.sync : browser.storage.local;
    await storage.set({ [key]: value });
  }
  
  async remove(key, useSync = false) {
    const storage = useSync ? browser.storage.sync : browser.storage.local;
    await storage.remove(key);
  }
  
  async clear(useSync = false) {
    const storage = useSync ? browser.storage.sync : browser.storage.local;
    await storage.clear();
  }
  
  // ===== Storage Statistics =====
  
  async getStorageStats() {
    const local = await browser.storage.local.get(null);
    const sync = await browser.storage.sync.get(null);
    
    const localSize = new Blob([JSON.stringify(local)]).size;
    const syncSize = new Blob([JSON.stringify(sync)]).size;
    
    return {
      local: {
        sizeBytes: localSize,
        sizeMB: (localSize / 1024 / 1024).toFixed(2),
        itemCount: Object.keys(local).length,
        items: Object.keys(local)
      },
      sync: {
        sizeBytes: syncSize,
        sizeKB: (syncSize / 1024).toFixed(2),
        itemCount: Object.keys(sync).length,
        items: Object.keys(sync)
      }
    };
  }
  
  // ===== Data Export/Import =====
  
  async exportAllData() {
    const local = await browser.storage.local.get(null);
    const sync = await browser.storage.sync.get(null);
    
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      local: local,
      sync: sync
    };
  }
  
  async importData(data) {
    if (data.local) {
      await browser.storage.local.set(data.local);
    }
    if (data.sync) {
      await browser.storage.sync.set(data.sync);
    }
  }
  
  // ===== Cleanup & Maintenance =====
  
  async cleanup() {
    // Clear old viewed listings (>90 days)
    await this.clearOldListings(90);
    
    // Clear old price history (>180 days)
    await this.clearOldPriceHistory(180);
    
    // Clear old red flags (dismissed, >30 days)
    await this.clearOldRedFlags(30);
  }
}

// Singleton instance
export const storage = new StorageManager();
```

---

## 🎯 Usage Examples

### Example 1: Track Viewed Listing
```javascript
// content.js
import { storage } from './lib/storage.js';

// When user visits a property page
const propertyData = {
  id: '12345',
  url: window.location.href,
  title: document.querySelector('.title').textContent,
  price: parseFloat(document.querySelector('.price').textContent),
  energyRating: document.querySelector('.energy-rating')?.textContent,
  // ... more fields
};

await storage.addViewedListing(propertyData);
```

### Example 2: Show "Already Viewed" Badge
```javascript
// content.js - On search results page

async function markViewedListings() {
  const listings = document.querySelectorAll('.item-link');
  
  for (const listing of listings) {
    const url = listing.getAttribute('href');
    const propertyId = extractPropertyId(url);
    
    const viewed = await storage.isListingViewed(propertyId);
    
    if (viewed) {
      // Add visual indicator
      const badge = document.createElement('div');
      badge.className = 'idealista-helper-viewed-badge';
      badge.textContent = '✓ Viewed';
      listing.appendChild(badge);
      
      // Dim the listing
      listing.style.opacity = '0.6';
    }
  }
}

markViewedListings();
```

### Example 3: Price Drop Notifications
```javascript
// background.js - Check periodically

async function checkPriceDrops() {
  const drops = await storage.getPriceDrops(5); // 5% minimum drop
  
  for (const drop of drops) {
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Price Drop Alert!',
      message: `Property ${drop.propertyId} dropped by ${drop.dropPercentage}%`
    });
  }
}

// Run every 6 hours
setInterval(checkPriceDrops, 6 * 60 * 60 * 1000);
```

---

## 🔐 Security Best Practices

### 1. Encrypt Sensitive Data
```javascript
// For API keys and sensitive data
async function encryptData(data, password) {
  // Use Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  return { encrypted, iv };
}
```

### 2. Don't Store Passwords
```javascript
// ❌ Bad
await storage.set('password', userPassword);

// ✅ Good - Store only tokens/API keys
await storage.set('apiKey', apiKey, true); // Use sync storage
```

### 3. Clear Sensitive Data on Uninstall
```javascript
// background.js
browser.management.onUninstalled.addListener(async (info) => {
  if (info.id === browser.runtime.id) {
    await browser.storage.local.clear();
    await browser.storage.sync.clear();
  }
});
```

---

## 📊 Storage Limits & Optimization

### Limits
- **local**: ~10MB (varies by browser)
- **sync**: 100KB total, 8KB per item
- **IndexedDB**: Much larger (hundreds of MB)

### Optimization Tips

1. **Compress data before storing**
```javascript
// Use LZ-string or similar library
import LZString from 'lz-string';

async function storeCompressed(key, data) {
  const compressed = LZString.compress(JSON.stringify(data));
  await browser.storage.local.set({ [key]: compressed });
}

async function getCompressed(key) {
  const result = await browser.storage.local.get(key);
  return JSON.parse(LZString.decompress(result[key]));
}
```

2. **Paginate large datasets**
```javascript
// Instead of loading all viewed listings at once
async function getViewedListingsPage(page = 0, pageSize = 50) {
  const all = await storage.getViewedListings();
  const array = Object.values(all);
  const start = page * pageSize;
  return array.slice(start, start + pageSize);
}
```

3. **Remove old/unused data**
```javascript
// Regular cleanup
async function scheduleCleanup() {
  // Run monthly
  setInterval(async () => {
    await storage.cleanup();
  }, 30 * 24 * 60 * 60 * 1000);
}
```

---

## 🧪 Testing Storage

```javascript
// test-storage.js

async function testStorage() {
  console.log('Testing storage...');
  
  // Test 1: Add viewed listing
  await storage.addViewedListing({
    id: '99999',
    title: 'Test Property',
    price: 1000,
    url: 'https://test.com'
  });
  console.log('✓ Added listing');
  
  // Test 2: Retrieve listing
  const listing = await storage.getViewedListing('99999');
  console.log('✓ Retrieved:', listing);
  
  // Test 3: Check storage stats
  const stats = await storage.getStorageStats();
  console.log('✓ Storage stats:', stats);
  
  // Test 4: Export data
  const exported = await storage.exportAllData();
  console.log('✓ Exported data:', Object.keys(exported));
  
  console.log('All tests passed!');
}

testStorage();
```

---

## 📚 Additional Resources

- [MDN: browser.storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
- [Storage limits and quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Crypto API for encryption](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Last Updated**: 2026-01-28  
**Status**: Ready for implementation
