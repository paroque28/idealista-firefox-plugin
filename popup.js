// Popup script for Idealista AI Assistant
// Handles API key management

console.log('Idealista AI Assistant: Popup script loaded');

document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  setupEventListeners();
});

// Load existing API key
async function loadApiKey() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getApiKey' });
    if (response.apiKey) {
      document.getElementById('apiKey').value = response.apiKey;
      showStatus('API key is set', 'success');
    } else {
      showStatus('No API key configured', 'warning');
    }
  } catch (error) {
    console.error('Error loading API key:', error);
    showStatus('Error loading API key', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveKey').addEventListener('click', saveApiKey);

  // Clear button
  document.getElementById('clearKey').addEventListener('click', clearApiKey);

  // Toggle visibility
  document.getElementById('toggleVisibility').addEventListener('click', toggleKeyVisibility);

  // Enter key to save
  document.getElementById('apiKey').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
    }
  });
}

// Save API key
async function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    showStatus('Invalid API key format', 'error');
    return;
  }

  try {
    const response = await browser.runtime.sendMessage({
      action: 'setApiKey',
      apiKey: apiKey
    });

    if (response.success) {
      showStatus('API key saved successfully!', 'success');
    } else {
      showStatus('Error saving API key', 'error');
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    showStatus('Error saving API key', 'error');
  }
}

// Clear API key
async function clearApiKey() {
  try {
    const response = await browser.runtime.sendMessage({
      action: 'setApiKey',
      apiKey: ''
    });

    if (response.success) {
      document.getElementById('apiKey').value = '';
      showStatus('API key cleared', 'warning');
    }
  } catch (error) {
    console.error('Error clearing API key:', error);
    showStatus('Error clearing API key', 'error');
  }
}

// Toggle API key visibility
function toggleKeyVisibility() {
  const input = document.getElementById('apiKey');
  const icon = document.querySelector('.eye-icon');

  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁';
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status status-${type}`;
}

console.log('Idealista AI Assistant: Popup initialized');
