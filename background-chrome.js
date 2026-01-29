// Background service worker for Idealista AI Assistant (Chrome)
// Handles API key, profile, and memories management

console.log('Idealista AI Assistant: Background service worker loaded');

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    initializeExtension();
  }
});

// Initialize extension on first install
async function initializeExtension() {
  console.log('Initializing extension...');

  try {
    const existing = await chrome.storage.sync.get('claudeApiKey');
    if (!existing.claudeApiKey) {
      await chrome.storage.sync.set({ claudeApiKey: '' });
    }
  } catch (error) {
    console.error('Error initializing:', error);
  }

  console.log('Extension initialized');
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);

  // Handle async operations
  handleMessage(message).then(sendResponse);

  // Return true to indicate async response
  return true;
});

async function handleMessage(message) {
  switch (message.action) {
    case 'getApiKey':
      return handleGetApiKey();

    case 'setApiKey':
      return handleSetApiKey(message.apiKey);

    case 'checkApiKey':
      return handleCheckApiKey();

    case 'getProfile':
      return handleGetProfile();

    case 'setProfile':
      return handleSetProfile(message.profile);

    case 'getMemories':
      return handleGetMemories();

    case 'setMemories':
      return handleSetMemories(message.memories);

    default:
      console.warn('Unknown action:', message.action);
      return { error: 'Unknown action' };
  }
}

// Get API key
async function handleGetApiKey() {
  try {
    const result = await chrome.storage.sync.get('claudeApiKey');
    return { apiKey: result.claudeApiKey || '' };
  } catch (error) {
    console.error('Error getting API key:', error);
    return { error: error.message };
  }
}

// Save API key
async function handleSetApiKey(apiKey) {
  try {
    await chrome.storage.sync.set({ claudeApiKey: apiKey });
    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { error: error.message };
  }
}

// Check if API key is set
async function handleCheckApiKey() {
  try {
    const result = await chrome.storage.sync.get('claudeApiKey');
    const hasKey = !!(result.claudeApiKey && result.claudeApiKey.trim());
    return { hasKey };
  } catch (error) {
    console.error('Error checking API key:', error);
    return { error: error.message };
  }
}

// Get user profile
async function handleGetProfile() {
  try {
    const result = await chrome.storage.sync.get('userProfile');
    return { profile: result.userProfile || {} };
  } catch (error) {
    console.error('Error getting profile:', error);
    return { error: error.message };
  }
}

// Save user profile
async function handleSetProfile(profile) {
  try {
    await chrome.storage.sync.set({ userProfile: profile });
    return { success: true };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { error: error.message };
  }
}

// Get memories
async function handleGetMemories() {
  try {
    const result = await chrome.storage.sync.get('userMemories');
    return { memories: result.userMemories || [] };
  } catch (error) {
    console.error('Error getting memories:', error);
    return { error: error.message };
  }
}

// Save memories
async function handleSetMemories(memories) {
  try {
    await chrome.storage.sync.set({ userMemories: memories });
    return { success: true };
  } catch (error) {
    console.error('Error saving memories:', error);
    return { error: error.message };
  }
}

console.log('Idealista AI Assistant: Background service worker initialized');
