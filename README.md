# Idealista Firefox Plugin Helper

A Firefox WebExtension to enhance the Idealista.com property search experience with advanced filtering, AI-powered insights, and red flag detection.

## 🎯 Features (Planned)

### 1. **Enhanced Filtering**
- **Energy Rating Filter**: Filter properties by energy efficiency rating (A-G) directly from search results
- **Advanced Search Criteria**: Additional filters not available in the default Idealista interface
- **Custom Filter Combinations**: Save and reuse complex filter combinations

### 2. **AI-Powered Features**
- **Automatic Response Generation**: Create personalized inquiry messages using AI
- **Smart Property Analysis**: AI-driven property evaluation and recommendations
- **Intelligent Filtering**: ML-based filtering to match your preferences and priorities

### 3. **Red Flags Detection**
- **Scam Detection**: Identify suspicious listings with warning indicators
- **Price Analysis**: Flag properties with unusual pricing
- **Quality Assessment**: Detect low-quality or incomplete listings

### 4. **Enhanced UX**
- **Quick Property Insights**: View key metrics without opening individual listings
- **Comparison Tools**: Compare multiple properties side-by-side
- **Notes & Bookmarks**: Save notes and organize favorite properties

## 📋 Current Status

**Development Stage**: Planning & Architecture

This project is currently in the initial planning phase. See [INFORMATION_NEEDED.md](INFORMATION_NEEDED.md) for required decisions and information to proceed with implementation.

## 🏗️ Architecture

### Extension Structure

```
idealista-firefox-plugin/
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── content.js             # Content script for Idealista pages
├── content.css            # Styles for injected UI
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
├── lib/                   # Utility libraries
│   ├── ai-integration.js  # AI API integration
│   ├── data-scraper.js    # Property data extraction
│   └── storage.js         # Data persistence utilities
└── docs/                  # Additional documentation
```

### Key Components

1. **Content Script** (`content.js`)
   - Injected into Idealista search pages
   - Scrapes property data from listings
   - Injects custom UI elements for filters
   - Handles user interactions with added features

2. **Background Script** (`background.js`)
   - Manages extension state
   - Handles API calls to AI services
   - Coordinates data processing
   - Manages caching and storage

3. **Popup Interface** (`popup.html`, `popup.js`)
   - User settings and preferences
   - API key configuration
   - Feature toggles
   - Statistics and insights dashboard

## 🔧 Technology Stack

- **Firefox WebExtensions API** (Manifest V2)
- **JavaScript** (ES6+)
- **CSS3** for styling
- **AI Integration** (TBD - OpenAI, Claude, or local models)
- **Browser Storage API** for data persistence

## 📚 References & Similar Projects

### Firefox Extension Development
- [MDN WebExtensions Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions Examples](https://github.com/mdn/webextensions-examples)

### Similar Real Estate Enhancement Extensions
- **Zillow Enhanced** - Example of real estate site enhancement
- **Trulia Plus** - Additional filters for property search
- **RealEstateHelper** - General property search tools

### Content Script & Data Scraping Examples
- [MDN Content Scripts Guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)
- [web-scraping-examples](https://github.com/topics/web-scraping-javascript)

### AI Integration in Browser Extensions
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [AI-powered browser extensions examples](https://github.com/topics/ai-browser-extension)
- [ChatGPT API Integration Guides](https://platform.openai.com/docs/guides/gpt)

### UI/UX Inspiration
- [Extension UI Best Practices](https://extensionworkshop.com/documentation/develop/user-experience-best-practices/)
- [Material Design for Extensions](https://material.io/design)

## 🚀 Getting Started

### Prerequisites
- Firefox browser (version 78 or higher recommended)
- Basic knowledge of JavaScript and web development
- (Optional) API keys for AI services

### Installation for Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/paroque28/idealista-firefox-plugin.git
   cd idealista-firefox-plugin
   ```

2. **Load the extension in Firefox**
   - Open Firefox
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from this directory

3. **Configure settings**
   - Click the extension icon in the toolbar
   - Enter any required API keys
   - Configure your preferences

### Development

```bash
# Watch for changes (if using build tools)
npm run watch

# Run tests
npm test

# Package for distribution
npm run build
```

## 📖 Documentation

### Getting Started
- **[Quick Start Guide](QUICKSTART.md)** - Get the plugin running in 5 minutes
- **[Development Environment Setup](DEV_ENVIRONMENT.md)** - Complete dev environment with build tools

### Planning & Design
- **[Information Needed](INFORMATION_NEEDED.md)** - Required decisions for implementation
- **[Feature Ideas](FEATURE_IDEAS.md)** - Suggested features and useful additions

### Technical Guides
- **[Data Storage Guide](DATA_STORAGE.md)** - How to store viewed listings, prices, and more
- [Architecture Guide](docs/ARCHITECTURE.md) - Detailed technical architecture (TBD)
- [API Documentation](docs/API.md) - API integration details (TBD)

### Contributing
- [Contributing Guide](CONTRIBUTING.md) - How to contribute (TBD)

## 🛠️ Development Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure setup
- [x] Basic manifest configuration
- [ ] Core documentation
- [ ] Gather requirements (see INFORMATION_NEEDED.md)

### Phase 2: Core Features
- [ ] Basic content script injection
- [ ] Property data scraping
- [ ] Simple filter UI
- [ ] Energy rating detection

### Phase 3: AI Integration
- [ ] AI provider integration
- [ ] Automatic response generation
- [ ] Smart filtering algorithms

### Phase 4: Red Flags & Advanced Features
- [ ] Scam detection algorithms
- [ ] Price analysis
- [ ] Quality scoring
- [ ] Comparison tools

### Phase 5: Polish & Release
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation completion
- [ ] Firefox Add-ons store submission

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

TBD - Please specify the license for this project.

## ⚖️ Legal & Compliance

**Important**: This extension is designed to enhance user experience while browsing Idealista. Users should:
- Review Idealista's Terms of Service
- Use the extension responsibly
- Respect rate limits and website resources
- Not use the extension for commercial scraping
- Comply with GDPR and data protection regulations

## 🐛 Known Issues & Limitations

- Extension requires manual loading in Firefox (not yet published to store)
- AI features require API keys (costs may apply)
- Energy rating data requires visiting individual property pages
- Performance depends on number of listings on page

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact: [Your contact information]

## 🙏 Acknowledgments

- Idealista.com for providing a great real estate search platform
- Firefox WebExtensions community
- All contributors and users

---

**Status**: 🚧 In Development  
**Version**: 0.1.0 (Planning Phase)  
**Last Updated**: 2026-01-28
