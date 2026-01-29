# Idealista AI Assistant

A Firefox/Chrome extension that adds an AI-powered assistant to Idealista.com, helping you find and rent the perfect flat using Claude.

## Features

### Search Pages
- **Chat Sidebar**: Natural language interface to interact with listings
- **Native Filter Integration**: Apply Idealista's built-in filters across ALL pages via natural language
- **AI-Powered Filtering**: Claude reads descriptions and filters by subjective criteria (luminoso, tranquilo, reformado...)
- **Smart Analysis**: Get insights on deals, red flags, and recommendations
- **Visual Highlighting**: Claude can highlight specific listings on the page
- **Energy Badges**: See owner type and energy ratings at a glance

### Property Detail Pages
- **Auto-Analysis**: Summary, pros/cons generated automatically
- **Draft Contact Messages**: Personalized messages based on your profile
- **One-Click Copy**: Insert draft into contact form instantly

### Conversations Page
- **Reply Assistant**: AI-suggested replies for landlord messages
- **Two-Pass Generation**: First generates, then humanizes to avoid AI-sounding text
- **Context-Aware**: Fetches original listing to understand duration, conditions, requirements
- **Spanish Market Rules**: Understands temporal vs long-term rental regulations

### Profile & Personalization
- **User Profile**: Save your info for personalized messages
- **Temporal Reason**: Specific field for demonstrable temporary rental reasons
- **Market Context**: Customizable rules for Spanish/Catalan rental market
- **Memories**: Persistent facts Claude remembers between sessions

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

### Get Your Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Add credits in **Settings** → **Billing**
3. Generate an API key in **Settings** → **API Keys**
4. Copy the key (starts with `sk-ant-api03-...`)

### Configure the Extension

1. Click the extension icon in the toolbar
2. Paste your API key
3. Click **"Save API Key"**

## Usage

### Search Pages

1. Navigate to any Idealista search page
2. Click the 🤖 button to open the assistant
3. Chat naturally with Claude

**Example Commands:**

```
"Busca pisos de máximo 1200€"
"Quiero mínimo 60m² y 2 habitaciones"
"Solo pisos con terraza y aire acondicionado"
"Busca pisos luminosos"
"Encuentra pisos tranquilos"
"Solo particulares"
"¿Cuál es la mejor opción?"
```

### Property Detail Pages

When you open a listing (`/inmueble/...`), a widget appears automatically with:
- Summary of the property
- Pros and cons
- Draft contact message using your profile

Click **"Copiar al formulario"** to insert the message.

### Conversations Page

When you're on `/conversations`:

1. A **"Sugerir Respuesta"** widget appears (bottom-right)
2. Select a conversation - the widget shows detected rental type:
   - 📅 **TEMPORAL** (yellow) - will require specific reason
   - 🏠 **LARGA ESTANCIA** (green) - will emphasize stability
3. Choose your preferred tone
4. Click **"Generar Respuesta Persuasiva"**
5. Review and insert

**The assistant:**
- Fetches the original listing to understand duration/conditions
- Reads the conversation history
- Doesn't repeat info the landlord already has
- Doesn't invent false information
- Generates human-sounding responses (two-pass system)

## User Profile Setup

Click the extension icon and scroll to **"Tu Perfil"**:

| Field | Description | Example |
|-------|-------------|---------|
| **Nombre** | Your name for signing | "Pablo y María" |
| **Situación** | Living/work situation | "Pareja, trabajamos remoto en tech" |
| **Ingresos** | Monthly income | "5.000€ netos" |
| **Mascotas** | Pet status | "No tenemos mascotas" |
| **Preferencias** | What you're looking for | "Piso luminoso, cerca del metro" |
| **Flexibilidad fechas** | Entry date flexibility | "Podemos entrar en febrero o marzo" |
| **Razón temporal** | ONLY if you have a real reason | "Proyecto de 6 meses en Barcelona" |
| **Notas** | Other relevant info | Any other details |

### Market Context (Important for Spain/Catalunya)

Click **"Cargar contexto España/Catalunya"** to load default rules:

- **Okupa fears**: Messages emphasize solvency, stability, references
- **Temporal rentals**: Requires demonstrable reasons (work project, studies, medical)
- **Long-term rentals**: Emphasizes wanting a stable home
- **Never mixes signals**: Won't say "temporal or long-term, whatever"

You can customize this text to match your specific situation.

### Razón Temporal

**Only fill this if you have a REAL, demonstrable reason:**
- "Proyecto laboral de 6 meses"
- "Máster en UPC de 10 meses"
- "Tratamiento médico temporal"
- "Reforma en mi vivienda habitual"

**Leave empty if you don't have one.** The assistant will use vague but honest language like "establishing in the city for a while" instead of inventing fake projects.

## How Reply Generation Works

1. **Fetch Property**: Loads the original listing page to get full description, duration, conditions
2. **Detect Rental Type**: Analyzes text for temporal (3-9 months, flexible stay) or long-term indicators
3. **First Pass**: Generates initial draft following all rules
4. **Second Pass**: Reviews for:
   - AI-sounding phrases ("estaría encantado", "documentación lista")
   - Invented information (fake projects, durations)
   - Unnecessary repetition of already-shared info
   - Excessive length
5. **Humanizes**: Rewrites to sound like a real person

## Filter Strategy

| Type | Scope | Best For |
|------|-------|----------|
| **Native Filters** | ALL pages | Price, size, rooms, amenities, condition |
| **Smart Filters** | ALL pages* | AI subjective criteria (luminoso, tranquilo) |
| **Basic Filters** | Current page | Owner type, energy certificates |

*Smart filters store keywords, automatically re-applied on navigation.

## File Structure

```
idealista-firefox-plugin/
├── manifest.json          # Firefox extension config
├── manifest-chrome.json   # Chrome extension config (Manifest V3)
├── content.js             # Main logic: chat, tools, conversations
├── content.css            # All styling
├── background.js          # Firefox background script
├── background-chrome.js   # Chrome service worker
├── browser-polyfill.js    # Chrome API compatibility layer
├── popup.html             # Settings popup UI
├── popup.js               # Settings logic
├── popup.css              # Settings styling
└── icons/                 # Extension icons
```

## Privacy & Security

- API key stored locally in browser sync storage
- API calls go directly to Anthropic (no middleman)
- No data sent to third-party servers
- Property data cached locally to minimize requests
- Script execution requires explicit approval

## Anti-Bot Protection

- Rate limiting: Max 15 listings fetched at once
- Random delays: 800-1500ms between requests
- Small batches: 2 requests at a time
- Aggressive caching to avoid repeated fetches

## Troubleshooting

### "Please set your Claude API key"
Click extension icon → paste API key → Save

### Chat not appearing
Must be on Idealista search page (`/alquiler-*` or `/venta-*`)

### Reply widget not appearing
Must be on conversations page (`/conversations`)

### Responses sound too formal/AI-like
The two-pass system should handle this. If persists, adjust the market context in settings.

### Wrong rental type detected
Check console logs (F12) for `[AI] Tipo de alquiler detectado:` to see what was detected and why.

## Development

### Debug Logging

Open browser console (F12) to see detailed logs:
```
[AI] GENERANDO RESPUESTA - DEBUG INFO:
[AI] Tipo de alquiler detectado: temporal
[AI] Duración encontrada: 3 to 9 months
[AI] Descripción del piso: ...
[AI] Primera iteración (borrador): ...
[AI] Segunda iteración (humanizado): ...
```

### Local Development
1. Make changes to source files
2. Firefox: `about:debugging` → Reload
3. Chrome: `chrome://extensions` → Reload
4. Refresh Idealista page

## Cost Estimation

Uses Claude Sonnet. Typical costs:
- Opening search page: ~500 tokens
- Simple filter: ~1,000 tokens
- Reply generation (2 passes): ~2,000 tokens
- Property analysis: ~1,500 tokens

Expect a few cents per session.

## License

MIT
