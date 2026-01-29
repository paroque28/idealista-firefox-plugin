# Idealista AI Assistant

A Firefox extension that adds an AI-powered assistant to Idealista.com, helping you find the perfect flat using Claude.

## Features

- **Chat Sidebar**: Natural language interface to interact with listings
- **Native Filter Integration**: Apply Idealista's built-in filters across ALL pages via natural language
- **AI-Powered Filtering**: Claude reads descriptions and filters by subjective criteria (luminoso, tranquilo, reformado...)
- **Smart Analysis**: Get insights on deals, red flags, and recommendations
- **Visual Highlighting**: Claude can highlight specific listings on the page
- **Energy Badges**: See owner type and energy ratings at a glance
- **Custom Scripts**: Claude can execute JavaScript with your approval for advanced data extraction
- **User Profile**: Save your personal info to generate personalized contact messages
- **Reply Assistant**: Get AI-suggested replies in Idealista's messaging system
- **Memories**: Store persistent information Claude remembers between sessions
- **Property Analysis**: Auto-generated summaries, pros/cons, and draft messages on property pages

## Installation

### Firefox

1. Clone the repository:
   ```bash
   git clone https://github.com/paroque28/idealista-firefox-plugin.git
   ```

2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`

3. Click **"Load Temporary Add-on"**

4. Select the `manifest.json` file from the cloned directory

### Chrome

1. Clone the repository:
   ```bash
   git clone https://github.com/paroque28/idealista-firefox-plugin.git
   ```

2. Rename `manifest-chrome.json` to `manifest.json` (backup the original first)

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable **"Developer mode"** (toggle in top-right)

5. Click **"Load unpacked"**

6. Select the cloned directory

### 2. Get Your Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Add credits in **Settings** → **Billing**
3. Generate an API key in **Settings** → **API Keys**
4. Copy the key (starts with `sk-ant-api03-...`)

### 3. Configure the Extension

1. Click the extension icon in the Firefox toolbar
2. Paste your API key
3. Click **"Save API Key"**

## Usage

1. Navigate to any Idealista search page
2. Click the 🤖 button to open the assistant
3. Chat naturally with Claude

### Example Commands

**Native Filters** (apply to ALL pages - recommended for objective criteria):
```
"Busca pisos de máximo 1200€"
"Quiero mínimo 60m² y 2 habitaciones"
"Filtra por los que admitan mascotas"
"Solo pisos con terraza y aire acondicionado"
"Busca áticos con ascensor"
"Muestra solo los publicados en las últimas 24 horas"
"Pisos exteriores en buen estado"
```

**AI-Powered Filters** (current page only - for subjective criteria):
```
"Busca pisos luminosos"
"Encuentra pisos tranquilos, sin ruido"
"Muestra solo los reformados recientemente"
"Quiero pisos con cocina equipada"
"Busca pisos bien comunicados con metro"
```

**Other Commands**:
```
"Solo particulares" (hide agencies)
"¿Cuál es la mejor opción?"
"Resalta las mejores ofertas"
"Muestra todo" (reset filters)
```

## Filter Strategy

The assistant uses three types of filtering:

| Type | Scope | Best For |
|------|-------|----------|
| **Native Filters** (`set_search_filters`) | ALL pages | Price, size, rooms, bathrooms, amenities, condition, floor level, publication date |
| **Smart Filters** (`filter_listings` with `smart_filter`) | ALL pages* | AI-powered subjective criteria (luminoso, tranquilo, reformado) |
| **Basic Filters** (`filter_listings`) | Current page only | Owner type, energy certificates |

*Smart filters store keywords (not listing IDs), so they're automatically re-applied when you navigate to another page.

### How Smart Filters Work

When you ask for subjective criteria like "pisos luminosos":
1. Claude reads descriptions and identifies relevant keywords (luminoso, luz natural, soleado, etc.)
2. These keywords are stored and used to filter listings on ANY page
3. On page navigation, descriptions are fetched and filtered automatically

Claude automatically chooses the best approach based on your request.

## Tools Available to Claude

| Tool | Description |
|------|-------------|
| `set_search_filters` | Apply native Idealista filters (affects ALL pages) |
| `filter_listings` | Show/hide listings on current page |
| `get_listings` | Get all listings with price, size, rooms, etc. |
| `get_listing_details` | Fetch detailed info from a listing page |
| `get_all_listings_details` | Fetch descriptions for AI filtering (rate-limited) |
| `highlight_listings` | Add visual glow to specific listings |
| `open_listing` | Open a listing in a new tab |
| `show_all_listings` | Reset filters and show everything |
| `get_page_summary` | Get statistics about the current page |
| `execute_page_script` | Run custom JS with user approval |
| Pagination tools | Navigate between pages |

## Anti-Bot Protection

The extension includes safeguards to avoid triggering Idealista's anti-bot detection:
- Rate limiting: Max 15 listings fetched at once by default
- Random delays between requests (800-1500ms)
- Small batch sizes (2 requests at a time)
- Aggressive caching to minimize repeated requests

## User Profile & Memories

### Setting Up Your Profile

1. Click the extension icon in the toolbar
2. Scroll down to **"Tu Perfil"** section
3. Fill in your information:
   - **Name**: Your name for signing messages
   - **Situation**: Your living situation (couple, single, family...)
   - **Income**: Monthly income (helps landlords trust you)
   - **Pets**: Whether you have pets
   - **Preferences**: What you're looking for in a flat
   - **Flexibility**: Entry dates, contract length preferences
4. Click **"Guardar Perfil"**

This information is used to:
- Generate personalized contact messages on property pages
- Suggest appropriate replies in conversations
- Tailor search recommendations

### Memories

Add facts Claude should remember across sessions:
- "I work from home 3 days a week"
- "We have a cat"
- "Maximum commute: 30 minutes to Diagonal"

Memories persist and are included in message generation.

## Conversations Page

When you're on Idealista's messaging page (`/conversations`):

1. A **"Sugerir Respuesta"** widget appears
2. Select a conversation
3. Choose your preferred tone (Professional, Friendly, Formal, Brief)
4. Click **"Generar Respuesta"**
5. Insert directly or copy to clipboard

The assistant reads the conversation history and uses your profile to generate contextually appropriate replies.

## File Structure

```
idealista-firefox-plugin/
├── manifest.json        # Firefox extension config
├── manifest-chrome.json # Chrome extension config
├── content.js           # Chat UI + Claude client + tools
├── content.css          # Sidebar styling
├── background.js        # Firefox background script
├── background-chrome.js # Chrome service worker
├── browser-polyfill.js  # Chrome API compatibility
├── popup.html/js/css    # Settings UI
└── icons/               # Extension icons
```

## Privacy & Security

- Your API key is stored locally in Firefox's sync storage
- API calls go directly from your browser to Anthropic's servers
- No data is sent to any third-party servers
- Script execution requires explicit user approval

## Troubleshooting

### "Please set your Claude API key"
Click the extension icon and add your API key.

### Chat not appearing
Make sure you're on an Idealista search page (URL contains `/alquiler-` or `/venta-`).

### Rate limiting errors
Wait a few seconds and try again. The extension limits requests to avoid detection.

### Filters not working as expected
- Native filters reload the page - this is expected
- Client-side filters only affect the current page
- Use "Muestra todo" to reset all filters

## Development

### Prerequisites
- Firefox 78+
- Anthropic API key

### Local Development
1. Make changes to the source files
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **"Reload"** on the extension
4. Refresh the Idealista page

## Cost Estimation

Uses Claude Sonnet. Typical costs:
- Opening a page: ~500 tokens
- Simple filter: ~1000 tokens
- Complex analysis: ~2000 tokens

Expect a few cents per session at current API pricing.

## License

MIT
