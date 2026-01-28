// Popup script for Idealista Helper
// Handles the extension popup UI and user interactions

console.log('Idealista Helper: Popup script loaded');

// Load data when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatistics();
  await loadSettings();
  setupEventListeners();
});

// Load statistics
async function loadStatistics() {
  try {
    // Get viewed listings count
    const viewedResult = await browser.storage.local.get('viewedListings');
    const viewedListings = viewedResult.viewedListings || {};
    const viewedCount = Object.keys(viewedListings).length;
    document.getElementById('viewedCount').textContent = viewedCount;
    
    // Get price drops count
    const priceResult = await browser.storage.local.get('priceHistory');
    const priceHistory = priceResult.priceHistory || {};
    let priceDropsCount = 0;
    
    for (const history of Object.values(priceHistory)) {
      if (history.length >= 2) {
        const firstPrice = history[0].price;
        const lastPrice = history[history.length - 1].price;
        if (lastPrice < firstPrice) {
          priceDropsCount++;
        }
      }
    }
    
    document.getElementById('priceDropsCount').textContent = priceDropsCount;
    
    // Get red flags count
    const flagsResult = await browser.storage.local.get('redFlags');
    const redFlags = flagsResult.redFlags || {};
    const redFlagsCount = Object.keys(redFlags).length;
    document.getElementById('redFlagsCount').textContent = redFlagsCount;
    
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Load user settings
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get('userPreferences');
    const prefs = result.userPreferences || {};
    
    // Set checkbox states
    if (prefs.filters) {
      document.getElementById('hideViewed').checked = prefs.filters.hideViewedListings || false;
      document.getElementById('showRedFlags').checked = prefs.filters.showRedFlags !== false; // Default true
      
      if (prefs.filters.minEnergyRating) {
        document.getElementById('minEnergyRating').value = prefs.filters.minEnergyRating;
      }
    }
    
    if (prefs.notifications) {
      document.getElementById('enableNotifications').checked = prefs.notifications.enabled !== false; // Default true
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save user settings
async function saveSettings() {
  try {
    const result = await browser.storage.sync.get('userPreferences');
    const prefs = result.userPreferences || {};
    
    // Update preferences
    prefs.filters = prefs.filters || {};
    prefs.filters.hideViewedListings = document.getElementById('hideViewed').checked;
    prefs.filters.showRedFlags = document.getElementById('showRedFlags').checked;
    prefs.filters.minEnergyRating = document.getElementById('minEnergyRating').value;
    
    prefs.notifications = prefs.notifications || {};
    prefs.notifications.enabled = document.getElementById('enableNotifications').checked;
    
    // Save to storage
    await browser.storage.sync.set({ userPreferences: prefs });
    
    console.log('Settings saved');
    showNotification('Settings saved successfully!');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Error saving settings', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save settings on change
  const settingsInputs = [
    'hideViewed',
    'showRedFlags',
    'enableNotifications',
    'minEnergyRating'
  ];
  
  settingsInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', saveSettings);
    }
  });
  
  // Clear history button
  document.getElementById('clearHistory')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all viewed history?')) {
      await clearViewedHistory();
    }
  });
  
  // Export data button
  document.getElementById('exportData')?.addEventListener('click', exportData);
  
  // View docs button
  document.getElementById('viewDocs')?.addEventListener('click', () => {
    browser.tabs.create({
      url: 'https://github.com/paroque28/idealista-firefox-plugin'
    });
  });
}

// Clear viewed history
async function clearViewedHistory() {
  try {
    await browser.storage.local.set({ viewedListings: {} });
    await loadStatistics();
    showNotification('Viewed history cleared!');
  } catch (error) {
    console.error('Error clearing history:', error);
    showNotification('Error clearing history', 'error');
  }
}

// Export all data
async function exportData() {
  try {
    const localData = await browser.storage.local.get(null);
    const syncData = await browser.storage.sync.get(null);
    
    const exportObject = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      local: localData,
      sync: syncData
    };
    
    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `idealista-helper-export-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('Error exporting data', 'error');
  }
}

// Show notification message
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 12px 16px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('Idealista Helper: Popup initialized');
