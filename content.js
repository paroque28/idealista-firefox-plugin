// Content script for Idealista AI Assistant
// Chat UI + Claude API client + Tool implementations

console.log('Idealista AI Assistant: Content script loaded');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const STORAGE_KEY = 'idealista-ai-assistant';

const SYSTEM_PROMPT = `You are an AI assistant helping a user find a flat to rent on Idealista.com (Spanish real estate website).
You have tools to interact with the property listings on the page.

When the user loads a search page, briefly summarize what you see and offer to help.
Explain what you're doing and why in a helpful, concise way.

Be proactive about pointing out:
- Good deals (low price per m²)
- Red flags (suspiciously low prices, missing info, few photos)
- Properties that match their criteria well

**IMPORTANT - Filter Strategy**:
1. **ALWAYS prefer native Idealista filters** (set_search_filters) for objective criteria like:
   - Price range, size, rooms, bathrooms
   - Features: pets, AC, elevator, terrace, parking, pool, etc.
   - Housing type, condition, floor level
   - Publication date

   Native filters apply to ALL search results across all pages and are much more efficient.

2. **Only use filter_listings** (client-side filtering) for:
   - AI-powered subjective filtering after reading descriptions (e.g., "luminoso", "tranquilo")
   - Filtering by owner type (particular vs agency) - not available in native filters
   - Energy certificate requirements - not available in native filters

   Note: filter_listings only affects the CURRENT PAGE. Hidden listings will reappear on other pages.

3. **AI Filtering** (for subjective criteria only):
   Use get_all_listings_details to fetch descriptions, analyze them to identify relevant keywords, then use filter_listings with smart_filter (NOT listing_ids).

   smart_filter format:
   {
     "label": "Luminosos",  // Short label shown to user
     "keywords": ["luminoso", "luz natural", "soleado", "mucha luz", "muy luminoso"],
     "exclude_keywords": ["interior", "sin luz"]  // Optional
   }

   Examples:
   - "pisos luminosos" → keywords: ["luminoso", "luz natural", "soleado", "orientación sur"]
   - "tranquilos" → keywords: ["tranquilo", "silencioso", "zona tranquila"], exclude: ["ruidoso", "bullicioso"]
   - "reformados" → keywords: ["reformado", "recién reformado", "a estrenar", "nuevo"]

   IMPORTANT: smart_filter persists across pages (unlike listing_ids). The keywords are searched in descriptions automatically on each page.

Keep responses concise - users are browsing, not reading essays.
Use Spanish for responses since this is a Spanish website, but understand English too.

Important notes:
- Prices are in EUR (€)
- Sizes are in square meters (m²)
- Energy ratings go from A (best) to G (worst)
- "Particular" means individual owner, "Agencia" means real estate agency

**Energy Certificates**: Many listings have invalid energy certificates (en trámite, no indicado, exento). When greeting the user, if there are listings without valid A-G ratings, mention how many and ask if they want to hide them.`;

// Tool definitions for Claude
const TOOLS = [
  {
    name: 'get_listings',
    description: 'Get all property listings currently visible on the page with their data (price, size, rooms, energy rating, owner type, etc.)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'filter_listings',
    description: 'Show or hide listings on the CURRENT PAGE ONLY. Use this for: (1) AI-powered subjective filtering after reading descriptions, (2) owner type filtering (particular/agency), (3) energy certificate requirements. For objective criteria like price/size/rooms/amenities, ALWAYS use set_search_filters instead as it applies to ALL pages. For AI filtering, use smart_filter with keywords instead of listing_ids so filters persist across pages.',
    input_schema: {
      type: 'object',
      properties: {
        owner_type: {
          type: 'string',
          enum: ['individual', 'agency', 'all'],
          description: 'Filter by owner type: individual (particular), agency, or all'
        },
        max_price: {
          type: 'number',
          description: 'Maximum price in EUR'
        },
        min_size: {
          type: 'number',
          description: 'Minimum size in square meters'
        },
        min_rooms: {
          type: 'number',
          description: 'Minimum number of rooms'
        },
        min_energy_rating: {
          type: 'string',
          enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          description: 'Minimum energy rating (A is best, G is worst)'
        },
        require_energy_cert: {
          type: 'boolean',
          description: 'If true, hide listings without valid energy certification (hides: en trámite, no indicado, exento, N/A)'
        },
        listing_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'DEPRECATED: Use smart_filter instead. Show only these specific listing IDs (does NOT persist across pages)'
        },
        smart_filter: {
          type: 'object',
          description: 'AI-powered filter that persists across pages. Filters listings by keywords found in descriptions.',
          properties: {
            label: {
              type: 'string',
              description: 'Short label shown to user (e.g., "Luminosos", "Tranquilos", "Reformados")'
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for in listing descriptions (case-insensitive). Listing shown if ANY keyword matches. Example: ["luminoso", "luz natural", "soleado", "mucha luz"]'
            },
            exclude_keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords that disqualify a listing (e.g., ["interior", "sin luz"] for bright apartments)'
            }
          },
          required: ['label', 'keywords']
        }
      }
    }
  },
  {
    name: 'get_listing_details',
    description: 'Fetch detailed information about a specific listing by visiting its detail page. Returns energy rating, full description, advertiser info, etc.',
    input_schema: {
      type: 'object',
      properties: {
        listing_id: {
          type: 'string',
          description: 'The ID of the listing to get details for'
        }
      },
      required: ['listing_id']
    }
  },
  {
    name: 'highlight_listings',
    description: 'Visually highlight specific listings on the page with a glowing border to draw attention to them',
    input_schema: {
      type: 'object',
      properties: {
        listing_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of listings to highlight'
        },
        color: {
          type: 'string',
          description: 'Color for the highlight (CSS color value)',
          default: '#4CAF50'
        }
      },
      required: ['listing_ids']
    }
  },
  {
    name: 'open_listing',
    description: 'Open a listing in a new browser tab',
    input_schema: {
      type: 'object',
      properties: {
        listing_id: {
          type: 'string',
          description: 'The ID of the listing to open'
        }
      },
      required: ['listing_id']
    }
  },
  {
    name: 'show_all_listings',
    description: 'Reset visibility - show all listings and remove all filters and highlights',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_page_summary',
    description: 'Get a statistical summary of the current page: total listings, price range, average price, breakdown by owner type and energy rating',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_pagination_info',
    description: 'Get information about pagination: current page number, total pages, and available navigation options',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'go_to_page',
    description: 'Navigate to a specific page number in the search results',
    input_schema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: 'Page number to navigate to'
        }
      },
      required: ['page']
    }
  },
  {
    name: 'next_page',
    description: 'Navigate to the next page of search results',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'previous_page',
    description: 'Navigate to the previous page of search results',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'set_search_filters',
    description: 'Apply native Idealista search filters. This will reload the page with the new filters applied across ALL pages. PREFERRED over filter_listings for objective criteria. Available filters: price range, size range, rooms, bathrooms, amenities, condition, floor, publication date, and more.',
    input_schema: {
      type: 'object',
      properties: {
        min_price: {
          type: 'number',
          description: 'Minimum price in EUR'
        },
        max_price: {
          type: 'number',
          description: 'Maximum price in EUR'
        },
        min_size: {
          type: 'number',
          description: 'Minimum size in m²'
        },
        max_size: {
          type: 'number',
          description: 'Maximum size in m²'
        },
        rooms: {
          type: 'array',
          items: { type: 'number' },
          description: 'Number of rooms (0=studio, 1, 2, 3, 4=4 or more)'
        },
        bathrooms: {
          type: 'array',
          items: { type: 'number' },
          description: 'Number of bathrooms (1, 2, 3=3 or more)'
        },
        pets_allowed: {
          type: 'boolean',
          description: 'Must allow pets'
        },
        air_conditioning: {
          type: 'boolean',
          description: 'Must have air conditioning'
        },
        wardrobes: {
          type: 'boolean',
          description: 'Must have built-in wardrobes (armarios empotrados)'
        },
        elevator: {
          type: 'boolean',
          description: 'Must have elevator'
        },
        terrace: {
          type: 'boolean',
          description: 'Must have terrace'
        },
        balcony: {
          type: 'boolean',
          description: 'Must have balcony'
        },
        parking: {
          type: 'boolean',
          description: 'Must have parking/garage'
        },
        pool: {
          type: 'boolean',
          description: 'Must have swimming pool'
        },
        garden: {
          type: 'boolean',
          description: 'Must have garden'
        },
        storage_room: {
          type: 'boolean',
          description: 'Must have storage room (trastero)'
        },
        furnished: {
          type: 'boolean',
          description: 'Must be furnished'
        },
        equipped_kitchen: {
          type: 'boolean',
          description: 'Must have equipped kitchen only (not fully furnished)'
        },
        exterior: {
          type: 'boolean',
          description: 'Must be exterior (not interior)'
        },
        sea_views: {
          type: 'boolean',
          description: 'Must have sea views'
        },
        luxury: {
          type: 'boolean',
          description: 'Luxury properties only'
        },
        accessible: {
          type: 'boolean',
          description: 'Accessible housing only'
        },
        new_construction: {
          type: 'boolean',
          description: 'New construction only'
        },
        good_condition: {
          type: 'boolean',
          description: 'Good condition only'
        },
        to_renovate: {
          type: 'boolean',
          description: 'Properties to renovate only'
        },
        top_floor: {
          type: 'boolean',
          description: 'Top floor only (última planta)'
        },
        intermediate_floor: {
          type: 'boolean',
          description: 'Intermediate floors only'
        },
        ground_floor: {
          type: 'boolean',
          description: 'Ground floor only (bajos)'
        },
        published_last_24h: {
          type: 'boolean',
          description: 'Published in the last 24 hours'
        },
        published_last_week: {
          type: 'boolean',
          description: 'Published in the last week'
        },
        published_last_month: {
          type: 'boolean',
          description: 'Published in the last month'
        },
        long_term_rental: {
          type: 'boolean',
          description: 'Long-term residential rental only'
        },
        seasonal_rental: {
          type: 'boolean',
          description: 'Seasonal/temporary rental only'
        },
        only_flats: {
          type: 'boolean',
          description: 'Only flats (pisos), excluding penthouses and duplexes'
        },
        penthouses: {
          type: 'boolean',
          description: 'Penthouses only (áticos)'
        },
        duplexes: {
          type: 'boolean',
          description: 'Duplexes only'
        },
        chalets: {
          type: 'boolean',
          description: 'Houses and chalets'
        },
        with_plan: {
          type: 'boolean',
          description: 'Must have floor plan'
        },
        virtual_tour: {
          type: 'boolean',
          description: 'Must have virtual tour'
        }
      }
    }
  },
  {
    name: 'get_available_filters',
    description: 'Get the current filter values and available options from the Idealista filter sidebar',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_all_listings_details',
    description: 'Fetch detailed information (including full descriptions) for visible listings on the page. Use this for AI-powered filtering based on subjective criteria like "luminoso", "tranquilo", "reformado", etc. Returns an array with id, title, price, size, description, and features for each listing. After analyzing, use filter_listings with listing_ids to show only matching ones. NOTE: Limited to 15 listings by default to avoid anti-bot detection.',
    input_schema: {
      type: 'object',
      properties: {
        include_hidden: {
          type: 'boolean',
          description: 'Include hidden listings too (default: false)',
          default: false
        },
        max_listings: {
          type: 'number',
          description: 'Maximum number of listings to fetch (default: 15, max recommended: 20 to avoid rate limits)',
          default: 15
        }
      },
      required: []
    }
  },
  {
    name: 'execute_page_script',
    description: 'Execute custom JavaScript to extract ANY data from the page or apply ANY filter. Use this as a flexible fallback when other tools do not support what you need. Examples: extract specific elements, read hidden data attributes, apply custom filtering logic, interact with page elements. The user will see a simple description and approve before execution. This enables unlimited filtering and data extraction capabilities beyond the pre-built tools.',
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute. Should return a value (can be object, array, string, etc.). Has access to full DOM.'
        },
        description: {
          type: 'string',
          description: 'Simple, non-technical description in Spanish of what this will do. The user sees ONLY this to decide. Example: "Buscar pisos que mencionen parking en la descripción"'
        }
      },
      required: ['code', 'description']
    }
  }
];

// ============================================================================
// STATE
// ============================================================================

let chatMessages = [];
let currentFilters = {};
let isProcessing = false;
let apiKey = null;
let sidebarVisible = false;

// ============================================================================
// PERSISTENT STORAGE
// ============================================================================

function getStorageKey() {
  // Use search path as key so different searches have different histories
  const path = window.location.pathname.replace(/pagina-\d+\.htm$/, '');
  return `${STORAGE_KEY}-${path}`;
}

function saveState() {
  try {
    const inputEl = document.getElementById('ai-input');
    const state = {
      chatMessages,
      currentFilters,
      sidebarVisible,
      pendingInput: inputEl?.value || '',
      savedAt: Date.now()
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function savePendingNavigation(message) {
  try {
    const state = {
      pendingNavigation: true,
      navigationMessage: message,
      savedAt: Date.now()
    };
    localStorage.setItem(`${getStorageKey()}-nav`, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving navigation state:', e);
  }
}

function loadPendingNavigation() {
  try {
    const saved = localStorage.getItem(`${getStorageKey()}-nav`);
    if (saved) {
      localStorage.removeItem(`${getStorageKey()}-nav`);
      const state = JSON.parse(saved);
      // Only use if saved recently (within 30 seconds)
      if (Date.now() - state.savedAt < 30000) {
        return state;
      }
    }
  } catch (e) {
    console.error('Error loading navigation state:', e);
  }
  return null;
}

let pendingInput = '';

function loadState() {
  try {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      const state = JSON.parse(saved);
      // Only restore if saved within last 24 hours
      if (Date.now() - state.savedAt < 24 * 60 * 60 * 1000) {
        chatMessages = state.chatMessages || [];
        currentFilters = state.currentFilters || {};
        sidebarVisible = state.sidebarVisible || false;
        pendingInput = state.pendingInput || '';
        console.log('[AI] Loaded state:', { messages: chatMessages.length, filters: currentFilters, sidebarVisible, pendingInput: pendingInput.length > 0 });
        return true;
      }
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return false;
}

function clearState() {
  localStorage.removeItem(getStorageKey());
  chatMessages = [];
  currentFilters = {};
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  const pageType = detectPageType();
  console.log('Page type:', pageType);

  if (pageType !== 'search') {
    console.log('Not a search page, skipping initialization');
    return;
  }

  // Load API key
  await loadApiKey();

  // Load saved state
  const hasState = loadState();

  // Create chat UI
  createChatUI();

  // Restore chat messages if any
  if (hasState && chatMessages.length > 0) {
    restoreChatMessages();
    // Always open sidebar if we have history
    if (!sidebarVisible) {
      toggleSidebar();
    }
  }

  // Restore pending input
  if (pendingInput) {
    const inputEl = document.getElementById('ai-input');
    if (inputEl) {
      inputEl.value = pendingInput;
      console.log('[AI] Restored pending input');
    }
  }

  // Add energy badges to all listings
  addEnergyBadgesToListings();

  // Apply saved filters and update display
  if (Object.keys(currentFilters).length > 0) {
    // applyFilters is async (may need to fetch descriptions for smart filters)
    applyFilters(currentFilters).then(() => {
      updateActiveFiltersDisplay();
      // Show message if smart filter is active
      if (currentFilters.smart_filter) {
        console.log('[AI] Smart filter re-applied:', currentFilters.smart_filter.label);
      }
    });
  } else {
    updateActiveFiltersDisplay();
  }

  // Check for pending navigation (page was reloaded after navigation)
  const pendingNav = loadPendingNavigation();
  if (pendingNav && pendingNav.pendingNavigation) {
    console.log('[AI] Continuing after navigation:', pendingNav.navigationMessage);
    // Open sidebar and continue conversation
    if (!sidebarVisible) {
      toggleSidebar();
    }
    setTimeout(() => {
      if (apiKey) {
        const summary = toolGetPageSummary();
        const pagination = toolGetPaginationInfo();
        const continuePrompt = `Navigation complete. Now on page ${pagination.currentPage}. Page summary: ${JSON.stringify(summary)}. Previous context: ${pendingNav.navigationMessage}. Briefly confirm the navigation and summarize what you see now.`;
        processWithClaude(continuePrompt, true);
      }
    }, 1500);
  } else if (!hasState || chatMessages.length === 0) {
    // Send proactive greeting only if no history and no pending navigation
    setTimeout(() => {
      if (apiKey) {
        sendProactiveGreeting();
      }
    }, 1000);
  }
}

function detectPageType() {
  const url = window.location.href;
  if (url.includes('/inmueble/')) return 'property';
  if (url.includes('/alquiler-') || url.includes('/venta-') || url.includes('/multi/')) return 'search';
  return 'unknown';
}

async function loadApiKey() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getApiKey' });
    apiKey = response.apiKey || null;
    console.log('API key loaded:', apiKey ? 'yes' : 'no');
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

// ============================================================================
// ENERGY BADGES
// ============================================================================

// Cache for fetched listing details
let listingDetailsCache = {};

function loadDetailsCache() {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}-details-cache`);
    if (saved) {
      listingDetailsCache = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading details cache:', e);
  }
}

function saveDetailsCache() {
  try {
    localStorage.setItem(`${STORAGE_KEY}-details-cache`, JSON.stringify(listingDetailsCache));
  } catch (e) {
    console.error('Error saving details cache:', e);
  }
}

async function addEnergyBadgesToListings() {
  loadDetailsCache();
  const listings = findPropertyListings();

  for (const listing of listings) {
    addEnergyBadge(listing);
  }

  // Auto-fetch details for listings without energy ratings
  await fetchMissingEnergyRatings(listings);
}

function addEnergyBadge(listing) {
  // Skip if badge already exists
  if (listing.querySelector('.idealista-ai-badge')) return;

  const data = extractPropertyData(listing);

  // Check cache for energy rating
  const cachedDetails = listingDetailsCache[data.id];
  const energyRating = cachedDetails?.energyRating || data.energyRating;

  // Ensure relative positioning for badge placement
  listing.style.position = 'relative';

  const badge = document.createElement('div');
  badge.className = 'idealista-ai-badge';
  badge.setAttribute('data-listing-id', data.id);

  // Owner type
  const ownerIcon = data.ownerType === 'owner' ? '👤' : data.ownerType === 'agency' ? '🏢' : '❓';
  const ownerLabel = data.ownerType === 'owner' ? 'Particular' : data.ownerType === 'agency' ? 'Agencia' : 'Desconocido';

  // Energy rating colors
  const energyColors = {
    'A': '#00a651', 'B': '#50b848', 'C': '#bdd62e',
    'D': '#fff200', 'E': '#fdb913', 'F': '#f37021', 'G': '#ed1c24'
  };
  const energyColor = energyColors[energyRating] || '#999';
  const energyLabel = energyRating || '...';

  badge.innerHTML = `
    <span class="badge-owner">${ownerIcon} ${ownerLabel}</span>
    <span class="badge-energy" style="background: ${energyColor}">⚡${energyLabel}</span>
  `;

  listing.appendChild(badge);
}

function updateBadgeEnergy(listingId, energyRating) {
  const badge = document.querySelector(`.idealista-ai-badge[data-listing-id="${listingId}"]`);
  if (!badge) return;

  const energyColors = {
    'A': '#00a651', 'B': '#50b848', 'C': '#bdd62e',
    'D': '#fff200', 'E': '#fdb913', 'F': '#f37021', 'G': '#ed1c24'
  };
  const energyColor = energyColors[energyRating] || '#999';
  const energyLabel = energyRating || 'N/A';

  const energySpan = badge.querySelector('.badge-energy');
  if (energySpan) {
    energySpan.style.background = energyColor;
    energySpan.innerHTML = `⚡${energyLabel}`;
  }
}

async function fetchMissingEnergyRatings(listings) {
  const toFetch = [];

  console.log(`[AI] Checking ${listings.length} listings for missing energy ratings...`);
  console.log(`[AI] Cache has ${Object.keys(listingDetailsCache).length} entries`);

  for (const listing of listings) {
    const data = extractPropertyData(listing);
    if (!data.id) continue;

    // Check if cached AND has valid energy rating
    const cached = listingDetailsCache[data.id];
    if (cached && cached.energyRating && cached.energyRating !== 'N/A') {
      console.log(`[AI] Listing ${data.id}: cached with rating ${cached.energyRating}`);
      continue;
    }

    // Skip if already has energy rating from page
    if (data.energyRating) {
      listingDetailsCache[data.id] = { energyRating: data.energyRating };
      console.log(`[AI] Listing ${data.id}: has page rating ${data.energyRating}`);
      continue;
    }

    toFetch.push({ id: data.id, listing });
  }

  if (toFetch.length === 0) {
    console.log('[AI] No listings need energy rating fetch');
    return;
  }

  console.log(`[AI] Fetching energy ratings for ${toFetch.length} listings...`);

  // Fetch in batches with delay to avoid rate limiting
  const BATCH_SIZE = 3;
  const DELAY_MS = 500;

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    console.log(`[AI] Fetching batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batch.map(b => b.id));

    await Promise.all(batch.map(async ({ id }) => {
      try {
        const details = await toolGetListingDetails({ listing_id: id });
        console.log(`[AI] Fetched ${id}:`, details?.energyRating || 'no rating', details?.error || '');
        if (details && !details.error) {
          listingDetailsCache[id] = details;
          updateBadgeEnergy(id, details.energyRating);
        } else {
          // Cache as N/A to avoid re-fetching
          listingDetailsCache[id] = { energyRating: 'N/A' };
          updateBadgeEnergy(id, 'N/A');
        }
      } catch (error) {
        console.error(`[AI] Error fetching details for ${id}:`, error);
        listingDetailsCache[id] = { energyRating: 'N/A' };
        updateBadgeEnergy(id, 'N/A');
      }
    }));

    // Save cache after each batch
    saveDetailsCache();

    // Delay between batches
    if (i + BATCH_SIZE < toFetch.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('[AI] Finished fetching energy ratings');
}

// ============================================================================
// CHAT UI
// ============================================================================

function createChatUI() {
  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'idealista-ai-toggle';
  toggleBtn.innerHTML = '🤖';
  toggleBtn.title = 'Open AI Assistant';
  toggleBtn.addEventListener('click', toggleSidebar);
  document.body.appendChild(toggleBtn);

  // Create sidebar
  const sidebar = document.createElement('div');
  sidebar.id = 'idealista-ai-sidebar';
  sidebar.innerHTML = `
    <div class="ai-sidebar-header">
      <h3>AI Assistant</h3>
      <div class="ai-header-buttons">
        <button class="ai-clear-btn" title="Clear history">🗑️</button>
        <button class="ai-close-btn" title="Close">&times;</button>
      </div>
    </div>
    <div class="ai-active-filters" id="ai-active-filters"></div>
    <div class="ai-messages" id="ai-messages"></div>
    <div class="ai-input-area">
      <textarea id="ai-input" placeholder="Ask me about these listings..." rows="2"></textarea>
      <button id="ai-send" title="Send">
        <span>➤</span>
      </button>
    </div>
  `;
  document.body.appendChild(sidebar);

  // Event listeners
  sidebar.querySelector('.ai-close-btn').addEventListener('click', toggleSidebar);
  sidebar.querySelector('.ai-clear-btn').addEventListener('click', handleClearHistory);
  document.getElementById('ai-send').addEventListener('click', handleSendMessage);
  document.getElementById('ai-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('idealista-ai-sidebar');
  const toggle = document.getElementById('idealista-ai-toggle');
  sidebarVisible = !sidebarVisible;

  if (sidebarVisible) {
    sidebar.classList.add('visible');
    toggle.classList.add('hidden');
    document.getElementById('ai-input').focus();
  } else {
    sidebar.classList.remove('visible');
    toggle.classList.remove('hidden');
  }

  saveState();
}

function restoreChatMessages() {
  const messagesContainer = document.getElementById('ai-messages');

  for (const msg of chatMessages) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${msg.role}`;

    const formattedContent = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    messageDiv.innerHTML = formattedContent;
    messagesContainer.appendChild(messageDiv);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleClearHistory() {
  if (confirm('¿Borrar el historial de chat y los filtros guardados?')) {
    clearState();
    document.getElementById('ai-messages').innerHTML = '';
    // Reset filters
    toolShowAllListings();
    updateActiveFiltersDisplay();
    // Refresh badges
    document.querySelectorAll('.idealista-ai-badge').forEach(b => b.remove());
    addEnergyBadgesToListings();
  }
}

function updateActiveFiltersDisplay() {
  const container = document.getElementById('ai-active-filters');
  if (!container) return;

  const filterLabels = {
    owner_type: { label: 'Tipo', values: { individual: 'Particular', agency: 'Agencia' } },
    max_price: { label: 'Precio máx', suffix: '€' },
    min_price: { label: 'Precio mín', suffix: '€' },
    min_size: { label: 'Tamaño mín', suffix: 'm²' },
    max_size: { label: 'Tamaño máx', suffix: 'm²' },
    min_rooms: { label: 'Hab. mín' },
    min_energy_rating: { label: 'Energía mín' },
    require_energy_cert: { label: 'Cert. energético', values: { true: 'Requerido' } }
  };

  const activeFilters = Object.entries(currentFilters)
    .filter(([_key, value]) => value !== undefined && value !== null && value !== 'all')
    .map(([key, value]) => {
      // Special handling for smart_filter
      if (key === 'smart_filter' && value?.label) {
        return { key, label: '🤖 Filtro IA', value: value.label, isSmartFilter: true };
      }

      const config = filterLabels[key] || { label: key };
      let displayValue = value;

      if (config.values && config.values[value]) {
        displayValue = config.values[value];
      } else if (config.suffix) {
        displayValue = `${value}${config.suffix}`;
      } else if (typeof value === 'object') {
        return null; // Skip complex objects we don't know how to display
      }

      return { key, label: config.label, value: displayValue };
    })
    .filter(f => f !== null);

  if (activeFilters.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = activeFilters.map(filter => `
    <span class="ai-filter-tag ${filter.isSmartFilter ? 'ai-filter-smart' : ''}" data-filter-key="${filter.key}">
      ${filter.label}: ${filter.value}
      <button class="ai-filter-remove" title="Eliminar filtro">&times;</button>
    </span>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.ai-filter-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tag = e.target.closest('.ai-filter-tag');
      const filterKey = tag.getAttribute('data-filter-key');
      removeFilter(filterKey);
    });
  });
}

async function removeFilter(filterKey) {
  console.log('[AI] Removing filter:', filterKey);
  delete currentFilters[filterKey];
  saveState();

  // Reapply remaining filters
  if (Object.keys(currentFilters).length > 0) {
    await applyFilters(currentFilters);
  } else {
    toolShowAllListings();
  }

  updateActiveFiltersDisplay();
}

function addMessage(role, content) {
  const messagesContainer = document.getElementById('ai-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ai-message-${role}`;

  // Parse markdown-like formatting
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  messageDiv.innerHTML = formattedContent;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  chatMessages.push({ role, content });
  saveState();
}

function addSystemMessage(content) {
  const messagesContainer = document.getElementById('ai-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'ai-message ai-message-system';
  messageDiv.textContent = content;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById('ai-messages');
  const indicator = document.createElement('div');
  indicator.className = 'ai-typing-indicator';
  indicator.id = 'ai-typing';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  messagesContainer.appendChild(indicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('ai-typing');
  if (indicator) indicator.remove();
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

async function handleSendMessage() {
  const input = document.getElementById('ai-input');
  const message = input.value.trim();

  if (!message || isProcessing) return;

  if (!apiKey) {
    addSystemMessage('Configura tu API key de Claude en el popup de la extensión (haz clic en el icono de la extensión en la barra de herramientas).');
    return;
  }

  input.value = '';
  addMessage('user', message);
  await processWithClaude(message);
}

async function sendProactiveGreeting() {
  if (!apiKey || chatMessages.length > 0) return;

  // Get page summary for context
  const summary = toolGetPageSummary();
  const pagination = toolGetPaginationInfo();
  const greetingPrompt = `The user just loaded an Idealista search page. Here's what's on the page: ${JSON.stringify(summary)}. Pagination info: ${JSON.stringify(pagination)}.

Give a brief, friendly greeting summarizing what you see (2-3 sentences).

${summary.withoutValidEnergyCert > 0 ? `IMPORTANT: There are ${summary.withoutValidEnergyCert} listings without valid energy certification (en trámite, no indicado, etc.). Ask the user if they want to hide these listings. If they say yes, use filter_listings with require_energy_cert: true.` : ''}

Then add a short section with example commands they can try:
- Basic: "Solo particulares", "Máximo 1200€"
- AI filters: "Busca pisos luminosos", "Encuentra pisos tranquilos"

Keep it concise.`;

  await processWithClaude(greetingPrompt, true);
}

async function processWithClaude(userMessage, isSystem = false) {
  isProcessing = true;
  showTypingIndicator();

  console.log('[AI] Processing message:', isSystem ? '(system)' : userMessage.substring(0, 100) + '...');

  try {
    // Build messages array
    const messages = [];

    // Add conversation history (excluding system messages)
    for (const msg of chatMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message if not already in history
    if (!isSystem && !messages.some(m => m.content === userMessage)) {
      messages.push({ role: 'user', content: userMessage });
    } else if (isSystem) {
      messages.push({ role: 'user', content: userMessage });
    }

    console.log('[AI] Sending request with', messages.length, 'messages');

    // Call Claude API with tools
    let response = await callClaudeAPI(messages);
    let toolCallCount = 0;

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      toolCallCount++;
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
      const toolResults = [];

      console.log(`[AI] Tool use round ${toolCallCount}:`, toolUseBlocks.map(t => t.name));

      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      // Add assistant's tool use and results to messages
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      // Continue conversation
      response = await callClaudeAPI(messages);
    }

    // Extract text response
    const textBlocks = response.content.filter(block => block.type === 'text');
    const assistantMessage = textBlocks.map(b => b.text).join('\n');

    console.log('[AI] Claude response:', assistantMessage);

    if (assistantMessage) {
      addMessage('assistant', assistantMessage);
    }

  } catch (error) {
    console.error('[AI] Error processing with Claude:', error);
    addSystemMessage(`Error: ${error.message}`);
  } finally {
    isProcessing = false;
    hideTypingIndicator();
  }
}

async function callClaudeAPI(messages) {
  console.log('[AI] API Request - Messages:', messages.length, 'Model:', CLAUDE_MODEL);

  const startTime = Date.now();
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: messages
    })
  });

  const elapsed = Date.now() - startTime;
  console.log(`[AI] API Response - Status: ${response.status}, Time: ${elapsed}ms`);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[AI] API Error:', errorData);
    const errorMessage = errorData.error?.message || 'API request failed';

    // Provide user-friendly error messages
    if (errorMessage.includes('credit balance is too low')) {
      throw new Error('No tienes créditos en tu cuenta de Anthropic. Ve a console.anthropic.com → Settings → Billing para añadir créditos.');
    } else if (errorMessage.includes('invalid x-api-key') || errorMessage.includes('Invalid API Key')) {
      throw new Error('API key inválida. Verifica tu clave en el popup de la extensión.');
    } else if (errorMessage.includes('rate limit')) {
      throw new Error('Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.');
    } else if (response.status === 401) {
      throw new Error('Error de autenticación. Verifica tu API key.');
    } else if (response.status === 500) {
      throw new Error('Error del servidor de Anthropic. Inténtalo de nuevo en unos minutos.');
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('[AI] API Response data:', {
    stop_reason: data.stop_reason,
    content_types: data.content?.map(c => c.type),
    usage: data.usage
  });
  return data;
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function executeToolCall(toolName, input) {
  console.log(`[AI] Executing tool: ${toolName}`, input);
  let result;

  switch (toolName) {
    case 'get_listings':
      result = toolGetListings();
      break;
    case 'filter_listings':
      result = toolFilterListings(input);
      break;
    case 'get_listing_details':
      result = await toolGetListingDetails(input);
      break;
    case 'highlight_listings':
      result = toolHighlightListings(input);
      break;
    case 'open_listing':
      result = toolOpenListing(input);
      break;
    case 'show_all_listings':
      result = toolShowAllListings();
      break;
    case 'get_page_summary':
      result = toolGetPageSummary();
      break;
    case 'get_pagination_info':
      result = toolGetPaginationInfo();
      break;
    case 'go_to_page':
      result = toolGoToPage(input);
      break;
    case 'next_page':
      result = toolNextPage();
      break;
    case 'previous_page':
      result = toolPreviousPage();
      break;
    case 'set_search_filters':
      result = toolSetSearchFilters(input);
      break;
    case 'get_available_filters':
      result = toolGetAvailableFilters();
      break;
    case 'get_all_listings_details':
      result = await toolGetAllListingsDetails(input);
      break;
    case 'execute_page_script':
      result = await toolExecutePageScript(input);
      break;
    default:
      result = { error: `Unknown tool: ${toolName}` };
  }

  console.log(`[AI] Tool result: ${toolName}`, result);
  return result;
}

// Tool: Get all listings
function toolGetListings() {
  const listings = findPropertyListings();
  return listings.map(el => extractPropertyData(el));
}

// Tool: Filter listings
async function toolFilterListings(input) {
  // Save filters for persistence (but not listing_ids as they're page-specific)
  const filtersToSave = { ...input };
  delete filtersToSave.listing_ids; // Don't persist listing_ids
  currentFilters = { ...currentFilters, ...filtersToSave };
  saveState();

  const result = await applyFilters(input);
  updateActiveFiltersDisplay();
  return result;
}

async function applyFilters(input) {
  const listings = findPropertyListings();
  let hiddenCount = 0;
  let shownCount = 0;

  // If smart_filter is being applied, we may need to fetch descriptions first
  if (input.smart_filter) {
    await ensureDescriptionsLoaded(listings);
  }

  for (const listing of listings) {
    const data = extractPropertyData(listing);
    let shouldHide = false;

    // Filter by specific IDs (deprecated, doesn't persist across pages)
    if (input.listing_ids && input.listing_ids.length > 0) {
      shouldHide = !input.listing_ids.includes(data.id);
    }

    // Smart filter - keyword-based filtering that persists across pages
    if (input.smart_filter && input.smart_filter.keywords) {
      const cached = listingDetailsCache[data.id];
      const description = (cached?.description || '').toLowerCase();
      const title = (data.title || '').toLowerCase();
      const searchText = `${title} ${description}`;

      // Check if any keyword matches
      const keywords = input.smart_filter.keywords.map(k => k.toLowerCase());
      const hasMatch = keywords.some(keyword => searchText.includes(keyword));

      // Check if any exclude keyword matches
      const excludeKeywords = (input.smart_filter.exclude_keywords || []).map(k => k.toLowerCase());
      const hasExclude = excludeKeywords.some(keyword => searchText.includes(keyword));

      if (!hasMatch || hasExclude) {
        shouldHide = true;
      }
    }

    // Apply other filters (these stack with smart_filter)
    if (!shouldHide) {
      if (input.owner_type && input.owner_type !== 'all') {
        const targetType = input.owner_type === 'individual' ? 'owner' : 'agency';
        if (data.ownerType !== targetType && data.ownerType !== 'unknown') {
          shouldHide = true;
        }
      }

      if (input.max_price && data.price > input.max_price) {
        shouldHide = true;
      }

      if (input.min_size && data.size < input.min_size) {
        shouldHide = true;
      }

      if (input.min_rooms && data.rooms < input.min_rooms) {
        shouldHide = true;
      }

      if (input.min_energy_rating && data.energyRating) {
        const ratingOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
        const minOrder = ratingOrder[input.min_energy_rating];
        const listingOrder = ratingOrder[data.energyRating];
        if (listingOrder && listingOrder > minOrder) {
          shouldHide = true;
        }
      }

      // Filter by valid energy certification
      if (input.require_energy_cert) {
        // Get cached energy rating
        const cached = listingDetailsCache[data.id];
        const energyRating = cached?.energyRating || data.energyRating;

        // Invalid ratings: null, N/A, N/I, tramite, exento, or anything not A-G
        const validRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        if (!energyRating || !validRatings.includes(energyRating)) {
          shouldHide = true;
        }
      }
    }

    if (shouldHide) {
      listing.style.display = 'none';
      hiddenCount++;
    } else {
      listing.style.display = '';
      shownCount++;
    }
  }

  return { shown: shownCount, hidden: hiddenCount, filters: input };
}

// Ensure descriptions are loaded for smart filtering
async function ensureDescriptionsLoaded(listings) {
  const needFetch = [];

  for (const listing of listings) {
    const data = extractPropertyData(listing);
    if (!data.id) continue;

    const cached = listingDetailsCache[data.id];
    if (!cached?.description) {
      needFetch.push({ id: data.id, listing });
    }
  }

  if (needFetch.length === 0) {
    console.log('[AI] All descriptions already cached');
    return;
  }

  console.log(`[AI] Fetching descriptions for ${needFetch.length} listings for smart filter...`);
  addSystemMessage(`Cargando descripciones para filtro inteligente (${needFetch.length} anuncios)...`);

  const BATCH_SIZE = 2;
  const MIN_DELAY_MS = 800;
  const MAX_DELAY_MS = 1500;

  for (let i = 0; i < needFetch.length; i += BATCH_SIZE) {
    const batch = needFetch.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async ({ id }) => {
      try {
        const details = await toolGetListingDetails({ listing_id: id });
        if (details && !details.error) {
          listingDetailsCache[id] = details;
        }
      } catch (error) {
        console.error(`[AI] Error fetching details for ${id}:`, error);
      }
    }));

    saveDetailsCache();

    if (i + BATCH_SIZE < needFetch.length) {
      const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Remove loading message
  const messages = document.getElementById('ai-messages');
  const systemMsgs = messages?.querySelectorAll('.ai-message-system');
  if (systemMsgs?.length > 0) {
    systemMsgs[systemMsgs.length - 1].remove();
  }

  console.log('[AI] Finished loading descriptions for smart filter');
}

// Tool: Get listing details
async function toolGetListingDetails(input) {
  const { listing_id } = input;
  const detailUrl = `https://www.idealista.com/inmueble/${listing_id}/`;

  try {
    const response = await fetch(detailUrl);
    const html = await response.text();
    return parseDetailPageHTML(html, listing_id);
  } catch (error) {
    return { error: error.message };
  }
}

// Tool: Highlight listings
function toolHighlightListings(input) {
  const { listing_ids, color = '#4CAF50' } = input;

  // Remove existing highlights
  document.querySelectorAll('.idealista-ai-highlight').forEach(el => {
    el.classList.remove('idealista-ai-highlight');
    el.style.boxShadow = '';
  });

  let highlightedCount = 0;
  const listings = findPropertyListings();

  for (const listing of listings) {
    const data = extractPropertyData(listing);
    if (listing_ids.includes(data.id)) {
      listing.classList.add('idealista-ai-highlight');
      listing.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
      highlightedCount++;
    }
  }

  return { highlighted: highlightedCount };
}

// Tool: Open listing
function toolOpenListing(input) {
  const { listing_id } = input;
  const url = `https://www.idealista.com/inmueble/${listing_id}/`;
  window.open(url, '_blank');
  return { opened: listing_id, url };
}

// Tool: Show all listings
function toolShowAllListings() {
  const listings = findPropertyListings();

  for (const listing of listings) {
    listing.style.display = '';
    listing.classList.remove('idealista-ai-highlight');
    listing.style.boxShadow = '';
  }

  // Clear saved filters
  currentFilters = {};
  saveState();

  return { restored: listings.length };
}

// Tool: Get page summary
function toolGetPageSummary() {
  const listings = findPropertyListings();
  const data = listings.map(el => {
    const basicData = extractPropertyData(el);
    // Include cached energy rating if available
    const cached = listingDetailsCache[basicData.id];
    if (cached?.energyRating) {
      basicData.energyRating = cached.energyRating;
    }
    return basicData;
  });

  const prices = data.filter(d => d.price).map(d => d.price);
  const sizes = data.filter(d => d.size).map(d => d.size);

  const byOwnerType = { owner: 0, agency: 0, unknown: 0 };
  const byEnergyRating = {};
  const validRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  let withoutValidEnergyCert = 0;

  for (const d of data) {
    byOwnerType[d.ownerType] = (byOwnerType[d.ownerType] || 0) + 1;
    if (d.energyRating) {
      byEnergyRating[d.energyRating] = (byEnergyRating[d.energyRating] || 0) + 1;
    }
    // Count listings without valid A-G rating
    if (!d.energyRating || !validRatings.includes(d.energyRating)) {
      withoutValidEnergyCert++;
    }
  }

  const visible = listings.filter(l => l.style.display !== 'none').length;

  return {
    total: data.length,
    visible,
    hidden: data.length - visible,
    priceRange: prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    } : null,
    sizeRange: sizes.length > 0 ? {
      min: Math.min(...sizes),
      max: Math.max(...sizes),
      avg: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)
    } : null,
    byOwnerType,
    byEnergyRating,
    withoutValidEnergyCert
  };
}

// Tool: Get pagination info
function toolGetPaginationInfo() {
  const paginationContainer = document.querySelector('.pagination');
  if (!paginationContainer) {
    return { error: 'No pagination found', currentPage: 1, totalPages: 1 };
  }

  // Current page
  const selectedEl = paginationContainer.querySelector('li.selected span');
  const currentPage = selectedEl ? parseInt(selectedEl.textContent) : 1;

  // Get all page numbers
  const pageLinks = paginationContainer.querySelectorAll('li:not(.prev):not(.next)');
  const pages = [];
  pageLinks.forEach(li => {
    const text = li.textContent.trim();
    const num = parseInt(text);
    if (!isNaN(num)) pages.push(num);
  });
  const totalPages = pages.length > 0 ? Math.max(...pages) : 1;

  // Check for prev/next
  const hasPrev = paginationContainer.querySelector('li.prev a') !== null;
  const hasNext = paginationContainer.querySelector('li.next a') !== null;

  return {
    currentPage,
    totalPages,
    hasPreviousPage: hasPrev,
    hasNextPage: hasNext,
    availablePages: pages
  };
}

// Tool: Go to specific page
function toolGoToPage(input) {
  const { page } = input;
  const paginationContainer = document.querySelector('.pagination');

  if (!paginationContainer) {
    return { error: 'No pagination found' };
  }

  // Find the link for the requested page
  const pageLinks = paginationContainer.querySelectorAll('li a');
  for (const link of pageLinks) {
    const text = link.textContent.trim();
    if (parseInt(text) === page) {
      // Save state before navigation
      saveState();
      savePendingNavigation(`User asked to go to page ${page}`);
      window.location.href = link.href;
      return { navigating: true, toPage: page };
    }
  }

  return { error: `Page ${page} not found in pagination` };
}

// Tool: Next page
function toolNextPage() {
  const nextLink = document.querySelector('.pagination li.next a');

  if (!nextLink) {
    return { error: 'No next page available' };
  }

  // Save state before navigation
  saveState();
  savePendingNavigation('User asked to go to next page');
  window.location.href = nextLink.href;
  return { navigating: true, direction: 'next' };
}

// Tool: Previous page
function toolPreviousPage() {
  const prevLink = document.querySelector('.pagination li.prev a');

  if (!prevLink) {
    return { error: 'No previous page available' };
  }

  // Save state before navigation
  saveState();
  savePendingNavigation('User asked to go to previous page');
  window.location.href = prevLink.href;
  return { navigating: true, direction: 'previous' };
}

// Tool: Set search filters (native Idealista filters)
function toolSetSearchFilters(input) {
  console.log('[AI] Setting search filters:', input);

  const appliedFilters = [];
  const url = buildFilterUrl(input, appliedFilters);

  if (!url || appliedFilters.length === 0) {
    return { error: 'No valid filters to apply' };
  }

  // Save state and navigate
  saveState();
  savePendingNavigation(`Applied native filters: ${appliedFilters.join(', ')}`);

  console.log('[AI] Navigating to filtered URL:', url);
  window.location.href = url;

  return { navigating: true, appliedFilters, url };
}

function buildFilterUrl(filters, appliedFilters = []) {
  // Get base path (remove existing filter segments and pagination)
  let basePath = window.location.pathname;

  // Remove pagination
  basePath = basePath.replace(/pagina-\d+\.htm$/, '');
  basePath = basePath.replace(/pagina-\d+\/$/, '');

  // Remove trailing slash for consistent processing
  if (basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }

  // Remove existing "con-" filter segments to start fresh
  const pathParts = basePath.split('/');
  const cleanParts = pathParts.filter(part => !part.startsWith('con-'));
  basePath = cleanParts.join('/');

  // Build URL segments for filters
  const segments = [];

  // Price filters (use URL segments)
  if (filters.min_price && filters.max_price) {
    segments.push(`con-precio-desde_${filters.min_price},precio-hasta_${filters.max_price}`);
    appliedFilters.push(`precio: ${filters.min_price}-${filters.max_price}€`);
  } else if (filters.min_price) {
    segments.push(`con-precio-desde_${filters.min_price}`);
    appliedFilters.push(`precio mín: ${filters.min_price}€`);
  } else if (filters.max_price) {
    segments.push(`con-precio-hasta_${filters.max_price}`);
    appliedFilters.push(`precio máx: ${filters.max_price}€`);
  }

  // Size filters
  if (filters.min_size && filters.max_size) {
    segments.push(`con-metros-cuadrados-mas-de_${filters.min_size},metros-cuadrados-menos-de_${filters.max_size}`);
    appliedFilters.push(`tamaño: ${filters.min_size}-${filters.max_size}m²`);
  } else if (filters.min_size) {
    segments.push(`con-metros-cuadrados-mas-de_${filters.min_size}`);
    appliedFilters.push(`tamaño mín: ${filters.min_size}m²`);
  } else if (filters.max_size) {
    segments.push(`con-metros-cuadrados-menos-de_${filters.max_size}`);
    appliedFilters.push(`tamaño máx: ${filters.max_size}m²`);
  }

  // Room filters
  if (filters.rooms && Array.isArray(filters.rooms)) {
    const roomSegments = {
      0: 'estudios',
      1: 'de-un-dormitorio',
      2: 'de-dos-dormitorios',
      3: 'de-tres-dormitorios',
      4: 'de-cuatro-cinco-habitaciones-o-mas'
    };
    filters.rooms.forEach(room => {
      if (roomSegments[room]) {
        segments.push(`con-${roomSegments[room]}`);
        appliedFilters.push(`${room} hab`);
      }
    });
  }

  // Bathroom filters
  if (filters.bathrooms && Array.isArray(filters.bathrooms)) {
    const bathSegments = {
      1: 'un-bano',
      2: 'dos-banos',
      3: 'tres-banos-o-mas'
    };
    filters.bathrooms.forEach(bath => {
      if (bathSegments[bath]) {
        segments.push(`con-${bathSegments[bath]}`);
        appliedFilters.push(`${bath} baño(s)`);
      }
    });
  }

  // Feature filters mapping to URL segments
  const featureSegments = {
    pets_allowed: 'mascotas',
    air_conditioning: 'aireacondicionado',
    wardrobes: 'armarios-empotrados',
    elevator: 'ascensor',
    terrace: 'terraza',
    balcony: 'balcon',
    parking: 'garaje',
    pool: 'piscina',
    garden: 'jardin',
    storage_room: 'trastero',
    exterior: 'exterior',
    sea_views: 'vistas-al-mar',
    luxury: 'lujo',
    accessible: 'adaptados',
    new_construction: 'obra-nueva',
    good_condition: 'buen-estado',
    to_renovate: 'para-reformar',
    top_floor: 'ultimas-plantas',
    intermediate_floor: 'plantas-intermedias',
    ground_floor: 'solo-bajos',
    only_flats: 'solo-pisos',
    penthouses: 'aticos',
    duplexes: 'duplex',
    chalets: 'chalets'
  };

  const featureLabels = {
    pets_allowed: 'mascotas',
    air_conditioning: 'aire acond.',
    wardrobes: 'armarios',
    elevator: 'ascensor',
    terrace: 'terraza',
    balcony: 'balcón',
    parking: 'garaje',
    pool: 'piscina',
    garden: 'jardín',
    storage_room: 'trastero',
    exterior: 'exterior',
    sea_views: 'vistas mar',
    luxury: 'lujo',
    accessible: 'accesible',
    new_construction: 'obra nueva',
    good_condition: 'buen estado',
    to_renovate: 'a reformar',
    top_floor: 'última planta',
    intermediate_floor: 'planta intermedia',
    ground_floor: 'bajo',
    only_flats: 'solo pisos',
    penthouses: 'áticos',
    duplexes: 'dúplex',
    chalets: 'chalets'
  };

  for (const [key, segment] of Object.entries(featureSegments)) {
    if (filters[key] === true) {
      segments.push(`con-${segment}`);
      appliedFilters.push(featureLabels[key] || key);
    }
  }

  // Furnished/equipped kitchen (special handling)
  if (filters.furnished) {
    segments.push('con-amueblado_amueblados');
    appliedFilters.push('amueblado');
  } else if (filters.equipped_kitchen) {
    segments.push('con-amueblado_solo-cocina-equipada');
    appliedFilters.push('cocina equipada');
  }

  // Rental type
  if (filters.long_term_rental) {
    segments.push('con-alquiler-de-larga-temporada');
    appliedFilters.push('larga temporada');
  }
  if (filters.seasonal_rental) {
    segments.push('con-alquiler-temporal');
    appliedFilters.push('temporal');
  }

  // Multimedia
  if (filters.with_plan) {
    appliedFilters.push('con plano');
  }
  if (filters.virtual_tour) {
    appliedFilters.push('visita virtual');
  }

  // Build final URL
  let finalPath = basePath;
  if (segments.length > 0) {
    // Combine multiple con- segments
    const combinedSegment = segments.join(',').replace(/con-/g, '');
    finalPath = `${basePath}/con-${combinedSegment}`;
  }

  // Add trailing slash
  if (!finalPath.endsWith('/')) {
    finalPath += '/';
  }

  // Handle publication date via query params (more reliable)
  const url = new URL(finalPath, window.location.origin);

  if (filters.published_last_24h) {
    url.searchParams.set('published', 'last24h');
    appliedFilters.push('últimas 24h');
  } else if (filters.published_last_week) {
    url.searchParams.set('published', 'lastWeek');
    appliedFilters.push('última semana');
  } else if (filters.published_last_month) {
    url.searchParams.set('published', 'lastMonth');
    appliedFilters.push('último mes');
  }

  // Multimedia via query params
  if (filters.with_plan) {
    url.searchParams.set('hasFloorplan', 'true');
  }
  if (filters.virtual_tour) {
    url.searchParams.set('hasVirtualTour', 'true');
  }

  return url.toString();
}

// Tool: Get available filters
function toolGetAvailableFilters() {
  const form = document.getElementById('filter-form');
  if (!form) {
    return { error: 'Filter form not found' };
  }

  const filters = {
    price: {
      min: form.querySelector('input[name="adfilter_pricemin"]')?.value || 'default',
      max: form.querySelector('input[name="adfilter_price"]')?.value || 'default'
    },
    size: {
      min: form.querySelector('input[name="adfilter_area"]')?.value || 'default',
      max: form.querySelector('input[name="adfilter_areamax"]')?.value || 'default'
    },
    rooms: [],
    bathrooms: [],
    amenities: {}
  };

  // Get checked rooms
  [0, 1, 2, 3, '4_more'].forEach(room => {
    const checkbox = form.querySelector(`input[name="adfilter_rooms_${room}"]`);
    if (checkbox?.checked) {
      filters.rooms.push(room === '4_more' ? 4 : room);
    }
  });

  // Get checked bathrooms
  [1, 2, 3].forEach(bath => {
    const checkbox = form.querySelector(`input[name="adfilter_baths_${bath}"]`);
    if (checkbox?.checked) {
      filters.bathrooms.push(bath);
    }
  });

  // Get amenities
  const amenities = {
    pets_allowed: 'adfilter_housingpetsallowed',
    air_conditioning: 'adfilter_hasairconditioning',
    elevator: 'adfilter_lift',
    terrace: 'adfilter_hasterrace',
    parking: 'adfilter_parkingspace',
    pool: 'adfilter_swimmingpool',
    garden: 'adfilter_garden',
    exterior: 'adfilter_flatlocation'
  };

  for (const [key, inputName] of Object.entries(amenities)) {
    const checkbox = form.querySelector(`input[name="${inputName}"]`);
    filters.amenities[key] = checkbox?.checked || false;
  }

  console.log('[AI] Current filters:', filters);
  return filters;
}

// Tool: Get all listings with details (for AI filtering)
async function toolGetAllListingsDetails(input = {}) {
  const { include_hidden = false, max_listings = 15 } = input;
  const listings = findPropertyListings();

  // Filter to visible only if requested
  let targetListings = include_hidden
    ? listings
    : listings.filter(l => l.style.display !== 'none');

  // Limit to avoid anti-bot detection
  if (targetListings.length > max_listings) {
    console.log(`[AI] Limiting from ${targetListings.length} to ${max_listings} listings to avoid rate limits`);
    targetListings = targetListings.slice(0, max_listings);
  }

  console.log(`[AI] Fetching details for ${targetListings.length} listings...`);

  // Show progress message
  addSystemMessage(`Analizando ${targetListings.length} anuncios... Esto puede tardar unos segundos.`);

  const results = [];
  // Smaller batch size and longer delays to avoid anti-bot detection
  const BATCH_SIZE = 2;
  const MIN_DELAY_MS = 800;
  const MAX_DELAY_MS = 1500;

  for (let i = 0; i < targetListings.length; i += BATCH_SIZE) {
    const batch = targetListings.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(batch.map(async (listing) => {
      const basicData = extractPropertyData(listing);

      // Check cache first
      if (listingDetailsCache[basicData.id]?.description) {
        console.log(`[AI] Using cached details for ${basicData.id}`);
        return {
          ...basicData,
          ...listingDetailsCache[basicData.id]
        };
      }

      // Fetch details
      try {
        const details = await toolGetListingDetails({ listing_id: basicData.id });
        if (details && !details.error) {
          // Update cache
          listingDetailsCache[basicData.id] = details;
          saveDetailsCache();
          return {
            ...basicData,
            ...details
          };
        }
      } catch (error) {
        console.error(`[AI] Error fetching details for ${basicData.id}:`, error);
      }

      return basicData;
    }));

    results.push(...batchResults);

    // Random delay between batches to appear more human-like
    if (i + BATCH_SIZE < targetListings.length) {
      const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Remove progress message
  const messages = document.getElementById('ai-messages');
  const systemMsgs = messages?.querySelectorAll('.ai-message-system');
  if (systemMsgs?.length > 0) {
    systemMsgs[systemMsgs.length - 1].remove();
  }

  console.log(`[AI] Fetched details for ${results.length} listings`);

  // Return simplified data for Claude to analyze
  return results.map(r => ({
    id: r.id,
    title: r.title,
    price: r.price,
    size: r.size,
    rooms: r.rooms,
    energyRating: r.energyRating,
    ownerType: r.ownerType,
    description: r.description || 'No description available',
    advertiserType: r.advertiserType
  }));
}

// Tool: Execute custom JavaScript on the page (with user approval)
async function toolExecutePageScript(input) {
  const { code, description } = input;

  if (!code) {
    return { error: 'No code provided' };
  }

  console.log('[AI] Requesting script execution:', description);
  console.log('[AI] Code:', code);

  // Show approval dialog to user (non-technical friendly)
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'ai-script-approval-overlay';
    overlay.innerHTML = `
      <div class="ai-script-approval-dialog">
        <h3>🔧 Claude necesita tu permiso</h3>
        <p class="ai-script-description">${escapeHtml(description)}</p>
        <details class="ai-script-code-details">
          <summary>Ver detalles técnicos (opcional)</summary>
          <div class="ai-script-code">
            <pre><code>${escapeHtml(code)}</code></pre>
          </div>
        </details>
        <p class="ai-script-note">Esto permite a Claude acceder a más información de la página para ayudarte mejor.</p>
        <div class="ai-script-buttons">
          <button class="ai-script-approve">✓ Permitir</button>
          <button class="ai-script-deny">✗ No permitir</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const approveBtn = overlay.querySelector('.ai-script-approve');
    const denyBtn = overlay.querySelector('.ai-script-deny');

    approveBtn.addEventListener('click', async () => {
      overlay.remove();
      try {
        // Execute the code
        const result = eval(code);
        // Handle promises
        const finalResult = result instanceof Promise ? await result : result;
        console.log('[AI] Script result:', finalResult);
        resolve({ success: true, result: finalResult });
      } catch (error) {
        console.error('[AI] Script error:', error);
        resolve({ error: error.message });
      }
    });

    denyBtn.addEventListener('click', () => {
      overlay.remove();
      resolve({ denied: true, message: 'User denied script execution' });
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function findPropertyListings() {
  const selectors = [
    'article.item',
    '.item-container',
    '[data-element-id]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }

  return [];
}

function extractPropertyId(listing) {
  const dataId = listing.getAttribute('data-element-id');
  if (dataId) return dataId;

  const link = listing.querySelector('a[href*="/inmueble/"]');
  if (link) {
    const match = link.href.match(/inmueble\/(\d+)/);
    if (match) return match[1];
  }

  return null;
}

function extractPropertyData(listing) {
  const id = extractPropertyId(listing);

  // Price
  const priceEl = listing.querySelector('.item-price');
  const price = parsePrice(priceEl?.textContent);

  // Size and rooms from details
  const detailEl = listing.querySelector('.item-detail');
  const detailText = detailEl?.textContent || '';
  const size = parseSize(detailText);
  const rooms = parseRooms(detailText);

  // Title
  const titleEl = listing.querySelector('.item-link');
  const title = titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || '';

  // URL
  const linkEl = listing.querySelector('a[href*="/inmueble/"]');
  const url = linkEl?.href || '';

  // Energy rating (if visible on listing card)
  let energyRating = null;
  const energyEl = listing.querySelector('[class*="energy"]');
  if (energyEl) {
    const match = energyEl.textContent?.match(/[A-G]/i);
    if (match) energyRating = match[0].toUpperCase();
  }

  // Owner type detection
  let ownerType = 'unknown';
  const linkHref = linkEl?.href || '';

  if (linkHref.includes('/pro/')) {
    ownerType = 'agency';
  } else {
    const images = listing.querySelectorAll('img[src*="idealista.com"]');
    const sources = listing.querySelectorAll('source[srcset*="idealista.com"]');
    const hasProImages = Array.from(images).some(img => img.src.includes('id.pro.')) ||
                         Array.from(sources).some(src => src.srcset.includes('id.pro.'));
    const hasAgencyLogo = listing.querySelector('.logo-branding, [class*="logo"], .item-logo') !== null;

    if (hasProImages || hasAgencyLogo) {
      ownerType = 'agency';
    } else if (linkHref.includes('/inmueble/')) {
      ownerType = 'owner';
    }
  }

  // Photos count
  const photos = listing.querySelectorAll('img').length;

  // Visibility
  const visible = listing.style.display !== 'none';

  return {
    id,
    title,
    price,
    size,
    rooms,
    energyRating,
    ownerType,
    url,
    photos,
    visible
  };
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/[\d.,]+/);
  if (!match) return null;
  return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
}

function parseSize(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*m/);
  return match ? parseInt(match[1]) : null;
}

function parseRooms(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*hab/i);
  return match ? parseInt(match[1]) : null;
}

function parseDetailPageHTML(html, propertyId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Energy rating - look for icon-energy-c-X classes
  let energyConsumption = null;
  let energyEmissions = null;

  const energySpans = doc.querySelectorAll('[class*="icon-energy"]');
  energySpans.forEach(el => {
    // Match icon-energy-c-a through icon-energy-c-g (consumption)
    // or icon-energy-e-a through icon-energy-e-g (emissions)
    const matchConsumption = el.className.match(/icon-energy-c-([a-g])/i);
    const matchEmissions = el.className.match(/icon-energy-e-([a-g])/i);

    if (matchConsumption) {
      energyConsumption = matchConsumption[1].toUpperCase();
    }
    if (matchEmissions) {
      energyEmissions = matchEmissions[1].toUpperCase();
    }
  });

  // Use worse rating
  const ENERGY_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
  let energyRating = energyConsumption || energyEmissions;
  if (energyConsumption && energyEmissions) {
    energyRating = ENERGY_ORDER[energyConsumption] >= ENERGY_ORDER[energyEmissions]
      ? energyConsumption : energyEmissions;
  }

  // Check for special energy statuses in the energy certificate section
  let energyStatus = null;
  const energySection = doc.querySelector('.details-property-feature-two');
  const energyText = energySection?.textContent?.toLowerCase() || '';

  if (energyText.includes('en trámite')) {
    energyStatus = 'tramite';
  } else if (energyText.includes('no indicado')) {
    energyStatus = 'N/I';
  } else if (energyText.includes('exento')) {
    energyStatus = 'exento';
  }

  console.log(`[AI] Parsed energy for ${propertyId}: rating=${energyRating}, status=${energyStatus}, consumption=${energyConsumption}, emissions=${energyEmissions}`);

  // Advertiser info
  const advertiserName = doc.querySelector('.advertiser-name')?.textContent?.trim() ||
                         doc.querySelector('input[name="user-name"]')?.value?.trim() ||
                         doc.querySelector('.about-advertiser-name')?.textContent?.trim();

  const professionalNameEl = doc.querySelector('.professional-name .name');
  const isParticular = professionalNameEl?.textContent?.toLowerCase().includes('particular');
  const advertiserType = isParticular ? 'individual' : 'agency';

  // Description
  const description = doc.querySelector('.comment p, .adCommentsLanguage')?.textContent?.trim();

  // Photos count
  const photos = doc.querySelectorAll('img[src*="idealista.com/pictures"]').length;

  // Price
  const priceEl = doc.querySelector('.info-data-price, .price-value');
  const price = parsePrice(priceEl?.textContent);

  // Size
  const sizeMatch = doc.body.textContent.match(/(\d+)\s*m²/);
  const size = sizeMatch ? parseInt(sizeMatch[1]) : null;

  // Use actual rating if available, otherwise use status
  const finalEnergyRating = energyRating || energyStatus || null;

  return {
    id: propertyId,
    energyRating: finalEnergyRating,
    energyConsumption,
    energyEmissions,
    energyStatus,
    advertiserName,
    advertiserType,
    description: description?.substring(0, 500),
    photos,
    price,
    size
  };
}

// ============================================================================
// STARTUP
// ============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('Idealista AI Assistant: Content script initialized');
