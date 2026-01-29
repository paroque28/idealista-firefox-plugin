// Popup script for Idealista AI Assistant
// Handles API key management

console.log('Idealista AI Assistant: Popup script loaded');

document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  await loadProfile();
  await loadMemories();
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

  // Profile and memories listeners
  setupProfileListeners();
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
function showStatus(message, type, elementId = 'status') {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
  }
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

async function loadProfile() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getProfile' });
    const profile = response.profile || {};

    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileSituation').value = profile.situation || '';
    document.getElementById('profileIncome').value = profile.income || '';
    document.getElementById('profilePets').value = profile.pets || '';
    document.getElementById('profilePreferences').value = profile.preferences || '';
    document.getElementById('profileFlexibility').value = profile.flexibility || '';
    document.getElementById('profileNotes').value = profile.notes || '';
    document.getElementById('profileMarketContext').value = profile.marketContext || '';

    if (profile.name) {
      showStatus('Perfil cargado', 'success', 'profileStatus');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function saveProfile() {
  const profile = {
    name: document.getElementById('profileName').value.trim(),
    situation: document.getElementById('profileSituation').value.trim(),
    income: document.getElementById('profileIncome').value.trim(),
    pets: document.getElementById('profilePets').value.trim(),
    preferences: document.getElementById('profilePreferences').value.trim(),
    flexibility: document.getElementById('profileFlexibility').value.trim(),
    notes: document.getElementById('profileNotes').value.trim(),
    marketContext: document.getElementById('profileMarketContext').value.trim()
  };

  try {
    const response = await browser.runtime.sendMessage({
      action: 'setProfile',
      profile: profile
    });

    if (response.success) {
      showStatus('Perfil guardado', 'success', 'profileStatus');
      setTimeout(() => showStatus('', 'success', 'profileStatus'), 2000);
    } else {
      showStatus('Error guardando perfil', 'error', 'profileStatus');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    showStatus('Error guardando perfil', 'error', 'profileStatus');
  }
}

// ============================================================================
// MEMORIES MANAGEMENT
// ============================================================================

let memories = [];

async function loadMemories() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getMemories' });
    memories = response.memories || [];
    renderMemories();
  } catch (error) {
    console.error('Error loading memories:', error);
  }
}

function renderMemories() {
  const container = document.getElementById('memoriesList');
  if (!container) return;

  if (memories.length === 0) {
    container.innerHTML = '<p class="no-memories">No hay memorias guardadas</p>';
    return;
  }

  container.innerHTML = memories.map((memory, index) => `
    <div class="memory-item">
      <span class="memory-text">${escapeHtml(memory)}</span>
      <button class="memory-delete" data-index="${index}" title="Eliminar">×</button>
    </div>
  `).join('');

  // Add delete handlers
  container.querySelectorAll('.memory-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      await deleteMemory(index);
    });
  });
}

async function addMemory() {
  const input = document.getElementById('newMemory');
  const text = input.value.trim();

  if (!text) return;

  memories.push(text);
  input.value = '';

  try {
    await browser.runtime.sendMessage({
      action: 'setMemories',
      memories: memories
    });
    renderMemories();
  } catch (error) {
    console.error('Error saving memory:', error);
    memories.pop(); // Rollback
  }
}

async function deleteMemory(index) {
  const removed = memories.splice(index, 1);

  try {
    await browser.runtime.sendMessage({
      action: 'setMemories',
      memories: memories
    });
    renderMemories();
  } catch (error) {
    console.error('Error deleting memory:', error);
    memories.splice(index, 0, removed[0]); // Rollback
    renderMemories();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Default market context for Spain/Catalunya
const DEFAULT_MARKET_CONTEXT = `CONTEXTO DEL MERCADO ESPAÑOL (especialmente Catalunya):

1. MIEDO A OKUPAS: Los propietarios tienen MUCHO miedo a inquilinos problemáticos. Debes transmitir:
   - Solvencia económica demostrable (nóminas, contrato)
   - Estabilidad laboral (trabajo fijo, antigüedad)
   - Referencias de anteriores propietarios si las tienes
   - Que eres persona seria y responsable

2. REGULACIONES DE PRECIOS: El Ayuntamiento tiene restricciones de precios en larga estancia, por eso muchos prefieren temporal.

3. ALQUILERES TEMPORALES - REGLAS MUY ESTRICTAS:
   - Solo se permiten por razones DEMOSTRABLES ante el Ayuntamiento
   - Razones válidas: proyecto laboral temporal, estudios, tratamiento médico, obra en vivienda habitual
   - NUNCA digas que quieres quedarte más tiempo o que "ya verás"
   - SIEMPRE da fechas concretas y motivo específico
   - Las agencias los prefieren por la comisión pero necesitan justificación legal

4. ALQUILERES LARGA ESTANCIA:
   - Enfatiza estabilidad y que buscas hogar permanente
   - Menciona arraigo: trabajo fijo, vida establecida, planes de quedarte años
   - NUNCA menciones que podría ser temporal

5. REGLA DE ORO: NUNCA mezcles señales de temporal y larga estancia. Si es temporal, da razón demostrable. Si es larga estancia, transmite permanencia.`;

function loadDefaultMarketContext() {
  const textarea = document.getElementById('profileMarketContext');
  if (textarea) {
    textarea.value = DEFAULT_MARKET_CONTEXT;
    showStatus('Contexto cargado - recuerda guardar', 'warning', 'profileStatus');
  }
}

// Setup additional event listeners for profile and memories
function setupProfileListeners() {
  document.getElementById('saveProfile')?.addEventListener('click', saveProfile);
  document.getElementById('loadDefaultContext')?.addEventListener('click', loadDefaultMarketContext);
  document.getElementById('addMemory')?.addEventListener('click', addMemory);
  document.getElementById('newMemory')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addMemory();
    }
  });
}

console.log('Idealista AI Assistant: Popup initialized');
