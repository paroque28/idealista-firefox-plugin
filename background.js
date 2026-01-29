// Background script for Idealista AI Assistant
// Simplified to handle API key management only

console.log('Idealista AI Assistant: Background script loaded');

// Listen for extension installation/update
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    initializeExtension();
  }
});

// Initialize extension on first install
async function initializeExtension() {
  console.log('Initializing extension...');

  // Set default state (no API key)
  const existing = await browser.storage.sync.get('claudeApiKey');
  if (!existing.claudeApiKey) {
    await browser.storage.sync.set({ claudeApiKey: '' });
  }

  console.log('Extension initialized');
}

// Handle messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);

  switch (message.action) {
    case 'getApiKey':
      handleGetApiKey(sendResponse);
      return true;

    case 'setApiKey':
      handleSetApiKey(message.apiKey, sendResponse);
      return true;

    case 'checkApiKey':
      handleCheckApiKey(sendResponse);
      return true;

    default:
      console.warn('Unknown action:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
});

// Get API key
async function handleGetApiKey(sendResponse) {
  try {
    const result = await browser.storage.sync.get('claudeApiKey');
    sendResponse({ apiKey: result.claudeApiKey || '' });
  } catch (error) {
    console.error('Error getting API key:', error);
    sendResponse({ error: error.message });
  }
}

// Save API key
async function handleSetApiKey(apiKey, sendResponse) {
  try {
    await browser.storage.sync.set({ claudeApiKey: apiKey });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving API key:', error);
    sendResponse({ error: error.message });
  }
}

// Check if API key is set
async function handleCheckApiKey(sendResponse) {
  try {
    const result = await browser.storage.sync.get('claudeApiKey');
    const hasKey = !!(result.claudeApiKey && result.claudeApiKey.trim());
    sendResponse({ hasKey });
  } catch (error) {
    console.error('Error checking API key:', error);
    sendResponse({ error: error.message });
  }
}

console.log('Idealista AI Assistant: Background script initialized');
