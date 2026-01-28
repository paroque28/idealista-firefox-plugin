// Content script for Idealista Helper
// This script is injected into Idealista.com pages
// It scrapes property data and injects UI elements

console.log('Idealista Helper: Content script loaded on', window.location.href);

// Detect page type
const pageType = detectPageType();
console.log('Page type detected:', pageType);

// Initialize based on page type
switch (pageType) {
  case 'search':
    initSearchPage();
    break;
  case 'property':
    initPropertyPage();
    break;
  default:
    console.log('Not a search or property page');
}

// Detect what type of Idealista page we're on
function detectPageType() {
  const url = window.location.href;
  
  if (url.includes('/inmueble/')) {
    return 'property';
  } else if (url.includes('/alquiler-') || url.includes('/venta-') || url.includes('/multi/')) {
    return 'search';
  }
  
  return 'unknown';
}

// Initialize search results page
function initSearchPage() {
  console.log('Initializing search page enhancements...');
  
  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceSearchPage);
  } else {
    enhanceSearchPage();
  }
}

// Enhance search results page
async function enhanceSearchPage() {
  console.log('Enhancing search page...');
  
  // Get user preferences
  const preferences = await getUserPreferences();
  console.log('User preferences:', preferences);
  
  // Find all property listings
  const listings = findPropertyListings();
  console.log('Found listings:', listings.length);
  
  // Enhance each listing
  for (const listing of listings) {
    enhanceListing(listing, preferences);
  }
  
  // Inject custom filters UI
  injectFiltersUI(preferences);
  
  // Set up mutation observer to catch dynamically loaded listings
  observeNewListings();
}

// Find property listing elements
function findPropertyListings() {
  // TODO: Update selectors based on actual Idealista DOM structure
  const selectors = [
    'article.item',
    '.item-container',
    '[data-element-id]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log('Found listings with selector:', selector);
      return Array.from(elements);
    }
  }
  
  console.warn('No listings found with known selectors');
  return [];
}

// Enhance individual listing
async function enhanceListing(listing, preferences) {
  const propertyId = extractPropertyId(listing);
  
  if (!propertyId) {
    return;
  }
  
  // Check if already viewed
  const isViewed = await isPropertyViewed(propertyId);
  
  if (isViewed && preferences?.filters?.hideViewedListings) {
    listing.style.opacity = '0.5';
    addViewedBadge(listing);
  }
  
  // Check for red flags if enabled
  if (preferences?.filters?.showRedFlags) {
    const propertyData = extractPropertyData(listing);
    const flags = await detectRedFlags(propertyData);
    
    if (flags.length > 0) {
      addRedFlagIndicator(listing, flags);
    }
  }
}

// Extract property ID from listing element
function extractPropertyId(listing) {
  // Try multiple methods to extract ID
  
  // Method 1: From data attribute
  const dataId = listing.getAttribute('data-element-id');
  if (dataId) return dataId;
  
  // Method 2: From link href
  const link = listing.querySelector('a[href*="/inmueble/"]');
  if (link) {
    const match = link.href.match(/inmueble\/(\d+)/);
    if (match) return match[1];
  }
  
  return null;
}

// Extract property data from listing element
function extractPropertyData(listing) {
  // TODO: Update selectors based on actual Idealista DOM structure
  
  return {
    id: extractPropertyId(listing),
    title: listing.querySelector('.item-title')?.textContent?.trim(),
    price: parsePrice(listing.querySelector('.item-price')?.textContent),
    size: parseSize(listing.querySelector('.item-size')?.textContent),
    rooms: parseRooms(listing.querySelector('.item-rooms')?.textContent),
    photos: listing.querySelectorAll('img').length,
    url: listing.querySelector('a')?.href
  };
}

// Parse price from text
function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/[\d.,]+/);
  return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : null;
}

// Parse size from text
function parseSize(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*m/);
  return match ? parseInt(match[1]) : null;
}

// Parse number of rooms
function parseRooms(text) {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Add "Viewed" badge to listing
function addViewedBadge(listing) {
  const badge = document.createElement('div');
  badge.className = 'idealista-helper-viewed-badge';
  badge.textContent = '✓ Viewed';
  badge.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 1000;
  `;
  
  listing.style.position = 'relative';
  listing.appendChild(badge);
}

// Add red flag indicator
function addRedFlagIndicator(listing, flags) {
  const indicator = document.createElement('div');
  indicator.className = 'idealista-helper-red-flag';
  indicator.textContent = `⚠ ${flags.length} Warning${flags.length > 1 ? 's' : ''}`;
  indicator.title = flags.map(f => f.message).join('\n');
  indicator.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: #f44336;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 1000;
    cursor: help;
  `;
  
  listing.style.position = 'relative';
  listing.appendChild(indicator);
}

// Inject custom filters UI
function injectFiltersUI(preferences) {
  console.log('Injecting custom filters UI...');
  
  // TODO: Find the filters container and inject our custom filters
  const filtersContainer = document.querySelector('.search-filters') || document.querySelector('.filters');
  
  if (!filtersContainer) {
    console.warn('Filters container not found');
    return;
  }
  
  const customFilters = createCustomFiltersUI(preferences);
  filtersContainer.appendChild(customFilters);
}

// Create custom filters UI
function createCustomFiltersUI(preferences) {
  const container = document.createElement('div');
  container.className = 'idealista-helper-filters';
  container.innerHTML = `
    <div style="border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">Idealista Helper Filters</h3>
      
      <label style="display: block; margin-bottom: 8px;">
        <input type="checkbox" id="hideViewed" ${preferences?.filters?.hideViewedListings ? 'checked' : ''}>
        Hide already viewed listings
      </label>
      
      <label style="display: block; margin-bottom: 8px;">
        <input type="checkbox" id="showRedFlags" ${preferences?.filters?.showRedFlags ? 'checked' : ''}>
        Show red flag warnings
      </label>
      
      <div style="margin-top: 12px;">
        <label style="display: block; margin-bottom: 4px;">
          Minimum Energy Rating:
        </label>
        <select id="minEnergyRating" style="width: 100%; padding: 4px;">
          <option value="">Any</option>
          <option value="A">A (Best)</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
          <option value="E">E</option>
          <option value="F">F</option>
          <option value="G">G (Worst)</option>
        </select>
      </div>
      
      <button id="applyFilters" style="margin-top: 12px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Apply Filters
      </button>
    </div>
  `;
  
  // Add event listeners
  container.querySelector('#applyFilters').addEventListener('click', applyCustomFilters);
  
  return container;
}

// Apply custom filters
async function applyCustomFilters() {
  console.log('Applying custom filters...');
  
  const hideViewed = document.querySelector('#hideViewed').checked;
  const showRedFlags = document.querySelector('#showRedFlags').checked;
  const minEnergyRating = document.querySelector('#minEnergyRating').value;
  
  // Save preferences
  await saveUserPreferences({
    filters: {
      hideViewedListings: hideViewed,
      showRedFlags: showRedFlags,
      minEnergyRating: minEnergyRating
    }
  });
  
  // Reload page to apply filters
  location.reload();
}

// Initialize property detail page
function initPropertyPage() {
  console.log('Initializing property detail page...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhancePropertyPage);
  } else {
    enhancePropertyPage();
  }
}

// Enhance property detail page
async function enhancePropertyPage() {
  console.log('Enhancing property detail page...');
  
  const propertyId = extractPropertyIdFromURL();
  const propertyData = scrapePropertyDetails();
  
  // Record view
  await recordPropertyView(propertyId, propertyData);
  
  // Track price for history
  if (propertyData.price) {
    await trackPrice(propertyId, propertyData.price);
  }
  
  // Check and display red flags
  const flags = await detectRedFlags(propertyData);
  if (flags.length > 0) {
    displayRedFlags(flags);
  }
}

// Extract property ID from URL
function extractPropertyIdFromURL() {
  const match = window.location.href.match(/inmueble\/(\d+)/);
  return match ? match[1] : null;
}

// Scrape property details from page
function scrapePropertyDetails() {
  // TODO: Update selectors based on actual Idealista property page structure
  
  return {
    id: extractPropertyIdFromURL(),
    url: window.location.href,
    title: document.querySelector('h1')?.textContent?.trim(),
    price: parsePrice(document.querySelector('.price')?.textContent),
    size: parseSize(document.querySelector('.size')?.textContent),
    rooms: parseRooms(document.querySelector('.rooms')?.textContent),
    energyRating: document.querySelector('.energy-rating')?.textContent?.trim(),
    description: document.querySelector('.description')?.textContent?.trim(),
    photos: document.querySelectorAll('.property-photo').length
  };
}

// Display red flags on property page
function displayRedFlags(flags) {
  const container = document.createElement('div');
  container.className = 'idealista-helper-red-flags';
  container.style.cssText = `
    background: #fff3cd;
    border: 2px solid #f44336;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  `;
  
  container.innerHTML = `
    <h3 style="color: #f44336; margin: 0 0 12px 0;">⚠ Warning Signs Detected</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${flags.map(flag => `
        <li style="margin-bottom: 8px;">
          <strong>${flag.type.replace('_', ' ')}:</strong> ${flag.message}
        </li>
      `).join('')}
    </ul>
  `;
  
  const mainContent = document.querySelector('main') || document.body;
  mainContent.insertBefore(container, mainContent.firstChild);
}

// Observe for dynamically loaded listings
function observeNewListings() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const listings = findPropertyListings();
        // Process only new listings
        // TODO: Implement incremental enhancement
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Helper functions for storage and communication

async function getUserPreferences() {
  return new Promise((resolve) => {
    browser.runtime.sendMessage({ action: 'getPreferences' }, (response) => {
      resolve(response.data || {});
    });
  });
}

async function saveUserPreferences(data) {
  return new Promise((resolve) => {
    browser.runtime.sendMessage({ action: 'savePreferences', data }, (response) => {
      resolve(response.success);
    });
  });
}

async function isPropertyViewed(propertyId) {
  const result = await browser.storage.local.get('viewedListings');
  const viewedListings = result.viewedListings || {};
  return !!viewedListings[`property_${propertyId}`];
}

async function recordPropertyView(propertyId, propertyData) {
  const result = await browser.storage.local.get('viewedListings');
  const viewedListings = result.viewedListings || {};
  const key = `property_${propertyId}`;
  
  viewedListings[key] = {
    ...propertyData,
    viewedAt: new Date().toISOString(),
    viewCount: (viewedListings[key]?.viewCount || 0) + 1
  };
  
  await browser.storage.local.set({ viewedListings });
  console.log('Property view recorded:', propertyId);
}

async function trackPrice(propertyId, price) {
  const result = await browser.storage.local.get('priceHistory');
  const priceHistory = result.priceHistory || {};
  const key = `property_${propertyId}`;
  
  if (!priceHistory[key]) {
    priceHistory[key] = [];
  }
  
  const lastEntry = priceHistory[key][priceHistory[key].length - 1];
  if (!lastEntry || lastEntry.price !== price) {
    priceHistory[key].push({
      price: price,
      recordedAt: new Date().toISOString()
    });
    
    await browser.storage.local.set({ priceHistory });
    console.log('Price tracked:', propertyId, price);
  }
}

async function detectRedFlags(propertyData) {
  return new Promise((resolve) => {
    browser.runtime.sendMessage(
      { action: 'detectRedFlags', data: propertyData },
      (response) => {
        resolve(response.data || []);
      }
    );
  });
}

console.log('Idealista Helper: Content script initialized');
