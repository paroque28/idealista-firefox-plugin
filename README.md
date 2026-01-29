# Idealista AI Assistant

A Firefox extension that adds an AI-powered assistant to Idealista.com, helping you find the perfect flat using Claude.

## Features

- **Chat Sidebar**: Natural language interface to interact with listings
- **Smart Filtering**: Ask Claude to filter by price, size, rooms, energy rating, or owner type
- **Listing Analysis**: Get insights on deals, red flags, and recommendations
- **Visual Highlighting**: Claude can highlight specific listings on the page
- **Detailed Info**: Fetch energy ratings and advertiser details from listing pages

## Screenshot

```
┌────────────────────────────────────────────────────────────┐
│                    Idealista Page                          │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │    Listings Grid        │  │   Chat Sidebar         │  │
│  │                         │  │                        │  │
│  │  [Listing 1] [✓]        │  │  Claude: Found 30      │  │
│  │  [Listing 2]            │  │  listings. 5 from      │  │
│  │  [Listing 3] [hidden]   │  │  individuals...        │  │
│  │                         │  │                        │  │
│  │                         │  │  [User input...]       │  │
│  └─────────────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Installation

### 1. Install the Extension

1. Clone the repository:
   ```bash
   git clone https://github.com/paroque28/idealista-firefox-plugin.git
   ```

2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`

3. Click **"Load Temporary Add-on"**

4. Select the `manifest.json` file from the cloned directory

### 2. Get Your Claude API Key

1. **Create an Anthropic Account**
   - Go to [console.anthropic.com](https://console.anthropic.com/)
   - Sign up with email or Google
   - Verify your email address

2. **Add Credits**
   - Navigate to **Settings** → **Billing**
   - Add a payment method
   - Purchase credits (API is pay-as-you-go)
   - Cost: ~$3 per million input tokens, ~$15 per million output tokens

3. **Generate an API Key**
   - Go to **Settings** → **API Keys**
   - Click **"Create Key"**
   - Name it (e.g., "Idealista Extension")
   - **Copy the key** - it starts with `sk-ant-api03-...`
   - ⚠️ Save it somewhere safe - you won't see it again!

### 3. Configure the Extension

1. Click the extension icon in the Firefox toolbar
2. Paste your API key in the input field
3. Click **"Save API Key"**
4. You should see "API key saved successfully!"

## Usage

1. **Navigate to Idealista**
   - Go to any search page, e.g., [idealista.com/alquiler-viviendas/madrid/](https://www.idealista.com/alquiler-viviendas/madrid/)

2. **Open the Assistant**
   - Click the 🤖 button in the bottom-right corner
   - The chat sidebar will slide in

3. **Start Chatting**
   - Claude will greet you with a summary of the listings
   - Ask questions or give commands in natural language

### Example Commands

```
"Show only apartments from individuals"
"Hide everything over 1500€"
"What's the cheapest option?"
"Which listings have good energy ratings?"
"Highlight the best deals"
"Show me apartments with at least 2 rooms under 1200€"
"Get details on listing 12345678"
"Reset all filters"
```

## Tools Available to Claude

| Tool | Description |
|------|-------------|
| `get_listings` | Get all listings with price, size, rooms, etc. |
| `filter_listings` | Show/hide listings by criteria |
| `get_listing_details` | Fetch detailed info from a listing page |
| `highlight_listings` | Add visual glow to specific listings |
| `open_listing` | Open a listing in a new tab |
| `show_all_listings` | Reset filters and show everything |
| `get_page_summary` | Get statistics about the current page |

## File Structure

```
idealista-firefox-plugin/
├── manifest.json      # Extension configuration
├── content.js         # Chat UI + Claude client + tools
├── content.css        # Sidebar styling
├── background.js      # API key management
├── popup.html         # API key configuration UI
├── popup.js           # Popup logic
├── popup.css          # Popup styling
└── icons/             # Extension icons
```

## Privacy & Security

- Your API key is stored locally in Firefox's sync storage
- API calls go directly from your browser to Anthropic's servers
- No data is sent to any third-party servers
- Listing data stays in your browser

## Troubleshooting

### "Please set your Claude API key"
- Click the extension icon and add your API key

### Chat not appearing
- Make sure you're on an Idealista search page (URL contains `/alquiler-` or `/venta-`)
- Try refreshing the page

### API errors
- Verify your API key is correct
- Check you have credits in your Anthropic account
- Ensure you're not hitting rate limits

### Listings not detected
- The extension looks for `article.item` elements
- Idealista may have changed their page structure

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

The extension uses Claude Sonnet. Typical usage:
- Opening a page: ~500 tokens
- Simple filter request: ~1000 tokens
- Complex analysis: ~2000 tokens

At ~$3/million input tokens, expect to spend a few cents per session.

## License

MIT

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude API
- [Idealista](https://idealista.com) for the property search platform
