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
  console.log('=== Idealista Helper: Enhancing search page ===');
  
  // Get user preferences
  const preferences = await getUserPreferences();
  console.log('User preferences:', JSON.stringify(preferences, null, 2));
  
  // Find all property listings
  const listings = findPropertyListings();
  console.log(`Found ${listings.length} listings`);
  
  // Extract data from each listing
  const listingsData = listings.map(listing => extractPropertyData(listing));
  
  // Count by owner type
  const stats = {
    total: listingsData.length,
    agency: listingsData.filter(d => d.ownerType === 'agency').length,
    owner: listingsData.filter(d => d.ownerType === 'owner').length,
    unknown: listingsData.filter(d => d.ownerType === 'unknown').length
  };
  console.log('Listing stats:', stats);
  
  // Apply filters and enhance each listing (initial pass without energy data)
  for (const data of listingsData) {
    if (data.element) {
      await enhanceListing(data.element, preferences);
      applyFiltersToListing(data, preferences);
    }
  }
  
  // Inject custom filters UI
  injectFiltersUI(preferences);
  
  // Fetch energy data in background (async)
  fetchEnergyDataForListings(listingsData, preferences);
  
  // Set up mutation observer to catch dynamically loaded listings
  observeNewListings();
  
  console.log('=== Idealista Helper: Enhancement complete ===');
}

// Fetch energy data from detail pages
async function fetchEnergyDataForListings(listingsData, preferences) {
  console.log('=== Fetching energy data for listings ===');
  
  // Check cache first
  const cachedEnergy = await getEnergyCache();
  let fetchCount = 0;
  const maxFetches = 10; // Limit concurrent fetches to avoid overwhelming
  
  for (const data of listingsData) {
    if (!data.id) continue;
    
    // Check if we have cached energy data
    if (cachedEnergy[data.id]) {
      data.energyRating = cachedEnergy[data.id].energyRating;
      console.log(`[CACHE] ${data.id}: energy ${data.energyRating}`);
      updateListingBadge(data);
      continue;
    }
    
    // Build the detail page URL
    const detailUrl = `https://www.idealista.com/inmueble/${data.id}/`;
    
    // Limit fetches per page load
    if (fetchCount >= maxFetches) {
      console.log(`[FETCH] Skipping ${data.id}, max fetches reached`);
      continue;
    }
    
    fetchCount++;
    
    // Fetch in background with delay to avoid rate limiting
    setTimeout(async () => {
      try {
        console.log(`[FETCH] Fetching energy for ${data.id}...`);
        const response = await fetch(detailUrl);
        const html = await response.text();
        
        // Parse energy from HTML
        const energyData = parseEnergyFromHTML(html);
        console.log(`[FETCH] ${data.id}: energy ${energyData.energyRating || 'not found'}`);
        
        // Cache the result
        await cacheEnergyData(data.id, energyData);
        
        // Update the listing display
        data.energyRating = energyData.energyRating;
        data.energyConsumption = energyData.energyConsumption;
        data.energyEmissions = energyData.energyEmissions;
        updateListingBadge(data);
        
        // Re-apply filter if needed
        applyFiltersToListing(data, preferences);
        updateFilterStats();
        
      } catch (err) {
        console.error(`[FETCH] Error fetching ${data.id}:`, err);
      }
    }, fetchCount * 500); // Stagger requests by 500ms
  }
}

// Parse energy rating from detail page HTML
function parseEnergyFromHTML(html) {
  let energyConsumption = null;
  let energyEmissions = null;
  let energyStatus = null;
  
  // Check for special statuses first
  if (html.includes('En trámite') || html.includes('en trámite')) {
    energyStatus = 'tramite';
  } else if (html.includes('No indicado') || html.includes('no indicado')) {
    energyStatus = 'no_indicado';
  } else if (html.includes('Exento') || html.includes('exento')) {
    energyStatus = 'exento';
  }
  
  // Check for empty icon-energy-c- class (no letter = pending/unknown)
  if (html.match(/icon-energy-c-["'\s>]/)) {
    energyStatus = energyStatus || 'tramite';
  }
  
  // Look for icon-energy-c-X pattern
  const consumptionMatch = html.match(/icon-energy-c-([a-g])/i);
  if (consumptionMatch) energyConsumption = consumptionMatch[1].toUpperCase();
  
  // Look for second occurrence (emissions)
  const allMatches = html.matchAll(/icon-energy-c-([a-g])/gi);
  const matches = [...allMatches];
  if (matches.length >= 1) energyConsumption = matches[0][1].toUpperCase();
  if (matches.length >= 2) energyEmissions = matches[1][1].toUpperCase();
  
  // Also check ticket classes
  const leftMatch = html.match(/left-([a-g])["'\s]/i);
  const rightMatch = html.match(/right-([a-g])["'\s]/i);
  if (leftMatch && !energyConsumption) energyConsumption = leftMatch[1].toUpperCase();
  if (rightMatch && !energyEmissions) energyEmissions = rightMatch[1].toUpperCase();
  
  // Use the worse rating
  const ENERGY_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
  let energyRating = energyConsumption;
  if (energyConsumption && energyEmissions) {
    energyRating = ENERGY_ORDER[energyConsumption] >= ENERGY_ORDER[energyEmissions] 
      ? energyConsumption : energyEmissions;
  }
  
  // If no rating but has status, use status as rating
  if (!energyRating && energyStatus) {
    energyRating = energyStatus;
  }
  
  return { energyConsumption, energyEmissions, energyRating, energyStatus };
}

// Update a listing's badge with new data
function updateListingBadge(data) {
  if (!data.element) return;
  
  // Remove old badge
  data.element.querySelectorAll('.idealista-helper-owner-badge').forEach(el => el.remove());
  
  // Add new badge
  addInfoBadges(data);
}

// Energy cache functions
async function getEnergyCache() {
  try {
    const result = await browser.storage.local.get('energyCache');
    return result.energyCache || {};
  } catch {
    return {};
  }
}

async function cacheEnergyData(propertyId, energyData) {
  try {
    const cache = await getEnergyCache();
    cache[propertyId] = {
      ...energyData,
      cachedAt: new Date().toISOString()
    };
    await browser.storage.local.set({ energyCache: cache });
  } catch (err) {
    console.error('Error caching energy data:', err);
  }
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
  // Energy rating - look for energy certificate badge
  const energyEl = listing.querySelector('[class*="energy"], .item-energy, .energy-label, [class*="certificado"]');
  let energyRating = null;
  if (energyEl) {
    const match = energyEl.textContent?.match(/[A-G]/i);
    energyRating = match ? match[0].toUpperCase() : null;
  }
  // Also check for energy class in any element
  if (!energyRating) {
    const allText = listing.textContent;
    const energyMatch = allText.match(/certificado\s*energ[eé]tico\s*([A-G])/i) ||
                        allText.match(/clase\s*energ[eé]tica\s*([A-G])/i);
    if (energyMatch) energyRating = energyMatch[1].toUpperCase();
  }
  
  // Owner type - check URL pattern (most reliable method)
  // /pro/ URLs are always agencies, /inmueble/ URLs are typically owners
  const link = listing.querySelector('a[href*="/pro/"], a[href*="/inmueble/"]');
  const linkHref = link?.href || '';
  let ownerType = 'unknown';
  
  if (linkHref.includes('/pro/')) {
    ownerType = 'agency';
  } else if (linkHref.includes('/inmueble/')) {
    // Check for agency indicators in the listing
    const hasAgencyLogo = listing.querySelector('.logo-branding, [class*="logo"], .item-logo') !== null;
    const professionalTag = listing.querySelector('[class*="profesional"], [class*="professional"]');
    ownerType = (hasAgencyLogo || professionalTag) ? 'agency' : 'owner';
  }
  
  return {
    id: extractPropertyId(listing),
    title: listing.querySelector('.item-link')?.textContent?.trim() || 
           listing.querySelector('a.item-link')?.getAttribute('title'),
    price: parsePrice(listing.querySelector('.item-price')?.textContent),
    size: parseSize(listing.querySelector('.item-detail')?.textContent),
    rooms: parseRooms(listing.querySelector('.item-detail')?.textContent),
    photos: listing.querySelectorAll('img').length,
    url: listing.querySelector('a')?.href,
    energyRating: energyRating,
    ownerType: ownerType,
    element: listing
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

// Energy rating order for comparison (A is best = 1, G is worst = 7)
const ENERGY_RATING_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
const ENERGY_UNKNOWN_STATUSES = ['tramite', 'no_indicado', 'exento', 'N/A', null];

// Apply filters to a single listing
function applyFiltersToListing(data, preferences) {
  const filters = preferences?.filters || {};
  let shouldHide = false;
  let hideReason = '';
  
  // Energy rating filter
  if (filters.minEnergyRating && data.energyRating) {
    // Hide if energy status is unknown/pending (tramite, no_indicado, exento)
    if (ENERGY_UNKNOWN_STATUSES.includes(data.energyRating)) {
      shouldHide = true;
      hideReason = `energy unknown (${data.energyRating})`;
    } else {
      const minRatingOrder = ENERGY_RATING_ORDER[filters.minEnergyRating];
      const listingRatingOrder = ENERGY_RATING_ORDER[data.energyRating];
      if (listingRatingOrder > minRatingOrder) {
        shouldHide = true;
        hideReason = `energy ${data.energyRating} > ${filters.minEnergyRating}`;
      }
    }
  }
  
  // Owner type filter
  if (filters.ownerType && filters.ownerType !== 'all') {
    if (data.ownerType !== filters.ownerType && data.ownerType !== 'unknown') {
      shouldHide = true;
      hideReason = `ownerType ${data.ownerType} != ${filters.ownerType}`;
    }
  }
  
  // Apply visibility
  if (shouldHide && data.element) {
    data.element.style.display = 'none';
    console.log(`[FILTER] Hiding #${data.id}: ${hideReason}`);
  }
  
  // Add badges for energy rating and owner type
  addInfoBadges(data);
}

// Add info badges to listing
function addInfoBadges(data) {
  if (!data.element) return;
  
  // Ensure relative positioning
  data.element.style.position = 'relative';
  
  // Combined badge with owner type and energy rating
  const ownerLabel = data.ownerType === 'owner' ? '👤 Particular' : 
                     data.ownerType === 'agency' ? '🏢 Agencia' : null;
  
  const energyColors = {
    'A': '#00a651', 'B': '#50b848', 'C': '#bdd62e',
    'D': '#fff200', 'E': '#fdb913', 'F': '#f37021', 'G': '#ed1c24',
    'tramite': '#ff9800', 'no_indicado': '#607d8b', 'exento': '#9e9e9e'
  };
  
  const energyLabels = {
    'tramite': 'Trámite',
    'no_indicado': 'No ind.',
    'exento': 'Exento'
  };
  
  // Build badge content
  let badgeContent = '';
  if (ownerLabel) {
    badgeContent += ownerLabel;
  }
  
  // Always show energy rating (or N/A if not available)
  const energyLabel = energyLabels[data.energyRating] || data.energyRating || 'N/A';
  const energyColor = energyColors[data.energyRating] || '#999';
  if (badgeContent) badgeContent += ' · ';
  badgeContent += `⚡${energyLabel}`;
  
  if (!badgeContent) return;
  
  const badge = document.createElement('div');
  badge.className = 'idealista-helper-owner-badge';
  badge.innerHTML = badgeContent;
  
  // Determine background color
  let bgColor = '#666';
  if (data.ownerType === 'owner') bgColor = '#2196F3';
  else if (data.ownerType === 'agency') bgColor = '#9c27b0';
  
  badge.style.cssText = `
    position: absolute;
    bottom: 10px;
    right: 10px;
    background: ${bgColor};
    color: white;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  
  // Add energy color indicator
  const energyDot = document.createElement('span');
  energyDot.style.cssText = `
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${energyColor};
    margin-left: 2px;
  `;
  badge.appendChild(energyDot);
  
  data.element.appendChild(badge);
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
async function injectFiltersUI(preferences) {
  console.log('Injecting custom filters UI...');
  
  // Debug: Find any element we can use as anchor
  const firstListing = document.querySelector('article.item');
  const listingParent = firstListing?.parentElement;
  console.log('First listing parent:', listingParent?.className, listingParent?.tagName);
  
  // Try to find the listing container or use body
  const anchorElement = listingParent || 
                        document.querySelector('.items-container') ||
                        document.querySelector('.listing-items') ||
                        document.querySelector('main') ||
                        document.querySelector('#main-content') ||
                        document.body;
  
  console.log('Using anchor element:', anchorElement?.className || anchorElement?.tagName);
  
  const customFilters = await createCustomFiltersUI(preferences);
  
  // Insert at the beginning of the anchor
  if (anchorElement && anchorElement !== document.body) {
    anchorElement.insertBefore(customFilters, anchorElement.firstChild);
  } else {
    // Fallback: create a fixed floating panel
    customFilters.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      max-width: 280px;
    `;
    document.body.appendChild(customFilters);
  }
  
  console.log('Filters UI injected successfully');
  
  // Auto-apply saved filters after UI is ready
  const storage = await browser.storage.local.get('savedFilters');
  if (storage.savedFilters && Object.keys(storage.savedFilters).length > 0) {
    console.log('Applying saved filters:', storage.savedFilters);
    setTimeout(() => applyCustomFilters(), 200);
  }
}

// Create custom filters UI
async function createCustomFiltersUI(preferences) {
  // Load saved filters from storage
  const storage = await browser.storage.local.get('savedFilters');
  const savedFilters = storage.savedFilters || {};
  const filters = { ...preferences?.filters, ...savedFilters };
  
  const container = document.createElement('div');
  container.className = 'idealista-helper-filters';
  container.innerHTML = `
    <div style="border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 8px; background: #f9f9f9;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">🏠 Idealista Helper</h3>
      
      <div id="filterStats" style="margin-bottom: 12px; padding: 8px; background: #e8f5e9; border-radius: 4px; font-size: 12px; color: #2e7d32;">
        Cargando...
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold; font-size: 13px;">
          Tipo de anunciante:
        </label>
        <select id="ownerType" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="all" ${!filters.ownerType || filters.ownerType === 'all' ? 'selected' : ''}>Todos</option>
          <option value="owner" ${filters.ownerType === 'owner' ? 'selected' : ''}>👤 Solo particulares</option>
          <option value="agency" ${filters.ownerType === 'agency' ? 'selected' : ''}>🏢 Solo agencias</option>
        </select>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: bold; font-size: 13px;">
          Certificado Energético mínimo:
        </label>
        <select id="minEnergyRating" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <option value="" ${!filters.minEnergyRating ? 'selected' : ''}>Cualquiera</option>
          <option value="A" ${filters.minEnergyRating === 'A' ? 'selected' : ''}>A (Mejor)</option>
          <option value="B" ${filters.minEnergyRating === 'B' ? 'selected' : ''}>B</option>
          <option value="C" ${filters.minEnergyRating === 'C' ? 'selected' : ''}>C</option>
          <option value="D" ${filters.minEnergyRating === 'D' ? 'selected' : ''}>D</option>
          <option value="E" ${filters.minEnergyRating === 'E' ? 'selected' : ''}>E</option>
          <option value="F" ${filters.minEnergyRating === 'F' ? 'selected' : ''}>F</option>
          <option value="G" ${filters.minEnergyRating === 'G' ? 'selected' : ''}>G (Peor)</option>
        </select>
        <small style="color: #666; font-size: 11px;">⚠️ Solo funciona si el dato está disponible</small>
      </div>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 12px 0;">
      
      <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
        <input type="checkbox" id="hideViewed" ${filters.hideViewedListings ? 'checked' : ''} style="margin-right: 8px;">
        <span style="font-size: 13px;">Ocultar ya vistos</span>
      </label>
      
      <label style="display: flex; align-items: center; margin-bottom: 12px; cursor: pointer;">
        <input type="checkbox" id="showRedFlags" ${filters.showRedFlags ? 'checked' : ''} style="margin-right: 8px;">
        <span style="font-size: 13px;">Mostrar alertas</span>
      </label>
      
      <button id="applyFilters" style="width: 100%; padding: 10px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">
        Aplicar Filtros
      </button>
    </div>
  `;
  
  // Add event listeners - auto-apply on change
  const autoApply = () => {
    saveFiltersAndApply();
  };
  
  container.querySelector('#ownerType').addEventListener('change', autoApply);
  container.querySelector('#minEnergyRating').addEventListener('change', autoApply);
  container.querySelector('#hideViewed').addEventListener('change', autoApply);
  container.querySelector('#showRedFlags').addEventListener('change', autoApply);
  container.querySelector('#applyFilters').addEventListener('click', applyCustomFilters);
  
  // Update stats after a short delay
  setTimeout(updateFilterStats, 100);
  
  return container;
}

// Update filter statistics display
function updateFilterStats() {
  const statsEl = document.querySelector('#filterStats');
  if (!statsEl) return;
  
  const listings = findPropertyListings();
  const visible = listings.filter(l => l.style.display !== 'none').length;
  const hidden = listings.length - visible;
  
  const agencyCount = listings.filter(l => {
    const data = extractPropertyData(l);
    return data.ownerType === 'agency';
  }).length;
  const ownerCount = listings.filter(l => {
    const data = extractPropertyData(l);
    return data.ownerType === 'owner';
  }).length;
  
  statsEl.innerHTML = `
    <div>📊 <strong>${visible}</strong> visibles${hidden > 0 ? ` (${hidden} ocultos)` : ''}</div>
    <div style="margin-top: 4px;">🏢 ${agencyCount} agencias · 👤 ${ownerCount} particulares</div>
  `;
}

// Apply custom filters
async function applyCustomFilters() {
  const hideViewed = document.querySelector('#hideViewed')?.checked || false;
  const showRedFlags = document.querySelector('#showRedFlags')?.checked || false;
  const ownerType = document.querySelector('#ownerType')?.value || 'all';
  const minEnergyRating = document.querySelector('#minEnergyRating')?.value || '';
  
  console.log('=== Applying filters ===');
  console.log('Filter settings:', { hideViewed, showRedFlags, ownerType, minEnergyRating });
  
  // Save preferences
  await saveUserPreferences({
    filters: {
      hideViewedListings: hideViewed,
      showRedFlags: showRedFlags,
      ownerType: ownerType,
      minEnergyRating: minEnergyRating
    }
  });
  
  // Apply filters without reload
  const listings = findPropertyListings();
  const preferences = { filters: { hideViewedListings: hideViewed, showRedFlags, ownerType, minEnergyRating } };
  
  let hiddenCount = 0;
  for (const listing of listings) {
    const data = extractPropertyData(listing);
    // Reset visibility
    listing.style.display = '';
    // Remove old badges
    listing.querySelectorAll('.idealista-helper-energy-badge, .idealista-helper-owner-badge').forEach(el => el.remove());
    applyFiltersToListing(data, preferences);
    if (listing.style.display === 'none') hiddenCount++;
  }
  
  console.log(`Filters applied: ${hiddenCount}/${listings.length} hidden`);
  updateFilterStats();
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
  
  // Display property summary
  displayPropertySummary(propertyData);
  
  // Check and display red flags
  const flags = await detectRedFlags(propertyData);
  if (flags.length > 0) {
    displayRedFlags(flags);
  }
}

// Display property summary widget
function displayPropertySummary(data) {
  const energyColors = {
    'A': '#00a651', 'B': '#50b848', 'C': '#bdd62e',
    'D': '#fff200', 'E': '#fdb913', 'F': '#f37021', 'G': '#ed1c24'
  };
  
  const energyRating = data.energyRating || 'N/A';
  const energyColor = energyColors[data.energyRating] || '#999';
  const energyTextColor = ['D', 'C'].includes(data.energyRating) ? '#000' : '#fff';
  
  // Calculate price per m² if we have both
  const pricePerM2 = (data.price && data.size) ? Math.round(data.price / data.size) : null;
  
  // Advertiser display
  const advertiserIcon = data.advertiserType === 'particular' ? '👤' : '🏢';
  const advertiserLabel = data.advertiserType === 'particular' ? 'Particular' : 'Profesional';
  const advertiserColor = data.advertiserType === 'particular' ? '#2196F3' : '#9c27b0';
  
  const container = document.createElement('div');
  container.className = 'idealista-helper-summary';
  container.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 20px;
    margin: 16px 0;
    color: white;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  `;
  
  container.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
      🏠 Idealista Helper - Resumen
    </h3>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
      
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">PRECIO</div>
        <div style="font-size: 20px; font-weight: bold;">${data.price ? data.price.toLocaleString('es-ES') + '€' : 'N/A'}</div>
        ${pricePerM2 ? `<div style="font-size: 11px; opacity: 0.8;">${pricePerM2}€/m²</div>` : ''}
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">TAMAÑO</div>
        <div style="font-size: 20px; font-weight: bold;">${data.size ? data.size + ' m²' : 'N/A'}</div>
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">HABITACIONES</div>
        <div style="font-size: 20px; font-weight: bold;">${data.rooms || 'N/A'}</div>
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">FOTOS</div>
        <div style="font-size: 20px; font-weight: bold;">${data.photos || 0}</div>
      </div>
      
      <div style="background: ${energyColor}; padding: 12px; border-radius: 8px; text-align: center; color: ${energyTextColor};">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">ENERGÍA</div>
        <div style="font-size: 24px; font-weight: bold;">⚡ ${energyRating}</div>
        ${data.energyConsumption && data.energyEmissions ? 
          `<div style="font-size: 10px; opacity: 0.8;">Consumo: ${data.energyConsumption} · Emisiones: ${data.energyEmissions}</div>` : ''}
      </div>
      
      <div style="background: ${advertiserColor}; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">ANUNCIANTE</div>
        <div style="font-size: 16px; font-weight: bold;">${advertiserIcon} ${advertiserLabel}</div>
        <div style="font-size: 11px; opacity: 0.9; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${data.advertiserName || ''}">${data.advertiserName || 'N/A'}</div>
      </div>
      
    </div>
  `;
  
  // Insert at top of main content
  const mainContent = document.querySelector('.detail-info, main, #main-content') || document.body;
  mainContent.insertBefore(container, mainContent.firstChild);
  
  console.log('Property summary displayed');
}

// Extract property ID from URL
function extractPropertyIdFromURL() {
  const match = window.location.href.match(/inmueble\/(\d+)/);
  return match ? match[1] : null;
}

// Scrape property details from page
function scrapePropertyDetails() {
  console.log('Scraping property details...');
  
  // Energy rating - extract from class name pattern icon-energy-c-{letter}
  let energyConsumption = null;
  let energyEmissions = null;
  
  // Look for energy consumption (icon-energy-c-X where X is the rating)
  const consumptionEl = document.querySelector('[class*="icon-energy-c-"]');
  if (consumptionEl) {
    const match = consumptionEl.className.match(/icon-energy-c-([a-g])/i);
    if (match) energyConsumption = match[1].toUpperCase();
  }
  
  // Look for energy emissions (second occurrence or different pattern)
  const energySpans = document.querySelectorAll('[class*="icon-energy-"]');
  energySpans.forEach(el => {
    const match = el.className.match(/icon-energy-c-([a-g])/i);
    if (match) {
      if (!energyConsumption) energyConsumption = match[1].toUpperCase();
      else if (!energyEmissions) energyEmissions = match[1].toUpperCase();
    }
  });
  
  // Also check certificate image tickets
  const leftTicket = document.querySelector('[data-value-left-cee]');
  const rightTicket = document.querySelector('[data-value-right-cee]');
  if (leftTicket) {
    const leftClass = leftTicket.className.match(/left-([a-g])/i);
    if (leftClass && !energyConsumption) energyConsumption = leftClass[1].toUpperCase();
  }
  if (rightTicket) {
    const rightClass = rightTicket.className.match(/right-([a-g])/i);
    if (rightClass && !energyEmissions) energyEmissions = rightClass[1].toUpperCase();
  }
  
  // Use the worse of the two ratings as the overall rating (or consumption if only one)
  const ENERGY_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
  let energyRating = energyConsumption;
  if (energyConsumption && energyEmissions) {
    energyRating = ENERGY_ORDER[energyConsumption] >= ENERGY_ORDER[energyEmissions] 
      ? energyConsumption : energyEmissions;
  }
  
  console.log('Energy detected:', { energyConsumption, energyEmissions, energyRating });
  
  // Photos - count actual gallery images
  const photoCount = document.querySelectorAll('.detail-image-gallery img, .gallery-container img, [class*="gallery"] img').length ||
                     document.querySelectorAll('img[src*="idealista.com/pictures"]').length;
  
  // Price
  const priceEl = document.querySelector('.info-data-price, .price-value, [class*="price"]');
  const price = parsePrice(priceEl?.textContent);
  
  // Size
  const sizeEl = document.querySelector('.info-data span[class*="size"], .info-features span');
  const size = parseSize(sizeEl?.textContent || document.body.textContent);
  
  // Advertiser info
  const advertiserName = document.querySelector('.advertiser-name')?.textContent?.trim() ||
                         document.querySelector('input[name="user-name"]')?.value?.trim() ||
                         document.querySelector('.about-advertiser-name')?.textContent?.trim();
  
  const advertiserTypeEl = document.querySelector('.professional-name .name');
  const isParticular = advertiserTypeEl?.textContent?.toLowerCase().includes('particular') ||
                       document.querySelector('.particular') !== null;
  const isProfessional = advertiserTypeEl?.textContent?.toLowerCase().includes('profesional') ||
                         document.querySelector('.about-advertiser-name') !== null;
  const advertiserType = isParticular ? 'particular' : (isProfessional ? 'profesional' : 'unknown');
  
  // Agency link if professional
  const agencyLink = document.querySelector('.about-advertiser-name')?.href || null;
  
  const propertyData = {
    id: extractPropertyIdFromURL(),
    url: window.location.href,
    title: document.querySelector('h1, .main-title')?.textContent?.trim(),
    price: price,
    size: size,
    rooms: parseRooms(document.querySelector('.info-features')?.textContent),
    energyRating: energyRating,
    energyConsumption: energyConsumption,
    energyEmissions: energyEmissions,
    description: document.querySelector('.comment p, .adCommentsLanguage')?.textContent?.trim(),
    photos: photoCount,
    advertiserName: advertiserName,
    advertiserType: advertiserType,
    agencyLink: agencyLink
  };
  
  console.log('Scraped property data:', propertyData);
  return propertyData;
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
