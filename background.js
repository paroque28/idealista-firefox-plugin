// Background script for Idealista Helper
// This script runs in the background and handles:
// - Extension lifecycle events
// - Message passing between content scripts and popup
// - API calls to AI services
// - Data synchronization
// - Periodic tasks (price checking, notifications)

console.log('Idealista Helper: Background script loaded');

// Listen for extension installation/update
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Updated from version:', details.previousVersion);
  }
});

// Initialize extension on first install
async function initializeExtension() {
  console.log('Initializing extension...');
  
  // Set default preferences
  const defaultPreferences = {
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
      priceDrops: true
    },
    display: {
      darkMode: false,
      compactView: false,
      showPriceHistory: true
    }
  };
  
  await browser.storage.sync.set({ userPreferences: defaultPreferences });
  console.log('Default preferences set');
  
  // Open welcome page
  browser.tabs.create({
    url: 'https://github.com/paroque28/idealista-firefox-plugin'
  });
}

// Handle messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action, 'from:', sender.tab ? 'content script' : 'popup');
  
  switch (message.action) {
    case 'getPreferences':
      handleGetPreferences(sendResponse);
      return true; // Keep channel open for async response
      
    case 'savePreferences':
      handleSavePreferences(message.data, sendResponse);
      return true;
      
    case 'checkPriceHistory':
      handleCheckPriceHistory(message.propertyId, sendResponse);
      return true;
      
    case 'aiRequest':
      handleAIRequest(message.data, sendResponse);
      return true;
      
    case 'detectRedFlags':
      handleDetectRedFlags(message.data, sendResponse);
      return true;
      
    default:
      console.warn('Unknown action:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
});

// Get user preferences
async function handleGetPreferences(sendResponse) {
  try {
    const result = await browser.storage.sync.get('userPreferences');
    sendResponse({ data: result.userPreferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    sendResponse({ error: error.message });
  }
}

// Save user preferences
async function handleSavePreferences(data, sendResponse) {
  try {
    await browser.storage.sync.set({ userPreferences: data });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving preferences:', error);
    sendResponse({ error: error.message });
  }
}

// Check price history for a property
async function handleCheckPriceHistory(propertyId, sendResponse) {
  try {
    const result = await browser.storage.local.get('priceHistory');
    const priceHistory = result.priceHistory || {};
    const history = priceHistory[`property_${propertyId}`] || [];
    
    sendResponse({ data: history });
  } catch (error) {
    console.error('Error checking price history:', error);
    sendResponse({ error: error.message });
  }
}

// Handle AI requests (placeholder for future implementation)
async function handleAIRequest(data, sendResponse) {
  try {
    // TODO: Implement AI integration
    console.log('AI request:', data);
    
    // Placeholder response
    sendResponse({
      data: {
        message: 'AI integration not yet implemented',
        suggestion: 'See INFORMATION_NEEDED.md for AI provider selection'
      }
    });
  } catch (error) {
    console.error('Error in AI request:', error);
    sendResponse({ error: error.message });
  }
}

// Detect red flags in property data
async function handleDetectRedFlags(propertyData, sendResponse) {
  try {
    const flags = [];
    
    // TODO: Implement red flag detection logic
    // Example checks:
    
    // 1. Check for suspiciously low price
    if (propertyData.price && propertyData.price < 500) {
      flags.push({
        type: 'suspicious_price',
        severity: 'high',
        message: 'Price seems unusually low'
      });
    }
    
    // 2. Check for missing energy rating
    if (!propertyData.energyRating) {
      flags.push({
        type: 'missing_info',
        severity: 'medium',
        message: 'No energy rating provided'
      });
    }
    
    // 3. Check for missing photos
    if (!propertyData.photos || propertyData.photos.length === 0) {
      flags.push({
        type: 'missing_photos',
        severity: 'high',
        message: 'No photos available'
      });
    }
    
    sendResponse({ data: flags });
  } catch (error) {
    console.error('Error detecting red flags:', error);
    sendResponse({ error: error.message });
  }
}

// Periodic tasks (run every hour)
browser.alarms.create('periodicTasks', { periodInMinutes: 60 });

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTasks') {
    runPeriodicTasks();
  }
});

async function runPeriodicTasks() {
  console.log('Running periodic tasks...');
  
  // TODO: Implement periodic tasks
  // - Check for price drops on tracked properties
  // - Check for new listings matching saved searches
  // - Clean up old data
  
  console.log('Periodic tasks completed');
}

// Handle browser action (toolbar icon) clicks
browser.browserAction.onClicked.addListener((tab) => {
  console.log('Browser action clicked on tab:', tab.id);
  // Popup will handle this, but we can add additional logic here if needed
});

console.log('Idealista Helper: Background script initialized');
