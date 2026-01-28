# Project Overview

## Idealista Helper - Firefox Extension

A comprehensive Firefox WebExtension designed to enhance the property search experience on Idealista.com with advanced filtering, AI-powered features, and red flag detection.

## Current Status: Planning Phase

This project is currently in the **planning and architecture** phase. The repository contains:
- ✅ Complete project structure
- ✅ Manifest configuration
- ✅ Placeholder code for all core components
- ✅ Comprehensive documentation
- ✅ Development environment setup guides
- ⏳ Awaiting requirements clarification (see INFORMATION_NEEDED.md)

## Repository Structure

```
idealista-firefox-plugin/
├── manifest.json           # Firefox extension manifest (Manifest V2)
├── background.js          # Background service worker
├── content.js             # Content script (injected into Idealista pages)
├── content.css            # Styles for injected UI elements
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── icons/                 # Extension icons (placeholder)
├── .gitignore            # Git ignore patterns
│
├── README.md              # Main project documentation
├── QUICKSTART.md          # 5-minute setup guide
├── DEV_ENVIRONMENT.md     # Development environment setup
├── DATA_STORAGE.md        # Data storage implementation guide
├── INFORMATION_NEEDED.md  # Requirements gathering document
├── FEATURE_IDEAS.md       # Suggested additional features
└── PROJECT_OVERVIEW.md    # This file
```

## Core Features (Planned)

### 1. Enhanced Filtering
- **Energy Rating Filter**: Filter by property energy efficiency (A-G)
- **Hide Viewed Listings**: Automatically dim/hide properties you've already seen
- **Custom Filter Combinations**: Save and reuse complex searches

### 2. AI-Powered Features
- **Automatic Response Generation**: Create personalized inquiry messages
- **Smart Property Analysis**: AI-driven property evaluation
- **Intelligent Filtering**: ML-based matching to preferences

### 3. Red Flags Detection
- **Scam Detection**: Identify suspicious listings
- **Price Analysis**: Flag unusual pricing
- **Quality Assessment**: Detect incomplete listings

### 4. Data Tracking
- **Viewed History**: Track all properties you've seen
- **Price History**: Monitor price changes over time
- **Statistics Dashboard**: View your search patterns

## Technology Stack

### Core Technologies
- **Firefox WebExtensions API** (Manifest V2)
- **JavaScript** (ES6+)
- **CSS3** for styling
- **Browser Storage API** for data persistence

### Planned Integrations
- AI Provider (OpenAI, Claude, or local models) - TBD
- Map Services API for commute calculations - TBD
- Image recognition for photo analysis - TBD

## Development Workflow

### Quick Start (No Build)
1. Clone repository
2. Open Firefox → `about:debugging`
3. Load Temporary Add-on → Select `manifest.json`
4. Navigate to Idealista.com

### Full Development Setup
1. Install Node.js and npm
2. Run `npm install`
3. Run `npm run dev` for auto-reload
4. Make changes, test, iterate

See [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md) for complete setup instructions.

## Key Documentation

### For Users
- **[QUICKSTART.md](QUICKSTART.md)**: Get started in 5 minutes
- **[README.md](README.md)**: Complete project overview
- **[FEATURE_IDEAS.md](FEATURE_IDEAS.md)**: Suggested future features

### For Developers
- **[DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)**: Development setup
- **[DATA_STORAGE.md](DATA_STORAGE.md)**: Data storage patterns
- **[INFORMATION_NEEDED.md](INFORMATION_NEEDED.md)**: Requirements to finalize

## Implementation Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Project structure
- [x] Basic manifest
- [x] Documentation framework
- [x] Placeholder code
- [ ] Requirements gathering

### Phase 2: Core Features (Next)
- [ ] Property data scraping
- [ ] Viewed listings tracking
- [ ] Basic filter UI
- [ ] Energy rating detection

### Phase 3: AI Integration
- [ ] AI provider selection
- [ ] API integration
- [ ] Automatic responses
- [ ] Smart filtering

### Phase 4: Advanced Features
- [ ] Red flags detection
- [ ] Price tracking
- [ ] Comparison tools
- [ ] Notification system

### Phase 5: Polish & Release
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Icon design
- [ ] Firefox Add-ons store submission

## Data Architecture

### Storage Strategy
- **browser.storage.local** (up to 10MB)
  - Viewed listings history
  - Price history
  - Cached property data
  - Red flags database

- **browser.storage.sync** (up to 100KB)
  - User preferences
  - Saved searches
  - API configuration

See [DATA_STORAGE.md](DATA_STORAGE.md) for detailed implementation.

## Code Organization

### background.js
- Extension lifecycle management
- Message passing coordination
- API calls to external services
- Periodic tasks (price checking, notifications)

### content.js
- Injected into Idealista pages
- DOM manipulation and scraping
- UI element injection
- Event handling for user interactions

### popup.html/js/css
- Extension popup interface
- Settings management
- Statistics display
- Quick actions

## Browser Compatibility

### Supported
- Firefox 78+
- Firefox Developer Edition
- Firefox Nightly

### Planned
- Chrome/Edge (Manifest V3 version)

## Contributing

This project is in early stages. Contributions are welcome!

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas Needing Help
- UI/UX design for injected elements
- Icon design
- AI integration patterns
- Testing on various Idealista page layouts
- Documentation improvements

## Testing Strategy

### Manual Testing
- Load extension in Firefox
- Test on real Idealista search pages
- Verify data persistence
- Check performance impact

### Automated Testing (Future)
- Unit tests for utility functions
- Integration tests for storage
- E2E tests for critical flows

See test checklist in [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)

## Known Limitations

### Current Phase
- Icons are placeholders (need custom design)
- No actual AI integration yet
- Scraping selectors need to be verified with live site
- No automated tests yet

### Technical
- Extension requires manual loading (not in store yet)
- Energy rating data requires visiting individual pages
- Firefox only (no Chrome version yet)

## Security Considerations

### Data Privacy
- All data stored locally in browser
- No data sent to external servers (except AI APIs when configured)
- User controls their data
- Export/delete functionality included

### Permissions
- `storage`: For saving user data
- `activeTab`: For accessing current page
- `*://www.idealista.com/*`: For Idealista.com only

## Legal Compliance

⚠️ **Important Notes**:
- Review Idealista's Terms of Service before use
- Respect rate limits and website resources
- For personal use, not commercial scraping
- GDPR compliant (data stays local)

## Next Steps

### Immediate Actions Needed
1. **Fill out [INFORMATION_NEEDED.md](INFORMATION_NEEDED.md)**
   - Decide on AI provider
   - Define red flag criteria
   - Set feature priorities

2. **Design Icons**
   - Create 48x48 and 96x96 PNG icons
   - Place in `icons/` directory

3. **Verify Selectors**
   - Test content.js selectors on live Idealista
   - Update DOM queries as needed

4. **Choose AI Provider**
   - Select OpenAI, Claude, or other
   - Obtain API keys
   - Implement integration

### Future Milestones
- First working prototype
- Beta testing with real users
- Firefox Add-ons store submission
- Chrome version development

## Resources

### Official Documentation
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [web-ext CLI tool](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)

### Similar Projects
- Real estate enhancement extensions
- AI-powered browser tools
- Content scraping extensions

### Community
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Pull Requests for contributions

## License

TBD - Please specify the license for this project.

Suggested: MIT License (permissive, widely used)

## Contact

- **GitHub**: [@paroque28](https://github.com/paroque28)
- **Repository**: [idealista-firefox-plugin](https://github.com/paroque28/idealista-firefox-plugin)

## Acknowledgments

- Idealista.com for providing excellent property search platform
- Firefox WebExtensions community
- Contributors and testers

---

**Status**: 🏗️ In Active Development  
**Version**: 0.1.0 (Planning Phase)  
**Last Updated**: 2026-01-28

**Ready to get started?** See [QUICKSTART.md](QUICKSTART.md) or [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)!
