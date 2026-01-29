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
When asked to filter or find properties, use your tools to manipulate the page.
Explain what you're doing and why in a helpful, concise way.

Be proactive about pointing out:
- Good deals (low price per m²)
- Red flags (suspiciously low prices, missing info, few photos)
- Properties that match their criteria well

You can navigate between pages using the pagination tools. The user might ask you to search across multiple pages.

Keep responses concise - users are browsing, not reading essays.
Use Spanish for responses since this is a Spanish website, but understand English too.

Important notes:
- Prices are in EUR (€)
- Sizes are in square meters (m²)
- Energy ratings go from A (best) to G (worst)
- "Particular" means individual owner, "Agencia" means real estate agency`;

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
    description: 'Show or hide listings based on criteria. Hidden listings are not deleted, just hidden from view. Filters are saved and persist across page navigation.',
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
        listing_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Show only these specific listing IDs (hide all others)'
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
    const state = {
      chatMessages,
      currentFilters,
      sidebarVisible,
      savedAt: Date.now()
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

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
    if (sidebarVisible) {
      toggleSidebar();
    }
  }

  // Add energy badges to all listings
  addEnergyBadgesToListings();

  // Apply saved filters
  if (Object.keys(currentFilters).length > 0) {
    applyFilters(currentFilters);
  }

  // Send proactive greeting only if no history
  if (!hasState || chatMessages.length === 0) {
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

function addEnergyBadgesToListings() {
  const listings = findPropertyListings();

  for (const listing of listings) {
    addEnergyBadge(listing);
  }
}

function addEnergyBadge(listing) {
  // Skip if badge already exists
  if (listing.querySelector('.idealista-ai-badge')) return;

  const data = extractPropertyData(listing);

  // Ensure relative positioning for badge placement
  listing.style.position = 'relative';

  const badge = document.createElement('div');
  badge.className = 'idealista-ai-badge';

  // Owner type
  const ownerIcon = data.ownerType === 'owner' ? '👤' : data.ownerType === 'agency' ? '🏢' : '❓';
  const ownerLabel = data.ownerType === 'owner' ? 'Particular' : data.ownerType === 'agency' ? 'Agencia' : 'Desconocido';

  // Energy rating colors
  const energyColors = {
    'A': '#00a651', 'B': '#50b848', 'C': '#bdd62e',
    'D': '#fff200', 'E': '#fdb913', 'F': '#f37021', 'G': '#ed1c24'
  };
  const energyColor = energyColors[data.energyRating] || '#999';
  const energyLabel = data.energyRating || 'N/A';

  badge.innerHTML = `
    <span class="badge-owner">${ownerIcon} ${ownerLabel}</span>
    <span class="badge-energy" style="background: ${energyColor}">⚡${energyLabel}</span>
  `;

  listing.appendChild(badge);
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
    // Refresh badges
    document.querySelectorAll('.idealista-ai-badge').forEach(b => b.remove());
    addEnergyBadgesToListings();
  }
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
  const greetingPrompt = `The user just loaded an Idealista search page. Here's what's on the page: ${JSON.stringify(summary)}. Pagination info: ${JSON.stringify(pagination)}. Give a brief, friendly greeting summarizing what you see and offer to help. Keep it to 2-3 sentences.`;

  await processWithClaude(greetingPrompt, true);
}

async function processWithClaude(userMessage, isSystem = false) {
  isProcessing = true;
  showTypingIndicator();

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

    // Call Claude API with tools
    let response = await callClaudeAPI(messages);

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log('Executing tool:', toolUse.name, toolUse.input);
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

    if (assistantMessage) {
      addMessage('assistant', assistantMessage);
    }

  } catch (error) {
    console.error('Error processing with Claude:', error);
    addSystemMessage(`Error: ${error.message}`);
  } finally {
    isProcessing = false;
    hideTypingIndicator();
  }
}

async function callClaudeAPI(messages) {
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

  if (!response.ok) {
    const errorData = await response.json();
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

  return await response.json();
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function executeToolCall(toolName, input) {
  switch (toolName) {
    case 'get_listings':
      return toolGetListings();
    case 'filter_listings':
      return toolFilterListings(input);
    case 'get_listing_details':
      return await toolGetListingDetails(input);
    case 'highlight_listings':
      return toolHighlightListings(input);
    case 'open_listing':
      return toolOpenListing(input);
    case 'show_all_listings':
      return toolShowAllListings();
    case 'get_page_summary':
      return toolGetPageSummary();
    case 'get_pagination_info':
      return toolGetPaginationInfo();
    case 'go_to_page':
      return toolGoToPage(input);
    case 'next_page':
      return toolNextPage();
    case 'previous_page':
      return toolPreviousPage();
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// Tool: Get all listings
function toolGetListings() {
  const listings = findPropertyListings();
  return listings.map(el => extractPropertyData(el));
}

// Tool: Filter listings
function toolFilterListings(input) {
  // Save filters for persistence
  currentFilters = { ...currentFilters, ...input };
  saveState();

  return applyFilters(input);
}

function applyFilters(input) {
  const listings = findPropertyListings();
  let hiddenCount = 0;
  let shownCount = 0;

  for (const listing of listings) {
    const data = extractPropertyData(listing);
    let shouldHide = false;

    // Filter by specific IDs
    if (input.listing_ids && input.listing_ids.length > 0) {
      shouldHide = !input.listing_ids.includes(data.id);
    } else {
      // Apply other filters
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
  const data = listings.map(el => extractPropertyData(el));

  const prices = data.filter(d => d.price).map(d => d.price);
  const sizes = data.filter(d => d.size).map(d => d.size);

  const byOwnerType = { owner: 0, agency: 0, unknown: 0 };
  const byEnergyRating = {};

  for (const d of data) {
    byOwnerType[d.ownerType] = (byOwnerType[d.ownerType] || 0) + 1;
    if (d.energyRating) {
      byEnergyRating[d.energyRating] = (byEnergyRating[d.energyRating] || 0) + 1;
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
    byEnergyRating
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
  window.location.href = prevLink.href;
  return { navigating: true, direction: 'previous' };
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

  // Energy rating
  let energyConsumption = null;
  let energyEmissions = null;

  const energySpans = doc.querySelectorAll('[class*="icon-energy-c-"]');
  energySpans.forEach(el => {
    const match = el.className.match(/icon-energy-c-([a-g])/i);
    if (match) {
      if (!energyConsumption) energyConsumption = match[1].toUpperCase();
      else if (!energyEmissions) energyEmissions = match[1].toUpperCase();
    }
  });

  // Use worse rating
  const ENERGY_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7 };
  let energyRating = energyConsumption;
  if (energyConsumption && energyEmissions) {
    energyRating = ENERGY_ORDER[energyConsumption] >= ENERGY_ORDER[energyEmissions]
      ? energyConsumption : energyEmissions;
  }

  // Check for special energy statuses
  let energyStatus = null;
  const energyText = doc.querySelector('.details-property_features')?.textContent || '';
  if (energyText.toLowerCase().includes('en trámite')) energyStatus = 'pending';
  else if (energyText.toLowerCase().includes('no indicado')) energyStatus = 'not_indicated';
  else if (energyText.toLowerCase().includes('exento')) energyStatus = 'exempt';

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

  return {
    id: propertyId,
    energyRating: energyRating || energyStatus,
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
